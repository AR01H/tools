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
    const quiz = State.get("quiz");
    const cfg = quiz.config;
    const qs = quiz.questions;
    const totalTime = parseInt(cfg["Quiz Time"] || 0);
    const allowBack = (cfg["Allow Back"] || "On") === "On" && !quiz.isAdaptive;
    const canPause = (cfg["Pause / Resume Allowed"] || "On") === "On";
    const showHint = (cfg["Show Hint"] || "On") === "On";
    const markReview = (cfg["Mark for Review"] || "On") === "On";

    const tmpl = quiz.template || "default";

    // Base variables for injection
    const timerHTML = `
      <div style="display:flex;gap:6px;align-items:center">
        <div style="display:flex;flex-direction:column;align-items:center;min-width:44px;padding:4px 8px;background:var(--bg-elevated);border-radius:var(--radius-sm);border:1px solid var(--border-color)">
          <p style="font-size:.6rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Q</p>
          <p class="font-mono timer-safe" style="font-size:.82rem;font-weight:700;line-height:1" id="q-timer">—</p>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;min-width:52px;padding:4px 8px;background:var(--bg-elevated);border-radius:var(--radius-sm);border:1px solid var(--border-color)">
          <p style="font-size:.6rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Total</p>
          <p class="font-mono timer-safe" style="font-size:.82rem;font-weight:700;line-height:1" id="total-timer">${
            totalTime ? fmtTime(totalTime) : "∞"
          }</p>
        </div>
      </div>`;
    const actionsHTML = `
      <div style="display:flex;gap:4px">
        ${
          showHint
            ? `<button class="btn btn-ghost btn-sm" id="hint-btn" onclick="QuizEngine.showHint()" title="Hint">💡 Hint</button>`
            : ""
        }
        ${
          markReview
            ? `<button class="btn btn-ghost btn-sm" id="mark-btn" onclick="QuizEngine.toggleMark()" title="Mark for Review">🚩 Mark</button>`
            : ""
        }
      </div>`;
    const submitHTML = `<button class="btn btn-sm" style="background:var(--color-error);color:#fff;font-weight:700" onclick="QuizEngine.confirmSubmit()">Submit</button>`;
    const pauseHTML = canPause
      ? `<button class="btn btn-ghost btn-sm" id="pause-btn" onclick="QuizEngine.togglePause()" title="Pause">⏸</button>`
      : "";

    let layout; // ─────────────────────────────────────────────────────────
    // 1. Standard Design (Image 1)
    // ─────────────────────────────────────────────────────────
    if (tmpl === "sat") {
      layoutHtml = `
        <div class="layout-sat">
          <div class="sat-sidebar">
            <div class="sat-sidebar-header">
              <span class="sat-sidebar-title">${quiz.config.title || "Test"} Map</span>
              <span class="sat-sidebar-stats" id="sat-answered-count">0/${
                qs.length
              }</span>
            </div>
            <div class="sat-sidebar-legend">
              <div class="legend-item"><div class="dot active"></div>Current</div>
              <div class="legend-item"><div class="dot done"></div>Answered</div>
              <div class="legend-item"><div class="dot flagged"></div>Flagged</div>
            </div>
            <div class="sat-sidebar-footer">
               <div class="section-stats">
                  <p>Answered: <span id="stat-ans">0</span></p>
                  <p>Flagged: <span id="stat-flag">0</span></p>
                  <p>Remaining: <span id="stat-rem">${qs.length}</span></p>
               </div>
            </div>
            <div id="q-nav" class="sat-q-nav"></div>
          </div>
          <div class="sat-main">
            <div class="sat-header">
              <div class="sat-header-left">
                <span class="sat-q-counter">Question <span id="q-idx">1</span> of ${
                  qs.length
                }</span>
              </div>
              <div class="sat-progress-wrap">
                <div class="progress-bar"><div class="progress-fill" id="quiz-progress"></div></div>
              </div>
              <div class="sat-header-right" style="display:flex;align-items:center;gap:var(--sp-md)">
                ${timerHTML}${pauseHTML}${submitHTML}
              </div>
            </div>
            <div class="sat-content">
              <div id="question-panel"></div>
              <div class="sat-actions">
                <button class="btn btn-ghost" id="btn-prev" onclick="QuizEngine.prev()" ${
                  !allowBack ? "disabled" : ""
                }>← Back</button>
                <div class="flex gap-md">${actionsHTML}<button class="btn btn-primary btn-lg" id="btn-next" onclick="QuizEngine.next()">Next →</button></div>
              </div>
            </div>
          </div>
        </div>`;
    }
    // ──────────────────────────────────────────────────────────
    // 2. QUIZPRO DARK (Image 2) — Split view with passage
    // ──────────────────────────────────────────────────────────
    else if (tmpl === "quizpro-dark") {
      layoutHtml = `
        <div class="layout-quizpro">
          <div class="quizpro-topbar">
            <div class="qp-logo"><span>${quiz.config.title || "Test"}</span><p class="text-xs opacity-50">${quiz.config.category || ""} • ${quiz.config.subCategory || ""}</p></div>
            <div class="qp-segmented-progress" id="quiz-segmented-progress"></div>
            <div class="qp-timer-wrap">
               <div class="font-mono text-xl" id="total-timer-qp">00:00</div>
               <p class="text-xs opacity-50 uppercase">Remaining</p>
            </div>
          </div>
          <div class="quizpro-body">
            <div class="qp-question">
               <div class="qp-q-header">QUESTION <span id="q-idx">1</span> / ${
                 qs.length
               } <span class="text-muted ml-md">+2 PTS</span></div>
               <div id="question-panel"></div>
               <div id="q-nav" class="qp-mini-nav"></div>
            </div>
          </div>
          <div class="quizpro-footer">
             <button class="btn btn-secondary btn-sm" id="btn-prev" onclick="QuizEngine.prev()" ${
               !allowBack ? "disabled" : ""
             }>← Back</button>
             <div class="qp-footer-center">
                <span class="text-xs"><span id="qp-ans-count">0</span> answered • <span id="qp-flag-count">0</span> flagged</span>
             </div>
             <div style="display:flex;gap:var(--sp-sm)">
                ${actionsHTML}
                <button class="btn btn-primary btn-lg" id="btn-next" onclick="QuizEngine.next()" style="min-width:140px; background:var(--accent-primary);color:#000">Next →</button>
             </div>
          </div>
        </div>`;
    }
    // ──────────────────────────────────────────
    // 4. STUDY MODE (Flashcard)
    // ──────────────────────────────────────────
    else if (tmpl === "study") {
      layoutHtml = `
        <div class="layout-immersive-study">
          <div class="study-nav-header">
             <div class="header-left">
                <span class="study-badge">STUDY MODE</span>
                <div class="study-id-capsule">
                   <span class="label">${quiz.config.title || "Test"}</span>
                   <span id="q-idx" class="val">1</span>
                   <span class="total">/ ${qs.length}</span>
                </div>
             </div>
             <div class="header-center">
                <div class="study-progress-track">
                   <div class="fill" id="quiz-progress"></div>
                </div>
             </div>
             <div class="header-right">
                <button class="btn btn-ghost btn-sm" onclick="location.reload()" style="font-weight:800; color:var(--text-muted); border-radius:8px; padding:8px 16px">CLOSE ×</button>
             </div>
          </div>
          
          <div class="study-viewport">
             <div class="study-content-stack">
                <div class="study-block question-block">
                   <div class="block-label">PROBLEM STATEMENT</div>
                   <div id="question-panel"></div>
                </div>
                
                <div class="study-block answer-block">
                   <div class="block-header">
                      <div class="block-label">TARGET SOLUTION</div>
                      <div class="status-marker">VALIDATED</div>
                   </div>
                   <div class="answer-payload">
                      <div id="study-answer-text" class="study-val"></div>
                   </div>
                </div>

                <div class="study-block explanation-block">
                   <div class="block-label">DETAILED EXPLANATION & RATIONALE</div>
                   <div id="study-explanation-text" class="study-desc"></div>
                </div>
             </div>
          </div>
          
          <div class="study-persistent-footer">
             <div class="footer-inner">
                <button class="btn btn-secondary btn-lg" id="btn-prev" onclick="QuizEngine.prev()" style="min-width:180px">
                   <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19L5 12L12 5"/></svg>
                   PREVIOUS
                </button>
                <div id="q-nav" style="display:none"></div>
                <button class="btn btn-primary btn-lg next-study-pro" id="btn-next" onclick="QuizEngine.next()">
                   <span class="btn-inner">
                      <span id="btn-next-text">NEXT</span>
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M5 12H19M12 5L19 12L12 19"/></svg>
                   </span>
                </button>
             </div>
          </div>
        </div>
        <style>
          .layout-immersive-study { height:92vh; overflow:hidden; display:flex; flex-direction:column; background:var(--bg-base); color:var(--text-primary); }
          
          .study-nav-header { height:64px; border-bottom:1px solid var(--border-color); display:flex; align-items:center; justify-content:space-between; padding:0 32px; background:var(--bg-surface); z-index:10; }
          .study-badge { font-size:0.65rem; font-weight:900; color:var(--accent-primary); background:var(--accent-primary-transparent); padding:4px 10px; border-radius:99px; letter-spacing:0.05em; }
          .study-id-capsule { display:flex; align-items:baseline; gap:6px; font-weight:900; }
          .study-id-capsule .label { font-size:0.6rem; color:var(--text-muted); text-transform:uppercase; margin-right:4px; }
          .study-id-capsule .val {color:var(--accent-primary); }
          .study-id-capsule .total { font-size:0.9rem; color:var(--text-muted); opacity:0.5; }
          
          .study-progress-track { width:240px; height:6px; background:var(--bg-elevated); border-radius:3px; overflow:hidden; }
          .study-progress-track .fill { height:100%; width:0%; background:var(--accent-primary); transition: width 0.4s var(--ease); box-shadow:0 0 10px var(--accent-shadow); }

          .study-viewport { flex:1; overflow-y:auto; padding:40px 0; background:radial-gradient(circle at 50% 0%, var(--bg-elevated) 0%, var(--bg-base) 100%); }
          .study-content-stack { width:100%; max-width:900px; margin:0 auto; display:flex; flex-direction:column; gap:24px; padding:0 32px; }
          
          .study-block { background:var(--bg-surface); border:1px solid var(--border-color); border-radius:4px; padding:6px; box-shadow:0 10px 30px rgba(0,0,0,0.05); }
          .block-label { font-size:0.7rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:12px; display:flex; align-items:center; gap:8px; }
          .block-label::before { content:''; width:8px; height:8px; background:var(--accent-primary); border-radius:50%; }
          
          .question-block { border-left:6px solid var(--accent-primary); }
          .answer-block { border-left:6px solid var(--color-success); background:rgba(34,197,94,0.03); }
          .answer-block .block-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
          .answer-block .status-marker { font-size:0.6rem; font-weight:900; color:var(--color-success); border:1px solid var(--color-success); padding:2px 8px; border-radius:4px; }
          .answer-payload { font-size:1.3rem; font-weight:900; color:var(--text-primary); line-height:1.4; }
          
          .explanation-block { border-left:6px solid var(--text-muted); }
          .study-desc { font-size:1.05rem; line-height:1.8; color:var(--text-secondary); white-space:pre-line; }
          
          .study-persistent-footer { height:56px; border-top:1px solid var(--border-color); background:var(--bg-surface); display:flex; align-items:center; justify-content:center; }
          .footer-inner { width:100%; max-width:900px; display:flex; justify-content:space-between; padding:0 32px; gap:20px; }
          
          .next-study-pro { min-width:240px; border-radius:4px; background:var(--accent-primary); box-shadow:0 10px 25px var(--accent-shadow); }
          .next-study-pro .btn-inner { display:flex; align-items:center; gap:12px; font-weight:900; letter-spacing:0.02em; }
          .next-study-pro:hover { transform: translateY(-3px) scale(1.02); }
            .study-nav-header { padding:0 16px; }
            .header-center { display:none; }
            .study-content-stack { padding:0 16px; }
            .study-viewport { padding:24px 0; }
            .footer-inner { padding:0 16px; }
            .footer-inner button { flex:1; min-width:0 !important; }
          }
          @media (max-width: 768px) {
            .study-nav-header { height:30px; padding:0 16px; }
            .header-center { display:none; }
            .study-content-stack { padding:0 16px; }
            .study-viewport { padding:24px 0; }
            .footer-inner { padding:0 16px; }
            .footer-inner button { flex:1; min-width:0 !important; }
          }
        </style>
      `;
    }
    else {
      layoutHtml = `
        <div style="max-width:860px;margin:0 auto;display:flex;flex-direction:column;gap:var(--sp-md)">
          <div style="display:flex;align-items:center;gap:var(--sp-md);padding:var(--sp-sm) 0;border-bottom:1px solid var(--border-color)">
            <span style="font-size:.78rem;color:var(--text-muted)">Q</span>
            <span style="font-weight:700;font-size:.9rem"><span id="q-idx">1</span></span>
            <span style="font-size:.78rem;color:var(--text-muted)">/ ${
              qs.length
            }</span>
            <div style="flex:1"><div class="progress-bar" style="height:4px"><div class="progress-fill" id="quiz-progress" style="width:0%"></div></div></div>
            ${timerHTML}${pauseHTML}${submitHTML}
          </div>
          <div class="card" id="question-panel" style="padding:var(--sp-lg)"></div>
          <div id="q-nav" style="display:flex;gap:4px;flex-wrap:nowrap;overflow-x:auto;flex:1;margin:0 var(--sp-md);scrollbar-width:none"></div>
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--sp-sm);padding:var(--sp-sm) 0;border-top:1px solid var(--border-color)">
            <button class="btn btn-ghost btn-sm" id="btn-prev" onclick="QuizEngine.prev()" ${
              !allowBack ? "disabled" : ""
            }>← Back</button>
            <div style="display:flex;gap:var(--sp-sm)">${actionsHTML}<button class="btn btn-primary btn-sm" id="btn-next" onclick="QuizEngine.next()">Next →</button></div>
          </div>
        </div>`;
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
        [data-theme="editorial"] #question-panel { font-family: var(--font-content, serif); }
        [data-theme="editorial"] .mcq-option { border: none !important; border-bottom: 1px solid var(--border-color) !important; border-radius: 0 !important; padding: 10px 0 !important; background: transparent !important; }
        [data-theme="quizpro-dark"] .mcq-option { border-radius: 6px !important; border-width: 1px !important; background: var(--bg-elevated) !important; padding: 10px 14px !important; margin-bottom: 8px; }

        /* ── Standard Design ── */
        .layout-sat { display:flex; height:calc(100vh - 52px); overflow:hidden; background:var(--bg-base); }
        .sat-sidebar { width:200px; display:flex; flex-direction:column; border-right:1px solid var(--border-color); background:var(--bg-surface); }
        .sat-sidebar-header { padding: 10px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
        .sat-sidebar-title { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
        .sat-q-nav { padding: 6px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; overflow-y: auto; justify-items: center; }
        .sat-sidebar-legend { padding: 10px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; gap: 4px; font-size: 0.6rem; color: var(--text-secondary); }
        .section-stats { display: flex; font-size: x-small; flex-wrap: wrap; gap: 11px; justify-content: center; }
        .legend-item { display: flex; align-items: center; gap: 4px; }
        .dot { width: 6px; height: 6px; border-radius: 2px; border: 1px solid var(--border-color); }
        .dot.active { background: var(--accent-primary); border-color: var(--accent-primary); }
        .dot.done { background: var(--color-success); border-color: var(--color-success); }
        .dot.flagged { background: var(--color-warn); border-color: var(--color-warn); }
        .sat-sidebar-footer { padding: 10px; background: var(--bg-elevated); border-top: 1px solid var(--border-color); font-size: 0.65rem;width:100%; }
        .sat-main { flex:1; display:flex; flex-direction:column; overflow:hidden; }
        .sat-header { padding: 6px 16px; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; background: var(--bg-surface); flex-wrap: wrap; }
        .sat-badge { background: var(--text-primary); color: var(--bg-surface); padding: 2px 6px; border-radius: 4px; font-size: 0.55rem; font-weight: 800; }
        .sat-q-counter { font-size: 0.75rem; font-weight: 700; color: var(--text-primary); }
        .sat-progress-wrap { flex: 1; max-width: 280px; margin: 0 20px; }
        .sat-content { flex: 1; overflow-y: auto; padding: 0px 1% 0px 1%; display: flex; flex-direction: column; justify-content: space-between; }
        .sat-actions { display: flex; justify-content: space-between; border-top: 1px solid var(--border-color); margin-top: 20px; }

        /* ── QuizPro Dark ── */
        .layout-quizpro { display:flex; flex-direction:column; height:calc(100vh - 52px); background:var(--bg-base); color:var(--text-primary); }
        .quizpro-topbar { height: 52px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; border-bottom: 1px solid var(--border-color); }
        .qp-logo { display:flex; flex-direction:column; font-weight:900; letter-spacing:0.5px; line-height:1; font-size:0.9rem; }
        .qp-segmented-progress { display: flex; gap: 2px; flex: 1; max-width: 350px; margin: 0 20px; height: 3px; }
        .qp-seg { height: 100%; flex: 1; background: var(--border-color); border-radius: 1px; }
        .qp-timer-wrap { text-align: right; }
        .quizpro-body { flex: 1; display: flex; overflow: hidden; }
        .qp-passage { flex: 1; border-right: 1px solid var(--border-color); padding: 16px; overflow-y: auto; background: var(--bg-surface); }
        .qp-passage-header { font-size: 0.6rem; font-weight: 800; letter-spacing: 0.1em; color: var(--text-muted); margin-bottom: 10px; }
        .qp-passage-content { font-size: 0.95rem; line-height: 1.5; opacity: 0.9; }
        .qp-question { flex: 1; padding: 10px 10px 0px 10px; overflow-y: auto; display: flex; flex-direction: column; }
        .qp-q-header { font-size: 0.65rem; font-weight: 800; color: var(--text-muted); margin-bottom: 12px; }
        .qp-mini-nav { display: flex; gap: 3px; overflow-x:auto; margin-top: auto; padding-top: 15px; border-top: 1px solid var(--border-color); }
        .quizpro-footer { height: 52px; border-top: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; padding: 0 16px; background: var(--bg-surface); }

        /* ── Editorial ── */
        .layout-editorial { margin: 0 auto; display: flex; flex-direction: column;}
        .ed-header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid var(--text-primary); padding-bottom: 15px; margin-bottom: 24px; }
        .ed-meta { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em; color: var(--text-muted); }
        .ed-title { font-family: var(--font-content, serif); font-size: 1.8rem; }
        .ed-time-wrap { text-align: right; }
        .ed-time { font-family: var(--font-content, serif); font-size: 2rem; color: var(--accent-primary); line-height: 1; }
        .ed-time-label { font-size: 0.6rem; font-weight: 700; color: var(--text-muted); }
        .ed-body { display: flex; gap: 40px; }
        .ed-main { flex: 1; }
        .ed-q-meta { font-size: 0.65rem; font-weight: 700; color: var(--text-muted); margin-bottom: 20px; }
        .ed-panel { font-size: 1.15rem; line-height: 1.5; margin-bottom: 24px; }
        .ed-actions { display: flex; gap: 12px; align-items: center; border-top: 1px solid var(--border-color); padding-top: 20px; }
        .ed-sidebar { width: 260px; background: var(--bg-elevated); padding: 16px; border-radius: 4px; height: fit-content; position: sticky; top: 20px; }
        .ed-sb-title { font-size: 0.65rem; font-weight: 800; margin-bottom: 12px; color: var(--text-muted); }
        .ed-q-nav { display: flex; flex-direction: column; gap: 1px; max-height: 400px; overflow-y: auto; margin-bottom: 15px; }
        .ed-q-row { display: flex; align-items: center; padding: 8px; border-radius: 4px; cursor: pointer; transition: 0.2s; font-size: 0.8rem; }
        .ed-q-row.active { background: var(--text-primary); color: var(--bg-base); }
        .ed-main {padding: 0 10px;}

        /* ── DSAT / ACT Mode ── */
        .layout-dsat { display:flex; flex-direction:column; height:calc(100vh - 52px); overflow:hidden; }
        .dsat-header { display:flex; align-items:center; justify-content:space-between; padding:var(--sp-sm) var(--sp-lg); border-bottom:1px solid var(--border-color); background:var(--bg-surface); flex-shrink:0; }
        .dsat-cols { display:flex; flex:1; overflow:hidden; }
        .dsat-main { flex:3; padding:var(--sp-lg); display:flex; flex-direction:column; overflow-y:auto; }
        .dsat-sidebar { width:220px; flex-shrink:0; padding:var(--sp-md); display:flex; flex-direction:column; gap:var(--sp-sm); background:var(--bg-elevated); border-left:1px solid var(--border-color); }

        /* ── Minimal Mode ── */
        .layout-minimal { max-width:600px; margin:0 auto; display:flex; flex-direction:column; min-height:80vh; }
        .layout-minimal .mcq-option { border-radius:24px !important; padding:16px 20px !important; text-align:center; }
        /* ── Responsive adjustments ── */
        @media (max-width: 768px) {
          .layout-sat, .layout-dsat { flex-direction: column; overflow: visible; height: auto; }
          .sat-sidebar, .dsat-sidebar { width: 100%; border-right: none; border-bottom: 1px solid var(--border-color); flex-direction: row; flex-wrap: wrap; align-items: center; justify-content: space-between; }
          .sat-q-nav, .dsat-sidebar-nav { grid-template-columns: repeat(12, 1fr) !important; max-height: 120px; width: 100%; overflow-y: auto;display:flex; }
          .sat-main, .dsat-main { overflow: visible; }
          .sat-header-right {     justify-content: space-between; flex-wrap: wrap; width: 100%; }
          
          .quizpro-body { flex-direction: column; overflow: visible; }
          .qp-passage { border-right: none; border-bottom: 1px solid var(--border-color); max-height: 30vh; }
          .qp-question { overflow: visible; }
          
          .ed-body { flex-direction: column-reverse; gap: 20px; }
          .ed-sidebar { width: 100%; position: static; height: auto; margin-bottom: 20px; }
        }
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
  let _qTimer = null;
  let _totalSec = 0;
  let _qSec = 0;
  let _paused = false;
  let _qStartTime = 0;

  function init() {
    const quiz = State.get("quiz");
    const currentIdx = quiz.currentIdx || 0;
    
    // Adaptive state tracking
    if (quiz.isAdaptive) {
       quiz.adaptivePool = [...quiz.questions];
       quiz.questions = [quiz.adaptivePool[0]]; // Start with one
       quiz.adaptiveLevel = 1; // 0:Easy, 1:Med, 2:Hard
    }

    State.merge("quiz", { currentIdx: 0 });
    startTotalTimer();
    renderQuestion();
    renderQNav();
  }

  function startTotalTimer() {
    const quiz = State.get("quiz");
    const cfg = quiz.config;
    const limit = parseInt(cfg["Quiz Time"] || 0);
    _totalSec = limit > 0 ? limit : 0;

    clearInterval(_totalTimer);
    _totalTimer = setInterval(() => {
      if (_paused) return;
      if (limit > 0) {
        _totalSec--;
        updateTotalTimerEl();
        if (_totalSec <= 0) {
          clearInterval(_totalTimer);
          submit();
        }
      } else {
        _totalSec++;
        updateTotalTimerEl();
      }
    }, 1000);
  }

  function updateTotalTimerEl() {
    const quiz = State.get("quiz");
    const limit = parseInt(quiz.config["Quiz Time"] || 0);
    const timeStr = fmtTime(_totalSec);

    // Update all potential timer elements across templates
    [
      "total-timer",
      "total-timer-qp",
      "total-timer-ed",
      "total-timer-vib",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = timeStr;
        if (limit > 0) {
          el.className =
            "font-mono font-bold " +
            (_totalSec < 60
              ? "timer-danger"
              : _totalSec < 300
              ? "timer-warn"
              : "timer-safe");
        }
      }
    });
  }

  function startQTimer() {
    const quiz = State.get("quiz");
    const limit = parseInt(quiz.config["Question Time"] || 0);
    _qSec = limit > 0 ? limit : 0;
    _qStartTime = Date.now();

    clearInterval(_qTimer);
    if (limit <= 0) {
      const el = document.getElementById("q-timer");
      if (el) el.textContent = "—";
      return;
    }

    const el = document.getElementById("q-timer");
    if (el) {
      el.textContent = fmtTime(_qSec);
      el.className = "font-mono font-bold timer-safe";
    }

    _qTimer = setInterval(() => {
      if (_paused) return;
      _qSec--;
      if (el) {
        el.textContent = fmtTime(Math.max(0, _qSec));
        el.className =
          "font-mono font-bold " +
          (_qSec < 10
            ? "timer-danger"
            : _qSec < 30
            ? "timer-warn"
            : "timer-safe");
      }
      if (_qSec <= 0) {
        clearInterval(_qTimer);
        const cfg = State.get("quiz").config;
        if ((cfg["Auto Next Question"] || "Off") === "On") next();
      }
    }, 1000);
  }

  function renderQuestion() {
    const quiz = State.get("quiz");
    const q = quiz.questions[quiz.currentIdx];
    if (!q) return;

    // Update common markers
    const elsIdx = document.querySelectorAll("#q-idx");
    elsIdx.forEach((el) => (el.textContent = quiz.currentIdx + 1));

    // Progress Bars
    const elProg = document.getElementById("quiz-progress");
    const pct = (quiz.currentIdx / quiz.questions.length) * 100;
    if (elProg) elProg.style.width = pct + "%";

    // Segmented Progress (QuizPro Theme)
    const segProg = document.getElementById("quiz-segmented-progress");
    if (segProg) {
      segProg.innerHTML = quiz.questions
        .map(
          (_, i) =>
            `<div class="qp-seg ${i <= quiz.currentIdx ? "active" : ""}"></div>`
        )
        .join("");
    }

    // Theme specific stats
    const satCount = document.getElementById("sat-answered-count");
    const totalAns = countAnswered();
    if (satCount)
      satCount.textContent = totalAns + " / " + quiz.questions.length;

    const sAns = document.getElementById("stat-ans"),
      sRem = document.getElementById("stat-rem");
    if (sAns) sAns.textContent = totalAns;
    if (sRem) sRem.textContent = quiz.questions.length - totalAns;

    const qpAns = document.getElementById("qp-ans-count");
    if (qpAns) qpAns.textContent = totalAns;

    // Mark/flag UI
    const ans = quiz.answers[quiz.currentIdx] || {};
    const markBtn = document.getElementById("mark-btn");
    if (markBtn) markBtn.style.color = ans.flagged ? "var(--color-warn)" : "";

    // Render question content
    const panel = document.getElementById("question-panel");
    QuestionRenderer.render(panel, q, quiz.currentIdx);

    startQTimer();
    renderQNav();

    // Navigation state
    const cfg = quiz.config;
    const allowBack = (cfg["Allow Back"] || "On") === "On";
    const prevBtn = document.getElementById("btn-prev");
    const nextBtn = document.getElementById("btn-next");
    if (prevBtn) prevBtn.disabled = !allowBack || quiz.currentIdx === 0;
    const isLast = quiz.currentIdx === quiz.questions.length - 1;
    
    if (quiz.template === 'study') {
      const ansText = document.getElementById('study-answer-text');
      const expText = document.getElementById('study-explanation-text');
      if (ansText) ansText.innerHTML = Results.getCorrectAnswer(q);
      if (expText) expText.innerHTML = q.Explanation || q.Solution || "No learning insight provided for this entry.";
      
      const nextBtnText = document.getElementById('btn-next-text');
      if (nextBtnText) nextBtnText.textContent = isLast ? "FINISH" : "NEXT";
    } else {
      if (nextBtn) nextBtn.textContent = isLast ? "✓ Finish" : "Next →";
    }
  }

  function renderQNav() {
    const quiz = State.get("quiz");
    const nav = document.getElementById("q-nav");
    if (!nav) return;
    nav.innerHTML = "";

    const tmpl = quiz.template || "default";

    quiz.questions.forEach((_, i) => {
      const ans = quiz.answers[i] || {};
      const isActive = i === quiz.currentIdx;

      if (tmpl === "editorial") {
        const row = document.createElement("div");
        row.className = "ed-q-row" + (isActive ? " active" : "");
        row.innerHTML = `
           <span style="width:24px;opacity:.5">${String(i + 1).padStart(
             2,
             "0"
           )}</span>
           <span style="flex:1">${(
             quiz.questions[i].Category || "General Question"
           ).substring(0, 20)}...</span>
           <div class="dot ${
             ans.userAnswer !== undefined
               ? "done"
               : ans.flagged
               ? "flagged"
               : ""
           }"></div>`;
        row.onclick = () => jumpTo(i);
        nav.appendChild(row);
      } else {
        const btn = document.createElement("button");
        btn.className = "q-nav-dot";
        btn.textContent = i + 1;
        btn.style.cssText = `
          width:28px;height:28px;border-radius:6px;font-size:.72rem;font-weight:700;
          border:1.5px solid var(--border-color);cursor:pointer;
          background:${
            isActive
              ? "var(--accent-primary)"
              : ans.userAnswer !== undefined
              ? "var(--color-success)"
              : ans.flagged
              ? "rgba(251,191,36,.2)"
              : "var(--bg-elevated)"
          };
          color:${isActive ? "#fff" : "var(--text-secondary)"};
          transition:all .15s;
        `;
        if (ans.flagged) btn.style.borderColor = "var(--color-warn)";
        btn.onclick = () => jumpTo(i);
        nav.appendChild(btn);
      }
    });
  }

  function getQTime() {
    return Math.round((Date.now() - _qStartTime) / 1000);
  }

  function next() {
    saveCurrentAnswer();
    const quiz = State.get("quiz");
    const cfg = quiz.config;

    // Mandatory answer check
    if ((cfg["Mandatory Answer"] || "Off") === "On") {
      const ans = quiz.answers[quiz.currentIdx];
      if (
        !ans ||
        ans.userAnswer === undefined ||
        ans.userAnswer === "" ||
        ans.userAnswer === null
      ) {
        UI.toast("Answer is mandatory before proceeding", "warn");
        return;
      }
    }

    // Adaptive Mode Progression
    if (quiz.isAdaptive && quiz.currentIdx === quiz.questions.length - 1) {
       if (quiz.adaptivePool && quiz.adaptivePool.length > quiz.questions.length) {
          const lastAns = quiz.answers[quiz.currentIdx];
          const isCorr = Results.isCorrect(quiz.questions[quiz.currentIdx], lastAns.userAnswer);
          
          if (isCorr) quiz.adaptiveLevel = Math.min(2, (quiz.adaptiveLevel || 1) + 1);
          else quiz.adaptiveLevel = Math.max(0, (quiz.adaptiveLevel || 1) - 1);
          
          const levels = ["Easy", "Medium", "Hard"];
          const target = levels[quiz.adaptiveLevel];
          
          const usedIds = quiz.questions.map(q => q.ID || q.Question);
          let nextQ = quiz.adaptivePool.find(q => !usedIds.includes(q.ID || q.Question) && (q.Difficulty || "Medium") === target);
          
          if (!nextQ) {
             nextQ = quiz.adaptivePool.find(q => !usedIds.includes(q.ID || q.Question));
          }
          
          if (nextQ) {
             quiz.questions.push(nextQ);
             UI.toast(`Adaptive: Difficulty set to ${target}`, "info", 1000);
          }
       }
    }

    if (quiz.currentIdx >= quiz.questions.length - 1) {
      if ((cfg["Auto Submit"] || "Off") === "On") {
        submit();
      } else {
        confirmSubmit();
      }
    } else {
      State.merge("quiz", { currentIdx: quiz.currentIdx + 1 });
      renderQuestion();
    }
  }

  function prev() {
    saveCurrentAnswer();
    const quiz = State.get("quiz");
    if (quiz.currentIdx > 0) {
      State.merge("quiz", { currentIdx: quiz.currentIdx - 1 });
      renderQuestion();
    }
  }

  function jumpTo(idx) {
    const quiz = State.get("quiz");
    const cfg = quiz.config;
    
    // Check Allow Back
    if ((cfg["Allow Back"] || "On") === "Off" && idx < quiz.currentIdx) {
      UI.toast("Back navigation is disabled", "warn");
      return;
    }
    
    // Check Sequential
    if ((cfg["Question Navigation"] || "Free") === "Sequential") {
      let maxAllowed = 0;
      for (let i = 0; i < quiz.questions.length; i++) {
        if (quiz.answers[i]?.userAnswer !== undefined) {
          maxAllowed = i + 1;
        } else {
          break;
        }
      }
      if (idx > quiz.currentIdx && idx > maxAllowed) {
        UI.toast("Sequential navigation: you must answer previous questions first", "warn");
        return;
      }
    }
    saveCurrentAnswer();
    State.merge("quiz", { currentIdx: idx });
    renderQuestion();
  }

  function saveCurrentAnswer() {
    const quiz = State.get("quiz");
    const idx = quiz.currentIdx;
    const current = QuestionRenderer.collectAnswer();
    if (current !== null) {
      const answers = { ...quiz.answers };
      answers[idx] = {
        ...answers[idx],
        userAnswer: current,
        timeTaken: getQTime(),
      };
      State.merge("quiz", { answers });
    }
  }

  function toggleMark() {
    const quiz = State.get("quiz");
    const idx = quiz.currentIdx;
    const answers = { ...quiz.answers };
    answers[idx] = { ...answers[idx], flagged: !(answers[idx] || {}).flagged };
    State.merge("quiz", { answers });
    renderQuestion();
  }

  function showHint() {
    const quiz = State.get("quiz");
    const q = quiz.questions[quiz.currentIdx];
    const hint = q.Hint || "No hint available for this question.";

    // Remove any existing hint popup
    const old = document.getElementById("hint-popup");
    if (old) old.remove();

    const popup = document.createElement("div");
    popup.id = "hint-popup";
    popup.innerHTML = `
      <div class="hint-popup-inner">
        <div class="hint-popup-header">
          <span class="hint-popup-icon">💡</span>
          <span class="hint-popup-title">HINT</span>
          <button class="hint-popup-close" onclick="document.getElementById('hint-popup').remove()">✕</button>
        </div>
        <div class="hint-popup-body">${hint}</div>
      </div>
    `;
    document.body.appendChild(popup);

    // Auto-dismiss after 8s
    setTimeout(() => {
      const el = document.getElementById("hint-popup");
      if (el) { el.classList.add("hint-exit"); setTimeout(() => el.remove(), 350); }
    }, 8000);
  }

  function togglePause() {
    _paused = !_paused;
    const overlay = document.getElementById("pause-overlay");
    if (overlay) overlay.style.display = _paused ? "grid" : "none";
    const btn = document.getElementById("pause-btn");
    if (btn) btn.textContent = _paused ? "▶" : "⏸";
  }

  function confirmSubmit() {
    UI.modal(`
      <div style="text-align:center;padding:var(--sp-md)">
        <div style="font-size:3.5rem;margin-bottom:var(--sp-md)">📄</div>
        <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:var(--sp-sm)">Finish Attempt?</h2>
        <p class="text-muted" style="margin-bottom:var(--sp-xl)">
          You've completed <strong>${countAnswered()}</strong> / <strong>${
      State.get("quiz").questions.length
    }</strong> questions.
        </p>
        <div style="display:flex;gap:var(--sp-md);justify-content:center">
          <button class="btn btn-secondary btn-lg" onclick="UI.closeModal()">Not Yet</button>
          <button class="btn btn-primary btn-lg" onclick="UI.closeModal();QuizEngine.submit()">Submit Quiz</button>
        </div>
      </div>`);
  }

  function countAnswered() {
    const { answers } = State.get("quiz");
    return Object.values(answers).filter(
      (a) =>
        a.userAnswer !== undefined &&
        a.userAnswer !== null &&
        a.userAnswer !== ""
    ).length;
  }

  async function submit() {
    saveCurrentAnswer();
    clearInterval(_totalTimer);
    clearInterval(_qTimer);

    const quiz = State.get("quiz");
    UI.setLoading(true, "Finalizing your attempt...");
    const endTime = new Date().toISOString();
    const score = Results.calculateScore(quiz);

    // Save to Drive
    try {
      if (quiz.fileId) {
        const rows = quiz.questions.map((q, i) => {
          const ans = quiz.answers[i] || {};
          const correct = Results.isCorrect(q, ans.userAnswer);
          return {
            QuestionIndex: i + 1,
            QuestionText: q.Question,
            UserAnswer: Array.isArray(ans.userAnswer)
              ? ans.userAnswer.join("|")
              : ans.userAnswer || "",
            CorrectAnswer: q["Correct Answer"],
            IsCorrect: correct ? "TRUE" : "FALSE",
            TimeTaken: ans.timeTaken || 0,
            Category: q.Category || "",
            SubCategory: q["Sub Category"] || "",
            Difficulty: q.Difficulty || "",
            QuestionType: q["Question Type"] || "",
            Score: q.Score || 1,
            NegScore: q["Negative Score"] || 0,
            PartialScore: q["Partial Score"] || 0,
          };
        });
        await API.saveAttemptDetail(quiz.fileId, rows);
        await API.endAttempt({
          fileId: quiz.fileId,
          endTime,
          score: score.total,
        });
      }
    } catch (e) {
      console.warn("Could not save results:", e.message);
    }

    State.set("result", {
      quiz,
      score,
      endTime,
      startTime: new Date(quiz.startTime).toISOString(),
    });

    UI.setLoading(false);

    const cfg = quiz.config;
    if ((cfg["Final Result"] || "On") === "On") {
      UI.pushPage("result");
    } else {
      UI.toast("Quiz submitted!", "success");
      UI.pushPage("welcome");
    }
  }

  function autoSubmit() {
    submit();
  }

  return {
    init,
    next,
    prev,
    jumpTo,
    toggleMark,
    showHint,
    togglePause,
    confirmSubmit,
    submit,
  };
})();

// ── Time formatter ─────────────────────────────────────────
function fmtTime(sec) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0)
    return `${h}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(
      2,
      "0"
    )}`;
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
