// ============================================================
//  QUIZ APP — quiz.js
//  Quiz runtime engine, timer, navigation, question renderer
// ============================================================

const PageQuiz = (() => {
  let _totalTimer = null;
  let _qTimer = null;
  let _totalSec = 0;
  let _qSec = 0;
  let _paused = false;
  let _qStartTime = 0;
  let _voiceSuspendedBySystem = false;
  let _navigating = false;

  function render(main) {
    const quiz = State.get("quiz");
    const cfg = quiz.config;
    const qs = quiz.questions;
    const totalTime = parseInt(cfg["Quiz Time"] || 0);
    const allowBack = (cfg["Allow Back"] || "On") === "On" && !quiz.isAdaptive;
    const canPause = (cfg["Pause / Resume Allowed"] || "On") === "On";
    const showHint = (cfg["Show Hint"] || "On") === "On";
    const markReview = (cfg["Mark for Review"] || "On") === "On";

    // Strict Global Compatibility Check: Voice is ONLY enabled if the ENTIRE quiz is supported
    const isQuizVoiceSupported = qs.every(q => {
        const type = (q["Question Type"] || "Multichoice").trim();
        return ["Multichoice", "Multi Multichoice", "Multichoice Anycorrect", "True/False"].includes(type);
    });
    State.set("isQuizVoiceSupported", isQuizVoiceSupported);

    const tmpl = quiz.template || "default";

    const voiceBtnHTML = isQuizVoiceSupported 
       ? `<button class="btn btn-ghost btn-sm ${document.body.classList.contains('voice-active') ? 'active' : ''}" id="voice-mode-btn" onclick="PageQuiz.toggleVoice()" title="Toggle Voice Commands">🎙️ Voice</button>`
       : `<button class="btn btn-ghost btn-sm disabled" title="Voice disabled: Entire quiz must be multiple-choice compatible" style="opacity:0.3; cursor:not-allowed" disabled>🎙️ Voice</button>`;

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
            ? `<button class="btn btn-ghost btn-sm" id="hint-btn" onclick="PageQuiz.showHint()" title="Hint">💡</button>`
            : ""
        }
        ${
          markReview
            ? `<button class="btn btn-ghost btn-sm" id="mark-btn" onclick="PageQuiz.toggleMark()" title="Mark for Review">🚩</button>`
            : ""
        }
      </div>`;
    const submitHTML = `<button class="btn btn-sm" style="background:var(--color-error);color:#fff;font-weight:700" onclick="PageQuiz.confirmSubmit()">Submit</button>`;
    const pauseHTML = canPause
      ? `<button class="btn btn-ghost btn-sm" id="pause-btn" onclick="PageQuiz.togglePause()" title="Pause">⏸</button>`
      : "";

    const showInstant = (cfg["Instant Answer"] || "Off") === "On";
    const revealBtnHTML = (showInstant && tmpl !== 'study')
       ? `<button class="btn btn-warning btn-sm" id="btn-reveal" onclick="QuestionRenderer.revealAnswer()" 
                  style="border-radius:4px; font-weight:800; background:#f59e0b; color:#fff; border:none; box-shadow:0 4px 15px rgba(245,158,11,0.3); display:none; align-items:center; gap:8px">🔍 REVEAL</button>`
       : "";

    let layoutHtml; 
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
                ${voiceBtnHTML}
              </div>
            </div>
            <div class="sat-content" style="padding-bottom: 120px;">
               <div id="question-panel"></div>
            </div>
            
            <div class="sat-footer" style="position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; height: max-content !important; z-index: 999999 !important; background: #0c0d19 !important; border-top: 1px solid rgba(255,255,255,0.1) !important; display: flex !important; align-items: center !important; justify-content: center !important; width: 100% !important; padding: 5px 2px;">
               <div class="footer-wrap" style="display: flex !important; flex-wrap: wrap; width: 100% !important; max-width: 1400px !important; align-items: center !important;justify-content: space-around;">
                  <div class="grid-left" style="display: flex !important; justify-content: flex-start !important;">
                    <button class="btn btn-ghost btn-sm" id="btn-prev" onclick="PageQuiz.prev()" ${!allowBack ? "disabled" : ""} style="color:rgba(255,255,255,0.6) !important;background:#7c4dff">← BACK</button>
                  </div>
                  <div class="grid-center hide-mobile" style="display: flex !important; justify-content: center !important; flex-direction:column; gap:8px; align-items:center">
                     <div class="cli-bar-wrap" id="cli-wrap-sat">
                       <input id="cli-input" class="cli-bar" placeholder="Type command... (e.g. next, mark, q5)" onkeydown="PageQuiz.handleConsoleCommand(event)">
                     </div>
                  </div>
                  <div class="grid-right" style="display: flex !important; justify-content: flex-end !important; align-items: center !important; gap: 20px !important;">
                     ${actionsHTML}
                     ${revealBtnHTML}
                     <button class="btn btn-primary btn-sm" id="btn-next" onclick="PageQuiz.next()" style=" border-radius:4px !important; font-weight:900 !important; background: #7c4dff !important; color: #fff !important; box-shadow: 0 8px 30px rgba(124, 77, 255, 0.4) !important; border: none !important;">NEXT →</button>
                  </div>
               </div>
            </div>
          </div>
        </div>`;
    }
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
          <div class="quizpro-footer" style="position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; z-index: 999999 !important; background: var(--bg-surface) !important; border-top: 1px solid var(--border-color) !important; display: flex !important; align-items: center !important; justify-content: center !important; width: 100% !important;">
             <div class="footer-wrap" style="display: grid !important; grid-template-columns: 1fr auto 1fr !important; width: 100% !important; max-width: 1400px !important; padding: 0 5px !important; align-items: center !important;">
              <div class="grid-left" style="display: flex !important; justify-content: flex-start !important;">
                <button class="btn btn-secondary btn-sm" id="btn-prev" onclick="PageQuiz.prev()" ${ !allowBack ? "disabled" : ""}>← PREVIOUS</button>
              </div>
              <div class="grid-center hide-mobile" style="display: flex !important; justify-content: center !important; flex-direction:column; gap:8px; align-items:center">
                 <div class="cli-bar-wrap" id="cli-wrap-qp">
                   <input id="cli-input-qp" class="cli-bar" placeholder="Command..." onkeydown="PageQuiz.handleConsoleCommand(event)">
                 </div>
              </div>
              <div class="grid-right" style="display: flex !important; justify-content: flex-end !important; align-items: center !important; gap: 20px !important;">
                 ${actionsHTML}
                 ${revealBtnHTML}
                 <button class="btn btn-primary btn-xs" id="btn-next" onclick="PageQuiz.next()" style="background:var(--accent-primary) !important; color:#000 !important; font-weight:900 !important; border:none !important; border-radius:10px !important;">NEXT →</button>
              </div>
             </div>
          </div>
        </div>`;
    }
    else if (tmpl === "study") {
      layoutHtml = `
        <div class="layout-immersive-study">
          <div class="study-nav-header">
             <div class="header-left">
                <span class="study-badge">LEARNING MODE</span>
                <div class="study-id-capsule" onclick="PageQuiz.showJumpMenu()" style="cursor:pointer; background:rgba(255,255,255,0.03); padding:4px 12px; border-radius:8px; border:1px solid transparent; transition:0.3s" onmouseover="this.style.borderColor='var(--accent-primary-transparent)'" onmouseout="this.style.borderColor='transparent'">
                   <span class="label" style="opacity:0.7">${quiz.config.title || "Topic"}</span>
                   <span id="q-idx" class="val" style="margin-left:8px">1</span>
                   <span class="total">/ ${qs.length} <span style="font-size:0.7rem; margin-left:4px">▼</span></span>
                </div>
             </div>
             <div class="header-center">
                <div class="study-progress-track">
                   <div class="fill" id="quiz-progress"></div>
                </div>
             </div>
             <div class="header-right" style="gap:12px">
                 <button class="btn btn-ghost btn-sm" onclick="PageQuiz.downloadStudyPDF()" title="Download Study Guide">📥 PDF</button>
                <button class="btn btn-ghost btn-sm" onclick="location.reload()" style="font-weight:800; color:var(--color-error); border-radius:8px">×</button>
             </div>
          </div>
          
          <div class="study-viewport">
             <div class="study-content-stack">
                <div class="study-block question-block">
                   <div class="block-label">PROBLEM STATEMENT</div>
                   <div id="question-panel"></div>
                </div>
                
                <div class="study-block answer-block hidden">
                   <div class="block-label">STRATEGIC EXPLANATION</div>
                   <div id="study-explanation" class="study-val">Identifying the optimal approach...</div>
                </div>
             </div>
          </div>

          <div class="study-footer">
             <div class="footer-wrap">
                <div class="grid-left">
                   <button class="btn btn-secondary btn-sm" onclick="PageQuiz.prev()" id="btn-prev" style="font-weight:800">← PREVIOUS</button>
                </div>
                
                <div class="grid-center">
                  <div class="cli-bar-wrap" id="cli-wrap-st">
                    <input id="cli-input-st" class="cli-bar" placeholder="Command..." onkeydown="PageQuiz.handleConsoleCommand(event)">
                  </div>
                </div>
                
                <div class="grid-right">
                    <button class="btn btn-primary btn-sm" id="btn-next" onclick="PageQuiz.next()" style=" border-radius:4px; font-weight:900; background:var(--accent-primary) !important; border:none !important; box-shadow:0 8px 20px var(--accent-shadow);padding:6px 10px !important">NEXT →</button>
                </div>
             </div>
          </div>
        </div>
        
        <style>
          .layout-immersive-study { height: calc(100vh - 52px); background: var(--bg-main); display: flex; flex-direction: column; overflow: hidden; }
          .study-nav-header { height: 64px; background: var(--bg-surface); border-bottom: 1px solid var(--border-color); display: flex; align-items:center; justify-content:space-between; padding: 0 32px; flex-shrink:0; position:relative; z-index:100; }
          .study-badge { font-size: 0.65rem; font-weight: 900; color: var(--accent-primary); background: var(--accent-primary-transparent); padding: 4px 12px; border-radius: 99px; letter-spacing: 0.1em; }
          .study-id-capsule { display:flex; align-items:baseline; gap:6px; font-weight:800; }
          .study-id-capsule .val { color: var(--accent-primary); }
          .study-id-capsule .total { color: var(--text-muted); font-size: 0.9rem; }
          
          .study-viewport { flex: 1; overflow-y: auto; padding: 22px 8px; background: radial-gradient(circle at 50% 0%, var(--bg-elevated) 0%, var(--bg-main) 100%); user-select: text !important; -webkit-user-select: text !important; }
          .study-content-stack { max-width: 860px; margin: 0 auto; display: flex; flex-direction: column; gap: 32px; padding-bottom: 40px; }
          
          .study-footer { 
            position: sticky; bottom: 0; z-index: 1000;
            height: max-content; background: var(--bg-surface); 
            border-top: 1px solid var(--border-color); 
            display: flex; align-items: center; justify-content: center; 
            flex-shrink: 0; 
            box-shadow: 0 -10px 40px rgba(0,0,0,0.15);
            backdrop-filter: blur(10px);
          }
          .footer-wrap { width: 100%; max-width: 1100px; padding: 0 32px; display: flex; justify-content: space-between; align-items: center; }
          
          /* Zen Mode Removed */
          body #app { display: block; }
          
          .zen-toggle-fixed { position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; gap: 8px; }
          .zen-btn { background: var(--bg-surface); border: 1px solid var(--border-color); color: var(--text-primary); padding: 8px 16px; border-radius: 99px; font-size: 0.75rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: var(--shadow-sm); }
          .zen-btn.active { border-color: var(--accent-primary); color: var(--accent-primary); background: var(--accent-primary-transparent); }
          
          .study-block, .study-val, .option-card, .option-label, #question-panel { user-select: text !important; -webkit-user-select: text !important; }
          
          .sat-footer, .quizpro-footer, .study-footer {
            position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; z-index: 1000 !important;
            background: var(--bg-surface) !important; border-top: 1px solid var(--border-color) !important;
            display: flex !important; align-items: center !important; justify-content: center !important;
            height: max-content !important; width: 100vw !important;
            box-shadow: 0 -10px 40px rgba(0,0,0,0.3) !important;
          }
          
          .footer-wrap { 
            width: 100% !important; max-width: 1400px !important; padding: 0 40px !important; 
            display: grid !important; grid-template-columns: 1fr auto 1fr !important; align-items: center !important; 
          }
          .grid-left { display: flex; justify-content: flex-start; }
          .grid-center { display: flex; justify-content: center; }
          .grid-right { display: flex; justify-content: flex-end; gap: 20px; align-items: center; }

          @media (max-width: 768px) {
            .study-footer, .sat-footer, .quizpro-footer { height: max-content !important; }
            .footer-wrap { padding: 0 15px !important; grid-template-columns: 1fr 1fr !important; }
            .grid-center { display: none !important; }
            .grid-right { gap: 10px; }
            .btn-lg { padding: 12px 25px !important; font-size: 0.85rem !important; }
          }
          .study-block { background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 4px; padding: 5px; box-shadow: var(--shadow-sm); }
          .block-label { font-size: 0.75rem; font-weight: 900; color: var(--text-muted); letter-spacing: 0.1em; margin-bottom: 10px; display: flex; align-items: center; gap: 10px; }
          .block-label::before { content: ""; width: 10px; height: 10px; background: var(--accent-primary); border-radius: 3px; rotate: 45deg; }
          .question-block { border-top: 5px solid var(--accent-primary); }
          .answer-block { border-left: 6px solid #10b981; background: rgba(16, 185, 129, 0.02); }
          .rationale-block { background: var(--bg-elevated); border-style: dashed; border-width: 2px; }
          .study-val { font-size: 1.15rem; line-height: 1.8; color: var(--text-primary); font-weight: 500; white-space: pre-line; }
          .study-footer { background: var(--bg-surface); border-top: 1px solid var(--border-color); display: flex; align-items:center; padding: 0 40px; flex-shrink:0 }
          .footer-wrap { max-width: 1200px; margin: 0 auto; width: 100%; display: flex; justify-content: space-between; align-items: center; }
          .status-marker { background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; border:1px solid #10b981; }
          .block-header { display: flex; justify-content: space-between; margin-bottom: 16px; align-items: center; }
          .study-progress-track { width: 240px; height: 6px; background: var(--bg-elevated); border-radius: 3px; overflow: hidden; }
          .study-progress-track .fill { height: 100%; width: 0%; background: var(--accent-primary); transition: width 0.4s var(--ease); }
          
          @media (max-width: 768px) {
            .header-center { display: none; }
            .study-nav-header { padding: 0 16px; }
            .study-footer { padding: 9px; 6px;}
            .study-block { padding: 4px; }
          }
        </style>
      `;
    } else {
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
            <button class="btn btn-ghost btn-sm" id="btn-prev" onclick="PageQuiz.prev()" ${
              !allowBack ? "disabled" : ""
            }>← Back</button>
            <div style="display:flex;gap:var(--sp-sm)">${actionsHTML}${revealBtnHTML}<button class="btn btn-primary btn-sm" id="btn-next" onclick="PageQuiz.next()">Next →</button></div>
          </div>
        </div>`;
    }

    const pauseOverlay = `
      <div id="pause-overlay" class="hidden" style="position:fixed;inset:0;background:var(--bg-base);z-index:500;display:grid;place-items:center;">
        <div style="text-align:center">
          <div style="font-size:4rem;margin-bottom:var(--sp-md)">⏸</div>
          <h2 style="font-size:1.8rem;font-weight:800;margin-bottom:var(--sp-sm)">Quiz Paused</h2>
          <p class="text-muted" style="margin-bottom:var(--sp-xl)">Your progress is saved</p>
          <button class="btn btn-primary btn-lg" onclick="PageQuiz.togglePause()">▶ Resume</button>
        </div>
      </div>`;

    const stylesHTML = `
      <style>
        .cli-bar {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
          color: #fff; font-family: var(--font-mono); font-size: 0.7rem;
          padding: 6px 12px; border-radius: 6px; width: 100%; outline: none;
          transition: all 0.2s; text-align: center;
        }
        .cli-bar:focus { background: rgba(255,255,255,0.1); border-color: var(--accent-primary); }
        .cli-bar-wrap {
          display: none; /* hidden by default, shown via toggleConsole() */
          width: 100%;
          max-width: 300px;
        }
        .cli-bar-wrap.open { display: block; }
        
        [data-theme="editorial"] #question-panel { font-family: var(--font-content, serif); }
        [data-theme="editorial"] .mcq-option { border: none !important; border-bottom: 1px solid var(--border-color) !important; border-radius: 0 !important; padding: 10px 0 !important; background: transparent !important; }
        [data-theme="quizpro-dark"] .mcq-option { border-radius: 6px !important; border-width: 1px !important; background: var(--bg-elevated) !important; padding: 10px 14px !important; margin-bottom: 8px; }

        /* ── Standard Design ── */
        .layout-sat { display:flex; height:calc(100vh - 52px); overflow:hidden; background:var(--bg-base); }
        .sat-sidebar { width:200px; display:flex; flex-direction:column; border-right:1px solid var(--border-color); background:var(--bg-surface); }
        .sat-sidebar-header { padding: 10px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
        .sat-sidebar-title { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
        .sat-q-nav { padding: 6px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; overflow-y: auto; justify-items: center; }
        .sat-sidebar-legend { padding: 10px; display: flex; justify-content: space-between; gap: 4px; font-size: 0.6rem; color: var(--text-secondary); }
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
    PageQuiz.init();
  }

  // ── Engine Logic (Merged) ──────────────────────────────────

  function init() {
    VoiceEngine.init();
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

    const nextBtn = document.getElementById("btn-next");
    const prevBtn = document.getElementById("btn-prev");

    // --- Voice Constraint Logic ---
    const qType = (q["Question Type"] || "Multichoice").trim();
    const isVoiceSupported = ["Multichoice", "Multi Multichoice", "Multichoice Anycorrect", "True/False"].includes(qType) && quiz.template !== 'study';
    const voiceBtn = document.getElementById("voice-mode-btn");

    if (quiz.template === 'study') {
       if (typeof VoiceEngine !== 'undefined') {
          if (VoiceEngine.isActive && VoiceEngine.isActive()) VoiceEngine.stop();
          if (VoiceEngine.hideStatusBar) VoiceEngine.hideStatusBar();
       }
    }

    if (voiceBtn) {
      if (!isVoiceSupported) {
        voiceBtn.style.opacity = '0.4';
        voiceBtn.title = "Voice control only available for Multiple Choice & True/False";
        // Force stop if active
        if (typeof VoiceEngine !== 'undefined' && VoiceEngine.isActive && VoiceEngine.isActive()) {
           _voiceSuspendedBySystem = true;
           VoiceEngine.stop();
           voiceBtn.classList.remove('active');
        }
      } else {
        voiceBtn.style.opacity = '1';
        voiceBtn.title = "Toggle Voice Commands";
        // Auto resume if it was suspended by the system
        if (_voiceSuspendedBySystem && typeof VoiceEngine !== 'undefined') {
           _voiceSuspendedBySystem = false;
           if (VoiceEngine.toggle) {
             const active = VoiceEngine.toggle();
             voiceBtn.classList.toggle('active', active);
           }
        }
      }
    }

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

    if (nextBtn && quiz.template === 'study') {
       const isLast = quiz.currentIdx === quiz.questions.length - 1;
       nextBtn.innerHTML = isLast ? "TAKE TEST 🚀" : "NEXT →";
       nextBtn.className = isLast ? "btn btn-primary btn-lg pulse-highlight" : "btn btn-primary btn-lg";
    }

    if (quiz.template === 'study') {
       // Mark as revealed automatically for Study Mode
       if (!quiz.revealedIdxs) quiz.revealedIdxs = {};
       quiz.revealedIdxs[quiz.currentIdx] = true;

       // Auto-populate correct answers for Learning Mode
       const curAn = (quiz.answers || {})[quiz.currentIdx];
       const isEmp = !curAn || !curAn.userAnswer || curAn.userAnswer === "{}" || (Array.isArray(curAn.userAnswer) && curAn.userAnswer.length === 0);
       
       if (isEmp) {
         const correctVal = Results.getCorrectAnswer(q);
         const type = (q["Question Type"] || "").trim();
         
         let processed = correctVal;
         if (type === "Multi Multichoice" || type === "Multichoice Anycorrect") {
           processed = typeof correctVal === 'string' ? correctVal.split("|").map(s => s.trim()) : correctVal;
         } else if (type === "Multi Matching" && typeof correctVal === 'string' && !correctVal.startsWith("{")) {
           try {
             const map = {};
             correctVal.split("|").forEach(p => {
               const pts = p.split(/[:\-\u2192]/);
               if(pts.length >= 2) {
                 const l = pts[0].trim();
                 const r = pts[1].trim();
                 if(!map[l]) map[l] = [];
                 map[l].push(r);
               }
             });
             processed = JSON.stringify(map);
           } catch(e) {}
         } else if (type === "Drag & Drop" && typeof correctVal === 'string') {
            const map = {};
            correctVal.split("|").forEach(p => {
               const parts = p.split(/[:\-\u2192]/);
               if (parts.length >= 2) {
                  const label = parts[0].trim();
                  const cat = parts[1].trim();
                  if (!map[cat]) map[cat] = [];
                  map[cat].push(`${label}-${cat}`);
               }
            });
            processed = JSON.stringify(map);
         } else if (type === "Matching") {
            processed = correctVal || "";
         } else if (type === "Sequence") {
            processed = typeof correctVal === 'string' ? correctVal.split("|").map(s => s.trim()) : correctVal;
         }
         
         quiz.answers[quiz.currentIdx] = {
           userAnswer: processed,
           timeTaken: 0,
           flagged: false
         };
       }
    }

    const revealBtn = document.getElementById("btn-reveal");
    if (revealBtn) {
       const showInstant = (quiz.config["Instant Answer"] || "Off") === "On";
       const isRevealed = !!(quiz.revealedIdxs || {})[quiz.currentIdx];
       revealBtn.style.display = (showInstant && quiz.template !== 'study') ? "inline-flex" : "none";
       revealBtn.disabled = isRevealed;
       revealBtn.style.opacity = isRevealed ? "0.5" : "1";
       revealBtn.innerHTML = isRevealed ? "✓ REVEALED" : "🔍 REVEAL";
    }

    // Mark/flag UI
    const markBtn = document.getElementById("mark-btn");
    const qAns = quiz.answers[quiz.currentIdx] || {};
    if (markBtn) markBtn.style.color = qAns.flagged ? "var(--color-warn)" : "";

    // Render question content
    const el = document.getElementById("question-panel");
    if (el) el.innerHTML = `<div class="p-xl text-center"><div class="spinner"></div></div>`;
    
    // Reset navigation lock on render completion with a small debounce
    setTimeout(() => {
       _navigating = false;
       if (nextBtn) nextBtn.disabled = false;
       if (prevBtn) prevBtn.disabled = (quiz.currentIdx === 0 && !quiz.isAdaptive || (quiz.config["Allow Back"] === "Off"));
    }, 600);

    QuestionRenderer.render(el, q, quiz.currentIdx);

    startQTimer();
    renderQNav();

    // Navigation state
    const cfg = quiz.config;
    const allowBack = (cfg["Allow Back"] || "On") === "On";
    if (prevBtn) prevBtn.disabled = !allowBack || quiz.currentIdx === 0;
    const isLast = quiz.currentIdx === quiz.questions.length - 1;
    
    if (quiz.template === 'study') {
      const expText = document.getElementById('study-explanation');
      if (expText) expText.innerHTML = q.Explanation || q.Solution || "Strategic approach for this concept is currently being finalized.";
    }
    
    if (nextBtn) {
       nextBtn.style.display = 'flex';
       // Only set textContent if we haven't already set high-fidelity innerHTML above
       if (quiz.template !== 'study') {
         nextBtn.textContent = isLast ? "✓ Finish" : "Next →";
       }
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
        if (ans.flagged) btn.style.backgroundColor = "var(--color-warn)";
        btn.onclick = () => jumpTo(i);
        nav.appendChild(btn);
      }
    });
  }

  function getQTime() {
    return Math.round((Date.now() - _qStartTime) / 1000);
  }

  function next() {
    if (_navigating) return;
    _navigating = true;

    // Disable navigation buttons during transition
    const nextBtn = document.getElementById("btn-next");
    const prevBtn = document.getElementById("btn-prev");
    if (nextBtn) nextBtn.disabled = true;
    if (prevBtn) prevBtn.disabled = true;

    UI.stopSpeaking();
    saveCurrentAnswer();
    const quiz = State.get("quiz");
    const cfg = quiz.config;

    if ((cfg["Mandatory Answer"] || "Off") === "On") {
      const ans = quiz.answers[quiz.currentIdx];
      if (!ans || !ans.userAnswer) {
        UI.toast("Answer is mandatory before proceeding", "warn");
        _navigating = false;
        if (nextBtn) nextBtn.disabled = false;
        if (prevBtn) prevBtn.disabled = (quiz.currentIdx === 0 && !quiz.isAdaptive);
        return;
      }
    }

    // Lock the current question before moving away
    if ((cfg["Allow Option Change"] || "On") === "Off") {
       if (!quiz.lockedIdxs) quiz.lockedIdxs = {};
       quiz.lockedIdxs[quiz.currentIdx] = true;
    }

    // Navigation and Scoring
    UI.stopSpeaking();
    
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
          
          if (!nextQ) nextQ = quiz.adaptivePool.find(q => !usedIds.includes(q.ID || q.Question));
          
          if (nextQ) {
             quiz.questions.push(nextQ);
             UI.toast(`Adaptive: Difficulty set to ${target}`, "info", 1000);
          }
       }
    }

    if (quiz.currentIdx >= quiz.questions.length - 1) {
      if (quiz.template === 'study') {
         startActiveTest();
         return;
      }
      if ((cfg["Auto Submit"] || "Off") === "On") submit();
      else confirmSubmit();
    } else {
      State.merge("quiz", { currentIdx: quiz.currentIdx + 1 });
      renderQuestion();
    }
  }

  function prev() {
    if (_navigating) return;
    _navigating = true;

    UI.stopSpeaking();
    saveCurrentAnswer();
    const quiz = State.get("quiz");
    if (quiz.currentIdx > 0) {
      State.merge("quiz", { currentIdx: quiz.currentIdx - 1 });
      renderQuestion();
    } else {
       _navigating = false;
    }
  }

  function jumpTo(idx) {
    if (_navigating) return;
    _navigating = true;

    UI.stopSpeaking();
    const quiz = State.get("quiz");
    const cfg = quiz.config;
    if ((cfg["Allow Back"] || "On") === "Off" && idx < quiz.currentIdx) {
       _navigating = false;
       return;
    }
    saveCurrentAnswer();
    
    // Lock current index before jumping away
    if ((cfg["Allow Option Change"] || "On") === "Off") {
       if (!quiz.lockedIdxs) quiz.lockedIdxs = {};
       quiz.lockedIdxs[quiz.currentIdx] = true;
    }

    State.merge("quiz", { currentIdx: idx });
    renderQuestion();
  }

  function saveCurrentAnswer() {
    const quiz = State.get("quiz");
    const current = QuestionRenderer.collectAnswer();
    if (current !== null) {
      const answers = { ...quiz.answers };
      answers[quiz.currentIdx] = {
        ...answers[quiz.currentIdx],
        userAnswer: current,
        timeTaken: getQTime(),
      };
      State.merge("quiz", { answers });
    }
  }

  function toggleMark() {
    const quiz = State.get("quiz");
    const ans = quiz.answers[quiz.currentIdx] || {};
    ans.flagged = !ans.flagged;
    quiz.answers[quiz.currentIdx] = ans;
    renderQuestion();
  }

  function showHint() {
    const quiz = State.get("quiz");
    const q = quiz.questions[quiz.currentIdx];
    UI.toast(q.Hint || "No hint available.", "info");
  }

  function togglePause() {
    _paused = !_paused;
    const overlay = document.getElementById("pause-overlay");
    if (overlay) overlay.style.display = _paused ? "grid" : "none";
  }

  function confirmSubmit() {
    UI.modal(`
      <div style="text-align:center;padding:var(--sp-md)">
        <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:var(--sp-sm)">Finish Attempt?</h2>
        <p class="text-muted" style="margin-bottom:var(--sp-xl)">You've completed ${countAnswered()} questions.</p>
        <div style="display:flex;gap:var(--sp-md);justify-content:center">
          <button class="btn btn-secondary btn-lg" onclick="UI.closeModal()">Not Yet</button>
          <button class="btn btn-primary btn-lg" onclick="UI.closeModal();PageQuiz.submit()">Submit Quiz</button>
        </div>
      </div>`);
  }

  function countAnswered() {
    const { answers } = State.get("quiz");
    return Object.values(answers).filter(a => a.userAnswer !== undefined && a.userAnswer !== null).length;
  }

  async function submit() {
    saveCurrentAnswer();
    clearInterval(_totalTimer);
    clearInterval(_qTimer);

    // Turn off Voice/CLI overlay before leaving the quiz page
    if (typeof VoiceEngine !== 'undefined' && VoiceEngine.isActive && VoiceEngine.isActive()) {
      VoiceEngine.stop();
    }
    toggleConsole(false);

    const quiz = State.get("quiz");
    UI.setLoading(true, "Finalizing your attempt...");
    const endTime = new Date().toISOString();
    const score = Results.calculateScore(quiz);

    State.set("result", {
      quiz,
      score,
      endTime,
      startTime: new Date(quiz.startTime).toISOString(),
    });

    UI.setLoading(false);

    if ((quiz.config["Final Result"] || "On") === "On") {
      UI.pushPage("result");
    } else {
      UI.toast("Quiz submitted!", "success");
      UI.pushPage("welcome");
    }
  }

  async function downloadStudyPDF() {
    const quiz = State.get("quiz");
    const qs = quiz.questions;
    const title = quiz.config?.title || "PrepQuick Study Guide";
    
    UI.setLoading(true, "Generating High-Fidelity PDF...");

    const html = `
      <div style="padding:40px; font-family:'Sora', sans-serif; color:#1a202c; background:#fff;">
        <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid #7c4dff; padding-bottom:20px; margin-bottom:40px;">
          <div>
            <h1 style="margin:0; color:#7c4dff; font-size:28px; font-weight:800;">PrepQuick</h1>
            <p style="margin:5px 0 0 0; color:#64748b; font-size:14px; text-transform:uppercase; letter-spacing:1px;">Advanced Mastery Session</p>
          </div>
          <div style="text-align:right">
            <h2 style="margin:0; font-size:18px; font-weight:700;">${title}</h2>
            <p style="margin:5px 0 0 0; color:#64748b; font-size:12px;">Generated on ${new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:20px; margin-bottom:40px; background:#f8fafc; padding:20px; border-radius:12px;">
           <div style="text-align:center;">
             <p style="margin:0; font-size:10px; color:#64748b; text-transform:uppercase; font-weight:700;">Questions</p>
             <p style="margin:4px 0 0 0; font-size:20px; font-weight:800;">${qs.length}</p>
           </div>
           <div style="text-align:center; border-left:1px solid #e2e8f0; border-right:1px solid #e2e8f0;">
             <p style="margin:0; font-size:10px; color:#64748b; text-transform:uppercase; font-weight:700;">Topic</p>
             <p style="margin:4px 0 0 0; font-size:14px; font-weight:700;">${quiz.config?.category || "General"}</p>
           </div>
           <div style="text-align:center;">
             <p style="margin:0; font-size:10px; color:#64748b; text-transform:uppercase; font-weight:700;">Time Est.</p>
             <p style="margin:4px 0 0 0; font-size:20px; font-weight:800;">${qs.length * 2} min</p>
           </div>
        </div>

        ${qs.map((q, i) => {
          const choices = QuestionRenderer.getChoices(q);
          const correctVal = Results.getCorrectAnswer(q);
          const explanation = q.Explanation || q.Solution || q.Rationale || "";

          return `
            <div style="margin-bottom:32px; page-break-inside:avoid;">
              <div style="display:flex; gap:12px; margin-bottom:12px;">
                <span style="background:#7c4dff; color:#fff; width:28px; height:28px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px; flex-shrink:0;">${i+1}</span>
                <div style="font-size:15px; font-weight:700; line-height:1.5; color:#1e293b;">${q.Question}</div>
              </div>
              
              ${q.Passage ? `<div style="margin:10px 0 15px 40px; padding:12px; background:#f1f5f9; border-left:4px solid #cbd5e1; font-size:13px; font-style:italic; line-height:1.6;">${q.Passage}</div>` : ""}

              <div style="margin-left:40px; display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px;">
                ${choices.length > 0 ? choices.map((c, j) => {
                  const label = ["A", "B", "C", "D", "E", "F"][j];
                  const rawCorrect = (q["Correct Answer"] || "").split("|").map(s=>s.trim());
                  const isCorrect = rawCorrect.includes(c);
                  return `<div style="padding:10px; border:1px solid #e2e8f0; border-radius:8px; font-size:13px; display:flex; gap:8px; ${isCorrect ? "background:#f0fdf4; border-color:#22c55e;" : ""}">
                    <b style="color:#64748b;">${label}.</b> <span>${c}</span> ${isCorrect ? "<b style='color:#22c55e; margin-left:auto;'>✓</b>" : ""}
                  </div>`;
                }).join("") : `
                  <div style="grid-column: span 2; padding:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; font-size:13px; color:#475569;">
                    <b>Correct Answer:</b> ${correctVal}
                  </div>
                `}
              </div>

              ${explanation ? `<div style="margin:15px 0 0 40px; font-size:12px; color:#475569; background:#fffbeb; border:1px dashed #f59e0b; padding:10px; border-radius:6px;"><b>Solution:</b> ${explanation}</div>` : ""}
            </div>
          `;
        }).join("")}

        <div style="margin-top:60px; text-align:center; color:#94a3b8; font-size:11px; border-top:1px solid #e2e8f0; padding-top:20px;">
          © ${new Date().getFullYear()} PrepQuick Advanced Learning Systems. All rights reserved.
        </div>
      </div>
    `;

    const opt = {
      margin: 0,
      filename: `${title.replace(/\s+/g, '_')}_StudyGuide.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(html).save().then(() => {
      UI.setLoading(false);
      UI.toast("PDF study guide ready!", "success");
    }).catch(err => {
      UI.setLoading(false);
      UI.toast("PDF Export failed: " + err.message, "error");
    });
  }

  function toggleVoice() {
    const quiz = State.get("quiz");
    const q = quiz.questions[quiz.currentIdx];
    if (q) {
      const qType = (q["Question Type"] || "Multichoice").trim();
      const isVoiceSupported = ["Multichoice", "Multi Multichoice", "Multichoice Anycorrect", "True/False"].includes(qType);
      if (!isVoiceSupported) {
        UI.toast("Voice features not available for this question type", "warn");
        return;
      }
    }

    const active = VoiceEngine.toggle();
    const btn = document.getElementById('voice-mode-btn');
    if (btn) btn.classList.toggle('active', active);
  }

  function startActiveTest() {
     const quiz = State.get("quiz");
     const qs = [...quiz.questions];
     const title = (quiz.config.title || "Topic Test") + " (Post-Study)";
     
     UI.setLoading(true, "Launching Memory Session...");
     
     // Deep reset but keep questions
     State.set("quiz", {
       ...quiz,
       questions: qs,
       answers: {},
       revealedIdxs: {},
       currentIdx: 0,
       startTime: Date.now(),
       config: { ...quiz.config, "Instant Answer": "Off", "Instant Verification": "Off", "Auto Next": "Off" },
       template: quiz.originalTemplate || "sat"
     });
     
     setTimeout(() => {
        _navigating = false;
        UI.pushPage("quiz");
        UI.setLoading(false);
        UI.toast(`Memory Session: ${title}`, "success");
     }, 1000);
  }

  function showJumpMenu() {
    const quiz = State.get("quiz");
    const total = quiz.questions.length;
    
    let gridHtml = `
      <div class="jump-grid-container">
        <h3 style="margin:0 0 20px 0; font-size:1.1rem; font-weight:900; color:var(--text-primary); text-align:center">Jump to Concept</h3>
        <div class="jump-grid">
          ${quiz.questions.map((_, i) => `
            <div class="jump-item ${i === quiz.currentIdx ? 'active' : ''}" 
                 onclick="PageQuiz.jumpTo(${i}); UI.closeModal()">
              ${i + 1}
            </div>
          `).join('')}
        </div>
      </div>
      <style>
        .jump-grid-container { padding: 8px; }
        .jump-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(45px, 1fr)); gap: 10px; max-height: 400px; overflow-y: auto; padding: 4px; }
        .jump-item { 
          aspect-ratio: 1; display: grid; place-items: center; 
          background: var(--bg-elevated); border: 1px solid var(--border-color); 
          border-radius: 8px; cursor: pointer; transition: 0.2s; 
          font-weight: 800; font-size: 0.9rem; color: var(--text-secondary);
        }
        .jump-item:hover { transform: translateY(-2px); border-color: var(--accent-primary); color: var(--accent-primary); background: var(--accent-primary-transparent); }
        .jump-item.active { background: var(--accent-primary); color: #000; border-color: var(--accent-primary); box-shadow: 0 4px 12px var(--accent-shadow); }
      </style>
    `;
    UI.modal(gridHtml);
  }

  function jumpTo(idx) {
    saveCurrentAnswer();
    State.merge("quiz", { currentIdx: idx });
    renderQuestion();
  }

  // ── Command Console (Live Typing) ─────────────────────────
  function handleConsoleCommand(e) {
    if (e.key === "Enter") {
      const input = e.target;
      const cmd = input.value.toLowerCase().trim();
      input.value = "";
      processConsoleCommand(cmd);
    }
  }

  function processConsoleCommand(cmd) {
    if (!cmd) return;
    
    if (cmd === "next" || cmd === "n") { next(); return; }
    if (cmd === "back" || cmd === "b" || cmd === "prev") { prev(); return; }
    if (cmd === "flag" || cmd === "f" || cmd === "mark") { toggleMark(); return; }
    if (cmd === "submit" || cmd === "s") { confirmSubmit(); return; }
    if (cmd === "finish" || cmd === "take" || cmd === "start") { next(); return; }
    if (cmd === "hint" || cmd === "h") { showHint(); return; }
    
    if (cmd === "a" || cmd === "select a") { selectOption(0); return; }
    if (cmd === "b" || cmd === "select b") { selectOption(1); return; }
    if (cmd === "c" || cmd === "select c") { selectOption(2); return; }
    if (cmd === "d" || cmd === "select d") { selectOption(3); return; }
    
    const goNum = cmd.match(/(?:go|q|jump)\s*(\d+)/);
    if (goNum) {
      const target = parseInt(goNum[1]) - 1;
      if (target >= 0 && target < State.get("quiz").questions.length) {
        jumpTo(target);
        return;
      }
    }
    UI.toast(`Unknown command: ${cmd}`, "warn");
  }

  function selectOption(idx) {
    const cards = document.querySelectorAll(".option-card");
    if (cards[idx]) cards[idx].click();
  }

  function toggleConsole(show) {
    const wraps = document.querySelectorAll('.cli-bar-wrap');
    wraps.forEach(w => {
      if (show === undefined) w.classList.toggle('open');
      else w.classList.toggle('open', show);
    });
    if (show === true) {
      // Auto-focus the visible input
      const input = document.querySelector('.cli-bar-wrap.open .cli-bar');
      if (input) {
        setTimeout(() => input.focus(), 50);
        UI.toast('⎣ Command console open — type your command', 'info', 2000);
      }
    } else if (show === false) {
      UI.toast('Command console closed', 'info', 1500);
    }
  }

  return { render, init, next, prev, jumpTo, showJumpMenu, toggleMark, showHint, togglePause, confirmSubmit, submit, downloadStudyPDF, toggleVoice, startActiveTest, handleConsoleCommand, toggleConsole, saveCurrentAnswer };
})();

function fmtTime(sec) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
