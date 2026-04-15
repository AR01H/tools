const AdminApp = (() => {
    let _token = null;
    let _apiUrl = localStorage.getItem("adminAppApiUrl") || "";

    window.onload = () => {
        document.getElementById("api-url").value = _apiUrl;
        if (localStorage.getItem("adminAppToken")) {
            _token = localStorage.getItem("adminAppToken");
            showDashboard();
        }
    };

    function toast(msg, type = "info") {
        const el = document.getElementById("toast");
        el.textContent = msg;
        el.style.borderLeft = `4px solid var(--${type === 'error' ? 'error' : type === 'success' ? 'success' : 'primary'})`;
        el.className = "show";
        setTimeout(() => el.className = "", 3000);
    }

    // Mirrors api.js exactly — GET with cors + redirect:follow
    async function callApi(action, params = {}) {
        if (!_apiUrl) throw new Error("API URL not configured");
        const qs = new URLSearchParams({ action, ...params });
        if (_token) qs.append("auth", _token);
        const res = await fetch(`${_apiUrl}?${qs.toString()}`, {
            method: 'GET',
            mode: 'cors',
            redirect: 'follow'
        });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "API Error");
        return json.data;
    }

    async function login() {
        const url = document.getElementById("api-url").value.trim();
        const user = document.getElementById("username").value.trim();
        const pass = document.getElementById("password").value;

        if (!url || !user || !pass) return toast("Please fill all fields", "warn");

        _apiUrl = url;
        localStorage.setItem("adminAppApiUrl", url);

        const btnText = document.getElementById("login-text");
        const spinner = document.getElementById("login-spinner");
        btnText.style.display = "none";
        spinner.style.display = "inline-block";

        try {
            const data = await callApi("adminLogin", { username: user, password: pass });
            if (data.token) {
                _token = data.token;
                localStorage.setItem("adminAppToken", _token);
                toast("Authentication Successful", "success");
                showDashboard();
            } else {
                throw new Error("No token received");
            }
        } catch (e) {
            toast(e.message, "error");
        } finally {
            btnText.style.display = "block";
            spinner.style.display = "none";
        }
    }

    function logout() {
        _token = null;
        localStorage.removeItem("adminAppToken");
        document.getElementById("login-view").style.display = "block";
        document.getElementById("dashboard-view").style.display = "none";
        document.getElementById("nav-actions").style.display = "none";
    }

    function showDashboard() {
        document.getElementById("login-view").style.display = "none";
        document.getElementById("dashboard-view").style.display = "block";
        document.getElementById("nav-actions").style.display = "block";
        loadDashboard();
    }

    async function loadDashboard() {
        const tbody = document.getElementById("admin-table-body");
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:32px;">⟳ Loading...</td></tr>';
        try {
            const data = await callApi("adminStats");

            document.getElementById("metric-users").textContent = data.totalUsers || 0;
            document.getElementById("metric-attempts").textContent = data.totalAttempts || 0;

            if (!data.history || !data.history.length) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 32px;">No historical attempts found.</td></tr>';
                return;
            }

            tbody.innerHTML = [...data.history].reverse().map(r => {
                const dateRaw = r.timestamp === "-" ? "-" : new Date(r.timestamp).toLocaleString();
                return `
                <tr>
                    <td>${dateRaw}</td>
                    <td style="font-weight:700; color:var(--primary)">${r.userId || "Unknown"}</td>
                    <td>${r.quizName || "-"} (${r.quizTopic || "-"})</td>
                    <td style="font-family:'Outfit'; font-weight:800">${r.score || "-"}</td>
                    <td style="font-size:0.8rem; color:var(--text-muted); font-family:monospace">${r.fileId || "N/A"}</td>
                </tr>`;
            }).join("");

        } catch (e) {
            toast("Failed to load: " + e.message, "error");
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--error);padding:32px;">Error: ${e.message}</td></tr>`;
            if (e.message.toLowerCase().includes("auth") || e.message.toLowerCase().includes("unauthorized")) {
                logout();
            }
        }
    }

    async function clearHistoryPrompt() {
        const conf = confirm("WARNING: This will permanently delete ALL stored attempt files and history records. Continue?");
        if (!conf) return;
        try {
            toast("Initiating Secure Wipe...", "warn");
            await callApi("adminClearHistory");
            toast("Database successfully wiped.", "success");
            loadDashboard();
        } catch (e) {
            toast("Clear Failed: " + e.message, "error");
        }
    }

    return { login, logout, loadDashboard, clearHistoryPrompt };
})();
