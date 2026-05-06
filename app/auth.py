import jwt
import os
from datetime import datetime, timedelta
from fastapi import Header, HTTPException
from dotenv import load_dotenv
from fastapi import Depends
from datetime import datetime, timedelta, timezone

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

#  Création du token
def create_token(role: str, user_license: str):
    print("CREATE TOKEN APPELÉ")
    payload = {
        "role": role,
        "license": user_license,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5)  #  Temps expiration token
    }
    print("UTC NOW:", datetime.utcnow())
    print("Payload:", payload)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


#  Vérification du token
def verify_token(authorization: str = Header(None)):

    if not authorization:
        raise HTTPException(status_code=401, detail="Token manquant")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Format invalide")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=403, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=403, detail="Token invalide")


#  Vérification admin
def require_admin(role: str = Depends(verify_token)):
    if role != "admin":
        raise HTTPException(status_code=403, detail="Accès refusé")
    