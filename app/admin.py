# Gestion connexion a l'application Validation

from fastapi import APIRouter, Body, HTTPException, Request, Header, Depends
from fastapi.responses import StreamingResponse
from app.database import engine
from app.models import Base
from openpyxl import Workbook
from openpyxl.styles import Font
from app.config import settings
from sqlalchemy import text
from dotenv import load_dotenv
from time import time
from datetime import datetime, timedelta, timezone

import io
import os
import jwt
import pytz

router = APIRouter()
attempts = {}

# Autorisation

load_dotenv()

PIN_CODE = os.getenv("PIN_CODE")
ADMIN_PIN = os.getenv("ADMIN_PIN")
SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise Exception("SECRET_KEY non défini !")

def create_token(role, user_license):
    payload = {
        "role": role,
        "license": user_license,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

def verify_token(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=403, detail="Token manquant")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=403, detail="Format invalide")
    try:
        token = authorization.replace("Bearer ", "")
        data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return data
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=403, detail="Token expiré Votre session a expiré. Merci de vous reconnecter.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=403, detail="Token invalide")
    
def require_user(user=Depends(verify_token)):
    if user["role"] not in ["user", "admin"]:
        raise HTTPException(status_code=403)
    return user

def require_admin(role: str = Depends(verify_token)):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin requis")
    return role

# Utilitaires

def get_slots_from_date(date_str: str):
    return [
        "samedi_aprem",
        "dimanche_matin",
        "dimanche_aprem",
        "Absent"
    ]

# Init DataBase

@router.get("/init-db")
def init_db(role: str = Depends(require_admin)):
    Base.metadata.create_all(bind=engine)
    return {"message": "Tables créées"}

@router.get("/auth-player")
def auth_player(license: str, user=Depends(verify_token)):
    with engine.connect() as conn:
        player = conn.execute(text("""
            SELECT id FROM players WHERE license = :license
        """), {"license": license}).fetchone()

        if not player:
            raise HTTPException(status_code=404, detail="Licence inconnue")
    return {
        "ok": True,
        "token": create_token("user", license)
    }   
     
# Login

@router.get("/check-access")
def check_access(code: str, request: Request):
    ip = request.client.host
    now = time()

    if ip in attempts and attempts[ip]["count"] > 5:
        if now - attempts[ip]["time"] < 60:
            raise HTTPException(status_code=429, detail="Trop de tentatives")
    if code == ADMIN_PIN:
        attempts[ip] = {"count": 0, "time": now}
        return {"ok": True, "token": create_token("admin", "none")}
        
    if code == PIN_CODE:
        attempts[ip] = {"count": 0, "time": now}
        return {"ok": True, "token": create_token("user", "none")}
    
    attempts[ip] = {
        "count": attempts.get(ip, {}).get("count", 0) + 1,
        "time": now
    }
    return {"ok": False}

# Joueurs

@router.get("/joueurs")
def get_days(role: str = Depends(verify_token)):
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT id, name, ranking
            FROM players
            ORDER BY ranking DESC
        """))
        return [
            {"id": row.id, "name": row.name, "ranking": row.ranking}
            for row in result
        ]

# Match du jour 

@router.get("/match-days")
def get_match_days():
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT id, code, date
            FROM match_days
            ORDER BY id
        """))
        return [dict(row._mapping) for row in result]


@router.get("/init-match-days")
def init_match_days(role: str = Depends(require_admin)):
    with engine.begin() as conn:
        for day in settings.MATCH_DAYS:
            conn.execute(text("""
                INSERT INTO match_days (id, code, date)
                VALUES (:id, :code, :date)
                ON CONFLICT (id) DO UPDATE SET
                    code = EXCLUDED.code,
                    date = EXCLUDED.date
            """), day)

    return {"message": "Journées configurées"}

# Joueur et licence

@router.get("/player/{license}")
def get_player(license: str, role: str = Depends(verify_token)):
    with engine.connect() as conn:

        player = conn.execute(text("""
            SELECT id, name
            FROM players
            WHERE license = :license
        """), {"license": license}).fetchone()

        if not player:
            return {"name": None}

        rows = conn.execute(text("""
            SELECT 
                a.match_day_id,
                s.label,
                a.availability
            FROM availabilities a
            JOIN match_slots s ON s.id = a.slot_id
            WHERE a.player_id = :player_id
        """), {"player_id": player.id}).fetchall()

        availability = {}

        for row in rows:
            availability.setdefault(row.match_day_id, []).append({
                "label": row.label,
                "available": row.availability
            })

        return {
            "name": player.name,
            "availability": [
                {"match_day_id": k, "slots": v}
                for k, v in availability.items()
            ]
        }


