"""
Parse les réponses XML de l'API FFTT.
"""

import xml.etree.ElementTree as ET

from dataclasses import dataclass
from datetime import datetime

today = datetime.today()
if today.month >= 7:
    DATE_DEBUT_SAISON = datetime(today.year, 7, 1)
else:
    DATE_DEBUT_SAISON = datetime(today.year - 1, 7, 1)

@dataclass
class Joueur:
    licence: str = ""
    nom: str = ""
    prenom: str = ""
    club: str = ""
    certif: str = ""
    type: str = ""
    categorie: str = ""
    points: float = 0.0
    validation: str = ""
    mutation: str = ""


def parse_liste(xml):
    root = ET.fromstring(xml)
    joueurs = []

    for j in root.findall(".//licence"):
        try:
            points = float(j.findtext("point", "0").replace(",", "."))
        except ValueError:
            points = 0.0

        joueurs.append(
            Joueur(
                licence=j.findtext("licence", ""),
                nom=j.findtext("nom", ""),
                prenom=j.findtext("prenom", ""),
                club=j.findtext("nomclub", ""),
                certif=j.findtext("certif", ""),
                type=j.findtext("type", ""),
                categorie=j.findtext("cat", ""),
                points=points,
                validation=j.findtext("validation", ""),
                mutation=j.findtext("mutation", "")
            )
        )

    return joueurs

def filtre_saison(joueurs):
    resultat = []
    for j in joueurs:
        if not j.validation:
            continue
        try:
            date_validation = datetime.strptime(j.validation, "%d/%m/%Y")
            if date_validation >= DATE_DEBUT_SAISON:
                resultat.append(j)
        except ValueError:
            pass
    return resultat

def trier_points(joueurs):
    return sorted(
        joueurs,
        key=lambda j: (-j.points, j.nom, j.prenom)
    )
