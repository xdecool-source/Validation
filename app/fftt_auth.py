import hashlib
import hmac
import os
import random
import string

from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

APP_ID = os.getenv("FFTT_APP_ID", "")
MOT_DE_PASSE = os.getenv("FFTT_MOT_DE_PASSE", "")

BASE_DIR = Path(__file__).resolve().parent.parent
SERIE_FILE = Path(
    os.getenv("FFTT_SERIE_FILE", str(BASE_DIR / "serie.txt"))
)

def generer_serie():
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choice(chars) for _ in range(15))

def charger_serie():
    serie_env = os.environ.get("FFTT_SERIE")
    if serie_env:
        return serie_env.strip()
    if SERIE_FILE.exists():
        return SERIE_FILE.read_text().strip()
    serie = generer_serie()
    try:
        SERIE_FILE.parent.mkdir(parents=True, exist_ok=True)
        SERIE_FILE.write_text(serie)
    except OSError:
        pass
    return serie

def timestamp():
    now = datetime.now()
    return (
        now.strftime("%Y%m%d%H%M%S")
        + f"{int(now.microsecond / 1000):03d}"
    )

def tmc(tm):
    cle = hashlib.md5(
        MOT_DE_PASSE.encode()
    ).hexdigest()

    return hmac.new(
        cle.encode(),
        tm.encode(),
        hashlib.sha1
    ).hexdigest()

def parametres_auth():
    tm = timestamp()
    return {
        "id": APP_ID,
        "serie": charger_serie(),
        "tm": tm,
        "tmc": tmc(tm)
    }