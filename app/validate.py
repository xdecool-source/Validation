from fastapi import FastAPI, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from app.database import SessionLocal, engine
from app.schemas import AvailabilityCreate
from app.admin import router as admin_router
from app.admin import init_match_days, init_slots
from app.models import Base
from app import crud
from app.import_joueur import router as import_router

app = FastAPI()

app.include_router(admin_router)
app.include_router(import_router)

app.mount("/static", StaticFiles(directory="static"), name="static")

print("ROUTES CHARGÉES")

def get_db():

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
def on_startup():
    print("🔄 Vérification / création des tables...")
    Base.metadata.create_all(bind=engine)
    init_match_days()
    init_slots()
    
@app.post("/availability")
def create_availability(avail: AvailabilityCreate, db=Depends(get_db)):
    crud.add_availability(db, avail)
    return {"status": "ok"}

templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse("user.html", {"request": request})

@app.get("/admin", response_class=HTMLResponse)
def admin_page(request: Request):
    return templates.TemplateResponse("admin.html", {"request": request})

    