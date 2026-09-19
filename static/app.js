// app.js - Etat global, configuration, authentification, commun

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


async function wakeDatabase() {

    try {
        await fetch("/ping", {
            method: "GET",
            cache: "no-store"
        });
        console.log(" Base de données réveillée");
    } catch (err) {
        console.warn(" Réveil de la base impossible :", err);
    }
}

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

    const currentToken = localStorage.getItem("token");
    if (!currentToken) return;
    try {
        const payload = JSON.parse(atob(currentToken.split(".")[1]));
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

    const currentToken = localStorage.getItem("token");
    if (!currentToken) {
        alert("Tu dois te connecter");
        return null;
    }
    const res = await fetch(url, {
        headers: {
            "Authorization": "Bearer " + currentToken
        }
    });
    if (res.status === 403) {
        const data = await res.json();
        const message = data.detail || "Accès refusé";
        alert(message);
        if (data.detail === "Token expiré") {
            alert("Votre session a expiré. Merci de vous reconnecter.");
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
        if (cb.parentElement) {
            cb.parentElement.style.opacity = disabled ? "0.4" : "1";
        }
    });
}

// Configuration.
// Ces valeurs restent dans app.js comme dans ton fichier actuel.

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

// Initialisation générale.
// Admin.js possède sa propre initialisation pour l'écran admin.
// Ici on initialise le joueur.

document.addEventListener("DOMContentLoaded", async () => {
    document.body.style.visibility = "hidden";
    checkAdmin();

    // Une session admin utilise l'initialisation de admin.js.
    if (!isAdmin) {
        await wakeDatabase();
        await initAvailability();
    }
    document.body.style.visibility = "visible";
    const licenseInput = document.getElementById("license");
    if (licenseInput) {
        licenseInput.focus();
    }
});
