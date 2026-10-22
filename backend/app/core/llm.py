"""Thin wrapper around the LLM SDK used by every service."""

from typing import AsyncIterator, List, Optional, Type, TypeVar

import anthropic
from pydantic import BaseModel

from .config import MODEL

# Server-side fallback: if a safety classifier declines a request,
# the API retries it on the provider's recommended fallback model.
BETAS = ["server-side-fallback-2026-07-01"]
FALLBACKS = "default"

T = TypeVar("T", bound=BaseModel)
_client: Optional[anthropic.AsyncAnthropic] = None


class AgniError(RuntimeError):
    """An error with a message that is safe to show in the UI."""


def client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(max_retries=4)
    return _client


async def parse(
    *,
    system: str,
    user: str,
    output: Type[T],
    effort: str = "medium",
    max_tokens: int = 16000,
) -> T:
    """One LLM call that returns a validated Pydantic object."""
    response = await client().beta.messages.parse(
        model=MODEL,
        max_tokens=max_tokens,
        betas=BETAS,
        fallbacks=FALLBACKS,
        output_config={"effort": effort},
        cache_control={"type": "ephemeral"},
        system=[{"type": "text", "text": system}],
        messages=[{"role": "user", "content": user}],
        output_format=output,
    )
    if response.stop_reason == "refusal":
        raise AgniError("The AI model declined this request. Try rewording the input.")
    if response.stop_reason == "max_tokens" or response.parsed_output is None:
        raise AgniError("The response was cut off. Try a shorter input.")
    return response.parsed_output


async def stream_text(
    *,
    system: str,
    messages: List[dict],
    effort: str = "low",
    max_tokens: int = 8000,
) -> AsyncIterator[str]:
    """Stream plain text from the LLM."""
    async with client().beta.messages.stream(
        model=MODEL,
        max_tokens=max_tokens,
        betas=BETAS,
        fallbacks=FALLBACKS,
        output_config={"effort": effort},
        system=system,
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield text
        final = await stream.get_final_message()
        if final.stop_reason == "refusal":
            yield "\n\n(This response was declined. Try rephrasing.)"


def friendly_error(e: Exception) -> str:
    if isinstance(e, AgniError):
        return str(e)
    if isinstance(e, anthropic.AuthenticationError):
        return "Your API key was rejected. Check ANTHROPIC_API_KEY."
    if isinstance(e, anthropic.RateLimitError):
        return "Rate limited by the AI provider. Wait a minute or lower AGNI_MAX_PARALLEL."
    if isinstance(e, anthropic.APIStatusError):
        return f"AI provider error ({e.status_code}): {e.message}"
    if isinstance(e, anthropic.APIConnectionError):
        return "Could not reach the AI provider. Check your internet connection."
    return f"Unexpected error: {e}"
