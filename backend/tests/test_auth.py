import os
import sys
# Delete old database if exists at module level
db_path = os.path.join(os.path.dirname(__file__), '..', '..', 'resolveai.db')
if os.path.exists(db_path):
    os.remove(db_path)

from app.main import app
from fastapi.testclient import TestClient
from app.database import engine, Base
from app.models import User
from sqlalchemy.orm import Session
Base.metadata.create_all(bind=engine)

def setup_module():
    """Setup run before tests."""
    Base.metadata.create_all(bind=engine)

def teardown_module():
    """Teardown run after tests."""
    pass

client = TestClient(app)

def test_register_valid():
    """Test user registration with valid data."""
    response = client.post('/api/v1/auth/register', json={
        'email': 'test@example.com',
        'password': 'password123',
        'name': 'Test User'
    })
    assert response.status_code == 201
    data = response.json()
    assert data['email'] == 'test@example.com'
    assert data['name'] == 'Test User'

def test_register_duplicate_email():
    """Test registration with duplicate email."""
    client.post('/api/v1/auth/register', json={
        'email': 'test@example.com',
        'password': 'password123',
        'name': 'Test User'
    })
    response = client.post('/api/v1/auth/register', json={
        'email': 'test@example.com',
        'password': 'password123',
        'name': 'Test User 2'
    })
    assert response.status_code == 400

def test_login_valid():
    """Test valid login."""
    client.post('/api/v1/auth/register', json={
        'email': 'test@example.com',
        'password': 'password123',
        'name': 'Test User'
    })
    response = client.post('/api/v1/auth/login', json={
        'email': 'test@example.com',
        'password': 'password123'
    })
    assert response.status_code == 200
    assert 'access_token' in response.json()

def test_login_invalid():
    """Test login with invalid credentials."""
    response = client.post('/api/v1/auth/login', json={
        'email': 'test@example.com',
        'password': 'wrongpassword'
    })
    assert response.status_code == 401