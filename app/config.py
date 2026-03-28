
# http://127.0.0.1:8000
# http://127.0.0.1:8000/admin-dispo
# http://127.0.0.1:8000/?admin=valeur_de_admin_token
# http://127.0.0.1:8000/export-excel/1 
# 1 = J1 journée 1


from dotenv import load_dotenv
import os

load_dotenv()

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    
    MATCH_DAYS = [
        {"id": 1, "code": "J1", "date": "2025-09-20", "is_home": True,  "day_type": "samedi"},
        {"id": 2, "code": "J2", "date": "2026-10-04", "is_home": True,  "day_type": "samedi"},
        {"id": 3, "code": "J3", "date": "2026-10-18", "is_home": True,  "day_type": "samedi"},
        {"id": 4, "code": "J4", "date": "2026-11-08", "is_home": True,  "day_type": "samedi"},
        {"id": 5, "code": "J5", "date": "2026-11-22", "is_home": True,  "day_type": "samedi"},
        {"id": 6, "code": "J6", "date": "2026-12-06", "is_home": True,  "day_type": "samedi"},
        {"id": 7, "code": "J7", "date": "2026-12-13", "is_home": True,  "day_type": "samedi"},
        {"id": 8, "code": "J8", "date": "2027-01-17", "is_home": True,  "day_type": "samedi"},
        {"id": 9, "code": "J9", "date": "2027-01-24", "is_home": True,  "day_type": "samedi"},
        {"id": 10, "code": "J10", "date": "2027-02-07", "is_home": True,  "day_type": "samedi"},
        {"id": 11, "code": "J11", "date": "2027-03-14", "is_home": True,  "day_type": "samedi"},
        {"id": 12, "code": "J12", "date": "2027-04-25", "is_home": True,  "day_type": "samedi"},
        {"id": 13, "code": "J13", "date": "2027-05-23", "is_home": True,  "day_type": "samedi"},
        {"id": 14, "code": "J14", "date": "2027-05-30", "is_home": True,  "day_type": "samedi"},
    ]

settings = Settings()

settings = Settings()