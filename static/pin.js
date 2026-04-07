// Gestion du code PIN à 6 chiffres

window.addEventListener("DOMContentLoaded", () => {

    const inputs = document.querySelectorAll(".pin");
    inputs.forEach(i => i.value = "");
    inputs[0].focus();
    inputs.forEach((input, index) => {
        input.addEventListener("keyup", async () => {
            input.value = input.value.replace(/[^0-9]/g, "");
            if (!input.value) return;
            if (index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
            const code = Array.from(inputs).map(i => i.value).join("");
            if (code.length !== 6) return;
            try {
                const res = await fetch("/check-access?code=" + code);
                const data = await res.json();
                // console.log("Réponse PIN:", data); 

                if (data.ok) {
                    localStorage.setItem("token", data.token);
                    // console.log("TOKEN STOCKÉ:", data.token);
                    document.getElementById("appContent").style.display = "block";
                    document.getElementById("pinContainer").style.display = "none";
                    if (typeof initFileInput === "function") {
                        initFileInput();
                    }

                    // attendre cookie
                    setTimeout(() => {
                        if (typeof checkAdmin === "function") {
                            checkAdmin();
                        }

                        if (typeof loadData === "function") {
                            loadData();
                        }
                    }, 200);
                }
                else {
                    alert("Code incorrect ❌");
                    inputs.forEach(i => i.value = "");
                    inputs[0].focus();
                }
            } catch (err) {
                console.error(err);
            }
        });
        input.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !input.value && index > 0) {
                inputs[index - 1].focus();
            }
        });
    });
});
