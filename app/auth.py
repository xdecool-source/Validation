# créer un token de connexion avec rôle (user ou admin) ;
# vérifier si le token est valide ou expiré ;
# protéger les routes selon les droits utilisateur/admin ;
# refuser les accès non autorisés automatiquement.

import jwt
import os

from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
from fastapi import Header, HTTPException, Depends
from app.config import temps_expi_token

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

# Création token
def create_token(role: str, user_license: str):

    payload = {
        "role": role,
        "license": user_license,
        "exp": datetime.now(timezone.utc)
               + timedelta(minutes=temps_expi_token)
    }
    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


# Vérification token
def verify_token(authorization: str = Header(None)):

    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Token manquant"
        )
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Format invalide"
        )
    token = authorization.replace("Bearer ", "")

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=403,
            detail="Token expiré"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=403,
            detail="Token invalide"
        )


# User
def require_user(user=Depends(verify_token)):

    if user["role"] not in ["user", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Accès refusé"
        )
    return user


# Admin
def require_admin(user=Depends(verify_token)):

    if user["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin requis"
        )
    return user