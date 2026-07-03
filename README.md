# Clinica

Clinica helps people prepare for a healthcare visit by turning symptoms, medications, questions, and context into a clear appointment brief.

The project is intentionally practical: no diagnosis, no medical claims, no hidden paid API dependency. It is a polished consumer app with strong validation, export, and test coverage underneath.

## Product Scope

- Capture the main concern for an upcoming appointment.
- Track symptoms with severity, timing, frequency, and notes.
- Record medications or supplements to mention during the visit.
- Prioritize questions before the appointment.
- Generate a concise visit brief and preparation checklist.
- Preview the visit brief before saving it to history.
- Show readiness gaps so users know what would still be useful to add.
- Export the saved brief as Markdown.
- Keep a recent-visit history in SQLite.

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | React, Vite, TypeScript |
| Backend | Python, FastAPI, Pydantic |
| Database | SQLite |
| Backend tests | Pytest, FastAPI TestClient |
| Frontend tests | Vitest, React Testing Library, jsdom |
| CI | GitHub Actions |

## API Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Service health check |
| `POST` | `/api/visits/preview` | Generate a brief without saving |
| `POST` | `/api/visits` | Save a visit and generated brief |
| `GET` | `/api/visits` | List recent visits |
| `GET` | `/api/visits/{id}` | Read one saved visit |
| `GET` | `/api/visits/{id}/export` | Export the visit brief as Markdown |

## Run Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend URL: `http://localhost:8000`

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## Run Tests

Backend:

```bash
cd backend
pytest
```

Frontend:

```bash
cd frontend
npm run test
npm run build
```
