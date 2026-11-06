"""
End-to-end tests for AI Quality: Ticket -> Classify -> Retrieve -> Respond with Citations -> Approve -> Analytics
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


def setup_user_workspace():
    """Create user and workspace, return headers"""
    clean_db()
    client.post('/api/v1/auth/register', json={'email': 'test@example.com', 'password': 'password123', 'name': 'Test User'})
    login_response = client.post('/api/v1/auth/login', json={'email': 'test@example.com', 'password': 'password123'})
    token = login_response.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    client.post('/api/v1/auth/workspaces', json={'name': 'Test Workspace', 'subdomain': 'test-workspace'}, headers=headers)
    return headers


def upload_knowledge_base(headers, title, content):
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write(content)
        temp_path = f.name
    try:
        with open(temp_path, 'rb') as f:
            resp = client.post('/api/v1/knowledge/upload', files={'file': (title, f, 'text/plain')}, headers=headers)
        return resp.json()['id']
    finally:
        os.unlink(temp_path)


def test_full_ai_pipeline_payment_ticket():
    """Test complete pipeline: create ticket -> classify -> prioritize -> search KB -> respond with citations -> approve -> verify analytics"""
    headers = setup_user_workspace()
    
    # 1. Upload comprehensive knowledge base
    kb_content = """Payment Gateway Integration Guide

Overview:
Our platform integrates with Stripe for payment processing.

Common Payment Failures:
1. Insufficient Funds - Customer's bank account has insufficient balance
2. Expired Card - Credit/debit card has expired
3. Card Declined - Bank declined the transaction (generic decline)
4. Invalid CVC - Security code doesn't match
5. Processing Error - Temporary gateway issue

Decline Codes:
- insufficient_funds: Customer needs to add funds
- expired_card: Customer needs to update card
- card_declined: Contact bank for details
- incorrect_cvc: Re-enter security code
- processing_error: Retry in a few minutes

Refund Process:
1. Locate transaction in Stripe dashboard
2. Click 'Refund' and specify amount
3. Refund processes to original payment method
4. Typical timeline: 5-10 business days

Dispute Handling:
1. Receive chargeback notification
2. Gather evidence (delivery proof, communication logs)
3. Submit response within 7 days
4. Stripe reviews and decides"""
    
    upload_knowledge_base(headers, 'payment_guide.txt', kb_content)
    
    # 2. Create a payment-related ticket
    ticket_resp = client.post('/api/v1/tickets/',
                             json={
                                 'title': 'Customer payment declined',
                                 'description': 'Customer reports their payment was declined with error "card_declined". They have sufficient funds and card is not expired. Need help resolving.',
                                 'category': 'billing',
                                 'customer_name': 'John Doe',
                                 'customer_email': 'john@example.com'
                             },
                             headers=headers)
    assert ticket_resp.status_code == 201
    ticket_id = ticket_resp.json()['id']
    
    # 3. Classify the ticket
    classify_resp = client.post(f'/api/v1/ai/classify?ticket_id={ticket_id}', headers=headers)
    assert classify_resp.status_code == 200
    classify_data = classify_resp.json()
    assert classify_data['category'] == 'billing'
    assert classify_data['urgency'] in ['high', 'critical']
    assert classify_data['confidence'] > 0.5
    
    # 4. Prioritize the ticket
    priority_resp = client.post(f'/api/v1/ai/priority/{ticket_id}', headers=headers)
    assert priority_resp.status_code == 200
    priority_data = priority_resp.json()
    assert priority_data['priority_level'] in ['High', 'Critical']
    assert 0 <= priority_data['score'] <= 100
    
    # 5. Search knowledge base for relevant content
    search_resp = client.post('/api/v1/knowledge/search',
                             json={'query': 'card_declined payment failure', 'top_k': 5, 'min_similarity': 0.2},
                             headers=headers)
    assert search_resp.status_code == 200
    search_data = search_resp.json()
    assert search_data['total'] > 0
    assert any('card_declined' in r['content'].lower() for r in search_data['results'])
    
    # 6. Generate AI response with citations
    respond_resp = client.post(f'/api/v1/ai/respond/{ticket_id}', headers=headers)
    assert respond_resp.status_code == 200
    respond_data = respond_resp.json()
    
    # Verify response structure
    assert 'response' in respond_data
    assert 'confidence' in respond_data
    assert 'citations' in respond_data
    assert 'requires_approval' in respond_data
    assert 'has_sufficient_context' in respond_data
    assert 'response_id' in respond_data
    
    # Verify response mentions relevant content
    response_text = respond_data['response'].lower()
    assert any(term in response_text for term in ['card_declined', 'declined', 'payment', 'bank', 'stripe'])
    
    # Verify citations
    citations = respond_data['citations']
    assert len(citations) > 0
    for citation in citations:
        assert 'doc_id' in citation
        assert 'doc_title' in citation
        assert 'chunk_id' in citation
        assert 'chunk_index' in citation
        assert 'content' in citation
        assert 'similarity' in citation
        assert len(citation['content']) > 0
        # Citation content should be relevant
        assert any(term in citation['content'].lower() for term in ['payment', 'decline', 'card', 'stripe', 'refund'])
    
    response_id = respond_data['response_id']
    
    # 7. Approve the response
    approve_resp = client.post(f'/api/v1/ai/response/{response_id}/action',
                              json={'action': 'approve'},
                              headers=headers)
    assert approve_resp.status_code == 200
    assert approve_resp.json()['status'] == 'approved'
    
    # 8. Send the response
    send_resp = client.post(f'/api/v1/ai/response/{response_id}/action',
                           json={'action': 'send'},
                           headers=headers)
    assert send_resp.status_code == 200
    assert send_resp.json()['status'] == 'sent'
    
    # 9. Verify analytics reflect the workflow
    analytics_resp = client.get('/api/v1/analytics/ai-performance', headers=headers)
    assert analytics_resp.status_code == 200
    analytics = analytics_resp.json()
    
    assert analytics['aiClassifiedTickets'] >= 1
    assert analytics['aiAssistedResponses'] >= 1
    assert analytics['responsesApproved'] >= 1
    assert analytics['responsesSent'] >= 1
    assert analytics['humanApprovalRate'] > 0
    assert analytics['aiResponseAcceptanceRate'] > 0
    assert analytics['avgConfidence'] > 0
    
    # 10. Verify AI trends
    trends_resp = client.get('/api/v1/analytics/ai-trends?days=30', headers=headers)
    assert trends_resp.status_code == 200
    trends = trends_resp.json()
    assert len(trends) >= 1
    today = trends[-1]
    assert today['classified'] >= 1
    assert today['assisted'] >= 1
    # Response was approved then sent, so it shows as sent
    assert today['approved'] + today['sent'] >= 1
    assert today['sent'] >= 1


def test_full_ai_pipeline_technical_ticket():
    """Test pipeline with technical ticket and technical knowledge base"""
    headers = setup_user_workspace()
    
    # Upload technical knowledge base
    kb_content = """Application Server Troubleshooting

