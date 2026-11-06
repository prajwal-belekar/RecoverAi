FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/app ./app
COPY alembic.ini .
COPY alembic ./alembic

# Environment configuration
ENV DATABASE_URL=${DATABASE_URL:-postgresql://user:password@db:5432/resolveai}
ENV SECRET_KEY=${SECRET_KEY}
ENV OPENAI_API_KEY=${OPENAI_API_KEY}
ENV AI_MODEL=${AI_MODEL:-gpt-4o-mini}
ENV AI_TEMPERATURE=${AI_TEMPERATURE:-0.0}
ENV AI_MAX_TOKENS=${AI_MAX_TOKENS:-1000}
ENV USE_MOCK_AI=${USE_MOCK_AI:-false}
ENV ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-http://localhost:3000,http://localhost:3001}
ENV MAX_FILE_SIZE_MB=${MAX_FILE_SIZE_MB:-10}

# Run migrations on startup and start the server
CMD alembic upgrade head && gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:8000