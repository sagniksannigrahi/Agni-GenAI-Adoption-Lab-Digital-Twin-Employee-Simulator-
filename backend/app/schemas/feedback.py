from typing import List, Literal

from pydantic import BaseModel


class Theme(BaseModel):
    name: str
    description: str
    count: int
    sentiment: Literal["positive", "mixed", "negative"]
    example_quotes: List[str]


class FeedbackIssue(BaseModel):
    title: str
    category: Literal["bug", "usability", "documentation", "compliance", "performance", "training gap", "feature request"]
    severity: Literal["low", "medium", "high"]
    mentions: int
    escalate_to: Literal["Product team", "Engineering", "IT support", "Legal & compliance", "Training team", "No escalation"]
    recommended_next_step: str


class FaqItem(BaseModel):
    question: str
    answer: str


class FeedbackAnalysis(BaseModel):
    executive_summary: str
    total_items: int
    positive: int
    neutral: int
    negative: int
    adoption_health: Literal["healthy", "at risk", "critical"]
    themes: List[Theme]
    issues: List[FeedbackIssue]
    adoption_blockers: List[str]
    quick_wins: List[str]
    faq_candidates: List[FaqItem]


class FeedbackRequest(BaseModel):
    feedback: str
    product: str = ""
