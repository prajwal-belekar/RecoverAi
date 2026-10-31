# ResolveAI - Testing Guide

## Overview

This document describes the testing strategy and provides instructions for running the test suite.

## Test Categories

### 1. Backend Tests (Pytest)

#### Location
`tests/` directory

#### How to Run
```bash
cd backend
python -m pytest tests/ -v
```

#### Test Files
- `test_auth.py` - Authentication flow (register, login)
- `test_tickets.py` - Ticket CRUD, AI classification/priority
- `test_knowledge.py` - Knowledge base upload, search
- `test_response.py` - Response generation, approval

### Running Tests

```bash
# Run all tests
python -m pytest tests/ -v

# Run specific test file
python -m pytest tests/test_auth.py -v

# Run specific test
python -m pytest tests/test_tickets.py::test_create_ticket -v
```

### Test Isolation
Each test function cleans the database before running to ensure isolation:
- Database tables are dropped and recreated before each test
- No shared state between tests
- Unique data per test

### Adding New Tests
1. Create a new file in `tests/` directory
2. Follow the naming convention: `test_*.py`
3. Include `clean_db()` at the start of each test function
4. Use `login()` helper to authenticate
5. Use unique ticket/IDs to avoid conflicts

### Example Test Pattern
```python
def test_something():
    clean_db()  # Clean database before test
    login_response = login()  # Authenticate
    # Test logic
    response = client.post(...)
    assert response.status_code == 200
    assert response.json()['field'] == 'expected_value'
```

## Frontend Tests (Playwright)

### Location
Playwright tests are planned for future implementation.

### How to Run (when implemented)
```bash
cd frontend
npx playwright test
```

### Test Coverage (Planned)
- Registration and login flow
- Dashboard loading and data fetching
- Ticket creation and updates
- AI response generation and approval
- Knowledge base uploads
- Navigation and error states

## Quality Gates

### Code Quality
- All new features must have test coverage
- No breaking changes without deprecation period
- Type checking with TypeScript/Strict mode

### Performance
- API response time < 2 seconds (local development)
- Database query optimization
- Embedding generation caching

### Security
- Authentication tested for all endpoints
- Workspace isolation verified
- Input validation tested
- Rate limiting tested

## Compliance

### Privacy
- No personally identifiable information in test data
- Database cleaned after test suite
- No real customer data used

### Reliability
- Tests are deterministic (no random values)
- Database state is predictable after cleanup
- Failures provide clear error messages