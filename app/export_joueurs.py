import os
import tempfile

from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from app.auth import require_admin

from app.fftt_api import appel
from app.parser import parse_liste, filtre_saison, trier_points
from app.excel import export_excel, export_neon

router = APIRouter(
    prefix="/export-joueurs",
    tags=["Export joueurs"]
)

@router.post("/export")
def export_joueurs(
    admin=Depends(require_admin)
):

    # club fftt

    club = os.getenv(
        "FFTT_CLUB",
        "11660007"
    )

    print("")
    print(" EXPORT JOUEURS FFTT")
    print(f"Club FFTT : {club}")

    # récupération fftt

    try:
        xml = appel(
            "xml_licence_b.php",
            club=club
        )
    except Exception as e:
        print(
            "Erreur récupération FFTT :",
            e
        )
        raise HTTPException(
            status_code=500,
            detail=(
                "Erreur lors de la récupération "
                f"des joueurs FFTT : {e}"
            )
        )

    # parsing / filtrage / tri

    try:

        joueurs = trier_points(
            filtre_saison(
                parse_liste(xml)
            )
        )

    except Exception as e:
        print(
            "Erreur traitement joueurs :",
            e
        )
        raise HTTPException(
            status_code=500,
            detail=(
                "Erreur lors du traitement "
                f"des joueurs : {e}"
            )
        )

    print(
        f"👥 {len(joueurs)} joueurs récupérés"
    )

    # export neon

    try:

        nombre = export_neon(joueurs)
    except Exception as e:

        print(
            "Erreur export Neon :",
            e
        )
        raise HTTPException(
            status_code=500,
            detail=(
                "Erreur lors de l'export "
                f"vers Neon : {e}"
            )
        )
    print(
        f"{nombre} joueurs exportés vers Neon"
    )

    # export excel

    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            suffix=".xlsx",
            delete=False
        ) as tmp:
            temp_path = tmp.name
        export_excel(
            joueurs,
            temp_path
        )
        with open(
            temp_path,
            "rb"
        ) as f:
            data = f.read()

    except Exception as e:

        print(
            "Erreur génération Excel :",
            e
        )
        raise HTTPException(
            status_code=500,
            detail=(
                "Erreur lors de la génération "
                f"du fichier Excel : {e}"
            )
        )

    finally:
        if temp_path:
            try:
                os.remove(temp_path)
            except OSError:
                pass

    # nom du fichier

    today = date.today().strftime(
        "%Y-%m-%d"
    )
    filename = (
        f"licencies_{club}_{today}.xlsx"
    )
    print(
        f"📥 Fichier généré : {filename}"
    )

    # téléchargement

    return Response(
        content=data,
        media_type=(
            "application/vnd.openxmlformats-"
            "officedocument.spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition":
                f'attachment; filename="{filename}"',
            "X-Nombre-Joueurs": str(nombre)
        }
    )
    