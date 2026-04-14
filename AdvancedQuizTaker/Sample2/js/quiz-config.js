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
      opts: ["On", "Off"],
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
            <button class="btn btn-primary btn-lg" id="start-btn" onclick="startQuiz()" disabled style="padding:16px 80px; font-size:1.1rem; border-radius:12px">
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
        .config-item { background: var(--bg-surface); padding: 6px; border-radius: var(--radius-md); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 4px; }
        .config-label { font-size: 0.65rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .config-val { font-size: 1.1rem; font-weight: 900; color: var(--text-primary); }
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
                  ? `<select id="cfg-${
                      f.key
                    }" class="form-control" style="background:none; border:none; padding:0; font-weight:900; font-size:1.1rem">
                     ${f.opts.map((o) => `<option>${o}</option>`).join("")}
                   </select>`
                  : `<input id="cfg-${f.key}" class="form-control" type="${f.type}" value="0" style="background:none; border:none; padding:0; font-weight:900; font-size:1.1rem">`
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
        const el = document.getElementById("cfg-" + f.key);
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

    // Shuffle options if configured
    const randomOpts = (config["Random Options"] || "On") === "On";
    const preparedQs = filtered.map((q) => {
      if (!randomOpts) return q;
      const choices = ["Choice1", "Choice2", "Choice3", "Choice4"]
        .map((k) => q[k])
        .filter(Boolean);
      const shuffled = Filters.shuffle(choices);
      const newQ = { ...q };
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
    const selected = State.get("setup").template || "default";

    main.innerHTML = `
      <div class="animate-up setup-container" style="max-width:1100px; margin:0 auto; padding-top:var(--sp-2xl)">
        ${UI.stepsHtml(
          ["Select Topics", "Filters", "Config", "Quiz Themes"],
          3
        )}

        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:var(--sp-xl)">
           <div>
             <h1 style="font-size:2.2rem; font-weight:900; color:var(--text-primary); letter-spacing:-0.04em; margin:0">App Interface</h1>
             <p style="color:var(--text-muted); font-size:0.95rem; margin-top:4px">Select an interaction model for your session</p>
           </div>
           <div>${UI.backBtn("Config")}</div>
        </div>

        <div style="display:flex; flex-direction:column; gap:32px">
          <div class="theme-gallery">
            ${TEMPLATES.map(t => `
              <div class="theme-card ${t.id === selected ? "active" : ""}" 
                   onclick="PageSetupTemplate.select('${t.id}')">
                ${t.id === selected ? `<div class="theme-selected-badge">ACTIVE</div>` : ""}
                <div class="theme-preview-box" style="height:120px">
                   <div class="theme-icon-large" style="font-size:3rem">${t.icon}</div>
                </div>
                <div class="theme-info" style="padding:16px">
                   <h3 class="theme-title" style="font-size:1.1rem">${t.name}</h3>
                   <p class="theme-desc" style="font-size:0.8rem">${t.desc}</p>
                </div>
              </div>`).join("")}
          </div>

          <div class="card" style="padding:24px; background:var(--bg-elevated); border-radius:16px; border:1px solid var(--border-color); margin-bottom:20px">
             <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
                <h4 style="font-weight:800; color:var(--text-primary); margin:0; font-size:0.9rem">Session Identification</h4>
                <div class="launch-label" style="opacity:0.6; font-size:0.6rem">DB KEY</div>
             </div>
             <div class="form-group">
                <input type="text" id="custom-quiz-name" class="form-control" placeholder="Optional: Name your session..." 
                       style="padding:12px; border-radius:10px; font-weight:700; font-size:1rem; border:1px solid var(--border-color); background:var(--bg-surface)">
             </div>
          </div>
        </div>

        <div class="setup-footer">
          <div class="setup-footer-content">
             <button class="btn btn-primary btn-lg" id="launch-btn" onclick="PageSetupTemplate.launchQuiz()" style="padding:16px 100px; font-size:1.2rem; border-radius:12px">
               🚀 Launch Session
             </button>
          </div>
        </div>
      </div>
      <style>
        .theme-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 5px; }
        .theme-card { 
          background: var(--bg-surface); border: 2px solid var(--border-color); border-radius: var(--radius-lg); 
          padding: 0; overflow: hidden; cursor: pointer; transition: 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex; flex-direction: column; position: relative;
        }
        .theme-card:hover { transform: translateY(-12px); border-color: var(--accent-primary); box-shadow: 0 30px 60px -15px var(--accent-shadow); }
        .theme-card.active { border-color: var(--accent-primary); box-shadow: 0 20px 40px -10px var(--accent-shadow); }
        .theme-preview-box { height: 160px; background: var(--bg-elevated); display: grid; place-items: center; position: relative; }
        .theme-icon-large { font-size: 5rem; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.1)); transition: 0.4s; }
        .theme-card:hover .theme-icon-large { transform: scale(1.1) rotate(-5deg); }
        .theme-info { padding: 24px; }
        .theme-title { font-size: 1.35rem; font-weight: 900; margin-bottom: 8px; color: var(--text-primary); }
        .theme-desc { font-size: 0.9rem; color: var(--text-muted); line-height: 1.5; margin: 0; }
        .theme-selected-badge { position: absolute; top: 16px; left: 16px; background: var(--accent-primary); color: #fff; padding: 4px 12px; border-radius: 6px; font-size: 10px; font-weight: 900; letter-spacing: 1px; z-index: 10; }
        
        .final-launch-card { 
          background: var(--text-primary); color: var(--bg-base); border-radius: 24px; padding: 48px; 
          display: flex; justify-content: space-between; align-items: center; gap: 40px;
          box-shadow: 0 40px 80px -20px rgba(0,0,0,0.3);
        }
        .launch-label { color: var(--accent-primary); font-size: 0.75rem; font-weight: 900; letter-spacing: 2px; }
        .launch-title { font-size: 2rem; font-weight: 900; margin-top: 8px; margin-bottom: 8px; }
        .launch-desc { font-size: 1rem; color: rgba(255,255,255,0.5); max-width: 500px; margin: 0; }
        .launch-button { padding: 20px 60px; font-size: 1.3rem; border-radius: 16px; background: var(--accent-primary); box-shadow: 0 15px 30px rgba(0,0,0,0.2) !important; }
        .launch-button:hover { transform: scale(1.05) translateY(-2px); }
      </style>
    `;
  }

  const obj = {
    render,
    select: (id) => {
      State.merge("setup", { template: id });
      render(document.getElementById("main-content"));
    },
    launchQuiz: async () => {
      const setup = State.get("setup");
      const preparedQs = setup.preparedQs;
      const config = setup.finalConfig;
      const user = State.get("user");

      const btn = document.getElementById("launch-btn");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<div class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block"></div> Launching...`;
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
        template: setup.template || "default",
      });

      UI.pushPage("quiz");
    },
  };

  window.PageSetupTemplate = obj;
  return obj;
})();
