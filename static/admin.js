// visualisation des dispos a l'écran pour les admins
// Chargement des journées de match
// Récupéreration des disponibilités via l’API /dispos/{id}
// Affiche les joueurs dans un tableau HTML
// Affiche des badges couleur (dispo / indispo / absent)
// Trie les joueurs :
//                  par classement
//                  par nombre de disponibilités 
//                  par nombre d’indisponibilités
// const res = await fetch("/dispos/" + dayId) demande la liste dans admin.py
// tbody.appendChild(tr); affiche chaque joueur dynamiquement dans le tableau html

let currentSort = "ranking"; // dispo | indispo | ranking

async function loadDays() {

    const res = await fetch("/match-days", {
        headers: {
            Authorization: "Bearer " + localStorage.getItem("token")
        }
    });
    if (res.status === 403) {
        const data = await res.json();
        alert(data.detail);
        localStorage.removeItem("token");
        location.reload();
        return;
    }
    const days = await res.json();
    const select = document.getElementById("match_day_id");
    select.innerHTML = "";
    const todayStr = new Date().toISOString().split("T")[0];
    let closestDayId = null;
    let smallestDiff = Infinity;

    days.forEach(day => {
        const opt = document.createElement("option");
        opt.value = day.id;
        console.log("day.date =", day.date);
        console.log("todayStr =", todayStr);
        if (day.date < todayStr) {
            opt.text = "⛔ " + day.code + " (passé)";
        } else {
            opt.text = "✅ " + day.code;
        }
        const matchDate = new Date(day.date);
        const diff = Math.abs(matchDate - new Date());
        if (diff < smallestDiff) {
            smallestDiff = diff;
            closestDayId = day.id;
        }
        select.appendChild(opt);
    });

    if (closestDayId !== null) {
        select.value = closestDayId;
    }
}

function formatLabel(label) {

    return label
        .replace("samedi_aprem", "Samedi après-midi")
        .replace("dimanche_matin", "Dimanche matin")
        .replace("dimanche_aprem", "Dimanche après-midi");
}

async function loadDispos() {
    
    //  console.log("SORT:", currentSort);
    const dayId = document.getElementById("match_day_id").value;
    const res = await fetch("/dispos/" + dayId, {
        headers: {
            Authorization: "Bearer " + localStorage.getItem("token")
        }
    });

    if (res.status === 403) {
        const data = await res.json();
        alert(data.detail); //  "Token expiré"
        localStorage.removeItem("token");
        location.reload();
        return;
    }
    const data = await res.json();
    window.currentData = data;

    // console.log("STOCK DATA:", window.currentData);
    const tbody = document.getElementById("table-body");
    tbody.innerHTML = "";
        if (!Array.isArray(data)) {
            console.error("Data invalide:", data);
            // console.error("Erreur API:", data);
            return;
        }
        const count = (row, type) => {
            if (!row.slots || typeof row.slots !== "string") return 0;

            return row.slots.split(",").filter(s => {
                const [label, valRaw] = s.split(":");
                const val = valRaw?.trim().toLowerCase();

                //  ON IGNORE ABSENT
                if (label === "Absent") return false;

                const isDispo =
                    val === "true" ||
                    val === "1" ||
                    val === "disponible";

                return type === "disponible" ? isDispo : !isDispo;
            }).length;
        };

        // console.log("SORT ACTUEL:", currentSort);
        if (currentSort === "dispo") {

            data.sort((a, b) => {
                const dispoA = count(a, "disponible");
                const dispoB = count(b, "disponible");

                // tri strict : plus de dispos en premier
                if (dispoA !== dispoB) return dispoB - dispoA;

                // moins d’indispos ensuite
                const indispoA = count(a, "indisponible");
                const indispoB = count(b, "indisponible");

                return indispoA - indispoB;
            });

        } else if (currentSort === "indispo") {

            data.sort((a, b) => {
                const indispoA = count(a, "indisponible");
                const indispoB = count(b, "indisponible");

                // plus d’indispos en premier
                if (indispoA !== indispoB) return indispoB - indispoA;

                // moins de dispos ensuite
                const dispoA = count(a, "disponible");
                const dispoB = count(b, "disponible");

                return dispoA - dispoB;
            });

        } else {
            // Tri par classement
            data.sort((a, b) => b.ranking - a.ranking);
        }
        
        data.forEach(row => {
            console.log(row.name, {
                dispo: count(row, "disponible"),
                indispo: count(row, "indisponible")
            });
            const tr = document.createElement("tr");
            if (!row.slots) {
                // console.warn("Pas de slots:", row);
                return;
            }
            const slots = row.slots.split(",");
            //  détecter si au moins une dispo existe
            const hasDispo = slots.some(s => {
                const parts = s.split(":");
                const label = parts[0];
                const val = parts[parts.length - 1]?.trim().toLowerCase();

                const isDispo =
                    val === "true" ||
                    val === "1" ||
                    val === "disponible";

                return label !== "Absent" && isDispo;
            });
            const order = ["dimanche_matin", "dimanche_aprem", "samedi_aprem", "Absent"];
            // tri des slots
            slots.sort((a, b) => {
                const la = a.split(":")[0];
                const lb = b.split(":")[0];
                return order.indexOf(la) - order.indexOf(lb);
            });
            const badges = slots.map(s => {
                const parts = s.split(":");
                const label = parts[0];
                const val = parts[parts.length - 1]?.trim().toLowerCase();
                const isDispo =
                    val === "true" ||
                    val === "1" ||
                    val === "disponible";

                let color = "bg-secondary";

                if (hasDispo) {
                    if (label === "Absent") {
                        color = "bg-secondary";
                    } else if (isDispo) {
                        color = "bg-success";
                    } else {
                        color = "bg-secondary";
                    }
                } else {
                    if (label === "Absent") {
                        color = "bg-danger";
                    } else if (isDispo) {
                        color = "bg-success";
                    } else {
                        color = "bg-danger";
                    }
                }

                return `<span class="badge ${color} me-1">
                    ${formatLabel(label)}
                </span>`;
            }).join(" ");

            tr.innerHTML = `
                <td>${row.name || "-"}</td>
                <td>
                    <span class="badge bg-primary">${row.ranking ?? "-"}</span>
                </td>
                <td>${badges}</td>
            `;
            tbody.appendChild(tr);
        });
}

