from datetime import UTC, datetime

from app.schemas import SymptomInput, VisitBrief, VisitCreate, VisitQuestionInput, VisitReadiness


URGENT_TERMS = {
    "chest pain",
    "trouble breathing",
    "shortness of breath",
    "fainting",
    "stroke",
    "severe allergic",
    "sudden weakness",
    "worst headache",
}


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
    score = 40

    if top_symptoms:
        completed_items.append("At least one symptom is recorded.")
        score += 20
    else:
        missing_items.append("Add at least one symptom or concern detail.")

    if any(symptom.started_on or symptom.frequency or symptom.notes for symptom in top_symptoms):
        completed_items.append("Symptom timing or context is included.")
        score += 10
    else:
        missing_items.append("Add timing, frequency, triggers, or what helps.")

    if payload.medications:
        completed_items.append("Medication or supplement details are included.")
        score += 10
    else:
        missing_items.append("Add medications, supplements, or note that there are none.")

    if payload.questions:
        completed_items.append("Questions are ready for the appointment.")
        score += 15
    else:
        missing_items.append("Add the questions that should be answered before leaving.")

    if payload.additional_notes:
        completed_items.append("Extra context is captured.")
        score += 5
    else:
        missing_items.append("Add any recent changes, relevant history, or constraints.")

    return VisitReadiness(
        score=min(score, 100),
        completed_items=completed_items,
        missing_items=missing_items,
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
    combined_text = " ".join(
        [
            payload.main_concern,
            payload.additional_notes,
            *[symptom.name for symptom in payload.symptoms],
            *[symptom.notes for symptom in payload.symptoms],
        ]
    ).lower()

    if any(term in combined_text for term in URGENT_TERMS):
        return (
            "Urgent symptom language was detected. This brief is not medical advice; "
            "seek urgent care now if symptoms feel severe, sudden, or unsafe."
        )

    return (
        "This brief is for appointment preparation only and does not replace medical advice. "
        "Seek urgent care if symptoms feel severe, sudden, or unsafe."
    )
