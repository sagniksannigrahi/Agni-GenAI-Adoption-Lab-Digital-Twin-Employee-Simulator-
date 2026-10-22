from ..core.llm import parse
from ..prompts import templates
from ..schemas.feedback import FeedbackAnalysis, FeedbackRequest


async def analyze(req: FeedbackRequest) -> FeedbackAnalysis:
    user = f"""Product: {req.product or "Internal GenAI assistant"}

Raw feedback:
<feedback>
{req.feedback}
</feedback>"""
    return await parse(system=templates.FEEDBACK, user=user, output=FeedbackAnalysis, effort="medium")
