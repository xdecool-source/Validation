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
    const dayId = document.getElementById("match_day_id").value;
    const res = await fetch("/dispos/" + dayId);
    const data = await res.json();
    const tbody = document.getElementById("table-body");
    tbody.innerHTML = "";
    data
        .sort((a, b) => b.ranking - a.ranking) // tri
        .forEach(row => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${row.name}</td>
                <td>
                    <span class="badge bg-primary">${row.ranking}</span>
                </td>
                <td>
                    <span class="badge ${
                        row.availability === "disponible"
                            ? "bg-success"
                            : "bg-danger"
                    }">
                        ${formatLabel(row.label)}
                    </span>
                </td>
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