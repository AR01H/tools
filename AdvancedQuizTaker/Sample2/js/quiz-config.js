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
      <div class="animate-up">
        ${UI.stepsHtml(['Select Topics','Filter Questions','Quiz Config'], 2)}
        
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--sp-xl)">
           <div>
             <h1 style="font-size:1.8rem; font-weight:700; color:var(--text-primary); margin-bottom:8px">Quiz Configuration</h1>
             <p style="color:var(--text-muted); font-size:1rem"><strong>${filtered.length}</strong> questions ready. Select a preset or build custom.</p>
           </div>
           <div>${UI.backBtn('Filters')}</div>
        </div>

        <div style="display:flex; flex-direction:column; gap:var(--sp-lg); ">
          
          <div>
            <p class="form-label" style="margin-bottom:var(--sp-sm); margin-top:0">Preset Profiles</p>
            <div id="preset-chips" style="display:flex;flex-wrap:wrap;gap:8px">
              ${configs.map(c => `
                <div class="chip" onclick="selectPreset(this,'${c['Quiz Settings Title']}')" data-preset="${c['Quiz Settings Title']}">
                  ${c['Quiz Settings Title']}
                </div>`).join('')}
              <div class="chip" onclick="selectPreset(this,'custom')" data-preset="custom" style="border-style:dashed">
                Custom Manual
              </div>
            </div>
          </div>
          
          <div class="divider" style="margin:var(--sp-sm) 0"></div>

          <div id="config-detail" style="margin-bottom:var(--sp-md)"></div>
          
          <div style="display:flex; justify-content:flex-start">
            <button class="btn btn-primary" id="start-btn" onclick="startQuiz()" disabled style="padding:10px 32px">
              Start Session →
            </button>
          </div>
        </div>
      </div>
    `;

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
        <div class="grid-4" style="gap:var(--sp-sm)">
          ${PRESET_FIELDS.map(f => `
            <div style="display:flex; flex-direction:column; gap:4px">
              <label style="font-size:0.8rem; font-weight:600; color:var(--text-secondary); text-transform:uppercase;">${f.label}</label>
              ${f.type === 'select'
                ? `<select id="cfg-${f.key}" class="form-control" style="padding:4px 8px; font-size:0.9rem">
                     ${f.opts.map(o => `<option>${o}</option>`).join('')}
                   </select>`
                : `<input id="cfg-${f.key}" class="form-control" type="${f.type}" value="0" style="padding:4px 8px; font-size:0.9rem">`
              }
            </div>`).join('')}
        </div>
      `;
    } else {
      const cfg = configs.find(c => c['Quiz Settings Title'] === name) || {};
      const rows = PRESET_FIELDS.filter(f => cfg[f.key] !== undefined);
      detail.innerHTML = `
        <div class="grid-3" style="gap:var(--sp-sm)">
          ${rows.map(f => `
            <div style="background:var(--bg-hover); padding:8px 12px; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
              <p style="font-size:0.75rem; font-weight:600; color:var(--text-muted); text-transform:uppercase; margin-bottom:2px">${f.label}</p>
              <p style="font-weight:700; font-size:0.95rem; color:var(--text-primary)">${cfg[f.key] || '—'}</p>
            </div>`).join('')}
        </div>
      `;
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

    State.merge('setup', { finalConfig: config, preparedQs: preparedQs });
    UI.pushPage('setup-template');
  };

  return { render };
})();

// ============================================================
//  Template Selection Page
// ============================================================
const PageSetupTemplate = (() => {
  const TEMPLATES = [
    { id: 'default', name: 'QuizPro Standard', desc: 'The classic layout with top progress bar and full features.', icon: '🎯' },
    { id: 'sat',     name: 'SAT Format',       desc: 'Left sidebar question map, big top progress, clear question numbering.', icon: '🎓' },
    { id: 'gre',     name: 'GRE Split Screen', desc: 'Dark theme optimized, dual-column design for deep focus with passage space.', icon: '📖' },
    { id: 'dsat',    name: 'DSAT / ACT Style', desc: 'Light mode, left column for question, right sidebar for full question sequence.', icon: '🏛️' },
    { id: 'minimal', name: 'Mobile Minimal',   desc: 'Clean, distraction-free centered view with elegant rounded option buttons.', icon: '📱' },
  ];

  function render(main) {
    const selected = State.get('setup').template || 'default';
    
    main.innerHTML = `
      <div class="animate-up" style="margin:0 auto">
        ${UI.stepsHtml(['Select Topics','Filters','Config','Design'], 3)}
        ${UI.backBtn('Config')}
        <h1 class="section-title">Choose Quiz Design</h1>
        <p class="section-sub">Select a high-end interface template for your session</p>
        <div class="divider"></div>

        <div style="display:flex;flex-direction:column;gap:var(--sp-xl)">
          <div class="grid-2" style="gap:var(--sp-lg)" id="template-grid">
            ${TEMPLATES.map(t => `
              <div class="card clickable ${t.id === selected ? 'selected-template' : ''}" 
                   style="border:2px solid ${t.id === selected ? 'var(--accent-primary)' : 'transparent'}"
                   onclick="PageSetupTemplate.select('${t.id}')">
                <div style="font-size:2.5rem;margin-bottom:var(--sp-sm)">${t.icon}</div>
                <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:4px">${t.name}</h3>
                <p class="text-xs text-muted">${t.desc}</p>
              </div>
            `).join('')}
          </div>

          <button class="btn btn-primary btn-lg btn-full" id="launch-btn" onclick="PageSetupTemplate.launchQuiz()">
            🚀 Launch Quiz Now
          </button>
        </div>
      </div>
    `;
  }

  const obj = {
    render,
    select: (id) => {
      State.merge('setup', { template: id });
      render(document.getElementById('main-content'));
    },
    launchQuiz: async () => {
      const setup = State.get('setup');
      const preparedQs = setup.preparedQs;
      const config = setup.finalConfig;
      const user = State.get('user');

      const btn = document.getElementById('launch-btn');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<div class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block"></div> Launching...`;
      }

      let fileId = null, resultFileId = null, attemptId = null;
      try {
        const attempt = await API.startAttempt({
          studentName: user ? `${user.name}` : 'Guest',
          quizName:    config['Quiz Settings Title'] || setup.quizConfig || 'Custom Template Quiz',
          quizTopic:   (setup.selectedTopics || []).join(', '),
          startTime:   new Date().toISOString(),
        });
        fileId       = attempt.fileId;
        resultFileId = attempt.resultFileId;
        attemptId    = attempt.attemptId;
      } catch(e) {
        UI.toast('Local session started (API not configured/failed: ' + e.message + ')', 'warn');
      }

      State.set('quiz', {
        active: true,
        questions: preparedQs,
        currentIdx: 0,
        answers: {},
        startTime: Date.now(),
        pauseTime: null,
        totalPaused: 0,
        attemptId, fileId, resultFileId,
        config,
        template: setup.template || 'default'
      });

      UI.pushPage('quiz');
    }
  };

  window.PageSetupTemplate = obj;
  return obj;
})();