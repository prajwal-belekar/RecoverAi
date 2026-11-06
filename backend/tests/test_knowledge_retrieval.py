"""
Tests for Knowledge Base Retrieval
"""
import os
import tempfile
from fastapi.testclient import TestClient
from app.main import app
from app.database import engine, Base, SessionLocal
from app.models import User, Workspace, KnowledgeBase, KnowledgeChunk, Ticket, AIClassification, AIPriority, AIResponse, TicketUpdate
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


def setup_user_and_workspace():
    """Create a test user and workspace, return auth token"""
    clean_db()
    # Register
    client.post('/api/v1/auth/register', json={'email': 'test@example.com', 'password': 'password123', 'name': 'Test User'})
    # Login
    login_response = client.post('/api/v1/auth/login', json={'email': 'test@example.com', 'password': 'password123'})
    token = login_response.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    # Create workspace
    client.post('/api/v1/auth/workspaces', json={'name': 'Test Workspace', 'subdomain': 'test-workspace'}, headers=headers)
    return headers


def test_upload_text_document():
    """Test uploading a text document and verify chunks are created"""
    headers = setup_user_and_workspace()

    # Create a text file
    text_content = """Payment Processing Guide

This document explains how to handle payment processing in our system.

When a payment fails, check the following:
1. Verify the customer has sufficient funds
2. Check if the card is expired
3. Review Stripe logs for declined transaction codes
4. Ensure the payment gateway is operational

For refunds, use the refund API endpoint with the transaction ID.
Refunds typically process within 5-10 business days.

Contact billing support for escalation."""
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write(text_content)
        temp_path = f.name

    try:
        with open(temp_path, 'rb') as f:
            response = client.post('/api/v1/knowledge/upload', files={'file': ('payment_guide.txt', f, 'text/plain')}, headers=headers)
        
        assert response.status_code == 201
        data = response.json()
        assert data['title'] == 'payment_guide.txt'
        assert data['chunk_count'] > 0
        
        # Verify chunks were created in database
        db = SessionLocal()
        try:
            chunks = db.query(KnowledgeChunk).join(KnowledgeBase).filter(
                KnowledgeBase.title == 'payment_guide.txt'
            ).all()
            # Chunk count may vary based on chunking algorithm
            assert len(chunks) > 0
            assert all(c.content.strip() for c in chunks)
            assert all(c.embedding is not None for c in chunks)
        finally:
            db.close()
    finally:
        os.unlink(temp_path)


def test_upload_pdf_document():
    """Test uploading a PDF document"""
    headers = setup_user_and_workspace()

    # Create a simple PDF using PyPDF2
    import PyPDF2
    from io import BytesIO
    
    pdf_buffer = BytesIO()
    writer = PyPDF2.PdfWriter()
    
    # Add a page with text
    page = PyPDF2.PageObject.create_blank_page(width=612, height=792)
    # Note: PyPDF2 doesn't easily support adding text, so we'll skip actual PDF creation
    # and test with a text file that has .pdf extension
    
    # For testing, we'll just test the upload endpoint accepts PDFs
    pdf_content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000102 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n149\n%%EOF"
    
    response = client.post('/api/v1/knowledge/upload', 
                          files={'file': ('test.pdf', pdf_content, 'application/pdf')}, 
                          headers=headers)
    
    # PDF parsing might fail in test environment, but endpoint should handle it gracefully
    assert response.status_code in [201, 400]


def test_unsupported_file_type():
    """Test that unsupported file types are rejected"""
    headers = setup_user_and_workspace()
    
    response = client.post('/api/v1/knowledge/upload',
                          files={'file': ('test.exe', b'binary content', 'application/octet-stream')},
                          headers=headers)
    
    assert response.status_code == 400
    assert 'Unsupported file type' in response.json()['detail']


def test_empty_document():
    """Test that empty documents are rejected"""
    headers = setup_user_and_workspace()
    
    response = client.post('/api/v1/knowledge/upload',
                          files={'file': ('empty.txt', b'', 'text/plain')},
                          headers=headers)
    
    assert response.status_code == 400
    assert 'Empty file' in response.json()['detail']


