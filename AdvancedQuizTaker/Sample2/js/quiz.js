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

    main.innerHTML = `
      <div style="max-width:860px;margin:0 auto;display:flex;flex-direction:column;gap:var(--sp-lg)">

        <!-- Header bar -->
        <div class="card" style="padding:var(--sp-md) var(--sp-lg)">
          <div style="display:flex;align-items:center;gap:var(--sp-md);flex-wrap:wrap">
            <div style="flex:1;min-width:120px">
              <p class="text-xs text-muted">Question</p>
              <p class="font-bold"><span id="q-idx">1</span> / ${qs.length}</p>
            </div>
            <div style="flex:2">
              <div class="progress-bar" style="height:6px">
                <div class="progress-fill" id="quiz-progress" style="width:0%"></div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:var(--sp-md)">
              <div id="q-timer-wrap" style="text-align:center;min-width:50px">
                <p class="text-xs text-muted">Time/Q</p>
                <p class="font-mono font-bold timer-safe" id="q-timer">—</p>
              </div>
              <div style="text-align:center;min-width:60px">
                <p class="text-xs text-muted">Total</p>
                <p class="font-mono font-bold timer-safe" id="total-timer">${totalTime ? fmtTime(totalTime) : '∞'}</p>
              </div>
              ${canPause ? `<button class="btn btn-ghost btn-sm" id="pause-btn" onclick="QuizEngine.togglePause()">⏸</button>` : ''}
              <button class="btn btn-danger btn-sm" onclick="QuizEngine.confirmSubmit()">Submit</button>
            </div>
          </div>
        </div>

        <!-- Question panel -->
        <div class="card" id="question-panel"></div>

        <!-- Nav bar -->
        <div class="card" style="padding:var(--sp-md) var(--sp-lg)">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--sp-sm)">
            <button class="btn btn-ghost" id="btn-prev" onclick="QuizEngine.prev()"
              ${!allowBack ? 'disabled' : ''}>← Prev</button>

            <div style="display:flex;gap:4px;flex-wrap:wrap;max-width:400px" id="q-nav"></div>

            <div style="display:flex;gap:var(--sp-sm)">
              ${showHint  ? `<button class="btn btn-ghost btn-sm" id="hint-btn" onclick="QuizEngine.showHint()">💡 Hint</button>` : ''}
              ${markReview? `<button class="btn btn-ghost btn-sm" id="mark-btn" onclick="QuizEngine.toggleMark()">🚩 Mark</button>` : ''}
              <button class="btn btn-primary" id="btn-next" onclick="QuizEngine.next()">Next →</button>
            </div>
          </div>
        </div>

        <!-- Pause overlay -->
        <div id="pause-overlay" class="hidden"
          style="position:fixed;inset:0;background:var(--bg-base);z-index:500;display:grid;place-items:center;">
          <div style="text-align:center">
            <div style="font-size:4rem;margin-bottom:var(--sp-md)">⏸</div>
            <h2 style="font-size:1.8rem;font-weight:800;margin-bottom:var(--sp-sm)">Quiz Paused</h2>
            <p class="text-muted" style="margin-bottom:var(--sp-xl)">Your progress is saved</p>
            <button class="btn btn-primary btn-lg" onclick="QuizEngine.togglePause()">▶ Resume</button>
          </div>
        </div>
      </div>`;

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
    document.getElementById('q-idx').textContent = quiz.currentIdx + 1;
    const pct = ((quiz.currentIdx) / quiz.questions.length) * 100;
    document.getElementById('quiz-progress').style.width = pct + '%';

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