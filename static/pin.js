// Gestion du code PIN à 4 chiffres

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
            if (code.length !== 4) return;
            try {
                const res = await fetch("/check-access?code=" + code);
                const data = await res.json();
                if (data.ok) {
                    document.getElementById("appContent").style.display = "block";
                    document.getElementById("pinContainer").style.display = "none";
                    if (typeof initFileInput === "function") {
                        initFileInput();
                    }
                    // 🔥 RELOAD PROPRE DE L’APP
                    if (typeof loadData === "function") {
                        loadData();
                    }
                } else {
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
