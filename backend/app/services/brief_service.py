import re
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Callable

from app.schemas import (
    SymptomInput,
    VisitBrief,
    VisitCreate,
    VisitQuestionInput,
    VisitReadiness,
    VisitReadinessRule,
)


NEGATION_PATTERN = re.compile(
    r"\b(no|not|without|denies|denied|negative for|free of)\b[\w\s,.;:-]{0,36}$",
    re.IGNORECASE,
)

URGENT_TERMS = (
    "chest pain",
    "trouble breathing",
    "shortness of breath",
    "difficulty breathing",
    "fainting",
    "passed out",
    "stroke",
    "severe allergic",
    "anaphylaxis",
    "sudden weakness",
    "worst headache",
    "suicidal",
    "uncontrolled bleeding",
)


@dataclass(frozen=True)
class ReadinessRule:
    key: str
    label: str
    points: int
    missing_message: str
    is_complete: Callable[[VisitCreate, list[SymptomInput]], bool]


READINESS_RULES = (
    ReadinessRule(
        key="main_concern",
        label="Main concern is described.",
        points=35,
        missing_message="Describe the main reason for this visit.",
        is_complete=lambda payload, _: bool(payload.main_concern.strip()),
    ),
    ReadinessRule(
        key="symptom_recorded",
        label="At least one symptom or concern detail is recorded.",
        points=20,
        missing_message="Add at least one symptom or concern detail.",
        is_complete=lambda _, symptoms: bool(symptoms),
    ),
    ReadinessRule(
        key="symptom_context",
        label="Symptom timing or context is included.",
        points=10,
        missing_message="Add timing, frequency, triggers, or what helps.",
        is_complete=lambda _, symptoms: any(
            symptom.started_on or symptom.frequency or symptom.notes for symptom in symptoms
        ),
    ),
    ReadinessRule(
        key="medications_recorded",
        label="Medication or supplement details are included.",
        points=10,
        missing_message="Add medications, supplements, or note that there are none.",
        is_complete=lambda payload, _: bool(payload.medications),
    ),
    ReadinessRule(
        key="medication_dosage",
        label="Medication dosage details are complete.",
        points=5,
        missing_message="Add dosage details for each listed medication.",
        is_complete=lambda payload, _: bool(payload.medications)
        and all(medication.dosage.strip() for medication in payload.medications),
    ),
    ReadinessRule(
        key="questions_ready",
        label="Questions are ready for the appointment.",
        points=15,
        missing_message="Add the questions that should be answered before leaving.",
        is_complete=lambda payload, _: bool(payload.questions),
    ),
    ReadinessRule(
        key="additional_context",
        label="Extra context is captured.",
        points=5,
        missing_message="Add any recent changes, relevant history, or constraints.",
        is_complete=lambda payload, _: bool(payload.additional_notes.strip()),
    ),
)


def build_visit_brief(payload: VisitCreate) -> VisitBrief:
    top_symptoms = sorted(payload.symptoms, key=lambda item: item.severity, reverse=True)
    questions = sorted(payload.questions, key=_question_rank)

    key_points = _build_key_points(payload, top_symptoms)
    preparation_checklist = _build_preparation_checklist(payload, top_symptoms)

    return VisitBrief(
        title=f"{payload.clinician_type} visit brief for {payload.appointment_date.isoformat()}",
        opening_line=f"{payload.patient_name} is preparing to discuss: {payload.main_concern}",
        key_points=key_points,
        questions_for_visit=[question.text for question in questions] or _default_questions(payload),
        preparation_checklist=preparation_checklist,
        safety_note=_safety_note(payload),
        safety_flags=_safety_flags(payload),
        readiness=_build_readiness(payload, top_symptoms),
        generated_at=datetime.now(UTC),
    )


