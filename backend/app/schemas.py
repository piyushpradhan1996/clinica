from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator


class SymptomInput(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    severity: int = Field(..., ge=1, le=10)
    started_on: date | None = None
    frequency: str = Field(default="", max_length=80)
    notes: str = Field(default="", max_length=280)


class MedicationInput(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    dosage: str = Field(default="", max_length=80)
    schedule: str = Field(default="", max_length=80)
    reason: str = Field(default="", max_length=120)


class VisitQuestionInput(BaseModel):
    text: str = Field(..., min_length=4, max_length=240)
    priority: str = Field(default="Normal", pattern="^(High|Normal|Low)$")


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


class VisitReadiness(BaseModel):
    score: int = Field(..., ge=0, le=100)
    completed_items: list[str]
    missing_items: list[str]


class VisitBrief(BaseModel):
    title: str
    opening_line: str
    key_points: list[str]
    questions_for_visit: list[str]
    preparation_checklist: list[str]
    safety_note: str
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
    created_at: datetime
