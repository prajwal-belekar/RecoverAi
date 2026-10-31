# ResolveAI - Architecture Decision Record

## 1. System Architecture

### 1.1. Full-Stack Architecture
- **Frontend**: Next.js 16 (App Router) with React, TypeScript, Tailwind CSS v4
- **Backend**: FastAPI (Python) with SQLAlchemy ORM and Alembic migrations
- **Database**: PostgreSQL (primary) or SQLite (local development) with pgvector extension
- **AI**: OpenAI API (text-embedding-3-small, gpt-4o-mini) with rule-based fallbacks

### 1.2. Data Flow
1. User uploads documents → text extraction → chunking → embeddings → store in PostgreSQL
2. User creates ticket → AI classification → priority calculation → stored in database
3. User queries ticket → AI classification + RAG search → suggested response with sources
4. Agent approves/rejects response → human approval workflow

### 1.3. Component Architecture

#### Backend Modules
- `app/main.py` - FastAPI application entry point
- `app/api/v1/` - API routes (auth, tickets, AI, knowledge, response)
- `app/core/` - Core utilities (auth, config, vector store)
- `app/models.py` - SQLAlchemy database models
- `app/services/` - Business logic (analytics, root cause)
- `app/db/` - Database configuration and migrations

#### Frontend Modules
- `app/page.tsx` - Landing page
- `app/auth/` - Login and registration pages
- `app/dashboard/` - Dashboard page
- `app/tickets/` - Ticket inbox and details pages
- `app/ai-insights/` - AI insights page
- `app/knowledge-base/` - Knowledge base management page
- `app/settings/` - Settings page

## 2. Database Design

### 2.1. Entity-Relationship Diagram

```
+----------------+     1     +----------------+     1     +----------------+
|     User         |           |   Workspace    |     1     |   Ticket       |
+----------------+     1:n     +----------------+     n:m     +----------------+
| id (PK)        |           | id (PK)        |           | id (PK)        |
| email          |     n:1   | name           |           | title          |
| password_hash  |           | subdomain      |           | description    |
| name           |           | description    |           | status         |
| role           |           | owner_id (FK)  |           | priority       |
| is_active      |           |                |           | category       |
| workspace_id   |     1:1   |                |           | sentiment      |
| (FK)           |           |                |           | department     |
+----------------+           +----------------+           | customer_name  |
                                            | customer_email|
                                            +-----------------+

+----------------+     1:n     +----------------+
|   AIClassification    |     1:n     |    AIPriority    |
+----------------+          +----------------+
| id (PK)        |              | id (PK)          |
| ticket_id (FK) |              | ticket_id (FK)   |
| category       |              | priority_level   |
| urgency        |              | score            |
| sentiment      |              | rationale        |
| department     |              |                  |
| suggested_action|             |                  |
| confidence     |              |                  |
+----------------+              +----------------+

+----------------+     1:n     +----------------+
|  KnowledgeBase   |     1:n    |   APIKey         |
+----------------+          +----------------+
| id (PK)        |            | id (PK)          |
| title          |            | user_id (FK)     |
| content        |            | provider         |
| embedding      |            | key_hash         |
| metadata       |            | created_at       |
| source_type    |            |                  |
| workspace_id (FK)|           |                  |
+----------------+            +----------------+
```

### 2.2. Schema Design Decisions

- **Workspace isolation**: All tables have `workspace_id` (or `owner_id`) for data isolation between businesses
- **PostgreSQL pgvector**: Embedding vectors stored as `VECTOR(1536)` for semantic search
- **SQLite compatibility**: Embeddings stored as JSON arrays for local development
- **Soft deletion**: Tickets use `status` field instead of physical deletion
- **Timestamps**: All tables have `created_at` and `updated_at` for audit trails

### 2.3. Migration Strategy
- Alembic migrations managed through `alembic upgrade head`
- Initial migration creates all core tables
- Future migrations for pgvector extension and index creation

## 3. API Design

### 3.1. Design Principles
- RESTful API conventions
- JSON request/response bodies
- HTTP status codes for error handling
- Pagination for list endpoints
- Filtering and sorting parameters
- JWT authentication via Bearer token

