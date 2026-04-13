// ============================================================
//  QUIZ APP — filters.js
//  Question filtering, shuffling, setup pages
// ============================================================

const Filters = (() => {

  // ── Extract unique values from question list ───────────────
  function extract(questions, key) {
    return [...new Set(questions.map(q => q[key]).filter(Boolean))].sort();
  }

  function applyFilters(questions, setup) {
    let q = [...questions];

    // Filter Status = Active only
    q = q.filter(r => (r.Status || 'Active').toLowerCase() === 'active');

    if (setup.selectedCategory.length)
      q = q.filter(r => setup.selectedCategory.includes(r.Category));

    if (setup.selectedSubCat.length)
      q = q.filter(r => setup.selectedSubCat.includes(r['Sub Category']));

    if (setup.selectedTags.length)
      q = q.filter(r => setup.selectedTags.some(t => (r.Tags || '').split(',').map(x=>x.trim()).includes(t)));

    if (setup.selectedDifficulty.length)
      q = q.filter(r => setup.selectedDifficulty.includes(r.Difficulty));

    if (setup.selectedTypes.length)
      q = q.filter(r => setup.selectedTypes.includes(r['Question Type']));

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
    const choices = ['Choice1','Choice2','Choice3','Choice4']
      .map(k => question[k]).filter(Boolean);
    const correct = (question['Correct Answer'] || '').split('|');
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
  function render(main) {
    const topics = State.get('topics');
    main.innerHTML = `
      <div class="animate-up" style="margin:0 auto">
        ${UI.stepsHtml(['Select Topics','Filter Questions','Quiz Config'], 0)}
        <h1 class="section-title">Select Quiz Topics</h1>
        <p class="section-sub">Choose one or more topic areas to draw questions from</p>
        <div class="divider"></div>
        <div id="topic-chips" style="display:flex;flex-wrap:wrap;gap:var(--sp-sm);margin-bottom:var(--sp-xl)"></div>
        <div style="display:flex;gap:var(--sp-md);justify-content:space-between;align-items:center;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm" onclick="selectAllTopics()">Select All</button>
          <button class="btn btn-primary" id="topics-next" onclick="topicsNext()">
            Continue to Filters →
          </button>
        </div>
      </div>`;

    const container = document.getElementById('topic-chips');
    const sel = State.get('setup').selectedTopics;
    UI.makeChips(container, topics.map(t => t.name), sel, true);
  }

  window.selectAllTopics = () => {
    document.querySelectorAll('#topic-chips .chip').forEach(c => c.classList.add('selected'));
  };

  window.topicsNext = async () => {
    const sel = UI.getSelectedChips(document.getElementById('topic-chips'));
    if (!sel.length) { UI.toast('Select at least one topic', 'warn'); return; }
    State.merge('setup', { selectedTopics: sel });

    UI.setLoading(true, 'Loading questions…');
    try {
      const questions = await API.getQuestions(sel);
      State.set('questions', questions);
      UI.setLoading(false);
      UI.pushPage('setup-filters');
    } catch(e) {
      UI.setLoading(false);
      UI.toast(e.message, 'error');
    }
  };

  return { render };
})();

// ============================================================
//  Page: Setup Filters
// ============================================================
const PageSetupFilters = (() => {
  function render(main) {
    const questions = State.get('questions');
    const setup     = State.get('setup');
    const cats      = Filters.extract(questions, 'Category');
    const tags      = Filters.extract(questions, 'Tags');
    const diffs     = Filters.extract(questions, 'Difficulty');
    const types     = Filters.extract(questions, 'Question Type');

    main.innerHTML = `
      <div class="animate-up" style="margin:0 auto">
        ${UI.stepsHtml(['Select Topics','Filter Questions','Quiz Config'], 1)}
        ${UI.backBtn('Topics')}
        <h1 class="section-title">Filter Questions</h1>
        <p class="section-sub">Narrow down from <strong>${questions.length}</strong> available questions</p>
        <div class="divider"></div>

        <div style="display:flex;flex-direction:column;gap:var(--sp-xl)">

          <div>
            <div class="flex items-center justify-between" style="margin-bottom:var(--sp-sm)">
              <p class="form-label">Category</p>
              <button class="btn btn-ghost btn-sm" onclick="selectAllChips('cat-chips')">All</button>
            </div>
            <div id="cat-chips" style="display:flex;flex-wrap:wrap;gap:8px"></div>
          </div>

          <div>
            <div class="flex items-center justify-between" style="margin-bottom:var(--sp-sm)">
              <p class="form-label">Sub Category <span class="text-muted" style="font-size:.7rem">(updates with category)</span></p>
              <button class="btn btn-ghost btn-sm" onclick="selectAllChips('subcat-chips')">All</button>
            </div>
            <div id="subcat-chips" style="display:flex;flex-wrap:wrap;gap:8px"></div>
          </div>

          <div>
            <div class="flex items-center justify-between" style="margin-bottom:var(--sp-sm)">
              <p class="form-label">Tags</p>
              <button class="btn btn-ghost btn-sm" onclick="selectAllChips('tag-chips')">All</button>
            </div>
            <div id="tag-chips" style="display:flex;flex-wrap:wrap;gap:8px"></div>
          </div>

          <div class="grid-2">
            <div>
              <div class="flex items-center justify-between" style="margin-bottom:var(--sp-sm)">
                <p class="form-label">Difficulty</p>
                <button class="btn btn-ghost btn-sm" onclick="selectAllChips('diff-chips')">All</button>
              </div>
              <div id="diff-chips" style="display:flex;flex-wrap:wrap;gap:8px"></div>
            </div>
            <div>
              <div class="flex items-center justify-between" style="margin-bottom:var(--sp-sm)">
                <p class="form-label">Question Type</p>
                <button class="btn btn-ghost btn-sm" onclick="selectAllChips('type-chips')">All</button>
              </div>
              <div id="type-chips" style="display:flex;flex-wrap:wrap;gap:8px"></div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Number of Questions</label>
            <div style="display:flex;align-items:center;gap:var(--sp-md)">
              <input type="range" id="q-count" min="1" max="${Math.min(questions.length,200)}"
                value="${setup.questionCount}" oninput="updateCount(this.value)"
                style="flex:1;accent-color:var(--accent-primary)">
              <span id="q-count-val" class="font-mono font-bold" style="min-width:40px;text-align:right">${setup.questionCount}</span>
            </div>
            <div id="q-preview" class="text-xs text-muted" style="margin-top:4px"></div>
          </div>

          <button class="btn btn-primary btn-full" onclick="filtersNext()">
            Continue to Quiz Config →
          </button>
        </div>
      </div>`;

    // Build chips
    UI.makeChips(document.getElementById('cat-chips'),  cats,  setup.selectedCategory);
    UI.makeChips(document.getElementById('tag-chips'),  tags,  setup.selectedTags);
    UI.makeChips(document.getElementById('diff-chips'), diffs, setup.selectedDifficulty);
    UI.makeChips(document.getElementById('type-chips'), types, setup.selectedTypes);

    // Initial subcat
    updateSubcats();

    // When category changes, update subcat
    document.getElementById('cat-chips').addEventListener('click', () => {
      setTimeout(updateSubcats, 50);
      updatePreview();
    });
    ['tag-chips','diff-chips','type-chips'].forEach(id => {
      document.getElementById(id).addEventListener('click', () => setTimeout(updatePreview, 50));
    });
    updatePreview();
  }

  function updateSubcats() {
    const questions = State.get('questions');
    const selCats   = UI.getSelectedChips(document.getElementById('cat-chips'));
    let filtered    = selCats.length ? questions.filter(q => selCats.includes(q.Category)) : questions;
    const subcats   = Filters.extract(filtered, 'Sub Category');
    const prevSel   = UI.getSelectedChips(document.getElementById('subcat-chips'));
    UI.makeChips(document.getElementById('subcat-chips'), subcats, prevSel.filter(s => subcats.includes(s)));
    document.getElementById('subcat-chips').addEventListener('click', () => setTimeout(updatePreview, 50));
  }

  function updatePreview() {
    const questions = State.get('questions');
    const setup     = buildSetup();
    const filtered  = Filters.applyFilters(questions, { ...setup, questionCount: 9999 });
    const count     = parseInt(document.getElementById('q-count').value);
    const show      = Math.min(filtered.length, count);
    document.getElementById('q-preview').textContent =
      `${filtered.length} questions match your filters → ${show} will be selected`;
  }

  function buildSetup() {
    return {
      selectedCategory:  UI.getSelectedChips(document.getElementById('cat-chips')),
      selectedSubCat:    UI.getSelectedChips(document.getElementById('subcat-chips')),
      selectedTags:      UI.getSelectedChips(document.getElementById('tag-chips')),
      selectedDifficulty:UI.getSelectedChips(document.getElementById('diff-chips')),
      selectedTypes:     UI.getSelectedChips(document.getElementById('type-chips')),
      questionCount:     parseInt(document.getElementById('q-count').value),
    };
  }

  window.updateCount = (val) => {
    document.getElementById('q-count-val').textContent = val;
    updatePreview();
  };

  window.selectAllChips = (id) => {
    document.querySelectorAll(`#${id} .chip`).forEach(c => c.classList.add('selected'));
    updatePreview();
  };

  window.filtersNext = () => {
    const s = buildSetup();
    State.merge('setup', s);
    UI.pushPage('setup-config');
  };

  return { render };
})();