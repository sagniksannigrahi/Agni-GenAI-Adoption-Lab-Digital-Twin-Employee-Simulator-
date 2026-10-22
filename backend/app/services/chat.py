import json
from typing import AsyncIterator

from ..core.llm import parse, stream_text
from ..prompts import templates
from ..schemas.chat import ChatRequest, GradeRequest, SupportGrade


async def chat_stream(req: ChatRequest) -> AsyncIterator[str]:
    system = templates.chat(
        req.context.organization,
        req.context.ai_solution,
        json.dumps(req.persona.model_dump(), indent=1),
        req.mode,
        req.scenario,
    )
    messages = [m.model_dump() for m in req.history]
    if not messages or messages[0]["role"] != "user":
        # Support mode: the employee opens the conversation, so the API still
        # needs a user turn first.
        messages.insert(0, {"role": "user", "content": "(The support chat opens. Describe your problem.)"})
    async for chunk in stream_text(system=system, messages=messages, effort="low", max_tokens=4000):
        yield chunk


async def grade(req: GradeRequest) -> SupportGrade:
    transcript = "\n".join(
        f"{'INTERN' if m.role == 'user' else 'EMPLOYEE'}: {m.content}" for m in req.history
    )
    user = f"""AI solution: {req.context.ai_solution}
Employee: {req.persona.name}, {req.persona.job_title} ({req.persona.ai_literacy} AI literacy)
Scenario: {req.scenario or "Open support request"}

Transcript:
<transcript>
{transcript}
</transcript>"""
    return await parse(system=templates.SUPPORT_GRADER, user=user, output=SupportGrade, effort="medium")
