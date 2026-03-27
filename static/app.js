let allSlots = [];
let matchDays = [];

function formatLabel(label) {
    if (label === "dimanche_matin") return "Dimanche matin";
    if (label === "dimanche_aprem") return "Dimanche après-midi";
    if (label === "samedi_aprem") return "Samedi après-midi";
    return label;
}

function clearResult() {
    const result = document.getElementById("result");
    if (result) result.innerHTML = "";
}

async function loadData() {
    try {
        const daysRes = await fetch("/match-days");
        matchDays = await daysRes.json();
        const response = await fetch("/slots");
        allSlots = await response.json();
        const daySelect = document.getElementById("match_day_id");
        if (!daySelect) return;
        daySelect.innerHTML = "";

        const today = new Date();
        today.setHours(0, 0, 0, 0); // ignore l'heure

        matchDays.forEach(day => {

            const dayDate = new Date(day.date);
            dayDate.setHours(0, 0, 0, 0);

            // ❌ si la journée est passée → on ignore
            // if (dayDate < today) return;
            const option = document.createElement("option");
            option.value = day.id;
            option.text = `${day.code}`;
            option.disabled = dayDate < today;

            daySelect.appendChild(option);
        });



        const firstAvailable = matchDays.find(day => {
        const d = new Date(day.date);
        d.setHours(0,0,0,0);
        return d >= today;
        });

        if (firstAvailable) {
            loadSlotsForDay(firstAvailable.id);
            updateDate(firstAvailable.id);
        }

    } catch (err) {
        console.error("Erreur loadData:", err);
    }
}

function loadSlotsForDay(dayId) {

    const slotSelect = document.getElementById("slot_id");
    if (!slotSelect) return;
    slotSelect.innerHTML = "";
    const order = [
        "dimanche_matin",
        "dimanche_aprem",
        "samedi_aprem"
    ];

    let filtered = allSlots
        .filter(s => s.code === "J" + dayId)
        .sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
    filtered.forEach((slot, index) => {
        const option = document.createElement("option");
        option.value = slot.id;
        option.text = formatLabel(slot.label);
        if (index === 0) option.selected = true;
        slotSelect.appendChild(option);
    });

    clearResult(); //  reset message
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

    console.log("JS OK");
    loadData();
    const form = document.getElementById("form");

    // UN SEUL LISTENER GLOBAL
    if (form) {
        form.addEventListener("change", clearResult);
    }
    // 🔹 changement journée
    const daySelect = document.getElementById("match_day_id");
    if (daySelect) {
        daySelect.addEventListener("change", function() {
            loadSlotsForDay(this.value);
            updateDate(this.value);
        });
    }
    // 🔹 formulaire submit
if (form) {
    form.addEventListener("submit", async function(e) {
        e.preventDefault();

        const btn = document.getElementById("submitBtn");
        const btnText = document.getElementById("btnText");
        const loader = document.getElementById("btnLoader");
        const resultDiv = document.getElementById("result");

        //  bloque bouton
        btn.disabled = true;
        //  loader ON
        btnText.innerText = "Envoi...";
        loader.classList.remove("d-none");
        try {
            // 
            const selectedValue = document.getElementById("slot_id").value;
            const data = {
                license: document.getElementById("license").value,
                slot_ids: [parseInt(selectedValue)],
                availability: document.getElementById("availability").value
            };
            const response = await fetch("/availability", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(data)
            });
            const result = await response.json();

            if (!response.ok) {
                resultDiv.innerHTML = `
                    <div class="alert alert-danger mx-auto" style="max-width: 300px;">
                        ${result.message}
                    </div>`;
            } else {
                resultDiv.innerHTML = `
                    <div class="alert alert-success mx-auto" style="max-width: 300px;">
                        ${result.message}
                    </div>`;
            }

        } catch (err) {
            console.error(err);

            resultDiv.innerHTML =
                `<div class="alert alert-danger">Erreur réseau</div>`;
        }

        finally {
            btn.disabled = false;
            btnText.innerText = "Valider";
            loader.classList.add("d-none");
        }
    });
}

    // 🔹 partie licence
    const input = document.getElementById("license");
    const display = document.getElementById("player_name");

    if (input && display) {
        input.addEventListener("input", async function() {
            clearResult(); // reset message
            const license = this.value.trim();
            if (!license) {
                display.innerText = "";
                return;
            }
            try {
                const res = await fetch("/player/" + license);
                const data = await res.json();

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
