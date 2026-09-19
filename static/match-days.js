// match-days.js - créneaux, journées et verrouillage

function getSlotsFromDate(dateStr) {

    const date = new Date(dateStr + "T00:00:00");
    const day = date.getDay();
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
    const limitDate = new Date(matchDate);
    limitDate.setDate(
        limitDate.getDate() - DATE_LIMITE
    );
    limitDate.setHours(14, 0, 0, 0);
    return limitDate;
}

function isLocked(day) {

    const limitDate = getClosureLimitDate(day);
    if (!limitDate) {
        return false;
    }
    return new Date() >= limitDate;
}

function getClosureDate(day) {

    const limitDate = getClosureLimitDate(day);
    if (!limitDate) {
        return "";
    }
    const d = String(limitDate.getDate()).padStart(2, "0");
    const m = String(limitDate.getMonth() + 1).padStart(2, "0");
    return `${d}/${m}`;
}

function updateClosureInfo() {
    const daySelect =
        document.getElementById("match_day_id");
    const closureDiv =
        document.getElementById("closureInfo");

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
    const closureDate = getClosureDate(day);
    if (!closureDate) {
        closureDiv.innerHTML = "";
        return;
    }
    const locked = isLocked(day);
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

async function loadData() {

    try {
        const data = await safeFetch("/match-days");
        if (!data) {
            return;
        }
        matchDays = data;
        const daySelect =
            document.getElementById("match_day_id");
        if (!daySelect) {
            return;
        }
        daySelect.innerHTML = "";
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const futureDays =
            matchDays
                .filter(day => {
                    if (!day.date) {
                        return false;
                    }
                    const date =
                        new Date(
                            day.date + "T00:00:00"
                        );
                    return date >= today;
                })
                .sort(
                    (a, b) =>
                        new Date(a.date) -
                        new Date(b.date)
                );
        const nextDays = [];
        matchDays.forEach(day => {
            if (isLocked(day)) {
                nextDays.push(day);
            }
        });
        let added = 0;
        for (let i = 0; i < futureDays.length; i++) {
            const day = futureDays[i];
            if (!isLocked(day)) {
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
                document.createElement("option");
            option.value = day.id;
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
                option.text += " (verrouillé)";
            }
            daySelect.appendChild(option);
        });
        renderSlotsForSelectedDay();
        updateClosureInfo();
        updateDaySelectColor();
    } catch (err) {
        console.error(
            "Erreur chargement :",
            err
        );
    }
}