@router.get("/dispos/{match_day_id}")
def get_dispos(match_day_id: int, role: str = Depends(verify_token)):
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT 
                    p.name,
                    p.ranking,
                    STRING_AGG(
                        s.label || ':' || a.availability,
                        ','
                    ) AS slots
                FROM availabilities a
                JOIN players p ON p.id = a.player_id
                JOIN match_slots s ON s.id = a.slot_id
                WHERE s.match_day_id = :day_id
                GROUP BY p.name, p.ranking
                ORDER BY p.ranking DESC
            """), {"day_id": match_day_id})

            return [dict(row._mapping) for row in result]

    except Exception as e:
        print(" ERREUR BACKEND:", e)
        return {"error": str(e)}
    
# Initialisation Match

@router.get("/init-match-slots")
def init_match_slots(role: str = Depends(require_admin)):
    with engine.begin() as conn:

        slots = [
            "samedi_aprem",
            "dimanche_matin",
            "dimanche_aprem",
            "Absent"
        ]

        match_days = conn.execute(text("""
            SELECT id FROM match_days
        """)).fetchall()

        for day in match_days:
            for label in slots:
                conn.execute(text("""
                    INSERT INTO match_slots (match_day_id, label)
                    VALUES (:day_id, :label)
                    ON CONFLICT DO NOTHING
                """), {
                    "day_id": day.id,
                    "label": label
                })

    return {"message": "match_slots remplie"}   

# Disponibilité

@router.post("/availability")
def add_availability(
    data: dict = Body(...),
    user=Depends(verify_token)
):
    
    if user["role"] != "admin" and data["license"] != user["license"]:
        raise HTTPException(status_code=403, detail="Accès interdit")

    with engine.begin() as conn:

        player = conn.execute(text("""
            SELECT id FROM players WHERE license = :license
        """), {"license": data["license"]}).fetchone()
        if not player:
            raise HTTPException(status_code=400, detail="Licence invalide")
        match_day = conn.execute(text("""
            SELECT date FROM match_days WHERE id = :id
        """), {"id": data["match_day_id"]}).fetchone()
        if not match_day:
            raise HTTPException(status_code=400, detail="Match day invalide")
        paris = pytz.timezone("Europe/Paris")        
        match_date = datetime.strptime(match_day.date, "%Y-%m-%d")
        match_date = paris.localize(match_date)
        
        #  J-4 à 14h
        limit_date = match_date - timedelta(days=4)
        limit_date = limit_date.replace(hour=14, minute=0, second=0)
        now = datetime.now(paris)
    
        if now >= limit_date:
            raise HTTPException(status_code=403, detail="Saisie verrouillée")
        valid_slots = get_slots_from_date(match_day.date)
        absent_selected = any(
            s["label"] == "Absent" and s["available"]
            for s in data["slots"]
        )

        for slot in data["slots"]:
            label = slot["label"]
            available = slot["available"]
            #  correction logique
            if absent_selected and label != "Absent":
                available = False
            if label not in valid_slots:
                continue
            slot_row = conn.execute(text("""
                SELECT id FROM match_slots
                WHERE match_day_id = :day_id AND label = :label
            """), {
                "day_id": data["match_day_id"],
                "label": label
            }).fetchone()
            if not slot_row:
                continue

            conn.execute(text("""
                INSERT INTO availabilities (player_id, slot_id, match_day_id, availability)
                VALUES (:player_id, :slot_id, :match_day_id, :availability)
                ON CONFLICT (player_id, slot_id, match_day_id)
                DO UPDATE SET availability = EXCLUDED.availability
            """), {
                "player_id": player.id,
                "slot_id": slot_row.id,
                "match_day_id": data["match_day_id"],
                "availability": available
            })

    return {"message": "Validées"}


# Export Excel

@router.get("/export-excel/{match_day_id}")
def export_excel(match_day_id: int, role: str = Depends(require_admin)):

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
              AND a.availability = true
            ORDER BY s.label, p.ranking DESC
        """), {"day_id": match_day_id})

        rows = result.fetchall()

    wb = Workbook()
    ws = wb.active
    ws.title = f"J{match_day_id}"
    bold = Font(bold=True)
    ws.cell(row=1, column=1, value="Prénom Nom").font = bold
    ws.cell(row=1, column=2, value="Points").font = bold
    grouped = {}
    for row in rows:
        grouped.setdefault(row.label, []).append(row)
    row_idx = 3
    order = ["samedi_aprem", "dimanche_matin", "dimanche_aprem"]

    for label in order:
        if label not in grouped:
            continue
        ws.cell(row=row_idx, column=1, value=label)
        row_idx += 1
        for p in grouped[label]:
            ws.cell(row=row_idx, column=1, value=p.name)
            ws.cell(row=row_idx, column=2, value=p.ranking)
            row_idx += 1
        row_idx += 1

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