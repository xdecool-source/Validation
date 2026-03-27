from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Player(Base):
    __tablename__ = "players"
    id = Column(Integer, primary_key=True, index=True)
    license = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    ranking = Column(Integer, default=0, index=True)
    team = Column(String, nullable=True)
    email = Column(String, nullable=True)
    __table_args__ = (
        Index("idx_ranking_desc", ranking.desc()),
    )

class MatchDay(Base):
    __tablename__ = "match_days"
    id = Column(Integer, primary_key=True)
    code = Column(String)
    date = Column(String)
    is_home = Column(Boolean)
    day_type = Column(String)
    
class MatchSlot(Base):
    __tablename__ = "match_slots"
    id = Column(Integer, primary_key=True)
    match_day_id = Column(Integer, ForeignKey("match_days.id"))
    label = Column(String)

    __table_args__ = (
        UniqueConstraint("match_day_id", "label", name="unique_day_slot"),
    )

class Availability(Base):
    __tablename__ = "availabilities"
    id = Column(Integer, primary_key=True)
    player_id = Column(Integer, ForeignKey("players.id"))
    slot_id = Column(Integer, ForeignKey("match_slots.id"))
    availability = Column(String)
    __table_args__ = (
        UniqueConstraint("player_id", "slot_id", name="unique_player_slot"),
    )

class Selection(Base):
    __tablename__ = "selections"
    id = Column(Integer, primary_key=True)
    player_id = Column(Integer, ForeignKey("players.id"))
    match_day_id = Column(Integer, ForeignKey("match_days.id"))
    team = Column(String)