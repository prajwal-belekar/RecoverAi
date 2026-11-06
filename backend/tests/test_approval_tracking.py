"""
Tests for AI Response Approval Tracking
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
    client.post('/api/v1/auth/register', json={'email': 'test@example.com', 'password': 'password123', 'name': 'Test User'})
    login_response = client.post('/api/v1/auth/login', json={'email': 'test@example.com', 'password': 'password123'})
    token = login_response.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    client.post('/api/v1/auth/workspaces', json={'name': 'Test Workspace', 'subdomain': 'test-workspace'}, headers=headers)
    
    ticket_resp = client.post('/api/v1/tickets/',
                             json={'title': 'Payment failure', 'description': 'Payment not going through', 'category': 'billing', 'customer_name': 'Test User', 'customer_email': 'test@example.com'},
                             headers=headers)
    ticket_id = ticket_resp.json()['id']
    return headers, ticket_id


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


def test_generate_response_creates_record():
    """Test that generating a response creates an AIResponse record"""
    headers, ticket_id = setup_user_workspace_ticket()
    
    upload_knowledge_base(headers, 'guide.txt', 'Payment troubleshooting guide content.')
    
    client.post(f'/api/v1/ai/classify?ticket_id={ticket_id}', headers=headers)
    response = client.post(f'/api/v1/ai/respond/{ticket_id}', headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    response_id = data['response_id']
    
    # Verify record exists in database
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        ai_response = db.query(AIResponse).filter(AIResponse.id == response_id).first()
        assert ai_response is not None
        assert ai_response.ticket_id == ticket_id
        assert ai_response.status == 'generated'
        assert ai_response.generated_response == data['response']
        assert ai_response.citations == data['citations']
        assert ai_response.confidence == data['confidence']
        assert ai_response.has_sufficient_context == data['has_sufficient_context']
        assert ai_response.user_id is not None
    finally:
        db.close()


def test_edit_response():
    """Test editing an AI response"""
    headers, ticket_id = setup_user_workspace_ticket()
    
    upload_knowledge_base(headers, 'guide.txt', 'Payment troubleshooting guide content.')
    
    client.post(f'/api/v1/ai/classify?ticket_id={ticket_id}', headers=headers)
    response = client.post(f'/api/v1/ai/respond/{ticket_id}', headers=headers)
    response_id = response.json()['response_id']
    
    # Edit the response
    edited_text = "This is a human-edited version of the response."
    edit_resp = client.post(f'/api/v1/ai/response/{response_id}/edit',
                           json={'edited_response': edited_text},
                           headers=headers)
    
    assert edit_resp.status_code == 200
    assert edit_resp.json()['status'] == 'edited'
    
    # Verify in database
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        ai_response = db.query(AIResponse).filter(AIResponse.id == response_id).first()
        assert ai_response.status == 'edited'
        assert ai_response.edited_response == edited_text
        assert ai_response.generated_response != edited_text  # Original preserved
    finally:
        db.close()


def test_approve_response():
    """Test approving an AI response"""
    headers, ticket_id = setup_user_workspace_ticket()
    
    upload_knowledge_base(headers, 'guide.txt', 'Payment troubleshooting guide content.')
    
    client.post(f'/api/v1/ai/classify?ticket_id={ticket_id}', headers=headers)
    response = client.post(f'/api/v1/ai/respond/{ticket_id}', headers=headers)
    response_id = response.json()['response_id']
    
    # Approve the response
    approve_resp = client.post(f'/api/v1/ai/response/{response_id}/action',
                              json={'action': 'approve'},
                              headers=headers)
    
    assert approve_resp.status_code == 200
    assert approve_resp.json()['status'] == 'approved'
    
    # Verify in database
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        ai_response = db.query(AIResponse).filter(AIResponse.id == response_id).first()
        assert ai_response.status == 'approved'
        assert ai_response.approved_at is not None
        assert ai_response.approved_by is not None
        assert ai_response.final_response == ai_response.generated_response  # No edit, so generated becomes final
    finally:
        db.close()


def test_reject_response():
    """Test rejecting an AI response"""
    headers, ticket_id = setup_user_workspace_ticket()
    
    upload_knowledge_base(headers, 'guide.txt', 'Payment troubleshooting guide content.')
    
    client.post(f'/api/v1/ai/classify?ticket_id={ticket_id}', headers=headers)
    response = client.post(f'/api/v1/ai/respond/{ticket_id}', headers=headers)
    response_id = response.json()['response_id']
    
    # Reject the response
    reject_resp = client.post(f'/api/v1/ai/response/{response_id}/action',
                             json={'action': 'reject'},
                             headers=headers)
    
    assert reject_resp.status_code == 200
    assert reject_resp.json()['status'] == 'rejected'
    
    # Verify in database
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        ai_response = db.query(AIResponse).filter(AIResponse.id == response_id).first()
        assert ai_response.status == 'rejected'
        assert ai_response.final_response is None
    finally:
        db.close()


def test_send_response():
    """Test sending an approved response"""
    headers, ticket_id = setup_user_workspace_ticket()
    
    upload_knowledge_base(headers, 'guide.txt', 'Payment troubleshooting guide content.')
    
    client.post(f'/api/v1/ai/classify?ticket_id={ticket_id}', headers=headers)
    response = client.post(f'/api/v1/ai/respond/{ticket_id}', headers=headers)
    response_id = response.json()['response_id']
    
    # Must approve first
    client.post(f'/api/v1/ai/response/{response_id}/action', json={'action': 'approve'}, headers=headers)
    
    # Send the response
    send_resp = client.post(f'/api/v1/ai/response/{response_id}/action',
                           json={'action': 'send'},
                           headers=headers)
    
    assert send_resp.status_code == 200
    assert send_resp.json()['status'] == 'sent'
    
    # Verify in database
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        ai_response = db.query(AIResponse).filter(AIResponse.id == response_id).first()
        assert ai_response.status == 'sent'
        assert ai_response.sent_at is not None
        assert ai_response.final_response is not None
    finally:
        db.close()


def test_send_without_approval_fails():
    """Test that sending without approval fails"""
    headers, ticket_id = setup_user_workspace_ticket()
    
    upload_knowledge_base(headers, 'guide.txt', 'Payment troubleshooting guide content.')
    
    client.post(f'/api/v1/ai/classify?ticket_id={ticket_id}', headers=headers)
    response = client.post(f'/api/v1/ai/respond/{ticket_id}', headers=headers)
    response_id = response.json()['response_id']
    
    # Try to send without approving
    send_resp = client.post(f'/api/v1/ai/response/{response_id}/action',
                           json={'action': 'send'},
                           headers=headers)
    
    assert send_resp.status_code == 400


def test_edit_then_approve():
    """Test editing then approving a response"""
    headers, ticket_id = setup_user_workspace_ticket()
    
    upload_knowledge_base(headers, 'guide.txt', 'Payment troubleshooting guide content.')
    
    client.post(f'/api/v1/ai/classify?ticket_id={ticket_id}', headers=headers)
    response = client.post(f'/api/v1/ai/respond/{ticket_id}', headers=headers)
    response_id = response.json()['response_id']
    
    # Edit
    edited_text = "Edited response with custom text."
    client.post(f'/api/v1/ai/response/{response_id}/edit',
               json={'edited_response': edited_text},
               headers=headers)
    
    # Approve
    approve_resp = client.post(f'/api/v1/ai/response/{response_id}/action',
                              json={'action': 'approve'},
                              headers=headers)
    
    assert approve_resp.status_code == 200
    
    # Verify final_response is the edited version
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        ai_response = db.query(AIResponse).filter(AIResponse.id == response_id).first()
        assert ai_response.final_response == edited_text
    finally:
        db.close()


def test_response_history():
    """Test getting response history for a ticket"""
    headers, ticket_id = setup_user_workspace_ticket()
    
    upload_knowledge_base(headers, 'guide.txt', 'Payment troubleshooting guide content.')
    
    client.post(f'/api/v1/ai/classify?ticket_id={ticket_id}', headers=headers)
    response = client.post(f'/api/v1/ai/respond/{ticket_id}', headers=headers)
    response_id = response.json()['response_id']
    
    # Get history
    history_resp = client.get(f'/api/v1/ai/response/{ticket_id}/history', headers=headers)
    
    assert history_resp.status_code == 200
    history = history_resp.json()
    assert len(history) >= 1
    
    # Verify history entry structure
    entry = history[0]
    assert 'id' in entry
    assert 'status' in entry
    assert 'generated_response' in entry
    assert 'edited_response' in entry
    assert 'final_response' in entry
    assert 'citations' in entry
    assert 'confidence' in entry
    assert 'has_sufficient_context' in entry
    assert 'created_at' in entry
    assert 'updated_at' in entry


def test_analytics_from_real_records():
    """Test that analytics are calculated from real AIResponse records"""
    headers, ticket_id = setup_user_workspace_ticket()
    
    upload_knowledge_base(headers, 'guide.txt', 'Payment troubleshooting guide content.')
    
    client.post(f'/api/v1/ai/classify?ticket_id={ticket_id}', headers=headers)
    
    # Generate multiple responses
    for i in range(3):
        response = client.post(f'/api/v1/ai/respond/{ticket_id}', headers=headers)
        response_id = response.json()['response_id']
        
        if i == 0:
            client.post(f'/api/v1/ai/response/{response_id}/action', json={'action': 'approve'}, headers=headers)
            client.post(f'/api/v1/ai/response/{response_id}/action', json={'action': 'send'}, headers=headers)
        elif i == 1:
            client.post(f'/api/v1/ai/response/{response_id}/action', json={'action': 'reject'}, headers=headers)
        # i == 2 stays as generated
    
    # Get AI performance analytics
    analytics_resp = client.get('/api/v1/analytics/ai-performance', headers=headers)
    assert analytics_resp.status_code == 200
    data = analytics_resp.json()
    
    # Verify real counts
    assert data['aiAssistedResponses'] == 3
    assert data['responsesApproved'] == 1
    assert data['responsesRejected'] == 1
    assert data['responsesSent'] == 1
    assert data['humanApprovalRate'] > 0
    assert data['aiResponseAcceptanceRate'] > 0


def test_ai_trends_from_real_records():
    """Test that AI trends are calculated from real records"""
    headers, ticket_id = setup_user_workspace_ticket()
    
    upload_knowledge_base(headers, 'guide.txt', 'Payment troubleshooting guide content.')
    
    client.post(f'/api/v1/ai/classify?ticket_id={ticket_id}', headers=headers)
    response = client.post(f'/api/v1/ai/respond/{ticket_id}', headers=headers)
    response_id = response.json()['response_id']
    client.post(f'/api/v1/ai/response/{response_id}/action', json={'action': 'approve'}, headers=headers)
    
    # Get AI trends
    trends_resp = client.get('/api/v1/analytics/ai-trends?days=30', headers=headers)
    assert trends_resp.status_code == 200
    trends = trends_resp.json()
    
    # Should have at least one entry for today
    assert len(trends) >= 1
    today_entry = trends[-1]
    assert 'date' in today_entry
    assert 'classified' in today_entry
    assert 'assisted' in today_entry
    assert 'approved' in today_entry
    assert 'sent' in today_entry
    assert 'rejected' in today_entry


def test_cross_workspace_response_action_blocked():
    """Test that users cannot approve/reject/send responses from other workspaces"""
    # User 1 creates workspace and ticket
    client.post('/api/v1/auth/register', json={'email': 'user1@test.com', 'password': 'pass', 'name': 'User 1'})
    login1 = client.post('/api/v1/auth/login', json={'email': 'user1@test.com', 'password': 'pass'})
    token1 = login1.json()['access_token']
    headers1 = {'Authorization': f'Bearer {token1}'}
    client.post('/api/v1/auth/workspaces', json={'name': 'Workspace 1', 'subdomain': 'ws1'}, headers=headers1)
    
    ticket1 = client.post('/api/v1/tickets/',
                         json={'title': 'Test', 'description': 'Desc', 'category': 'billing', 'customer_name': 'A', 'customer_email': 'a@a.com'},
                         headers=headers1).json()['id']
    
    upload_knowledge_base(headers1, 'guide.txt', 'Payment troubleshooting guide content.')
    client.post(f'/api/v1/ai/classify?ticket_id={ticket1}', headers=headers1)
    response1 = client.post(f'/api/v1/ai/respond/{ticket1}', headers=headers1)
    response_id = response1.json()['response_id']
    
    # User 2 creates separate workspace
    client.post('/api/v1/auth/register', json={'email': 'user2@test.com', 'password': 'pass', 'name': 'User 2'})
    login2 = client.post('/api/v1/auth/login', json={'email': 'user2@test.com', 'password': 'pass'})
    token2 = login2.json()['access_token']
    headers2 = {'Authorization': f'Bearer {token2}'}
    client.post('/api/v1/auth/workspaces', json={'name': 'Workspace 2', 'subdomain': 'ws2'}, headers=headers2)
    
    # User 2 tries to approve User 1's response - should be blocked
    for action in ['approve', 'reject', 'send']:
        resp = client.post(f'/api/v1/ai/response/{response_id}/action',
                          json={'action': action}, headers=headers2)
        assert resp.status_code == 404, f"Cross-workspace {action} should be blocked"


def test_cross_workspace_response_history_blocked():
    """Test that users cannot view response history from other workspaces"""
    # User 1 creates workspace and ticket
    client.post('/api/v1/auth/register', json={'email': 'user1@test.com', 'password': 'pass', 'name': 'User 1'})
    login1 = client.post('/api/v1/auth/login', json={'email': 'user1@test.com', 'password': 'pass'})
    token1 = login1.json()['access_token']
    headers1 = {'Authorization': f'Bearer {token1}'}
    client.post('/api/v1/auth/workspaces', json={'name': 'Workspace 1', 'subdomain': 'ws1'}, headers=headers1)
    
    ticket1 = client.post('/api/v1/tickets/',
                         json={'title': 'Test', 'description': 'Desc', 'category': 'billing', 'customer_name': 'A', 'customer_email': 'a@a.com'},
                         headers=headers1).json()['id']
    
    # User 2 creates separate workspace
    client.post('/api/v1/auth/register', json={'email': 'user2@test.com', 'password': 'pass', 'name': 'User 2'})
    login2 = client.post('/api/v1/auth/login', json={'email': 'user2@test.com', 'password': 'pass'})
    token2 = login2.json()['access_token']
    headers2 = {'Authorization': f'Bearer {token2}'}
    client.post('/api/v1/auth/workspaces', json={'name': 'Workspace 2', 'subdomain': 'ws2'}, headers=headers2)
    
    # User 2 tries to view User 1's ticket response history - should be blocked
    resp = client.get(f'/api/v1/ai/response/{ticket1}/history', headers=headers2)
    assert resp.status_code == 404, "Cross-workspace history access should be blocked"


def test_invalid_lifecycle_transitions():
    """Test that invalid lifecycle transitions are rejected"""
    headers, ticket_id = setup_user_workspace_ticket()
    
    upload_knowledge_base(headers, 'guide.txt', 'Payment troubleshooting guide content.')
    client.post(f'/api/v1/ai/classify?ticket_id={ticket_id}', headers=headers)
    response = client.post(f'/api/v1/ai/respond/{ticket_id}', headers=headers)
    response_id = response.json()['response_id']
    
    # Cannot send from 'generated' status (must be approved or edited first)
    resp = client.post(f'/api/v1/ai/response/{response_id}/action',
                      json={'action': 'send'}, headers=headers)
    assert resp.status_code == 400
    assert 'Can only send approved or edited responses' in resp.json()['detail']
    
    # Cannot edit after approval (workflow: generated -> edited -> approved -> sent)
    client.post(f'/api/v1/ai/response/{response_id}/action', json={'action': 'approve'}, headers=headers)
    resp = client.post(f'/api/v1/ai/response/{response_id}/edit',
                      json={'edited_response': 'Should fail'}, headers=headers)
    assert resp.status_code == 400 or resp.status_code == 403  # Should be rejected
    
    # Cannot approve after rejection
    response2 = client.post(f'/api/v1/ai/respond/{ticket_id}', headers=headers)
    response_id2 = response2.json()['response_id']
    client.post(f'/api/v1/ai/response/{response_id2}/action', json={'action': 'reject'}, headers=headers)
    resp = client.post(f'/api/v1/ai/response/{response_id2}/action',
                      json={'action': 'approve'}, headers=headers)
    assert resp.status_code == 400  # Should be rejected


def test_duplicate_citation_prevention():
    """Test that model doesn't cite same chunk multiple times with different numbers"""
    headers, ticket_id = setup_user_workspace_ticket()
    
    # Upload content with single relevant section
    kb_content = """Payment Failure Resolution

When a payment fails with error code 'card_declined', the customer should:
1. Contact their bank to verify the card is active
2. Try a different payment method
3. Wait 15 minutes and retry the transaction

This is the only resolution step for card_declined errors."""
    
    upload_knowledge_base(headers, 'single_section.txt', kb_content)
    
    client.post(f'/api/v1/ai/classify?ticket_id={ticket_id}', headers=headers)
    response = client.post(f'/api/v1/ai/respond/{ticket_id}', headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    
    # Extract inline citation numbers
    import re
    inline_citations = re.findall(r'\[(\d+)\]', data['response'])
    cited_indices = [int(n) - 1 for n in inline_citations if int(n) > 0]
    
    # Should not cite the same chunk index twice
    assert len(cited_indices) == len(set(cited_indices)), "Duplicate chunk citations found"


if __name__ == '__main__':
    import pytest
    pytest.main([__file__, '-v'])