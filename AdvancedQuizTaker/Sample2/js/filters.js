// ============================================================
//  QUIZ APP — filters.js
//  Question filtering, shuffling, setup pages
// ============================================================

const Filters = (() => {
  // ── Extract unique values from question list ───────────────
  function extract(questions, key) {
    const all = questions.flatMap((q) =>
      (q[key] ? q[key].toString().split(",") : [])
        .map((s) => s.trim())
        .filter(Boolean)
    );
    return [...new Set(all)].sort();
  }

  function applyFilters(questions, setup) {
    let q = [...questions];

    // Filter Status = Active only
    q = q.filter((r) => (r.Status || "Active").toLowerCase() === "active");

    if (setup.selectedCategory && setup.selectedCategory.length)
      q = q.filter((r) => {
        const cats = (r.Category || "")
          .toString()
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);
        return cats.some((c) => setup.selectedCategory.includes(c));
      });

    if (setup.selectedSubCat && setup.selectedSubCat.length)
      q = q.filter((r) => {
        const scats = (r["Sub Category"] || "")
          .toString()
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean);
        return scats.some((c) => setup.selectedSubCat.includes(c));
      });

    if (setup.selectedTags && setup.selectedTags.length)
      q = q.filter((r) =>
        setup.selectedTags.some((t) =>
          (r.Tags || "")
            .split(",")
            .map((x) => x.trim())
            .includes(t)
        )
      );

    if (setup.selectedDifficulty && setup.selectedDifficulty.length)
      q = q.filter((r) => setup.selectedDifficulty.includes(r.Difficulty));

    if (setup.selectedTypes && setup.selectedTypes.length)
      q = q.filter((r) => setup.selectedTypes.includes(r["Question Type"]));

    // Shuffle
    q = shuffle(q);

    // Limit count
    const count = parseInt(setup.questionCount) || q.length;
    return q.slice(0, count);
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function shuffleOptions(question) {
    // Returns question with randomised Choice order
    const choices = ["Choice1", "Choice2", "Choice3", "Choice4"]
      .map((k) => question[k])
      .filter(Boolean);
    const correct = (question["Correct Answer"] || "").split("|");
    // Map original correct values
    const shuffled = shuffle(choices);
    return { shuffled, correct };
  }

  return { extract, applyFilters, shuffle, shuffleOptions };
})();

