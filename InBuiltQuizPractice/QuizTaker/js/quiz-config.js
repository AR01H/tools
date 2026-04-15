// ============================================================
//  QUIZ APP — quiz-config.js
//  Setup Config page + quiz session management
// ============================================================

const PageSetupConfig = (() => {
  const PRESET_FIELDS = [
    { key: "Quiz Time", label: "Total Time (sec)", type: "number" },
    { key: "Question Time", label: "Per Question Time", type: "number" },
    {
      key: "Section Order",
      label: "Section Order",
      type: "select",
      opts: ["Fixed", "Random"],
    },
    {
      key: "Adaptive Mode",
      label: "Adaptive Mode",
      type: "select",
      opts: ["On", "Off"],
    },
    {
      key: "Random Options",
      label: "Random Options",
      type: "select",
      opts: ["On", "Off"],
    },
    {
      key: "Allow Option Change",
      label: "Allow Change",
      type: "select",
      opts: ["On", "Off"],
    },
    {
      key: "Mandatory Answer",
      label: "Mandatory Answer",
      type: "select",
      opts: ["On", "Off"],
    },
    {
      key: "Negative Marking",
      label: "Negative Marking",
      type: "select",
      opts: ["On", "Off"],
    },
    {
      key: "Partial Scoring",
      label: "Partial Scoring",
      type: "select",
      opts: ["On", "Off"],
    },
    {
      key: "Question Navigation",
      label: "Navigation Mode",
      type: "select",
      opts: ["Free", "Sequential"],
    },
    {
      key: "Allow Back",
      label: "Allow Back",
      type: "select",
      opts: ["On", "Off"],
    },
    {
      key: "Mark for Review",
      label: "Mark for Review",
      type: "select",
      opts: ["On", "Off"],
    },
    {
      key: "Auto Next Question",
      label: "Auto Next",
      type: "select",
      opts: ["On", "Off"],
    },
    {
      key: "Auto Submit",
      label: "Auto Submit",
      type: "select",
      opts: ["On", "Off"],
    },
    {
      key: "Pause / Resume Allowed",
      label: "Pause/Resume",
      type: "select",
      opts: ["On", "Off"],
    },
    {
      key: "Instant Answer",
      label: "Instant Answer",
      type: "select",
      opts: ["Off", "On"],
    },
    {
      key: "Show Hint",
      label: "Show Hint",
      type: "select",
      opts: ["On", "Off"],
    },
    {
      key: "Final Result",
      label: "Show Final Result",
      type: "select",
      opts: ["On", "Off"],
    },
    {
      key: "Question Wise Result",
      label: "Q-Wise Result",
      type: "select",
      opts: ["On", "Off"],
    },
  ];

  function render(main) {
    const configs = State.get("quizConfigs");
    const setup = State.get("setup");
    const questions = State.get("questions");
    const filtered = Filters.applyFilters(questions, setup);

    main.innerHTML = `
      <div class="animate-up setup-container" style="max-width:1100px; margin:0 auto; padding-top:var(--sp-2xl)">
        ${UI.stepsHtml(
          ["Select Topics", "Filters", "Config", "Quiz Themes"],
          2
        )}
        
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:var(--sp-lg)">
           <div>
              <h4 style="font-size:0.7rem; font-weight:900; color:var(--accent-primary); text-transform:uppercase; letter-spacing:1px; margin-bottom:4px">Engine Parameters</h4>
              <h1 style="font-size:2rem; font-weight:900; color:var(--text-primary); letter-spacing:-0.03em; margin:0">Session Configuration</h1>
              <p style="color:var(--text-muted); font-size:0.95rem; margin-top:4px"><strong>${filtered.length}</strong> questions ready.</p>
           </div>
           <div>${UI.backBtn("Filters")}</div>
        </div>

        <div style="display:flex; flex-direction:column; gap:20px;">
          <div class="glass-stage" style="padding:20px">
            <p class="section-label">Preset Profiles</p>
            <div id="preset-chips" class="preset-grid">
              ${configs.map(c => `
                <div class="preset-card" onclick="selectPreset(this,'${c["Quiz Settings Title"]}')" data-preset="${c["Quiz Settings Title"]}">
                   <div class="preset-icon" style="font-size:1.2rem">⚡</div>
                   <span class="preset-name">${c["Quiz Settings Title"]}</span>
                </div>`).join("")}
              <div class="preset-card custom" onclick="selectPreset(this,'custom')" data-preset="custom">
                <div class="preset-icon" style="font-size:1.2rem">⚙️</div>
                <span class="preset-name">Custom</span>
              </div>
            </div>
          </div>
          
          <div id="config-detail"></div>
        </div>

        <div class="setup-footer">
          <div class="setup-footer-content">
            <button class="btn btn-primary btn-lg" id="start-btn" onclick="startQuiz()" disabled style=" font-size:1.1rem; border-radius:12px">
              Initialize Assessment Engine →
            </button>
          </div>
        </div>
      </div>
      <style>
        .preset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 6px; margin-top:16px; }
        .preset-card { 
          background: var(--bg-surface); border: 2px solid var(--border-color); border-radius: var(--radius-xs); 
          padding: 6px; text-align: center; cursor: pointer; transition: 0.3s;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
        }
        .preset-card:hover { transform: translateY(-4px); border-color: var(--accent-primary); box-shadow: 0 10px 20px -5px var(--accent-shadow); }
        .preset-card.selected { background: var(--accent-muted); border-color: var(--accent-primary); }
        .preset-card.custom { border-style: dashed; }
        .preset-icon { font-size: 1.5rem; }
        .preset-name { font-weight: 800; font-size: 0.95rem; }
        .section-label { font-size: 0.75rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; }
        .glass-stage { background: var(--bg-elevated); padding: 32px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); }
        .config-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px; opacity: 0; animation: fadeIn 0.5s forwards; }
        .config-item { background: var(--bg-surface); padding: 6px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 4px; }
        .config-label { font-size: 0.65rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .config-val { font-size: 1.1rem; font-weight: 900; color: var(--text-primary); }
        
        @media (max-width: 768px) {
           .setup-container > div:nth-child(2) { flex-direction: column; align-items: flex-start !important; gap: 15px; }
           .config-grid { grid-template-columns: repeat(2, 1fr); }
           .preset-grid { grid-template-columns: repeat(2, 1fr); }
           .glass-stage { padding: 15px; }
        }
      </style>
    `;

    // Auto-select first preset if available
    if (configs.length) {
      const first = document.querySelector("#preset-chips .preset-card");
      if (first) setTimeout(() => first.click(), 50);
    }
  }

  window.selectPreset = (el, name) => {
    document
      .querySelectorAll("#preset-chips .preset-card")
      .forEach((c) => c.classList.remove("selected"));
    el.classList.add("selected");
    State.merge("setup", { quizConfig: name });
    renderConfigDetail(name);
    document.getElementById("start-btn").disabled = false;
  };

  function renderConfigDetail(name) {
    const configs = State.get("quizConfigs");
    const detail = document.getElementById("config-detail");

    if (name === "custom") {
      detail.innerHTML = `
        <div class="config-grid">
          ${PRESET_FIELDS.map(
            (f) => `
            <div class="config-item">
              <label class="config-label">${f.label}</label>
              ${
                f.type === "select"
                  ? `<select id="cfg-${f.key.replace(/\s+/g, '')}" class="form-control" style="background:none; border:none; padding:0; font-weight:900; font-size:1.1rem">
                     ${f.opts.map((o) => `<option>${o}</option>`).join("")}
                   </select>`
                  : `<input id="cfg-${f.key.replace(/\s+/g, '')}" class="form-control" type="${f.type}" value="0" style="background:none; border:none; padding:0; font-weight:900; font-size:1.1rem">`
              }
            </div>`
          ).join("")}
        </div>
      `;
    } else {
      const cfg = configs.find((c) => c["Quiz Settings Title"] === name) || {};
      const rows = PRESET_FIELDS.filter((f) => cfg[f.key] !== undefined);
      detail.innerHTML = `
        <div class="config-grid">
          ${rows
            .map(
              (f) => `
            <div class="config-item">
              <p class="config-label">${f.label}</p>
              <p class="config-val">${cfg[f.key] || "—"}</p>
            </div>`
            )
            .join("")}
        </div>
      `;
    }
  }

  function resolveConfig() {
    const setup = State.get("setup");
    const name = setup.quizConfig;
    if (name === "custom") {
      const cfg = {};
      PRESET_FIELDS.forEach((f) => {
        const el = document.getElementById("cfg-" + f.key.replace(/\s+/g, ''));
        if (el) cfg[f.key] = el.value;
      });
      return cfg;
    }
    const configs = State.get("quizConfigs");
    return configs.find((c) => c["Quiz Settings Title"] === name) || {};
  }

  window.startQuiz = async () => {
    const setup = State.get("setup");
    const questions = State.get("questions");
    const config = resolveConfig();
    const filtered = Filters.applyFilters(questions, setup);

    if (!filtered.length) {
      UI.toast("No questions match your filters", "warn");
      return;
    }

    // Section Order (Question Shuffling)
    const sectionOrder = config["Section Order"] || "Fixed";
    let finalQs = [...filtered];
    if (sectionOrder === "Random") {
      finalQs = Filters.shuffle(finalQs);
    }

    // Shuffle options if configured
    const randomOpts = (config["Random Options"] || "On") === "On";
    const preparedQs = finalQs.map((q) => {
      if (!randomOpts) return q;
      const choices = QuestionRenderer.getChoices(q);
      const shuffled = Filters.shuffle([...choices]);
      const newQ = { ...q };
      // Map back to Choice1, Choice2, etc. (up to 6)
      shuffled.forEach((c, i) => {
        newQ["Choice" + (i + 1)] = c;
      });
      return newQ;
    });

    State.merge("setup", { finalConfig: config, preparedQs: preparedQs });
    UI.pushPage("setup-template");
  };

  return { render };
})();

