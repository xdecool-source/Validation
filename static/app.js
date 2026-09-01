
// Gestion des Absences pour le TT Thuirinois
// Connecte les joueurs avec licence + PIN
// Gére les tokens JWT côté navigateur
// Affiche les journées de match
// Affiche les créneaux disponibles
// Charge les disponibilités déjà enregistrées
// Envoye les nouvelles disponibilités au backend
// Verrouille les journées après la date limite
// Gére les droits admin
// Maj dynamiquement l’interface HTML

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

    try {
        await fetch("/ping");
    } catch (e) {
        console.log("Ping impossible", e);
    }
    const license = document.getElementById("license").value.trim();
    if (!license) {
        alert("Entre ta licence");
        return;
    }
    const res = await fetch(`/check-access?code=${code}`);
    const data = await res.json();
    if (!data.ok) {
        alert("Code incorrect");
        return;
    }
    const authRes = await fetch(`/auth-player?license=${license}`);
    const authData = await authRes.json();
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
            if (importForm) {
                importForm.style.display = "block";
            }

            const importMessage =
                document.getElementById("importMessage");

            if (importMessage) {
                importMessage.style.display = "block";
            }
        }
    } catch (err) {
        console.error("Erreur token:", err);
    }
}

// Génération des slots

function getSlotsFromDate(dateStr) {

    const date = new Date(dateStr + "T00:00:00");
    const day = date.getDay();
    // 6 = samedi
    if (day === 6) {
        return [{ label: "samedi_aprem" }];
    }
    // 0 = dimanche
    if (day === 0) {
        return [
            { label: "dimanche_matin" },
            { label: "dimanche_aprem" }
        ];
    }
    return [];
}

// Render dynamique
function renderSlotsForSelectedDay() {

    const container =
        document.getElementById("matchDaysContainer");
    const daySelect =
        document.getElementById("match_day_id");
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

    document
        .querySelectorAll(
            "#matchDaysContainer input[type=checkbox]"
        )
        .forEach(cb => {
            cb.addEventListener("change", () => {
                if (
                    cb.dataset.label === "Absent" &&
                    cb.checked
                ) {
                    document
                        .querySelectorAll(
                            "#matchDaysContainer input[type=checkbox]"
                        )
                        .forEach(other => {
                            if (other !== cb) {
                                other.checked = false;
                            }
                        });
                } else {
                    const absent =
                        document.querySelector(
                            '#matchDaysContainer input[data-label="Absent"]'
                        );

                    if (absent) {
                        absent.checked = false;
                    }
                }
            });
        });

    setSlotsDisabled(!playerValid);
}

// Utilitaires

function resetUI() {

    const nameDiv =
        document.getElementById("player_name");
    const infoDiv =
        document.getElementById("player_info");
    if (nameDiv) {
        nameDiv.textContent = "";
    }
    if (infoDiv) {
        infoDiv.textContent = "";
    }
    playerValid = false;
    window.currentAvailability = null;
    setSlotsDisabled(true);
    resetSlots();
}

function clearResult() {

    const result =
        document.getElementById("result");
    if (result) {
        result.innerHTML = "";
    }
}

