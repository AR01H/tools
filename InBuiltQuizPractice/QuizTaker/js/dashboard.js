// ============================================================
//  QUIZ APP — dashboard.js
//  Welcome page + user registration
// ============================================================

const PageWelcome = (() => {
  function render(main) {
    const user = State.get("user");
    const scriptConfigured = !!State.get("scriptUrl");

    const hour = new Date().getHours();
    const greetings = {
      morning: ["Good Morning", "Rise and Shine", "Morning Fuel"],
      afternoon: ["Good Afternoon", "Stay Focused", "Afternoon Push"],
      evening: ["Good Evening", "Night Owl Session", "Evening Review"]
    };
    
    let timeGroup = "evening";
    if (hour < 12) timeGroup = "morning";
    else if (hour < 17) timeGroup = "afternoon";
    
    const randomGreet = greetings[timeGroup][Math.floor(Math.random() * greetings[timeGroup].length)];
    const superTitle = user?.name ? `WELCOME BACK • ${timeGroup.toUpperCase()}` : "GET STARTED • JOIN US";
    const headerTitle = user?.name ? `${randomGreet}, <span class="text-gradient">${user.name.split(' ')[0]}</span>!` : `Welcome to <span class="text-gradient">PrepQuick</span>`;
    const headerSub = user?.name 
      ? "It's great to see you again. Ready to crush your goals today?" 
      : "Launch high-yield practice simulations and master your knowledge.";

    main.innerHTML = `
      <div class="animate-up welcome-hero-container">
        <div class="welcome-header" style="position:relative">
           <div style="position:absolute; top:-10px; right:0; display:flex; gap:8px">
              <button class="btn btn-ghost btn-sm" onclick="Dashboard.sharePlatform()" style="border:1px solid var(--border-color); border-radius:12px; font-weight:800; padding:8px 16px">
                 ✉️ Invite
              </button>
           </div>
           <h4 class="welcome-super-title">${superTitle}</h4>
           <h1 class="welcome-main-title">${headerTitle}</h1>
           <p class="welcome-lead">${headerSub}</p>
         </div>

        <div class="welcome-layout">
          <!-- LEFT: Registration & Stats -->
          <div class="registration-panel">
            <div id="daily-insights-widget" class="daily-stats-widget">
               <div class="skeleton" style="height:80px;"></div>
            </div>

            <div class="identity-glass-card">
              <div class="card-glow"></div>
              <div class="identity-header">
                <div class="identity-icon">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M12 11c2.209 0 4-1.791 4-4s-1.791-4-4-4-4 1.791-4 4 1.791 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                </div>
                <div class="header-text">
                  <h3>Get Started</h3>
                  <p>Enter your details to sync progress</p>
                </div>
              </div>

              <div class="registration-form">

                <div class="form-group">
                  <label class="pro-label">EMAIL ADDRESS</label>
                  <div class="input-wrapper">
                    <input type="text" id="reg-identifier" class="pro-input" placeholder="you@example.com" value="${user?.identifier || ''}">
                    <div class="input-focus-ring"></div>
                  </div>
                </div>

                <div class="form-group">
                  <label class="pro-label">FULL NAME</label>
                  <div class="input-wrapper">
                    <input type="text" id="reg-name" class="pro-input" placeholder="Enter your name" value="${user?.name || ''}">
                    <div class="input-focus-ring"></div>
                  </div>
                </div>

                <div class="action-stack">
                  <button class="btn-launch-primary" onclick="Dashboard.handleWelcomeAction()">
                    <span>${user?.name ? 'Start Mock Test' : 'Sign In / Register'}</span>
                  </button>
                  
                  ${user?.name ? `
                    <div class="session-management">
                      <button class="btn-sync" onclick="Dashboard.viewLatestResult()">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                        Last Performance
                      </button>
                      ${State.get("setup")?.selectedTopics?.length ? `
                        <button class="btn-sync" onclick="Dashboard.handleShare()" style="color:var(--text-muted)">🔗 Share Config</button>
                      ` : ''}
                      <button class="btn-switch" onclick="Dashboard.changeUser()">Switch User</button>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>

          <!-- RIGHT: Process Visual -->
          <div class="process-panel">
            <div class="process-steps">
               <div class="process-step">
                  <div class="step-num-hex">
                    <span class="num">01</span>
                    <div class="hex-bg"></div>
                  </div>
                  <div class="step-content">
                    <h4>Profile</h4>
                    <p>Register your session for historical tracking.</p>
                  </div>
               </div>
               
               <div class="process-step">
                  <div class="step-num-hex">
                    <span class="num">02</span>
                    <div class="hex-bg"></div>
                  </div>
                  <div class="step-content">
                    <h4>Practice</h4>
                    <p>Select your domain and difficulty tier.</p>
                  </div>
               </div>
            </div>

            ${!scriptConfigured ? `
              <div class="integration-notice">
                <div class="notice-icon">⚠️</div>
                <div class="notice-text">
                  <h5>Cloud Storage Off</h5>
                  <p>Enable Google Script for history sync.</p>
                </div>
                <button onclick="UI.openSettings()">Connect</button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <style>
        .welcome-hero-container { max-width: 1100px; margin: 0 auto; padding: 60px 24px; }
        
        .welcome-header { text-align: center; margin-bottom: 24px; }
        .welcome-super-title { font-size: 0.75rem; font-weight: 900; letter-spacing: 0.2em; color: var(--accent-primary); margin-bottom: 12px; }
        .welcome-main-title { font-size: 3.5rem; font-weight: 900; letter-spacing: -0.05em; line-height: 1; margin: 0; }
        .welcome-lead { font-size: 1.15rem; color: var(--text-muted); margin: 16px auto 0; max-width: 600px; line-height: 1.6; }
        
        .welcome-layout { display: grid; grid-template-columns: 1fr 400px; gap: 64px; align-items: start; }
        
        /* Identity Card */
        .identity-glass-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px; position: relative; overflow: hidden; box-shadow: var(--shadow-xl); }
        .card-glow { position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; background: var(--accent-primary-transparent); filter: blur(40px); border-radius: 50%; pointer-events: none; }
        
        .identity-header { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; }
        .identity-icon { width: 48px; height: 48px; background: var(--accent-primary); color: #fff; border-radius: var(--radius-md); display: grid; place-items: center; box-shadow: 0 8px 16px var(--accent-shadow); }
        .identity-header h3 { font-size: 1.5rem; font-weight: 800; margin: 0; letter-spacing: -0.02em; }
        .identity-header p { font-size: 0.85rem; color: var(--text-muted); margin: 4px 0 0 0; }
        
        .registration-form { display: flex; flex-direction: column; gap: 24px; }
        .pro-label { font-size: 0.7rem; font-weight: 900; letter-spacing: 0.1em; color: var(--text-muted); margin-bottom: 8px; display: block; }
        .input-wrapper { position: relative; }
        .pro-input { width: 100%; background: var(--bg-elevated); border: 1px solid var(--border-color); padding: 16px 20px; border-radius: var(--radius-md); font-size: 1rem; font-weight: 700; color: var(--text-primary); transition: 0.3s var(--ease); }
        .pro-input:focus { border-color: var(--accent-primary); outline: none; }
        .input-focus-ring { position: absolute; inset: -4px; border-radius: var(--radius-lg); border: 2px solid var(--accent-primary); opacity: 0; pointer-events: none; transition: 0.3s; }
        .pro-input:focus + .input-focus-ring { opacity: 0.15; transform: scale(1); }
        
        .btn-launch-primary { background: var(--accent-primary); color: #fff; border: none; padding: 18px; border-radius: var(--radius-md); font-weight: 900; font-size: 1.1rem; box-shadow: 0 8px 16px var(--accent-shadow); transform: translateY(0); transition: 0.3s var(--ease); cursor: pointer; width: 100%; }00%; }
        .btn-launch-primary:hover { transform: translateY(-4px); filter: brightness(1.1); box-shadow: 0 16px 32px var(--accent-shadow); }
        
        .session-management { display: flex; justify-content: space-between; align-items: center; margin-top: 12px;padding-top:6px; }
        .btn-sync { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 800; color: var(--accent-primary); opacity: 0.8; transition: 0.2s; }
        .btn-sync:hover { opacity: 1; }
        .btn-switch { font-size: 0.75rem; font-weight: 800; color: var(--text-muted); }
        
        /* Process Steps */
        .process-steps { display: flex; flex-direction: column; gap: 20px; border: 1px solid var(--border-color); border-radius: 4px; overflow: hidden; }
        .process-step { display: flex; gap: 20px; align-items: center; padding: 20px; background: transparent; transition: 0.3s; }
        .step-num-hex { position: relative; width: 44px; height: 44px; display: grid; place-items: center; flex-shrink: 0; }
        .step-num-hex .num { font-weight: 900; font-size: 0.9rem; color: var(--accent-primary); z-index: 1; }
        .step-num-hex .hex-bg { position: absolute; inset: 0; background: var(--accent-primary-transparent); transform: rotate(45deg); border-radius: 12px; border: 1px solid var(--accent-primary-transparent); }
        .step-content h4 { font-weight: 800; color: var(--text-primary); margin: 0 0 4px 0; font-size: 1rem; }
        .step-content p { font-size: 0.85rem; color: var(--text-muted); margin: 0; line-height: 1.4; }
        
        .integration-notice { margin-top: 40px; padding: 24px; background: var(--bg-elevated); border: 1px solid var(--border-color); border-radius: 20px; display: flex; align-items: center; gap: 16px; border-left: 5px solid var(--color-warn); }
        .notice-icon { font-size: 1.5rem; }
        .notice-text h5 { margin: 0; font-weight: 800; color: var(--text-primary); }
        .notice-text p { margin: 2px 0 0 0; font-size: 0.75rem; color: var(--text-muted); }
        .integration-notice button { margin-left: auto; background: var(--bg-surface); border: 1px solid var(--border-color); padding: 8px 16px; border-radius: 10px; font-weight: 800; font-size: 0.75rem; color: var(--color-warn); }

        #daily-insights-widget { display: none; }
        @media (max-width: 1000px) {
           .welcome-hero-container { padding: 16px; }
           .welcome-header { margin-bottom: 10px; }
           .welcome-layout { grid-template-columns: 1fr; gap: 32px; }
           .welcome-main-title { font-size: 2.4rem; letter-spacing: -1px; }
           .welcome-lead { font-size: 1rem; }
           
           .identity-glass-card { padding: 10px; border-radius: 4px; }
           .identity-header { margin-bottom: 24px; }
           .identity-icon { width: 40px; height: 40px; border-radius: 10px; }
           .identity-header h3 { font-size: 1.25rem; }
           
           .pro-input { padding: 14px 16px; border-radius: 4px; }
           .btn-launch-primary { padding: 8px; font-size: 1rem; }
           
           .process-steps { gap: 12px; }
           .process-step { padding: 12px; }
           .step-num-hex { width: 36px; height: 36px; }
           .step-num-hex .num { font-size: 0.75rem; }
           
           .integration-notice { padding: 16px; border-radius: 16px; margin-top: 24px; }
        }
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

  async function startQuiz(isShared = false) {
    if (!State.get("scriptUrl")) {
      UI.toast("Configure your Google Script URL in Settings first", "warn");
      UI.openSettings();
      return;
    }
    UI.setLoading(true, isShared ? "Syncing shared quiz..." : "Loading topics…");
    try {
      const topics = await API.getTopics();
      State.set("topics", topics);
      const configs = await API.getQuizConfigs();
      State.set("quizConfigs", configs);
      UI.setLoading(false);
      
      if (isShared) {
        // Shared link already set up the "setup" state, so we just go to setup-topics
        UI.pushPage("setup-topics");
      } else {
        State.reset("setup");
        UI.pushPage("setup-topics");
      }
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

      container.style.display = 'block';

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
        <div class="insight-bar animate-fade">
          <div class="insight-content">
            <h4 class="insight-title">${score > 80 ? 'Mastery in sight!' : 'Ready to smash your goal?'}</h4>
            <p class="insight-msg">${message}</p>
          </div>
          <div class="insight-streak">
            <span class="streak-icon">🔥</span>
            <span class="streak-val">${streak} DAY STREAK</span>
          </div>
        </div>
        <style>
          .insight-bar { background: var(--bg-surface); border: 1px solid var(--border-color); padding: 12px 18px; border-radius: 4px; display: flex; align-items: center; gap: 16px; box-shadow: var(--shadow-sm); margin-bottom: 24px; position:relative; overflow:hidden; flex-wrap: wrap; }
          .insight-bar::after { content:''; position:absolute; top:0; left:0; width:4px; height:100%; background: var(--accent-primary); }
          
          .insight-status { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 70px; }
          .pulse-dot { width: 6px; height: 6px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 0 4px rgba(34,197,94,0.15); animation: pulse 2s infinite; }
          @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34,197,94,0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(34,197,94,0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(34,197,94,0); } }
          .status-label { font-size: 0.55rem; font-weight: 900; color: var(--text-muted); letter-spacing: 1px; }

          .insight-content { flex: 1; }
          .insight-title { font-size: 0.85rem; font-weight: 800; color: var(--text-primary); margin: 0 0 2px 0; }
          .insight-msg { font-size: 0.75rem; color: var(--text-muted); margin: 0; line-height: 1.3; }
          
          .insight-streak { background: var(--accent-primary-transparent); padding: 6px 12px; border-radius: 10px; display: flex; align-items: center; gap: 6px; }
          .streak-icon { font-size: 0.9rem; }
          .streak-val { font-size: 0.7rem; font-weight: 900; color: var(--accent-primary); white-space: nowrap; }

          @media (max-width: 600px) {
            .insight-status { min-width: auto; background: var(--bg-elevated); padding: 4px 8px; border-radius: 6px; flex-direction: row; }
            .insight-streak { padding: 4px 10px; }
          }
        </style>
      `;
      container.style.display = 'block';

    } catch (e) {
      console.error("Dashboard Insight Error:", e);
      container.style.display = 'none';
    }
  }

  function sharePlatform() {
    const url = window.location.origin + window.location.pathname;
    showShareModal(url, "PrepQuick — Mastery Platform", "Check out this advanced quiz platform for mastering your topics!");
  }

  function changeUser() {
    UI.confirm2(
      "Switch to a different user? (Current session will end)",
      "Dashboard.resetUser"
    );
  }

  function handleShare() {
    const setup = State.get("setup");
    if (!setup.selectedTopics || !setup.selectedTopics.length) {
      UI.toast("No configuration found to share", "warn");
      return;
    }
    
    // Create sharing payload
    const data = {
      t: setup.selectedTopics,
      c: setup.finalConfig,
      tm: setup.template || "default"
    };
    
    try {
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
      const url = `${window.location.origin}${window.location.pathname}#share=${encoded}`;
      showShareModal(url, "Shared Quiz Configuration", "Ready for a challenge? Try this custom quiz configuration on PrepQuick!");
    } catch (e) {
      UI.toast("Failed to generate share link", "error");
    }
  }

  function showShareModal(url, title, text) {
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text + " " + url);
    
    UI.modal(`
      <div style="padding: 10px; text-align:center">
        <h3 style="font-size:1.4rem; font-weight:900; margin-bottom:var(--sp-md); color:var(--text-primary)">Share with Friends</h3>
        <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:var(--sp-xl)">Spread the knowledge across your network</p>
        
        <div class="share-grid">
           <div class="share-item" onclick="Dashboard.copyToClipboard('${url}')">
              <div class="share-icon" style="background:var(--bg-elevated)">📋</div>
              <span>Copy</span>
           </div>
           <a class="share-item" href="https://wa.me/?text=${encodedText}" target="_blank">
              <div class="share-icon" style="background:#25d36622; color:#25d366">📱</div>
              <span>WhatsApp</span>
           </a>
           <a class="share-item" href="https://t.me/share/url?url=${encodedUrl}&text=${encodedText}" target="_blank">
              <div class="share-icon" style="background:#0088cc22; color:#0088cc">✈️</div>
              <span>Telegram</span>
           </a>
           <a class="share-item" href="mailto:?subject=${encodeURIComponent(title)}&body=${encodedText}">
              <div class="share-icon" style="background:var(--accent-primary-transparent); color:var(--accent-primary)">✉️</div>
              <span>Email</span>
           </a>
           ${navigator.share ? `
           <div class="share-item" onclick="Dashboard.systemShare('${url}', '${title}', '${text}')">
              <div class="share-icon" style="background:var(--bg-elevated)">🔗</div>
              <span>More</span>
           </div>` : ''}
        </div>
        
        <div style="margin-top:var(--sp-xl); padding-top:var(--sp-md); border-top:1px solid var(--border-color)">
           <input type="text" value="${url}" readonly style="width:100%; height:44px; padding:0 12px; font-family:var(--font-mono); font-size:0.75rem; border-radius:8px; background:var(--bg-elevated); border:1px solid var(--border-color); color:var(--text-secondary); text-overflow:ellipsis">
        </div>
      </div>
      
      <style>
        .share-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 10px; }
        .share-item { display: flex; flex-direction: column; align-items: center; gap: 8px; text-decoration: none; cursor: pointer; transition: 0.3s var(--ease); }
        .share-item:hover { transform: translateY(-4px); }
        .share-icon { width: 48px; height: 48px; border-radius: 12px; display: grid; place-items: center; font-size: 1.4rem; border: 1px solid var(--border-color); }
        .share-item span { font-size: 0.65rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        @media (max-width: 480px) { .share-grid { grid-template-columns: repeat(2, 1fr); } }
      </style>
    `);
  }

  function copyToClipboard(val) {
    navigator.clipboard.writeText(val).then(() => {
       UI.toast("Link copied to clipboard!", "success");
    });
  }

  function systemShare(url, title, text) {
    if (navigator.share) {
      navigator.share({ title, text, url }).catch(() => {});
    }
  }

  function checkDeepLink() {
    const hash = window.location.hash;
    if (hash.startsWith("#share=")) {
      const encoded = hash.substring(7);
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(encoded))));
        if (decoded.t && Array.isArray(decoded.t)) {
          State.merge("setup", {
            selectedTopics: decoded.t,
            finalConfig: decoded.c || {},
            template: decoded.tm || "sat"
          });
          
          // Clear hash
          window.history.replaceState(null, null, window.location.pathname);
          
          UI.toast("🎯 Shared Quiz Configuration Loaded!", "success", 5000);
          
          // If we have topics, we can jump straight to config or launch
          // But better let user see topics first to confirm
          Dashboard.startQuiz(true); 
        }
      } catch (e) {
        console.warn("Invalid shared link:", e);
      }
    }
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
    resetUser,
    handleShare,
    sharePlatform,
    showShareModal,
    copyToClipboard,
    systemShare,
    checkDeepLink
  };
})();
