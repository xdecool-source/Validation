from pydantic import BaseModel

class AvailabilityCreate(BaseModel):
    player_id: int
    match_day_id: int
    availability: str