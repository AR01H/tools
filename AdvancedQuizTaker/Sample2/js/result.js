// ============================================================
//  QUIZ APP — result.js
//  Score calculation + full results page with charts & tabs
// ============================================================

// ── Scoring Engine ────────────────────────────────────────
const Results = (() => {
  function getChoices(q) {
    return Object.keys(q)
      .filter((k) => /^(choice|option)\s*\d+$/i.test(k))
      .sort((a, b) => {
        const na = parseInt(a.match(/\d+/)[0]) || 0;
        const nb = parseInt(b.match(/\d+/)[0]) || 0;
        return na - nb;
      })
      .map((k) => q[k])
      .filter(Boolean);
  }
  function isCorrect(q, userAnswer) {
    if (!userAnswer && userAnswer !== 0) return false;
    const correct = (q["Correct Answer"] || "").split("|").map((s) => s.trim());
    const type = (q["Question Type"] || "").trim();

    if (type === "Sequence") {
      const ua = Array.isArray(userAnswer) ? userAnswer : userAnswer.split("|");
      return ua.join("|") === correct.join("|");
    }
    if (type === "Multi Multichoice" || type === "Multichoice Anycorrect") {
      const ua = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
      return (
        ua.length === correct.length &&
        ua.every((a) => correct.includes(a.trim()))
      );
    }
    if (type === "Range") {
      const [lo, hi] = correct[0].replace(/"/g, "").split("-").map(Number);
      const val = parseFloat(userAnswer);
      return val >= lo && val <= hi;
    }
    if (type === "Short Answer") {
      return correct.some(
        (c) =>
          c.toLowerCase().trim() === (userAnswer || "").toLowerCase().trim()
      );
    }
    if (type === "Fill in the Blanks" || type === "Inline Blank") {
      return (
        correct[0].toLowerCase().trim() ===
        (userAnswer || "").toLowerCase().trim()
      );
    }
    if (type === "Multi Blanks") {
      const ua = (userAnswer || "").split("|");
      return correct.every(
        (c, i) => c.toLowerCase().trim() === (ua[i] || "").toLowerCase().trim()
      );
    }
    if (type === "Matching") {
      return (
        userAnswer &&
        userAnswer !== "" &&
        correct.every((c) => (userAnswer || "").includes(c))
      );
    }
    if (type === "Multi Matching") {
      if (!userAnswer || userAnswer === "" || userAnswer === "{}") return false;
      try {
        const uaMap = JSON.parse(userAnswer);
        const choices = getChoices(q);

        return choices.every((c) => {
          const parts = c.split("-");
          const left = parts[0];
          const expectedTags = (parts[1] || "")
            .split("|")
            .map((t) => t.trim())
            .filter(Boolean);
          const userTags = uaMap[left] || [];

          if (expectedTags.length !== userTags.length) return false;
          return expectedTags.every((t) => userTags.includes(t));
        });
      } catch (e) {
        return false;
      }
    }
    if (type === "Drag & Drop") {
      const choices = getChoices(q);
      return (
        userAnswer &&
        userAnswer !== "" &&
        choices.every((c) => (userAnswer || "").includes(c))
      );
    }
    // Default single answer
    const ua = Array.isArray(userAnswer) ? userAnswer[0] : userAnswer;
    return correct.includes((ua || "").trim());
  }

  function getQuestionScore(q, userAnswer, cfg) {
    const baseScore = parseFloat(q.Score || 1);
    const negScore = parseFloat(q["Negative Score"] || 0);
    const partScore = parseFloat(q["Partial Score"] || 0);
    const negMarking = (cfg["Negative Marking"] || "Off") === "On";
    const partScoring = (cfg["Partial Scoring"] || "Off") === "On";

    if (!userAnswer && userAnswer !== 0) return 0;
    if (isCorrect(q, userAnswer)) return baseScore;

    // Partial scoring for multi-select
    const type = (q["Question Type"] || "").trim();
    if (
      partScoring &&
      (type === "Multi Multichoice" || type === "Multichoice Anycorrect")
    ) {
      const correct = (q["Correct Answer"] || "").split("|");
      const ua = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
      const hits = ua.filter((a) => correct.includes(a.trim())).length;
      if (hits > 0) return (hits / correct.length) * partScore;
    }

    return negMarking ? -negScore : 0;
  }

  function calculateScore(quiz) {
    const cfg = quiz.config;
    let total = 0,
      maxTotal = 0,
      correct = 0,
      wrong = 0,
      skipped = 0;
    const categoryMap = {},
      difficultyMap = {},
      typeMap = {};

    const details = quiz.questions.map((q, i) => {
      const ans = quiz.answers[i];
      const ua = ans ? ans.userAnswer : undefined;
      const s = getQuestionScore(q, ua, cfg);
      const corr = isCorrect(q, ua);

      const maxQ = parseFloat(q.Score || 1);
      total += s;
      maxTotal += maxQ;
      if (ua === undefined || ua === null || ua === "") skipped++;
      else if (corr) correct++;
      else wrong++;

      const cat = q.Category || "Uncategorised";
      if (!categoryMap[cat])
        categoryMap[cat] = { score: 0, max: 0, correct: 0, total: 0 };
      categoryMap[cat].score += s;
      categoryMap[cat].max += maxQ;
      categoryMap[cat].total++;
      if (corr) categoryMap[cat].correct++;

      const diff = q.Difficulty || "unknown";
      if (!difficultyMap[diff])
        difficultyMap[diff] = { correct: 0, total: 0, score: 0, max: 0 };
      difficultyMap[diff].total++;
      difficultyMap[diff].score += s;
      difficultyMap[diff].max += maxQ;
      if (corr) difficultyMap[diff].correct++;

      const t = q["Question Type"] || "Other";
      if (!typeMap[t]) typeMap[t] = { correct: 0, total: 0 };
      typeMap[t].total++;
      if (corr) typeMap[t].correct++;

      return { score: s, max: maxQ, correct: corr };
    });

    const accuracy = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
    const timeTaken = Math.round((Date.now() - quiz.startTime) / 1000);

    return {
      total: Math.max(0, total),
      maxTotal,
      accuracy,
      correct,
      wrong,
      skipped,
      timeTaken,
      categoryMap,
      difficultyMap,
      typeMap,
      details,
    };
  }

  return { isCorrect, getQuestionScore, calculateScore, getChoices };
})();

// ============================================================
//  Page: Result
// ============================================================
const PageResult = (() => {
  let _activeTab = "overview";

  function getInsights(score, type) {
    const cats = Object.keys(score.categoryMap).map((k) => ({
      name: k,
      acc: score.categoryMap[k].max
        ? (score.categoryMap[k].score / score.categoryMap[k].total) * 100
        : 0,
    }));
    if (type === "strengths")
      return cats.filter((c) => c.acc >= 70).map((c) => c.name);
    return cats.filter((c) => c.acc < 40).map((c) => c.name);
  }

  function render(main, data) {
    const result = data || State.get("result");
    if (!result) {
      main.innerHTML = '<p class="text-muted">No result data.</p>';
      return;
    }
    const { quiz, score, endTime } = result;

    main.innerHTML = `
      <div class="animate-up dashboard-shell">
        <!-- ── DASHBOARD HEADER ── -->
        <div class="dash-hero">
           <div class="dash-hero-info">
              <span class="dash-badge">${
                quiz.config["Quiz Settings Title"] || "ASSESSMENT REPORT"
              }</span>
              <h1 class="dash-title">Comprehensive Analysis</h1>
              <p class="dash-subtitle">${new Date(endTime).toLocaleDateString(
                undefined,
                { month: "long", day: "numeric" }
              )} • ${fmtTime(score.timeTaken)} elapsed</p>
           </div>
           
           <div class="dash-hero-stats">
              <div class="hero-stat-main">
                 <div class="hero-ring-wrap">
                    <svg viewBox="0 0 100 100">
                       <circle class="ring-bg" cx="50" cy="50" r="45"></circle>
                       <circle class="ring-fill" id="ring-fill" cx="50" cy="50" r="45" style="stroke-dasharray: 283; stroke-dashoffset: 283"></circle>
                    </svg>
                    <div class="ring-content">
                       <span class="ring-num">${score.accuracy}%</span>
                       <span class="ring-label">ACCURACY</span>
                    </div>
                 </div>
              </div>
              <div class="hero-stat-cards">
                 <div class="hero-card">
                    <span class="hero-card-label">TOTAL SCORE</span>
                    <span class="hero-card-val">${score.total.toFixed(
                      1
                    )}<span class="text-xs opacity-50"> / ${
      score.maxTotal
    }</span></span>
                 </div>
                 <div class="hero-card">
                    <span class="hero-card-label">TIME ACCURACY</span>
                    <span class="hero-card-val">${
                      score.timeTaken > 0
                        ? (score.correct / (score.timeTaken / 60)).toFixed(1)
                        : 0
                    }<span class="text-xs opacity-50"> p/m</span></span>
                 </div>
              </div>
           </div>
        </div>

        <!-- ── ANALYTICS BAR ── -->
        <div class="dash-analytics-bar">
           <div class="ana-item success">
              <div class="ana-icon">✓</div>
              <div class="ana-text">
                 <span class="ana-val">${score.correct}</span>
                 <span class="ana-label">CORRECT</span>
              </div>
           </div>
           <div class="ana-item error">
              <div class="ana-icon">✕</div>
              <div class="ana-text">
                 <span class="ana-val">${score.wrong}</span>
                 <span class="ana-label">INCORRECT</span>
              </div>
           </div>
           <div class="ana-item warn">
              <div class="ana-icon">!</div>
              <div class="ana-text">
                 <span class="ana-val">${score.skipped}</span>
                 <span class="ana-label">SKIPPED</span>
              </div>
           </div>
           <div class="ana-item info">
              <div class="ana-icon">⏱</div>
              <div class="ana-text">
                 <span class="ana-val">${(
                   score.timeTaken / quiz.questions.length
                 ).toFixed(1)}s</span>
                 <span class="ana-label">AVG / Q</span>
              </div>
           </div>
        </div>

        <!-- ── STRENGTHS & WEAKNESSES ── -->
        <div class="dash-insights">
           <div class="insight-card strengths">
              <span class="insight-tag">✨ STRENGTHS</span>
              <div class="insight-list">
                 ${
                   getInsights(score, "strengths")
                     .map((s) => `<span class="tag-pill">${s}</span>`)
                     .join("") ||
                   '<span class="opacity-50">Maintain consistent practice</span>'
                 }
              </div>
           </div>
           <div class="insight-card weaknesses">
              <span class="insight-tag">⚠️ WEAKNESSES</span>
              <div class="insight-list">
                 ${
                   getInsights(score, "weaknesses")
                     .map((w) => `<span class="tag-pill">${w}</span>`)
                     .join("") ||
                   '<span class="opacity-50">No critical weaknesses identified</span>'
                 }
              </div>
           </div>
        </div>

        <!-- ── TABS NAVIGATION ── -->
        <div class="dash-nav-with-actions">
           <div class="dash-tabs" id="result-tabs">
             ${["overview", "questions", "category", "difficulty", "answer-key"]
               .map(
                 (t, i) => `
               <button class="dash-tab-btn ${
                 t === _activeTab ? "active" : ""
               }" onclick="PageResult.switchTab('${t}')">
                 ${
                   [
                     "📊 Overview",
                     "📝 Detailed Review",
                     "📁 Categories",
                     "⚡ Difficulty",
                     "🔑 Key",
                   ][i]
                 }
               </button>`
               )
               .join("")}
           </div>
           <div class="dash-actions">
              <button class="btn btn-ghost btn-sm" onclick="PageResult.downloadPDF()">📥 PDF</button>
              <button class="btn btn-ghost btn-sm" onclick="PageResult.downloadCSV()">📊 CSV</button>
              <button class="btn btn-secondary btn-sm" onclick="PageResult.retakeQuiz()">🔁 Retake</button>
              <button class="btn btn-secondary btn-sm" onclick="UI.navigate('welcome')">🏠 Home</button>
           </div>
        </div>

        <!-- ── TAB CONTENT ── -->
        <div id="result-tab-body" class="dash-tab-content"></div>
      </div>`;

    // Animate ring
    setTimeout(() => {
      const fill = document.getElementById("ring-fill");
      if (fill) {
        const circ = 2 * Math.PI * 45;
        fill.style.strokeDasharray = circ;
        fill.style.strokeDashoffset = circ - (circ * score.accuracy) / 100;
        fill.style.stroke =
          score.accuracy >= 70
            ? "#10b981"
            : score.accuracy >= 40
            ? "#f59e0b"
            : "#ef4444";
      }
    }, 300);

    switchTab(_activeTab, result);
  }

  function switchTab(tab, explicitResult = null) {
    _activeTab = tab;
    const result = explicitResult || State.get("result");
    document.querySelectorAll("#result-tabs .dash-tab-btn").forEach((b, i) => {
      const tabs = [
        "overview",
        "questions",
        "category",
        "difficulty",
        "answer-key",
      ];
      b.classList.toggle("active", tabs[i] === tab);
    });
    renderTab(tab, result);
  }

  function renderTab(tab, result) {
    const body = document.getElementById("result-tab-body");
    if (!body) return;
    switch (tab) {
      case "overview":
        body.innerHTML = renderOverview(result);
        setTimeout(() => initOverviewCharts(result), 50);
        break;
      case "category":
        body.innerHTML = renderCategory(result);
        break;
      case "difficulty":
        body.innerHTML = renderDifficulty(result);
        break;
      case "questions":
        body.innerHTML = renderQuestions(result);
        break;
      case "answer-key":
        body.innerHTML = renderAnswerKey(result);
        break;
    }
  }

  // ── OVERVIEW TAB ──────────────────────────────────────────
  function renderOverview(result) {
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(380px, 1fr));gap:var(--sp-md);margin-bottom:var(--sp-lg)">
        
        <!-- Chart 1: Donut Distribution -->
        <div style="background:var(--bg-elevated); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:12px; display:flex;flex-direction:column">
          <h3 style="font-size:0.9rem;font-weight:700;color:var(--text-secondary);margin-bottom:8px">Answers Distribution</h3>
          <div style="flex:1;position:relative;height:180px;display:flex;align-items:center;justify-content:center">
            <canvas id="chart-answers"></canvas>
          </div>
        </div>

        <!-- Chart 2: Category Bar -->
        <div style="background:var(--bg-elevated); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:12px; display:flex;flex-direction:column">
          <h3 style="font-size:0.9rem;font-weight:700;color:var(--text-secondary);margin-bottom:8px">Category Accuracy (%)</h3>
          <div style="flex:1;position:relative;height:180px">
            <canvas id="chart-categories"></canvas>
          </div>
        </div>

        <!-- Chart 3: Difficulty Breakdown -->
        <div style="background:var(--bg-elevated); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:12px; display:flex;flex-direction:column">
          <h3 style="font-size:0.9rem;font-weight:700;color:var(--text-secondary);margin-bottom:8px">Difficulty Distribution</h3>
          <div style="flex:1;position:relative;height:180px">
            <canvas id="chart-difficulties"></canvas>
          </div>
        </div>

        <!-- Chart 4: Timeline / Progression -->
        <div style="background:var(--bg-elevated); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:12px; display:flex;flex-direction:column">
          <h3 style="font-size:0.9rem;font-weight:700;color:var(--text-secondary);margin-bottom:8px">Score Progression</h3>
          <div style="flex:1;position:relative;height:180px">
            <canvas id="chart-timeline"></canvas>
          </div>
        </div>

        <!-- Chart 5: Question Types Accuracy -->
        <div style="background:var(--bg-elevated); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:12px; display:flex;flex-direction:column">
          <h3 style="font-size:0.9rem;font-weight:700;color:var(--text-secondary);margin-bottom:8px">Accuracy by Type</h3>
          <div style="flex:1;position:relative;height:180px">
            <canvas id="chart-types"></canvas>
          </div>
        </div>

        <!-- Chart 6: Capability Radar -->
        <div style="background:var(--bg-elevated); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:12px; display:flex;flex-direction:column">
          <h3 style="font-size:0.9rem;font-weight:700;color:var(--text-secondary);margin-bottom:8px">Capability Radar</h3>
          <div style="flex:1;position:relative;height:180px;display:flex;align-items:center;justify-content:center">
            <canvas id="chart-radar"></canvas>
          </div>
        </div>

      </div>
    `;
  }

  let _activeCharts = [];

  function initOverviewCharts(result) {
    // Destroy previous chart instances to avoid canvas reuse errors
    _activeCharts.forEach((c) => c.destroy());
    _activeCharts = [];

    if (typeof Chart === "undefined") return;

    // Setup Theme Colors based on active app theme
    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    Chart.defaults.color = isDark ? "#94a3b8" : "#64748b";
    Chart.defaults.font.family = '"Inter", "Sora", sans-serif';
    Chart.defaults.font.size = 11;
    const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";

    const { score, quiz } = result;

    // 1. Answers Doughnut
    const ctxAnswers = document.getElementById("chart-answers");
    if (ctxAnswers) {
      _activeCharts.push(
        new Chart(ctxAnswers, {
          type: "doughnut",
          data: {
            labels: ["Correct", "Wrong", "Skipped"],
            datasets: [
              {
                data: [score.correct, score.wrong, score.skipped],
                backgroundColor: ["#10b981", "#ef4444", "#f59e0b"],
                borderWidth: 0,
                hoverOffset: 4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: "bottom" } },
            cutout: "70%",
          },
        })
      );
    }

    // 2. Category Bar
    const ctxCat = document.getElementById("chart-categories");
    if (ctxCat) {
      const catLabels = Object.keys(score.categoryMap).slice(0, 8); // Top 8
      const catData = catLabels.map((k) => {
        const d = score.categoryMap[k];
        return d.max ? Math.round((d.score / d.max) * 100) : 0;
      });
      _activeCharts.push(
        new Chart(ctxCat, {
          type: "bar",
          data: {
            labels: catLabels.length ? catLabels : ["Uncategorised"],
            datasets: [
              {
                label: "Accuracy %",
                data: catData.length ? catData : [score.accuracy],
                backgroundColor: "#0ea5e9",
                borderRadius: 4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: { grid: { color: gridColor }, beginAtZero: true, max: 100 },
            },
          },
        })
      );
    }

    // 3. Difficulty Bar (Horizontal)
    const ctxDiff = document.getElementById("chart-difficulties");
    if (ctxDiff) {
      const diffKeys = ["easy", "medium", "hard"];
      const diffData = diffKeys.map((k) => {
        const d =
          score.difficultyMap[k] ||
          score.difficultyMap[k.charAt(0).toUpperCase() + k.slice(1)];
        if (!d || !d.total) return 0;
        return Math.round((d.correct / d.total) * 100);
      });
      _activeCharts.push(
        new Chart(ctxDiff, {
          type: "bar",
          data: {
            labels: ["Easy", "Medium", "Hard"],
            datasets: [
              {
                label: "Accuracy %",
                data: diffData,
                backgroundColor: ["#10b981", "#f59e0b", "#ef4444"],
                borderRadius: 4,
              },
            ],
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { color: gridColor }, beginAtZero: true, max: 100 },
            },
          },
        })
      );
    }

    // 4. Timeline (Line)
    const ctxTime = document.getElementById("chart-timeline");
    if (ctxTime) {
      const timeLabels = quiz.questions.map((_, i) => "Q" + (i + 1));
      let runTotal = 0;
      const timeData = quiz.questions.map((q, i) => {
        // Find if this question was correct
        const ua = (quiz.answers[i] || {}).userAnswer;
        const pts = Results.getQuestionScore(q, ua, quiz.config);
        runTotal += pts;
        return Math.max(0, runTotal);
      });
      _activeCharts.push(
        new Chart(ctxTime, {
          type: "line",
          data: {
            labels: timeLabels,
            datasets: [
              {
                label: "Cumulative Score",
                data: timeData,
                borderColor: "#8b5cf6",
                backgroundColor: "rgba(139, 92, 246, 0.1)",
                fill: true,
                tension: 0.4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false } },
              y: { grid: { color: gridColor }, beginAtZero: true },
            },
          },
        })
      );
    }

    // 5. Types (Bar)
    const ctxType = document.getElementById("chart-types");
    if (ctxType) {
      const typeLabels = Object.keys(score.typeMap).slice(0, 6);
      const typeData = typeLabels.map((k) =>
        Math.round((score.typeMap[k].correct / score.typeMap[k].total) * 100)
      );
      _activeCharts.push(
        new Chart(ctxType, {
          type: "bar",
          data: {
            labels: typeLabels,
            datasets: [
              {
                label: "Accuracy %",
                data: typeData,
                backgroundColor: "#ec4899",
                borderRadius: 4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { display: false } },
              y: { grid: { color: gridColor }, beginAtZero: true, max: 100 },
            },
          },
        })
      );
    }

    // 6. Capability Radar
    const ctxRadar = document.getElementById("chart-radar");
    if (ctxRadar) {
      const tops = Object.keys({
        ...score.categoryMap,
        ...score.typeMap,
      }).slice(0, 6);
      if (tops.length >= 3) {
        const radarData = tops.map((k) => {
          if (score.categoryMap[k])
            return score.categoryMap[k].max
              ? Math.round(
                  (score.categoryMap[k].score / score.categoryMap[k].max) * 100
                )
              : 0;
          if (score.typeMap[k])
            return score.typeMap[k].total
              ? Math.round(
                  (score.typeMap[k].correct / score.typeMap[k].total) * 100
                )
              : 0;
          return 0;
        });
        _activeCharts.push(
          new Chart(ctxRadar, {
            type: "radar",
            data: {
              labels: tops,
              datasets: [
                {
                  label: "Capability (%)",
                  data: radarData,
                  backgroundColor: "rgba(14, 165, 233, 0.2)",
                  borderColor: "#0ea5e9",
                  pointBackgroundColor: "#0ea5e9",
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                r: {
                  suggestedMin: 0,
                  suggestedMax: 100,
                  ticks: { display: false },
                },
              },
            },
          })
        );
      } else {
        // Fallback if not enough dimensions for radar
        ctxRadar.outerHTML =
          '<p class="text-muted text-sm text-center">Not enough data vectors to generate radar.</p>';
      }
    }
  }

  // ── CATEGORY TAB ─────────────────────────────────────────
  function renderCategory(result) {
    const cats = result.score.categoryMap;
    return `
      <div>
        <div style="margin-bottom:var(--sp-xl);padding:var(--sp-lg);background:var(--bg-elevated);border-radius:var(--radius-lg)">
          <h4 style="margin-bottom:20px;color:var(--text-secondary);font-size:0.95rem">Category Accuracy</h4>
          <div style="display:flex;flex-direction:column;gap:16px">
            ${Object.entries(cats)
              .map(([cat, d]) => {
                const pct = d.max ? Math.round((d.score / d.max) * 100) : 0;
                return `
              <div style="display:flex;align-items:center;gap:var(--sp-md)">
                <div style="width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:0.85rem;font-weight:600" title="${cat}">${cat}</div>
                <div style="flex:1;height:24px;background:var(--border-color);border-radius:4px;position:relative;overflow:hidden">
                  <div style="position:absolute;left:0;top:0;height:100%;width:${pct}%;background:var(--accent-primary);border-radius:4px"></div>
                </div>
                <div style="width:40px;text-align:right;font-size:0.85rem;font-weight:bold">${pct}%</div>
              </div>`;
              })
              .join("")}
          </div>
        </div>
        <table class="data-table">
          <thead><tr><th>Category</th><th>Correct</th><th>Total</th><th>Score</th><th>Max</th><th>%</th></tr></thead>
          <tbody>
            ${Object.entries(cats)
              .map(
                ([cat, d]) => `
              <tr>
                <td><strong>${cat}</strong></td>
                <td><span class="badge badge-success">${d.correct}</span></td>
                <td>${d.total}</td>
                <td>${d.score.toFixed(1)}</td>
                <td>${d.max.toFixed(1)}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:8px">
                    <div class="progress-bar" style="width:80px;height:6px">
                      <div class="progress-fill" style="width:${
                        d.max ? Math.round((d.score / d.max) * 100) : 0
                      }%"></div>
                    </div>
                    ${d.max ? Math.round((d.score / d.max) * 100) : 0}%
                  </div>
                </td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`;
  }

  // ── DIFFICULTY TAB ────────────────────────────────────────
  function renderDifficulty(result) {
    const diffs = result.score.difficultyMap;
    const colors = {
      easy: "var(--color-success)",
      medium: "var(--color-warn)",
      hard: "var(--color-error)",
      unknown: "var(--text-muted)",
    };
    return `
      <div>
        <div style="margin-bottom:var(--sp-xl);padding:var(--sp-lg);background:var(--bg-elevated);border-radius:var(--radius-lg)">
          <h4 style="margin-bottom:20px;color:var(--text-secondary);font-size:0.95rem">Difficulty Accuracy</h4>
          <div style="display:flex;flex-direction:column;gap:16px">
            ${Object.entries(diffs)
              .map(([d, v]) => {
                const col = colors[d.toLowerCase()] || colors.unknown;
                const pct = v.total
                  ? Math.round((v.correct / v.total) * 100)
                  : 0;
                return `
              <div style="display:flex;align-items:center;gap:var(--sp-md)">
                <div style="width:100px;text-transform:capitalize;font-size:0.85rem;color:${col};font-weight:600">${d}</div>
                <div style="flex:1;height:20px;background:var(--border-color);border-radius:10px;position:relative;overflow:hidden">
                  <div style="position:absolute;left:0;top:0;height:100%;width:${pct}%;background:${col};border-radius:10px"></div>
                </div>
                <div style="width:40px;text-align:right;font-size:0.85rem;font-weight:bold">${pct}%</div>
              </div>`;
              })
              .join("")}
          </div>
        </div>
        <div class="grid-3">
          ${Object.entries(diffs)
            .map(
              ([d, v]) => `
            <div class="report-stat-card">
              <div class="report-stat-num" style="color:${
                colors[d] || "var(--accent-primary)"
              }">
                ${v.total ? Math.round((v.correct / v.total) * 100) : 0}%
              </div>
              <div class="report-stat-label">${d} Accuracy</div>
              <p class="text-xs text-muted mt-sm">${v.correct}/${
                v.total
              } correct</p>
            </div>`
            )
            .join("")}
        </div>
      </div>`;
  }

  // ── TYPE TAB ─────────────────────────────────────────────
  function renderTypeTab(result) {
    const types = result.score.typeMap;
    return `
      <div>
        <div style="margin-bottom:var(--sp-xl);padding:var(--sp-lg);background:var(--bg-elevated);border-radius:var(--radius-lg)">
          <h4 style="margin-bottom:20px;color:var(--text-secondary);font-size:0.95rem">Question Type Accuracy</h4>
          <div style="display:flex;flex-direction:column;gap:20px">
            ${Object.entries(types)
              .map(([t, v]) => {
                const wrong = v.total - v.correct;
                const cPct = v.total ? (v.correct / v.total) * 100 : 0;
                const wPct = v.total ? (wrong / v.total) * 100 : 0;
                return `
              <div>
                <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:8px;font-weight:600">
                  <span>${t}</span>
                  <span class="text-muted">${v.total} Qs</span>
                </div>
                <div style="height:24px;background:var(--border-color);border-radius:6px;display:flex;overflow:hidden">
                  <div style="width:${cPct}%;background:var(--color-success);display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:#000;font-weight:bold" title="Correct: ${
                  v.correct
                }">${cPct >= 10 ? v.correct : ""}</div>
                  <div style="width:${wPct}%;background:var(--color-error);display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:#fff;font-weight:bold" title="Wrong: ${wrong}">${
                  wPct >= 10 ? wrong : ""
                }</div>
                </div>
              </div>`;
              })
              .join("")}
          </div>
          <!-- Legend -->
          <div style="display:flex;gap:16px;margin-top:24px;font-size:0.8rem;justify-content:center;font-weight:600">
            <div style="display:flex;align-items:center;gap:6px"><div style="width:14px;height:14px;border-radius:4px;background:var(--color-success)"></div>Correct</div>
            <div style="display:flex;align-items:center;gap:6px"><div style="width:14px;height:14px;border-radius:4px;background:var(--color-error)"></div>Wrong</div>
          </div>
        </div>
        <table class="data-table">
          <thead><tr><th>Question Type</th><th>Correct</th><th>Total</th><th>Accuracy</th></tr></thead>
          <tbody>
            ${Object.entries(types)
              .map(
                ([t, v]) => `
              <tr>
                <td>${t}</td>
                <td><span class="badge badge-success">${v.correct}</span></td>
                <td>${v.total}</td>
                <td>${
                  v.total ? Math.round((v.correct / v.total) * 100) : 0
                }%</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`;
  }

  // ── QUESTIONS TAB ─────────────────────────────────────────
  function renderQuestions(result) {
    const { quiz } = result;
    return `
      <div class="dash-questions-report">
        <div class="report-header">
           <h2>Detailed Performance Review</h2>
           <p>Showing each question with your response vs. the correct answer</p>
        </div>
        <div class="questions-list">
          ${quiz.questions
            .map((q, i) => {
              const ans = quiz.answers[i] || {};
              const corr = Results.isCorrect(q, ans.userAnswer);
              const type = (q["Question Type"] || "").trim();
              const isDrag = type === "Drag & Drop";
              const isMultiMatch = type === "Multi Matching";

              let ua = "";
              if (isMultiMatch && ans.userAnswer) {
                try {
                  const map = JSON.parse(ans.userAnswer);
                  ua = Object.entries(map)
                    .map(([k, v]) => `${k}: ${v.join(", ")}`)
                    .join(" | ");
                } catch (e) {
                  ua = ans.userAnswer;
                }
              } else {
                ua = Array.isArray(ans.userAnswer)
                  ? ans.userAnswer.join(", ")
                  : ans.userAnswer || "—";
              }
              const timeClass =
                ans.timeTaken > 30
                  ? "slow"
                  : ans.timeTaken < 10
                  ? "fast"
                  : "avg";

              const correctChoices = Results.getChoices(q);
              const correctKey =
                isDrag || isMultiMatch
                  ? correctChoices
                      .map((c) => {
                        if (isMultiMatch) {
                          const pts = c.split("-");
                          return `${pts[0]}: ${pts[1] ? pts[1].replace(/\|/g, ", ") : ""}`;
                        }
                        return c;
                      })
                      .join(" | ")
                  : q["Correct Answer"];

              return `
              <div class="report-q-card ${corr ? "correct" : "incorrect"}">
                <div class="q-card-side">
                   <div class="q-status-badge">${
                     corr ? "CORRECT" : "WRONG"
                   }</div>
                   <div class="q-time-badge ${timeClass}">${
                ans.timeTaken || 0
              }s</div>
                </div>
                <div class="q-card-body">
                   <div class="q-meta">${q.Category || "General"} • ${
                q.Difficulty || "Medium"
              }</div>
                   <p class="q-text"><strong>Q${i + 1}.</strong> ${
                q.Question
              }</p>
                   
                   <div class="q-ans-compare">
                      <div class="ans-box user">
                         <span class="label">YOUR ANSWER</span>
                         <span class="val">${ua}</span>
                      </div>
                      <div class="ans-box target">
                         <span class="label">CORRECT KEY</span>
                         <span class="val">${correctKey}</span>
                      </div>
                   </div>

                   ${
                     q.Explanation || q.Solution
                       ? `
                   <div class="q-explanation">
                      <p class="label">EXPLANATION</p>
                      <p class="text">${q.Explanation || q.Solution}</p>
                   </div>`
                       : ""
                   }
                </div>
              </div>`;
            })
            .join("")}
        </div>
      </div>`;
  }

  // ── ANSWER KEY TAB ────────────────────────────────────────
  function renderAnswerKey(result) {
    const { quiz } = result;
    return `
      <div>
        <div class="answer-row" style="font-weight:700;background:var(--bg-elevated);border-radius:var(--radius-sm) var(--radius-sm) 0 0">
          <span>#</span><span>Question</span><span>Correct</span><span>Your Answer</span><span>Result</span>
        </div>
        ${quiz.questions
          .map((q, i) => {
            const ans = quiz.answers[i] || {};
            const corr = Results.isCorrect(q, ans.userAnswer);
            const type = (q["Question Type"] || "").trim();
            const isDrag = type === "Drag & Drop";
            const isMultiMatch = type === "Multi Matching";

            let ua = "";
            if (isMultiMatch && ans.userAnswer) {
              try {
                const map = JSON.parse(ans.userAnswer);
                ua = Object.entries(map)
                  .map(([k, v]) => `${k}: ${v.join(", ")}`)
                  .join("|");
              } catch (e) {
                ua = ans.userAnswer;
              }
            } else {
              ua = Array.isArray(ans.userAnswer)
                ? ans.userAnswer.join("|")
                : ans.userAnswer || "—";
            }

            const correctKey =
              isDrag || isMultiMatch
                ? Results.getChoices(q)
                    .map((c) => {
                      if (isMultiMatch) {
                        const pts = c.split("-");
                        return `${pts[0]}: ${pts[1] ? pts[1].replace(/\|/g, ", ") : ""}`;
                      }
                      return c;
                    })
                    .join(" | ")
                : q["Correct Answer"];

            return `
            <div class="answer-row">
              <span class="q-num">${i + 1}</span>
              <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px" title="${
                q.Question
              }">${q.Question.substring(0, 60)}${
              q.Question.length > 60 ? "…" : ""
            }</span>
              <span class="text-success font-bold">${correctKey}</span>
              <span style="color:${
                corr ? "var(--color-success)" : "var(--color-error)"
              }">${ua}</span>
              <span>${corr ? "✅" : "❌"}</span>
            </div>`;
          })
          .join("")}
      </div>`;
  }

  function downloadCSV() {
    const result = State.get("result");
    const { quiz, score } = result;
    const user = State.get("user") || { name: "Guest" };

    let csv = `Quiz Report - ${
      quiz.config["Quiz Settings Title"] || "Assessment"
    }\n`;
    csv += `Candidate,${user.name}\n`;
    csv += `Date,${new Date(result.endTime).toLocaleString()}\n`;
    csv += `Accuracy,${score.accuracy}%\n`;
    csv += `Total Score,${score.total}/${score.maxTotal}\n\n`;

    csv += `Q#,Question,Category,Difficulty,Your Answer,Correct Answer,Status,Time(s)\n`;

    quiz.questions.forEach((q, i) => {
      const ans = quiz.answers[i] || {};
      const corr = Results.isCorrect(q, ans.userAnswer);
      const type = (q["Question Type"] || "").trim();
      const isDrag = type === "Drag & Drop";
      const isMultiMatch = type === "Multi Matching";

      let ua = "";
      if (isMultiMatch && ans.userAnswer) {
        try {
          const map = JSON.parse(ans.userAnswer);
          ua = Object.entries(map)
            .map(([k, v]) => `${k}: ${v.join(", ")}`)
            .join(" | ");
        } catch (e) {
          ua = ans.userAnswer;
        }
      } else {
        ua = (
          Array.isArray(ans.userAnswer)
            ? ans.userAnswer.join("|")
            : ans.userAnswer || ""
        ).replace(/"/g, '""');
      }

      const correctKey = (
        isDrag || isMultiMatch
          ? Results.getChoices(q)
              .map((c) => {
                if (isMultiMatch) {
                  const pts = c.split("-");
                  return `${pts[0]}: ${pts[1] ? pts[1].replace(/\|/g, ", ") : ""}`;
                }
                return c;
              })
              .join(" | ")
          : q["Correct Answer"] || ""
      ).replace(/"/g, '""');

      csv += `${i + 1},"${q.Question.replace(/"/g, '""')}","${
        q.Category || ""
      }","${q.Difficulty || ""}", "${ua}","${correctKey}",${
        corr ? "CORRECT" : "WRONG"
      },${ans.timeTaken || 0}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `QuizPro_Report_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function downloadPDF() {
    if (typeof html2pdf === "undefined") {
      UI.toast("PDF engine loading, please try again in a moment...", "warn");
      return;
    }
    UI.setLoading(true, "Generating HD Report…");

    const result = State.get("result");
    const { quiz, score, endTime } = result;
    const user = State.get("user") || { name: "Guest" };
    const cats = score.categoryMap;
    const diffs = score.difficultyMap;

    const insightsS = getInsights(score, "strengths");
    const insightsW = getInsights(score, "weaknesses");

    const pdfContainer = document.createElement("div");
    pdfContainer.style.width = "210mm";
    pdfContainer.style.background = "#fff";
    pdfContainer.style.fontFamily = "'Inter', sans-serif";

    pdfContainer.innerHTML = `
      <div style="padding: 20mm; color: #0f172a;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 24px; margin-bottom: 30px;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 44px; height: 44px; background: #0f172a; color: #fff; display: grid; place-items: center; border-radius: 8px; font-weight: 800; font-size: 20px;">Q</div>
                <div>
                    <h1 style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin: 0;">Assessment Report</h1>
                    <div style="font-size: 14px; color: #64748b; font-weight: 600;">Secure Assessment Engine Report</div>
                </div>
            </div>
            <div style="text-align: right">
                <div style="font-size: 14px; font-weight: 800;">${
                  quiz.config["Quiz Settings Title"] || "Assessment Report"
                }</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">UID: ${endTime.slice(
                  0,
                  10
                )}</div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 40px;">
            <div style="border-left: 3px solid #e2e8f0; padding-left: 12px;"><div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">CANDIDATE</div><div style="font-size: 14px; font-weight: 700;">${
              user.name
            }</div></div>
            <div style="border-left: 3px solid #e2e8f0; padding-left: 12px;"><div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">DATE</div><div style="font-size: 14px; font-weight: 700;">${new Date(
              endTime
            ).toLocaleDateString()}</div></div>
            <div style="border-left: 3px solid #e2e8f0; padding-left: 12px;"><div style="font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase;">STATUS</div><div style="font-size: 14px; font-weight: 700; color: #10b981">COMPLETED</div></div>
        </div>

        <div style="background: #0f172a; color: #fff; border-radius: 12px; padding: 32px; display: flex; justify-content: space-between; gap: 20px; margin-bottom: 40px; align-items: center;">
            <div style="border-right: 1px solid rgba(255,255,255,0.1); padding-right: 20px">
                <div style="font-size: 44px; font-weight: 800; line-height: 1;">${
                  score.accuracy
                }%</div>
                <div style="font-size: 12px; font-weight: 600; opacity: 0.7; margin-top: 4px;">ACCURACY</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 18px; font-weight: 700; margin-bottom: 2px;">${score.total.toFixed(
                  1
                )} / ${score.maxTotal}</div>
                <div style="font-size: 10px; font-weight: 600; opacity: 0.6; text-transform: uppercase;">SCORE</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 18px; font-weight: 700; margin-bottom: 2px;">${fmtTime(
                  score.timeTaken
                )}</div>
                <div style="font-size: 10px; font-weight: 600; opacity: 0.6; text-transform: uppercase;">TIME</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 18px; font-weight: 700; margin-bottom: 2px;">${
                  score.correct
                } / ${quiz.questions.length}</div>
                <div style="font-size: 10px; font-weight: 600; opacity: 0.6; text-transform: uppercase;">CORRECT</div>
            </div>
        </div>

        <h3 style="font-size: 16px; font-weight: 800; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Domain Performance</h3>
        <div style="margin-bottom: 40px;">
            ${Object.entries(cats)
              .map(([cat, d]) => {
                const pct = d.max ? Math.round((d.score / d.max) * 100) : 0;
                return `
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 12px;">
                    <div style="width: 180px; font-size: 13px; font-weight: 700;">${cat}</div>
                    <div style="flex: 1; height: 8px; background: #f8fafc; border-radius: 4px; overflow: hidden; border: 1px solid #e2e8f0;">
                        <div style="height: 100%; background: #0f172a; width: ${pct}%"></div>
                    </div>
                    <div style="width: 40px; text-align: right; font-size: 12px; font-weight: 800;">${pct}%</div>
                </div>`;
              })
              .join("")}
        </div>

        <h3 style="font-size: 16px; font-weight: 800; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; page-break-before: always;">Question Review</h3>
        <div class="questions">
            ${quiz.questions
              .map((q, i) => {
                const ans = quiz.answers[i] || {};
                const corr = Results.isCorrect(q, ans.userAnswer);
                const type = (q["Question Type"] || "").trim();
                const isDrag = type === "Drag & Drop";
                const isMultiMatch = type === "Multi Matching";

                let uaStr = "";
                if (isMultiMatch && ans.userAnswer) {
                  try {
                    const map = JSON.parse(ans.userAnswer);
                    uaStr = Object.entries(map)
                      .map(([k, v]) => `${k}: ${v.join(", ")}`)
                      .join("; ");
                  } catch (e) {
                    uaStr = ans.userAnswer;
                  }
                } else {
                  uaStr = Array.isArray(ans.userAnswer)
                    ? ans.userAnswer.join(", ")
                    : ans.userAnswer || "—";
                }

                const correctKey =
                  isDrag || isMultiMatch
                    ? Results.getChoices(q)
                        .map((c) => {
                          if (isMultiMatch) {
                            const pts = c.split("-");
                            return `${pts[0]}: ${pts[1] ? pts[1].replace(/\|/g, ", ") : ""}`;
                          }
                          return c;
                        })
                        .join(" | ")
                    : q["Correct Answer"];

                return `
                <div style="margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">
                        <span>QUESTION ${i + 1}</span>
                        <span style="color: ${corr ? "#10b981" : "#ef4444"}">${
                  corr ? "PASSED" : "FAILED"
                }</span>
                    </div>
                    <div style="font-size: 16px; font-weight: 700; margin-bottom: 20px; line-height: 1.5;">${
                      q.Question
                    }</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <div style="font-size: 9px; font-weight: 800; color: #64748b; margin-bottom: 6px;">RESPONSE</div>
                            <div style="font-size: 13px; font-weight: 700; color: ${
                              corr ? "#0f172a" : "#ef4444"
                            }">${uaStr}</div>
                        </div>
                        <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.3);">
                            <div style="font-size: 9px; font-weight: 800; color: #64748b; margin-bottom: 6px;">CORRECT KEY</div>
                            <div style="font-size: 13px; font-weight: 700; color: #10b981">${correctKey}</div>
                        </div>
                    </div>
                </div>`;
              })
              .join("")}
        </div>
      </div>
    `;

    const opt = {
      margin: 0,
      filename: `QuizPro_Report_${user.name.replace(/\s+/g, "_")}.pdf`,
      image: { type: "jpeg", quality: 1 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        letterRendering: true,
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    html2pdf()
      .set(opt)
      .from(pdfContainer)
      .save()
      .then(() => {
        UI.setLoading(false);
        UI.toast("Report downloaded successfully!", "success");
      })
      .catch((err) => {
        UI.setLoading(false);
        UI.toast("Failed to generate PDF.", "error");
        console.error(err);
      });
  }

  function openPrintReport() {
    const result = State.get("result");
    if (!result) return;
    const { quiz, score, endTime } = result;
    const user = State.get("user") || { name: "Guest" };
    const cats = score.categoryMap || {};

    const printWindow = window.open("", "_blank");
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Official Report - ${user.name}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root { --primary: #0f172a; --secondary: #64748b; --border: #e2e8f0; --bg: #f8fafc; --success: #10b981; --error: #ef4444; }
        * { box-sizing: border-box; }
        body { font-family: 'Inter', system-ui, sans-serif; color: var(--primary); margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
        .page { width: 210mm; min-height: 297mm; padding: 20mm; margin: 10mm auto; background: #fff; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
        @media print { 
            body { background: none; } 
            .page { margin: 0; box-shadow: none; width: 100%; height: auto; border: none; } 
            .no-print { display: none; } 
        }

        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--primary); padding-bottom: 24px; margin-bottom: 30px; }
        .logo-box { display: flex; align-items: center; gap: 12px; }
        .logo-sq { width: 44px; height: 44px; background: var(--primary); color: #fff; display: grid; place-items: center; border-radius: 8px; font-weight: 800; font-size: 20px; }
        .report-title { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
        
        .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 40px; }
        .meta-item { border-left: 3px solid var(--border); padding-left: 12px; }
        .meta-label { font-size: 10px; font-weight: 800; color: var(--secondary); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
        .meta-val { font-size: 14px; font-weight: 700; }

        .summary-banner { background: var(--primary); color: #fff; border-radius: 12px; padding: 32px; display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 20px; margin-bottom: 40px; align-items: center; }
        .score-big { border-right: 1px solid rgba(255,255,255,0.1); }
        .score-val { font-size: 44px; font-weight: 800; line-height: 1; }
        .score-label { font-size: 12px; font-weight: 600; opacity: 0.7; margin-top: 4px; }
        
        .stat-small { text-align: center; }
        .stat-small-val { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
        .stat-small-label { font-size: 10px; font-weight: 600; opacity: 0.6; text-transform: uppercase; }

        .section-h { font-size: 18px; font-weight: 800; margin: 40px 0 20px 0; display: flex; align-items: center; gap: 10px; }
        .section-h::after { content: ''; flex: 1; height: 1px; background: var(--border); }

        .topic-row { display: flex; align-items: center; gap: 20px; margin-bottom: 12px; }
        .topic-name { width: 180px; font-size: 13px; font-weight: 700; }
        .topic-bar-bg { flex: 1; height: 8px; background: var(--bg); border-radius: 4px; overflow: hidden; }
        .topic-bar-fill { height: 100%; background: var(--primary); border-radius: 4px; }
        .topic-pct { width: 60px; text-align: right; font-size: 13px; font-weight: 800; }

        .q-item { margin-bottom: 30px; border: 1px solid var(--border); border-radius: 12px; padding: 24px; page-break-inside: avoid; }
        .q-header { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 11px; font-weight: 700; color: var(--secondary); text-transform: uppercase; }
        .q-text { font-size: 16px; font-weight: 700; margin-bottom: 20px; line-height: 1.5; }
        
        .ans-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .ans-pill { background: var(--bg); padding: 16px; border-radius: 8px; border: 1px solid var(--border); }
        .ans-pill.correct-pill { border-color: rgba(16, 185, 129, 0.3); background: #f0fdf4; }
        .ans-l { font-size: 9px; font-weight: 800; color: var(--secondary); margin-bottom: 6px; }
        .ans-v { font-size: 13px; font-weight: 700; }
        
        .expl-box { margin-top: 20px; padding: 16px; background: #eff6ff; border-radius: 8px; border-left: 4px solid #3b82f6; font-size: 13px; line-height: 1.6; }
        .footer { margin-top: 60px; border-top: 1px solid var(--border); padding-top: 20px; text-align: center; font-size: 11px; color: var(--secondary); font-weight: 600; }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            <div class="logo-box">
                <div class="logo-sq">Q</div>
                <div>
                    <h1 class="report-title">Assessment Report</h1>
                    <div style="font-size: 14px; color: var(--secondary); font-weight: 600;">System Generated Official Transcript</div>
                </div>
            </div>
            <div style="text-align: right">
                <div style="font-size: 14px; font-weight: 800;">${
                  quiz.config["Quiz Settings Title"] || "Assessment Report"
                }</div>
                <div style="font-size: 12px; color: var(--secondary); margin-top: 4px;">UID: ${endTime.slice(
                  0,
                  10
                )}-${Math.floor(Math.random() * 1000)}</div>
            </div>
        </div>

        <div class="meta-grid">
            <div class="meta-item"><div class="meta-label">CANDIDATE</div><div class="meta-val">${
              user.name
            }</div></div>
            <div class="meta-item"><div class="meta-label">DATE GENERATED</div><div class="meta-val">${new Date(
              endTime
            ).toLocaleString()}</div></div>
            <div class="meta-item"><div class="meta-label">SESSION STATUS</div><div class="meta-val" style="color:var(--success)">COMPLETED</div></div>
        </div>

        <div class="summary-banner">
            <div class="score-big">
                <div class="score-val">${score.accuracy}%</div>
                <div class="score-label">OVERALL ACCURACY</div>
            </div>
            <div class="stat-small">
                <div class="stat-small-val">${score.total.toFixed(1)} / ${
      score.maxTotal
    }</div>
                <div class="stat-small-label">RAW SCORE</div>
            </div>
            <div class="stat-small">
                <div class="stat-small-val">${fmtTime(score.timeTaken)}</div>
                <div class="stat-small-label">TIME ELAPSED</div>
            </div>
            <div class="stat-small">
                <div class="stat-small-val">${score.correct} / ${
      quiz.questions.length
    }</div>
                <div class="stat-small-label">ANSWERS</div>
            </div>
        </div>

        <div class="section-h">DOMAIN PERFORMANCE</div>
        <div style="margin-bottom: 40px;">
            ${Object.entries(cats)
              .map(([cat, d]) => {
                const pct = d.max ? Math.round((d.score / d.max) * 100) : 0;
                return `
                <div class="topic-row">
                    <div class="topic-name">${cat}</div>
                    <div class="topic-bar-bg"><div class="topic-bar-fill" style="width: ${pct}%"></div></div>
                    <div class="topic-pct">${pct}%</div>
                </div>`;
              })
              .join("")}
        </div>

        <div class="section-h">QUESTION DETAILED REVIEW</div>
        <div class="questions">
            ${quiz.questions
              .map((q, i) => {
                const ans = quiz.answers[i] || {};
                const corr = Results.isCorrect(q, ans.userAnswer);
                const uaStr = Array.isArray(ans.userAnswer)
                  ? ans.userAnswer.join(", ")
                  : ans.userAnswer || "—";
                const expl = q.Explanation || q.Solution || "";

                return `
                <div class="q-item">
                    <div class="q-header">
                        <span>QUESTION ${i + 1} • ${
                  q.Category || "GENERAL"
                }</span>
                        <span style="color: ${
                          corr ? "var(--success)" : "var(--error)"
                        }">${corr ? "PASS" : "FAIL"}</span>
                    </div>
                    <div class="q-text">${q.Question}</div>
                    <div class="ans-layout">
                        <div class="ans-pill">
                            <div class="ans-l">CANDIDATE RESPONSE</div>
                            <div class="ans-v" style="color: ${
                              corr ? "var(--primary)" : "var(--error)"
                            }">${uaStr}</div>
                        </div>
                        <div class="ans-pill correct-pill">
                            <div class="ans-l">OFFICIAL VALIDATION</div>
                            <div class="ans-v" style="color: var(--success)">${
                              q["Correct Answer"]
                            }</div>
                        </div>
                    </div>
                    ${
                      expl
                        ? `<div class="expl-box"><strong>Rationalization:</strong> ${expl}</div>`
                        : ""
                    }
                </div>`;
              })
              .join("")}
        </div>

        <div class="footer">
            QuizPro Analytics Professional Series • Generated via Localized Assessment Engine • Official Transcript
        </div>
    </div>
    <script>
        window.onload = () => {
            setTimeout(() => {
                window.print();
            }, 1000);
        };
    </script>
</body>
</html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  }
  function shareResult() {
    if (navigator.share) {
      const result = State.get("result");
      const score = result.score;
      navigator
        .share({
          title: "QuizPro Performance Report",
          text: `I scored ${score.accuracy}% (${score.total.toFixed(1)}/${
            score.maxTotal
          }) on my ${
            result.quiz.config["Quiz Settings Title"] || "Assessment"
          }!`,
          url: window.location.href,
        })
        .catch((err) => console.log("Error sharing:", err));
    } else {
      UI.toast("Web Share API not supported on this browser", "info");
    }
  }

  function retakeQuiz() {
    UI.confirm2(
      "Are you sure you want to retake this quiz?",
      "Dashboard.startQuiz"
    );
  }

  return {
    render,
    switchTab,
    downloadPDF,
    downloadCSV,
    openPrintReport,
    shareResult,
    retakeQuiz,
  };
})();

// ── History Page ──────────────────────────────────────────
const PageHistory = (() => {
  function render(main) {
    main.innerHTML = `
      <div style="margin:0 auto" class="animate-up">
        <h1 class="section-title" style="margin-bottom:var(--sp-lg)">📜 Attempt History</h1>
        <div class="card">
          <p class="text-muted text-sm" style="text-align:center;padding:var(--sp-xl)">
            History is stored in Google Drive Result_Data.csv.<br>
            <button class="btn btn-primary btn-sm" style="margin-top:var(--sp-md)" onclick="PageHistory.load()">Load History</button>
          </p>
          <div id="history-body"></div>
        </div>
      </div>`;
  }

  async function load() {
    const body = document.getElementById("history-body");
    if (!body) return;

    const user = State.get("user");
    if (!user || !user.identifier) {
      body.innerHTML =
        '<p class="text-warn text-sm" style="text-align:center;padding:var(--sp-lg)">Please initialize your profile to view cloud history.</p>';
      return;
    }

    body.innerHTML =
      '<div class="spinner" style="margin:var(--sp-lg) auto"></div>';

    try {
      const history = await API.getHistory(user.identifier);

      if (!history || !history.length) {
        body.innerHTML =
          '<p class="text-muted text-sm" style="text-align:center;padding:var(--sp-lg)">No previous attempts found for your ID.</p>';
        return;
      }

      body.innerHTML = `
        <div style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Quiz</th>
                <th>Topic</th>
                <th>Score</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              ${history
                .reverse()
                .map((r) => {
                  const dateVal = r["End Time"] || r["Start Time"] || "";
                  const date = dateVal ? new Date(dateVal).toLocaleString() : "Date Unknown";
                  const score = r["Result Score"] || "—";
                  // Robustly find filepath key
                  const filepath = r.Filepath || r.filepath || r.FILEPATH || r["Filepath"] || "";
                  
                  return `
                  <tr>
                    <td>${date}</td>
                    <td><div style="font-weight:700">${r["Quiz Name"] || "—"}</div></td>
                    <td><span class="badge badge-neutral">${r["Quiz Topic"] || "—"}</span></td>
                    <td style="font-family:var(--font-mono);font-weight:800">${score}</td>
                    <td>
                      ${filepath ? `
                        <button class="btn btn-ghost btn-sm" onclick="PageHistory.viewCloudAttempt('${filepath}')">
                          Review →
                        </button>
                      ` : '<span class="text-xs text-muted italic">No Detail</span>'}
                    </td>
                  </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>`;
    } catch (e) {
      body.innerHTML = `<div style="padding:20px; text-align:center">
        <p class="text-error text-sm">${e.message}</p>
        <p class="text-xs text-muted">Ensure your Google Script is correctly deployed.</p>
      </div>`;
    }
  }

  async function viewCloudAttempt(fileId) {
    console.log("Viewing cloud attempt for File ID:", fileId);
    if (!fileId) {
      UI.toast("No valid File ID found for this attempt", "error");
      return;
    }
    UI.setLoading(true, "Fetching attempt details…");
    try {
      const rows = await API.getAttempt(fileId);
      console.log("Fetched rows:", rows ? rows.length : 0);
      // Map cloud headers back to internal schema (with spaces where needed)
      const mappedQuestions = rows.map((r) => ({
        Question: r.QuestionText || "Unknown Question",
        Score: parseFloat(r.Score) || 1,
        "Question Type": (r.QuestionType || "Multichoice").trim(),
        "Correct Answer": r.CorrectAnswer || "",
        Category: r.Category || "Uncategorised",
        "Sub Category": r.SubCategory || "",
        Difficulty: r.Difficulty || "Medium",
      }));

      const mappedAnswers = rows.map((r) => ({
        userAnswer: r.UserAnswer || "",
        isCorrect: (r.IsCorrect || "").toLowerCase() === "true",
        timeTaken: parseInt(r.TimeTaken) || 0,
      }));

      const quiz = {
        config: State.get("quiz")?.config || { "Quiz Settings Title": "Cloud Review" },
        questions: mappedQuestions,
        answers: mappedAnswers,
        startTime: Date.now() - (mappedAnswers.reduce((acc, a) => acc + a.timeTaken, 0) * 1000), 
      };

      const score = Results.calculateScore(quiz);
      State.set("result", { quiz, score, endTime: new Date().toISOString() });
      UI.setLoading(false);
      UI.navigate("result");
    } catch (e) {
      UI.setLoading(false);
      UI.toast("Failed to load attempt: " + e.message, "error");
    }
  }

  return { render, load, viewCloudAttempt };
})();
