let matchDays = [];
let isAdmin = false;

const urlParams = new URLSearchParams(window.location.search);
const ADMIN_TOKEN = urlParams.get("admin");

// =====================
// MODE ADMIN
// =====================

async function checkAdmin() {
    try {
        const res = await fetch("/is-admin", {
            headers: { "x-token": ADMIN_TOKEN }
        });
        const data = await res.json();
        if (data.is_admin && ADMIN_TOKEN) {
            isAdmin = true;
            // 👇 afficher import
            const importForm = document.getElementById("importForm");
            if (importForm) importForm.style.display = "block";
            const importMessage = document.getElementById("importMessage");
            if (importMessage) importMessage.style.display = "block";
        }

    } catch (err) {
        console.error("Erreur admin:", err);
    }
}

// =====================
// UTILS
// =====================

function clearResult() {
    const result = document.getElementById("result");
    if (result) result.innerHTML = "";
}

async function safeFetch(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Erreur API: ${url}`);
    return res.json();
}

// =====================
// LOAD DATA
// =====================

async function loadData() {

    try {
        matchDays = await safeFetch("/match-days");
        // 👉 SELECT J1 / J2
        const daySelect = document.getElementById("match_day_id");
        if (daySelect) {
            daySelect.innerHTML = "";
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            // 👉 filtrer journées futures
            const futureDays = matchDays.filter(day => {
                if (!day.date) return false;
                const d = new Date(day.date + "T00:00:00");
                return d >= today;
            });
            // 👉 trier par date
            futureDays.sort((a, b) => new Date(a.date) - new Date(b.date));
            // 👉 prendre la plus proche
            const nextDay = futureDays[0];
            if (nextDay) {
                const option = document.createElement("option");
                option.value = nextDay.id;
                const formattedDate = nextDay.date
                    ? nextDay.date.split("-").reverse().join("/")
                    : "";
                option.text = `${nextDay.code} - ${formattedDate}`;
                daySelect.appendChild(option);
            }
        }
        // 👉 CHECKBOX créneaux (FIXES)
        const container = document.getElementById("matchDaysContainer");
        if (container) {
            container.innerHTML = "";
            container.classList.add("slots-container"); 
            const slots = [
                { id: 1, label: "Samedi après-midi" },
                { id: 2, label: "Dimanche matin" },
                { id: 3, label: "Dimanche après-midi" }
            ];
            slots.forEach(slot => {
                const wrapper = document.createElement("div");
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.value = slot.id;
                checkbox.checked = true;
                const label = document.createElement("label");
                label.textContent = slot.label;
                wrapper.classList.add("slot-row");
                wrapper.appendChild(label);
                wrapper.appendChild(checkbox);
                container.appendChild(wrapper);
            });
        }
    } catch (err) {
        console.error("Erreur loadData:", err);
    }
}

// =====================
// INIT
// =====================

document.addEventListener("DOMContentLoaded", () => {

    checkAdmin();
    loadData();

    const daySelect = document.getElementById("match_day_id");
    if (daySelect) {
        const label = document.querySelector("label[for='match_day_id']");
        if (label) {
            label.classList.add("label-day");
        }
        const parent = daySelect.parentElement;
        parent.classList.add("day-container");
    }
    const form = document.getElementById("form");
    if (form) {
    const submitBtn = form.querySelector("button[type='submit']");
    if (submitBtn) {
        submitBtn.classList.add("submit-btn");// 👈 descend le bouton
    }
}
    // 👉 auto détection joueur
    const licenseInput = document.getElementById("license");
    if (licenseInput) {
        let timeout;
        licenseInput.addEventListener("input", () => {
            clearTimeout(timeout);
            const license = licenseInput.value.trim();
            if (license.length < 3) return;
            timeout = setTimeout(async () => {
                try {
                    const res = await fetch(`/player/${license}`);
                    const data = await res.json();
                    const nameDiv = document.getElementById("player_name");
                    const infoDiv = document.getElementById("player_info");
                    if (data.name) {
                        nameDiv.textContent = data.name;
                        infoDiv.textContent = "✔ Joueur ok";
                        playerValid = true;
                    } else {
                        nameDiv.textContent = "";
                        infoDiv.textContent = "Licence inconnue";
                        playerValid = false;
                    }

                } catch (err) {
                    console.error(err);
                }
            }, 300);
        });
    }

    // =====================
    // SUBMIT
    // =====================

    if (form) {
        form.addEventListener("input", clearResult);
        form.addEventListener("submit", async function (e) {
            e.preventDefault();
            try {
                const selectedDay = parseInt(
                    document.getElementById("match_day_id").value
                );
                const slots = Array.from(
                    document.querySelectorAll("#matchDaysContainer input")
                ).map(cb => ({
                    slot_id: parseInt(cb.value),
                    available: cb.checked
                }));
                const data = {
                    license: document.getElementById("license").value,
                    match_day_id: selectedDay,
                    slots: slots
                };
                const response = await fetch("/availability", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                document.getElementById("result").innerHTML = `
                    <div class="alert ${response.ok ? "alert-success" : "alert-danger"}">
                    ${result.error || result.message || "Erreur inconnue"}
                    </div>`;

            } catch (err) {
                console.error(err);
            }
        });
    }
});

// =====================
// IMPORT ADMIN
// =====================

const importForm = document.getElementById("importForm");

if (importForm) {
    importForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        const fileInput = document.getElementById("fileInput");
        const file = fileInput.files[0];

        if (!isAdmin) {
            alert("Accès interdit");
            return;
        }
        if (!file) {
            alert("Choisis un fichier !");
            return;
        }
        if (file.name !== "export.xlsx") {
            showMessage("Le fichier doit s'appeler export.xlsx", true);
            return;
        }
        const formData = new FormData();
        formData.append("file", file);
        try {
            const res = await fetch("/import-joueur", {
                method: "POST",
                headers: { "x-token": ADMIN_TOKEN },
                body: formData
            });
            const data = await res.json();
            fileInput.value = "";
            showMessage(data.error || data.message, !!data.error);
        } catch (err) {
            console.error(err);
            showMessage("Erreur import", true);
        }
    });
}

// =====================
// MESSAGE
// =====================

function showMessage(text, isError = false) {
    const msgDiv = document.getElementById("importMessage");

    msgDiv.innerHTML = `
        <div style="
            background:${isError ? "#dc3545" : "#198754"};
            color:white;
            padding:4px 10px;
            border-radius:6px;
            font-size:11px;
            text-align:center;
        ">
            ${text}
        </div>
    `;

    setTimeout(() => {
        msgDiv.innerHTML = "";
    }, 3000);
}
