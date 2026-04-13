// visualisation des dispos 

let currentSort = "ranking"; // dispo | indispo | ranking

async function loadDays() {

    const res = await fetch("/match-days");
    const days = await res.json();
    const select = document.getElementById("match_day_id");
    select.innerHTML = "";
    const todayStr = new Date().toISOString().split("T")[0];
    let closestDayId = null;
    let smallestDiff = Infinity;

    days.forEach(day => {
        const opt = document.createElement("option");
        opt.value = day.id;
        // 
        if (day.date < todayStr) {
            opt.text = "⛔ " + day.code + " (passé)";
            opt.classList.add("past-day");
        } else {
            opt.text = "✅ " + day.code;
        }

        // sélection automatique

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
    
    console.log("SORT:", currentSort);
    const dayId = document.getElementById("match_day_id").value;
    const res = await fetch("/dispos/" + dayId);
    const data = await res.json();
    window.currentData = data;

    console.log("STOCK DATA:", window.currentData);
    const tbody = document.getElementById("table-body");
    tbody.innerHTML = "";

        //
        if (!Array.isArray(data)) {
            console.error("Erreur API:", data);
            return;
        }
        const count = (row, type) => {
            if (!row.slots) return 0;
            return row.slots.split(",").filter(s => {
                const parts = s.split(":");
                const val = parts[parts.length - 1]?.trim().toLowerCase();
                const isDispo =
                    val === "true" ||
                    val === "1" ||
                    val === "disponible";

                return type === "disponible" ? isDispo : !isDispo;
            }).length;
        };

        console.log("SORT ACTUEL:", currentSort);
        if (currentSort === "dispo") {
            data.sort((a, b) => {
                const dispoA = count(a, "disponible");
                const dispoB = count(b, "disponible");
                const indispoA = count(a, "indisponible");
                const indispoB = count(b, "indisponible");
                //  PRIORITÉ : 0 indispo (100% dispo)
                if (indispoA === 0 && indispoB !== 0) return -1;
                if (indispoB === 0 && indispoA !== 0) return 1;
                //  ensuite nb de dispos
                if (dispoA !== dispoB) return dispoB - dispoA;
                //  ensuite nb d’indispos
                if (indispoA !== indispoB) return indispoA - indispoB;
                //  classement
                return b.ranking - a.ranking;
            });

        } else if (currentSort === "indispo") {
            data.sort((a, b) => {
                const indispoA = count(a, "indisponible");
                const indispoB = count(b, "indisponible");
                //  plus d’indispos
                if (indispoA !== indispoB) return indispoB - indispoA;
                const dispoA = count(a, "disponible");
                const dispoB = count(b, "disponible");
                // moins de dispos
                if (dispoA !== dispoB) return dispoA - dispoB;
                // classement
                return b.ranking - a.ranking;
            });

        } else {
            // Tri par classement
            console.log("RANKINGS:", data.map(d => d.ranking));
            data.sort((a, b) => b.ranking - a.ranking);
        }
        //
        
        data.forEach(row => {
            
            const tr = document.createElement("tr");
            if (!row.slots) {
                console.warn("Pas de slots:", row);
                return;
            }
            const slots = row.slots.split(",");
            // 🔥 détecter si au moins une dispo existe
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
            const order = ["dimanche_matin", "dimanche_aprem", "samedi_aprem"];
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


                // 🔥 OBLIGATOIRE
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

// INIT
document.addEventListener("DOMContentLoaded", async () => {
    await loadDays();
    loadDispos();
    document
        .getElementById("match_day_id")
        .addEventListener("change", loadDispos);
});

function setSort(type) {
    console.log("CLICK SORT:", type); 
    currentSort = type;
    loadDispos(); // recharge avec nouveau tri
}
