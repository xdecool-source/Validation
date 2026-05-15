// Import des joueurs a partir du fichier export.xlsx de Spid (FFTT)
// Connexion Admin avec le code admin
// Stock les tokens dans le navigateur
// Envoie le fichier Excel SPID au backend
// Appel la fonction route :  /admin/import-joueur
// Affiche du résultat de l’import :
//                              joueurs ajoutés
//                              joueurs mis à jour
//                              erreurs éventuelles 
//  Deconnexion de l'admin

function setStatus(msg) {

    document.getElementById("status").innerText = msg;
}

async function login() {

    const code = prompt("Code admin :");
    const res = await fetch(`/check-access?code=${code}`);
    const data = await res.json();
    if (data.ok) {
        localStorage.setItem("access", data.access_token || data.token);
        localStorage.setItem("refresh", data.refresh_token || "");
        setStatus("Connecté");
    } else {
        setStatus("Code incorrect");
    }
}

async function upload() {

    let token = localStorage.getItem("access");
    if (!token) {
        setStatus("Connecte-toi d'abord");
        return;
    }
    const fileInput = document.getElementById("fileInput");
    if (!fileInput.files.length) {
        setStatus("Aucun fichier");
        return;
    }
    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    let res = await fetch("/admin/import-joueur", {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + token
        },
        body: formData
    });

    if (res.status === 401) {
        await refreshToken();
        token = localStorage.getItem("access");
        res = await fetch("/admin/import-joueur", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + token
            },
            body: formData
        });
    }

    let data;

    try {
        data = await res.json();
    } catch (e) {
        const text = await res.text();
        // console.log("RAW RESPONSE:", text);
        setStatus("Erreur serveur");
        return;
    }
    // console.log(data);
    if (data.message) {
        if (data.inserted === 0) {
            setStatus(`Aucun nouveau joueur toujours (${data.updated} joueurs)`);
        } else {
            setStatus(`${data.nb_total} joueurs (${data.inserted} ajoutés, ${data.updated} mis à jour)`);
        }
        fileInput.value = "";
    } else if (data.error) {
        setStatus("Error" + data.error);
    } else {
        setStatus("il faut se reconnecter");
    }
}

async function refreshToken() {

    const refresh = localStorage.getItem("refresh");
    const res = await fetch("/refresh", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ refresh_token: refresh })
    });
    const data = await res.json();
    localStorage.setItem("access", data.access_token);
}

function logout() {
    
    localStorage.clear();
    setStatus("Déconnecté");
}

window.onload = () => {
    if (localStorage.getItem("access")) {
        setStatus(" Déjà connecté");
    }
};