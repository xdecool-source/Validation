let matchDays = [];
let isAdmin = false;
let playerValid = false;
let isUpdatingUI = false;
let token = localStorage.getItem("token");

const SLOTS = [
    { label: "samedi_aprem" },
    { label: "dimanche_matin" },
    { label: "dimanche_aprem" }
];

async function login(code) {
    const res = await fetch(`/check-access?code=${code}`);
    const data = await res.json();

    if (data.ok) {
        token = data.token;
        localStorage.setItem("token", token);
    } else {
        alert("Code incorrect");
    }
}

function checkAdmin() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const payload = JSON.parse(atob(token.split(".")[1]));

        if (payload.role === "admin") {
            isAdmin = true;

            const importForm = document.getElementById("importForm");
            if (importForm) importForm.style.display = "block";

            const importMessage = document.getElementById("importMessage");
            if (importMessage) importMessage.style.display = "block";
        }
    } catch (err) {
        console.error("Erreur token:", err);
    }
}

//  génération des slots

function getSlotsFromDate(dateStr) {
    const date = new Date(dateStr + "T00:00:00");
    const day = date.getDay(); // 6 = samedi, 0 = dimanche

    if (day === 6) {
        return [{ label: "samedi_aprem" }];
    }

    if (day === 0) {
        return [
            { label: "dimanche_matin" },
            { label: "dimanche_aprem" }
        ];
    }

    return [];
}

//  render dynamique

function renderSlotsForSelectedDay() {
    const container = document.getElementById("matchDaysContainer");
    const daySelect = document.getElementById("match_day_id");

    if (!container || !daySelect) return;

    const slots = SLOTS; // 🔥 ici

    container.innerHTML = "";

    slots.forEach(slot => {
        const wrapper = document.createElement("div");
        wrapper.classList.add("slot-row");

        const label = document.createElement("label");
        label.textContent = slot.label
            .replace("_", " ")
            .replace("aprem", "après-midi");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.dataset.label = slot.label;

        wrapper.appendChild(label);
        wrapper.appendChild(checkbox);
        container.appendChild(wrapper);
    });

    setSlotsDisabled(!playerValid);
}
// Utilitaires

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
    const token = localStorage.getItem("token");
    if (!token) throw new Error("Pas de token !");

    const res = await fetch(url, {
        headers: { "Authorization": "Bearer " + token }
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
    const checkboxes = document.querySelectorAll("#matchDaysContainer input");

    slots.forEach(slot => {
        const cb = Array.from(checkboxes)
            .find(c => c.dataset.label === slot.label);

        if (cb) cb.checked = slot.available;
    });
}

// Chargement

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

                //  verrou J-3
                if (day.date) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    const matchDate = new Date(day.date + "T00:00:00");
                    const limitDate = new Date(matchDate);
                    limitDate.setDate(limitDate.getDate() - 3);

                    if (today >= limitDate) {
                        option.disabled = true;
                        option.text += " (verrouillé)";
                    }
                }

                daySelect.appendChild(option);
            });

            // IMPORTANT : render initial
            renderSlotsForSelectedDay();
        }

    } catch (err) {}
}

// Init

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
            renderSlotsForSelectedDay();

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
                ).map(cb => ({
                    label: cb.dataset.label,
                    available: cb.checked
                }));

                const data = {
                    license: document.getElementById("license").value.trim(),
                    match_day_id: selectedDay,
                    slots: slots
                };

                const response = await fetch("/availability", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("token")}`
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                document.getElementById("result").innerHTML = `
                    <div class="result-success">
                        ✔ ${result.success || "Enregistré"}
                    </div>
                `;

            } catch (err) {}
        });
    }

    // Licence

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

        licenseInput.addEventListener("input", () => {
            clearTimeout(timeout);

            timeout = setTimeout(async () => {
                const license = licenseInput.value.trim();

                if (!/^[0-9]+$/.test(license)) {
                    playerValid = false;
                    return;
                }

                if (license.length < 6) return;

                setSlotsDisabled(true);
                window.currentAvailability = null;

                try {
                    const token = localStorage.getItem("token");

                    const res = await fetch(`/player/${license}`, {
                        headers: {
                            "Authorization": "Bearer " + token
                        }
                    });

                    const data = await res.json();

                    const nameDiv = document.getElementById("player_name");
                    const infoDiv = document.getElementById("player_info");

                    if (data.name) {
                        nameDiv.textContent = data.name;
                        playerValid = true;

                        renderSlotsForSelectedDay();

                        if (data.availability && data.availability.length > 0) {
                            infoDiv.innerHTML = `
                                <div class="player-info">
                                    ✔ Déjà enregistré
                                </div>
                            `;
                            window.currentAvailability = data.availability;
                            setSlotsDisabled(false);
                            updateAvailabilityUI();
                        } else {
                            infoDiv.innerHTML = `
                                <div class="player-info">
                                    ✔ Aucune saisie effectuée
                                </div> 
                            `;                        
                            window.currentAvailability = null;

                            setSlotsDisabled(false);
                            updateAvailabilityUI();
                        }
                    } else {
                        nameDiv.textContent = "";
                        infoDiv.innerHTML = `
                                <div class="player-info">
                                    ✔ Licence inconnue
                                </div> 
                            `;
                        playerValid = false;
                        setSlotsDisabled(true);
                    }

                } catch (err) {}
            }, 300);
        });
    }
});

function updateAvailabilityUI() {
    if (isUpdatingUI) return;

    isUpdatingUI = true;

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