// ============================================================
//  Page: Setup Topics
// ============================================================
const PageSetupTopics = (() => {
  const ICON_MAP = {
    docker: "🐳",
    javascript: "JS",
    python: "🐍",
    java: "☕",
    css: "🎨",
    html: "🌐",
    react: "⚛️",
    node: "🟢",
    database: "🗄️",
    cloud: "☁️",
    security: "🛡️",
    sample: "🧪",
    default: "📁",
  };

  function render(main) {
    const topics = State.get("topics");
    const sel = State.get("setup").selectedTopics || [];

    main.innerHTML = `
      <div class="animate-up setup-container" style="max-width:1100px; margin:0 auto; padding-top:var(--sp-2xl)">
        ${UI.stepsHtml(
          ["Select Topics", "Filters", "Config", "Quiz Themes"],
          0
        )}
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--sp-xl); border-bottom:1px solid var(--border-color); padding-bottom:var(--sp-md);flex-wrap:wrap;">
           <div>
              <h1 style="font-size:2.2rem; font-weight:900; letter-spacing:-0.05em; color:var(--text-primary); margin:0">Assessment Domains</h1>
              <p style="color:var(--text-secondary); font-size:0.95rem; margin-top:4px">Select specialized subjects to build your assessment.</p>
           </div>
           <div style="display:flex; gap:16px; align-items:center">
              <div class="review-input-group" style="width:300px">
                 <input type="text" id="topic-search" class="form-control" placeholder="Search domains..." oninput="PageSetupTopics.filter(this.value)">
              </div>
              <button class="btn btn-ghost btn-sm" onclick="selectAllTopics()" style="font-weight:700">Select All</button>
           </div>
        </div>

        <div id="topic-grid" class="topic-grid">
          ${topics
            .map((t) => {
              const isSelected = sel.includes(t.name);
              const icon =
                ICON_MAP[t.name.toLowerCase()] || ICON_MAP["default"];
              return `
              <div class="topic-card ${
                isSelected ? "selected" : ""
              }" onclick="PageSetupTopics.toggle(this, '${t.name}')">
                <div class="selected-badge">✓</div>
                <div class="topic-icon" style="font-size:2rem">${icon}</div>
                <div class="topic-name" style="font-size:0.95rem">${t.name}</div>
              </div>
            `;
            })
            .join("")}
        </div>

        <div class="setup-footer">
          <div class="setup-footer-content">
            <button class="btn btn-primary btn-lg" id="topics-next" onclick="topicsNext()" style=" font-size:1.1rem; border-radius:12px">
              Initialize Question Pool →
            </button>
          </div>
        </div>
      </div>
      <style>
        .topic-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 6px;
        }
        .topic-card {
          background: var(--bg-surface);
          border: 2px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 4px;
          text-align: center;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .topic-card:hover {
          transform: translateY(-8px);
          border-color: var(--accent-primary);
          box-shadow: 0 20px 40px -10px var(--accent-shadow);
        }
        .topic-card.selected {
          border-color: var(--accent-primary);
          background: var(--accent-muted);
          transform: scale(1.03);
          box-shadow: 0 10px 20px -5px var(--accent-shadow);
        }
        .topic-card .topic-icon {
          font-size: 3.2rem;
          margin-bottom: 8px;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
          transition: transform 0.3s var(--ease);
        }
        .topic-card:hover .topic-icon { transform: scale(1.15) rotate(5deg); }
        .topic-card .topic-name { font-weight: 800; font-size: 1.1rem; color: var(--text-primary); }
        .topic-card .topic-meta { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .topic-card .selected-badge {
          position: absolute; top: 12px; right: 12px;
          width: 24px; height: 24px; border-radius: 50%;
          background: var(--accent-primary); color: #fff;
          display: grid; place-items: center; font-size: 12px; font-weight: 800;
          opacity: 0; transform: scale(0.5); transition: all 0.3s var(--ease);
        .topic-card.selected .selected-badge { opacity: 1; transform: scale(1); }
        
        @media (max-width: 768px) {
          .setup-container > div:nth-child(2) { flex-direction: column !important; align-items: stretch !important; gap: 15px; text-align: left; }
          .setup-container > div:nth-child(2) > div:last-child { flex-direction: column; width: 100%; }
          .review-input-group { width: 100% !important; }
        }
      </style>`;
  }

  function toggle(el, name) {
    el.classList.toggle("selected");
  }

  window.selectAllTopics = () => {
    document
      .querySelectorAll(".topic-card")
      .forEach((c) => c.classList.add("selected"));
  };

  window.topicsNext = async () => {
    const sel = [...document.querySelectorAll(".topic-card.selected")].map(
      (c) => c.querySelector(".topic-name").textContent
    );
    if (!sel.length) {
      UI.toast("Please select at least one domain", "warn");
      return;
    }
    State.merge("setup", { selectedTopics: sel });

    UI.setLoading(true, "Initializing questions pool...");
    try {
      const questions = await API.getQuestions(sel);
      State.set("questions", questions);
      UI.setLoading(false);
      UI.pushPage("setup-filters");
    } catch (e) {
      UI.setLoading(false);
      UI.toast(e.message, "error");
    }
  };

  const filter = (query) => {
    const q = query.toLowerCase();
    document.querySelectorAll(".topic-card").forEach((card) => {
      const name = card.querySelector(".topic-name").textContent.toLowerCase();
      card.style.display = name.includes(q) ? "flex" : "none";
    });
  };

  return { render, toggle, filter };
})();

