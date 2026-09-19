// disponibilites.js - licence, formulaire et disponibilités
// Couleur rouge si journée non selectionnée

function updateDaySelectColor() {

    const daySelect =
        document.getElementById("match_day_id");
    if (!daySelect) return;
    const selectedDay =
        parseInt(daySelect.value, 10);
    // Pas de journée sélectionnée
    if (Number.isNaN(selectedDay)) {
        daySelect.classList.remove("day-selected");
        daySelect.classList.add("no-day-selected");
        return;
    }
    // Recherche les disponibilités de cette journée

    const dayData =
        window.currentAvailability?.find(
            d =>
                parseInt(d.match_day_id, 10) === selectedDay
        );
    // Vérifie si AU MOINS une valeur est sélectionnée

    const hasSelection =
        dayData?.slots?.some(
            slot => slot.available === true
        ) === true;
    if (hasSelection) {
        // Journée renseignée → couleur normale
        daySelect.classList.remove("no-day-selected");
        daySelect.classList.add("day-selected");
    } else {
        // Journée non renseignée → rouge
        daySelect.classList.add("no-day-selected");
        daySelect.classList.remove("day-selected");
    }
}

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
    if (!window.currentAvailability) {
        isUpdatingUI = false;
        return;
    }
    const selectedDay =
        parseInt(
            document
                .getElementById("match_day_id")
                .value,
            10
        );
    const dayData =
        window.currentAvailability.find(
            d =>
                parseInt(d.match_day_id, 10) === selectedDay
        );
    if (
        dayData &&
        dayData.slots
    ) {
        applySlots(dayData.slots);
    } else {
        resetSlots();
    }
    // Mise à jour de la couleur du nom

    updatePlayerNameColor();
    isUpdatingUI = false;
}
function updatePlayerNameColor() {

    const nameDiv = document.getElementById("player_name");
    const statusDiv = document.getElementById("availability_status");
    if (!nameDiv) return;
    if (!window.currentAvailability) {
        nameDiv.classList.add("no-availability");
        nameDiv.classList.remove("has-availability");
        if (statusDiv) {
            statusDiv.textContent = "Journée non saisie";
        }
        return;
    }
    const displayedDays =
        Array.from(document.querySelectorAll("#match_day_id option"))
        .filter(option => option.value)
        .map(option => parseInt(option.value, 10));
    const hasMissingDay =
        displayedDays.some(dayId => {
            const dayData = window.currentAvailability.find(
                d => parseInt(d.match_day_id, 10) === dayId
            );
            return !dayData ||
                   !dayData.slots ||
                   !dayData.slots.some(slot => slot.available === true);
        });
    if (hasMissingDay) {
        nameDiv.classList.add("no-availability");
        nameDiv.classList.remove("has-availability");
        if (statusDiv) {
            statusDiv.textContent = "Au moins une Journée non saisie";
        }
    } else {
        nameDiv.classList.remove("no-availability");
        nameDiv.classList.add("has-availability");
        if (statusDiv) {
            statusDiv.textContent = "";
        }
    }
}
async function initAvailability() {
    
    const licenseInput = document.getElementById("license");
    if (licenseInput) {
        licenseInput.value = "";
    }
    const playerName = document.getElementById("player_name");
    const playerInfo = document.getElementById("player_info");
    if (playerName) playerName.textContent = "";
    if (playerInfo) playerInfo.textContent = "";
    if (localStorage.getItem("token")) {
        await loadData();
    }
    const daySelect = document.getElementById("match_day_id");
    if (daySelect) {
        daySelect.addEventListener("change", () => {
            updateDaySelectColor();
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
            const selectedDay = parseInt(
                document.getElementById("match_day_id").value,
                10
            );
            if (Number.isNaN(selectedDay)) {
                alert("Merci de sélectionner une journée");
                return;
            }
            const checkboxes = Array.from(
                document.querySelectorAll(
                    "#matchDaysContainer input[type=checkbox]"
                )
            );
            const absentChecked = checkboxes.find(
                cb =>
                    cb.dataset.label === "Absent" &&
                    cb.checked
            );
            const slots = checkboxes.map(cb => {
                if (
                    absentChecked &&
                    cb.dataset.label !== "Absent"
                ) {
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
            const hasRealSelection = slots.some(
                slot => slot.available === true
            );
            if (!hasRealSelection) {
                alert(
                    "Merci de sélectionner au moins un créneau ou 'Absent'"
                );
                return;
            }
            try {
                const data = {
                    license: document
                        .getElementById("license")
                        .value
                        .trim(),
                    match_day_id: selectedDay,
                    slots
                };
                const response = await fetch("/availability", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization":
                            `Bearer ${localStorage.getItem("token")}`
                    },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(
                        result.detail ||
                        "Erreur d'enregistrement"
                    );
                }
                document.getElementById("result").innerHTML = `
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
                document.getElementById("result").innerHTML = `
                    <div class="result-error">
                        ❌ ${
                            err.message ||
                            "Erreur lors de l'enregistrement"
                        }
                    </div>
                `;
            }
        });
    }
    if (licenseInput) {
        let timeout;
        function resetField() {
            licenseInput.value = "";
            resetSlots();
            setSlotsDisabled(true);
            clearResult();
            const nameDiv =
                document.getElementById("player_name");
            const infoDiv =
                document.getElementById("player_info");
            if (nameDiv) {
                nameDiv.textContent = "";
                nameDiv.classList.remove("show");
            }
            if (infoDiv) {
                infoDiv.textContent = "";
                infoDiv.classList.remove("show");
            }
            window.currentAvailability = null;
            playerValid = false;
        }
        licenseInput.addEventListener("focus", resetField);
        licenseInput.addEventListener("click", resetField);
        licenseInput.addEventListener("input", () => {
            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                const license = licenseInput.value.trim();
                if (!/^[0-9]{5,7}$/.test(license)) {
                    playerValid = false;
                    return;
                }
                resetSlots();
                setSlotsDisabled(true);
                window.currentAvailability = null;
                try {
                    const pinToken =
                        localStorage.getItem("token");
                    if (!pinToken) {
                        alert("Session perdue (PIN)");
                        location.reload();
                        return;
                    }
                    const authRes = await fetch(
                        `/auth-player?license=${license}`,
                        {
                            headers: {
                                Authorization:
                                    "Bearer " + pinToken
                            }
                        }
                    );
                    if (!authRes.ok) {
                        const err = await authRes.json();
                        console.error("AUTH ERROR:", err);
                        const infoDiv =
                            document.getElementById("player_info");
                        if (infoDiv) {
                            infoDiv.textContent =
                                "❌ Veuillez vous reconnecter";
                            infoDiv.classList.add("show");
                        }
                        playerValid = false;
                        alert(
                            "Veuillez vous reconnecter ou Absence de joueur"
                        );
                        return;
                    }
                    const authData = await authRes.json();
                    const playerToken = authData.token;
                    if (!playerToken) {
                        playerValid = false;
                        return;
                    }
                    localStorage.setItem("token", playerToken);
                    const res = await fetch(
                        `/player/${license}`,
                        {
                            headers: {
                                Authorization:
                                    "Bearer " + playerToken
                            }
                        }
                    );
                    if (!res.ok) {
                        playerValid = false;
                        return;
                    }
                    const data = await res.json();
                    const nameDiv =
                        document.getElementById("player_name");
                    const infoDiv =
                        document.getElementById("player_info");
                    if (!data.name) {
                        if (infoDiv) {
                            infoDiv.textContent =
                                "Licence inconnue";
                            infoDiv.classList.add("show");
                        }
                        playerValid = false;
                        return;
                    }
                    if (nameDiv) {
                        nameDiv.textContent = data.name;
                        nameDiv.classList.add("show");
                    }
                    playerValid = true;
                    renderSlotsForSelectedDay();
                    setSlotsDisabled(false);
                    setTimeout(() => {
                        if (data.availability?.length > 0) {
                            if (infoDiv) {
                                infoDiv.textContent =
                                    "✔ Voici vos disponibilités";
                                infoDiv.classList.add("show");
                            }
                            window.currentAvailability =
                                data.availability;
                            updateAvailabilityUI();
                        } else {
                            if (infoDiv) {
                                infoDiv.textContent =
                                    "✔ Aucune saisie";
                                infoDiv.classList.add("show");
                            }
                        }
                    }, 50);
                } catch (err) {
                    console.error("ERROR:", err);
                }
            }, licenseInput.value.trim().length === 6 ? 1500 : 300);
        });
    }
}
