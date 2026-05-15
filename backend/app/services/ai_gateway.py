"""LiteLLM-based AI gateway supporting OpenAI, Anthropic, Gemini, and Ollama."""

from __future__ import annotations

import os
from typing import AsyncIterator

import litellm

from app.core.config import settings

litellm.set_verbose = False

# Push API keys into environment where LiteLLM/provider SDKs expect them.
def _configure() -> None:
    if settings.OPENAI_API_KEY:
        os.environ.setdefault("OPENAI_API_KEY", settings.OPENAI_API_KEY)
    if settings.ANTHROPIC_API_KEY:
        os.environ.setdefault("ANTHROPIC_API_KEY", settings.ANTHROPIC_API_KEY)
    if settings.GOOGLE_API_KEY:
        os.environ.setdefault("GEMINI_API_KEY", settings.GOOGLE_API_KEY)


def _extra_kwargs(model: str) -> dict:
    """Return provider-specific kwargs required by LiteLLM."""
    if model.startswith("ollama/"):
        return {"api_base": settings.OLLAMA_BASE_URL}
    return {}


class AIGateway:
    @staticmethod
    async def complete(
        messages: list[dict],
        model: str | None = None,
        **kwargs,
    ) -> str:
        """Single-shot completion — returns the full response string."""
        _configure()
        model = model or settings.DEFAULT_MODEL
        response = await litellm.acompletion(
            model=model,
            messages=messages,
            **_extra_kwargs(model),
            **kwargs,
        )
        return response.choices[0].message.content or ""

    @staticmethod
    async def stream(
        messages: list[dict],
        model: str | None = None,
        **kwargs,
    ) -> AsyncIterator[str]:
        """Streaming completion — yields token strings as they arrive."""
        _configure()
        model = model or settings.DEFAULT_MODEL
        response = await litellm.acompletion(
            model=model,
            messages=messages,
            stream=True,
            **_extra_kwargs(model),
            **kwargs,
        )
        async for chunk in response:
            content = chunk.choices[0].delta.content
            if content:
                yield content

    @staticmethod
    async def embed(text: str) -> list[float]:
        """Generate a text embedding using the configured embedding model."""
        _configure()
        model = settings.EMBEDDING_MODEL
        response = await litellm.aembedding(
            model=model,
            input=[text],
        )
        return response.data[0]["embedding"]
