# Clinica QA Strategy

Clinica is a consumer appointment-preparation app, so the quality focus is on trust, clarity, privacy, and predictable behavior.

## Core Risks

- Visit summaries must not diagnose or replace professional medical advice.
- Date handling must be stable for appointment preparation and exported summaries.
- Symptom severity must be validated so users cannot save impossible values.
- Readiness scoring must stay explainable and tied only to preparation completeness.
- Dynamic form sections must preserve user input while adding or removing rows.
- Exported Markdown must match the saved visit, readiness score, questions, and safety note.
- Search, edit, duplicate, delete, and clear-all flows must not cross-link the wrong visit.
- Urgent-language detection must not trigger on clearly negated phrases such as "no chest pain."
- Privacy messaging must stay true to the implementation: local storage, no analytics, no external API calls.

## Automated Coverage

- Backend API tests cover health checks, create/list/search/read/update/duplicate/delete/export flows, validation, preview-only behavior, readiness scoring, privacy status, and urgent-language safety boundaries.
- Frontend tests cover form rendering, dynamic symptom/question rows, mocked API submission, preview behavior, edit/duplicate/delete flows, privacy status, and summary display.
- Playwright E2E covers the main browser workflow against the real FastAPI service.
- CI runs backend tests, frontend tests, frontend production build, and Playwright E2E.

## Manual Smoke Checks

1. Create a visit with at least two symptoms and two questions.
2. Confirm the most severe symptom appears first in the summary.
3. Preview the visit before saving and confirm it does not appear in the recent visits list.
4. Create a visit with urgent symptom wording and verify the safety boundary appears.
5. Create a visit with negated urgent wording such as "no chest pain" and confirm it does not show an urgent warning.
6. Refresh the page and confirm the visit appears in the recent visits list.
7. Search for the patient, open the visit, edit it, duplicate it, and delete the duplicate.
8. Export the visit and verify the Markdown contains the same patient, date, questions, readiness score, readiness rules, and safety note.
9. Clear all data and confirm the recent list is empty.
