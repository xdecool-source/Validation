import jwt
import os
from datetime import datetime, timedelta
from fastapi import Header, HTTPException
from dotenv import load_dotenv
from fastapi import Depends

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

# 🔑 Création du token
def create_token(role: str):
    payload = {
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=4)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# 🔍 Vérification du token
def verify_token(authorization: str = Header(None)):

    if not authorization:
        raise HTTPException(status_code=401, detail="Token manquant")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Format invalide")

    token = authorization.replace("Bearer ", "")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("role")

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")

    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")


# 👑 Vérification admin
def require_admin(role: str = Depends(verify_token)):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Accès refusé")
    