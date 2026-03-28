let allSlots = [];
let matchDays = [];
let isAdmin = false;

const urlParams = new URLSearchParams(window.location.search);
const ADMIN_TOKEN = urlParams.get("admin");

async function checkAdmin() {

    try {
        const res = await fetch("/is-admin", {
            headers: {
                "x-token": ADMIN_TOKEN
            }
        });
        const data = await res.json();
        console.log("TOKEN:", ADMIN_TOKEN);
        console.log("ADMIN:", data);


        if (data.is_admin && ADMIN_TOKEN) {
            isAdmin = true; // 🔥 AJOUT ICI
            const section = document.getElementById("adminSection");
            if (section) section.style.display = "block";
        }
    } catch (err) {
        console.error("Erreur admin:", err);
    }
}

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

// FETCH sécurisé
async function safeFetch(url) {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Erreur API: ${url}`);
    }
    return res.json();
}

async function loadData() {
    try {
        matchDays = await safeFetch("/match-days");
        allSlots = await safeFetch("/slots");
        const daySelect = document.getElementById("match_day_id");
        if (!daySelect) return;
        daySelect.innerHTML = "";
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 🔹 remplir les journées


        matchDays.forEach(day => {

            const dayDate = new Date(day.date);
            dayDate.setHours(0, 0, 0, 0);
            const option = document.createElement("option");
            option.value = day.id;
            option.text = day.code;

            // si passé → grisé + non sélectionnable
            if (dayDate < today) {
                option.disabled = true;
                option.text += " (passée)";
            }
            daySelect.appendChild(option);
        });

        let firstAvailable = matchDays.find(day => {
            const d = new Date(day.date);
            d.setHours(0,0,0,0);
            return d >= today;
        });

        // fallback si tout est passé
        if (!firstAvailable && matchDays.length > 0) {
            firstAvailable = matchDays[0];
        }

        if (firstAvailable) {
            daySelect.value = firstAvailable.id;
            loadSlotsForDay(firstAvailable.id);
            updateDate(firstAvailable.id);
        }

    } catch (err) {
        console.error("Erreur loadData:", err);
        const resultDiv = document.getElementById("result");
        if (resultDiv) {
            resultDiv.innerHTML =
                `<div class="alert alert-danger">Erreur chargement données</div>`;
        }
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
    if (filtered.length === 0) {
        const option = document.createElement("option");
        option.text = "Aucun créneau";
        slotSelect.appendChild(option);
        return;
    }

    filtered.forEach((slot, index) => {
        const option = document.createElement("option");
        option.value = slot.id;
        option.text = formatLabel(slot.label);
        if (index === 0) option.selected = true;
        slotSelect.appendChild(option);
    });
    clearResult();
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
    checkAdmin(); 
    loadData();
    const form = document.getElementById("form");
    if (form) {
        form.addEventListener("change", clearResult);
    }
    const daySelect = document.getElementById("match_day_id");
    if (daySelect) {
        daySelect.addEventListener("change", function () {
            loadSlotsForDay(this.value);
            updateDate(this.value);
        });
    }

    // 🔹 submit
    if (form) {
        form.addEventListener("submit", async function (e) {
            e.preventDefault();
            const btn = document.getElementById("submitBtn");
            const btnText = document.getElementById("btnText");
            const loader = document.getElementById("btnLoader");
            const resultDiv = document.getElementById("result");
            btn.disabled = true;
            btnText.innerText = "Envoi...";
            loader.classList.remove("d-none");

            try {
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
                resultDiv.innerHTML = `
                    <div class="alert ${response.ok ? "alert-success" : "alert-danger"} mx-auto" style="max-width: 300px;">
                        ${result.message}
                    </div>`;
            } catch (err) {
                console.error(err);
                resultDiv.innerHTML =
                    `<div class="alert alert-danger">Erreur réseau</div>`;
            } finally {
                btn.disabled = false;
                btnText.innerText = "Valider";
                loader.classList.add("d-none");
            }
        });
    }

    // 🔹 licence
    const input = document.getElementById("license");
    const display = document.getElementById("player_name");

    if (input && display) {
        input.addEventListener("input", async function () {
            clearResult();
            const license = this.value.trim();
            if (!license) {
                display.innerText = "";
                return;
            }
            try {
                const data = await safeFetch("/player/" + license);

                display.innerText = data.name
                    ? "👤 " + data.name
                    : "❌ Licence inconnue";

            } catch (err) {
                console.error("Erreur player:", err);
            }
        });

        input.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                e.preventDefault();
            }
        });
    }

//
const importForm = document.getElementById("importForm");

if (importForm) {
    importForm.addEventListener("submit", async function(e) {
        e.preventDefault();
        if (!isAdmin) {
            alert("Accès interdit");
            return;
        }
        const file = document.getElementById("fileInput").files[0];
        if (!file) {
            alert("Choisis un fichier !");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/import-joueur", {
                method: "POST",
                headers: {
                    "x-token": ADMIN_TOKEN
                },
                body: formData
            });



            const data = await res.json();

            const msgDiv = document.getElementById("importMessage");

            msgDiv.innerHTML = `
                <div style="
                    background:${data.error ? "#dc3545" : "#198754"};
                    color:white;
                    padding:4px 10px;
                    border-radius:6px;
                    font-size:11px;
                    text-align:center;
                ">
                    ${data.error || data.message}
                </div>
            `;

// auto disparition
setTimeout(() => {
    msgDiv.innerHTML = "";
}, 3000);




        } catch (err) {
            console.error(err);
            document.getElementById("result").innerHTML =
                `<div class="alert alert-danger">Erreur import</div>`;
        }
    });
}
});