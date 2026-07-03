from datetime import date, datetime, timedelta
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class SymptomInput(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    severity: int = Field(..., ge=1, le=10)
    started_on: date | None = None
    frequency: str = Field(default="", max_length=80)
    notes: str = Field(default="", max_length=280)

    @field_validator("started_on")
    @classmethod
    def started_on_cannot_be_future(cls, value: date | None) -> date | None:
        if value and value > date.today():
            raise ValueError("Symptom start date cannot be in the future")
        return value


class MedicationInput(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    dosage: str = Field(default="", max_length=80)
    schedule: str = Field(default="", max_length=80)
    reason: str = Field(default="", max_length=120)


class VisitQuestionInput(BaseModel):
    text: str = Field(..., min_length=4, max_length=240)
    priority: str = Field(default="Normal", pattern="^(High|Normal|Low)$")

    @field_validator("text", mode="before")
    @classmethod
    def clean_question_text(cls, value: str) -> str:
        return " ".join(str(value).split())


class VisitCreate(BaseModel):
    patient_name: str = Field(..., min_length=2, max_length=80)
    appointment_date: date
    clinician_type: str = Field(default="Primary care", min_length=2, max_length=80)
    main_concern: str = Field(..., min_length=8, max_length=480)
    symptoms: list[SymptomInput] = Field(default_factory=list, max_length=12)
    medications: list[MedicationInput] = Field(default_factory=list, max_length=12)
    questions: list[VisitQuestionInput] = Field(default_factory=list, max_length=12)
    additional_notes: str = Field(default="", max_length=700)

    @field_validator("patient_name", "clinician_type", "main_concern", "additional_notes", mode="before")
    @classmethod
    def clean_text(cls, value: str) -> str:
        if value is None:
            return ""
        return " ".join(str(value).split())

    @field_validator("symptoms", "medications", "questions", mode="before")
    @classmethod
    def remove_blank_rows_before_validation(cls, value: list[dict] | None) -> list[dict]:
        if value is None:
            return []
        if not isinstance(value, list):
            return value

        cleaned_rows = []
        for row in value:
            if not isinstance(row, dict):
                cleaned_rows.append(row)
                continue

            primary_value = row.get("text") if "text" in row else row.get("name")
            if primary_value is None or str(primary_value).strip():
                cleaned_rows.append(row)

        return cleaned_rows

    @field_validator("appointment_date")
    @classmethod
    def appointment_date_must_be_reasonable(cls, value: date) -> date:
        today = date.today()
        if value < today - timedelta(days=365):
            raise ValueError("Appointment date cannot be more than one year in the past")
        if value > today + timedelta(days=365 * 3):
            raise ValueError("Appointment date cannot be more than three years in the future")
        return value

    @field_validator("questions", mode="after")
    @classmethod
    def deduplicate_questions(cls, questions: list[VisitQuestionInput]) -> list[VisitQuestionInput]:
        seen: set[str] = set()
        unique_questions: list[VisitQuestionInput] = []

        for question in questions:
            normalized = question.text.casefold()
            if normalized in seen:
                continue
            seen.add(normalized)
            unique_questions.append(question)

        return unique_questions

    @model_validator(mode="after")
    def remove_blank_optional_rows(self) -> "VisitCreate":
        self.medications = [medication for medication in self.medications if medication.name.strip()]
        self.symptoms = [symptom for symptom in self.symptoms if symptom.name.strip()]
        self.questions = [question for question in self.questions if question.text.strip()]
        return self


class VisitReadinessRule(BaseModel):
    key: str
    label: str
    points: int = Field(..., ge=0, le=100)
    status: Literal["complete", "missing"]


class VisitReadiness(BaseModel):
    score: int = Field(..., ge=0, le=100)
    completed_items: list[str]
    missing_items: list[str]
    rules: list[VisitReadinessRule]


class VisitBrief(BaseModel):
    title: str
    opening_line: str
    key_points: list[str]
    questions_for_visit: list[str]
    preparation_checklist: list[str]
    safety_note: str
    safety_flags: list[str] = Field(default_factory=list)
    readiness: VisitReadiness
    generated_at: datetime


class VisitRecord(BaseModel):
    id: int
    payload: VisitCreate
    brief: VisitBrief
    created_at: datetime


class VisitListItem(BaseModel):
    id: int
    patient_name: str
    appointment_date: date
    clinician_type: str
    main_concern: str
    symptom_count: int
    question_count: int
    readiness_score: int
    created_at: datetime


class VisitDeleteResponse(BaseModel):
    deleted_count: int


class PrivacyStatus(BaseModel):
    storage: str
    analytics_enabled: bool
    external_api_calls: bool
    notes: list[str]
