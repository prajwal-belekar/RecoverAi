"""
ResolveAI AI Configuration
"""
import os
from typing import Optional

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("AI_MODEL", "gpt-4o-mini")
AI_TEMPERATURE = float(os.getenv("AI_TEMPERATURE", "0.0"))
AI_MAX_TOKENS = int(os.getenv("AI_MAX_TOKENS", "1000"))

# fallback to rule-based when AI is unavailable
USE_MOCK_AI = os.getenv("USE_MOCK_AI", "false").lower() == "true"

# Anthropic fallback (optional)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-3-haiku-20240307")

def is_ai_available() -> bool:
    """Check if AI provider API key is configured."""
    return bool(OPENAI_API_KEY) or bool(ANTHROPIC_API_KEY)

def get_fallback_mode() -> bool:
    """Whether to use mock AI rules when provider is unavailable."""
    return not is_ai_available() or USE_MOCK_AI