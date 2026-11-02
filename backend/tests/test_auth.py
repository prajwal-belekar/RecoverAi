import os
import sys
db_path = os.path.join(os.path.dirname(__file__), '..', '..', 'resolveai.ai')

from app.main import app
from fastapi.testclient import TestClient
from app.database import engine, Base
from app.models import User
from sqlalchemy.orm import Session
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def login():
    client.post('/api/v1/auth/register', json={'email': 'test@example.com', 'password': 'password123', 'name': 'Test User'})
    return client.post('/api/v1/auth/login', json={'email': 'test@example.com', 'password': 'password123'})

def clean_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

def test_register_valid():
    clean_db()
    response = client.post('/api/v1/auth/register', json={'email': 'test@example.com', 'password': 'password123', 'name': 'Test User'})
    assert response.status_code == 201
    data = response.json()
    assert data['email'] == 'test@example.com'
    assert data['name'] == 'Test User'

def test_register_duplicate_email():
    clean_db()
    client.post('/api/v1/auth/register', json={'email': 'test@example.com', 'password': 'password123', 'name': 'Test User'})
    response = client.post('/api/v1/auth/register', json={'email': 'test@example.com', 'password': 'password123', 'name': 'Test User 2'})
    assert response.status_code == 400

def test_login_valid():
    clean_db()
    login_response = login()
    assert login_response.status_code == 200
    assert 'access_token' in login_response.json()

def test_login_invalid():
    clean_db()
    response = client.post('/api/v1/auth/login', json={'email': 'test@example.com', 'password': 'wrongpassword'})
    assert response.status_code == 401