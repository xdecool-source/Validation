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

    try:
        # 🔹 Lecture Excel depuis upload
        df = pd.read_excel(file.file, sheet_name=0)
        df.columns = df.columns.str.strip()

        players = []

        for _, row in df.iterrows():
            license_number = row.iloc[0]
            last_name = row.iloc[2]
            first_name = row.iloc[3]
            points = row.iloc[15]

            if pd.isna(license_number) or pd.isna(last_name):
                continue

            players.append({
                "license": str(license_number).strip(),
                "name": f"{first_name} {last_name}".strip(),
                "ranking": int(points) if not pd.isna(points) else 0
            })

        # 🔥 TRI
        players.sort(key=lambda x: x["ranking"], reverse=True)

        # 🔥 INSERT / UPDATE
        with engine.begin() as conn:
            for p in players:
                conn.execute(text("""
                    INSERT INTO players (license, name, ranking)
                    VALUES (:license, :name, :ranking)
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