// ============================================================
//  Template Selection Page
// ============================================================
const PageSetupTemplate = (() => {
  const TEMPLATES = [
    {
      id: "sat",
      name: "SAT Style",
      desc: "Clean academic layout with left question map and purple accents.",
      icon: "🎓",
    },
    {
      id: "quizpro-dark",
      name: "QuizPro Studio",
      desc: "Dual-pane dark mode interface with teal highlights and deep focus.",
      icon: "🌃",
    },
    {
      id: "editorial",
      name: "Modern Editorial",
      desc: "Elegant serif typography with a minimalist question sidebar.",
      icon: "📖",
    },
    {
      id: "vibrant",
      name: "Vibrant Quiz",
      desc: "Dynamic, colorful mobile-first UI with rounded buttons and soft shadows.",
      icon: "✨",
    },
    {
      id: "default",
      name: "Standard Pro",
      desc: "The classic balanced layout with sticky progress and navigation.",
      icon: "🎯",
    },
  ];

  function render(main) {
    const setup = State.get("setup");
    const selected = setup.template || "default";

    main.innerHTML = `
      <div class="animate-up setup-container" style="max-width:1200px; margin:0 auto; padding: var(--sp-2xl) var(--sp-lg)">
        ${UI.stepsHtml(
          ["Select Topics", "Filters", "Config", "Quiz Themes"],
          3
        )}

        <div class="setup-header-simple">
           <div class="header-text">
              <h1 class="setup-title">Interface Selection</h1>
              <p class="setup-subtitle">Calibrate the interaction model for your current assessment</p>
           </div>
           <div class="header-actions">${UI.backBtn("Config")}</div>
        </div>

        <div class="config-grid-layout">
           <!-- LEFT: Name & Info -->
           <div class="config-side-panel">
              <div class="setup-compact-card">
                 <div class="card-header">
                    <span class="dot"></span>
                    <h3>Sessional Identifier</h3>
                 </div>
                 <div class="form-group" style="padding:4px">
                    <input type="text" id="custom-quiz-name" class="form-control-pro" placeholder="Optional: Session Title..." 
                           value="${State.get("quiz")?.config?.["Quiz Settings Title"] || ""}">
                    <p class="input-hint">Enter a custom name to identify this attempt in your history.</p>
                 </div>
              </div>
              
              <div class="deployment-summary-badge">
                 <div class="badge-icon">⚡</div>
                 <div class="badge-content">
                    <span class="label">READY FOR DEPLOYMENT</span>
                    <span class="val">${setup.preparedQs.length} Synchronized Items</span>
                 </div>
              </div>
           </div>

           <!-- RIGHT: Theme Gallery -->
           <div class="config-main-panel">
              <div class="theme-gallery-grid">
                ${TEMPLATES.map(t => `
                  <div class="theme-pro-card ${t.id === selected ? "active" : ""}" 
                       onclick="PageSetupTemplate.select('${t.id}')">
                    <div class="card-indicator">${t.id === selected ? "✓ ACTIVE" : ""}</div>
                    <div class="card-preview">
                       <span class="icon">${t.icon}</span>
                    </div>
                    <div class="card-body">
                       <h4 class="title">${t.name}</h4>
                       <p class="desc">${t.desc}</p>
                    </div>
                  </div>`).join("")}
              </div>
           </div>
        </div>

        <!-- NEW FLOATING LAUNCH CARD -->
        <div class="launch-strip-container">
           <div class="launch-strip">
              <div class="strip-details">
                 <p class="strip-meta">READY TO INITIALIZE</p>
                 <h3 class="strip-title">Platform Architecture: <span style="color:var(--accent-primary)">${TEMPLATES.find(t=>t.id===selected)?.name || 'Standard'}</span></h3>
              </div>
              <div class="strip-actions">
                 <button class="btn-study-pro" id="study-launch-btn" onclick="PageSetupTemplate.launchQuiz('study')">
                    🧠 Study Mode
                 </button>
                 <button class="btn-launch-pro" id="launch-btn" onclick="PageSetupTemplate.launchQuiz()">
                    🚀 Launch Session
                 </button>
              </div>
           </div>
        </div>
      </div>

      <style>
        .setup-header-simple { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; }
        .setup-title { font-size: 2.8rem; font-weight: 900; letter-spacing: -0.05em; color: var(--text-primary); margin: 0; line-height: 1; }
        .setup-subtitle { color: var(--text-muted); font-size: 1.1rem; margin-top: 8px; font-weight: 500; }

        .config-grid-layout { display: grid; grid-template-columns: 320px 1fr; gap: 40px; margin-bottom: 120px; }
        
        .setup-compact-card { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 20px; padding: 24px; box-shadow: var(--shadow-sm); }
        .card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
        .card-header .dot { width: 8px; height: 8px; background: var(--accent-primary); border-radius: 50%; box-shadow: 0 0 10px var(--accent-shadow); }
        .card-header h3 { font-size: 0.8rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }
        
        .form-control-pro { width: 100%; background: var(--bg-elevated); border: 1px solid var(--border-color); border-radius: 12px; padding: 14px; font-size: 1rem; font-weight: 700; color: var(--text-primary); transition: 0.3s var(--ease); }
        .form-control-pro:focus { border-color: var(--accent-primary); box-shadow: 0 0 0 4px var(--accent-primary-transparent); outline: none; }
        .input-hint { font-size: 0.75rem; color: var(--text-muted); margin-top: 10px; line-height: 1.4; }

        .deployment-summary-badge { margin-top: 24px; display: flex; align-items: center; gap: 16px; padding: 20px; background: var(--accent-primary-transparent); border-radius: 20px; border: 1px solid var(--accent-primary-transparent); }
        .badge-icon { font-size: 1.8rem; }
        .badge-content { display: flex; flex-direction: column; }
        .badge-content .label { font-size: 0.65rem; font-weight: 900; color: var(--accent-primary); letter-spacing: 1px; }
        .badge-content .val { font-size: 1.1rem; font-weight: 800; color: var(--text-primary); }

        .theme-gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
        .theme-pro-card { background: var(--bg-surface); border: 2px solid var(--border-color); border-radius: 4px; padding: 0; cursor: pointer; transition: 0.4s var(--ease); overflow: hidden; position: relative; display: flex; flex-direction: column; }
        .theme-pro-card:hover { transform: translateY(-10px); border-color: var(--accent-primary); box-shadow: var(--shadow-lg); }
        .theme-pro-card.active { border-color: var(--accent-primary); background: var(--bg-elevated); box-shadow: var(--shadow-md); }
        
        .card-indicator { position: absolute; top: 12px; left: 12px; font-size: 0.6rem; font-weight: 900; background: var(--accent-primary); color: #fff; padding: 4px 10px; border-radius: 6px; letter-spacing: 1px; opacity: 0; transform: translateY(-10px); transition: 0.3s var(--ease); }
        .theme-pro-card.active .card-indicator { opacity: 1; transform: translateY(0); }
        
        .card-preview { height: 140px; background: var(--bg-elevated); display: grid; place-items: center; transition: 0.4s var(--ease); }
        .card-preview .icon { font-size: 4rem; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.1)); transition: 0.4s var(--ease); }
        .theme-pro-card:hover .card-preview .icon { transform: scale(1.15) rotate(-5deg); }
        .card-body { padding: 10px; }
        .card-body .title { font-size: 1.2rem; font-weight: 800; color: var(--text-primary); margin-bottom: 6px; }
        .card-body .desc { font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; margin: 0; }

        .launch-strip-container { position: fixed; bottom: 32px; left: 0; right: 0; display: flex; justify-content: center; z-index: 1000; padding: 0 20px; pointer-events: none; }
        .launch-strip { pointer-events: auto; width: 100%; max-width: 1000px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 24px; padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 30px 60px -12px rgba(0,0,0,0.2); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
        .strip-meta { font-size: 0.65rem; font-weight: 900; color: var(--accent-primary); letter-spacing: 2px; margin: 0; }
        .strip-title { font-size: 1.1rem; font-weight: 800; color: var(--text-primary); margin: 4px 0 0 0; }
        .strip-actions { display: flex; gap: 12px; }
        
        .btn-study-pro { background: var(--bg-elevated); border: 1px solid var(--border-color); color: var(--text-primary); padding: 14px 28px; border-radius: 12px; font-weight: 800; font-size: 0.9rem; transition: 0.3s; }
        .btn-launch-pro { background: var(--accent-primary); border: none; color: #fff; padding: 14px 40px; border-radius: 12px; font-weight: 800; font-size: 1rem; box-shadow: 0 10px 20px var(--accent-shadow); transition: 0.3s; }
        .btn-study-pro:hover, .btn-launch-pro:hover { transform: translateY(-4px); filter: brightness(1.1); }
        
        .spinner { border: 3px solid rgba(255,255,255,0.1); border-left-color: #fff; border-radius: 50%; width: 20px; height: 20px; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 900px) {
           .config-grid-layout { grid-template-columns: 1fr; gap: 24px; }
           .launch-strip { flex-direction: column; text-align: center; gap: 20px; padding: 24px; }
           .strip-actions { width: 100%; flex-direction: column; }
           .btn-study-pro, .btn-launch-pro { width: 100%; }
           .setup-title { font-size: 2.2rem; }
        }
      </style>
    `;
  }

  const obj = {
    render,
    select: (id) => {
      State.merge("setup", { template: id });
      render(document.getElementById("main-content"));
    },
    launchQuiz: async (mode) => {
      const setup = State.get("setup");
      const preparedQs = setup.preparedQs;
      const config = setup.finalConfig;
      const user = State.get("user");

      const btn = document.getElementById("launch-btn");
      const studyBtn = document.getElementById("study-launch-btn");
      
      if (mode === 'study' && studyBtn) {
         studyBtn.disabled = true;
         studyBtn.innerHTML = `<span class="flex items-center gap-sm justify-center"><div class="spinner"></div> Entering Study Mode...</span>`;
      } else if (btn) {
         btn.disabled = true;
         btn.innerHTML = `<span class="flex items-center gap-sm justify-center"><div class="spinner"></div> Launching Engine...</span>`;
      }

      const customName = document.getElementById("custom-quiz-name")?.value.trim();
      const finalQuizName = customName || (config["Quiz Settings Title"] || setup.quizConfig || "Custom Assessment");

      let fileId = null,
        resultFileId = null,
        attemptId = null;
      try {
        const attempt = await API.startAttempt({
          studentName: user ? `${user.name}` : "Guest",
          identifier: user ? user.identifier : "",
          quizName: finalQuizName,
          quizTopic: (setup.selectedTopics || []).join(", "),
          startTime: new Date().toISOString(),
        });
        fileId = attempt.fileId;
        resultFileId = attempt.resultFileId;
        attemptId = attempt.attemptId;
      } catch (e) {
        UI.toast(
          "Local session started (API not configured/failed: " +
            e.message +
            ")",
          "warn"
        );
      }

      State.set("quiz", {
        active: true,
        questions: preparedQs,
        currentIdx: 0,
        answers: {},
        startTime: Date.now(),
        pauseTime: null,
        totalPaused: 0,
        attemptId,
        fileId,
        resultFileId,
        config,
        template: mode === 'study' ? 'study' : (setup.template || "default"),
      });

      UI.pushPage("quiz");
    },
  };

  window.PageSetupTemplate = obj;
  return obj;
})();
