// =========================================================
// AgriKart Authentication
// Register + Login connected with Flask/MySQL
// =========================================================

const AUTH_API = "http://127.0.0.1:5000/api";


// =========================================================
// Helper: Show Message
// =========================================================
function showAuthMessage(message, type = "info") {
    if (typeof showToast === "function") {
        showToast(message, type);
    } else {
        alert(message);
    }
}


// =========================================================
// REGISTER
// =========================================================
async function initRegisterPage() {

    const form = document.getElementById("registerForm");

    if (!form) {
        return;
    }

    form.addEventListener("submit", async function (event) {

        event.preventDefault();

        const name = form.elements["name"].value.trim();
        const email = form.elements["email"].value.trim().toLowerCase();
        const mobile = form.elements["mobile"].value.trim();
        const password = form.elements["password"].value;
        const confirmPassword = form.elements["confirmPassword"].value;
        const terms = form.elements["terms"].checked;


        // -----------------------------
        // Validation
        // -----------------------------

        if (!name || !email || !mobile || !password || !confirmPassword) {
            showAuthMessage("Please fill all fields.", "warning");
            return;
        }


        // Email validation
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(email)) {
            showAuthMessage("Please enter a valid email address.", "warning");
            return;
        }


        // Mobile validation
        const mobilePattern = /^[0-9]{10}$/;

        if (!mobilePattern.test(mobile)) {
            showAuthMessage("Please enter a valid 10-digit mobile number.", "warning");
            return;
        }


        // Password validation
        if (password.length < 6) {
            showAuthMessage("Password must be at least 6 characters.", "warning");
            return;
        }


        // Confirm password
        if (password !== confirmPassword) {
            showAuthMessage("Passwords do not match.", "warning");
            return;
        }


        // Terms
        if (!terms) {
            showAuthMessage(
                "Please agree to the Terms & Conditions.",
                "warning"
            );
            return;
        }


        // Disable button while request is running
        const submitButton = form.querySelector("button[type='submit']");

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Creating Account...";
        }


        try {

            const response = await fetch(`${AUTH_API}/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    mobile: mobile,
                    password: password
                })
            });


            const data = await response.json();


            if (!response.ok || !data.success) {

                showAuthMessage(
                    data.message || "Registration failed.",
                    "error"
                );

                return;
            }


            // Save logged-in user
            localStorage.setItem(
                "agrikart_user",
                JSON.stringify(data.user)
            );


            showAuthMessage(
                "Account created successfully!",
                "success"
            );


            // Redirect to home
            setTimeout(() => {
                window.location.href = "index.html";
            }, 800);


        } catch (error) {

            console.error("Register Error:", error);

            showAuthMessage(
                "Cannot connect to server. Please make sure Flask is running.",
                "error"
            );

        } finally {

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Create Account";
            }
        }

    });
}


// =========================================================
// LOGIN
// =========================================================
async function initLoginPage() {

    const form = document.getElementById("loginForm");

    if (!form) {
        return;
    }


    form.addEventListener("submit", async function (event) {

        event.preventDefault();


        const identifier = form.elements["identifier"].value.trim();
        const password = form.elements["password"].value;

        const rememberMe = document.getElementById("rememberMe");


        // -----------------------------
        // Validation
        // -----------------------------

        if (!identifier || !password) {
            showAuthMessage(
                "Please enter email/mobile and password.",
                "warning"
            );
            return;
        }


        // Disable button
        const submitButton = form.querySelector("button[type='submit']");

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Logging in...";
        }


        try {

            const response = await fetch(`${AUTH_API}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    identifier: identifier,
                    password: password
                })
            });


            const data = await response.json();


            if (!response.ok || !data.success) {

                showAuthMessage(
                    data.message || "Login failed.",
                    "error"
                );

                return;
            }


            // -----------------------------------
            // Save logged-in user
            // -----------------------------------

          const userData = JSON.stringify(data.user);

            // Clear old login data first
            localStorage.removeItem("agrikart_user");
            sessionStorage.removeItem("agrikart_user");

            // Save current logged-in user
            localStorage.setItem("agrikart_user", userData);
            sessionStorage.setItem("agrikart_user", userData);


            showAuthMessage(
                "Login successful!",
                "success"
            );


            // Redirect to home
            setTimeout(() => {
                window.location.href = "index.html";
            }, 800);


        } catch (error) {

            console.error("Login Error:", error);

            showAuthMessage(
                "Cannot connect to server. Please make sure Flask is running.",
                "error"
            );

        } finally {

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Login";
            }
        }

    });
}


// =========================================================
// GET CURRENT USER
// =========================================================
function getCurrentUser() {

    const localUser = localStorage.getItem("agrikart_user");

    if (localUser) {
        try {
            return JSON.parse(localUser);
        } catch (error) {
            console.error("Invalid local user data.");
        }
    }


    const sessionUser = sessionStorage.getItem("agrikart_user");

    if (sessionUser) {
        try {
            return JSON.parse(sessionUser);
        } catch (error) {
            console.error("Invalid session user data.");
        }
    }


    return null;
}


// =========================================================
// LOGOUT
// =========================================================
function logoutUser() {

    localStorage.removeItem("agrikart_user");
    sessionStorage.removeItem("agrikart_user");

    window.location.href = "login.html";
}