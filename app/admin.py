from fastapi import APIRouter, Body, Header
from fastapi import UploadFile, File
from fastapi.responses import StreamingResponse
from app.database import engine
from app.models import Base
from openpyxl import Workbook
from openpyxl.styles import Font
from app.config import settings
from sqlalchemy import text


import io
import csv
import os

router = APIRouter()

print("ADMIN ROUTER CHARGÉ")

@router.get("/init-db")
def init_db():
    Base.metadata.create_all(bind=engine)
    return {"message": "Tables créées"}

@router.get("/is-admin")
def is_admin(x_token: str = Header(None)):
    print("TOKEN RECU:", x_token)
    print("TOKEN ATTENDU:", os.getenv("ADMIN_TOKEN"))
    if x_token == os.getenv("ADMIN_TOKEN"):
        return {"is_admin": True}
    return {"is_admin": False}


@router.get("/joueurs")
def get_players():
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT id, name, ranking
            FROM players
            ORDER BY ranking DESC
        """))

        joueurs = [
            {"id": row.id, "name": row.name, "ranking": row.ranking}
            for row in result
        ]

    return joueurs

@router.get("/match-days")
def get_match_days():
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT id, code, date, is_home, day_type
            FROM match_days
            ORDER BY id
        """))
        return [dict(row._mapping) for row in result]
    
@router.get("/init-match-days")
def init_match_days():
    with engine.begin() as conn:
        for day in settings.MATCH_DAYS:
            conn.execute(text("""
                INSERT INTO match_days (id, code, date, is_home, day_type)
                VALUES (:id, :code, :date, :is_home, :day_type)
                ON CONFLICT (id) DO UPDATE SET
                    code = EXCLUDED.code,
                    date = EXCLUDED.date,
                    is_home = EXCLUDED.is_home,
                    day_type = EXCLUDED.day_type
            """), day)
            
    print("✅ Match days initialisés")
    return {"message": "Journées configurées"}
    

@router.get("/init-slots")
def init_slots():
    with engine.begin() as conn:
        for day_id in range(1, 15):

            slots = [
                "samedi_aprem",
                "dimanche_matin",
                "dimanche_aprem"
            ]

            for label in slots:   

                conn.execute(text("""
                    INSERT INTO match_slots (match_day_id, label)
                    VALUES (:day_id, :label)
                    ON CONFLICT (match_day_id, label) DO NOTHING
                """), {
                    "day_id": day_id,
                    "label": label   
                })
    print("✅ Slots initialisés")
    return {"message": "Slots créés"}

@router.get("/slots")
def get_slots():
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT s.id, d.code, s.label
            FROM match_slots s
            JOIN match_days d ON d.id = s.match_day_id
            ORDER BY d.id, s.id
        """))

        return [dict(row._mapping) for row in result]
    
@router.get("/dispos/{match_day_id}")
def get_dispos(match_day_id: int):
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT 
                p.name,
                p.ranking,
                s.label
            FROM availabilities a
            JOIN players p ON p.id = a.player_id
            JOIN match_slots s ON s.id = a.slot_id
            WHERE s.match_day_id = :day_id
              AND a.availability = 'disponible'
            ORDER BY s.label, p.ranking DESC
        """), {"day_id": match_day_id})

        return [dict(row._mapping) for row in result]
    
@router.get("/player/{license}")
def get_player(license: str):
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT name
            FROM players
            WHERE license = :license
        """), {"license": license}).fetchone()

        if result:
            return {"name": result.name}
        else:
            return {"name": None}

@router.post("/availability")
def add_availability(data: dict = Body(...)):
    with engine.begin() as conn:

        for slot_id in data["slot_ids"]:

            conn.execute(text("""
                INSERT INTO availabilities (player_id, slot_id, availability)
                SELECT p.id, :slot_id, :availability
                FROM players p
                WHERE p.license = :license
                ON CONFLICT (player_id, slot_id)
                DO UPDATE SET availability = EXCLUDED.availability
            """), {
                "license": data["license"],
                "slot_id": slot_id,
                "availability": data["availability"]
            })

    return {"message": "Disponibilités enregistrées"}
    
@router.get("/export-excel/{match_day_id}")
def export_excel(match_day_id: int):
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT 
                p.name,
                p.ranking,
                s.label
            FROM availabilities a
            JOIN players p ON p.id = a.player_id
            JOIN match_slots s ON s.id = a.slot_id
            WHERE s.match_day_id = :day_id
              AND a.availability = 'disponible'
            ORDER BY s.label, p.ranking DESC
        """), {"day_id": match_day_id})

        rows = result.fetchall()

    # création Excel
    # création Excel
    wb = Workbook()
    ws = wb.active
    ws.title = f"J{match_day_id}"

    # EN-TÊTE GLOBAL
    bold = Font(bold=True)

    cell1 = ws.cell(row=1, column=1, value="Prénom Nom")
    cell2 = ws.cell(row=1, column=2, value="Points")

    cell1.font = bold
    cell2.font = bold

    # regrouper par créneau
    grouped = {}
    for row in rows:
        grouped.setdefault(row.label, []).append(row)

    def format_label(label):
        return (
            label
            .replace("dimanche_matin", "Dimanche matin")
            .replace("dimanche_aprem", "Dimanche après-midi")
            .replace("samedi_aprem", "Samedi après-midi")
        )

    row_idx = 3  #  on commence plus bas
    order = [
        "samedi_aprem",
        "dimanche_matin",
        "dimanche_aprem"
    ]
    
    for label in order:
        if label not in grouped:
            continue

        players = grouped[label]

        ws.cell(row=row_idx, column=1, value=format_label(label))
        row_idx += 1

        for p in players:
            ws.cell(row=row_idx, column=1, value=p.name)
            ws.cell(row=row_idx, column=2, value=p.ranking)
            row_idx += 1
        row_idx += 1

    # export
    
    from openpyxl.utils import get_column_letter

# auto largeur colonnes
    
    for col in ws.columns:
        max_length = 0
        col_letter = get_column_letter(col[0].column)

        for cell in col:
            if cell.value:
                max_length = max(max_length, len(str(cell.value)))

        ws.column_dimensions[col_letter].width = max_length + 2

    stream = io.BytesIO()
    wb.save(stream)
    stream.seek(0)

    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f"attachment; filename=journee_{match_day_id}.xlsx"
        }
    )
    