def _build_key_points(payload: VisitCreate, top_symptoms: list[SymptomInput]) -> list[str]:
    points = [f"Main concern: {payload.main_concern}"]

    if top_symptoms:
        primary = top_symptoms[0]
        detail = f"Most intense symptom: {primary.name} ({primary.severity}/10)"
        if primary.started_on:
            detail += f", started {primary.started_on.isoformat()}"
        if primary.frequency:
            detail += f", frequency: {primary.frequency}"
        points.append(detail)

    for symptom in top_symptoms[1:4]:
        detail = f"{symptom.name}: {symptom.severity}/10"
        if symptom.notes:
            detail += f" - {symptom.notes}"
        points.append(detail)

    if payload.medications:
        medication_names = ", ".join(item.name for item in payload.medications[:5])
        points.append(f"Current medications or supplements to mention: {medication_names}")

    if payload.additional_notes:
        points.append(f"Additional context: {payload.additional_notes}")

    return points


def _build_preparation_checklist(payload: VisitCreate, top_symptoms: list[SymptomInput]) -> list[str]:
    checklist = [
        "Bring medication names, dosages, and any recent changes.",
        "Bring prior lab results, imaging, or visit notes if available.",
        "Keep the most important question at the top of the visit notes.",
    ]

    if top_symptoms:
        checklist.insert(0, "Track symptom timing, severity, triggers, and what helps before the visit.")

    if payload.questions:
        checklist.append("Mark which questions must be answered before leaving the appointment.")

    return checklist


def _build_readiness(payload: VisitCreate, top_symptoms: list[SymptomInput]) -> VisitReadiness:
    completed_items: list[str] = []
    missing_items: list[str] = []
    rule_results: list[VisitReadinessRule] = []
    score = 0

    for rule in READINESS_RULES:
        is_complete = rule.is_complete(payload, top_symptoms)
        status = "complete" if is_complete else "missing"
        rule_results.append(
            VisitReadinessRule(
                key=rule.key,
                label=rule.label,
                points=rule.points,
                status=status,
            )
        )

        if is_complete:
            score += rule.points
            completed_items.append(rule.label)
        else:
            missing_items.append(rule.missing_message)

    return VisitReadiness(
        score=min(score, 100),
        completed_items=completed_items,
        missing_items=missing_items,
        rules=rule_results,
    )


def _default_questions(payload: VisitCreate) -> list[str]:
    return [
        f"What are the most likely next steps for {payload.main_concern.lower()}?",
        "Are there symptoms that should prompt urgent care?",
        "What should be tracked after this visit?",
    ]


def _question_rank(question: VisitQuestionInput) -> int:
    ranks = {"High": 0, "Normal": 1, "Low": 2}
    return ranks.get(question.priority, 1)


def _safety_note(payload: VisitCreate) -> str:
    flags = _safety_flags(payload)

    if flags:
        return (
            "Urgent symptom language was detected. This brief is not medical advice; "
            "seek urgent care now if symptoms feel severe, sudden, or unsafe."
        )

    return (
        "This brief is for appointment preparation only and does not replace medical advice. "
        "Seek urgent care if symptoms feel severe, sudden, or unsafe."
    )


def _safety_flags(payload: VisitCreate) -> list[str]:
    combined_text = " ".join(
        [
            payload.main_concern,
            payload.additional_notes,
            *[symptom.name for symptom in payload.symptoms],
            *[symptom.notes for symptom in payload.symptoms],
        ]
    ).lower()

    return [term for term in URGENT_TERMS if _has_non_negated_term(combined_text, term)]


def _has_non_negated_term(text: str, term: str) -> bool:
    for match in re.finditer(re.escape(term), text, re.IGNORECASE):
        prefix = text[max(0, match.start() - 48) : match.start()]
        suffix = text[match.end() : match.end() + 24]

        if NEGATION_PATTERN.search(prefix):
            continue
        if re.match(r"[\s,.;:-]{0,12}(denied|absent|not present)\b", suffix, re.IGNORECASE):
            continue

        return True

    return False
