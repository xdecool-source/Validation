from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from app.database import SessionLocal, engine
from app.admin import router as admin_router
from app.admin import init_match_days
from app.models import Base
from app.import_joueur import router as import_router
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from app.admin import init_match_slots

import os

load_dotenv()

PIN_CODE = os.getenv("PIN_CODE")
ADMIN_PIN = os.getenv("ADMIN_PIN")
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise Exception("SECRET_KEY non défini !")

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(" Vérification / création des tables...")
    Base.metadata.create_all(bind=engine)
    init_match_days()
    init_match_slots() 
    yield

app = FastAPI(lifespan=lifespan)
app.include_router(admin_router)
app.include_router(import_router)

app.mount("/static-admin", StaticFiles(directory="admin"), name="admin")
app.mount("/static", StaticFiles(directory="static"), name="static")

templates = Jinja2Templates(directory="templates")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/admin", response_class=HTMLResponse)
def admin_page(request: Request):
    return templates.TemplateResponse("admin.html", {"request": request})

@app.get("/admin-dispo", response_class=HTMLResponse)
def admin_dispos(request: Request):
    return templates.TemplateResponse("admin_dispo.html", {"request": request})

@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse("user.html", {"request": request})

@app.get("/admin/import-joueur")
def admin_page():
    return FileResponse("admin/import-joueur.html")

