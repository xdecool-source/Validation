// Gestion des Absences pour le TT Thuirinois

let matchDays = [];
let isAdmin = false;
let playerValid = false;
let isUpdatingUI = false;
let token = localStorage.getItem("token");

const SLOTS = [
    { label: "samedi_aprem" },
    { label: "dimanche_matin" },
    { label: "dimanche_aprem" },
    { label: "Absent" }
];

async function login(code) {
    // console.log("Token:", token);
    // console.log("Login Appélé");
    const payload = JSON.parse(atob(token.split(".")[1]));
    // console.log("Chargement:", payload);
    const license = document.getElementById("license").value.trim();
    if (!license) {
        alert("Entre ta licence");
        return;
    }
    // 1  vérifier le PIN
    const res = await fetch(`/check-access?code=${code}`);
    const data = await res.json();

    if (!data.ok) {
        alert("Code incorrect");
        return;
    }

    // 2 récupérer token AVEC licence
    const authRes = await fetch(`/auth-player?license=${license}`);
    const authData = await authRes.json();
    // console.log("Autorisation Status:", authRes.status);
    // console.log("Autorisation Données:", authData);
    token = authData.token;
    localStorage.setItem("token", token);
    await loadData();
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
    const slots = SLOTS; 
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

    document.querySelectorAll("#matchDaysContainer input[type=checkbox]").forEach(cb => {
        cb.addEventListener("change", () => {
            if (cb.dataset.label === "Absent" && cb.checked) {
                document.querySelectorAll("#matchDaysContainer input[type=checkbox]")
                    .forEach(other => {
                        if (other !== cb) other.checked = false;
                    });
            } else {
                const absent = document.querySelector(
                    '#matchDaysContainer input[data-label="Absent"]'
                );
                if (absent) absent.checked = false;
            }
        });
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
    if (!token) {
        alert("Tu dois te connecter");
        return;
    }
    const res = await fetch(url, {
        headers: { "Authorization": "Bearer " + token }
    });
    if (res.status === 403) {
        const data = await res.json();
        const message = data.detail || "Accès refusé";
        alert(message); // affiche "Token expiré"
        if (data.detail === "Token expiré") {
            alert("Votre session a expiré. Merci de vous reconnecter.");
            localStorage.removeItem("token");
            location.reload();
        }
        return;
}
    if (!res.ok) throw new Error(`Erreur API: ${url}`);
    return res.json();
}


function setSlotsDisabled(disabled) {

    const checkboxes = document.querySelectorAll("#matchDaysContainer input[type=checkbox]");
    const absent = document.querySelector('#matchDaysContainer input[data-label="Absent"]');
    checkboxes.forEach(cb => {
        cb.disabled = disabled;
        cb.parentElement.style.opacity = disabled ? "0.4" : "1";
    });
   
 }

function resetSlots() {

    document.querySelectorAll("#matchDaysContainer input[type=checkbox]")
    .forEach(cb => cb.checked = false);
    const absent = document.querySelector('#matchDaysContainer input[data-label="Absent"]');
    if (absent) absent.checked = false;
}

function applySlots(slots) {

    const checkboxes = document.querySelectorAll("#matchDaysContainer input[type=checkbox]");
    const absent = document.querySelector('#matchDaysContainer input[data-label="Absent"]');

    // reset
    checkboxes.forEach(cb => cb.checked = false);
    if (absent) absent.checked = false;
    const isAbsent = slots.find(s => s.label === "Absent" && s.available);
    if (isAbsent) {
        if (absent) absent.checked = true;
        return;
    }

    // sinon comportement normal
    slots.forEach(slot => {
        const cb = Array.from(checkboxes)
            .find(c => c.dataset.label === slot.label);

        if (cb) cb.checked = slot.available;
    });
}

// fonction pour verrouillage

function isLocked(day) {

    if (!day.date) return false;
    const now = new Date();
    const matchDate = new Date(day.date + "T00:00:00");
    const limitDate = new Date(matchDate);
    //  J-4
    limitDate.setDate(limitDate.getDate() - 4);
    //  heure fixe 14h
    limitDate.setHours(14, 0, 0, 0);
    return now >= limitDate;
}

// Affichage du jour de cloture 

function getClosureDate(day) {

    if (!day.date) return "";
    const matchDate = new Date(day.date + "T00:00:00");
    const limitDate = new Date(matchDate);
    //  J-4
    limitDate.setDate(limitDate.getDate() - 4);
    //  14h
    limitDate.setHours(14, 0, 0, 0);
    const d = String(limitDate.getDate()).padStart(2, "0");
    const m = String(limitDate.getMonth() + 1).padStart(2, "0");
    return ` ⏱${d}/${m} 
    `;
}

function updateClosureInfo() {

    const dayId = document.getElementById("match_day_id").value;
    const day = matchDays.find(d => d.id == dayId);
    if (!day) return;
    const closureDiv = document.getElementById("closureInfo");
    if (!closureDiv) return;
    const text = getClosureDate(day);
    const parts = text.split("⏱");
    const locked = isLocked(day);
    closureDiv.innerHTML = `
    <div class="${locked ? "closure-locked" : "closure-open"}">
        On clôture le ${parts[1]} à 14H00
    </div>
    `;
}

// Chargement

async function loadData() {
    try {
        matchDays = await safeFetch("/match-days");
        // console.log("MATCH DAYS BACKEND:", matchDays); 
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
            let nextDays = [];
            //  1. ajouter toutes les journées verrouillées
            matchDays.forEach(day => {
                if (isLocked(day)) {
                    nextDays.push(day);
                }
            });
            //  2. ajouter la première journée NON verrouillée
            for (let i = 0; i < futureDays.length; i++) {
                const day = futureDays[i];
                if (!isLocked(day)) {
                    nextDays.push(day);
                    break;
                }
            }

            nextDays.forEach(day => {
                const option = document.createElement("option");
                option.value = day.id;
                const formattedDate = day.date
                    ? day.date.split("-").reverse().join("/")
                    : "";
                // option.text = `${day.code} - ${formattedDate}`;
                option.text = `${day.code} - ${formattedDate}`;
                //  verrou mercredi 14h
                if (isLocked(day)) {
                    option.disabled = true;
                    option.text += " (verrouillé)";
                }
                daySelect.appendChild(option);
            });
            renderSlotsForSelectedDay();
        }

    } catch (err) {
        console.error(err);
    }
}

// Init

document.addEventListener("DOMContentLoaded", () => {

     checkAdmin();
    if (localStorage.getItem("token")) {
        loadData();
    }
    setTimeout(() => {
        updateClosureInfo(); // 
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
            updateClosureInfo(); 
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
            const checkboxes = Array.from(
                document.querySelectorAll("#matchDaysContainer input[type=checkbox]")
            );
            const absentChecked = checkboxes.find(
                cb => cb.dataset.label === "Absent" && cb.checked
            );
            // construire les slots
            const slots = checkboxes.map(cb => {
                if (absentChecked && cb.dataset.label !== "Absent") {
                    return {
                        label: cb.dataset.label,
                        available: false
                    };
                }
                return {
                    label: cb.dataset.label,
                    available: cb.checked
                };
            });

            // VALIDATION RÉELLE
            const hasRealSelection = slots.some(s => s.available === true);

            if (!hasRealSelection) {
                alert("Merci de sélectionner au moins un créneau ou 'Absent'");
                return;
            }

            try {
                const selectedDay = parseInt(
                    document.getElementById("match_day_id").value
                );
            const checkboxes = Array.from(
                document.querySelectorAll("#matchDaysContainer input[type=checkbox]")
            );
            const absentChecked = checkboxes.find(
                cb => cb.dataset.label === "Absent" && cb.checked
            );
            const slots = checkboxes.map(cb => {
                if (absentChecked && cb.dataset.label !== "Absent") {
                    return {
                        label: cb.dataset.label,
                        available: false
                    };
                }
                return {
                    label: cb.dataset.label,
                    available: cb.checked
                };
            });

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
            // reset du libelle enregistré ou etc...
            clearResult(); 
            document.getElementById("player_name").textContent = "";
            document.getElementById("player_info").textContent = "";
            document.getElementById("player_name").classList.remove("show");
            document.getElementById("player_info").classList.remove("show");
            window.currentAvailability = null;
            playerValid = false;
        }

        licenseInput.addEventListener("input", () => {
        clearTimeout(timeout);

        timeout = setTimeout(async () => {
        const license = licenseInput.value.trim();
        if (!/^[0-9]{6,}$/.test(license)) {
            playerValid = false;
            return;
        }

        resetSlots();
        setSlotsDisabled(true);
        window.currentAvailability = null;

        try {
            //console.log("=== START FLOW ===");
            // 1. récupérer token PIN (obligatoire)
            const pinToken = localStorage.getItem("token");

            if (!pinToken) {
                alert("Session perdue (PIN)");
                location.reload();
                return;
            }
            // console.log("PIN TOKEN:", pinToken);
            // 2. demander token joueur
            const authRes = await fetch(`/auth-player?license=${license}`, {
                headers: {
                    Authorization: "Bearer " + pinToken
                }
            });

            // console.log("Autorisation Statut:", authRes.status);

            if (!authRes.ok) {
                const err = await authRes.json();
                // console.log("AUTH ERROR:", err);

                // document.getElementById("player_info").textContent = "❌ Xavier Licence inconnue";
                document.getElementById("player_info").textContent = "❌ Veuillez vous reconnecter";
                document.getElementById("player_info").classList.add("show");
                playerValid = false;
                alert("Veuillez vous reconnecter");
                return;
            }

            const authData = await authRes.json();
            const playerToken = authData.token;

            if (!playerToken) {
                // console.log("Pas de token joueur");
                return;
            }

            // console.log("Token joueur:", playerToken);
            // IMPORTANT : on remplace le token
            localStorage.setItem("token", playerToken);

            // 3. appeler player avec BON token
            const res = await fetch(`/player/${license}`, {
                headers: {
                    Authorization: "Bearer " + playerToken
                }
            });

            // console.log("Statut joueur:", res.status);
            if (!res.ok) {
                // console.log("Erreur Joueur");
                playerValid = false;
                return;
            }
            const data = await res.json();
            // console.log("Donnée joueur:", data);
            const nameDiv = document.getElementById("player_name");
            const infoDiv = document.getElementById("player_info");
            if (!data.name) {
                infoDiv.textContent = "Licence inconnue";
                infoDiv.classList.add("show");
                playerValid = false;
                return;
            }

            // Ok
            nameDiv.textContent = data.name;
            nameDiv.classList.add("show");

            playerValid = true;

            renderSlotsForSelectedDay();
            setSlotsDisabled(false);

            // affichage
            setTimeout(() => {
                if (data.availability?.length > 0) {
                    infoDiv.textContent = "✔ Voici vos disponibilités";
                    infoDiv.classList.add("show");

                    window.currentAvailability = data.availability;
                    updateAvailabilityUI();
                } else {
                    infoDiv.textContent = "✔ Aucune saisie";
                    infoDiv.classList.add("show");
                }
            }, 50);

        } catch (err) {
            console.error("ERROR:", err);
        }

    }, 300);
});

}
 });

function updateAvailabilityUI() {

    if (isUpdatingUI) return;
    isUpdatingUI = true;
    const checkboxes = document.querySelectorAll("#matchDaysContainer input[type=checkbox]");
    // reset systématique
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
    } else {
        resetSlots();
    }
    isUpdatingUI = false;
}