let allSlots = [];
let matchDays = [];

function formatLabel(label) {
    if (label === "dimanche_matin") return "Dimanche matin";
    if (label === "dimanche_aprem") return "Dimanche après-midi";
    if (label === "samedi_aprem") return "Samedi après-midi";
    return label;
}

async function loadData() {
    try {
        //  récupérer les journées
        const daysRes = await fetch("/match-days");
        matchDays = await daysRes.json();
        //  récupérer les slots
        const response = await fetch("/slots");
        allSlots = await response.json();
        const daySelect = document.getElementById("match_day_id");
        if (!daySelect) return;

        daySelect.innerHTML = "";
        matchDays.forEach(day => {
            const option = document.createElement("option");
            option.value = day.id;
            //  format date
            const date = new Date(day.date);
            const formattedDate = date.toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "2-digit"
            });
            option.text = `${day.code}`;
            daySelect.appendChild(option);
        });
        loadSlotsForDay(1);
        updateDate(matchDays[0].id); 
    } catch (err) {
        console.error("Erreur loadData:", err);
    }
}

function loadSlotsForDay(dayId) {

    const slotSelect = document.getElementById("slot_id");
    if (!slotSelect) return;
    slotSelect.innerHTML = "";

    const day = matchDays.find(d => d.id == dayId);

    const order = [
        "dimanche_matin",
        "dimanche_aprem",
        "samedi_aprem"
    ];

    let filtered = allSlots
        .filter(s => s.code === "J" + dayId)
        .sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));


    // ajouter d'abord les vrais slots
    filtered.forEach((slot, index) => {
        const option = document.createElement("option");
        option.value = slot.id;
        option.text = formatLabel(slot.label);
        if (index === 0) option.selected = true;
        slotSelect.appendChild(option);
    });

}

function updateDate(dayId) {
    const dateDiv = document.getElementById("match_day_date");
    if (!dateDiv) return;
    const day = matchDays.find(d => d.id == dayId);
    if (!day) return;
    const date = new Date(day.date);
    const formatted = date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
    dateDiv.innerText = formatted;
}

document.addEventListener("DOMContentLoaded", () => {

    function clearResult() {
        const result = document.getElementById("result");
        if (result) result.innerText = "";
    }

    
    console.log("JS OK");
    // 🔹 charger les journées (TOUJOURS)
    loadData();
    // 🔹 changement journée
    const daySelect = document.getElementById("match_day_id");
    if (daySelect) {
        daySelect.addEventListener("change", function() {
            loadSlotsForDay(this.value);
            updateDate(this.value)
            clearResult(); 
        });
    }
    const slotSelect = document.getElementById("slot_id");
    const availabilitySelect = document.getElementById("availability");

    if (slotSelect) {
        slotSelect.addEventListener("change", clearResult);
    }

    if (availabilitySelect) {
        availabilitySelect.addEventListener("change", clearResult);
    }
    // 🔹 formulaire
    const form = document.getElementById("form");
    if (form) {
        form.addEventListener("submit", async function(e) {
            e.preventDefault();
            const selectedValue = document.getElementById("slot_id").value;
            let slot_ids = [parseInt(selectedValue)];
            const data = {
                license: document.getElementById("license").value,
                slot_ids: slot_ids,
                availability: document.getElementById("availability").value
            };
            const response = await fetch("/availability", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(data)
            });

            const result = await response.json();
            document.getElementById("result").innerText = result.message;
        });
    }


    // PARTIE LICENCE (indépendante)
    const input = document.getElementById("license");
    const display = document.getElementById("player_name");

    if (input && display) {

        input.addEventListener("input", async function() {

            const license = this.value.trim();
            console.log("license =", license);
            if (!license) {
                display.innerText = "";
                return;
            }
            try {
                const res = await fetch("/player/" + license);
                console.log("status =", res.status);
                const data = await res.json();
                console.log("data =", data);
                if (data.name) {
                    display.innerText = "👤 " + data.name;
                } else {
                    display.innerText = "❌ Licence inconnue";
                }
            } catch (err) {
                console.error("Erreur player:", err);
            }
        });

        input.addEventListener("keydown", function(e) {
            if (e.key === "Enter") {
                e.preventDefault();
            }
        });
    }
});
