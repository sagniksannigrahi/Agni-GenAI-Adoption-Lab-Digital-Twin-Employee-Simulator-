from typing import List

from pydantic import BaseModel


class CriterionScore(BaseModel):
    criterion: str
    score: int
    comment: str


class PromptReview(BaseModel):
    overall_score: int
    summary: str
    criteria: List[CriterionScore]
    problems: List[str]
    improved_prompt: str
    improved_score: int
    why_it_is_better: List[str]
    techniques_used: List[str]
    reusable_template: str


class CoachRequest(BaseModel):
    prompt: str
    goal: str = ""
    user_role: str = ""


class RunPromptRequest(BaseModel):
    prompt: str
