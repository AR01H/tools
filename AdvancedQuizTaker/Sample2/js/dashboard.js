// ============================================================
//  QUIZ APP — dashboard.js
//  Welcome page + user registration
// ============================================================

const PageWelcome = (() => {
  function render(main) {
    const user = State.get("user") || { name: "", identifier: "" };
    const scriptConfigured = !!State.get("scriptUrl");

    main.innerHTML = `
      <div class="animate-up" style="max-width:1200px; margin:0 auto; padding:var(--sp-xl) var(--sp-md)">
        
        <div class="welcome-grid" style="display:grid; grid-template-columns: 1.2fr 1fr; gap:48px; align-items: start;">
          
          <!-- Container 1: Context & Instructions -->
          <div class="context-container">
            <div style="display:inline-flex; align-items:center; gap:8px; background:var(--accent-primary-transparent); color:var(--accent-primary); padding:6px 16px; border-radius:30px; font-size:11px; font-weight:800; margin-bottom:24px">
              <span style="width:6px; height:6px; background:var(--accent-primary); border-radius:50%; box-shadow:0 0 10px var(--accent-primary)"></span>
              ADVANCED ASSESSMENT PLATFORM
            </div>
            
            <h1 style="font-size:3.5rem; font-weight:900; letter-spacing:-0.04em; color:var(--text-primary); line-height:1.05; margin-bottom:24px">
              Master Your <span class="text-gradient">Knowledge</span> with Precision.
            </h1>
            
            <p style="font-size:1.15rem; color:var(--text-secondary); line-height:1.6; margin-bottom:40px; max-width:540px">
              Launch high-yield simulations powered by real-time analytics. Your progress is automatically synced to your professional profile for long-term performance tracking.
            </p>

            <div style="display:grid; gap:16px; margin-bottom:40px">
              <div class="step-card">
                <div class="step-num">01</div>
                <div>
                  <h4 style="font-weight:700; color:var(--text-primary); margin-bottom:4px">Verify Identity</h4>
                  <p class="text-xs text-muted">Enter your name and unique ID to link your results to the centralized cloud database.</p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">02</div>
                <div>
                  <h4 style="font-weight:700; color:var(--text-primary); margin-bottom:4px">Configure Session</h4>
                  <p class="text-xs text-muted">Select topics and filter difficulty levels to tailor the assessment to your current focus.</p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">03</div>
                <div>
                  <h4 style="font-weight:700; color:var(--text-primary); margin-bottom:4px">Analyze & Adapt</h4>
                  <p class="text-xs text-muted">Review deep-analytics reports to identify skill gaps and optimize your study strategy.</p>
                </div>
              </div>
            </div>

            ${!scriptConfigured ? `
              <div class="card" style="border-left:4px solid var(--color-warn); background:rgba(245,158,11,0.05); display:flex; justify-content:space-between; align-items:center; padding:20px 24px">
                <div>
                  <p style="font-weight:700; font-size:0.9rem; color:var(--color-warn); margin-bottom:2px">⚠️ Integration Pending</p>
                  <p class="text-xs text-muted">Configure your Google Script URL to enable cloud sync.</p>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="UI.openSettings()">Setup →</button>
              </div>
            ` : ''}
          </div>


          <!-- Container 2: User Details / Identity -->
          <div class="identity-container">
            <div class="card" style="padding:40px; border-radius:28px; background:var(--bg-surface); border:1px solid var(--border-color); box-shadow:var(--shadow-xl); position:relative; overflow:hidden">
              <div style="position:absolute; top:0; left:0; width:100%; height:6px; background:linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))"></div>
              
              <div style="text-align:center; margin-bottom:32px">
                <div class="logo-mark" style="width:54px; height:54px; font-size:1.5rem; margin:0 auto 16px; border-radius:14px">Q</div>
                <h3 style="font-size:1.5rem; font-weight:800; color:var(--text-primary)">Professional Identity</h3>
                <p class="text-sm text-muted">Data entered here is used for your official transcript in the cloud database.</p>
              </div>

              <div class="form-group" style="margin-bottom:20px">
                <label class="form-label" style="font-size:0.7rem; letter-spacing:1px; color:var(--accent-primary)">FULL NAME</label>
                <input type="text" id="reg-name" class="form-control" placeholder="John Doe" value="${user.name}" style="padding:14px 18px; border-radius:12px; font-weight:600">
              </div>

              <div class="form-group" style="margin-bottom:32px">
                <label class="form-label" style="font-size:0.7rem; letter-spacing:1px; color:var(--accent-primary)">UNIQUE IDENTIFIER (EMAIL/PHONE)</label>
                <input type="text" id="reg-identifier" class="form-control" placeholder="john@example.com" value="${user.identifier}" style="padding:14px 18px; border-radius:12px; font-weight:600">
              </div>

              <button class="btn btn-primary btn-lg btn-full" onclick="Dashboard.handleWelcomeAction()" style="padding:16px; border-radius:12px; font-weight:800; display:flex; align-items:center; justify-content:center; gap:10px">
                <span>${user.name ? 'Continue Assessment' : 'Initialize Session'}</span>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>

              ${user.name ? `
                <div style="margin-top:24px; text-align:center">
                  <button class="btn btn-ghost btn-sm" onclick="Dashboard.changeUser()" style="color:var(--text-muted); font-size:0.75rem">Switch Account</button>
                </div>
              ` : ''}
            </div>
          </div>

        </div>
      </div>

      <style>
        @media (max-width: 968px) {
          .welcome-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .context-container { text-align: center; }
          .context-container p { margin-left: auto; margin-right: auto; }
          .step-card { text-align: left; }
        }
        .step-card { display: flex; gap: 16px; align-items: flex-start; padding: 12px; border-radius: 12px; transition: 0.3s; }
        .step-card:hover { background: var(--bg-elevated); }
        .step-num { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: var(--accent-primary-transparent); color: var(--accent-primary); border-radius: 8px; font-weight: 800; font-size: 0.8rem; flex-shrink: 0; }
        .text-gradient { background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      </style>
    `;
  }

  return { render };
})();

