import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from app.config import settings


load_dotenv()  # charge le .env
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
