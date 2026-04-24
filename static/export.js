function exportExcel() {
    const data = window.currentData;

    if (!Array.isArray(data)) {
        console.error("Pas de données pour export", data);
        return;
    }

    const wb = XLSX.utils.book_new();

    // 🔥 EXTRAIRE CRENEAUX
    const ALL_SLOTS = new Set();
    data.forEach(r => {
        if (!r.slots) return;
        r.slots.split(",").forEach(s => {
            const [key] = s.split(":");
            if (key) ALL_SLOTS.add(key.trim());
        });
    });
    const SLOT_LIST = Array.from(ALL_SLOTS);

    // 🔥 DISPONIBILITE
    const isDisponible = (val) => {
        if (!val) return false;
        val = val.trim().toLowerCase();
        return val === "true" || val === "1" || val === "disponible";
    };

    // 🔥 FORMAT GENERAL
    const format = (arr) => arr.map(r => {
        const row = {
            Nom: r.name,
            Classement: r.ranking,
        };

        SLOT_LIST.forEach(slot => row[slot] = "");

        let isAbsent = false;
        const slotValues = {};

        if (r.slots) {
            r.slots.split(",").forEach(s => {
                let [key, value] = s.split(":");
                key = key?.trim();
                value = value?.trim();

                if (!key) return;

                const dispo = isDisponible(value);

                if (key === "Absent" && dispo) {
                    isAbsent = true;
                }

                slotValues[key] = dispo;
            });
        }

        SLOT_LIST.forEach(slot => {
            let dispo;

            if (slot === "Absent") {
                dispo = false;
            } else if (isAbsent) {
                dispo = false;
            } else {
                dispo = slotValues[slot];
            }

            row[slot] = dispo
                ? "● disponible"
                : "■  indisponible";
        });

        return row;
    });

    // 🔥 TRI
    const rankingData = [...data].sort((a, b) => b.ranking - a.ranking);

    // 🔥 FEUILLE PRINCIPALE
    function createSheet(name, dataset) {
        const formatted = format(dataset);

        const headers = ["Nom", "Classement", ...SLOT_LIST];

        const rows = [];
        let lastStatut = null;

        formatted.forEach(r => {
            const statut = Object.values(r).includes("🟢 disponible")
                ? "disponible"
                : "indisponible";

            if (lastStatut === "disponible" && statut === "indisponible") {
                rows.push({});
            }

            rows.push(r);
            lastStatut = statut;
        });

        const ws = XLSX.utils.aoa_to_sheet([
            headers,
            ...rows.map(r => headers.map(h => r[h] || ""))
        ]);

        ws['!cols'] = autoSizeColumns(rows);

        XLSX.utils.book_append_sheet(wb, ws, name);
    }

    // 🔥 FEUILLES PAR CRENEAU
    function createSheetsBySlot() {
        SLOT_LIST.forEach(slot => {
            const rows = [];

            data.forEach(r => {
                if (!r.slots) return;

                let isAbsent = false;

                r.slots.split(",").forEach(s => {
                    const [key, val] = s.split(":");
                    if (key.trim() === "Absent" && isDisponible(val)) {
                        isAbsent = true;
                    }
                });

                r.slots.split(",").forEach(s => {
                    let [key, value] = s.split(":");

                    key = key?.trim();
                    value = value?.trim();

                    if (key !== slot) return;

                    let dispo = isDisponible(value);

                    if (key === "Absent") {
                        dispo = false;
                    } else if (isAbsent) {
                        dispo = false;
                    }

                    rows.push({
                        Nom: r.name,
                        Classement: r.ranking,
                        Statut: dispo
                            ? " ● disponible"
                            : " ■ indisponible"
                    });
                });
            });

            rows.sort((a, b) => {
                if (a.Statut !== b.Statut)
                    return a.Statut.includes("●") ? -1 : 1;
                return b.Classement - a.Classement;
            });

            // séparation
            const formattedRows = [];
            let last = null;

            rows.forEach(r => {
                const statut = r.Statut.includes("●") ? "dispo" : "indispo";

                if (last === "dispo" && statut === "indispo") {
                    formattedRows.push({});
                }

                formattedRows.push(r);
                last = statut;
            });

            const headers = ["Nom", "Classement", "Statut"];

            const ws = XLSX.utils.aoa_to_sheet([
                headers,
                ...formattedRows.map(r => headers.map(h => r[h] || ""))
            ]);

            ws['!cols'] = autoSizeColumns(rows);

            XLSX.utils.book_append_sheet(wb, ws, slot);
        });
    }

    // 🔥 TRI SUPPLÉMENTAIRE
    const dispoData = [...data].sort((a, b) => {
        return getDispoCount(b) - getDispoCount(a);
    });

    const indispoData = [...data].sort((a, b) => {
        return getIndispoCount(b) - getIndispoCount(a);
    });

    // 🔥 HELPERS
    function getDispoCount(row) {
        if (!row.slots) return 0;
        return row.slots.split(",").filter(s => {
            const [, val] = s.split(":");
            return isDisponible(val);
        }).length;
    }

    function getIndispoCount(row) {
        if (!row.slots) return 0;
        return row.slots.split(",").filter(s => {
            const [, val] = s.split(":");
            return !isDisponible(val);
        }).length;
    }





    // 🔥 EXECUTION
    createSheet("Classement", rankingData);
    createSheet("Disponibles", dispoData);
    createSheet("Indisponibles", indispoData);

    createSheetsBySlot();


    // récupérer la journée sélectionnée
    const select = document.getElementById("match_day_id");
    let label = "J?";

    if (select && select.options.length > 0) {
        const text = select.options[select.selectedIndex].text;

        // extrait "J1", "J2", etc.
        const match = text.match(/J\d+/i);
        if (match) {
            label = match[0];
        }
    }

    // nom final
    const fileName = `disponibilites_${label}.xlsx`;

    XLSX.writeFile(wb, fileName);

}

// 🔥 AUTO SIZE
function autoSizeColumns(data) {
    const widths = [];
    data.forEach(row => {
        Object.values(row).forEach((val, i) => {
            const len = String(val || "").length;
            widths[i] = Math.max(widths[i] || 10, len + 2);
        });
    });
    return widths.map(w => ({ wch: w }));
}

// 🔥 GLOBAL
window.exportExcel = exportExcel;

