// ============================================================
//  QUIZ APP — dashboard.js
//  Welcome page + user registration
// ============================================================

const PageWelcome = (() => {
  function render(main) {
    const user = State.get("user");
    const scriptConfigured = !!State.get("scriptUrl");

    main.innerHTML = `
      <div class="animate-up" style="max-width:1200px; margin:0 auto; padding:var(--sp-xl) var(--sp-md)">
        
        <div class="welcome-grid" style="display:grid; grid-template-columns: 1.2fr 1fr; gap:48px;">
          
          <!-- Identity Container (Priority 1) -->
          <div class="identity-container">
            <!-- Universal Daily Insights Widget -->
            <div id="daily-insights-widget" class="daily-stats-widget" style="margin-bottom:24px;">
               <div class="skeleton" style="height:120px; border-radius:24px"></div>
            </div>

            <div class="card" style="padding:40px; border-radius:28px; background:var(--bg-surface); border:1px solid var(--border-color); box-shadow:var(--shadow-xl); position:relative; overflow:hidden">
              <div style="position:absolute; top:0; left:0; width:100%; height:6px; background:linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))"></div>
              
              <div style="text-align:center; margin-bottom:32px">
                <div class="logo-mark" style="width:54px; height:54px; font-size:1.5rem; margin:0 auto 16px; border-radius:14px">Q</div>
                <h3 style="font-size:1.5rem; font-weight:800; color:var(--text-primary)">Professional Identity</h3>
                <p class="text-sm text-muted">Link your session to the cloud database.</p>
              </div>

              <div class="form-group" style="margin-bottom:20px">
                <label class="form-label" style="font-size:0.7rem; letter-spacing:1px; color:var(--accent-primary)">FULL NAME</label>
                <input type="text" id="reg-name" class="form-control" placeholder="John Doe" value="${user?.name || ''}" style="padding:14px 18px; border-radius:12px; font-weight:600">
              </div>

              <div class="form-group" style="margin-bottom:32px">
                <label class="form-label" style="font-size:0.7rem; letter-spacing:1px; color:var(--accent-primary)">UNIQUE IDENTIFIER</label>
                <input type="text" id="reg-identifier" class="form-control" placeholder="john@example.com" value="${user?.identifier || ''}" style="padding:14px 18px; border-radius:12px; font-weight:600">
              </div>

              <button class="btn btn-primary btn-lg btn-full" onclick="Dashboard.handleWelcomeAction()" style="padding:16px; border-radius:12px; font-weight:800; display:flex; align-items:center; justify-content:center; gap:10px">
                <span>${user?.name ? 'Continue Assessment' : 'Initialize Session'}</span>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>

              ${user?.name ? `
                <div style="margin-top:24px; text-align:center; display:flex; flex-direction:column; gap:8px">
                  <button class="btn btn-secondary btn-sm" onclick="Dashboard.viewLatestResult()" style="border-radius:10px; font-size:0.8rem">📊 Sync Latest Result</button>
                  <button class="btn btn-ghost btn-sm" onclick="Dashboard.changeUser()" style="color:var(--text-muted); font-size:0.75rem">Switch Account</button>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Context Container (Instructional) -->
          <div class="context-container">
            <h1 style="font-size:2.8rem; font-weight:900; letter-spacing:-0.04em; color:var(--text-primary); line-height:1.05; margin-bottom:16px">
              Master Your <span class="text-gradient">Knowledge</span>
            </h1>
            
            <p style="font-size:1rem; color:var(--text-secondary); line-height:1.6; margin-bottom:32px; max-width:540px">
              Launch high-yield simulations powered by real-time analytics. Your progress is synced to your professional profile.
            </p>

            <div style="display:grid; gap:12px; margin-bottom:32px">
              <div class="step-card">
                <div class="step-num">01</div>
                <div>
                  <h4 style="font-weight:700; color:var(--text-primary); margin-bottom:2px">Identify</h4>
                  <p class="text-xs text-muted">Enter your name and ID to link results.</p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">02</div>
                <div>
                  <h4 style="font-weight:700; color:var(--text-primary); margin-bottom:2px">Simulate</h4>
                  <p class="text-xs text-muted">Configure topics and difficulty.</p>
                </div>
              </div>
              <div class="step-card">
                <div class="step-num">03</div>
                <div>
                  <h4 style="font-weight:700; color:var(--text-primary); margin-bottom:2px">Excel</h4>
                  <p class="text-xs text-muted">Review reports and strategy.</p>
                </div>
              </div>
            </div>

            ${!scriptConfigured ? `
              <div class="card" style="border-left:4px solid var(--color-warn); background:rgba(245,158,11,0.05); display:flex; justify-content:space-between; align-items:center; padding:16px 20px">
                <div>
                  <p style="font-weight:700; font-size:0.8rem; color:var(--color-warn)">⚠️ Integration Pending</p>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="UI.openSettings()">Setup →</button>
              </div>
            ` : ''}
          </div>

         </div>
       </div>

      <style>
        .daily-stats-widget { display: none; } /* Hidden until loaded or if no user */
        @media (max-width: 968px) {
          .welcome-grid { 
            display: flex !important;
            flex-direction: column !important; /* Force Login form first */
            gap: 24px !important; 
          }
          .identity-container { order: 1; }
          .context-container { order: 2; text-align: center; }
          .context-container p { margin-left: auto; margin-right: auto; }
          .step-card { text-align: left; }
        }
        .step-card { display: flex; gap: 16px; align-items: flex-start; padding: 12px; border-radius: 12px; transition: 0.3s; }
        .step-card:hover { background: var(--bg-elevated); }
        .step-num { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; background: var(--accent-primary-transparent); color: var(--accent-primary); border-radius: 8px; font-weight: 800; font-size: 0.8rem; flex-shrink: 0; }
        .text-gradient { background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      </style>
    `;


    // Fetch stats if user exists
    if (user?.identifier && scriptConfigured) {
      Dashboard.loadUserInsights();
    }
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

  async function loadUserInsights() {
    const user = State.get("user");
    const container = document.getElementById('daily-insights-widget');
    if (!container || !user?.identifier) return;

    try {
      const resp = await API.getHistory(user.identifier);
      if (!resp || resp.length === 0) {
        container.style.display = 'none';
        return;
      }

      // 1. Calculate Streak
      const uniqueDates = [...new Set(resp.map(r => r["Start Time"]?.split('T')[0]))].sort().reverse();
      let streak = 0;
      let today = new Date().toISOString().split('T')[0];
      
      // Simple consecutive count
      for (let i = 0; i < uniqueDates.length; i++) {
        streak++;
        // If there's a gap of more than 1 day between this and next entry
        if (uniqueDates[i+1]) {
           let d1 = new Date(uniqueDates[i]);
           let d2 = new Date(uniqueDates[i+1]);
           let diff = (d1 - d2) / (1000 * 60 * 60 * 24);
           if (diff > 1) break; 
        }
      }

      // 2. Identify Focus Area (Most recent weak topic)
      const lastSession = resp[0];
      const score = parseFloat(lastSession["Result Score"]) || 0;
      const topic = lastSession["Quiz Topic"] || "General Labs";
      
      let message = "You're doing great! Keep it up.";
      if (score < 50) message = `Focus on <b>${topic}</b> to boost your score.`;
      else if (score < 80) message = `You're close to mastery in <b>${topic}</b>!`;

      container.innerHTML = `
        <div style="background:linear-gradient(135deg, #6366f1 0%, #a855f7 100%); padding:20px; border-radius:24px; color:white; box-shadow:0 10px 25px rgba(99,102,241,0.3)">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
            <span style="font-size:0.7rem; font-weight:800; letter-spacing:1px; opacity:0.8">CURRENT STATUS</span>
            <div style="background:rgba(255,255,255,0.2); padding:4px 10px; border-radius:10px; font-size:0.65rem; font-weight:800">🔥 ${streak} DAY STREAK</div>
          </div>
          <h4 style="font-size:1.1rem; font-weight:800; line-height:1.2; margin-bottom:8px">${score > 80 ? 'Mastery in sight!' : 'Ready to smash your goal?'}</h4>
          <p style="font-size:0.8rem; opacity:0.9; margin-bottom:0">${message}</p>
        </div>
      `;
      container.style.display = 'block';

    } catch (e) {
      console.error("Dashboard Insight Error:", e);
      container.style.display = 'none';
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

  return { 
    handleWelcomeAction, 
    startQuiz, 
    viewLatestResult, 
    loadUserInsights, 
    changeUser, 
    resetUser 
  };
})();
