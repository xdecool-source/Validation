let matchDays = [];
let isAdmin = false;
let playerValid = false;

// Mode Admin

async function checkAdmin() {

    try {
        const res = await fetch("/is-admin", {
            credentials: "include"
        });
        const data = await res.json();
        if (data.is_admin) {
            isAdmin = true;
            const importForm = document.getElementById("importForm");
            if (importForm) importForm.style.display = "block";
            const importMessage = document.getElementById("importMessage");
            if (importMessage) importMessage.style.display = "block";
        }

    } catch (err) {
        console.error("Erreur admin:", err);
    }
}

// Utilitaire pour Reset 

function resetUI() {

    const nameDiv = document.getElementById("player_name");
    const infoDiv = document.getElementById("player_info");
    if (nameDiv) nameDiv.textContent = "";
    if (infoDiv) infoDiv.textContent = "";
    playerValid = false;
    window.currentAvailability = null;
    setSlotsDisabled(true);
    resetSlots();
}

function clearResult() {

    const result = document.getElementById("result");
    if (result) result.innerHTML = "";
}

async function safeFetch(url) {

    const res = await fetch(url, {
        credentials: "include"
    });
    if (!res.ok) throw new Error(`Erreur API: ${url}`);
    return res.json();
}

function setSlotsDisabled(disabled) {

    const checkboxes = document.querySelectorAll("#matchDaysContainer input");
    checkboxes.forEach(cb => {
        cb.disabled = disabled;
        cb.parentElement.style.opacity = disabled ? "0.4" : "1";
    });
}

function resetSlots() {
    
    document.querySelectorAll("#matchDaysContainer input")
        .forEach(cb => cb.checked = false);
}

function applySlots(slots) {

    if (!slots || slots.length === 0) return;
    const checkboxes = document.querySelectorAll("#matchDaysContainer input");
    checkboxes.forEach(cb => cb.checked = false);
    slots.forEach(slot => {
        const cb = Array.from(checkboxes)
            .find(c => c.dataset.label === slot.label);
        if (cb) {
            cb.checked = slot.available;
        }
    });
}

const importForm = document.getElementById("importForm");

if (importForm) {
    importForm.addEventListener("submit", async (e) => {
        e.preventDefault(); // 🔥 empêche le reload

        const fileInput = document.getElementById("fileInput");
        const message = document.getElementById("importMessage");

        if (!fileInput.files.length) {
            message.textContent = "⚠️ Aucun fichier sélectionné";
            return;
        }

        const formData = new FormData();
        formData.append("file", fileInput.files[0]);

        try {
            const res = await fetch("/import-joueur", {
                method: "POST",
                body: formData,
                credentials: "include", // 🔥 CRUCIAL
            });

            if (!res.ok) {
                throw new Error("Erreur serveur: " + res.status);
            }

            const data = await res.json();

            message.textContent =
                data.message || data.error || "Import terminé";

        } catch (err) {
            console.error(err);
            message.textContent = "❌ Erreur import";
        }
    });
}

// Chargement data

async function loadData() {

    try {
        matchDays = await safeFetch("/match-days");
        const daySelect = document.getElementById("match_day_id");
        if (daySelect) {
            daySelect.innerHTML = "";
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const futureDays = matchDays.filter(day => {
                if (!day.date) return false;
                const d = new Date(day.date + "T00:00:00");
                return d >= today;
            });

            futureDays.sort((a, b) => new Date(a.date) - new Date(b.date));
            const nextDays = futureDays.slice(0, 2);
            nextDays.forEach(day => {
                const option = document.createElement("option");
                option.value = day.id;
                const formattedDate = day.date
                    ? day.date.split("-").reverse().join("/")
                    : "";
                option.text = `${day.code} - ${formattedDate}`;
                daySelect.appendChild(option);
            });
        }

        const container = document.getElementById("matchDaysContainer");

        if (container) {
            container.innerHTML = "";
            const slots = [
                { id: 1, label: "samedi_aprem" },
                { id: 2, label: "dimanche_matin" },
                { id: 3, label: "dimanche_aprem" }
            ];
            slots.forEach(slot => {
                const wrapper = document.createElement("div");
                wrapper.classList.add("slot-row");
                const label = document.createElement("label");
                label.textContent = slot.label
                    .replace("_", " ")
                    .replace("aprem", "après-midi");
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.value = slot.id;
                checkbox.dataset.label = slot.label;
                wrapper.appendChild(label);
                wrapper.appendChild(checkbox);
                container.appendChild(wrapper);
            });

            setSlotsDisabled(true); // 🔒 au départ
        }

    } catch (err) {
        console.error("Erreur loadData:", err);
    }
}