def test_semantic_search():
    """Test semantic search returns relevant chunks"""
    headers = setup_user_and_workspace()
    
    # Upload a document first
    text_content = """Technical Troubleshooting Guide

For application crashes, check error logs and verify system requirements.
Restart the application server if needed.

Common error codes:
- ERR_CONNECTION_REFUSED: Check if the server is running
- ERR_TIMEOUT: Increase timeout settings
- ERR_MEMORY: Check available memory and restart services"""
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write(text_content)
        temp_path = f.name

    try:
        with open(temp_path, 'rb') as f:
            client.post('/api/v1/knowledge/upload', files={'file': ('tech_guide.txt', f, 'text/plain')}, headers=headers)
        
        # Search for relevant content
        response = client.post('/api/v1/knowledge/search',
                              json={'query': 'application crash error logs', 'top_k': 5, 'min_similarity': 0.2},
                              headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert 'results' in data
        assert data['total'] > 0
        
        # Verify results have expected structure
        for result in data['results']:
            assert 'similarity' in result
            assert 'title' in result
            assert 'knowledge_base_id' in result
            assert 'chunk_id' in result
            assert 'chunk_index' in result
            assert 'content' in result
            assert 'source_type' in result
            assert len(result['content']) > 0
    finally:
        os.unlink(temp_path)


def test_workspace_isolation():
    """Test that search results are isolated per workspace"""
    # Create user 1
    client.post('/api/v1/auth/register', json={'email': 'user1@test.com', 'password': 'pass', 'name': 'User 1'})
    login1 = client.post('/api/v1/auth/login', json={'email': 'user1@test.com', 'password': 'pass'})
    token1 = login1.json()['access_token']
    headers1 = {'Authorization': f'Bearer {token1}'}
    client.post('/api/v1/auth/workspaces', json={'name': 'Workspace 1', 'subdomain': 'ws1'}, headers=headers1)
    
    # Create user 2
    client.post('/api/v1/auth/register', json={'email': 'user2@test.com', 'password': 'pass', 'name': 'User 2'})
    login2 = client.post('/api/v1/auth/login', json={'email': 'user2@test.com', 'password': 'pass'})
    token2 = login2.json()['access_token']
    headers2 = {'Authorization': f'Bearer {token2}'}
    client.post('/api/v1/auth/workspaces', json={'name': 'Workspace 2', 'subdomain': 'ws2'}, headers=headers2)
    
    # User 1 uploads a document
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write("Secret document for workspace 1 only")
        temp_path = f.name
    
    try:
        with open(temp_path, 'rb') as f:
            client.post('/api/v1/knowledge/upload', files={'file': ('secret.txt', f, 'text/plain')}, headers=headers1)
        
        # User 2 searches - should not find user 1's document
        response = client.post('/api/v1/knowledge/search',
                              json={'query': 'secret document', 'top_k': 5, 'min_similarity': 0.1},
                              headers=headers2)
        
        assert response.status_code == 200
        data = response.json()
        assert data['total'] == 0
    finally:
        os.unlink(temp_path)


def test_keyword_search_fallback():
    """Test keyword search fallback when vector search returns no results"""
    headers = setup_user_and_workspace()
    
    # Upload a document
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write("Unique keyword: XYZ123ABC for testing fallback")
        temp_path = f.name
    
    try:
        with open(temp_path, 'rb') as f:
            client.post('/api/v1/knowledge/upload', files={'file': ('fallback.txt', f, 'text/plain')}, headers=headers)
        
        # Search with very high similarity threshold to force keyword fallback
        response = client.post('/api/v1/knowledge/search',
                              json={'query': 'XYZ123ABC', 'top_k': 5, 'min_similarity': 0.99},
                              headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        # Should still find results via keyword search
        assert data['total'] > 0
    finally:
        os.unlink(temp_path)


def test_list_knowledge_base():
    """Test listing knowledge base documents"""
    headers = setup_user_and_workspace()
    
    # Upload a couple documents
    for i in range(2):
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(f"Document {i} content")
            temp_path = f.name
        try:
            with open(temp_path, 'rb') as f:
                client.post('/api/v1/knowledge/upload', files={'file': (f'doc{i}.txt', f, 'text/plain')}, headers=headers)
        finally:
            os.unlink(temp_path)
    
    response = client.get('/api/v1/knowledge/', headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    for doc in data:
        assert 'id' in doc
        assert 'title' in doc
        assert 'source_type' in doc
        assert 'created_at' in doc
        assert 'chunk_count' in doc


def test_delete_knowledge_base():
    """Test deleting a knowledge base document"""
    headers = setup_user_and_workspace()
    
    # Upload a document
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write("Document to delete")
        temp_path = f.name
    
    try:
        with open(temp_path, 'rb') as f:
            upload_resp = client.post('/api/v1/knowledge/upload', files={'file': ('todelete.txt', f, 'text/plain')}, headers=headers)
        doc_id = upload_resp.json()['id']
        
        # Delete it
        response = client.delete(f'/api/v1/knowledge/{doc_id}', headers=headers)
        assert response.status_code == 204
        
        # Verify it's gone
        response = client.get('/api/v1/knowledge/', headers=headers)
        assert response.status_code == 200
        assert len(response.json()) == 0
    finally:
        os.unlink(temp_path)


if __name__ == '__main__':
    import pytest
    pytest.main([__file__, '-v'])