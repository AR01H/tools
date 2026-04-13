// ============================================================
//  QUIZ APP — quiz-config.js
//  Setup Config page + quiz session management
// ============================================================

const PageSetupConfig = (() => {
  const PRESET_FIELDS = [
    { key: 'Quiz Time',          label: 'Total Time (sec)',   type: 'number' },
    { key: 'Question Time',      label: 'Per Question Time',  type: 'number' },
    { key: 'Section Order',      label: 'Section Order',      type: 'select', opts: ['Fixed','Random'] },
    { key: 'Adaptive Mode',      label: 'Adaptive Mode',      type: 'select', opts: ['On','Off'] },
    { key: 'Random Options',     label: 'Random Options',     type: 'select', opts: ['On','Off'] },
    { key: 'Allow Option Change',label: 'Allow Change',       type: 'select', opts: ['On','Off'] },
    { key: 'Mandatory Answer',   label: 'Mandatory Answer',   type: 'select', opts: ['On','Off'] },
    { key: 'Negative Marking',   label: 'Negative Marking',   type: 'select', opts: ['On','Off'] },
    { key: 'Partial Scoring',    label: 'Partial Scoring',    type: 'select', opts: ['On','Off'] },
    { key: 'Question Navigation',label: 'Navigation Mode',    type: 'select', opts: ['Free','Sequential'] },
    { key: 'Allow Back',         label: 'Allow Back',         type: 'select', opts: ['On','Off'] },
    { key: 'Mark for Review',    label: 'Mark for Review',    type: 'select', opts: ['On','Off'] },
    { key: 'Auto Next Question', label: 'Auto Next',          type: 'select', opts: ['On','Off'] },
    { key: 'Auto Submit',        label: 'Auto Submit',        type: 'select', opts: ['On','Off'] },
    { key: 'Pause / Resume Allowed', label: 'Pause/Resume',  type: 'select', opts: ['On','Off'] },
    { key: 'Instant Answer',     label: 'Instant Answer',     type: 'select', opts: ['On','Off'] },
    { key: 'Show Hint',          label: 'Show Hint',          type: 'select', opts: ['On','Off'] },
    { key: 'Final Result',       label: 'Show Final Result',  type: 'select', opts: ['On','Off'] },
    { key: 'Question Wise Result', label: 'Q-Wise Result',   type: 'select', opts: ['On','Off'] },
  ];

  function render(main) {
    const configs = State.get('quizConfigs');
    const setup   = State.get('setup');
    const questions = State.get('questions');
    const filtered = Filters.applyFilters(questions, setup);

    main.innerHTML = `
      <div class="animate-up" style="max-width:720px;margin:0 auto">
        ${UI.stepsHtml(['Select Topics','Filter Questions','Quiz Config'], 2)}
        ${UI.backBtn('Filters')}
        <h1 class="section-title">Quiz Configuration</h1>
        <p class="section-sub"><strong>${filtered.length}</strong> questions ready to go</p>
        <div class="divider"></div>

        <div style="display:flex;flex-direction:column;gap:var(--sp-xl)">
          <!-- Preset selector -->
          <div class="card">
            <p class="form-label" style="margin-bottom:var(--sp-md)">📋 Preset Mode</p>
            <div id="preset-chips" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:var(--sp-md)">
              ${configs.map(c => `
                <div class="chip" onclick="selectPreset(this,'${c['Quiz Settings Title']}')"
                  data-preset="${c['Quiz Settings Title']}">
                  ${c['Quiz Settings Title']}
                </div>`).join('')}
              <div class="chip" onclick="selectPreset(this,'custom')" data-preset="custom">
                ✎ Custom
              </div>
            </div>
            <p class="text-xs text-muted">Select a preset or create a custom configuration</p>
          </div>

          <!-- Config summary / custom editor -->
          <div id="config-detail"></div>

          <!-- Start button -->
          <button class="btn btn-primary btn-lg btn-full" id="start-btn" onclick="startQuiz()" disabled>
            🚀 Start Quiz
          </button>
        </div>
      </div>`;

    // Auto-select first preset if available
    if (configs.length) {
      const first = document.querySelector('#preset-chips .chip');
      if (first) first.click();
    }
  }

  window.selectPreset = (el, name) => {
    document.querySelectorAll('#preset-chips .chip').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    State.merge('setup', { quizConfig: name });
    renderConfigDetail(name);
    document.getElementById('start-btn').disabled = false;
  };

  function renderConfigDetail(name) {
    const configs = State.get('quizConfigs');
    const detail  = document.getElementById('config-detail');

    if (name === 'custom') {
      detail.innerHTML = `
        <div class="card">
          <p class="form-label" style="margin-bottom:var(--sp-md)">Custom Configuration</p>
          <div class="grid-2" style="gap:var(--sp-md)">
            ${PRESET_FIELDS.map(f => `
              <div class="form-group">
                <label class="form-label">${f.label}</label>
                ${f.type === 'select'
                  ? `<select id="cfg-${f.key}" class="form-control">
                       ${f.opts.map(o => `<option>${o}</option>`).join('')}
                     </select>`
                  : `<input id="cfg-${f.key}" class="form-control" type="${f.type}" value="0">`
                }
              </div>`).join('')}
          </div>
        </div>`;
    } else {
      const cfg = configs.find(c => c['Quiz Settings Title'] === name) || {};
      const rows = PRESET_FIELDS.filter(f => cfg[f.key] !== undefined);
      detail.innerHTML = `
        <div class="card">
          <p class="form-label" style="margin-bottom:var(--sp-md)">📌 ${name} — Settings</p>
          <div class="grid-3" style="gap:var(--sp-sm)">
            ${rows.map(f => `
              <div style="background:var(--bg-hover);padding:10px;border-radius:var(--radius-sm)">
                <p class="text-xs text-muted">${f.label}</p>
                <p class="font-bold text-sm" style="margin-top:2px">${cfg[f.key] || '—'}</p>
              </div>`).join('')}
          </div>
        </div>`;
    }
  }

  function resolveConfig() {
    const setup = State.get('setup');
    const name  = setup.quizConfig;
    if (name === 'custom') {
      const cfg = {};
      PRESET_FIELDS.forEach(f => {
        const el = document.getElementById('cfg-' + f.key);
        if (el) cfg[f.key] = el.value;
      });
      return cfg;
    }
    const configs = State.get('quizConfigs');
    return configs.find(c => c['Quiz Settings Title'] === name) || {};
  }

  window.startQuiz = async () => {
    const setup     = State.get('setup');
    const questions = State.get('questions');
    const config    = resolveConfig();
    const filtered  = Filters.applyFilters(questions, setup);

    if (!filtered.length) { UI.toast('No questions match your filters', 'warn'); return; }

    // Shuffle options if configured
    const randomOpts = (config['Random Options'] || 'On') === 'On';
    const preparedQs = filtered.map(q => {
      if (!randomOpts) return q;
      const choices = ['Choice1','Choice2','Choice3','Choice4'].map(k=>q[k]).filter(Boolean);
      const shuffled = Filters.shuffle(choices);
      const newQ = { ...q };
      shuffled.forEach((c, i) => { newQ['Choice'+(i+1)] = c; });
      return newQ;
    });

    // Start attempt on server
    const user = State.get('user');
    let fileId = null, resultFileId = null, attemptId = null;
    try {
      const attempt = await API.startAttempt({
        studentName: user ? `${user.name}` : 'Guest',
        quizName:    config['Quiz Settings Title'] || setup.quizConfig,
        quizTopic:   setup.selectedTopics.join(', '),
        startTime:   new Date().toISOString(),
      });
      fileId       = attempt.fileId;
      resultFileId = attempt.resultFileId;
      attemptId    = attempt.attemptId;
    } catch(e) {
      UI.toast('Could not save attempt: ' + e.message, 'warn');
    }

    State.set('quiz', {
      active:true,
      questions: preparedQs,
      currentIdx: 0,
      answers: {},
      startTime: Date.now(),
      pauseTime: null,
      totalPaused: 0,
      attemptId, fileId, resultFileId,
      config,
    });

    UI.pushPage('quiz');
  };

  return { render };
})();