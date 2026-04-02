let currentSort = "ranking";

const isAvailable = (val) => {

    return ["true", "1", "disponible"].includes(
        (val || "").trim().toLowerCase()
    );
};

const parseSlots = (slotsStr) => {

    if (!slotsStr) return [];
    return slotsStr.split(",").map(s => {
        const parts = s.split(":");
        return {
            label: parts[0],
            available: isAvailable(parts[parts.length - 1])
        };
    });
};

const countSlots = (slots, type) => {

    return slots.filter(s =>
        type === "disponible" ? s.available : !s.available
    ).length;
};

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
    if (!Array.isArray(data)) {
        console.error("Erreur API:", data);
        return;
    }

    const tbody = document.getElementById("table-body");
    tbody.innerHTML = "";

    // préparation des données 
    const prepared = data.map(row => {
        const slots = parseSlots(row.slots);

        return {
            ...row,
            parsedSlots: slots,
            dispoCount: countSlots(slots, "disponible"),
            indispoCount: countSlots(slots, "indisponible")
        };
    });

    //  Tri
    if (currentSort === "dispo") {

        prepared.sort((a, b) => {
            if (a.indispoCount === 0 && b.indispoCount !== 0) return -1;
            if (b.indispoCount === 0 && a.indispoCount !== 0) return 1;
            if (a.dispoCount !== b.dispoCount)
                return b.dispoCount - a.dispoCount;
            if (a.indispoCount !== b.indispoCount)
                return a.indispoCount - b.indispoCount;
            return b.ranking - a.ranking;
        });

    } else if (currentSort === "indispo") {
        prepared.sort((a, b) => {
            if (a.indispoCount !== b.indispoCount)
                return b.indispoCount - a.indispoCount;
            if (a.dispoCount !== b.dispoCount)
                return a.dispoCount - b.dispoCount;
            return b.ranking - a.ranking;
        });
    } else {
        prepared.sort((a, b) => b.ranking - a.ranking);
    }

    // Affichage
    const order = ["dimanche_matin", "dimanche_aprem", "samedi_aprem"];

    prepared.forEach(row => {
        const tr = document.createElement("tr");
        const sortedSlots = [...row.parsedSlots].sort(
            (a, b) => order.indexOf(a.label) - order.indexOf(b.label)
        );
        const badges = sortedSlots.map(slot => {
            const color = slot.available ? "bg-success" : "bg-danger";
            return `<span class="badge ${color} me-1">
                ${formatLabel(slot.label)}
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

    // Necessaire  pour Excel
    window.currentData = prepared;
}

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
        if (day.date < todayStr) {
            opt.text = "⛔ " + day.code + " (passé)";
        } else {
            opt.text = "✅ " + day.code;
        }
        const diff = Math.abs(new Date(day.date) - new Date());

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

document.addEventListener("DOMContentLoaded", async () => {

    await loadDays();
    loadDispos();

    document
        .getElementById("match_day_id")
        .addEventListener("change", loadDispos);
});
