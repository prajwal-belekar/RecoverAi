# ResolveAI - AI-Powered Customer Support & Issue Resolution Platform

## Project Overview

**ResolveAI** is an AI-powered customer support and issue-resolution platform designed to help small and medium-sized businesses manage customer complaints, automate repetitive support tasks, and improve customer satisfaction.

The platform transforms customer support from a manual, time-consuming process into an intelligent, data-driven workflow.

## Core Features

### A. Intelligent Ticket Management
- Create, view, update, and delete support tickets
- Track ticket status: Open, In Progress, Resolved, and Closed
- Assign tickets to support agents
- Search and filter tickets by category, priority, status, and date
- View complete customer conversation history

### B. AI-Powered Ticket Classification
- Automatically analyzes incoming customer complaints
- Determines issue category, urgency level, customer sentiment, and department
- Returns structured results using a defined schema
- Validates output before saving

### C. Intelligent Priority Detection
- Identifies high-impact customer issues based on severity, customer impact, and sentiment
- Explains why a ticket has received a particular priority

### D. AI Response Assistant
- Generates suggested responses for customer support agents
- Understands the customer's complaint and retrieves relevant knowledge base information
- Generates contextual responses with supporting sources
- Allows agents to edit, approve, or reject responses
- **Never sends customer-facing responses automatically without human approval**

### E. Knowledge Base & RAG
- Upload and manage company documents (FAQs, product documentation, policies, troubleshooting guides)
- Retrieval-Augmented Generation (RAG) for grounded AI responses
- Citations to source documents
- Indicates when sufficient information is unavailable

### F. Root Cause Analysis
- Identifies recurring customer complaints and patterns
- Distinguishes between observed patterns and AI-generated hypotheses
- Generates recommended corrective actions

### G. Business Analytics Dashboard
- Total, open, and resolved tickets
- Average response and resolution times
- Ticket distribution by category
- Customer sentiment trends
- Recurring customer problems
- Estimated support hours saved
- All analytics calculated from actual application data

## Technology Stack

### Frontend
- Next.js 16, React, TypeScript, Tailwind CSS v4, Recharts

### Backend
- Python, FastAPI, SQLAlchemy, Alembic migrations
- PostgreSQL with pgvector extension

### AI Integration
- OpenAI API for classification and response generation
- Embeddings for semantic search
- Retrieval-Augmented Generation (RAG)

### Deployment
- Vercel (frontend)
- Render (backend)
- Managed PostgreSQL database

## Quick Start

### Backend
```bash
cd backend
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

When the current directory is `backend`, `uvicorn main:app --reload` is also
supported through the compatibility entry point in `backend/main.py`.

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Create user account
- `POST /api/v1/auth/login` - JWT authentication
- `POST /api/v1/auth/workspaces` - Create workspace

### Tickets
- `GET /api/v1/tickets` - List tickets (filterable)
- `POST /api/v1/tickets` - Create ticket
- `GET /api/v1/tickets/{id}` - Get ticket detail
- `PATCH /api/v1/tickets/{id}` - Update ticket
- `DELETE /api/v1/tickets/{id}` - Delete ticket

### AI
- `POST /api/v1/ai/classify` - Classify ticket text
- `POST /api/v1/ai/prioritize/{ticket_id}` - Calculate priority
- `POST /api/v1/ai/respond/{ticket_id}` - Get AI suggested response
- `POST /api/v1/ai/response/complete` - Approve/reject response

### Knowledge Base
- `POST /api/v1/knowledge/upload` - Upload document
- `POST /api/v1/knowledge/search` - Semantic search

## Architecture

```
┌────────────────────┐      ┌────────────────────┐
│   Frontend (Vercel)│      │   Backend (Render) │
│   Next.js + React  │↔ API ↔│  FastAPI + SQLAlchemy│
│   Tailwind CSS     │      │  PostgreSQL + pgvector│
└────────────────────┘      └────────────────────┘
           │                          ▲
           ▼                          │
                    ┌──────────────────┐             
                    │   OpenAI API     │             
                    └──────────────────┘
```

## AI Design Decisions

See `AI_DECISIONS.md` for detailed explanations of AI design choices, including:
- Choice of OpenAI over self-hosted models
- Rule-based fallback when AI provider is unavailable
- Keyword-based fallback for embeddings
- Human-in-the-loop for response approval
- Gradient degradation vs. sudden failure

## License

This project is intended for demonstration purposes and internal business use.