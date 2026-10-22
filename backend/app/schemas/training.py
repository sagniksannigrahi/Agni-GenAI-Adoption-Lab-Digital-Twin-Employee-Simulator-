from typing import List

from pydantic import BaseModel

from .persona import OrgContext


class TrainingSection(BaseModel):
    heading: str
    content: str
    speaker_notes: str
    minutes: int


class Exercise(BaseModel):
    title: str
    prompt_to_try: str
    expected_outcome: str


class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    answer_index: int
    explanation: str


class GlossaryItem(BaseModel):
    term: str
    plain_english: str


class TrainingKit(BaseModel):
    title: str
    audience: str
    format: str
    total_minutes: int
    learning_objectives: List[str]
    sections: List[TrainingSection]
    hands_on_exercises: List[Exercise]
    quiz: List[QuizQuestion]
    glossary: List[GlossaryItem]
    do_and_dont: List[str]


class TrainingRequest(BaseModel):
    context: OrgContext
    topic: str
    audience: str
    format: str = "Live workshop"
    minutes: int = 45
    ai_literacy: str = "beginner"


class TranslateRequest(BaseModel):
    text: str
    audience: str = "non-technical employees"


class Translation(BaseModel):
    plain_version: str
    reading_level_before: str
    reading_level_after: str
    glossary: List[GlossaryItem]
    analogy: str
