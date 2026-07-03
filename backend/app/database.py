import json
import os
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from app.schemas import VisitBrief, VisitCreate, VisitListItem, VisitRecord


def get_db_path() -> Path:
    default_path = Path(__file__).resolve().parents[1] / "clinica.db"
    return Path(os.getenv("CLINICA_DB_PATH", default_path))


def get_connection() -> sqlite3.Connection:
    db_path = get_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(db_path)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS visits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                payload_json TEXT NOT NULL,
                brief_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )


def save_visit(payload: VisitCreate, brief: VisitBrief) -> VisitRecord:
    created_at = datetime.now(UTC)
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO visits (payload_json, brief_json, created_at)
            VALUES (?, ?, ?)
            """,
            (
                _dump_model(payload),
                _dump_model(brief),
                created_at.isoformat(),
            ),
        )
        visit_id = int(cursor.lastrowid)

    return VisitRecord(id=visit_id, payload=payload, brief=brief, created_at=created_at)


def list_visits(search: str | None = None) -> list[VisitListItem]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, payload_json, brief_json, created_at
            FROM visits
            ORDER BY id DESC
            """
        ).fetchall()

    items = [_row_to_list_item(row) for row in rows]
    if search:
        normalized_search = search.casefold().strip()
        items = [
            item
            for item in items
            if normalized_search
            in " ".join(
                [
                    item.patient_name,
                    item.clinician_type,
                    item.main_concern,
                    item.appointment_date.isoformat(),
                ]
            ).casefold()
        ]

    return items[:25]


def get_visit(visit_id: int) -> VisitRecord | None:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, payload_json, brief_json, created_at
            FROM visits
            WHERE id = ?
            """,
            (visit_id,),
        ).fetchone()

    if row is None:
        return None

    return _row_to_record(row)


def update_visit(visit_id: int, payload: VisitCreate, brief: VisitBrief) -> VisitRecord | None:
    existing = get_visit(visit_id)
    if existing is None:
        return None

    with get_connection() as connection:
        connection.execute(
            """
            UPDATE visits
            SET payload_json = ?, brief_json = ?
            WHERE id = ?
            """,
            (
                _dump_model(payload),
                _dump_model(brief),
                visit_id,
            ),
        )

    return VisitRecord(id=visit_id, payload=payload, brief=brief, created_at=existing.created_at)


def delete_visit(visit_id: int) -> bool:
    with get_connection() as connection:
        cursor = connection.execute("DELETE FROM visits WHERE id = ?", (visit_id,))
        return cursor.rowcount > 0


def delete_all_visits() -> int:
    with get_connection() as connection:
        cursor = connection.execute("DELETE FROM visits")
        return int(cursor.rowcount)


def _row_to_record(row: sqlite3.Row) -> VisitRecord:
    payload_data: dict[str, Any] = json.loads(row["payload_json"])
    brief_data: dict[str, Any] = json.loads(row["brief_json"])
    return VisitRecord(
        id=int(row["id"]),
        payload=VisitCreate.model_validate(payload_data),
        brief=VisitBrief.model_validate(brief_data),
        created_at=datetime.fromisoformat(row["created_at"]),
    )


def _row_to_list_item(row: sqlite3.Row) -> VisitListItem:
    payload_data: dict[str, Any] = json.loads(row["payload_json"])
    brief_data: dict[str, Any] = json.loads(row["brief_json"])
    return VisitListItem(
        id=int(row["id"]),
        patient_name=payload_data["patient_name"],
        appointment_date=payload_data["appointment_date"],
        clinician_type=payload_data["clinician_type"],
        main_concern=payload_data["main_concern"],
        symptom_count=len(payload_data.get("symptoms", [])),
        question_count=len(payload_data.get("questions", [])),
        readiness_score=brief_data.get("readiness", {}).get("score", 0),
        created_at=datetime.fromisoformat(row["created_at"]),
    )


def _dump_model(model: VisitCreate | VisitBrief) -> str:
    return json.dumps(model.model_dump(mode="json"))
