// ============================================================
//  dashboard.js  — Home Dashboard & History
// ============================================================

const Dashboard = (() => {

  // ── Home page ─────────────────────────────────────────────
  function renderHome() {
    const user     = State.getUser();
    const greeting = getGreeting();

    document.getElementById("home-greeting").textContent =
      user.name ? `${greeting}, ${user.name.split(" ")[0]}! 👋` : `${greeting}! 👋`;

    // Load recent attempts if configured
    if (API.isConfigured() && user.contact) {
      loadRecentAttempts(user.contact);
    } else {
      document.getElementById("home-recent").innerHTML = `
        <div class="text-center text-muted" style="padding:32px">
          <i class="fas fa-history" style="font-size:2rem;margin-bottom:12px;display:block;opacity:.4"></i>
          <div class="text-sm">No history yet. Configure your settings and take a quiz!</div>
        </div>`;
    }
  }

  async function loadRecentAttempts(contact) {
    const container = document.getElementById("home-recent");
    container.innerHTML = UI.skeletonRows(3, 56);
    try {
      const { attempts } = await API.listAttempts(contact);
      if (!attempts || attempts.length === 0) {
        container.innerHTML = `<div class="text-muted text-sm text-center py-3">No attempts yet.</div>`;
        return;
      }
      container.innerHTML = attempts.slice(0, 5).map(a => `
        <div class="d-flex align-center gap-3" style="padding:12px;border-radius:10px;background:var(--bg-primary);margin-bottom:8px">
          <div style="width:40px;height:40px;border-radius:50%;background:var(--accent-light);display:grid;place-items:center;color:var(--accent);flex-shrink:0">
            <i class="fas fa-scroll"></i>
          </div>
          <div class="flex-1">
            <div class="fw-600 text-sm">${a["Quiz Name"] || "Quiz"}</div>
            <div class="text-xs text-muted">${a["Quiz Topic"] || ""} · ${a["Start Time"] ? new Date(a["Start Time"]).toLocaleDateString() : ""}</div>
          </div>
          <div class="text-sm fw-700 text-accent">${a["Result Score"] || "–"}</div>
        </div>`).join("");
    } catch (e) {
      container.innerHTML = `<div class="text-muted text-sm">${e.message}</div>`;
    }
  }

  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }

  // ── Start Quiz button ─────────────────────────────────────
  function startSetup() {
    if (!API.isConfigured()) {
      if (!confirm("Script URL not configured. Continue with demo mode?")) {
        UI.openSettings(); return;
      }
    }
    UI.showPage("setup");
    Filters.init();
  }

  // ── History page ──────────────────────────────────────────
  async function renderHistory() {
    const user = State.getUser();
    const container = document.getElementById("history-list");
    if (!container) return;

    if (!API.isConfigured()) {
      container.innerHTML = `<div class="text-muted text-center py-4"><i class="fas fa-cog fa-2x mb-2 d-block opacity-50"></i>Configure Script URL in Settings to view history.</div>`;
      return;
    }

    container.innerHTML = UI.skeletonRows(5, 64);

    try {
      const contact  = user.contact || "";
      const { attempts } = await API.listAttempts(contact);
      if (!attempts?.length) {
        container.innerHTML = `<div class="text-muted text-center py-4">No attempts found.</div>`;
        return;
      }
      container.innerHTML = `
        <div class="table-responsive">
          <table class="table table-hover" style="font-size:.88rem">
            <thead>
              <tr>
                <th>#</th><th>Quiz</th><th>Topic</th>
                <th>Score</th><th>Date</th><th></th>
              </tr>
            </thead>
            <tbody>
              ${attempts.map((a, i) => `
                <tr>
                  <td class="text-muted">${i + 1}</td>
                  <td class="fw-600">${a["Quiz Name"] || "–"}</td>
                  <td>${a["Quiz Topic"] || "–"}</td>
                  <td><span class="fw-700 text-accent">${a["Result Score"] || "–"}</span></td>
                  <td class="text-muted">${a["Start Time"] ? new Date(a["Start Time"]).toLocaleDateString() : "–"}</td>
                  <td>
                    ${a["Filepath"] ? `<button class="btn-qm btn-qm-sm btn-qm-outline" onclick="Dashboard.viewAttempt('${a["Filepath"]}')">
                      <i class="fas fa-eye"></i>
                    </button>` : ""}
                  </td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>`;
    } catch (e) {
      container.innerHTML = `<div class="text-danger">${e.message}</div>`;
    }
  }

  async function viewAttempt(fileId) {
    try {
      const { attempt } = await API.getAttempt(fileId);
      State.set({ result: { data: attempt, mode: "overview" } });
      UI.showPage("result");
      Result.render();
    } catch (e) {
      UI.toast("Could not load attempt: " + e.message, "error");
    }
  }

  return { renderHome, startSetup, renderHistory, viewAttempt };
})();
