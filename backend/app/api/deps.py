"""Pick the live AI engine or the demo engine."""

from types import SimpleNamespace

from fastapi import HTTPException

from ..core.llm import friendly_error
from ..core.config import demo_mode
from ..demo import engine as demo
from ..services import chat, feedback, personas, prompt_coach, simulation, training

_REAL = SimpleNamespace(
    generate_personas=personas.generate_personas,
    react=simulation.react,
    build_report=simulation.build_report,
    generate_kit=training.generate_kit,
    translate=training.translate,
    analyze=feedback.analyze,
    coach=prompt_coach.coach,
    run_prompt=prompt_coach.run_prompt,
    chat_stream=chat.chat_stream,
    grade=chat.grade,
)


def engine():
    return demo if demo_mode() else _REAL


async def call(fn, *args):
    """Run an engine call and turn failures into a readable HTTP error."""
    try:
        return await fn(*args)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=friendly_error(e))


async def safe_stream(gen):
    try:
        async for chunk in gen:
            yield chunk
    except Exception as e:  # noqa: BLE001
        yield f"\n\n[{friendly_error(e)}]"
