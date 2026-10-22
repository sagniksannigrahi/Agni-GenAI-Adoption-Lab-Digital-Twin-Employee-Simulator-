from typing import AsyncIterator

from ..core.llm import parse, stream_text
from ..prompts import templates
from ..schemas.prompt_coach import CoachRequest, PromptReview


async def coach(req: CoachRequest) -> PromptReview:
    user = f"""User's role: {req.user_role or "Not specified"}
What they want to achieve: {req.goal or "Not specified"}

Their prompt:
<prompt>
{req.prompt}
</prompt>"""
    return await parse(system=templates.PROMPT_COACH, user=user, output=PromptReview, effort="medium")


async def run_prompt(prompt: str) -> AsyncIterator[str]:
    """Run a prompt as-is, so users can compare the original and improved results."""
    async for chunk in stream_text(
        system="You are a helpful workplace AI assistant. Keep answers under 250 words.",
        messages=[{"role": "user", "content": prompt}],
        effort="low",
        max_tokens=4000,
    ):
        yield chunk
