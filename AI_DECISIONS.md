# ResolveAI - AI Design Decisions

## 1. Why OpenAI API Over Self-Hosted Models

### Decision: Use OpenAI API (gpt-4o-mini for classification/response, text-embedding-3-small for embeddings)

### Alternatives Considered
- **Self-hosted Llama 3**: Would require GPU infrastructure, higher operational overhead, slower inference
- **Claude API**: Similar quality but different API format, less predictable pricing
- **Open-source embeddings (sentence-transformers)**: Lower quality, requires own infrastructure

### Rationale
- Faster time-to-market (no infrastructure setup)
- Proven reliability and uptime
- Token efficiency (gpt-4o-mini is cost-effective)
- Good enough quality for ticket classification and response generation
- Managed infrastructure means less maintenance

### Mitigation
- Rule-based fallback when AI provider unavailable
- Gradient degradation rather than sudden failure
- Transparent communication to users when AI features are degraded

## 2. Rule-Based Fallback Strategy

### Decision: Maintain rule-based classification/priority as fallback when AI provider unavailable

### Decision Points
- **When to fallback**: When OpenAI API returns error, times out, or rate-limits
- **Fallback quality**: Slightly lower accuracy but guaranteed availability
- **User experience**: Seamless transition, user may not notice degradation

### Implementation
- AI client is None when no API key configured
- `is_fallback_mode()` checks both key presence and `USE_MOCK_AI` flag
- Classification/priority functions try AI first, then rules
- Clear logging when fallback occurs for monitoring

### Rationale
- Ensures system always works, even without AI provider
- Provides consistent behavior for development/testing
- Demonstrates robustness principle
- Users experience degradation, not outright failure

## 3. Embedding Strategy

### Decision: OpenAI embeddings with hash-based mock fallback

### Decision Points
- **Production**: OpenAI text-embedding-3-small API
- **Development/Testing**: Hash-based mock embeddings
- **Fallback threshold**: Similarity > 0.3 for relevance

### Rationale
- OpenAI embeddings capture semantic meaning effectively
- Hash-based fallback allows development without API key
- Same code path works in both modes
- Dimension consistency (1536) between both modes

### Implementation
- `generate_embedding()` function tries OpenAI first, then falls back
- `is_fallback_mode()` determines which path to take
- Vector store abstraction layer for future provider switching

## 4. Human-in-the-Loop Design

### Decision: Always require agent approval before AI-suggested response sent to customer

### Decision Points
- **Never auto-send**: Even highly confident responses require approval
- **Approval UI**: Edit, approve, or reject in frontend interface
- **Audit trail**: All approvals/rejections logged with agent comments
- **Fallback on rejection**: Agent composes alternative response

### Rationale
- Critical business decisions require human oversight
- Builds trust with users (agents feel in control)
- Prevents accidental inappropriate responses
- Complies with typical business process requirements
- Demonstrates responsible AI deployment

### Implementation
- `SuggestedResponse` model has `requires_approval: True` flag
- `approve_response` endpoint handles the approval workflow
- Frontend displays source citations for agent review
- Rejected responses prompt agent to compose alternative

## 5. Data Privacy & Security

### Decision: Never store raw OpenAI API keys in frontend or logs

### Decision Points
- **API key storage**: Environment variables only, never in source code
- **Data sanitization**: Strip sensitive info from ticket content before sending to AI
- **Workspace isolation**: Each business's data isolated by workspace_id
- **Retention**: Log retention policies, no indefinite storage

### Rationale
- Prevents credential leakage
- Multi-tenant security
- Compliance with data protection regulations
- Builds user trust

### Implementation
- `.env` files never committed to git
- Environment variables loaded at app startup
- Content sanitization before AI sending
- Database access controls by workspace_id

## 5. API Design Decisions

### Decision: RESTful API with JSON bodies and Bearer token auth

### Decision Points
- **Authentication**: JWT with 30-minute expiry, refreshed on login
- **Rate limiting**: 10 req/min AI, 60 req/min general, 5 req/min uploads
- **Error handling**: Standard HTTP status codes, detailed error messages
- **Pagination**: For list endpoints (future scaling)

### Rationale
- Familiar developer experience
- Standard integration with frontend frameworks
- predictable error handling
- Scalable rate limiting strategy

## 8. Testing Strategy

### Decision: Comprehensive test suite with pytest, focusing on integration behavior

### Test Categories
- **Unit tests**: Individual function behavior
- **Integration tests**: End-to-end workflows
- **Fallback tests**: AI unavailable scenarios
- **Security tests**: Authentication/authorization checks

### Rationale
- Catches regressions before deployment
- Ensures fallback mechanisms work
- Validates business logic
- Provides confidence for deployments

## 9. Roadmap AI Decisions

### Phase 1-3: Rule-based foundations (completed)
- Establish baseline functionality without AI dependencies
- Validate business requirements with real users

### Phase 4-5: AI integration (completed)
- Add OpenAI API with proper fallbacks
- Implement human approval workflow
- Test edge cases and degradation scenarios

### Phase 6: Analytics (completed)
- Add data-driven insights using actual database records
- No hardcoded/fake values

### Future: Advanced AI
- Model fine-tuning for ticket classification
- Multilingual support
- Predictive analytics for ticket volume
- Integration with external systems