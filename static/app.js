let allSlots = [];
let matchDays = [];
let isAdmin = false;

const urlParams = new URLSearchParams(window.location.search);
const ADMIN_TOKEN = urlParams.get("admin");

//  Mode Admin 

async function checkAdmin() {

    try {
        const res = await fetch("/is-admin", {
            headers: { "x-token": ADMIN_TOKEN }
        });
        const data = await res.json();
        if (data.is_admin && ADMIN_TOKEN) {
            isAdmin = true;
            const section = document.getElementById("adminSection");
            if (section) section.style.display = "block";
        }
    } catch (err) {
        console.error("Erreur admin:", err);
    }
}


function clearResult() {
    const result = document.getElementById("result");
    if (result) result.innerHTML = "";
}

async function safeFetch(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Erreur API: ${url}`);
    return res.json();
}

// Chargement des données 

async function loadData() {

    try {
        matchDays = await safeFetch("/match-days");
        allSlots = await safeFetch("/slots");
        const daySelect = document.getElementById("match_day_id");
        if (!daySelect) return;
        daySelect.innerHTML = "";
        matchDays.forEach(day => {
            const option = document.createElement("option");
            option.value = day.id;
            option.text = day.code;
            daySelect.appendChild(option);
        });

    } catch (err) {
        console.error("Erreur loadData:", err);
    }
}

//  Initialisation 

document.addEventListener("DOMContentLoaded", () => {

    checkAdmin();
    loadData();

    //    
    const form = document.getElementById("form");
    if (form) {
        form.addEventListener("input", clearResult);
        form.addEventListener("submit", async function (e) {
            e.preventDefault();
            try {
                const data = {
                    license: document.getElementById("license").value,
                    slot_ids: [parseInt(document.getElementById("slot_id").value)],
                    availability: document.getElementById("availability").value
                };


                const headers = {
                    "Content-Type": "application/json"
                };

                // 👉 si admin, on ajoute le token
                if (isAdmin) {
                    headers["x-token"] = ADMIN_TOKEN;
                }

                const response = await fetch("/availability", {
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify(data)
                });



                const result = await response.json();
                document.getElementById("result").innerHTML = `
                    <div class="alert ${response.ok ? "alert-success" : "alert-danger"}">
                        ${result.message}
                    </div>`;
            } catch (err) {
                console.error(err);
            }
        });
    }

    //  Import  

    const importForm = document.getElementById("importForm");
    if (importForm) {
        importForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const fileInput = document.getElementById("fileInput");
            const file = fileInput.files[0];
            if (!isAdmin) {
                alert("Accès interdit");
                return;
            }
            if (!file) {
                alert("Choisis un fichier !");
                return;
            }
            if (file.name !== "export.xlsx") {
                showMessage("Le fichier doit s'appeler export.xlsx", true);
                return;
            }
            const formData = new FormData();
            formData.append("file", file);
            try {
                const res = await fetch("/import-joueur", {
                    method: "POST",
                    headers: { "x-token": ADMIN_TOKEN },
                    body: formData
                });
                const data = await res.json();
                fileInput.value = ""; // reset
                showMessage(data.error || data.message, !!data.error);
            } catch (err) {
                console.error(err);
                showMessage("Erreur import", true);
            }
        });
    }

});

//  Message 

function showMessage(text, isError = false) {

    const msgDiv = document.getElementById("importMessage");
    msgDiv.innerHTML = `
        <div style="
            background:${isError ? "#dc3545" : "#198754"};
            color:white;
            padding:4px 10px;
            border-radius:6px;
            font-size:11px;
            text-align:center;
        ">
            ${text}
        </div>
    `;
    setTimeout(() => {
        msgDiv.innerHTML = "";
    }, 3000);
}