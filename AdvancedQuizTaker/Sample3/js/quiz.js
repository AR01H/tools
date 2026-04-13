// ============================================================
//  quiz.js  — Core Quiz Engine
// ============================================================

const Quiz = (() => {

  let _questionStartTime = Date.now();

  // ── Init ──────────────────────────────────────────────────
  function initQuiz() {
    const q = State.getQuiz();
    renderSidebar();
    renderQuestion();
    startTimer();
    updateProgressBar();
    UI.updateQuizNavbar();
  }

  // ── Timer ─────────────────────────────────────────────────
  function startTimer() {
    const q   = State.getQuiz();
    const cfg = q.config;
    const totalSec = parseInt(cfg["Quiz Time"] || 0);

    if (q.timerId) clearInterval(q.timerId);

    const id = setInterval(() => {
      const qNow = State.getQuiz();
      if (qNow.paused) return;

      const elapsed = Math.floor((Date.now() - qNow.startTime) / 1000);
      State.set({ quiz: { elapsedSec: elapsed } });
      updateTimerDisplay(elapsed, totalSec);

      // Per-question timer
      const qTime = parseInt(cfg["Question Time"] || 0);
      if (qTime > 0) {
        const qElapsed = Math.floor((Date.now() - _questionStartTime) / 1000);
        if (qElapsed >= qTime) {
          // Auto advance
          if (cfg["Auto Next Question"] === "On") goNext();
        }
      }

      // Quiz total time limit
      if (totalSec > 0 && elapsed >= totalSec) {
        clearInterval(id);
        submitQuiz(true);
      }
    }, 500);

    State.set({ quiz: { timerId: id } });
  }

  function updateTimerDisplay(elapsed, totalSec) {
    const el = document.getElementById("quiz-timer");
    if (!el) return;
    if (totalSec > 0) {
      const remaining = totalSec - elapsed;
      el.textContent  = formatTime(remaining);
      el.className    = "quiz-timer" +
        (remaining < 60 ? " danger" : remaining < 300 ? " warning" : "");
    } else {
      el.textContent = formatTime(elapsed);
      el.className   = "quiz-timer";
    }
  }

  function formatTime(sec) {
    if (sec < 0) sec = 0;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function pauseResume() {
    const q = State.getQuiz();
    if (!q.config["Pause / Resume Allowed"] === "On") return;
    State.set({ quiz: { paused: !q.paused } });
    const btn = document.getElementById("btn-pause");
    if (btn) btn.innerHTML = q.paused
      ? `<i class="fas fa-pause"></i> Pause`
      : `<i class="fas fa-play"></i> Resume`;
    UI.toast(q.paused ? "Quiz resumed" : "Quiz paused", "info");
  }

  // ── Render question ───────────────────────────────────────
  function renderQuestion() {
    const q     = State.getQuiz();
    const qData = q.questions[q.current];
    if (!qData) return;
    _questionStartTime = Date.now();

    const container = document.getElementById("question-container");
    if (!container) return;

    const answered = q.answers[q.current];
    const isInstant = q.config["Instant Answer"] === "On";

    container.innerHTML = `
      <div class="question-card fade-in">
        ${qData.Passage ? `<div class="passage-box"><i class="fas fa-book-open me-2"></i>${qData.Passage}</div>` : ""}
        <div class="question-meta">
          ${qData.Category ? `<span class="q-badge q-badge-cat"><i class="fas fa-tag me-1"></i>${qData.Category}</span>` : ""}
          ${qData["Sub Category"] ? `<span class="q-badge q-badge-type">${qData["Sub Category"]}</span>` : ""}
          ${qData.Difficulty ? `<span class="q-badge q-badge-diff-${qData.Difficulty.toLowerCase()}">${capitalize(qData.Difficulty)}</span>` : ""}
          ${qData["Question Type"] ? `<span class="q-badge" style="background:var(--info-light);color:var(--info)">${qData["Question Type"]}</span>` : ""}
          <span class="q-badge" style="background:var(--bg-primary);color:var(--text-muted)">
            <i class="fas fa-star me-1"></i>${qData.Score || 1} pt
            ${parseFloat(qData["Negative Score"] || 0) > 0 ? ` / -${qData["Negative Score"]}` : ""}
          </span>
        </div>
        <div class="question-number">Question ${q.current + 1} of ${q.questions.length}</div>
        <div class="question-text">${qData.Question}</div>
        <div class="options-area" id="options-area"></div>
        ${q.config["Show Hint"] === "On" && qData.Hint ? buildHintSection(qData.Hint) : ""}
      </div>`;

    // Render options based on question type
    const type = (qData["Question Type"] || "Multichoice").toLowerCase().replace(/\s+/g, "");
    renderOptions(type, qData, q.current, answered, isInstant);
    updateSidebarDots();
  }

  function buildHintSection(hint) {
    return `
      <div style="margin-top:16px">
        <button class="btn-qm btn-qm-secondary btn-qm-sm" onclick="this.nextElementSibling.style.display='block';this.style.display='none'">
          <i class="fas fa-lightbulb me-1"></i> Show Hint
        </button>
        <div style="display:none;background:var(--warning-light);border-left:3px solid var(--warning);padding:10px 14px;border-radius:0 8px 8px 0;font-size:.88rem;margin-top:8px">
          <i class="fas fa-lightbulb me-2 text-warning"></i>${hint}
        </div>
      </div>`;
  }

  // ── Options Dispatcher ────────────────────────────────────
  function renderOptions(type, qData, idx, answered, isInstant) {
    const area = document.getElementById("options-area");
    if (!area) return;

    if (type.includes("truefalse")) {
      area.innerHTML = MCQComponent.render(["TRUE", "FALSE"], null, idx, answered, isInstant, false);
    } else if (type.includes("multichoiceanycorrect") || type.includes("multimultichoice") || type.includes("multiselect")) {
      const choices = getChoices(qData);
      area.innerHTML = MCQComponent.render(choices, null, idx, answered, isInstant, true);
    } else if (type.includes("multichoice") || type.includes("mcq")) {
      const choices = getChoices(qData);
      area.innerHTML = MCQComponent.render(choices, null, idx, answered, isInstant, false);
    } else if (type.includes("sequence")) {
      area.innerHTML = SequenceComponent.render(getChoices(qData), idx, answered);
      SequenceComponent.attachEvents(idx);
    } else if (type.includes("matching") && type.includes("multi")) {
      const choices = getChoices(qData);
      area.innerHTML = MatchingComponent.renderMulti(choices, idx, answered);
    } else if (type.includes("matching")) {
      const choices = getChoices(qData);
      area.innerHTML = MatchingComponent.render(choices, idx, answered);
      MatchingComponent.attachEvents(idx);
    } else if (type.includes("drag") || type.includes("drop")) {
      const choices = getChoices(qData);
      area.innerHTML = DragDropComponent.render(choices, idx, answered);
      DragDropComponent.attachEvents(idx);
    } else if (type.includes("range")) {
      const choices = getChoices(qData);
      area.innerHTML = RangeComponent.render(choices, idx, answered);
      RangeComponent.attachEvents(idx);
    } else if (type.includes("fillintheblank") || type.includes("shortanswer")) {
      area.innerHTML = FillBlankComponent.render(qData.Question, idx, answered, false);
    } else if (type.includes("multiblanks")) {
      area.innerHTML = FillBlankComponent.renderMulti(idx, answered, getChoices(qData));
    } else if (type.includes("inlineblank")) {
      area.innerHTML = FillBlankComponent.renderInline(qData.Question, idx, answered);
    } else {
      // fallback to MCQ
      const choices = getChoices(qData);
      area.innerHTML = MCQComponent.render(choices, null, idx, answered, isInstant, false);
    }

    // Show solution if instant answer already done
    if (isInstant && answered) {
      showInstantFeedback(qData, idx, answered.selected);
    }
  }

  function getChoices(qData) {
    return [qData.Choice1, qData.Choice2, qData.Choice3, qData.Choice4].filter(Boolean);
  }

  // ── Answer selection ──────────────────────────────────────
  function selectAnswer(qIdx, selected) {
    const q   = State.getQuiz();
    const cfg = q.config;

    // Disallow change if configured
    if (cfg["Allow Option Change"] === "Off" && q.answers[qIdx]) return;
    if (cfg["Don't Change Until Correct"] === "On" && q.answers[qIdx]?.correct) return;

    const timeSpent = Math.floor((Date.now() - _questionStartTime) / 1000);
    State.saveAnswer(qIdx, selected, timeSpent);

    // Update option visual
    highlightSelected(qIdx, selected, false);

    // Instant answer
    if (cfg["Instant Answer"] === "On") {
      const qData = q.questions[qIdx];
      showInstantFeedback(qData, qIdx, selected);
    } else if (cfg["Auto Next Question"] === "On") {
      setTimeout(() => goNext(), 400);
    }

    updateSidebarDots();
    UI.updateQuizNavbar();
  }

  function highlightSelected(qIdx, selected, showCorrect) {
    document.querySelectorAll(".option-item").forEach((el, i) => {
      el.classList.remove("selected", "correct", "wrong");
      const val = el.dataset.value;
      if (Array.isArray(selected) ? selected.includes(val) : val === selected) {
        el.classList.add("selected");
      }
    });
  }

  function showInstantFeedback(qData, qIdx, selected) {
    const correct = qData["Correct Answer"] || "";
    const isMulti = correct.includes("|");
    const correctArr = correct.split("|").map(s => s.trim());
    const selectedArr = Array.isArray(selected) ? selected : [selected];

    document.querySelectorAll(".option-item").forEach(el => {
      const val = el.dataset.value;
      el.classList.add("disabled");
      if (correctArr.includes(val)) el.classList.add("correct");
      else if (selectedArr.includes(val)) el.classList.add("wrong");
    });

    // Show solution
    const area = document.getElementById("options-area");
    if (qData.Solution && State.getQuiz().config["Instant Answer Feedback"] === "On") {
      const sol = document.createElement("div");
      sol.style.cssText = "margin-top:16px;padding:14px 18px;background:var(--success-light);border-left:3px solid var(--success);border-radius:0 8px 8px 0;font-size:.88rem;";
      sol.innerHTML = `<strong><i class="fas fa-check-circle me-2" style="color:var(--success)"></i>Explanation:</strong> ${qData.Solution}`;
      area.appendChild(sol);
    }
  }

  // ── Navigation ────────────────────────────────────────────
  function goPrev() {
    const q = State.getQuiz();
    if (q.config["Allow Back"] === "Off") return;
    if (q.current > 0) {
      State.set({ quiz: { current: q.current - 1 } });
      renderQuestion();
      updateProgressBar();
    }
  }

  function goNext() {
    const q = State.getQuiz();
    if (q.config["Mandatory Answer"] === "On" && !q.answers[q.current]) {
      UI.toast("Please answer before proceeding.", "warning"); return;
    }
    if (q.current < q.questions.length - 1) {
      State.set({ quiz: { current: q.current + 1 } });
      renderQuestion();
      updateProgressBar();
    } else {
      // Last question
      confirmSubmit();
    }
  }

  function goToQuestion(idx) {
    const q = State.getQuiz();
    if (q.config["Question Navigation"] === "Sequential" && idx > q.current + 1) {
      UI.toast("Sequential mode: complete current question first.", "warning"); return;
    }
    State.set({ quiz: { current: idx } });
    renderQuestion();
    updateProgressBar();
    // Close mobile sidebar
    document.querySelector(".quiz-sidebar")?.classList.remove("open");
  }

  function markReview() {
    State.toggleMark(State.getQuiz().current);
    updateSidebarDots();
    const btn = document.getElementById("btn-mark-review");
    if (btn) {
      const marked = State.getQuiz().markedReview.has(State.getQuiz().current);
      btn.innerHTML = `<i class="fas fa-bookmark me-1"></i>${marked ? "Unmark" : "Mark Review"}`;
      btn.classList.toggle("btn-qm-warning", marked);
    }
  }

  function confirmSubmit() {
    const q        = State.getQuiz();
    const answered = Object.keys(q.answers).length;
    const total    = q.questions.length;
    const unanswered = total - answered;
    if (unanswered > 0 && !confirm(`You have ${unanswered} unanswered questions. Submit anyway?`)) return;
    submitQuiz(false);
  }

  // ── Submit ────────────────────────────────────────────────
  async function submitQuiz(autoSubmit = false) {
    const q    = State.getQuiz();
    const user = State.getUser();
    clearInterval(q.timerId);
    const endTime = new Date().toISOString();
    State.set({ quiz: { active: false, endTime } });

    // Calculate score
    const scored = calcScore(q.questions, q.answers, q.config);

    // Build result
    const result = {
      attemptId:       q.attemptId,
      studentName:     user.name,
      dob:             user.dob,
      contact:         user.contact,
      quizName:        q.config["Quiz Settings Title"] || "Quiz",
      quizTopic:       State.getSetup().selectedTopics.join(", ") || "All",
      startTime:       new Date(q.startTime).toISOString(),
      endTime,
      timeTaken:       q.elapsedSec,
      score:           scored.total,
      totalScore:      scored.maxTotal,
      percentage:      scored.percentage,
      correct:         scored.correct,
      wrong:           scored.wrong,
      skipped:         scored.skipped,
      categoryScores:  scored.byCategory,
      difficultyScores:scored.byDifficulty,
      questions:       q.questions,
      answers:         Object.fromEntries(
                         Object.entries(q.answers).map(([k,v]) => [k, v])
                       ),
      config:          q.config,
    };

    // Submit to backend
    if (API.isConfigured()) {
      try {
        await API.submitAttempt(result);
      } catch (_) {}
    }

    State.set({ result: { data: result, mode: "overview" } });

    if (q.config["Final Result"] === "On") {
      UI.showPage("result");
      Result.render();
    } else {
      UI.showPage("home");
      UI.toast("Quiz submitted!", "success");
    }
  }

  // ── Scoring ───────────────────────────────────────────────
  function calcScore(questions, answers, config) {
    let total = 0, maxTotal = 0, correct = 0, wrong = 0, skipped = 0;
    const byCategory   = {};
    const byDifficulty = {};
    const negativeOn   = config["Negative Marking"]  === "On";
    const partialOn    = config["Partial Scoring"]    === "On";

    questions.forEach((q, i) => {
      const score    = parseFloat(q.Score || 1);
      const negScore = parseFloat(q["Negative Score"] || 0);
      const partScore= parseFloat(q["Partial Score"] || 0);
      maxTotal += score;

      const cat  = q.Category  || "Other";
      const diff = (q.Difficulty || "medium").toLowerCase();
      if (!byCategory[cat])   byCategory[cat]   = { score: 0, max: 0, correct: 0, wrong: 0 };
      if (!byDifficulty[diff]) byDifficulty[diff] = { score: 0, max: 0, correct: 0, wrong: 0 };
      byCategory[cat].max   += score;
      byDifficulty[diff].max += score;

      const ans = answers[i];
      if (!ans) { skipped++; return; }

      const correctRaw = (q["Correct Answer"] || "").trim();
      const correctArr = correctRaw.split("|").map(s => s.trim().toLowerCase());
      const selected   = Array.isArray(ans.selected) ? ans.selected : [ans.selected];
      const selectedArr= selected.map(s => String(s).trim().toLowerCase());

      const isExactMatch   = JSON.stringify([...correctArr].sort()) === JSON.stringify([...selectedArr].sort());
      const isPartialMatch = correctArr.some(c => selectedArr.includes(c));

      let earned = 0;
      if (isExactMatch) {
        earned = score; correct++;
        byCategory[cat].correct++;
        byDifficulty[diff].correct++;
      } else if (partialOn && isPartialMatch) {
        const matchCount = correctArr.filter(c => selectedArr.includes(c)).length;
        earned = (matchCount / correctArr.length) * (partScore || score);
        correct++;
      } else {
        wrong++;
        if (negativeOn) earned = -negScore;
        byCategory[cat].wrong++;
        byDifficulty[diff].wrong++;
      }

      total += earned;
      byCategory[cat].score   += earned;
      byDifficulty[diff].score += earned;
    });

    return {
      total: Math.max(0, Math.round(total * 100) / 100),
      maxTotal: Math.round(maxTotal * 100) / 100,
      percentage: maxTotal > 0 ? Math.round((Math.max(0, total) / maxTotal) * 100) : 0,
      correct, wrong, skipped,
      byCategory, byDifficulty,
    };
  }

  // ── Sidebar ───────────────────────────────────────────────
  function renderSidebar() {
    const q   = State.getQuiz();
    const cfg = q.config;
    const container = document.getElementById("quiz-sidebar-content");
    if (!container) return;

    const totalSec = parseInt(cfg["Quiz Time"] || 0);

    container.innerHTML = `
      <div class="mb-3">
        <div class="fw-700 mb-1">${cfg["Quiz Settings Title"] || "Quiz"}</div>
        <div class="text-muted text-sm">${q.questions.length} Questions</div>
      </div>
      <div id="quiz-timer" class="quiz-timer mb-3">${totalSec > 0 ? formatTime(totalSec) : "00:00"}</div>
      <div class="quiz-progress-wrap mb-3">
        <div class="d-flex justify-between text-sm mb-1">
          <span>Progress</span>
          <span id="progress-text">0/${q.questions.length}</span>
        </div>
        <div class="quiz-progress-bar">
          <div class="quiz-progress-fill" id="progress-fill" style="width:0%"></div>
        </div>
      </div>

      ${cfg["Pause / Resume Allowed"] === "On" ? `
        <button class="btn-qm btn-qm-secondary btn-qm-sm w-100 mb-3" id="btn-pause" onclick="Quiz.pauseResume()">
          <i class="fas fa-pause me-1"></i> Pause
        </button>` : ""}

      <div class="mb-3">
        <div class="qm-label mb-2">Questions</div>
        <div class="q-status-grid" id="q-status-grid"></div>
      </div>

      <div class="mb-3">
        <div class="legend-row"><div class="legend-dot" style="background:var(--success)"></div> Answered</div>
        <div class="legend-row"><div class="legend-dot" style="background:var(--warning)"></div> Marked Review</div>
        <div class="legend-row"><div class="legend-dot" style="background:var(--bg-primary);border:1.5px solid var(--border)"></div> Not Visited</div>
        <div class="legend-row"><div class="legend-dot" style="background:var(--danger-light);border:1px solid var(--danger)"></div> Skipped</div>
      </div>

      <button class="btn-qm btn-qm-danger w-100" onclick="Quiz.confirmSubmit()">
        <i class="fas fa-paper-plane me-1"></i> Submit Quiz
      </button>`;

    updateSidebarDots();
  }

  function updateSidebarDots() {
    const q    = State.getQuiz();
    const grid = document.getElementById("q-status-grid");
    if (!grid) return;
    grid.innerHTML = q.questions.map((_, i) => {
      let cls = "q-dot";
      if (q.answers[i])            cls += " answered";
      if (q.markedReview.has(i))   cls += " marked";
      if (i === q.current)         cls += " current";
      return `<div class="${cls}" onclick="Quiz.goToQuestion(${i})">${i + 1}</div>`;
    }).join("");
  }

  function updateProgressBar() {
    const q        = State.getQuiz();
    const answered = Object.keys(q.answers).length;
    const pct      = Math.round((answered / q.questions.length) * 100);
    const fill     = document.getElementById("progress-fill");
    const text     = document.getElementById("progress-text");
    if (fill) fill.style.width = pct + "%";
    if (text) text.textContent = `${answered}/${q.questions.length}`;
  }

  // ── Render quiz page controls ─────────────────────────────
  function renderQuizControls() {
    const q   = State.getQuiz();
    const cfg = q.config;
    const container = document.getElementById("quiz-controls");
    if (!container) return;

    container.innerHTML = `
      <div class="quiz-controls">
        <div class="quiz-controls-left">
          ${cfg["Allow Back"] === "On" ? `
            <button class="btn-qm btn-qm-secondary" onclick="Quiz.goPrev()" ${q.current === 0 ? "disabled" : ""}>
              <i class="fas fa-arrow-left"></i> Prev
            </button>` : ""}
          ${cfg["Mark for Review"] === "On" ? `
            <button class="btn-qm btn-qm-secondary" id="btn-mark-review" onclick="Quiz.markReview()">
              <i class="fas fa-bookmark me-1"></i>Mark Review
            </button>` : ""}
        </div>
        <div class="quiz-controls-right">
          <button class="btn-qm btn-qm-secondary" onclick="Quiz.skipQuestion()">
            Skip <i class="fas fa-forward ms-1"></i>
          </button>
          <button class="btn-qm btn-qm-primary" onclick="Quiz.goNext()">
            ${q.current === q.questions.length - 1 ? '<i class="fas fa-paper-plane me-1"></i>Finish' : 'Next <i class="fas fa-arrow-right ms-1"></i>'}
          </button>
        </div>
      </div>`;
  }

  function skipQuestion() {
    const q = State.getQuiz();
    State.saveAnswer(q.current, null, 0);
    updateSidebarDots();
    goNext();
  }

  function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ""; }

  return {
    initQuiz, renderQuestion, renderSidebar, renderQuizControls,
    selectAnswer, goPrev, goNext, goToQuestion,
    markReview, confirmSubmit, submitQuiz, pauseResume,
    skipQuestion, updateSidebarDots, updateProgressBar,
    formatTime, calcScore,
  };
})();
