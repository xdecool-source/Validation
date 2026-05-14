// Gestion de la saisie du code PIN 

let checkingPin = false;

window.addEventListener("DOMContentLoaded", () => {

    const pinInput = document.getElementById("pinInput");

    setTimeout(() => {
        pinInput.focus();
        pinInput.click();
    }, 300);


    // Saisie PIN
    pinInput.addEventListener("input", async () => {
        if (checkingPin) return;
        pinInput.value =
            pinInput.value
                .replace(/[^0-9]/g, "")
                .slice(0, 6);

        if (pinInput.value.length !== 6) return;
        checkingPin = true;
        pinInput.disabled = true;        
        const code = pinInput.value;
        // console.log("CODE ENVOYÉ :", code);

        try {
            const res = await fetch(
                "/check-access?code=" + code
            );
            if (res.status === 429) {
                alert("Trop de tentatives ⏳");
                resetPin();
                return;
            }
            const data = await res.json();
            if (data.ok) {
                localStorage.setItem(
                    "token",
                    data.token
                );
                document.getElementById("appContent")
                    .style.display = "block";
                document.getElementById("pinContainer")
                    .style.display = "none";
                if (typeof initFileInput === "function") {
                    initFileInput();
                }
                setTimeout(() => {
                    if (typeof checkAdmin === "function") {
                        checkAdmin();
                    }

                    if (typeof loadData === "function") {
                        // console.log("LOAD DATA");
                        loadData();
                    }
                }, 200);
            } else {
                // Afficher le PIN 0.5 sec
                pinInput.type = "text";
                await new Promise(resolve =>
                    setTimeout(resolve, 500)
                );
                alert("Code incorrect ❌");
                resetPin();
            }
        } catch (err) {
            console.error(err);
            resetPin();
        }
    });

    function resetPin() {

        checkingPin = false;
        pinInput.disabled = false;
        pinInput.type = "password";
        pinInput.value = "";
        pinInput.focus();
    }
});