// ── Dashboard actions ─────────────────────────────────────
const Dashboard = (() => {
  async function handleWelcomeAction() {
    const nameEl = document.getElementById("reg-name");
    const idEl = document.getElementById("reg-identifier");

    if (!nameEl.value.trim() || !idEl.value.trim()) {
      if (!nameEl.value.trim()) nameEl.style.borderColor = "var(--color-error)";
      if (!idEl.value.trim()) idEl.style.borderColor = "var(--color-error)";
      UI.toast("Please fill all required fields", "warn");
      return;
    }

    const user = {
      name: nameEl.value.trim(),
      identifier: idEl.value.trim(),
    };
    State.set("user", user);
    Dashboard.startQuiz();
  }

  async function startQuiz() {
    if (!State.get("scriptUrl")) {
      UI.toast("Configure your Google Script URL in Settings first", "warn");
      UI.openSettings();
      return;
    }
    UI.setLoading(true, "Loading topics…");
    try {
      const topics = await API.getTopics();
      State.set("topics", topics);
      const configs = await API.getQuizConfigs();
      State.set("quizConfigs", configs);
      UI.setLoading(false);
      State.reset("setup");
      UI.pushPage("setup-topics");
    } catch (e) {
      UI.setLoading(false);
      UI.toast("Failed to load: " + e.message, "error");
    }
  }

  function changeUser() {
    UI.confirm2(
      "Switch to a different user? (Current session will end)",
      "Dashboard.resetUser"
    );
  }

  function resetUser() {
    State.set("user", null);
    State.set("result", null);
    UI.navigate("welcome");
  }

  async function viewLatestResult() {
    const current = State.get("result");
    if (current) {
      UI.navigate("result");
      return;
    }

    const user = State.get("user");
    if (!user || !user.identifier) {
      UI.toast("Sign in to view your professional results history", "info");
      UI.navigate("welcome");
      return;
    }

    UI.setLoading(true, "Searching for your latest result…");
    try {
      const history = await API.getHistory(user.identifier);
      if (history && history.length > 0) {
        // Last item in array is usually latest if appended, 
        // but we reverse it in the history UI. 
        // Let's take the very last recorded entry.
        const latest = history[history.length - 1];
        const filepath = latest.Filepath || latest.filepath || latest.FILEPATH || "";
        if (filepath) {
          await PageHistory.viewCloudAttempt(filepath);
        } else {
          UI.setLoading(false);
          UI.toast("Your latest session detail was not found", "warn");
          UI.navigate("history");
        }
      } else {
        UI.setLoading(false);
        UI.toast("No historical results found.", "info");
      }
    } catch (e) {
      UI.setLoading(false);
      UI.toast("Failed to sync latest result: " + e.message, "error");
    }
  }

  return { handleWelcomeAction, startQuiz, changeUser, resetUser, viewLatestResult };
})();