Common Issues:
1. Memory Leaks - Monitor heap usage, restart if >80% capacity
2. Connection Pool Exhaustion - Increase pool size or fix connection leaks
3. Slow Queries - Check query execution plans, add indexes
4. Thread Deadlock - Review synchronization, use timeouts

Error Codes:
- OUT_OF_MEMORY: Increase heap size (-Xmx) or fix memory leak
- CONNECTION_TIMEOUT: Check database connectivity, increase timeout
- THREAD_DEADLOCK: Analyze thread dump, fix locking order
- SLOW_QUERY: Optimize SQL, add missing indexes

Resolution Steps:
1. Check application logs for error stack traces
2. Monitor system metrics (CPU, memory, disk, network)
3. Review recent deployments for regressions
4. Restart affected services if needed
5. Implement fix and deploy"""
    
    upload_knowledge_base(headers, 'tech_guide.txt', kb_content)
    
    # Create technical ticket
    ticket_resp = client.post('/api/v1/tickets/',
                             json={
                                 'title': 'Application server crashing with OUT_OF_MEMORY',
                                 'description': 'Production server keeps crashing with java.lang.OutOfMemoryError. Heap dump shows large object retention.',
                                 'category': 'technical',
                                 'customer_name': 'DevOps Team',
                                 'customer_email': 'devops@company.com'
                             },
                             headers=headers)
    ticket_id = ticket_resp.json()['id']
    
    # Run pipeline
    client.post(f'/api/v1/ai/classify?ticket_id={ticket_id}', headers=headers)
    client.post(f'/api/v1/ai/priority/{ticket_id}', headers=headers)
    
    respond_resp = client.post(f'/api/v1/ai/respond/{ticket_id}', headers=headers)
    assert respond_resp.status_code == 200
    respond_data = respond_resp.json()
    
    # Verify technical content in response
    response_text = respond_data['response'].lower()
    assert any(term in response_text for term in ['memory', 'heap', 'out_of_memory', 'restart', 'jvm'])
    
    # Verify citations reference technical content
    for citation in respond_data['citations']:
        assert any(term in citation['content'].lower() for term in ['memory', 'heap', 'out_of_memory', 'server', 'application'])


def test_multiple_tickets_independent_workflows():
    """Test that multiple tickets have independent AI response workflows"""
    headers = setup_user_workspace()
    
    upload_knowledge_base(headers, 'kb.txt', 'General support content for testing.')
    
    # Create two tickets
    ticket1 = client.post('/api/v1/tickets/',
                         json={'title': 'Ticket 1', 'description': 'Issue one', 'category': 'billing', 'customer_name': 'A', 'customer_email': 'a@a.com'},
                         headers=headers).json()['id']
    ticket2 = client.post('/api/v1/tickets/',
                         json={'title': 'Ticket 2', 'description': 'Issue two', 'category': 'technical', 'customer_name': 'B', 'customer_email': 'b@b.com'},
                         headers=headers).json()['id']
    
    # Process both through AI
    for tid in [ticket1, ticket2]:
        client.post(f'/api/v1/ai/classify?ticket_id={tid}', headers=headers)
        resp = client.post(f'/api/v1/ai/respond/{tid}', headers=headers)
        assert resp.status_code == 200
        rid = resp.json()['response_id']
        
        # Approve and send both
        client.post(f'/api/v1/ai/response/{rid}/action', json={'action': 'approve'}, headers=headers)
        client.post(f'/api/v1/ai/response/{rid}/action', json={'action': 'send'}, headers=headers)
    
    # Verify both tracked independently
    history1 = client.get(f'/api/v1/ai/response/{ticket1}/history', headers=headers).json()
    history2 = client.get(f'/api/v1/ai/response/{ticket2}/history', headers=headers).json()
    
    assert len(history1) == 1
    assert len(history2) == 1
    assert history1[0]['id'] != history2[0]['id']
    assert history1[0]['status'] == 'sent'
    assert history2[0]['status'] == 'sent'
    
    # Analytics should count both
    analytics = client.get('/api/v1/analytics/ai-performance', headers=headers).json()
    assert analytics['aiAssistedResponses'] == 2
    assert analytics['responsesSent'] == 2


def test_citation_verification_no_hallucination():
    """Test that citations don't hallucinate - they reference actual KB content"""
    headers = setup_user_workspace()
    
    kb_content = """Specific Policy: Refund Window
Our refund policy allows refunds within 30 days of purchase.
After 30 days, only store credit is offered.

Specific Policy: Shipping
Free shipping on orders over $50.
Standard shipping: 3-5 business days."""
    
    upload_knowledge_base(headers, 'policies.txt', kb_content)
    
    ticket_resp = client.post('/api/v1/tickets/',
                             json={'title': 'Refund request', 'description': 'Customer wants refund after 45 days', 'category': 'billing', 'customer_name': 'C', 'customer_email': 'c@c.com'},
                             headers=headers)
    ticket_id = ticket_resp.json()['id']
    
    client.post(f'/api/v1/ai/classify?ticket_id={ticket_id}', headers=headers)
    respond_resp = client.post(f'/api/v1/ai/respond/{ticket_id}', headers=headers)
    
    assert respond_resp.status_code == 200
    data = respond_resp.json()
    
    # Verify all citations reference actual KB content
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        for citation in data['citations']:
            chunk = db.query(KnowledgeChunk).filter(KnowledgeChunk.id == citation['chunk_id']).first()
            assert chunk is not None
            # The cited content must exist in the KB
            assert chunk.content == citation['content']
            # And the KB must contain the specific policy text
            assert 'refund' in chunk.content.lower() or 'shipping' in chunk.content.lower()
    finally:
        db.close()


def test_no_knowledge_base_graceful_fallback():
    """Test that AI responds gracefully when no knowledge base exists"""
    headers = setup_user_workspace()
    
    # Don't upload any KB
    ticket_resp = client.post('/api/v1/tickets/',
                             json={'title': 'General question', 'description': 'How do I contact support?', 'category': 'general', 'customer_name': 'D', 'customer_email': 'd@d.com'},
                             headers=headers)
    ticket_id = ticket_resp.json()['id']
    
    client.post(f'/api/v1/ai/classify?ticket_id={ticket_id}', headers=headers)
    respond_resp = client.post(f'/api/v1/ai/respond/{ticket_id}', headers=headers)
    
    assert respond_resp.status_code == 200
    data = respond_resp.json()
    
    # Should indicate insufficient context
    assert data['has_sufficient_context'] == False
    assert len(data['citations']) == 0
    # Response should be honest about lack of info
    assert any(phrase in data['response'].lower() for phrase in [
        'don\'t have', 'insufficient', 'not have', 'cannot', 'unable'
    ])


if __name__ == '__main__':
    import pytest
    pytest.main([__file__, '-v'])