"""
Tests for AI Response Citations
"""
import os
import tempfile
from fastapi.testclient import TestClient
from app.main import app
from app.database import engine, Base, SessionLocal
from app.models import User, Workspace, KnowledgeBase, KnowledgeChunk, Ticket, AIClassification, AIResponse, AIPriority, TicketUpdate
from sqlalchemy.orm import Session

Base.metadata.create_all(bind=engine)

client = TestClient(app)


def clean_db():
    """Clean all tables"""
    db = SessionLocal()
    try:
        db.query(KnowledgeChunk).delete()
        db.query(KnowledgeBase).delete()
        db.query(Ticket).delete()
        db.query(AIClassification).delete()
        db.query(AIPriority).delete()
        db.query(AIResponse).delete()
        db.query(TicketUpdate).delete()
        db.query(User).delete()
        db.query(Workspace).delete()
        db.commit()
    finally:
        db.close()


def setup_user_workspace_ticket():
    """Create user, workspace, ticket, and return headers and ticket_id"""
    clean_db()
    # Register and login
    client.post('/api/v1/auth/register', json={'email': 'test@example.com', 'password': 'password123', 'name': 'Test User'})
    login_response = client.post('/api/v1/auth/login', json={'email': 'test@example.com', 'password': 'password123'})
    token = login_response.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    
    # Create workspace
    client.post('/api/v1/auth/workspaces', json={'name': 'Test Workspace', 'subdomain': 'test-workspace'}, headers=headers)
    
    # Create ticket
    ticket_resp = client.post('/api/v1/tickets/', 
                             json={'title': 'Payment failure', 'description': 'Payment not going through', 'category': 'billing', 'customer_name': 'Test User', 'customer_email': 'test@example.com'},
                             headers=headers)
    ticket_id = ticket_resp.json()['id']
    
    return headers, ticket_id


def upload_knowledge_base(headers, title, content):
    """Upload a knowledge base document"""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write(content)
        temp_path = f.name
    try:
        with open(temp_path, 'rb') as f:
            resp = client.post('/api/v1/knowledge/upload', files={'file': (title, f, 'text/plain')}, headers=headers)
        return resp.json()['id']
    finally:
        os.unlink(temp_path)


