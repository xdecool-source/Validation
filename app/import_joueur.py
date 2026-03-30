from fastapi import UploadFile, File, APIRouter, Header, HTTPException
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

import pandas as pd
import os

load_dotenv()

router = APIRouter()
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN")

def check_admin(x_token: str):
    if x_token != ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Accès interdit")
    
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

@router.post("/import-joueur")
async def import_joueur(
    file: UploadFile = File(...),
    x_token: str = Header(None)
):
    check_admin(x_token)  
    if file.filename != "export.xlsx":
        raise HTTPException(status_code=400, detail="Nom de fichier invalide")

    try:
        # 🔹 Lecture Excel depuis upload
        df = pd.read_excel(file.file, sheet_name=0, dtype=str)
        df.columns = df.columns.str.strip()
        players = []

        for _, row in df.iterrows():
            license_number = str(row.iloc[0]).strip()
            last_name = str(row.iloc[2]).strip() if row.iloc[2] else ""
            first_name = str(row.iloc[3]).strip() if row.iloc[3] else ""
            points = row.iloc[15]
            email = str(row.iloc[23]).strip() if row.iloc[23] else ""
            ranking = int(points) if points and points.isdigit() else 0

            if pd.isna(license_number) or pd.isna(last_name):
                continue
            players.append({
                "license": str(license_number).strip(),
                "name": f"{first_name} {last_name}".strip(),
                "ranking": int(points) if not pd.isna(points) else 0,
                "email": f"{email}".strip()
            })

        # Tri
        players.sort(key=lambda x: x["ranking"], reverse=True)

        # Insert / Update
        with engine.begin() as conn:
            for p in players:
                conn.execute(text("""
                    INSERT INTO players (license, name, ranking, email)
                    VALUES (:license, :name, :ranking, :email)
                    ON CONFLICT (license)
                    DO UPDATE SET
                        name = EXCLUDED.name,
                        ranking = EXCLUDED.ranking
                """), p)

        return {
            "message": "Import réussi ✅",
            "nb_joueurs": len(players)
        }

    except Exception as e:
        return {"error": str(e)}