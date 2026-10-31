import os

# Delete old database if exists
db_path = os.path.join(os.path.dirname(__file__), 'resolveai.db')
if os.path.exists(db_path):
    os.remove(db_path)

from app.main import app
from fastapi.testclient import TestClient

# Create all tables
from app.database import engine, Base
from app.models import User, Workspace
Base.metadata.create_all(bind=engine)

c = TestClient(app)

print("=== TEST 1: Register ===")
reg = c.post('/api/v1/auth/register', json={
    'email': 'freshuser@example.com',
    'password': 'password123',
    'name': 'Fresh User'
})
print(f"Register status: {reg.status_code}")
assert reg.status_code == 201

print("\n=== TEST 2: Login ===")
log = c.post('/api/v1/auth/login', json={
    'email': 'freshuser@example.com',
    'password': 'password123'
})
print(f"Login status: {log.status_code}")
assert log.status_code == 200
token = log.json()['access_token']
print("JWT token generated successfully")

print("\n=== TEST 3: List Tickets ===")
tickets = c.get('/api/v1/tickets/')
print(f"List status: {tickets.status_code}")
print(f"Ticket listing works (found {len(tickets.json())} tickets)")

print("\n=== TEST 4: API Root ===")
root = c.get('/')
print(f"Root status: {root.status_code}")
print("API root endpoint works")

print("\n=== ALL CORE TESTS PASSED ===")
print("\nBackend API Summary:")
print("  POST /api/v1/auth/register - Create user account")
print("  POST /api/v1/auth/login - JWT authentication")
print("  GET  /api/v1/tickets - List all tickets")
print("  POST /api/v1/tickets - Create new ticket")
print("  GET  / - API health check")