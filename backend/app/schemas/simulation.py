from typing import List, Literal, Optional

from pydantic import BaseModel

from .persona import OrgContext, Persona


class Reaction(BaseModel):
    first_impression: str
    emotional_state: str
    sentiment: int
    clarity: int
    confidence_to_use: int
    adoption_likelihood: int
    would_recommend: bool
    what_they_like: List[str]
    confusion_points: List[str]
    questions_they_would_ask: List[str]
    possible_issues: List[str]
    what_would_help: str


class SegmentInsight(BaseModel):
    segment: str
    summary: str
    avg_adoption: int


class PredictedTicket(BaseModel):
    question: str
    likely_from: str
    suggested_answer: str


class Issue(BaseModel):
    title: str
    category: Literal["bug", "usability", "documentation", "compliance", "performance", "training gap"]
    severity: Literal["low", "medium", "high"]
    affected_segments: List[str]
    escalate_to: Literal["Product team", "Engineering", "IT support", "Legal & compliance", "Training team", "No escalation"]
    evidence: str


class TrainingAction(BaseModel):
    action: str
    audience: str
    format: str
    impact: Literal["low", "medium", "high"]


class SimulationReport(BaseModel):
    headline: str
    verdict: Literal["ready", "needs work", "not ready"]
    readiness_score: int
    executive_summary: str
    winning_variant: Literal["A", "B", "tie", "n/a"]
    variant_comparison: str
    segment_insights: List[SegmentInsight]
    strengths: List[str]
    issue_log: List[Issue]
    predicted_tickets: List[PredictedTicket]
    training_actions: List[TrainingAction]
    surprising_insight: str


class SimulateRequest(BaseModel):
    context: OrgContext
    personas: List[Persona]
    test_type: str
    variant_a: str
    variant_b: Optional[str] = None