// Initialisation
document.addEventListener("DOMContentLoaded", async () => {

    await loadDays();
    loadDispos();
    document
        .getElementById("match_day_id")
        .addEventListener("change", loadDispos);
    
    // ajout pour export 
    const exportButton =
        document.getElementById("exportJoueursBtn");

    if (exportButton) {
        exportButton.addEventListener(
            "click",
            exportJoueurs
        );
    }
});

function setSort(type) {

    // .log("CLICK SORT:", type); 
    currentSort = type;
    loadDispos(); // recharge avec nouveau tri
}

// export fftt → neon + excel new

async function exportJoueurs() {

    const button =
        document.getElementById(
            "exportJoueursBtn"
        );
    const result =
        document.getElementById(
            "exportJoueursResult"
        );
    const token =
        localStorage.getItem("token");

    if (!token) {
        alert(
            "Session administrateur inexistante."
        );
        location.reload();
        return;
    }

    button.disabled = true;
    button.innerText =
        " Export en cours...";
    result.innerHTML =
        "Récupération des joueurs FFTT...";

    try {
        const response =
            await fetch(
                "/export-joueurs/export",
                {
                    method: "POST",
                    headers: {
                        "Authorization":
                            "Bearer " + token
                    }
                }
            );

        // Token expiré ou accès refusé
        if (
            response.status === 401 ||
            response.status === 403
        ) {
            let message =
                "Accès administrateur refusé.";
            try {
                const data =
                    await response.json();

                if (data.detail) {
                    message = data.detail;
                }
            } catch (e) {}

            localStorage.removeItem("token");
            alert(message);
            location.reload();
            return;
        }

        // Autre erreur
        if (!response.ok) {
            let message =
                "Erreur pendant l'export.";
            try {
                const data =
                    await response.json();
                if (data.detail) {
                    message = data.detail;
                }
            } catch (e) {}
            throw new Error(message);
        }
        result.innerHTML =
            " Génération du fichier Excel...";

        // Récupération du fichier
        const blob =
            await response.blob();
        const nombreJoueurs =
        response.headers.get("X-Nombre-Joueurs");
        // Nom du fichier
        let filename =
            "licencies.xlsx";
        const disposition =
            response.headers.get(
                "Content-Disposition"
            );

        if (disposition) {
            const match =
                disposition.match(
                    /filename="([^"]+)"/
                );
            if (match && match[1]) {
                filename = match[1];
            }
        }

        // Téléchargement
        const url =
            window.URL.createObjectURL(blob);
        const link =
            document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        result.innerHTML =
            `<span class="text-success">
            ${nombreJoueurs || "?"} joueurs importés dans notre base <br>
            Export terminé : ${filename}
            </span>`;

    } catch (error) {
        console.error(
            "Erreur export FFTT :",
            error
        );
        result.innerHTML =
            `<span class="text-danger">
                 ${error.message}
            </span>`;

    } finally {
        button.disabled = false;
        button.innerText =
            "FFTT → Neon + Excel";
    }
}