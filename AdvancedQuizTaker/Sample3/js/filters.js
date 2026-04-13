// ============================================================
//  filters.js  — Setup Wizard (Steps 1-5)
// ============================================================

const Filters = (() => {

  // ── Step rendering ────────────────────────────────────────
  function renderSteps() {
    const setup = State.getSetup();
    const step  = setup.step;
    document.querySelectorAll(".step-item").forEach((el, i) => {
      el.classList.remove("active", "done");
      if (i + 1 === step) el.classList.add("active");
      if (i + 1 < step)  el.classList.add("done");
    });
    // Show correct step panel
    document.querySelectorAll(".setup-step").forEach(el => el.classList.remove("active"));
    const active = document.getElementById(`setup-step-${step}`);
    if (active) active.classList.add("active");
  }

  // ── STEP 1: User Info ─────────────────────────────────────
  function renderStep1() {
    const user = State.getUser();
    const form = document.getElementById("setup-step-1");
    form.innerHTML = `
      <div class="mb-4">
        <h4 class="fw-700 mb-1">Welcome to QuizMaster Pro</h4>
        <p class="text-muted text-sm">Enter your details to get started</p>
      </div>
      <div class="form-group">
        <label class="qm-label">Full Name *</label>
        <input type="text" id="user-name" class="qm-input" placeholder="John Doe" value="${user.name}">
      </div>
      <div class="form-group">
        <label class="qm-label">Date of Birth *</label>
        <input type="date" id="user-dob" class="qm-input" value="${user.dob}">
      </div>
      <div class="form-group">
        <label class="qm-label">Phone / Email *</label>
        <input type="text" id="user-contact" class="qm-input" placeholder="+91 9999999999 or user@email.com" value="${user.contact}">
      </div>
      <div class="d-flex justify-between align-center mt-4">
        <button class="btn-qm btn-qm-secondary" onclick="UI.showPage('home')">
          <i class="fas fa-arrow-left"></i> Back
        </button>
        <button class="btn-qm btn-qm-primary" onclick="Filters.goStep(2)">
          Continue <i class="fas fa-arrow-right"></i>
        </button>
      </div>`;
  }

  // ── STEP 2: Topic Selection ───────────────────────────────
  async function renderStep2() {
    const setup = State.getSetup();
    const container = document.getElementById("setup-step-2");
    container.innerHTML = `
      <div class="mb-4">
        <h4 class="fw-700 mb-1">Select Quiz Topics</h4>
        <p class="text-muted text-sm">Choose one or more subject folders</p>
      </div>
      <div id="topics-loading">${UI.skeletonRows(4, 50)}</div>
      <div id="topics-list" class="chip-group" style="display:none"></div>
      <div class="d-flex justify-between align-center mt-4">
        <button class="btn-qm btn-qm-secondary" onclick="Filters.goStep(1)">
          <i class="fas fa-arrow-left"></i> Back
        </button>
        <button class="btn-qm btn-qm-primary" id="step2-next" disabled onclick="Filters.goStep(3)">
          Continue <i class="fas fa-arrow-right"></i>
        </button>
      </div>`;

    try {
      const { topics } = await API.getTopics();
      document.getElementById("topics-loading").style.display = "none";
      const list = document.getElementById("topics-list");
      list.style.display = "flex";

      // All button
      const allChip = document.createElement("span");
      allChip.className = "chip chip-all" + (setup.selectedTopics.length === 0 ? " selected" : "");
      allChip.textContent = "All Topics";
      allChip.onclick = () => {
        State.set({ setup: { selectedTopics: [] } });
        renderTopicChips(topics);
        document.getElementById("step2-next").disabled = false;
      };
      list.appendChild(allChip);

      topics.forEach(t => {
        const chip = document.createElement("span");
        chip.className = "chip" + (setup.selectedTopics.includes(t.name) ? " selected" : "");
        chip.innerHTML = `<i class="fas fa-folder me-1"></i>${t.name}`;
        chip.onclick = () => toggleTopicChip(t.name, topics, list);
        chip.dataset.topic = t.name;
        list.appendChild(chip);
      });

      document.getElementById("step2-next").disabled = false;
    } catch (e) {
      document.getElementById("topics-loading").innerHTML =
        `<div class="text-danger text-sm"><i class="fas fa-exclamation-triangle me-1"></i>${e.message}</div>`;
    }
  }

  function toggleTopicChip(name, allTopics, list) {
    const setup = State.getSetup();
    let selected = [...setup.selectedTopics];
    if (selected.includes(name)) {
      selected = selected.filter(t => t !== name);
    } else {
      selected.push(name);
    }
    State.set({ setup: { selectedTopics: selected } });
    renderTopicChips(allTopics);
  }

  function renderTopicChips(topics) {
    const setup  = State.getSetup();
    const chips  = document.querySelectorAll("[data-topic]");
    chips.forEach(c => {
      c.classList.toggle("selected", setup.selectedTopics.includes(c.dataset.topic));
    });
    // All chip
    const allChip = document.querySelector(".chip-all");
    if (allChip) allChip.classList.toggle("selected", setup.selectedTopics.length === 0);
  }

  // ── STEP 3: Filters ───────────────────────────────────────
  async function renderStep3() {
    const setup = State.getSetup();
    const container = document.getElementById("setup-step-3");
    container.innerHTML = `
      <div class="mb-4">
        <h4 class="fw-700 mb-1">Filter Questions</h4>
        <p class="text-muted text-sm">Narrow down questions (leave blank for all)</p>
      </div>
      <div id="filters-loading">${UI.skeletonRows(6, 44)}</div>
      <div id="filters-form" style="display:none"></div>
      <div class="d-flex justify-between align-center mt-4">
        <button class="btn-qm btn-qm-secondary" onclick="Filters.goStep(2)">
          <i class="fas fa-arrow-left"></i> Back
        </button>
        <button class="btn-qm btn-qm-primary" onclick="Filters.goStep(4)">
          Continue <i class="fas fa-arrow-right"></i>
        </button>
      </div>`;

    try {
      const meta = await API.getFilterMeta(setup.selectedTopics);
      State.set({ setup: { availableMeta: meta } });
      document.getElementById("filters-loading").style.display = "none";
      const form = document.getElementById("filters-form");
      form.style.display = "block";
      form.innerHTML = buildFiltersForm(meta, setup.filters);
      attachFilterEvents(meta);
    } catch (e) {
      document.getElementById("filters-loading").innerHTML =
        `<div class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i>${e.message}</div>`;
    }
  }

  function buildFiltersForm(meta, current) {
    return `
      <div class="form-group">
        <label class="qm-label">Category</label>
        <div class="chip-group" id="filter-categories">
          ${chipAll("cat-all", current.categories.length === 0)}
          ${meta.categories.map(c => chipItem("cat", c, current.categories.includes(c))).join("")}
        </div>
      </div>
      <div class="form-group">
        <label class="qm-label">Sub Category</label>
        <div class="chip-group" id="filter-subcategories">
          ${chipAll("subcat-all", current.subCategories.length === 0)}
          ${meta.subCategories.map(c => chipItem("subcat", c, current.subCategories.includes(c))).join("")}
        </div>
      </div>
      <div class="form-group">
        <label class="qm-label">Difficulty</label>
        <div class="chip-group" id="filter-difficulty">
          ${chipAll("diff-all", current.difficulty.length === 0)}
          ${(meta.difficulties || ["easy","medium","hard"]).map(d =>
            chipItem("diff", d, current.difficulty.includes(d),
              d === "easy" ? "var(--success)" : d === "hard" ? "var(--danger)" : "var(--warning)")
          ).join("")}
        </div>
      </div>
      <div class="form-group">
        <label class="qm-label">Question Types</label>
        <div class="chip-group" id="filter-types">
          ${chipAll("type-all", current.questionTypes.length === 0)}
          ${meta.questionTypes.map(t => chipItem("qtype", t, current.questionTypes.includes(t))).join("")}
        </div>
      </div>
      <div class="form-group">
        <label class="qm-label">Tags</label>
        <div class="chip-group" id="filter-tags">
          ${chipAll("tag-all", current.tags.length === 0)}
          ${meta.tags.map(t => chipItem("tag", t, current.tags.includes(t))).join("")}
        </div>
      </div>
      <div class="form-group">
        <label class="qm-label">Number of Questions</label>
        <div class="d-flex align-center gap-3">
          <input type="range" class="range-input" id="q-count-range" min="5" max="100" step="5" value="${current.count}">
          <span class="range-value font-mono fw-700" id="q-count-val">${current.count}</span>
        </div>
      </div>`;
  }

  function chipAll(id, selected) {
    return `<span class="chip chip-all${selected ? " selected" : ""}" data-filter-all="${id}" onclick="Filters.selectAll('${id}')">All</span>`;
  }

  function chipItem(group, val, selected, color = "") {
    const style = color ? `style="--chip-color:${color}"` : "";
    return `<span class="chip${selected ? " selected" : ""}" data-filter-group="${group}" data-val="${val}" ${style} onclick="Filters.toggleFilterChip('${group}','${val}')">${val}</span>`;
  }

  function attachFilterEvents(meta) {
    // Question count slider
    const slider = document.getElementById("q-count-range");
    if (slider) {
      slider.addEventListener("input", () => {
        document.getElementById("q-count-val").textContent = slider.value;
        const setup = State.getSetup();
        State.set({ setup: { filters: { ...setup.filters, count: parseInt(slider.value) } } });
      });
    }
    // Subcategory depends on category — attach category watch
    attachCategoryWatch(meta);
  }

  function attachCategoryWatch(meta) {
    const catChips = document.querySelectorAll("[data-filter-group='cat']");
    catChips.forEach(chip => {
      chip.addEventListener("click", () => {
        setTimeout(() => {
          const setup = State.getSetup();
          const selCats = setup.filters.categories;
          const subcatContainer = document.getElementById("filter-subcategories");
          if (!subcatContainer) return;
          const filteredSubs = selCats.length === 0
            ? meta.subCategories
            : meta.subCategories.filter((s, i) => {
                // filter based on meta relationship (simple approach)
                return true; // in real use, map from question data
              });
          subcatContainer.innerHTML =
            chipAll("subcat-all", setup.filters.subCategories.length === 0) +
            filteredSubs.map(c => chipItem("subcat", c, setup.filters.subCategories.includes(c))).join("");
        }, 50);
      });
    });
  }

  // ── Filter chip interactions ──────────────────────────────
  function selectAll(id) {
    const group = id.replace("-all", "");
    const map = {
      "cat": "categories", "subcat": "subCategories",
      "diff": "difficulty", "qtype": "questionTypes", "tag": "tags"
    };
    // De-select all chips in this group
    const key = Object.keys(map).find(k => id.startsWith(k));
    if (key) {
      const stateKey = map[key];
      const setup = State.getSetup();
      State.set({ setup: { filters: { ...setup.filters, [stateKey]: [] } } });
      document.querySelectorAll(`[data-filter-group="${key}"]`).forEach(c => c.classList.remove("selected"));
      document.querySelector(`[data-filter-all="${id}"]`)?.classList.add("selected");
    }
  }

  function toggleFilterChip(group, val) {
    const map = { "cat": "categories", "subcat": "subCategories", "diff": "difficulty", "qtype": "questionTypes", "tag": "tags" };
    const stateKey = map[group];
    if (!stateKey) return;
    const setup = State.getSetup();
    let arr = [...(setup.filters[stateKey] || [])];
    if (arr.includes(val)) {
      arr = arr.filter(v => v !== val);
    } else {
      arr.push(val);
    }
    State.set({ setup: { filters: { ...setup.filters, [stateKey]: arr } } });
    // Update chips
    document.querySelectorAll(`[data-filter-group="${group}"]`).forEach(c => {
      c.classList.toggle("selected", arr.includes(c.dataset.val));
    });
    // Remove "all" selection
    const allKey = Object.keys(map).find(k => map[k] === stateKey) + "-all";
    document.querySelector(`[data-filter-all="${allKey}"]`)?.classList.toggle("selected", arr.length === 0);
  }

  // ── STEP 4: Quiz Configuration ────────────────────────────
  async function renderStep4() {
    const setup = State.getSetup();
    const container = document.getElementById("setup-step-4");
    container.innerHTML = `
      <div class="mb-4">
        <h4 class="fw-700 mb-1">Quiz Configuration</h4>
        <p class="text-muted text-sm">Choose a preset or customize every setting</p>
      </div>
      <div id="configs-loading">${UI.skeletonRows(3, 56)}</div>
      <div id="configs-form" style="display:none"></div>
      <div class="d-flex justify-between align-center mt-4">
        <button class="btn-qm btn-qm-secondary" onclick="Filters.goStep(3)">
          <i class="fas fa-arrow-left"></i> Back
        </button>
        <button class="btn-qm btn-qm-primary" onclick="Filters.goStep(5)">
          Continue <i class="fas fa-arrow-right"></i>
        </button>
      </div>`;

    try {
      const { configs } = await API.getQuizConfigs();
      State.set({ setup: { quizConfigs: configs } });
      document.getElementById("configs-loading").style.display = "none";
      const form = document.getElementById("configs-form");
      form.style.display = "block";
      form.innerHTML = buildConfigForm(configs, setup.selectedConfig);
      attachConfigEvents(configs);
    } catch (e) {
      document.getElementById("configs-loading").innerHTML =
        `<div class="text-danger"><i class="fas fa-exclamation-triangle me-1"></i>${e.message}</div>`;
    }
  }

  function buildConfigForm(configs, selected) {
    const presetCards = configs.map(c => {
      const isSelected = selected === c["Quiz Settings Title"];
      return `
        <div class="qm-card config-preset-card${isSelected ? " selected-card" : ""}" 
             style="cursor:pointer;padding:16px;border:2px solid ${isSelected ? "var(--accent)" : "var(--border)"};transition:all .2s"
             onclick="Filters.selectPreset('${c["Quiz Settings Title"]}')">
          <div class="d-flex justify-between align-center">
            <div>
              <div class="fw-700">${c["Quiz Settings Title"]}</div>
              <div class="text-muted text-sm mt-1">
                ${c["Quiz Time"] > 0 ? `⏱ ${Math.round(c["Quiz Time"]/60)} min` : "⏱ No limit"} &nbsp;
                ${c["Negative Marking"] === "On" ? "➖ Negative marking" : ""} &nbsp;
                ${c["Instant Answer"] === "On" ? "⚡ Instant feedback" : ""}
              </div>
            </div>
            <div style="width:24px;height:24px;border-radius:50%;border:2px solid ${isSelected ? "var(--accent)" : "var(--border)"}; background:${isSelected ? "var(--accent)" : "transparent"};display:grid;place-items:center;color:#fff;font-size:12px;">
              ${isSelected ? '<i class="fas fa-check"></i>' : ""}
            </div>
          </div>
        </div>`;
    }).join("");

    return `
      <div class="mb-3">
        <label class="qm-label">Select Preset</label>
        <div style="display:grid;gap:10px">${presetCards}</div>
      </div>
      <div class="qm-card config-preset-card${selected === "custom" ? " selected-card" : ""}" 
           style="cursor:pointer;padding:16px;border:2px solid ${selected === "custom" ? "var(--accent)" : "var(--border)"};"
           onclick="Filters.selectPreset('custom')">
        <div class="fw-700"><i class="fas fa-sliders-h me-2"></i>Custom Configuration</div>
        <div class="text-muted text-sm mt-1">Manually configure every setting</div>
      </div>
      <div id="custom-config-form" style="display:${selected === "custom" ? "block" : "none"};margin-top:16px">
        ${buildCustomConfigForm()}
      </div>`;
  }

  function buildCustomConfigForm() {
    const fields = [
      ["Quiz Time (seconds, 0=unlimited)", "cfg-quiz-time", "number", "0"],
      ["Question Time Limit (seconds, 0=none)", "cfg-q-time", "number", "0"],
    ];
    const toggles = [
      ["Random Options",     "cfg-random-options",   "On"],
      ["Allow Option Change","cfg-allow-change",      "On"],
      ["Mandatory Answer",   "cfg-mandatory",         "Off"],
      ["Negative Marking",   "cfg-negative",          "Off"],
      ["Partial Scoring",    "cfg-partial",           "Off"],
      ["Allow Back",         "cfg-allow-back",        "On"],
      ["Mark for Review",    "cfg-mark-review",       "On"],
      ["Auto Next Question", "cfg-auto-next",         "Off"],
      ["Auto Submit",        "cfg-auto-submit",       "Off"],
      ["Pause/Resume",       "cfg-pause-resume",      "On"],
      ["Instant Answer",     "cfg-instant",           "Off"],
      ["Instant Feedback",   "cfg-instant-feedback",  "Off"],
      ["Show Hint",          "cfg-show-hint",         "On"],
      ["Final Result",       "cfg-final-result",      "On"],
    ];
    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${fields.map(([label, id, type, def]) => `
          <div class="form-group">
            <label class="qm-label">${label}</label>
            <input type="${type}" id="${id}" class="qm-input" value="${def}">
          </div>`).join("")}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
        ${toggles.map(([label, id, def]) => `
          <div class="d-flex justify-between align-center" style="background:var(--bg-primary);padding:10px 14px;border-radius:8px;border:1px solid var(--border)">
            <span class="text-sm">${label}</span>
            <div class="form-check form-switch mb-0">
              <input class="form-check-input" type="checkbox" role="switch" id="${id}" ${def === "On" ? "checked" : ""}>
            </div>
          </div>`).join("")}
      </div>`;
  }

  function attachConfigEvents(configs) {
    // Will be called after DOM build
  }

  function selectPreset(name) {
    State.set({ setup: { selectedConfig: name } });
    // Update visual
    document.querySelectorAll(".config-preset-card").forEach(el => {
      el.style.border = "2px solid var(--border)";
    });
    const customForm = document.getElementById("custom-config-form");
    if (customForm) customForm.style.display = name === "custom" ? "block" : "none";
    // Rebuild to reflect selection (simple approach)
    const setup = State.getSetup();
    renderStep4();
  }

  // ── STEP 5: Quiz Theme ────────────────────────────────────
  function renderStep5() {
    const container = document.getElementById("setup-step-5");
    const themes = [
      { id: "default", label: "Default",  bg: "linear-gradient(135deg,#6366f1,#06b6d4)" },
      { id: "ocean",   label: "Ocean",    bg: "linear-gradient(135deg,#0ea5e9,#0284c7)" },
      { id: "forest",  label: "Forest",   bg: "linear-gradient(135deg,#10b981,#059669)" },
      { id: "sunset",  label: "Sunset",   bg: "linear-gradient(135deg,#f97316,#ef4444)" },
      { id: "royal",   label: "Royal",    bg: "linear-gradient(135deg,#8b5cf6,#6d28d9)" },
      { id: "midnight",label: "Midnight", bg: "linear-gradient(135deg,#1e2433,#0d1117)" },
      { id: "crimson", label: "Crimson",  bg: "linear-gradient(135deg,#ef4444,#be123c)" },
    ];
    const current = State.getUI().quizTheme;
    container.innerHTML = `
      <div class="mb-4">
        <h4 class="fw-700 mb-1">Choose Quiz Theme</h4>
        <p class="text-muted text-sm">Pick a visual style for your quiz experience</p>
      </div>
      <div class="theme-tiles">
        ${themes.map(t => `
          <div class="theme-tile${current === t.id ? " active" : ""}" 
               style="background:${t.bg}" 
               onclick="Filters.selectQuizTheme('${t.id}','${t.bg}')">
            ${t.label}
          </div>`).join("")}
      </div>
      <div class="d-flex justify-between align-center mt-4">
        <button class="btn-qm btn-qm-secondary" onclick="Filters.goStep(4)">
          <i class="fas fa-arrow-left"></i> Back
        </button>
        <button class="btn-qm btn-qm-primary btn-qm-lg" onclick="Filters.startQuiz()">
          <i class="fas fa-play"></i> Start Quiz
        </button>
      </div>`;
  }

  function selectQuizTheme(id) {
    State.setQuizTheme(id);
    localStorage.setItem("qm_quiz_theme", id);
    document.querySelectorAll(".theme-tile").forEach(el => el.classList.remove("active"));
    event.currentTarget.classList.add("active");
  }

  // ── Step navigation ───────────────────────────────────────
  async function goStep(n) {
    // Validate current step before advancing
    if (n > State.getSetup().step) {
      if (!validateCurrentStep()) return;
    }
    State.set({ setup: { step: n } });
    renderSteps();
    switch (n) {
      case 1: renderStep1(); break;
      case 2: renderStep2(); break;
      case 3: renderStep3(); break;
      case 4: renderStep4(); break;
      case 5: renderStep5(); break;
    }
  }

  function validateCurrentStep() {
    const step = State.getSetup().step;
    if (step === 1) {
      const name    = document.getElementById("user-name")?.value.trim();
      const dob     = document.getElementById("user-dob")?.value;
      const contact = document.getElementById("user-contact")?.value.trim();
      if (!name || !dob || !contact) {
        UI.toast("Please fill in all fields.", "error"); return false;
      }
      State.set({ user: { name, dob, contact } });
    }
    return true;
  }

  // ── Collect custom config ─────────────────────────────────
  function collectCustomConfig() {
    const get   = (id)  => document.getElementById(id);
    const bool  = (id)  => get(id)?.checked ? "On" : "Off";
    const val   = (id)  => parseInt(get(id)?.value || 0);
    return {
      "Quiz Settings Title": "Custom",
      "Quiz Time":           val("cfg-quiz-time"),
      "Question Time":       val("cfg-q-time"),
      "Random Options":      bool("cfg-random-options"),
      "Allow Option Change": bool("cfg-allow-change"),
      "Mandatory Answer":    bool("cfg-mandatory"),
      "Negative Marking":    bool("cfg-negative"),
      "Partial Scoring":     bool("cfg-partial"),
      "Allow Back":          bool("cfg-allow-back"),
      "Mark for Review":     bool("cfg-mark-review"),
      "Auto Next Question":  bool("cfg-auto-next"),
      "Auto Submit":         bool("cfg-auto-submit"),
      "Pause / Resume Allowed": bool("cfg-pause-resume"),
      "Instant Answer":      bool("cfg-instant"),
      "Instant Answer Feedback": bool("cfg-instant-feedback"),
      "Show Hint":           bool("cfg-show-hint"),
      "Final Result":        bool("cfg-final-result"),
      "Question Wise Result":"On",
      "Question Navigation": "Free",
      "Section Order":       "Fixed",
      "Tracking":            "On",
      "Adaptive Mode":       "Off",
      "Adaptive Retake":     "Off",
    };
  }

  // ── START QUIZ ────────────────────────────────────────────
  async function startQuiz() {
    const btn = document.querySelector("#setup-step-5 .btn-qm-primary");
    UI.btnLoading(btn, true);

    try {
      const setup = State.getSetup();
      const user  = State.getUser();

      // Get final config
      let config;
      if (setup.selectedConfig === "custom") {
        config = collectCustomConfig();
      } else {
        config = setup.quizConfigs.find(c => c["Quiz Settings Title"] === setup.selectedConfig)
               || setup.quizConfigs[0]
               || {};
      }

      // Fetch questions
      const { questions } = await API.getQuestions({
        topics:        setup.selectedTopics,
        categories:    setup.filters.categories,
        subCategories: setup.filters.subCategories,
        tags:          setup.filters.tags,
        difficulty:    setup.filters.difficulty,
        questionTypes: setup.filters.questionTypes,
        count:         setup.filters.count,
      });

      if (!questions || questions.length === 0) {
        UI.toast("No questions found with selected filters.", "warning");
        UI.btnLoading(btn, false);
        return;
      }

      // Start attempt on backend
      const startTime = new Date().toISOString();
      let attemptId = "local_" + Date.now();
      if (API.isConfigured()) {
        try {
          const res = await API.startAttempt({
            studentName: user.name, dob: user.dob, contact: user.contact,
            quizName: config["Quiz Settings Title"] || "Quiz",
            quizTopic: setup.selectedTopics.join(", ") || "All",
            startTime,
          });
          attemptId = res.attemptId;
        } catch (_) {}
      }

      // Set quiz state
      State.set({
        quiz: {
          active: true, attemptId,
          questions, current: 0,
          answers: {}, markedReview: new Set(),
          startTime: Date.now(), endTime: null,
          elapsedSec: 0, paused: false,
          config,
        }
      });

      UI.showPage("quiz");
      Quiz.initQuiz();
    } catch (e) {
      UI.toast(e.message, "error");
    }
    UI.btnLoading(btn, false);
  }

  // ── Init setup page ───────────────────────────────────────
  function init() {
    State.set({ setup: { step: 1 } });
    renderSteps();
    renderStep1();
  }

  return {
    init, goStep, renderSteps,
    selectPreset, selectQuizTheme,
    toggleFilterChip, selectAll,
    startQuiz,
  };
})();
