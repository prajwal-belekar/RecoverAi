import os
db_path = os.path.join('D:\ResolveAi\backend', 'resolveai.db')
if os.path.exists(db_path):
    os.remove(db_path)

from app.main import app
from fastapi.testclient import TestClient
from app.database import engine, Base
from app.models import User, Ticket, AIClassification
Base.metadata.create_all(bind=engine)

c = TestClient(app)

# Register and login
reg = c.post('/api/v1/auth/register', json={'email': 'test@test.com', 'password': 'pass', 'name': 'Test'})
print(f'Register: {reg.status_code}')

log = c.post('/api/v1/auth/login', json={'email': 'test@test.com', 'password': 'pass'})
print(f'Login: {log.status_code}')

# Create a ticket
tk = c.post('/api/v1/tickets/', json={'title': 'Payment failure', 'description': 'Payment not going through', 'category': 'billing', 'customer_name': 'Test', 'customer_email': 'test@test.com'})
print(f'Ticket: {tk.status_code}, id: {tk.json().get("id", "N/A") if tk.status_code == 201 else "failed"}')

if tk.status_code == 201:
    ticket_id = tk.json()['id']
    
    # Test suggested response
    resp = c.post(f'/api/v1/response/{ticket_id}')
    print(f'Suggested response status: {resp.status_code}')
    if resp.status_code == 200:
        print(f'Suggested response: {resp.json()}')
    
    # Test response approval
    approval = c.post('/api/v1/response/approve', json={'approved': True, 'agent_comments': 'Looks good'})
    print(f'Approval status: {approval.status_code}')
    if approval.status_code == 200:
        print(f'Approval: {approval.json()}')