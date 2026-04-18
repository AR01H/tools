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
    const superTitle = user?.name ? `WELCOME BACK` : "GET STARTED • JOIN US";
    const headerTitle = user?.name ? `${randomGreet}, <span class="text-gradient">${user.name.split(' ')[0]}</span>!` : `Welcome to <span class="text-gradient">PrepQuick</span>`;
    const pendingSetup = State.get("setup")?.selectedTopics?.length;
    const activeChallenge = State.get("activeChallenge");

    let headerSub = user?.name 
      ? "It's great to see you again. Ready to crush your goals today?" 
      : "Launch high-yield practice simulations and master your knowledge.";
    
    if (pendingSetup) {
       headerSub = activeChallenge 
         ? `<span style="color:var(--accent-primary); font-weight:800">⚔️ Challenge Pending:</span> Beat ${activeChallenge.score}% by ${activeChallenge.challenger}.`
         : `<span style="color:var(--accent-primary); font-weight:800">🎯 Shared Config:</span> A custom quiz is ready for you to launch.`;
    }

    let btnText = user?.name ? 'Start Mock Test' : 'Sign In / Register';
    if (pendingSetup) {
       btnText = activeChallenge ? '⚔️ Accept Challenge' : '🚀 Launch Shared Quiz';
    }

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
                    <input type="text" id="reg-identifier" class="pro-input" placeholder="you@example.com" value="${user?.identifier || ''}" onkeydown="if(event.key==='Enter') Dashboard.handleWelcomeAction()">
                    <div class="input-focus-ring"></div>
                  </div>
                </div>

                <div class="form-group">
                  <label class="pro-label">FULL NAME</label>
                  <div class="input-wrapper">
                    <input type="text" id="reg-name" class="pro-input" placeholder="Enter your name" value="${user?.name || ''}" onkeydown="if(event.key==='Enter') Dashboard.handleWelcomeAction()">
                    <div class="input-focus-ring"></div>
                  </div>
                </div>

                <div class="action-stack">
                  <button class="btn-launch-primary" onclick="Dashboard.handleWelcomeAction()">
                    <span>${btnText}</span>
                  </button>
                  
                  ${user?.name ? `
                    <div class="session-management">
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

          <!-- RIGHT: Features Highlights -->
          <div class="process-panel">
            <div class="welcome-features-header">
              <span class="welcome-features-title">Platform Capabilities</span>
              <div class="welcome-features-line"></div>
            </div>
            
            <div class="features-grid">
               <div class="feature-card">
                 <div class="feat-icon" style="background:rgba(139,92,246,0.15); color:#a78bfa">🎙️</div>
                 <div class="feat-text">
                   <h4>Voice Control Engine</h4>
                   <p>Command the quiz hands-free. Features option elimination, playback speeds, and contextual selection logic.</p>
                 </div>
               </div>
               
               <div class="feature-card">
                 <div class="feat-icon" style="background:rgba(16,185,129,0.15); color:#34d399">🎯</div>
                 <div class="feat-text">
                   <h4>Strategic Practice</h4>
                   <p>Switch seamlessly between high-stress Active Testing protocols and relaxed Study Modes with auto-grading.</p>
                 </div>
               </div>

               <div class="feature-card" style="margin-bottom:12px;">
                 <div class="feat-icon" style="background:rgba(6,182,212,0.15); color:#22d3ee">📊</div>
                 <div class="feat-text">
                   <h4>Deep Insight Analytics</h4>
                   <p>Visual historical footprint tracking your domain mastery, completion times, and overall progression matrix.</p>
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
        
        .btn-launch-primary { background: var(--accent-primary); color: #fff; border: none; padding: 8px; border-radius: var(--radius-sm); font-weight: 900; font-size: 1.1rem; box-shadow: 0 8px 16px var(--accent-shadow); transform: translateY(0); transition: 0.3s var(--ease); cursor: pointer; width: 100%; }00%; }
        .btn-launch-primary:hover { transform: translateY(-4px); filter: brightness(1.1); box-shadow: 0 16px 32px var(--accent-shadow); }
        
        .session-management { display: flex; justify-content: space-between; align-items: center; margin-top: 12px;padding-top:6px; }
        .btn-sync { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 800; color: var(--accent-primary); opacity: 0.8; transition: 0.2s; }
        .btn-sync:hover { opacity: 1; }
        .btn-switch { font-size: 0.75rem; font-weight: 800; color: var(--text-muted); }
        
        /* Process Steps & Features */
        .welcome-features-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
        .welcome-features-title { font-size: 0.73rem; text-transform: uppercase; letter-spacing: 2.5px; color: var(--accent-primary); font-weight: 900; white-space: nowrap; }
        .welcome-features-line { height: 1.5px; flex: 1; background: linear-gradient(90deg, var(--border-color), transparent); }
        .features-grid { display: flex; flex-direction: column; gap: 14px; }
        .feature-card { display: flex; gap: 18px; align-items: flex-start; padding: 20px; background: var(--bg-elevated); border: 1px solid var(--border-color); border-radius: var(--radius-lg); transition: all 0.3s cubic-bezier(.34,1.56,.64,1); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .feature-card:hover { transform: translateY(-4px) scale(1.02); border-color: var(--accent-primary-transparent); box-shadow: 0 16px 40px rgba(0,0,0,0.3); background: rgba(255,255,255,0.03); }
        .feat-icon { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 14px; font-size: 1.4rem; flex-shrink: 0; transition: transform 0.4s cubic-bezier(.34,1.56,.64,1), box-shadow 0.3s; box-shadow: inset 0 2px 4px rgba(255,255,255,0.1); }
        .feature-card:hover .feat-icon { transform: scale(1.15) rotate(-6deg); box-shadow: 0 8px 16px rgba(0,0,0,0.2); }
        .feat-text h4 { margin: 0 0 6px 0; font-weight: 800; font-size: 1.05rem; color: var(--text-primary); letter-spacing: -0.01em; }
        .feat-text p { margin: 0; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; }
        
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
           .features-grid { gap: 12px; margin-top: 0; }
           .feature-card { padding: 16px; gap: 14px; }
           .feat-icon { width: 40px; height: 40px; font-size: 1.2rem; }
           .feat-text h4 { font-size: 0.95rem; }
           .feat-text p { font-size: 0.8rem; }
           
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
    const launchBtn = document.querySelector(".btn-launch-primary");

    if (!nameEl.value.trim() || !idEl.value.trim()) {
      if (!nameEl.value.trim()) nameEl.style.borderColor = "var(--color-error)";
      if (!idEl.value.trim()) idEl.style.borderColor = "var(--color-error)";
      UI.toast("Please fill all required fields", "warn");
      return;
    }

    // Disable button to prevent double-clicks
    if (launchBtn) {
      launchBtn.disabled = true;
      launchBtn.style.opacity = "0.7";
      launchBtn.innerHTML = `<span><div class="spinner" style="display:inline-block; margin-right:8px; width:14px; height:14px; border-width:2px"></div> Processing...</span>`;
    }

    const user = {
      name: nameEl.value.trim(),
      identifier: idEl.value.trim(),
    };
    State.set("user", user);
    
    // If accepting a share/challenge, jump straight to quiz after registration
    if (State.get("setup")?.selectedTopics?.length) {
       Dashboard.launchImmediateQuiz();
    } else {
       Dashboard.startQuiz();
    }
  }

  async function launchImmediateQuiz() {
    const activeChallenge = State.get("activeChallenge");
    const setup = State.get("setup");
    if (!setup || !setup.selectedTopics || setup.selectedTopics.length === 0) {
       Dashboard.startQuiz();
       return;
    }

    if (!State.get("scriptUrl")) {
       UI.toast("Configure your Google Script URL in Settings first", "warn");
       UI.openSettings();
       return;
    }

    const msg = activeChallenge 
        ? `⚔️ Launching Challenge from ${activeChallenge.challenger || 'Friend'}...`
        : `⚡ Launching Shared Configuration...`;

    UI.setLoading(true, msg);
    try {
      // 1. Fetch all topics to check existence
      const allTopics = await API.getTopics();
      State.set("topics", allTopics);
      
      // 2. Resolve the target topics from the share
      const targetTopicNames = setup.selectedTopics.map(t => t.name || t); 
      const selectedTopics = allTopics.filter(t => targetTopicNames.includes(t.name));
      
      if (selectedTopics.length === 0) {
         throw new Error("Specified topics no longer exist or are inaccessible.");
      }

      // 3. Fetch the actual question pool
      const rawQuestions = await API.getQuestions(targetTopicNames);
      State.set("questions", rawQuestions);

      // 4. Apply Filters & Prepare Quiz Data
      const finalConfig = setup.finalConfig || {};
      const filtered = Filters.applyFilters(rawQuestions, setup);
      
      // Section/Option Shuffling
      let finalQs = [...filtered];
      if (finalConfig["Section Order"] === "Random") {
         finalQs = Filters.shuffle(finalQs);
      }
      
      const randomOpts = (finalConfig["Random Options"] || "On") === "On";
      const preparedQs = finalQs.map(q => {
         if (!randomOpts) return q;
         const choices = ["Choice 1","Choice 2","Choice 3","Choice 4","Choice 5","Choice 6"]
            .map(k => q[k] || q[k.replace(' ', '')]).filter(Boolean);
         const shuffled = Filters.shuffle([...choices]);
         const newQ = { ...q };
         shuffled.forEach((c, i) => { newQ["Choice" + (i + 1)] = c; });
         return newQ;
      });

      // 5. Store preparation in state
      State.merge("setup", { preparedQs, finalConfig, selectedTopics });

      // 6. Delegate to the official launch runner (handles cloud sync/attempt IDs)
      UI.setLoading(false);
      PageSetupTemplate.launchQuiz();
      
    } catch (e) {
      UI.setLoading(false);
      UI.toast("Failed to launch: " + e.message, "error");
      Dashboard.startQuiz(); // fallback to normal setup
    }
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
        State.set("activeChallenge", null);
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
      tm: setup.template || "sat"
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
          if (decoded.ch) {
             State.set("activeChallenge", decoded.ch);
             UI.toast(`⚔️ Challenge accepted! You must beat ${decoded.ch.score}% by ${decoded.ch.challenger}.`, "success", 8000);
          } else {
             State.set("activeChallenge", null);
             UI.toast("🎯 Shared Quiz Configuration Loaded!", "success", 5000);
          }

          // Clear hash for clean URL
          window.history.replaceState(null, null, window.location.pathname);
          
          // Check if user should login first or jump straight to start
          const user = State.get("user");
          if (!user || !user.identifier) {
             UI.toast("Please sign in or register to accept this shared quiz.", "info");
             UI.navigate("welcome");
          } else {
             Dashboard.launchImmediateQuiz();
          }
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
    launchImmediateQuiz,
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
