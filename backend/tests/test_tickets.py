import os
import sys
db_path = os.path.join(os.path.dirname(__file__), '..', '..', 'resolveai.ai')

from app.main import app
from fastapi.testclient import TestClient
from app.database import engine, Base
from app.models import User, Ticket
from sqlalchemy.orm import Session
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def login():
    client.post('/api/v1/auth/register', json={'email': 'test@example.com', 'password': 'password123', 'name': 'Test User'})
    return client.post('/api/v1/auth/login', json={'email': 'test@example.com', 'password': 'password123'})

def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

def test_create_ticket():
    clean_db()
    login_response = login()
    headers = {'Authorization': f'Bearer {login_response.json()["access_token"]}'}
    response = client.post('/api/v1/tickets/', json={'title': 'Payment failure', 'description': 'Payment not going through', 'category': 'billing', 'customer_name': 'Test User', 'customer_email': 'test@example.com'}, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data['title'] == 'Payment failure'
    assert data['category'] == 'billing'
    assert data['status'] == 'Open'

def test_list_tickets():
    clean_db()
    login_response = login()
    # Create a ticket first
    client.post('/api/v1/tickets/', json={'title': 'Test Ticket', 'description': 'Test description', 'category': 'billing'}, headers={'Authorization': f'Bearer {login_response.json()["access_token"]}'})
    headers = {'Authorization': f'Bearer {login_response.json()["access_token"]}'}
    response = client.get('/api/v1/tickets/', headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0

def test_get_ticket():
    clean_db()
    login_response = login()
    headers = {'Authorization': f'Bearer {login_response.json()["access_token"]}'}
    # First create a ticket
    client.post('/api/v1/tickets/', json={'title': 'Test Ticket', 'description': 'Test description', 'category': 'billing'}, headers={'Authorization': f'Bearer {login_response.json()["access_token"]}'})
    # Get the created ticket
    tickets = client.get('/api/v1/tickets/', headers=headers).json()
    ticket_id = tickets[0]['id']
    response = client.get(f'/api/v1/tickets/{ticket_id}', headers=headers)
    assert response.status_code == 200
    assert response.json()['title'] == 'Test Ticket'

def test_update_ticket():
    clean_db()
    login_response = login()
    headers = {'Authorization': f'Bearer {login_response.json()["access_token"]}'}
    # Create ticket
    client.post('/api/v1/tickets/', json={'title': 'Old Title', 'description': ' desc', 'category': 'billing'}, headers={'Authorization': f'Bearer {login_response.json()["access_token"]}'})
    tickets = client.get('/api/v1/tickets/', headers=headers).json()
    ticket_id = tickets[0]['id']
    # Update ticket
    response = client.patch(f'/api/v1/tickets/{ticket_id}', json={'title': 'New Title', 'status': 'Resolved'}, headers=headers)
    assert response.status_code == 200
    assert response.json()['title'] == 'New Title'
    assert response.json()['status'] == 'Resolved'

def test_delete_ticket():
    clean_db()
    login_response = login()
    headers = {'Authorization': f'Bearer {login_response.json()["access_token"]}'}
    # Create ticket
    client.post('/api/v1/tickets/', json={'title': 'To Be Deleted', 'category': 'billing'}, headers={'Authorization': f'Bearer {login_response.json()["access_token"]}'})
    tickets = client.get('/api/v1/tickets/', headers=headers).json()
    ticket_id = tickets[0]['id']
    # Delete ticket
    response = client.delete(f'/api/v1/tickets/{ticket_id}', headers=headers)
    assert response.status_code == 204
    # Verify deleted
    tickets_after = client.get('/api/v1/tickets/', headers=headers).json()
    assert len(tickets_after) == 0

def test_ai_classify():
    clean_db()
    login_response = login()
    headers = {'Authorization': f'Bearer {login_response.json()["access_token"]}'}
    # Create ticket with payment-related text
    client.post('/api/v1/tickets/', json={'title': 'Payment failure', 'description': 'Payment not going through', 'category': 'billing', 'customer_name': 'Test User', 'customer_email': 'test@example.com'}, headers={'Authorization': f'Bearer {login_response.json()["access_token"]}'})
    # Classify
    tickets = client.get('/api/v1/tickets/', headers=headers).json()
    ticket_id = tickets[0]['id']
    response = client.post(f'/api/v1/ai/classify?ticket_id={ticket_id}', headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data['category'] in ['billing', 'technical', 'account', 'general']
    assert data['urgency'] in ['low', 'medium', 'high', 'critical']
    assert data['sentiment'] in ['positive', 'negative', 'neutral']
    assert 'suggested_action' in data
    assert 0 <= data['confidence'] <= 1

def test_ai_prioritize():
    clean_db()
    login_response = login()
    token = login_response.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    # Create ticket and classify
    client.post('/api/v1/tickets/', json={'title': 'Payment failure', 'description': 'Payment not going through', 'category': 'billing', 'customer_name': 'Test User', 'customer_email': 'test@example.com'}, headers={'Authorization': f'Bearer {token}'})
    tickets = client.get('/api/v1/tickets/', headers=headers).json()
    ticket_id = tickets[0]['id']
    # Classify first
    client.post(f'/api/v1/ai/classify?ticket_id={ticket_id}', headers=headers)
    # Prioritize
    response = client.post(f'/api/v1/ai/priority/{ticket_id}', headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data['priority_level'] in ['Low', 'Medium', 'High', 'Critical']
    assert 0 <= data['score'] <= 100
    assert 'rationale' in data