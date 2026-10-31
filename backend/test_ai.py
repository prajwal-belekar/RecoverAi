import os
db_path = os.path.join('D:\ResolveAi\backend', 'resolveai.db')
if os.path.exists(db_path):
    os.remove(db_path)

from app.main import app
from fastapi.testclient import TestClient
from app.database import engine, Base
from app.models import User, Workspace, Ticket
Base.metadata.create_all(bind=engine)

c = TestClient(app)

# Register and login
c.post('/api/v1/auth/register', json={'email': 'test@test.com', 'password': 'pass', 'name': 'Test'})
log = c.post('/api/v1/auth/login', json={'email': 'test@test.com', 'password': 'pass'})
token = log.json()['access_token']

# Create a ticket
tk = c.post('/api/v1/tickets/', json={'title': 'Payment failure', 'description': 'Payment not going through', 'category': 'billing', 'customer_name': 'Test', 'customer_email': 'test@test.com'})
print('Create ticket status:', tk.status_code)
ticket_id = tk.json()['id']
print(f'Ticket ID: {ticket_id}')

# Test classify
cls = c.post(f'/api/v1/ai/classify?ticket_id={ticket_id}')
print(f'Classify status: {cls.status_code}')
print(f'Classify json: {cls.json()}')

# Test priority
pr = c.post(f'/api/v1/ai/priority/{ticket_id}')
print(f'Priority status: {pr.status_code}')
print(f'Priority json: {pr.json()}')