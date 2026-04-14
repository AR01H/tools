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
      <div class="animate-up">
        ${UI.stepsHtml(['Select Topics','Filter Questions','Quiz Config'], 0)}
        
        <div style="margin-bottom:var(--sp-xl)">
          <h1 style="font-size:1.8rem; font-weight:700; color:var(--text-primary); margin-bottom:8px">Select Quiz Topics</h1>
          <p style="color:var(--text-muted); font-size:1rem;">Choose one or more topic areas to draw questions from.</p>
        </div>
        
        <div class="divider" style="margin-bottom:var(--sp-lg)"></div>
        
        <div id="topic-chips" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:var(--sp-xl); min-height:60px;"></div>
        
        <div style="display:flex; justify-content:flex-start; gap:var(--sp-md); align-items:center;">
           <button class="btn btn-primary" id="topics-next" onclick="topicsNext()">
             Continue to Filters →
           </button>
           <button class="btn btn-ghost btn-sm" onclick="selectAllTopics()">Select All</button>
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
      <div class="animate-up">
        ${UI.stepsHtml(['Select Topics','Filter Questions','Quiz Config'], 1)}
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--sp-xl)">
           <div>
             <h1 style="font-size:1.8rem; font-weight:700; color:var(--text-primary); margin-bottom:8px">Filter Questions</h1>
             <p style="color:var(--text-muted); font-size:1rem">Target exactly what you need from <strong>${questions.length}</strong> available parameters.</p>
           </div>
           <div>${UI.backBtn('Topics')}</div>
        </div>
        
        <div style="display:flex; flex-direction:column; gap:var(--sp-xl);">
           
           <!-- Filters List -->
           <div>
             <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--sp-sm);">
               <p class="form-label" style="margin:0">Category</p>
               <button class="btn btn-ghost btn-sm" onclick="selectAllChips('cat-chips')" style="padding:0; font-size:12px">All</button>
             </div>
             <div id="cat-chips" style="display:flex;flex-wrap:wrap;gap:8px"></div>
           </div>

           <div>
             <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--sp-sm);">
               <p class="form-label" style="margin:0">Sub Category <span class="text-muted" style="font-weight:normal; font-size:0.75rem">(updates with category)</span></p>
               <button class="btn btn-ghost btn-sm" onclick="selectAllChips('subcat-chips')" style="padding:0; font-size:12px">All</button>
             </div>
             <div id="subcat-chips" style="display:flex;flex-wrap:wrap;gap:8px"></div>
           </div>

           <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--sp-lg)">
             <div>
               <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--sp-sm);">
                 <p class="form-label" style="margin:0">Difficulty</p>
                 <button class="btn btn-ghost btn-sm" onclick="selectAllChips('diff-chips')" style="padding:0; font-size:12px">All</button>
               </div>
               <div id="diff-chips" style="display:flex;flex-wrap:wrap;gap:8px"></div>
             </div>
             <div>
               <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--sp-sm);">
                 <p class="form-label" style="margin:0">Question Type</p>
                 <button class="btn btn-ghost btn-sm" onclick="selectAllChips('type-chips')" style="padding:0; font-size:12px">All</button>
               </div>
               <div id="type-chips" style="display:flex;flex-wrap:wrap;gap:8px"></div>
             </div>
           </div>
           
           <div>
             <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--sp-sm);">
               <p class="form-label" style="margin:0">Tags</p>
               <button class="btn btn-ghost btn-sm" onclick="selectAllChips('tag-chips')" style="padding:0; font-size:12px">All</button>
             </div>
             <div id="tag-chips" style="display:flex;flex-wrap:wrap;gap:8px"></div>
           </div>
           
           <div class="divider" style="margin:var(--sp-sm) 0"></div>
           
           <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:var(--sp-md)">
              <div style="flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
                  <p class="form-label" style="margin:0">Question Limit</p>
                  <span id="q-preview" style="font-size:0.8rem; color:var(--text-muted); font-weight:500;">Calculating...</span>
                </div>
                <div style="display:flex; align-items:center; gap:var(--sp-md)">
                   <input type="range" id="q-count" min="1" max="${Math.min(questions.length,200)}" value="${setup.questionCount}" oninput="updateCount(this.value)" style="flex:1; accent-color:var(--accent-primary); height:4px;">
                   <span id="q-count-val" style="font-family:monospace; font-weight:bold; font-size:1.1rem; width:40px">${setup.questionCount}</span>
                </div>
              </div>
              
              <button class="btn btn-primary" onclick="filtersNext()" style="padding:10px 24px">
                Continue to Config →
              </button>
           </div>
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