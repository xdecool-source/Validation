function exportExcel() {

    const data = window.currentData;
    if (!Array.isArray(data)) {
        console.error("Pas de données pour export", data);
        return;
    }
    const count = (row, type) => {
        if (!row.slots) return 0;

        return row.slots.split(",").filter(s => {
            const availability = s.split(":")[1];
            return availability === type;
        }).length;
    };
    // CLASSEMENT
    const rankingData = [...data].sort((a, b) => b.ranking - a.ranking);
    // DISPO
    const dispoData = [...data].sort((a, b) => {
        const dA = count(a, "disponible");
        const dB = count(b, "disponible");
        if (dA !== dB) return dB - dA;
        const iA = count(a, "indisponible");
        const iB = count(b, "indisponible");
        if (iA !== iB) return iA - iB;
        return b.ranking - a.ranking;
    });
    // INDISPO
    const indispoData = [...data].sort((a, b) => {
        const iA = count(a, "indisponible");
        const iB = count(b, "indisponible");
        if (iA !== iB) return iB - iA;
        const dA = count(a, "disponible");
        const dB = count(b, "disponible");
        if (dA !== dB) return dA - dB;
        return b.ranking - a.ranking;
    });
    // format Excel
    const format = (arr) => arr.map(r => ({
        Nom: r.name,
        Classement: r.ranking,
        Dispos: count(r, "disponible"),
        Indispos: count(r, "indisponible"),
        Créneaux: r.slots
    }));
    const wb = XLSX.utils.book_new();
    // Classement
    let formatted = format(rankingData);
    let ws = XLSX.utils.json_to_sheet(formatted);
    ws['!cols'] = autoSizeColumns(formatted);
    XLSX.utils.book_append_sheet(wb, ws, "Classement");
    // Dispo
    formatted = format(dispoData);
    ws = XLSX.utils.json_to_sheet(formatted);
    ws['!cols'] = autoSizeColumns(formatted);
    XLSX.utils.book_append_sheet(wb, ws, "Disponibles");
    // Indispo
    formatted = format(indispoData);
    ws = XLSX.utils.json_to_sheet(formatted);
    ws['!cols'] = autoSizeColumns(formatted);
    XLSX.utils.book_append_sheet(wb, ws, "Indisponibles");
    XLSX.writeFile(wb, "disponibilites.xlsx");
    }

function autoSizeColumns(data) {

    const widths = [];
    data.forEach(row => {
        Object.values(row).forEach((val, i) => {
            const len = String(val).length;
            widths[i] = Math.max(widths[i] || 10, len + 2);
        });
    });
    return widths.map(w => ({ wch: w }));
}