async function safeFetch(url) {

    const token =
        localStorage.getItem("token");
    if (!token) {
        alert("Tu dois te connecter");
        return null;
    }
    const res = await fetch(url, {
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    if (res.status === 403) {
        const data = await res.json();
        const message =
            data.detail || "Accès refusé";
        alert(message);
        if (data.detail === "Token expiré") {
            alert(
                "Votre session a expiré. Merci de vous reconnecter."
            );
            localStorage.removeItem("token");
            location.reload();
        }
        return null;
    }
    if (!res.ok) {
        throw new Error(`Erreur API: ${url}`);
    }
    return res.json();
}

function setSlotsDisabled(disabled) {

    const checkboxes =
        document.querySelectorAll(
            "#matchDaysContainer input[type=checkbox]"
        );
    checkboxes.forEach(cb => {
        cb.disabled = disabled;
        cb.parentElement.style.opacity =
            disabled ? "0.4" : "1";
    });
}

function resetSlots() {

    document
        .querySelectorAll(
            "#matchDaysContainer input[type=checkbox]"
        )
        .forEach(cb => {
            cb.checked = false;
        });
}

function applySlots(slots) {

    const checkboxes =
        document.querySelectorAll(
            "#matchDaysContainer input[type=checkbox]"
        );
    const absent =
        document.querySelector(
            '#matchDaysContainer input[data-label="Absent"]'
        );
    // Reset
    checkboxes.forEach(cb => {
        cb.checked = false;
    });
    if (absent) {
        absent.checked = false;
    }
    const isAbsent =
        slots.find(
            s =>
                s.label === "Absent" &&
                s.available
        );
    if (isAbsent) {
        if (absent) {
            absent.checked = true;
        }
        return;
    }
    slots.forEach(slot => {
        const cb = Array
            .from(checkboxes)
            .find(
                c =>
                    c.dataset.label === slot.label
            );
        if (cb) {
            cb.checked = slot.available;
        }
    });
}

// configuration
const MAX_AFFICHE_JOUR_VALIDE = Number(
    document.body.dataset.maxAffiche
);
const DATE_LIMITE = Number(
    document.body.dataset.dateLimite
);
console.log(
    "CONFIG :",
    MAX_AFFICHE_JOUR_VALIDE,
    DATE_LIMITE
);
console.log(
    "DATE_LIMITE valide ?",
    Number.isFinite(DATE_LIMITE)
);

// verrouillage

function getClosureLimitDate(day) {

    if (!day || !day.date) {
        return null;
    }
    const matchDate =
        new Date(day.date + "T00:00:00");
    if (Number.isNaN(matchDate.getTime())) {
        console.error(
            "Date championnat invalide :",
            day.date
        );
        return null;
    }
    if (!Number.isFinite(DATE_LIMITE)) {
        console.error(
            "DATE_LIMITE invalide :",
            DATE_LIMITE
        );
        return null;
    }
    const limitDate =
        new Date(matchDate);
    limitDate.setDate(
        limitDate.getDate() - DATE_LIMITE
    );
    // Clôture à 14h00
    limitDate.setHours(
        14,0,0,0
    );
    return limitDate;
}

function isLocked(day) {

    const limitDate =
        getClosureLimitDate(day);

    if (!limitDate) {
        return false;
    }
    return new Date() >= limitDate;
}

function getClosureDate(day) {

    const limitDate =
        getClosureLimitDate(day);

    if (!limitDate) {
        return "";
    }
    const d =
        String(limitDate.getDate())
            .padStart(2, "0");
    const m =
        String(limitDate.getMonth() + 1)
            .padStart(2, "0");
    return `${d}/${m}`;
}

function updateClosureInfo() {

    const daySelect =
        document.getElementById(
            "match_day_id"
        );
    const closureDiv =
        document.getElementById(
            "closureInfo"
        );
    if (!daySelect || !closureDiv) {
        return;
    }
    const dayId = daySelect.value;
    const day =
        matchDays.find(
            d => String(d.id) === String(dayId)
        );
    if (!day) {
        closureDiv.innerHTML = "";
        return;
    }
    const closureDate =
        getClosureDate(day);

    if (!closureDate) {
        closureDiv.innerHTML = "";
        return;
    }
    const locked =
        isLocked(day);
    closureDiv.innerHTML = `
        <div class="${
            locked
                ? "closure-locked"
                : "closure-open"
        }">
            On clôture le ${closureDate} à 14H00
        </div>
    `;
}

// chargement des journées

async function loadData() {

    try {
        const data =
            await safeFetch("/match-days");
        if (!data) {
            return;
        }
        matchDays = data;
        const daySelect =
            document.getElementById(
                "match_day_id"
            );
        if (!daySelect) {
            return;
        }
        daySelect.innerHTML = "";
        const today =
            new Date();
        today.setHours(
            0,0,0,0
        );
        const futureDays =
            matchDays
                .filter(day => {
                    if (!day.date) {
                        return false;
                    }
                    const date =
                        new Date(
                            day.date +
                            "T00:00:00"
                        );

                    return date >= today;
                })
                .sort(
                    (a, b) =>
                        new Date(a.date) -
                        new Date(b.date)
                );

        const nextDays = [];
        
        // Journées verrouillées
        matchDays.forEach(day => {
            if (isLocked(day)) {
                nextDays.push(day);
            }
        });
        // Nombre de journées ouvertes
        let added = 0;
        for (
            let i = 0;
            i < futureDays.length;
            i++
        ) {
            const day =
                futureDays[i];
            if (!isLocked(day)) {
                // Évite les doublons
                if (
                    !nextDays.some(
                        d => d.id === day.id
                    )
                ) {
                    nextDays.push(day);
                    added++;
                }

                if (
                    added >=
                    MAX_AFFICHE_JOUR_VALIDE
                ) {
                    break;
                }
            }
        }

        nextDays.forEach(day => {
            const option =
                document.createElement(
                    "option"
                );
            option.value =
                day.id;
            const formattedDate =
                day.date
                    ? day.date
                        .split("-")
                        .reverse()
                        .join("/")
                    : "";
            option.text =
                `${day.code} - ${formattedDate}`;

            if (isLocked(day)) {
                option.disabled = true;

                option.text +=
                    " (verrouillé)";
            }
            daySelect.appendChild(
                option
            );
        });
        renderSlotsForSelectedDay();
        updateClosureInfo();
    } catch (err) {
        console.error(
            "Erreur chargement :",
            err
        );
    }
}


// initialisation

document.addEventListener(

    "DOMContentLoaded",
    async () => {
        document.body.style.visibility =
            "hidden";
        checkAdmin();
        const licenseInput =
            document.getElementById(
                "license"
            );
        if (licenseInput) {
            licenseInput.value = "";
        }
        const playerName =
            document.getElementById(
                "player_name"
            );
        const playerInfo =
            document.getElementById(
                "player_info"
            );
        if (playerName) {
            playerName.textContent = "";
        }
        if (playerInfo) {
            playerInfo.textContent = "";
        }
        if (
            localStorage.getItem("token")
        ) {
            await loadData();
        }
        document.body.style.visibility =
            "visible";

        if (licenseInput) {
            licenseInput.focus();
        }
        const daySelect =
            document.getElementById(
                "match_day_id"
            );
        if (daySelect) {
            daySelect.addEventListener(
                "change",
                () => {
                    renderSlotsForSelectedDay();
                    if (
                        window.currentAvailability
                    ) {
                        updateAvailabilityUI();
                    }
                    updateClosureInfo();
                }
            );
        }

        const form =
            document.getElementById(
                "form"
            );
        if (form) {
            form.addEventListener(
                "input",
                clearResult
            );
            form.addEventListener(
                "submit",
                async function (e) {
                    e.preventDefault();
                    if (!playerValid) {
                        alert(
                            "Licence invalide"
                        );
                        return;
                    }
                    const selectedDay =
                        parseInt(
                            document
                                .getElementById(
                                    "match_day_id"
                                )
                                .value,
                            10
                        );

                    if (
                        Number.isNaN(
                            selectedDay
                        )
                    ) {
                        alert(
                            "Merci de sélectionner une journée"
                        );

                        return;
                    }
                    // Récupération des cases
                    const checkboxes =
                        Array.from(
                            document.querySelectorAll(
                                "#matchDaysContainer input[type=checkbox]"
                            )
                        );

                    const absentChecked =
                        checkboxes.find(
                            cb =>
                                cb.dataset.label ===
                                    "Absent" &&
                                cb.checked
                        );

                    // Construction des slots
                    const slots =
                        checkboxes.map(
                            cb => {
                                if (
                                    absentChecked &&
                                    cb.dataset.label !==
                                        "Absent"
                                ) {
                                    return {
                                        label:
                                            cb.dataset.label,
                                        available:
                                            false
                                    };
                                }

                                return {
                                    label:
                                        cb.dataset.label,
                                    available:
                                        cb.checked
                                };
                            }
                        );

                    // Vérification :
                    // au moins une disponibilité
                    const hasRealSelection =
                        slots.some(
                            slot =>
                                slot.available ===
                                true
                        );

                    if (
                        !hasRealSelection
                    ) {
                        alert(
                            "Merci de sélectionner au moins un créneau ou 'Absent'"
                        );
                        return;
                    }
                    try {
                        const data = {
                            license:
                                document
                                    .getElementById(
                                        "license"
                                    )
                                    .value
                                    .trim(),

                            match_day_id:
                                selectedDay,

                            slots:
                                slots
                        };
                        const response =
                            await fetch(
                                "/availability",
                                {
                                    method:
                                        "POST",

                                    headers: {
                                        "Content-Type":
                                            "application/json",
                                        "Authorization":
                                            `Bearer ${
                                                localStorage.getItem(
                                                    "token"
                                                )
                                            }`
                                    },

                                    body:
                                        JSON.stringify(
                                            data
                                        )
                                }
                            );

                        const result =
                            await response.json();

                        if (
                            !response.ok
                        ) {
                            throw new Error(
                                result.detail ||
                                "Erreur d'enregistrement"
                            );
                        }
                        document
                            .getElementById(
                                "result"
                            )
                            .innerHTML = `
                                <div class="result-success">
                                    ✔ ${
                                        result.success ||
                                        "Enregistré"
                                    }
                                </div>
                            `;

                    } catch (err) {
                        console.error(
                            "Erreur enregistrement :",
                            err
                        );
                        document
                            .getElementById(
                                "result"
                            )
                            .innerHTML = `
                                <div class="result-error">
                                    ❌ ${
                                        err.message ||
                                        "Erreur lors de l'enregistrement"
                                    }
                                </div>
                            `;
                    }
                }
            );
        }

        // gestion de la licence

        if (licenseInput) {
            let timeout;
            licenseInput.addEventListener(
                "focus",
                resetField
            );
            licenseInput.addEventListener(
                "click",
                resetField
            );

            function resetField() {

                licenseInput.value = "";
                resetSlots();
                setSlotsDisabled(
                    true
                );
                clearResult();
                const nameDiv =
                    document.getElementById(
                        "player_name"
                    );
                const infoDiv =
                    document.getElementById(
                        "player_info"
                    );
                if (nameDiv) {
                    nameDiv.textContent =
                        "";

                    nameDiv.classList.remove(
                        "show"
                    );
                }
                if (infoDiv) {
                    infoDiv.textContent =
                        "";

                    infoDiv.classList.remove(
                        "show"
                    );
                }
                window.currentAvailability =
                    null;

                playerValid = false;
            }
            licenseInput.addEventListener(
                "input",
                () => {
                    clearTimeout(
                        timeout
                    );
                    timeout =
                        setTimeout(
                            async () => {
                                const license =
                                    licenseInput
                                        .value
                                        .trim();

                                if (
                                    !/^[0-9]{6,}$/
                                        .test(
                                            license
                                        )
                                ) {
                                    playerValid =
                                        false;

                                    return;
                                }
                                resetSlots();
                                setSlotsDisabled(
                                    true
                                );
                                window.currentAvailability =
                                    null;
                                try {
                                    // 1. Token PIN
                                    const pinToken =
                                        localStorage.getItem(
                                            "token"
                                        );
                                    if (
                                        !pinToken
                                    ) {
                                        alert(
                                            "Session perdue (PIN)"
                                        );
                                        location.reload();
                                        return;
                                    }

                                    // 2. Authentification joueur
                                    const authRes =
                                        await fetch(
                                            `/auth-player?license=${license}`,
                                            {
                                                headers: {
                                                    Authorization:
                                                        "Bearer " +
                                                        pinToken
                                                }
                                            }
                                        );

                                    if (
                                        !authRes.ok
                                    ) {
                                        const err =
                                            await authRes.json();

                                        console.error(
                                            "AUTH ERROR:",
                                            err
                                        );
                                        const infoDiv =
                                            document.getElementById(
                                                "player_info"
                                            );
                                        if (
                                            infoDiv
                                        ) {
                                            infoDiv.textContent =
                                                "❌ Veuillez vous reconnecter";
                                            infoDiv.classList.add(
                                                "show"
                                            );
                                        }

                                        playerValid =
                                            false;
                                        alert(
                                            "Veuillez vous reconnecter ou Absence de joueur"
                                        );

                                        return;
                                    }

                                    const authData =
                                        await authRes.json();
                                    const playerToken =
                                        authData.token;
                                    if (
                                        !playerToken
                                    ) {
                                        playerValid =
                                            false;
                                        return;
                                    }

                                    // Le token joueur remplace
                                    // le token précédent
                                    localStorage.setItem(
                                        "token",
                                        playerToken
                                    );

                                    // 3. Récupération joueur
                                    const res =
                                        await fetch(
                                            `/player/${license}`,
                                            {
                                                headers: {
                                                    Authorization:
                                                        "Bearer " +
                                                        playerToken
                                                }
                                            }
                                        );

                                    if (
                                        !res.ok
                                    ) {
                                        playerValid =
                                            false;
                                        return;
                                    }

                                    const data =
                                        await res.json();
                                    const nameDiv =
                                        document.getElementById(
                                            "player_name"
                                        );

                                    const infoDiv =
                                        document.getElementById(
                                            "player_info"
                                        );
                                    if (
                                        !data.name
                                    ) {
                                        if (
                                            infoDiv
                                        ) {
                                            infoDiv.textContent =
                                                "Licence inconnue";

                                            infoDiv.classList.add(
                                                "show"
                                            );
                                        }

                                        playerValid =
                                            false;
                                        return;
                                    }

                                    // Joueur valide
                                    if (
                                        nameDiv
                                    ) {
                                        nameDiv.textContent =
                                            data.name;
                                        nameDiv.classList.add(
                                            "show"
                                        );
                                    }

                                    playerValid =
                                        true;
                                    renderSlotsForSelectedDay();
                                    setSlotsDisabled(
                                        false
                                    );
                                    setTimeout(
                                        () => {
                                            if (
                                                data.availability
                                                    ?.length > 0
                                            ) {
                                                if (
                                                    infoDiv
                                                ) {
                                                    infoDiv.textContent =
                                                        "✔ Voici vos disponibilités";

                                                    infoDiv.classList.add(
                                                        "show"
                                                    );
                                                }

                                                window.currentAvailability =
                                                    data.availability;
                                                updateAvailabilityUI();

                                            } else {
                                                if (
                                                    infoDiv
                                                ) {
                                                    infoDiv.textContent =
                                                        "✔ Aucune saisie";
                                                    infoDiv.classList.add(
                                                        "show"
                                                    );
                                                }
                                            }
                                        },
                                        50
                                    );

                                } catch (err) {
                                    console.error(
                                        "ERROR:",
                                        err
                                    );
                                }
                            },
                            300
                        );
                }
            );
        }
    }
);

// mise à jour des disponibilités

function updateAvailabilityUI() {

    if (isUpdatingUI) {
        return;
    }
    isUpdatingUI = true;

    const checkboxes =
        document.querySelectorAll(
            "#matchDaysContainer input[type=checkbox]"
        );

    // Reset systématique
    checkboxes.forEach(cb => {
        cb.checked = false;
    });

    if (
        !window.currentAvailability
    ) {
        isUpdatingUI = false;
        return;
    }
    const selectedDay =
        parseInt(
            document
                .getElementById(
                    "match_day_id"
                )
                .value,
            10
        );
    const dayData =
        window.currentAvailability.find(
            d =>
                parseInt(
                    d.match_day_id,
                    10
                ) === selectedDay
        );
    if (
        dayData &&
        dayData.slots
    ) {
        applySlots(
            dayData.slots
        );
    } else {
        resetSlots();
    }

    isUpdatingUI = false;
}