// ============================================================
//  Page: Setup Filters
// ============================================================
const PageSetupFilters = (() => {
  function render(main) {
    const questions = State.get("questions");
    const setup = State.get("setup");
    const cats = Filters.extract(questions, "Category");
    const tags = Filters.extract(questions, "Tags");
    const diffs = Filters.extract(questions, "Difficulty");
    const types = Filters.extract(questions, "Question Type");

    main.innerHTML = `
      <div class="animate-up setup-container" style="max-width:1100px; margin:0 auto">
        ${UI.stepsHtml(
          ["Select Topics", "Filters", "Config", "Quiz Themes"],
          1
        )}
        
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:var(--sp-xl)">
           <div>
              <h4 style="font-size:0.7rem; font-weight:900; color:var(--accent-primary); text-transform:uppercase; letter-spacing:1px; margin-bottom:4px">Granular Control</h4>
              <h1 style="font-size:2rem; font-weight:900; color:var(--text-primary); letter-spacing:-0.03em; margin:0">Precision Refinement</h1>
              <p style="color:var(--text-muted); font-size:0.9rem; margin-top:4px">Calibrate the question pool parameters</p>
           </div>
           <div>${UI.backBtn("Topics")}</div>
        </div>
        
        <div style="display:flex; flex-direction:column; gap:16px;">
           
           <div class="grid-2" style="gap:20px">
              <!-- Category Filter -->
              <div class="setup-compact-section" style="padding:16px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:12px">
                  <span class="filter-label" style="font-size:0.85rem">Categories</span>
                  <input type="text" placeholder="Search..." class="form-control" style="font-size:10px; padding:4px 8px; height:24px; flex:1" oninput="PageSetupFilters.filterChips('cat-chips', this.value)">
                  <button class="btn btn-ghost btn-sm" onclick="selectAllChips('cat-chips')" style="font-size:10px">Select All</button>
                </div>
                <div id="cat-chips" class="chip-container"></div>
              </div>
  
              <!-- Sub-category Filter -->
              <div class="setup-compact-section" style="padding:16px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:12px">
                  <span class="filter-label" style="font-size:0.85rem">Specializations</span>
                  <input type="text" placeholder="Search..." class="form-control" style="font-size:10px; padding:4px 8px; height:24px; flex:1" oninput="PageSetupFilters.filterChips('subcat-chips', this.value)">
                  <button class="btn btn-ghost btn-sm" onclick="selectAllChips('subcat-chips')" style="font-size:10px">Select All</button>
                </div>
                <div id="subcat-chips" class="chip-container" style="max-height:100px; overflow-y:auto"></div>
              </div>
           </div>

           <!-- Meta Filters -->
           <div style="display:grid; grid-template-columns: 1fr 1fr 1.5fr; gap:16px;">
             <div class="setup-compact-section" style="padding:16px">
               <span class="filter-label" style="font-size:0.85rem; margin-bottom:12px">Difficulty Level</span>
               <div id="diff-chips" class="chip-container compact"></div>
             </div>
             <div class="setup-compact-section" style="padding:16px">
               <span class="filter-label" style="font-size:0.85rem; margin-bottom:12px">Question Format</span>
               <div id="type-chips" class="chip-container compact"></div>
             </div>
             <div class="setup-compact-section" style="padding:16px">
               <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; gap:12px">
                  <span class="filter-label" style="font-size:0.85rem">Advanced Tags</span>
                  <input type="text" placeholder="Search..." class="form-control" style="font-size:10px; padding:4px 8px; height:24px; flex:1" oninput="PageSetupFilters.filterChips('tag-chips', this.value)">
                  <button class="btn btn-ghost btn-sm" onclick="clearAllChips('tag-chips')" style="font-size:10px">Clear</button>
               </div>
               <div id="tag-chips" class="chip-container compact scrollable-chips" style="max-height:60px"></div>
             </div>
           </div>
        </div>

        <div class="setup-footer">
          <div class="setup-footer-content" style="display:flex; justify-content:space-between; align-items:center; width:100%; max-width:1100px; gap:40px">
             <div style="flex:1">
               <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:8px">
                  <div>
                    <span style="font-size:0.65rem; font-weight:900; color:var(--text-muted); text-transform:uppercase">Session Magnitude</span>
                    <div style="display:none;">
                      <span id="q-count-val" style="font-family:var(--font-mono); font-weight:900; font-size:1.8rem; color:var(--accent-primary)">${setup.questionCount}</span>
                    </div>
                  </div>
                  <span id="q-preview" class="pool-badge" style="background:var(--accent-primary-transparent); color:var(--accent-primary); border:1px solid var(--accent-primary-transparent)">Calculating pool...</span>
               </div>
               <input type="range" id="q-count" min="1" max="${Math.min(questions.length,200)}" value="${setup.questionCount}" oninput="updateCount(this.value)" class="fancy-slider">
             </div>
             <button class="btn btn-primary btn-lg" onclick="filtersNext()" style="padding:16px 60px; font-size:1.1rem; border-radius:12px">
                Configure Engine →
             </button>
          </div>
        </div>
      </div>
      <style>
        .filter-group-card { background: var(--bg-surface); border: 2px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px; transition: border-color 0.3s; }
        .filter-group-card:hover { border-color: var(--text-muted); }
        .filter-group-card.small { padding: 16px 20px; }
        .filter-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .filter-header-main { display: flex; gap: 12px; align-items: center; }
        .filter-icon { font-size: 1.6rem; background: var(--bg-elevated); width: 44px; height: 44px; display: grid; place-items: center; border-radius: 12px; }
        .filter-label { font-size: 1.05rem; font-weight: 800; color: var(--text-primary); display: block; }
        .filter-desc { font-size: 0.8rem; color: var(--text-muted); margin: 0; }
        .filter-label-small { font-size: 0.7rem; font-weight: 900; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 12px; }
        .chip-container { display: flex; flex-wrap: wrap; gap: 8px; }
        .chip-container.compact { gap: 6px; }
        .scrollable-chips { max-height: 80px; overflow-y: auto; padding-right: 8px; scrollbar-width: thin; }
        .action-summary-bar { 
          background: var(--text-primary); color: var(--bg-base); border-radius: var(--radius-lg); padding: 32px; 
          display: flex; gap: 40px; align-items: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        }
        .action-summary-bar .filter-label-small { color: rgba(255,255,255,0.4); }
        .pool-badge { background: rgba(255,255,255,0.1); color: #fff; font-size: 0.7rem; font-weight: 800; padding: 4px 12px; border-radius: 99px; }
        .fancy-slider::-webkit-slider-thumb { appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--accent-primary); cursor: pointer; border: 4px solid var(--text-primary); box-shadow: 0 0 0 2px var(--accent-primary); }
        
        @media (max-width: 768px) {
          .setup-container > div:nth-child(2) { flex-direction: column !important; align-items: flex-start !important; gap: 15px; }
          .setup-container > div:nth-child(3) > div:last-child { grid-template-columns: 1fr !important; }
          .setup-footer-content { flex-direction: column !important; gap: 0px !important; align-items: stretch !important; text-align: left; }
          .setup-footer-content > div { width: 100% !important; }
        }
      </style>`;

    // Build chips
    UI.makeChips(
      document.getElementById("cat-chips"),
      cats,
      setup.selectedCategory
    );
    UI.makeChips(
      document.getElementById("tag-chips"),
      tags,
      setup.selectedTags
    );
    UI.makeChips(
      document.getElementById("diff-chips"),
      diffs,
      setup.selectedDifficulty
    );
    UI.makeChips(
      document.getElementById("type-chips"),
      types,
      setup.selectedTypes
    );

    // Initial subcat
    updateSubcats();

    // When category changes, update subcat
    document.getElementById("cat-chips").addEventListener("click", () => {
      setTimeout(updateSubcats, 50);
      updatePreview();
    });
    ["tag-chips", "diff-chips", "type-chips"].forEach((id) => {
      document
        .getElementById(id)
        .addEventListener("click", () => setTimeout(updatePreview, 50));
    });
    updatePreview();
  }

  function updateSubcats() {
    const questions = State.get("questions");
    const selCats = UI.getSelectedChips(document.getElementById("cat-chips"));
    let filtered = selCats.length
      ? questions.filter((q) => {
          const cats = (q.Category || "")
            .toString()
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean);
          return cats.some((c) => selCats.includes(c));
        })
      : questions;
    const subcats = Filters.extract(filtered, "Sub Category");
    const prevSel = UI.getSelectedChips(
      document.getElementById("subcat-chips")
    );
    UI.makeChips(
      document.getElementById("subcat-chips"),
      subcats,
      prevSel.filter((s) => subcats.includes(s))
    );
    document
      .getElementById("subcat-chips")
      .addEventListener("click", () => setTimeout(updatePreview, 50));
  }

  function updatePreview() {
    const questions = State.get("questions");
    const setup = buildSetup();
    const filtered = Filters.applyFilters(questions, {
      ...setup,
      questionCount: 9999,
    });
    const count = parseInt(document.getElementById("q-count").value);
    const show = Math.min(filtered.length, count);
    document.getElementById(
      "q-preview"
    ).textContent = `${filtered.length} questions match your filters → ${show} will be selected`;
  }

  function buildSetup() {
    return {
      selectedCategory: UI.getSelectedChips(
        document.getElementById("cat-chips")
      ),
      selectedSubCat: UI.getSelectedChips(
        document.getElementById("subcat-chips")
      ),
      selectedTags: UI.getSelectedChips(document.getElementById("tag-chips")),
      selectedDifficulty: UI.getSelectedChips(
        document.getElementById("diff-chips")
      ),
      selectedTypes: UI.getSelectedChips(document.getElementById("type-chips")),
      questionCount: parseInt(document.getElementById("q-count").value),
    };
  }

  window.updateCount = (val) => {
    document.getElementById("q-count-val").textContent = val;
    updatePreview(true); // pass true to skip slider update loop
  };

  window.selectAllChips = (id) => {
    document
      .querySelectorAll(`#${id} .chip`)
      .forEach((c) => {
         if (window.getComputedStyle(c).display !== "none") {
            c.classList.add("selected");
         }
      });
    updatePreview();
  };

  window.clearAllChips = (id) => {
    document
      .querySelectorAll(`#${id} .chip`)
      .forEach((c) => c.classList.remove("selected"));
    updatePreview();
  };

  function filterChips(containerId, query) {
    const q = query.toLowerCase();
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll(".chip").forEach(chip => {
      const text = chip.textContent.toLowerCase();
      chip.style.display = text.includes(q) ? "inline-flex" : "none";
    });
  }

  function updatePreview(skipSlider = false) {
    const questions = State.get("questions");
    const setup = buildSetup();
    const filtered = Filters.applyFilters(questions, {
      ...setup,
      questionCount: 9999,
    });
    
    // Update SLIDER constraints on the fly
    const slider = document.getElementById("q-count");
    const countVal = document.getElementById("q-count-val");
    if (slider && !skipSlider) {
       const maxMatch = filtered.length || 0;
       slider.max = Math.max(1, maxMatch);
       if (parseInt(slider.value) > maxMatch) {
          slider.value = maxMatch;
          if (countVal) countVal.textContent = maxMatch;
       }
    }

    const count = parseInt(slider?.value || 0);
    const show = Math.min(filtered.length, count);
    
    const preview = document.getElementById("q-preview");
    if (preview) {
       preview.innerHTML = `MATCHING: <b style="color:#fff">${filtered.length}</b> • PREPARING: <b style="color:var(--accent-primary)">${show} ITEMS</b>`;
    }
  }

  window.filtersNext = () => {
    const s = buildSetup();
    State.merge("setup", s);
    UI.pushPage("setup-config");
  };

  return { render, filterChips, updatePreview };
})();
