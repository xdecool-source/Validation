from fastapi import UploadFile, File, APIRouter, HTTPException
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

from fastapi import Depends
from app.auth import verify_token

import pandas as pd
import os

load_dotenv()

# remplace ADMIN_TOKEN par ADMIN_PIN
router = APIRouter()
ADMIN_PIN = os.getenv("ADMIN_PIN")
    
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

@router.post("/import-joueur")
async def import_joueur(
    file: UploadFile = File(...),
    role: str = Depends(verify_token)
):
    if role != "admin":
        raise HTTPException(status_code=403)

    try:
        df = pd.read_excel(file.file, sheet_name=0, dtype=str)
        df.columns = df.columns.str.strip()
        players = []

        for _, row in df.iterrows():
            license_number = str(row.iloc[0]).strip()
            last_name = str(row.iloc[2]).strip() if row.iloc[2] else ""
            first_name = str(row.iloc[3]).strip() if row.iloc[3] else ""
            points = row.iloc[15]
            email = str(row.iloc[23]).strip() if row.iloc[23] else ""

            if pd.isna(license_number) or pd.isna(last_name):
                continue

            players.append({
                "license": license_number,
                "name": f"{first_name} {last_name}".strip(),
                "ranking": int(points) if points and str(points).isdigit() else 0,
                "email": email
            })

        players.sort(key=lambda x: x["ranking"], reverse=True)

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
    