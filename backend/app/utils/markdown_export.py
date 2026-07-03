from app.schemas import VisitRecord


def render_visit_markdown(record: VisitRecord) -> str:
    payload = record.payload
    brief = record.brief
    safety_flag_lines = [f"- {flag}" for flag in brief.safety_flags] if brief.safety_flags else ["- None detected"]
    lines = [
        f"# Clinica Visit Brief: {payload.appointment_date.isoformat()}",
        "",
        f"Patient: {payload.patient_name}",
        f"Clinician type: {payload.clinician_type}",
        f"Created: {record.created_at.isoformat()}",
        "",
        "## Opening Note",
        brief.opening_line,
        "",
        "## Key Points",
        *[f"- {point}" for point in brief.key_points],
        "",
        "## Questions For The Visit",
        *[f"- {question}" for question in brief.questions_for_visit],
        "",
        "## Readiness",
        f"Score: {brief.readiness.score}/100",
        "",
        "Completed:",
        *[f"- {item}" for item in brief.readiness.completed_items],
        "",
        "Still Useful To Add:",
        *[f"- {item}" for item in brief.readiness.missing_items],
        "",
        "Rules:",
        *[
            f"- [{rule.status}] {rule.label} ({rule.points} pts)"
            for rule in brief.readiness.rules
        ],
        "",
        "## Preparation Checklist",
        *[f"- {item}" for item in brief.preparation_checklist],
        "",
        "## Safety Note",
        brief.safety_note,
        "",
        "Safety flags:",
        *safety_flag_lines,
    ]

    return "\n".join(lines).strip() + "\n"
