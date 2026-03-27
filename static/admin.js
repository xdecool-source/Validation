async function loadDays() {
    const res = await fetch("/match-days");
    const days = await res.json();

    const select = document.getElementById("match_day_id");
    select.innerHTML = "";

    days.forEach(day => {
        const opt = document.createElement("option");
        opt.value = day.id;
        opt.text = day.code;
        select.appendChild(opt);
    });
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

    data.forEach(row => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${row.name}</td>
            <td>${row.ranking}</td>
            <td>${formatLabel(row.label)}</td>
        `;

        tbody.appendChild(tr);
    });
}

// 🔥 charger les journées au démarrage
document.addEventListener("DOMContentLoaded", loadDays);