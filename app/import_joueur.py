import os
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
FILE_PATH = os.getenv("FILE_PATH")

engine = create_engine(DATABASE_URL)

def import_joueur():
    # --- Lecture Excel ---
    df = pd.read_excel(
        FILE_PATH,
        sheet_name="Licencies",
        engine="xlrd"
    )

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

    # --- TRI ---
    players.sort(key=lambda x: x["ranking"], reverse=True)

    # --- INSERT / UPDATE ---
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

    print(f"{len(players)} joueurs importés ✅")
    return len(players)


if __name__ == "__main__":
    import_joueur()