def test_response_with_citations():
    """Test that AI response includes structured citations"""
    headers, ticket_id = setup_user_workspace_ticket()
    
    # Upload knowledge base
    kb_content = """Payment Gateway Troubleshooting

When a payment fails with Stripe, check the following:
1. Verify the customer has sufficient funds
2. Check if the card is expired
3. Review Stripe dashboard for decline codes
4. Common decline codes: insufficient_funds, expired_card, card_declined

For refunds, use the refund API with transaction ID. Refunds process in 5-10 days."""
    
    upload_knowledge_base(headers, 'payment_guide.txt', kb_content)
    
    # Classify ticket first
    client.post(f'/api/v1/ai/classify?ticket_id={ticket_id}', headers=headers)
    
    # Get AI response
    response = client.post(f'/api/v1/ai/respond/{ticket_id}', headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify response structure
    assert 'response' in data
    assert 'confidence' in data
    assert 'citations' in data
    assert 'requires_approval' in data
    assert 'has_sufficient_context' in data
    assert 'response_id' in data
    
    # Verify citations structure
    citations = data['citations']
    assert isinstance(citations, list)
    
    if citations:
        for citation in citations:
            assert 'doc_id' in citation
            assert 'doc_title' in citation
            assert 'chunk_id' in citation
            assert 'chunk_index' in citation
            assert 'content' in citation
            assert 'similarity' in citation
            assert isinstance(citation['similarity'], (int, float))
            assert len(citation['content']) > 0


def test_response_citations_match_inline():
    """Test that inline citations [1], [2] match structured citations"""
    headers, ticket_id = setup_user_workspace_ticket()
    
    kb_content = """Billing Policy

Our billing policy states that all payments must be completed within 30 days.
Late payments incur a 1.5% monthly fee.
Refunds are available within 60 days of purchase."""
    
    upload_knowledge_base(headers, 'billing_policy.txt', kb_content)
    
    client.post(f'/api/v1/ai/classify?ticket_id={ticket_id}', headers=headers)
    response = client.post(f'/api/v1/ai/respond/{ticket_id}', headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    
    response_text = data['response']
    citations = data['citations']
    
    # Extract inline citation numbers
    import re
    inline_citations = re.findall(r'\[(\d+)\]', response_text)
    cited_indices = set(int(n) - 1 for n in inline_citations if int(n) > 0)
    
    # Verify each inline citation has a matching structured citation
    for idx in cited_indices:
        assert idx < len(citations), f"Inline citation [{idx+1}] has no matching structured citation"


def test_no_context_fallback():
    """Test response when no relevant knowledge base content exists"""
    headers, ticket_id = setup_user_workspace_ticket()
    
    # Upload unrelated content
    kb_content = """Technical Troubleshooting Guide

For server crashes, check error logs and restart services.
Common issues: memory leaks, connection timeouts, disk space."""
    
    upload_knowledge_base(headers, 'tech_guide.txt', kb_content)
    
    # Create a billing ticket (unrelated to tech guide)
    ticket_resp = client.post('/api/v1/tickets/',
                             json={'title': 'Billing question', 'description': 'How do I update my payment method?', 'category': 'billing', 'customer_name': 'Test', 'customer_email': 'test@test.com'},
                             headers=headers)
    billing_ticket_id = ticket_resp.json()['id']
    
    client.post(f'/api/v1/ai/classify?ticket_id={billing_ticket_id}', headers=headers)
    response = client.post(f'/api/v1/ai/respond/{billing_ticket_id}', headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    
    # Should indicate insufficient context
    assert data['has_sufficient_context'] == False
    assert 'sufficient information' in data['response'].lower() or 'don\'t have' in data['response'].lower()
    assert len(data['citations']) == 0


def test_citation_source_validity():
    """Test that citations reference actual knowledge base content"""
    headers, ticket_id = setup_user_workspace_ticket()
    
    kb_content = """Refund Policy

Customers can request refunds within 60 days of purchase.
Refunds are processed to the original payment method.
Processing time: 5-10 business days.
Contact billing@company.com for exceptions."""
    
    upload_knowledge_base(headers, 'refund_policy.txt', kb_content)
    
    client.post(f'/api/v1/ai/classify?ticket_id={ticket_id}', headers=headers)
    response = client.post(f'/api/v1/ai/respond/{ticket_id}', headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify each citation's content actually appears in the knowledge base
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        for citation in data['citations']:
            chunk = db.query(KnowledgeChunk).filter(KnowledgeChunk.id == citation['chunk_id']).first()
            assert chunk is not None, f"Citation references non-existent chunk {citation['chunk_id']}"
            assert chunk.content == citation['content'], "Citation content doesn't match stored chunk"
            assert chunk.knowledge_base_id == citation['doc_id'], "Citation doc_id mismatch"
    finally:
        db.close()


def test_citation_similarity_scores():
    """Test that citation similarity scores are reasonable"""
    headers, ticket_id = setup_user_workspace_ticket()
    
    kb_content = """Payment Processing FAQ

Q: Why did my payment fail?
A: Common reasons: insufficient funds, expired card, bank decline.
Check Stripe dashboard for specific error codes."""
    
    upload_knowledge_base(headers, 'payment_faq.txt', kb_content)
    
    client.post(f'/api/v1/ai/classify?ticket_id={ticket_id}', headers=headers)
    response = client.post(f'/api/v1/ai/respond/{ticket_id}', headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    
    for citation in data['citations']:
        assert 0.0 <= citation['similarity'] <= 1.0
        # Should be reasonably high for relevant content
        assert citation['similarity'] >= 0.2


def test_multiple_chunks_cited():
    """Test that multiple relevant chunks can be cited"""
    headers, ticket_id = setup_user_workspace_ticket()
    
    # Upload document with multiple distinct sections
    kb_content = """Section 1: Payment Failures
When payments fail, check Stripe logs for decline codes.
Common codes: insufficient_funds, expired_card.

Section 2: Refunds
Refunds can be processed via API within 60 days.
Original payment method is used.

Section 3: Disputes
Chargebacks must be responded to within 7 days.
Provide evidence of service delivery."""
    
    upload_knowledge_base(headers, 'comprehensive.txt', kb_content)
    
    client.post(f'/api/v1/ai/classify?ticket_id={ticket_id}', headers=headers)
    response = client.post(f'/api/v1/ai/respond/{ticket_id}', headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    
    # Should cite multiple chunks if relevant
    assert len(data['citations']) >= 1
    
    # All cited chunks should be from the same document
    doc_ids = set(c['doc_id'] for c in data['citations'])
    assert len(doc_ids) == 1


if __name__ == '__main__':
    import pytest
    pytest.main([__file__, '-v'])