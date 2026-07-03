from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from app.database import delete_all_visits, delete_visit, get_visit, init_db, list_visits, save_visit, update_visit
from app.schemas import PrivacyStatus, VisitBrief, VisitCreate, VisitDeleteResponse, VisitListItem, VisitRecord
from app.services.brief_service import build_visit_brief
from app.utils.markdown_export import render_visit_markdown


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Clinica API",
    description="Visit preparation and appointment summary API.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "clinica"}


@app.get("/api/privacy", response_model=PrivacyStatus)
def privacy_status() -> PrivacyStatus:
    return PrivacyStatus(
        storage="Saved only in this app's local database.",
        analytics_enabled=False,
        external_api_calls=False,
        notes=[
            "Clinica does not send visit notes to external services.",
            "Saved visit data can be cleared from the app at any time.",
            "Exports are generated from the locally saved visit record.",
        ],
    )


@app.post("/api/visits/preview", response_model=VisitBrief)
def preview_visit_brief(payload: VisitCreate) -> VisitBrief:
    return build_visit_brief(payload)


@app.post("/api/visits", response_model=VisitRecord, status_code=201)
def create_visit(payload: VisitCreate) -> VisitRecord:
    brief = build_visit_brief(payload)
    return save_visit(payload, brief)


@app.delete("/api/visits", response_model=VisitDeleteResponse)
def clear_visits() -> VisitDeleteResponse:
    return VisitDeleteResponse(deleted_count=delete_all_visits())


@app.get("/api/visits", response_model=list[VisitListItem])
def get_visits(search: str | None = Query(default=None, max_length=80)) -> list[VisitListItem]:
    return list_visits(search=search)


@app.put("/api/visits/{visit_id}", response_model=VisitRecord)
def replace_visit(visit_id: int, payload: VisitCreate) -> VisitRecord:
    brief = build_visit_brief(payload)
    record = update_visit(visit_id, payload, brief)
    if record is None:
        raise HTTPException(status_code=404, detail="Visit not found")
    return record


@app.post("/api/visits/{visit_id}/duplicate", response_model=VisitRecord, status_code=201)
def duplicate_visit(visit_id: int) -> VisitRecord:
    record = get_visit(visit_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Visit not found")

    brief = build_visit_brief(record.payload)
    return save_visit(record.payload, brief)


@app.get("/api/visits/{visit_id}", response_model=VisitRecord)
def read_visit(visit_id: int) -> VisitRecord:
    record = get_visit(visit_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Visit not found")
    return record


@app.get("/api/visits/{visit_id}/export", response_class=PlainTextResponse)
def export_visit(visit_id: int) -> str:
    record = get_visit(visit_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Visit not found")
    return render_visit_markdown(record)


@app.delete("/api/visits/{visit_id}", response_model=VisitDeleteResponse)
def remove_visit(visit_id: int) -> VisitDeleteResponse:
    if not delete_visit(visit_id):
        raise HTTPException(status_code=404, detail="Visit not found")
    return VisitDeleteResponse(deleted_count=1)
