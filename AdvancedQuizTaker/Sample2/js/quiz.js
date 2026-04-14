// ============================================================
//  QUIZ APP — quiz.js
//  Quiz runtime engine, timer, navigation, question renderer
// ============================================================

const PageQuiz = (() => {
  let _timer = null;
  let _qTimer = null;
  let _elapsedSec = 0;
  let _qElapsed = 0;
  let _started = false;

  function render(main) {
    const quiz = State.get('quiz');
    const cfg  = quiz.config;
    const qs   = quiz.questions;
    const totalTime = parseInt(cfg['Quiz Time'] || 0);
    const allowBack = (cfg['Allow Back'] || 'On') === 'On';
    const canPause  = (cfg['Pause / Resume Allowed'] || 'On') === 'On';
    const showHint  = (cfg['Show Hint'] || 'On') === 'On';
    const markReview= (cfg['Mark for Review'] || 'On') === 'On';

    const tmpl      = quiz.template || 'default';

    // Base variables for injection
    const timerHTML = `
      <div style="display:flex;gap:6px;align-items:center">
        <div style="display:flex;flex-direction:column;align-items:center;min-width:44px;padding:4px 8px;background:var(--bg-elevated);border-radius:var(--radius-sm);border:1px solid var(--border-color)">
          <p style="font-size:.6rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Q</p>
          <p class="font-mono timer-safe" style="font-size:.82rem;font-weight:700;line-height:1" id="q-timer">—</p>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;min-width:52px;padding:4px 8px;background:var(--bg-elevated);border-radius:var(--radius-sm);border:1px solid var(--border-color)">
          <p style="font-size:.6rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Total</p>
          <p class="font-mono timer-safe" style="font-size:.82rem;font-weight:700;line-height:1" id="total-timer">${totalTime ? fmtTime(totalTime) : '∞'}</p>
        </div>
      </div>`;
    const actionsHTML = `
      <div style="display:flex;gap:4px">
        ${showHint  ? `<button class="btn btn-ghost btn-sm" id="hint-btn" onclick="QuizEngine.showHint()" title="Hint">💡 Hint</button>` : ''}
        ${markReview? `<button class="btn btn-ghost btn-sm" id="mark-btn" onclick="QuizEngine.toggleMark()" title="Mark for Review">🚩 Mark</button>` : ''}
      </div>`;
    const submitHTML = `<button class="btn btn-sm" style="background:var(--color-error);color:#fff;font-weight:700" onclick="QuizEngine.confirmSubmit()">Submit</button>`;
    const pauseHTML  = canPause ? `<button class="btn btn-ghost btn-sm" id="pause-btn" onclick="QuizEngine.togglePause()" title="Pause">⏸</button>` : '';

    let layoutHtml = '';

    // ─────────────────────────────────────────────────────────
    // 1. SAT FORMAT — compact sidebar map + main question area
    // ─────────────────────────────────────────────────────────
    if (tmpl === 'sat') {
      layoutHtml = `
        <div class="layout-sat">
          <div class="sat-sidebar">
            <div style="padding:var(--sp-sm) var(--sp-md);border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--text-muted)">Questions</span>
              <span class="text-xs" id="sat-answered-count" style="color:var(--accent-primary);font-weight:700">0/${qs.length}</span>
            </div>
            <div id="q-nav" style="display:flex;flex-wrap:wrap;gap:5px;padding:var(--sp-sm);overflow-y:auto;flex:1;align-content:flex-start"></div>
            <div style="padding:var(--sp-sm) var(--sp-md);border-top:1px solid var(--border-color);display:flex;flex-direction:column;gap:5px">
              <div style="display:flex;align-items:center;gap:6px;font-size:.7rem;color:var(--text-muted)">
                <div style="width:10px;height:10px;border-radius:2px;background:var(--accent-primary)"></div>Current
                <div style="width:10px;height:10px;border-radius:2px;background:var(--color-success)"></div>Answered
                <div style="width:10px;height:10px;border-radius:2px;background:rgba(251,191,36,.4)"></div>Flagged
              </div>
            </div>
          </div>
          <div class="sat-main">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--sp-sm) var(--sp-lg);border-bottom:1px solid var(--border-color);background:var(--bg-surface);position:sticky;top:0;z-index:10">
              <div style="display:flex;align-items:center;gap:var(--sp-md)">
                <div class="badge badge-info" style="font-size:.65rem">SAT</div>
                <span style="font-size:.85rem;font-weight:600">Q <span id="q-idx">1</span> <span class="text-muted">/ ${qs.length}</span></span>
              </div>
              <div style="flex:1;max-width:240px;margin:0 var(--sp-lg)">
                <div class="progress-bar" style="height:4px"><div class="progress-fill" id="quiz-progress" style="width:0%"></div></div>
              </div>
              <div style="display:flex;align-items:center;gap:var(--sp-sm)">
                ${timerHTML}${pauseHTML}${submitHTML}
              </div>
            </div>
            <div style="padding:var(--sp-lg);flex:1;overflow-y:auto">
              <div id="question-panel"></div>
              <div style="display:flex;justify-content:space-between;padding-top:var(--sp-md);margin-top:var(--sp-lg);border-top:1px solid var(--border-color)">
                <button class="btn btn-ghost" id="btn-prev" onclick="QuizEngine.prev()" ${!allowBack ? 'disabled' : ''}>← Back</button>
                <div style="display:flex;gap:var(--sp-sm)">${actionsHTML}<button class="btn btn-primary" id="btn-next" onclick="QuizEngine.next()">Next →</button></div>
              </div>
            </div>
          </div>
        </div>`;
    }
            </div>
          </div>
          <div class="sat-main">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-lg)">
              <div style="display:flex;align-items:center;gap:var(--sp-md)">
                <div class="chip" style="background:var(--accent-primary);color:#fff;border:none">SAT MODE</div>
                <span class="font-bold">Question <span id="q-idx">1</span> of ${qs.length}</span>
              </div>
              <div style="display:flex;align-items:center;gap:var(--sp-md)">
                 ${timerHTML}
                 ${pauseHTML}
                 ${submitHTML}
              </div>
            </div>
            <div class="progress-bar" style="height:6px;margin-bottom:var(--sp-xl)"><div class="progress-fill" id="quiz-progress" style="width:0%"></div></div>
            <div id="question-panel" style="flex:1"></div>
            <div style="display:flex;justify-content:space-between;padding-top:var(--sp-md);border-top:1px solid var(--border-color);margin-top:var(--sp-xl)">
              <button class="btn btn-ghost" id="btn-prev" onclick="QuizEngine.prev()" ${!allowBack ? 'disabled' : ''}>← Back</button>
              <div style="display:flex;gap:var(--sp-sm)">
                ${actionsHTML}
                <button class="btn btn-primary" id="btn-next" onclick="QuizEngine.next()">Next →</button>
              </div>
            </div>
          </div>
        </div>`;
    }
    // ──────────────────────────────────────────────────────────
    // 2. GRE MODE — full-frame, horizontal scroll nav
    // ──────────────────────────────────────────────────────────
    else if (tmpl === 'gre') {
      layoutHtml = `
        <div class="layout-gre">
          <div class="gre-topbar">
            <div style="display:flex;align-items:center;gap:var(--sp-sm)">
              <div class="badge badge-info" style="font-size:.65rem">GRE</div>
              <span style="font-weight:800;font-size:.95rem;letter-spacing:-.02em">${cfg['Quiz Settings Title']||'GRE Practice'}</span>
            </div>
            <div style="flex:1;max-width:260px;margin:0 var(--sp-lg)">
              <div class="progress-bar" style="height:3px"><div class="progress-fill" id="quiz-progress" style="width:0%"></div></div>
            </div>
            <div style="display:flex;align-items:center;gap:var(--sp-sm)">
              ${timerHTML}${pauseHTML}${submitHTML}
            </div>
          </div>
          <div class="gre-body">
            <div id="question-panel" class="card" style="border:none;border-radius:0;flex:1;overflow-y:auto;padding:var(--sp-lg)"></div>
          </div>
          <div class="gre-footer">
            <button class="btn btn-ghost btn-sm" id="btn-prev" onclick="QuizEngine.prev()" ${!allowBack ? 'disabled' : ''}>← Back</button>
            <div id="q-nav" style="display:flex;gap:5px;flex-wrap:nowrap;overflow-x:auto;flex:1;margin:0 var(--sp-md);padding:2px;scrollbar-width:none"></div>
            <style>#q-nav::-webkit-scrollbar{display:none}</style>
            <div style="display:flex;align-items:center;gap:var(--sp-sm)">
              <span style="font-size:.75rem;color:var(--text-muted);white-space:nowrap">Q <span id="q-idx">1</span>/${qs.length}</span>
              ${actionsHTML}
              <button class="btn btn-primary btn-sm" id="btn-next" onclick="QuizEngine.next()">Next →</button>
            </div>
          </div>
        </div>`;
    }
    // ──────────────────────────────────────────────────────────
    // 3. DSAT / ACT — split with compact dot-grid sidebar
    // ──────────────────────────────────────────────────────────
    else if (tmpl === 'dsat') {
      layoutHtml = `
        <div class="layout-dsat">
          <div class="dsat-header">
            <div style="display:flex;align-items:center;gap:var(--sp-sm)">
              <div class="badge badge-warn" style="font-size:.65rem">ACT / SAT</div>
              <div>
                <p style="font-size:.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.08em">${cfg['Quiz Settings Title']||'Practice Test'}</p>
                <p style="font-size:1rem;font-weight:800;letter-spacing:-.02em">Section <span id="q-idx">1</span> <span style="color:var(--text-muted);font-weight:400;font-size:.85rem">of ${qs.length}</span></p>
              </div>
            </div>
            <div style="flex:1;max-width:200px;margin:0 var(--sp-lg)">
              <div class="progress-bar" style="height:4px"><div class="progress-fill" id="quiz-progress" style="width:0%"></div></div>
            </div>
            <div style="display:flex;align-items:center;gap:var(--sp-sm)">
              ${timerHTML}${pauseHTML}${submitHTML}
            </div>
          </div>
          <div class="dsat-cols">
            <div class="dsat-main">
              <div id="question-panel"></div>
              <div style="display:flex;justify-content:space-between;margin-top:var(--sp-xl);padding-top:var(--sp-md);border-top:1px solid var(--border-color)">
                <button class="btn btn-ghost btn-sm" id="btn-prev" onclick="QuizEngine.prev()" ${!allowBack?'disabled':''}>← Back</button>
                <div style="display:flex;gap:var(--sp-sm)">${actionsHTML}<button class="btn btn-primary btn-sm" id="btn-next" onclick="QuizEngine.next()">Next →</button></div>
              </div>
            </div>
            <div class="dsat-sidebar">
              <p style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin-bottom:var(--sp-sm)">All Questions</p>
              <div id="q-nav" style="display:flex;flex-wrap:wrap;gap:5px;overflow-y:auto;max-height:calc(100vh - 200px);align-content:flex-start;scrollbar-width:thin"></div>
              <div style="margin-top:auto;padding-top:var(--sp-md);border-top:1px solid var(--border-color);display:flex;flex-direction:column;gap:4px">
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                  <div style="display:flex;align-items:center;gap:4px;font-size:.68rem;color:var(--text-muted)"><div style="width:10px;height:10px;border-radius:2px;background:var(--accent-primary)"></div>Active</div>
                  <div style="display:flex;align-items:center;gap:4px;font-size:.68rem;color:var(--text-muted)"><div style="width:10px;height:10px;border-radius:2px;background:var(--color-success)"></div>Done</div>
                  <div style="display:flex;align-items:center;gap:4px;font-size:.68rem;color:var(--text-muted)"><div style="width:10px;height:10px;border-radius:2px;background:rgba(251,191,36,.5)"></div>Flagged</div>
                </div>
              </div>
            </div>
          </div>
        </div>`;
    }
    }
    // ──────────────────────────────────────────
    // 4. Mobile Minimal Mode
    // ──────────────────────────────────────────
    else if (tmpl === 'minimal') {
      layoutHtml = `
        <div class="layout-minimal">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-md)">
            <button class="btn btn-ghost btn-sm" id="btn-prev" onclick="QuizEngine.prev()" ${!allowBack?'disabled':''}>←</button>
            <div class="font-bold">Q<span id="q-idx">1</span> <span class="text-muted text-sm">/${qs.length}</span></div>
            ${timerHTML}
          </div>
          <div class="progress-bar" style="height:6px;border-radius:10px;margin-bottom:var(--sp-lg)"><div class="progress-fill" id="quiz-progress" style="width:0%"></div></div>
          
          <div id="question-panel" style="flex:1"></div>
          
          <div style="display:none" id="q-nav"></div> <!-- hidden nav -->
          
          <div style="position:sticky;bottom:0;background:var(--bg-base);padding:var(--sp-md) 0;border-top:1px solid var(--border-color);display:flex;gap:var(--sp-sm);align-items:center;margin-top:var(--sp-xl)">
             ${pauseHTML}
             ${actionsHTML}
             <div style="flex:1"></div>
             ${submitHTML}
             <button class="btn btn-primary" style="padding:12px 24px;border-radius:24px" id="btn-next" onclick="QuizEngine.next()">Next →</button>
          </div>
        </div>`;
    }
    // ──────────────────────────────────────────────────────────
    // 5. DEFAULT QuizPro — clean full-width, sticky footer nav
    // ──────────────────────────────────────────────────────────
    else {
      layoutHtml = `
        <div style="max-width:860px;margin:0 auto;display:flex;flex-direction:column;gap:var(--sp-md)">
          <div style="display:flex;align-items:center;gap:var(--sp-md);padding:var(--sp-sm) 0;border-bottom:1px solid var(--border-color)">
            <span style="font-size:.78rem;color:var(--text-muted)">Q</span>
            <span style="font-weight:700;font-size:.9rem"><span id="q-idx">1</span></span>
            <span style="font-size:.78rem;color:var(--text-muted)">/ ${qs.length}</span>
            <div style="flex:1"><div class="progress-bar" style="height:4px"><div class="progress-fill" id="quiz-progress" style="width:0%"></div></div></div>
            ${timerHTML}${pauseHTML}${submitHTML}
          </div>
          <div class="card" id="question-panel" style="padding:var(--sp-lg)"></div>
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--sp-sm);padding:var(--sp-sm) 0;border-top:1px solid var(--border-color)">
            <button class="btn btn-ghost btn-sm" id="btn-prev" onclick="QuizEngine.prev()" ${!allowBack ? 'disabled' : ''}>← Back</button>
            <div id="q-nav" style="display:flex;gap:4px;flex-wrap:nowrap;overflow-x:auto;flex:1;margin:0 var(--sp-md);scrollbar-width:none"></div>
            <div style="display:flex;gap:var(--sp-sm)">${actionsHTML}<button class="btn btn-primary btn-sm" id="btn-next" onclick="QuizEngine.next()">Next →</button></div>
          </div>
        </div>`;
    }
    }

    const pauseOverlay = `
      <div id="pause-overlay" class="hidden" style="position:fixed;inset:0;background:var(--bg-base);z-index:500;display:grid;place-items:center;">
        <div style="text-align:center">
          <div style="font-size:4rem;margin-bottom:var(--sp-md)">⏸</div>
          <h2 style="font-size:1.8rem;font-weight:800;margin-bottom:var(--sp-sm)">Quiz Paused</h2>
          <p class="text-muted" style="margin-bottom:var(--sp-xl)">Your progress is saved</p>
          <button class="btn btn-primary btn-lg" onclick="QuizEngine.togglePause()">▶ Resume</button>
        </div>
      </div>`;

    const stylesHTML = `
      <style>
        /* ── SAT Mode ── */
        .layout-sat { display:flex; height:calc(100vh - 52px); overflow:hidden; }
        .sat-sidebar { width:200px; flex-shrink:0; display:flex; flex-direction:column; background:var(--bg-surface); border-right:1px solid var(--border-color); }
        .sat-main { flex:1; display:flex; flex-direction:column; overflow:hidden; }

        /* ── GRE Mode ── */
        .layout-gre { display:flex; flex-direction:column; height:calc(100vh - 52px); overflow:hidden; background:var(--bg-surface); border:1px solid var(--border-color); }
        .gre-topbar { display:flex; align-items:center; justify-content:space-between; padding:var(--sp-sm) var(--sp-lg); border-bottom:2px solid var(--accent-primary); background:var(--bg-base); flex-shrink:0; }
        .gre-body { flex:1; display:flex; overflow:hidden; }
        .gre-footer { display:flex; align-items:center; justify-content:space-between; padding:var(--sp-sm) var(--sp-lg); border-top:1px solid var(--border-color); background:var(--bg-base); flex-shrink:0; gap:var(--sp-md); }
        .layout-gre #question-panel { flex:1; display:grid; grid-template-columns:1fr 1fr; gap:var(--sp-lg); background:transparent; box-shadow:none; border:none; }
        .layout-gre .q-left-panel { display:flex !important; overflow-y:auto; }
        @media(max-width:900px){ .layout-gre #question-panel { grid-template-columns:1fr; } .layout-gre .q-left-panel { display:none !important; } }

        /* ── DSAT / ACT Mode ── */
        .layout-dsat { display:flex; flex-direction:column; height:calc(100vh - 52px); overflow:hidden; }
        .dsat-header { display:flex; align-items:center; justify-content:space-between; padding:var(--sp-sm) var(--sp-lg); border-bottom:1px solid var(--border-color); background:var(--bg-surface); flex-shrink:0; }
        .dsat-cols { display:flex; flex:1; overflow:hidden; }
        .dsat-main { flex:3; padding:var(--sp-lg); display:flex; flex-direction:column; overflow-y:auto; }
        .dsat-sidebar { width:220px; flex-shrink:0; padding:var(--sp-md); display:flex; flex-direction:column; gap:var(--sp-sm); background:var(--bg-elevated); border-left:1px solid var(--border-color); }

        /* ── Minimal Mode ── */
        .layout-minimal { max-width:600px; margin:0 auto; display:flex; flex-direction:column; min-height:80vh; }
        .layout-minimal .mcq-option { border-radius:24px !important; padding:16px 20px !important; text-align:center; }
      </style>`;

    main.innerHTML = stylesHTML + layoutHtml + pauseOverlay;


    // Init engine
    QuizEngine.init();
  }

  return { render };
})();

// ============================================================
//  Quiz Engine
// ============================================================
const QuizEngine = (() => {
  let _totalTimer = null;
  let _qTimer     = null;
  let _totalSec   = 0;
  let _qSec       = 0;
  let _paused     = false;
  let _qStartTime = 0;

  function init() {
    const quiz = State.get('quiz');
    State.merge('quiz', { currentIdx: 0 });
    startTotalTimer();
    renderQuestion();
    renderQNav();
  }

  function startTotalTimer() {
    const quiz   = State.get('quiz');
    const cfg    = quiz.config;
    const limit  = parseInt(cfg['Quiz Time'] || 0);
    _totalSec    = limit > 0 ? limit : 0;

    clearInterval(_totalTimer);
    _totalTimer = setInterval(() => {
      if (_paused) return;
      if (limit > 0) {
        _totalSec--;
        updateTotalTimerEl();
        if (_totalSec <= 0) { clearInterval(_totalTimer); autoSubmit(); }
      } else {
        _totalSec++;
        updateTotalTimerEl();
      }
    }, 1000);
  }

  function updateTotalTimerEl() {
    const el = document.getElementById('total-timer');
    if (!el) return;
    const quiz = State.get('quiz');
    const limit = parseInt(quiz.config['Quiz Time'] || 0);
    const remaining = limit > 0 ? _totalSec : null;
    el.textContent = fmtTime(limit > 0 ? _totalSec : _totalSec);
    if (limit > 0) {
      el.className = 'font-mono font-bold ' + (_totalSec < 60 ? 'timer-danger' : _totalSec < 300 ? 'timer-warn' : 'timer-safe');
    }
  }

  function startQTimer() {
    const quiz  = State.get('quiz');
    const limit = parseInt(quiz.config['Question Time'] || 0);
    _qSec = limit > 0 ? limit : 0;
    _qStartTime = Date.now();

    clearInterval(_qTimer);
    if (limit <= 0) {
      const el = document.getElementById('q-timer');
      if (el) el.textContent = '—';
      return;
    }

    const el = document.getElementById('q-timer');
    if (el) { el.textContent = fmtTime(_qSec); el.className = 'font-mono font-bold timer-safe'; }

    _qTimer = setInterval(() => {
      if (_paused) return;
      _qSec--;
      if (el) {
        el.textContent = fmtTime(Math.max(0, _qSec));
        el.className = 'font-mono font-bold ' + (_qSec < 10 ? 'timer-danger' : _qSec < 30 ? 'timer-warn' : 'timer-safe');
      }
      if (_qSec <= 0) {
        clearInterval(_qTimer);
        const cfg = State.get('quiz').config;
        if ((cfg['Auto Next Question'] || 'Off') === 'On') next();
      }
    }, 1000);
  }

  function renderQuestion() {
    const quiz = State.get('quiz');
    const q    = quiz.questions[quiz.currentIdx];
    if (!q) return;

    // Update nav indicators
    const elIdx = document.getElementById('q-idx');
    if (elIdx) elIdx.textContent = quiz.currentIdx + 1;
    
    const elProg = document.getElementById('quiz-progress');
    if (elProg) {
      const pct = ((quiz.currentIdx) / quiz.questions.length) * 100;
      elProg.style.width = pct + '%';
    }

    const satCount = document.getElementById('sat-answered-count');
    if (satCount) satCount.textContent = countAnswered() + ' / ' + quiz.questions.length;

    // Mark/flag UI
    const ans = quiz.answers[quiz.currentIdx] || {};
    const markBtn = document.getElementById('mark-btn');
    if (markBtn) markBtn.style.color = ans.flagged ? 'var(--color-warn)' : '';

    // Render question
    const panel = document.getElementById('question-panel');
    const type  = q['Question Type'] || 'Multichoice';
    QuestionRenderer.render(panel, q, quiz.currentIdx);
    startQTimer();
    renderQNav();

    // Prev/Next state
    const cfg = quiz.config;
    const allowBack = (cfg['Allow Back'] || 'On') === 'On';
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    if (prevBtn) prevBtn.disabled = !allowBack || quiz.currentIdx === 0;
    const isLast = quiz.currentIdx === quiz.questions.length - 1;
    if (nextBtn) nextBtn.textContent = isLast ? '✓ Finish' : 'Next →';
  }

  function renderQNav() {
    const quiz = State.get('quiz');
    const nav  = document.getElementById('q-nav');
    if (!nav) return;
    nav.innerHTML = '';
    quiz.questions.forEach((_, i) => {
      const ans = quiz.answers[i] || {};
      const btn = document.createElement('button');
      btn.className = 'q-nav-dot';
      btn.textContent = i + 1;
      btn.title = `Q${i+1}${ans.flagged ? ' 🚩' : ''}`;
      btn.style.cssText = `
        width:28px;height:28px;border-radius:6px;font-size:.72rem;font-weight:700;
        border:1.5px solid var(--border-color);cursor:pointer;
        background:${i === quiz.currentIdx ? 'var(--accent-primary)' : ans.userAnswer !== undefined ? 'var(--color-success)' : ans.flagged ? 'rgba(251,191,36,.2)' : 'var(--bg-elevated)'};
        color:${i === quiz.currentIdx ? '#fff' : 'var(--text-secondary)'};
        border-color:${ans.flagged ? 'var(--color-warn)' : 'var(--border-color)'};
        transition:all .15s;
      `;
      btn.onclick = () => jumpTo(i);
      nav.appendChild(btn);
    });
  }

  function getQTime() {
    return Math.round((Date.now() - _qStartTime) / 1000);
  }

  function next() {
    saveCurrentAnswer();
    const quiz = State.get('quiz');
    const cfg  = quiz.config;

    // Mandatory answer check
    if ((cfg['Mandatory Answer'] || 'Off') === 'On') {
      const ans = quiz.answers[quiz.currentIdx];
      if (!ans || ans.userAnswer === undefined || ans.userAnswer === '' || ans.userAnswer === null) {
        UI.toast('Answer is mandatory before proceeding', 'warn'); return;
      }
    }

    if (quiz.currentIdx >= quiz.questions.length - 1) {
      confirmSubmit();
    } else {
      State.merge('quiz', { currentIdx: quiz.currentIdx + 1 });
      renderQuestion();
    }
  }

  function prev() {
    saveCurrentAnswer();
    const quiz = State.get('quiz');
    if (quiz.currentIdx > 0) {
      State.merge('quiz', { currentIdx: quiz.currentIdx - 1 });
      renderQuestion();
    }
  }

  function jumpTo(idx) {
    const quiz = State.get('quiz');
    const cfg  = quiz.config;
    if ((cfg['Question Navigation'] || 'Free') === 'Sequential') {
      if (idx > quiz.currentIdx + 1) { UI.toast('Sequential navigation: go one by one', 'warn'); return; }
    }
    saveCurrentAnswer();
    State.merge('quiz', { currentIdx: idx });
    renderQuestion();
  }

  function saveCurrentAnswer() {
    const quiz    = State.get('quiz');
    const idx     = quiz.currentIdx;
    const current = QuestionRenderer.collectAnswer();
    if (current !== null) {
      const answers = { ...quiz.answers };
      answers[idx]  = { ...answers[idx], userAnswer: current, timeTaken: getQTime() };
      State.merge('quiz', { answers });
    }
  }

  function toggleMark() {
    const quiz    = State.get('quiz');
    const idx     = quiz.currentIdx;
    const answers = { ...quiz.answers };
    answers[idx]  = { ...answers[idx], flagged: !(answers[idx] || {}).flagged };
    State.merge('quiz', { answers });
    renderQNav();
    const btn = document.getElementById('mark-btn');
    if (btn) btn.style.color = answers[idx].flagged ? 'var(--color-warn)' : '';
  }

  function showHint() {
    const quiz = State.get('quiz');
    const q    = quiz.questions[quiz.currentIdx];
    UI.toast(q.Hint || 'No hint available', 'info', 5000);
  }

  function togglePause() {
    _paused = !_paused;
    const overlay = document.getElementById('pause-overlay');
    if (overlay) {
      overlay.style.display = _paused ? 'grid' : 'none';
      overlay.classList.toggle('hidden', !_paused);
    }
    const btn = document.getElementById('pause-btn');
    if (btn) btn.textContent = _paused ? '▶' : '⏸';
  }

  function confirmSubmit() {
    UI.modal(`
      <div style="text-align:center;padding:var(--sp-md)">
        <div style="font-size:3rem;margin-bottom:var(--sp-md)">📋</div>
        <h2 style="font-size:1.3rem;font-weight:800;margin-bottom:var(--sp-sm)">Submit Quiz?</h2>
        <p class="text-muted" style="margin-bottom:var(--sp-xl)">
          You've answered <strong>${countAnswered()}</strong> of <strong>${State.get('quiz').questions.length}</strong> questions.
        </p>
        <div style="display:flex;gap:var(--sp-md);justify-content:center">
          <button class="btn btn-ghost" onclick="UI.closeModal()">Keep Going</button>
          <button class="btn btn-primary" onclick="UI.closeModal();QuizEngine.submit()">Submit Now</button>
        </div>
      </div>`);
  }

  function countAnswered() {
    const { answers } = State.get('quiz');
    return Object.values(answers).filter(a => a.userAnswer !== undefined && a.userAnswer !== null && a.userAnswer !== '').length;
  }

  async function submit() {
    saveCurrentAnswer();
    clearInterval(_totalTimer);
    clearInterval(_qTimer);

    const quiz     = State.get('quiz');
    const endTime  = new Date().toISOString();
    const score    = Results.calculateScore(quiz);

    // Save to Drive
    try {
      if (quiz.fileId) {
        const rows = quiz.questions.map((q, i) => {
          const ans = quiz.answers[i] || {};
          const correct = Results.isCorrect(q, ans.userAnswer);
          return {
            QuestionIndex: i + 1,
            QuestionText:  q.Question,
            UserAnswer:    Array.isArray(ans.userAnswer) ? ans.userAnswer.join('|') : (ans.userAnswer || ''),
            CorrectAnswer: q['Correct Answer'],
            IsCorrect:     correct ? 'TRUE' : 'FALSE',
            TimeTaken:     ans.timeTaken || 0,
            Category:      q.Category || '',
            SubCategory:   q['Sub Category'] || '',
            Difficulty:    q.Difficulty || '',
            QuestionType:  q['Question Type'] || '',
            Score:         q.Score || 1,
            NegScore:      q['Negative Score'] || 0,
            PartialScore:  q['Partial Score'] || 0,
          };
        });
        await API.saveAttemptDetail(quiz.fileId, rows);
        await API.endAttempt({ fileId: quiz.fileId, endTime, score: score.total });
      }
    } catch(e) {
      console.warn('Could not save results:', e.message);
    }

    State.set('result', { quiz, score, endTime, startTime: new Date(quiz.startTime).toISOString() });
    const cfg = quiz.config;
    if ((cfg['Final Result'] || 'On') === 'On') {
      UI.pushPage('result');
    } else {
      UI.toast('Quiz submitted!', 'success');
      UI.pushPage('welcome');
    }
  }

  function autoSubmit() { submit(); }

  return { init, next, prev, jumpTo, toggleMark, showHint, togglePause, confirmSubmit, submit };
})();

// ── Time formatter ─────────────────────────────────────────
function fmtTime(sec) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}