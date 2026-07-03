# Clinica QA Strategy

Clinica is a consumer appointment-preparation app, so the quality focus is on trust, clarity, privacy, and predictable behavior.

## Core Risks

- Visit summaries must not diagnose or replace professional medical advice.
- Date handling must be stable for appointment preparation and exported summaries.
- Symptom severity must be validated so users cannot save impossible values.
- Readiness scoring must stay explainable and tied only to preparation completeness.
- Dynamic form sections must preserve user input while adding or removing rows.
- Exported Markdown must match the saved visit, readiness score, questions, and safety note.

## Automated Coverage

- Backend API tests cover health checks, create/list/read/export flows, validation, preview-only behavior, and urgent-language safety boundaries.
- Frontend tests cover form rendering, dynamic symptom/question rows, mocked API submission, preview behavior, and summary display.
- CI runs backend tests, frontend tests, and the frontend production build.

## Manual Smoke Checks

1. Create a visit with at least two symptoms and two questions.
2. Confirm the most severe symptom appears first in the summary.
3. Preview the visit before saving and confirm it does not appear in the recent visits list.
4. Create a visit with urgent symptom wording and verify the safety boundary appears.
5. Refresh the page and confirm the visit appears in the recent visits list.
6. Export the visit and verify the Markdown contains the same patient, date, questions, readiness score, and safety note.
