import urllib.parse
import urllib.request

from app.fftt_auth import parametres_auth

BASE_URL = "https://www.fftt.com/mobile/pxml"

def appel(endpoint, **params):
    p = parametres_auth()
    p.update(params)
    url = f"{BASE_URL}/{endpoint}?{urllib.parse.urlencode(p)}"
    with urllib.request.urlopen(url, timeout=20) as r:
        return r.read().decode("latin-1")
