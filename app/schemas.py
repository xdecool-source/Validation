# vérifier le format des données envoyées à l’API pour une disponibilité joueur :
# player_id > identifiant du joueur ;
# match_day_id > journée de match ;
# availability > état de disponibilité.

from pydantic import BaseModel

class AvailabilityCreate(BaseModel):
    player_id: int
    match_day_id: int
    availability: str