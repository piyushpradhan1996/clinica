from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from app.database import get_visit, init_db, list_visits, save_visit
from app.schemas import VisitBrief, VisitCreate, VisitListItem, VisitRecord
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


@app.post("/api/visits/preview", response_model=VisitBrief)
def preview_visit_brief(payload: VisitCreate) -> VisitBrief:
    return build_visit_brief(payload)


@app.post("/api/visits", response_model=VisitRecord, status_code=201)
def create_visit(payload: VisitCreate) -> VisitRecord:
    brief = build_visit_brief(payload)
    return save_visit(payload, brief)


@app.get("/api/visits", response_model=list[VisitListItem])
def get_visits() -> list[VisitListItem]:
    return list_visits()


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