### 3.2. Key Endpoints
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - JWT token generation
- `GET /api/v1/tickets` - List tickets with filters
- `POST /api/v1/tickets` - Create ticket
- `GET /api/v1/ai/classify` - AI ticket classification
- `POST /api/v1/ai/prioritize/{id}` - Priority calculation
- `POST /api/v1/ai/respond/{id}` - AI response generation
- `POST /api/v1/ai/response/complete` - Human approval workflow
- `POST /api/v1/knowledge/upload` - Document upload
- `POST /api/v1/knowledge/search` - Semantic search

## 3.3. Error Handling
- 400 - Bad request (validation errors)
- 401 - Unauthorized (missing/invalid JWT)
- 403 - Forbidden (workspace access denied)
- 404 - Not found (ticket, document, etc.)
- 422 - Validation error
- 429 - Rate limit exceeded
- 500 - Internal server error
- 503 - AI service unavailable (fallback to rules)

## 3.4. Rate Limiting
- AI endpoints: 10 requests/minute per user
- General API: 60 requests/minute per user
- Upload endpoints: 5 requests/minute per user

## 5. Security Design

### 5.1. Authentication
- JWT tokens with 30-minute expiry
- bcrypt password hashing (rounds=12)
- Email validation format
- Unique email and subdomain constraints

### 5.2. Authorization
- Workspace-level data isolation
- JWT token validates workspace membership
- Frontend workspace IDs never trusted - validated backend
- Role-based access (admin/agent/user)

### 5.3. Input Validation
- Pydantic models on all endpoints
- Maximum file size: 10MB for uploads
- Text content sanitization
- Prompt injection protection in uploaded documents

### 5.4. secrets Management
- OpenAI API key via environment variable
- Secret key via environment variable
- Database URL via environment variable
- Never committed to source code

## 5.5. Prompt Injection Protection
- Sanitize all uploaded document content
- Strip executable code and special characters
- Limit token content to prevent overflow
- Validate all user inputs against schema

## 6. Deployment Architecture

### 6.1. Frontend (Vercel)
- Framework: Next.js 16 with App Router
- Build: `npm run build`
- Output: Server-side rendering with static optimization
- Environment variables: OPENAI_API_KEY, SECRET_KEY, DATABASE_URL
- Domain: Vercel-provided URL or custom domain

### 6.2. Backend (Render)
- Framework: FastAPI + Uvicorn
- Build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Environment variables: OPENAI_API_KEY, SECRET_KEY, DATABASE_URL
- PostgreSQL: Managed PostgreSQL with pgvector extension
- Health check: `GET /health`

### 6.3. Database (Managed PostgreSQL)
- Provider: Supabase or Render-managed PostgreSQL
- Extension: pgvector enabled
- Connection: SQLAlchemy with `DATABASE_URL`
- Backup: Automated daily backups
- Migration: Alembic tracked in version control

## 7. AI Design Decisions

### 7.1. LLM Provider Selection
- **Choice**: OpenAI API over self-hosted models
- **Reason**: Better reliability, faster setup, token efficiency
- **Model**: gpt-4o-mini for classification/response, text-embedding-3-small for embeddings
- **Fallback**: Rule-based when API unavailable or rate-limited

### 7.2. Embedding Strategy
- **Choice**: OpenAI embeddings with pgvector fallback
- **Reason**: High quality embeddings, easy integration, pgvector support
- **Fallback**: Hash-based mock embeddings when OpenAI unavailable
- **Dimension**: 1536 (OpenAI embedding size)

### 7.3. RAG Design
- **Choice**: Retrieval-Augmented Generation with chunking
- **Reason**: Grounded responses, citations, handles missing knowledge
- **Chunking**: 500-char chunks with 50-char overlap
- **Similarity**: Cosine similarity with 0.3 threshold

### 7.4. Human Approval Workflow
- **Choice**: Always require agent approval before response sending
- **Reason**: Critical business decisions require human oversight
- **Mechanism**: Agent must explicitly approve/reject before sending
- **Fallback**: Rejected responses prompt agent to compose alternative

### 7.5. Fallback Strategy
- **AI unavailable**: Use rule-based classification/priority
- **Embeddings unavailable**: Use keyword-based search
- **Knowledge base empty**: Provide general response without citations
- **Rate limited**: Queue requests and retry with exponential backoff

## 8. Future Improvements

- Multi-language support
- Advanced analytics with time-series database
- Custom model fine-tuning
- Webhook notifications for ticket updates
- Integration with third-party ticketing systems (Zendesk, ServiceNow)
- Advanced sentiment analysis with emotion detection
- Dashboard customization per business sector