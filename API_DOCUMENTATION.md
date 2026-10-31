# ResolveAI API Documentation

## Base URL
`https://your-backend-url.com/api/v1/`

## Authentication
All API endpoints (except auth) require Bearer JWT token authentication.

### Obtain Token
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Response
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Authorization Header
```
Authorization: Bearer <access_token>
```

## Endpoints

### Authentication

#### POST /api/v1/auth/register
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"
}
```

**Response (201):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "User Name",
  "workspace_id": null
}
```

#### POST /api/v1/auth/login
Authenticate and get JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

#### POST /api/v1/auth/workspaces
Create a new workspace.

**Request:**
```json
{
  "name": "My Company",
  "subdomain": "my-company"
}
```

**Response (201):**
```json
{
  "id": 1,
  "name": "My Company",
  "subdomain": "my-company",
  "description": null
}
```

### Tickets

#### GET /api/v1/tickets
List tickets with optional filters.

**Query Parameters:**
- `status`: Filter by status (Open, In Progress, Resolved, Closed)
- `priority`: Filter by priority (Low, Medium, High, Critical)
- `category`: Filter by category
- `search`: Search in title and description

**Response (200):**
```json
[
  {
    "id": 1,
    "title": "Payment failure",
    "description": "Payment not going through",
    "status": "Open",
    "priority": "High",
    "category": "billing",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "agent_id": null,
    "workspace_id": 1,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

#### POST /api/v1/tickets
Create a new ticket.

**Request:**
```json
{
  "title": "Payment failure",
  "description": "Payment not going through",
  "category": "billing",
  "customer_name": "John Doe",
  "customer_email": "john@example.com"
}
```

**Response (201):**
```json
{
  "id": 1,
  "title": "Payment failure",
  "description": "Payment not going through",
  "status": "Open",
  "priority": "Medium",
  "category": "billing",
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "agent_id": null,
  "workspace_id": 1
}
```

#### GET /api/v1/tickets/{ticket_id}
Get a specific ticket.

**Response (200):** Same structure as POST response.

#### PATCH /api/v1/tickets/{ticket_id}
Update a ticket.

**Request:**
```json
{
  "title": "Updated title",
  "status": "Resolved"
}
```

**Response (200):** Updated ticket object.

#### DELETE /api/v1/tickets/{ticket_id}
Delete a ticket.

**Response (204):** No content.

### AI

#### POST /api/v1/ai/classify
Classify a ticket using AI.

**Request:**
```json
{
  "ticket_id": 1
}
```

**Response (200):**
```json
{
  "category": "billing",
  "urgency": "critical",
  "sentiment": "negative",
  "department": "billing",
  "suggested_action": "Escalate to payment gateway technical team immediately",
  "confidence": 0.95
}
```

#### POST /api/v1/ai/prioritize/{ticket_id}
Calculate priority for a ticket.

**Response (200):**
```json
{
  "priority_level": "Critical",
  "score": 95.0,
  "rationale": "Critical business impact with urgent customer sentiment and escalation indicators. Automated detection of payment/technical failures takes precedence."
}
```

#### POST /api/v1/ai/respond/{ticket_id}
Get AI-suggested response for a ticket.

**Response (200):**
```json
{
  "response": "Hi there,\n\nThank you for reaching out regarding this critical billing issue...\n\nBest regards,\nCustomer Support Team",
  "confidence": 0.95,
  "sources": [
    {
      "title": "Payment Troubleshooting Guide",
      "snippet": "If payment fails, check Stripe logs for declined transactions.",
      "source": "Knowledge Base"
    }
  ],
  "requires_approval": true
}
```

#### POST /api/v1/ai/response/complete
Approve or reject AI-suggested response.

**Request:**
```json
{
  "approved": true,
  "agent_comments": "Looks good, sending to customer"
}
```

**Response (200):**
```json
{
  "status": "approved",
  "message": "Response approved and ready for customer delivery",
  "requires_human_oversight": false
}
```

### Knowledge Base

#### POST /api/v1/knowledge/upload
Upload a knowledge base document.

**Request:** `multipart/form-data`
- `file`: PDF, TXT, or DOCX file

**Response (201):**
```json
{
  "id": 1,
  "title": "payment_guide.txt",
  "source_type": "unknown",
  "created_at": "2024-01-15T10:30:00Z",
  "chunk_count": 1
}
```

#### POST /api/v1/knowledge/search
Search the knowledge base.

**Request:**
```json
{
  "query": "payment failed"
}
```

**Response (200):**
```json
{
  "results": [
    {
      "similarity": 0.85,
      "title": "payment_guide.txt",
      "snippet": "If payment fails, check Stripe logs for declined transactions.",
      "source_type": "unknown",
      "chunk_index": 0
    }
  ],
  "query": "payment failed",
  "total": 1
}
```

## Error Responses

### 400 Bad Request
```json
{
  "detail": ["Field required", "Invalid value"]
}
```

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 404 Not Found
```json
{
  "detail": "Ticket not found"
}
```

### 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "field_name"],
      "msg": "Field required",
      "path": "field_name",
      "input": ""
    }
]
```

## Versioning
API version is v1. backward-incompatible changes will be versioned separately (v2, v3, etc.).

## Version History
- **v1.0.0**: Initial release with core features (auth, tickets, AI classification, knowledge base, response assistant)

# Testing

## Running Tests

### Backend Tests (Pytest)

```bash
cd backend
python -m pytest tests/ -v
```

### Test Structure

Tests are located in the `tests/` directory:
- `test_auth.py` - Authentication (register, login)
- `test_tickets.py` - Ticket CRUD, AI classification, priority
- `test_knowledge.py` - Knowledge base upload, search
- `test_response.py` - Response generation, approval

### Running Specific Tests

```bash
# Run all tests
python -m pytest tests/ -v

# Run specific test file
python -m pytest tests/test_auth.py -v

# Run specific test
python -m pytest tests/test_tickets.py::test_create_ticket -v
```

### Test Environment

Tests use an in-memory SQLite database that is cleaned before each test function.

### Test Dependencies

```bash
pip install pytest fastapi pytest-testclient
```

### Test Coverage

Current test coverage includes:
- Authentication: register, login, validation
- Tickets: CRUD operations, workspace isolation
- AI: Classification, priority, response generation
- Knowledge base: Upload, search

## Development

### Local Development

```bash
# Backend
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm run dev
```

### Environment Variables

Create a `.env` file in the backend directory:
```
OPENAI_API_KEY=sk-your-key-here
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///./resolveai.db
```

### Deployment

```bash
# Frontend (Vercel)
vercel deploy

# Backend (Render)
# Set environment variables in Render dashboard
# Deploy via GitHub integration

# Database
# Use managed PostgreSQL with pgvector extension
```

## API Change Log

### v1.0.0 - Initial Release
- Auth registration and login
- Ticket CRUD operations
- AI classification and priority
- Knowledge base upload and search
- AI response assistant with human approval
- Business analytics dashboard
- PostgreSQL + SQLite support
- Rule-based AI fallback