// Initialisation

document.addEventListener("DOMContentLoaded", () => {

    checkAdmin();
    loadData();

    setTimeout(() => {
        const input = document.getElementById("license");
        if (input) input.focus();
    }, 300);
    const daySelect = document.getElementById("match_day_id");
    if (daySelect) {
        daySelect.addEventListener("change", () => {
            if (!window.currentAvailability) return;
            const selectedDay = parseInt(daySelect.value);
            const dayData = window.currentAvailability.find(d =>
                String(d.match_day_id) === String(selectedDay)
            );
            if (dayData) {
                applySlots(dayData.slots);
            }
        });
    }

    const form = document.getElementById("form");
    if (form) {
        form.addEventListener("input", clearResult);
        form.addEventListener("submit", async function (e) {
            e.preventDefault();
            if (!playerValid) {
                alert("Licence invalide");
                return;
            }
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
                    license: document.getElementById("license").value.trim(),
                    match_day_id: selectedDay,
                    slots: slots
                };
                const response = await fetch("/availability", {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                document.getElementById("result").innerHTML = `
                    <div class="alert ${response.ok ? "alert-success" : "alert-danger"}">
                        ${result.error || result.message || "✔ Enregistré"}
                    </div>`;

            } catch (err) {
                console.error(err);
            }
        });
    }

    // Verification licence 

    const licenseInput = document.getElementById("license");

    if (licenseInput) {
        let timeout;
        licenseInput.addEventListener("focus", resetField);
        licenseInput.addEventListener("click", resetField);

        function resetField() {

            licenseInput.value = "";
            resetSlots();
            setSlotsDisabled(true);
            document.getElementById("player_name").textContent = "";
            document.getElementById("player_info").textContent = "";
            window.currentAvailability = null;
            playerValid = false;
        }

        // Saisie Licence

        licenseInput.addEventListener("input", () => {

            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                const license = licenseInput.value.trim(); 
                if (!/^[0-9]+$/.test(license)) {
                    playerValid = false;
                    return;
                }
                if (license.length < 6) return;

                // Reset avant le Fetch 
                setSlotsDisabled(true);
                resetSlots();
                window.currentAvailability = null;

                try {
                    const res = await fetch(`/player/${license}`, {
                        credentials: "include"
                    });
                    console.log("RESPONSE:", res); // 🔥 AJOUT
                    const data = await res.json();
                    const nameDiv = document.getElementById("player_name");
                    const infoDiv = document.getElementById("player_info");

                    if (data.name) {
                        nameDiv.textContent = data.name;
                        playerValid = true;

                        if (data.availability && data.availability.length > 0) {
                            infoDiv.textContent = "✔ Déjà enregistré (modifiable)";
                            window.currentAvailability = data.availability;
                            setSlotsDisabled(false); // 🔥 ACTIVE
                            const selectedDay = parseInt(
                                document.getElementById("match_day_id").value
                            );
                            const dayData = data.availability.find(d =>
                                parseInt(d.match_day_id) === selectedDay
                            );
                            if (dayData) {
                                applySlots(dayData.slots);
                            }
                        } else {
                            infoDiv.textContent = "🕒 Aucune saisie effectuée";
                            window.currentAvailability = null;
                            setSlotsDisabled(false); // 🔥 IMPORTANT → ACTIVER
                            console.log("ACTIVATION FORCÉE");
                            resetSlots(); // vide les cases
                        }
                    } else {
                        nameDiv.textContent = "";
                        infoDiv.textContent = "Licence inconnue";
                        playerValid = false;
                        setSlotsDisabled(true);
                    }
                } catch (err) {
                    console.error(err);
                }
            }, 300);
        });       
    }
});