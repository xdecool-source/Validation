let matchDays = [];
let isAdmin = false;
let playerValid = false;
let isUpdatingUI = false;

// Mode Admin

let token = localStorage.getItem("token");



async function login(code) {
    const res = await fetch(`/check-access?code=${code}`);
    const data = await res.json();

    console.log("LOGIN RESPONSE:", data);

    if (data.ok) {
        token = data.token;

        // 🔥 STOCKAGE
        localStorage.setItem("token", token);

        console.log("TOKEN STOCKÉ:", localStorage.getItem("token")); // 🔥 IMPORTANT
    } else {
        alert("Code incorrect");
    }
}
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
    console.log("SLOTS BACKEND:", slots);

    const checkboxes = document.querySelectorAll("#matchDaysContainer input");

    checkboxes.forEach(cb => {
        console.log("CHECKBOX LABEL:", cb.dataset.label);
    });

    slots.forEach(slot => {
        console.log("SLOT LABEL:", slot.label);
        console.log("TYPE AVAILABLE:", typeof slot.available, slot.available);
        const cb = Array.from(checkboxes)
            .find(c => c.dataset.label === slot.label);

        console.log("MATCH FOUND:", cb);

        if (cb) {
            cb.checked = slot.available;
        }
    });
    console.log("AFTER APPLY:", Array.from(checkboxes).map(cb => cb.checked));
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
            // 🔥 ne fait quelque chose QUE si on a des données
            if (window.currentAvailability) {
                updateAvailabilityUI();
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
                )
                .map(cb => ({
                    label: cb.dataset.label,
                    available: cb.checked
                }));
                const data = {
                    license: document.getElementById("license").value.trim(),
                    match_day_id: selectedDay,
                    slots: slots
                };
                // 🔥 ICI (IMPORTANT)
                console.log("TOKEN AVANT ENVOI:", token);
                const response = await fetch("/availability", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("token")}`                    },
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
                // xxx resetSlots();
                window.currentAvailability = null;

                try {
                    const res = await fetch(`/player/${license}`, {
                        credentials: "include"
                    });
                    console.log("RESPONSE:", res); // 🔥 AJOUT
                    const data = await res.json();
                    console.log("DATA BACKEND:", data);
                    const nameDiv = document.getElementById("player_name");
                    const infoDiv = document.getElementById("player_info");

                    if (data.name) {
                        nameDiv.textContent = data.name;
                        playerValid = true;

                        if (data.availability && data.availability.length > 0) {
                            infoDiv.textContent = "✔ Déjà enregistré (modifiable)";
                            window.currentAvailability = data.availability;
                            // xxx
                            setTimeout(() => {
                                updateAvailabilityUI();
                            }, 0);
                            setSlotsDisabled(false); // 🔥 ACTIVE
                            updateAvailabilityUI(); // 🔥 CLEAN
                            const selectedDay = parseInt(
                                document.getElementById("match_day_id").value
                            );
                            const dayData = data.availability.find(d =>
                                parseInt(d.match_day_id) === selectedDay
                            );

                        } else {
                            infoDiv.textContent = "🕒 Aucune saisie effectuée";
                            window.currentAvailability = null;
                            setSlotsDisabled(false); // 🔥 IMPORTANT → ACTIVER
                            console.log("ACTIVATION FORCÉE");
                            updateAvailabilityUI(); // 🔥 CLEAN
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

function displayAvailability(slots) {
    const infoDiv = document.getElementById("player_info");

    if (!slots || slots.length === 0) {
        infoDiv.textContent = "🕒 Aucune saisie effectuée";
        return;
    }

    const text = slots.map(slot => {
        const label = slot.label
            .replace("_", " ")
            .replace("aprem", "après-midi");

        return `${label} : ${slot.available ? "✅ disponible" : "❌ indisponible"}`;
    });

    infoDiv.innerHTML = text.join("<br>");
}

function updateAvailabilityUI() {
    if (isUpdatingUI) return; // 🔥 bloque double appel
    isUpdatingUI = true;

    console.log("CURRENT AVAILABILITY:", window.currentAvailability);

    const checkboxes = document.querySelectorAll("#matchDaysContainer input");

    checkboxes.forEach(cb => cb.checked = false);

    if (!window.currentAvailability) {
        isUpdatingUI = false;
        return;
    }

    const selectedDay = parseInt(
        document.getElementById("match_day_id").value
    );

    const dayData = window.currentAvailability.find(d =>
        parseInt(d.match_day_id) === selectedDay
    );

    if (dayData && dayData.slots) {
        applySlots(dayData.slots);
    }

    isUpdatingUI = false;
}