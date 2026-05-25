# Import des joueurs a partir fichier export de SPID
# Importer automatique des joueurs depuis un fichier export SPID (Excel)
# récupérer licences, noms, points et emails
# Ajout ou MAJ des joueurs en base
# Compte le nombre de joueurs créés ou modifiés.

from fastapi import UploadFile, File, APIRouter, HTTPException
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from fastapi import Depends
from app.auth import verify_token

import pandas as pd
import os
import io

load_dotenv()

router = APIRouter()
ADMIN_PIN = os.getenv("ADMIN_PIN")
    
DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

@router.post("/admin/import-joueur")
async def import_joueur(
    file: UploadFile = File(...),
    role: str = Depends(verify_token)
 ):
    # print("ROUTE IMPORT EXECUTÉE")
    # print("ROLE VALUE:", role)
    if role.get("role") != "admin":
        raise HTTPException(status_code=403)
    # print(" FILENAME:", file.filename)
    # print(" CONTENT TYPE:", file.content_type)
    try:
        content = await file.read()
        # print(" SIZE:", len(content))

        df = pd.read_excel(io.BytesIO(content), sheet_name=0, dtype=str)
        # print("EXCEL LU")
        # print("COLUMNS:", df.columns.tolist())
        # print("NB ROWS:", len(df))
        df.columns = df.columns.str.strip()
        players = []

        for _, row in df.iterrows():
            license_number = str(row.iloc[0]).strip()
            last_name = str(row.iloc[2]).strip() if row.iloc[2] else ""
            first_name = str(row.iloc[3]).strip() if row.iloc[3] else ""
            points = row.iloc[15]
            email = str(row.iloc[23]).strip() if row.iloc[23] else ""

            if pd.isna(license_number) or pd.isna(last_name):
                # print("SKIPPED")
                continue

            players.append({
                "license": license_number,
                "name": f"{first_name} {last_name}".strip(),
                "ranking": int(points) if points and str(points).isdigit() else 0,
                "email": email
            })
        players.sort(key=lambda x: x["ranking"], reverse=True)
        
        # print("AVANT INSERT:", len(players))

        inserted = 0
        updated = 0

        with engine.begin() as conn:
            for p in players:
                result = conn.execute(text("""
                    INSERT INTO players (license, name, ranking, email)
                    VALUES (:license, :name, :ranking, :email)
                    ON CONFLICT (license)
                    DO UPDATE SET
                        name = EXCLUDED.name,
                        ranking = EXCLUDED.ranking
                    RETURNING (xmax = 0) AS inserted
                """), p)

                row = result.fetchone()

                if row[0]:
                    inserted += 1
                else:
                    updated += 1
                    
        return {
            "message": "Import réussi",
            "nb_total": len(players),
            "inserted": inserted,
            "updated": updated
        }
        
    except Exception as e:
        # print("ERREUR IMPORT:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))
    