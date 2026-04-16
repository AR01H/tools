// ============================================================
//  QUIZ APP — result.js
//  Score calculation + full results page with charts & tabs
// ============================================================

// ── Scoring Engine ────────────────────────────────────────
const Results = (() => {
  function getChoices(q) {
    // Hyper-inclusive regex for choices/options (Choice 1, Option 2, Option: A, etc.)
    return Object.keys(q)
      .filter((k) => /^(choice|option|alt)\s*[:\-_]?\s*[a-z0-9]+$/i.test(k.trim()))
      .sort((a, b) => {
        const na = (a.match(/\d+/) || [0])[0];
        const nb = (b.match(/\d+/) || [0])[0];
        if (na !== nb) return parseInt(na) - parseInt(nb);
        return a.localeCompare(b);
      })
      .map((k) => q[k])
      .filter(Boolean);
  }

  function getInsight(q) {
    const keys = ["Explanation", "Solution", "Insight", "Rationale", "Feedback"];
    for (let k of Object.keys(q)) {
      if (keys.some(v => v.toLowerCase() === k.toLowerCase())) return q[k];
    }
    return null;
  }
  function isCorrect(q, userAnswer) {
    if (!userAnswer && userAnswer !== 0) return false;
    const correctVal = getCorrectAnswer(q);
    const correct = (correctVal || "").split("|").map((s) => s.trim());
    const type = (q["Question Type"] || "").trim();
    const choices = getChoices(q);

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
    if (type === "Multi Matching") {
      if (!userAnswer || userAnswer === "" || userAnswer === "{}") return false;
      try {
        const uaMap = typeof userAnswer === 'string' ? JSON.parse(userAnswer) : userAnswer;
        return choices.every(c => {
          const m = c.match(/^(.+?)(?:\s*[:\-\u2192]\s*)(.+)$/);
          if (!m) return true;
          const left = m[1].trim();
          const expected = m[2].split("|").map(t => t.trim().toLowerCase()).filter(Boolean);
          const user = (uaMap[left] || []).map(t => String(t).trim().toLowerCase());
          return expected.length === user.length && expected.every(t => user.includes(t));
        });
      } catch(e) { return false; }
    }

    if (type === "Matching" || type === "Drag & Drop" || type === "Categorization") {
      if (!userAnswer) return false;
      const parse = (str) => {
        if (!str) return [];
        return (typeof str === 'string' ? str : "").split("|").map(p => {
          const m = p.match(/^(.+?)(?:\s*[:\-\u2192]\s*)(.+)$/);
          return m ? `${m[1].trim().toLowerCase()}|${m[2].trim().toLowerCase()}` : null;
        }).filter(Boolean);
      };

      const correctSet = new Set(parse(correctVal || choices.join("|")));
      const userStr = Array.isArray(userAnswer) ? userAnswer.join("|") : userAnswer;
      const userSet = new Set(parse(userStr));

      if (correctSet.size === 0) return false;
      if (correctSet.size !== userSet.size) return false;
      for (const c of correctSet) {
        if (!userSet.has(c)) return false;
      }
      return true;
    }
    // Default single answer
    const ua = Array.isArray(userAnswer) ? userAnswer[0] : userAnswer;
    return correct.includes((ua || "").trim());
  }

  function getCorrectAnswer(q) {
    const keys = ["Correct Answer", "Correct Key", "Answer", "True Answer", "Solution Key"];
    for (let k of Object.keys(q)) {
      if (keys.some(v => v.toLowerCase() === k.toLowerCase())) return q[k];
    }
    return q["Correct Answer"] || "";
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
    let total = 0, maxTotal = 0, correct = 0, wrong = 0, skipped = 0;
    const categoryMap = {}, difficultyMap = {}, typeMap = {}, subCategoryMap = {};

    const details = quiz.questions.map((q, i) => {
      const ans = quiz.answers[i] || {};
      const ua = ans.userAnswer;
      const s = getQuestionScore(q, ua, cfg);
      const corr = isCorrect(q, ua);
      const maxQ = parseFloat(q.Score || 1);

      total += s;
      maxTotal += maxQ;
      if (ua === undefined || ua === null || ua === "" || (Array.isArray(ua) && ua.length === 0)) skipped++;
      else if (corr) correct++;
      else wrong++;

      const track = (map, key) => {
        if (!key) return;
        if (!map[key]) map[key] = { score: 0, total: 0, max: 0, correct: 0 };
        map[key].score += s;
        map[key].total++;
        map[key].max += maxQ;
        if (corr) map[key].correct++;
      };

      track(categoryMap, q.Category || "General");
      track(subCategoryMap, q["Sub Category"] || q.SubCategory);
      track(difficultyMap, q.Difficulty || "Medium");
      track(typeMap, q["Question Type"] || "Multichoice");

      return { score: s, isCorrect: corr, timeTaken: ans.timeTaken || 0 };
    });

    return {
      total: Math.max(0, total),
      maxTotal,
      accuracy: maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0,
      correct,
      wrong,
      skipped,
      timeTaken: details.reduce((acc, d) => acc + (d.timeTaken || 0), 0),
      categoryMap,
      subCategoryMap,
      difficultyMap,
      typeMap,
      details,
    };
  }

  return { isCorrect, getQuestionScore, calculateScore, getChoices, getInsight, getCorrectAnswer };
})();

// ============================================================
//  Page: Result
// ============================================================
const PageResult = (() => {
  let _activeTab = "overview";

  function getInsights(score, type) {
    const combined = [
      ...Object.entries(score.categoryMap || {}).map(([k, v]) => ({ name: k, ...v, group: 'Sub' })),
      ...Object.entries(score.subCategoryMap || {}).map(([k, v]) => ({ name: k, ...v, group: 'Tag' }))
    ];
    
    // If no questions were actually attempted (no correct/wrong), return empty or notice
    if (score.correct + score.wrong === 0) {
       if (type === "strengths") return [];
       return [{ name: "Insufficient Data", group: "System", acc: 0 }];
    }

    const items = combined.map(c => ({ name: c.name, group: c.group, acc: c.max ? (c.score/c.max)*100 : 0 }));
    if (type === "strengths") return items.filter(c => c.acc >= 75).slice(0, 5);
    return items.filter(c => c.acc < 50).slice(0, 5);
  }

  function getAchievements(score, qCount) {
    const badges = [];
    if (score.accuracy >= 90) badges.push({ text: "Precision Master", icon: "🎯", type: "success" });
    if (score.accuracy >= 100) badges.push({ text: "Immaculate", icon: "💎", type: "success" });
    if (qCount >= 5 && score.timeTaken / qCount < 12) badges.push({ text: "Speed Demon", icon: "⚡", type: "warn" });
    if (score.skipped === 0) badges.push({ text: "Completionist", icon: "✅", type: "info" });
    if (qCount >= 25) badges.push({ text: "Marathoner", icon: "🏃", type: "info" });
    return badges;
  }

  function renderHeatmap(score) {
    const details = score.details || [];
    if (!details.length) return "";
    const avg = score.timeTaken / details.length;
    
    const getColor = (t) => {
      if (t > avg * 2) return "background: #ef4444; color: #fff;";
      if (t > avg * 1.3) return "background: #f59e0b; color: #fff;";
      if (t > avg * 0.7) return "background: #3b82f6; color: #fff;";
      return "background: rgba(59, 130, 246, 0.1); color: var(--text-primary); border: 1px solid var(--border-color);";
    };

    return `
      <div class="card" style="padding:var(--sp-lg); margin-top:var(--sp-lg); border-radius:16px; border:1px solid var(--border-color); background:var(--bg-elevated)">
        <h3 class="chart-label" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size:0.9rem; letter-spacing:1px">
          <span>🕒 TIME-WARP HEATMAP</span>
          <span style="font-size:0.7rem; font-weight:500; opacity:0.6">Analysis of question-wise cognitive load</span>
        </h3>
        <div class="heatmap-container">
          ${details.map((d, i) => `
            <div class="heatmap-cell" style="${getColor(d.timeTaken)}" 
                 title="Q${i+1}: ${d.timeTaken}s | ${d.isCorrect ? 'Correct' : 'Incorrect'}">
              ${i+1}
            </div>
          `).join('')}
        </div>
        <div class="heatmap-legend">
           <span>⚡ Fast</span>
           <div class="heatmap-dot" style="background:rgba(59,130,246,0.1); border:1px solid var(--border-color)"></div>
           <div class="heatmap-dot" style="background:#3b82f6"></div>
           <div class="heatmap-dot" style="background:#f59e0b"></div>
           <div class="heatmap-dot" style="background:#ef4444"></div>
           <span>🛑 Complex</span>
        </div>
      </div>
    `;
  }

  function render(main, data) {
    const result = data || State.get("result");
    if (!result) {
      main.innerHTML = '<p class="text-muted">No result data.</p>';
      return;
    }
    const { quiz, score, endTime } = result;
    const cfg = quiz.config || {};

    if ((cfg["Final Result"] || "On") === "Off") {
       main.innerHTML = `
         <div class="animate-up setup-container" style="max-width:600px; margin:100px auto; text-align:center">
           <div style="font-size:4rem; margin-bottom:20px">✅</div>
           <h1 style="font-size:2rem; font-weight:900">Quiz Submitted Successfully</h1>
           <p style="color:var(--text-muted); margin-bottom:40px">Your attempt has been recorded. The session is now complete.</p>
           <button class="btn btn-primary btn-lg" onclick="UI.navigate('welcome')">Return Home</button>
         </div>`;
       return;
    }

    const qWise = (cfg["Question Wise Result"] || "On") === "On";

    main.innerHTML = `
           <div class="dash-hero">
           <div class="dash-hero-info">
              <span class="dash-badge">${
                quiz.config["Quiz Settings Title"] || "ASSESSMENT REPORT"
              }</span>
              <p class="dash-subtitle">${new Date(endTime).toLocaleDateString(
                undefined,
                { month: "long", day: "numeric" }
              )} • ${fmtTime(score.timeTaken)} elapsed</p>

              <div class="badge-shelf">
                ${getAchievements(score, quiz.questions.length).map(b => `
                  <div class="achievement-badge ${b.type}">
                    <span>${b.icon}</span>
                    <span>${b.text}</span>
                  </div>
                `).join('')}
                ${score.accuracy >= 70 ? '<div class="achievement-badge success">🌟 Top Tier Performance</div>' : ''}
              </div>
           </div>
           
           <div class="dash-hero-stats-new">
              <div class="hero-ring-container">
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

              <div class="hero-stats-grid">
                 <div class="hero-mini-card success">
                    <span class="mini-label">CORRECT</span>
                    <span class="mini-val">${score.correct}</span>
                 </div>
                 <div class="hero-mini-card error">
                    <span class="mini-label">INCORRECT</span>
                    <span class="mini-val">${score.wrong}</span>
                 </div>
                 <div class="hero-mini-card warn">
                    <span class="mini-label">SKIPPED</span>
                    <span class="mini-val">${score.skipped}</span>
                 </div>
                 <div class="hero-mini-card info">
                    <span class="mini-label">AVG / Q</span>
                    <span class="mini-val">${(
                      score.timeTaken / quiz.questions.length
                    ).toFixed(1)}s</span>
                 </div>
              </div>

              <div class="hero-totals-info">
                 <div class="total-item">
                    <span class="label">TOTAL SCORE</span>
                    <span class="val">${score.total.toFixed(
                      1
                    )}<span class="small"> / ${score.maxTotal}</span></span>
                 </div>
                 <div class="total-item">
                    <span class="label">PERFORMANCE PACE</span>
                    <span class="val">${
                      score.timeTaken > 0
                        ? (score.correct / (score.timeTaken / 60)).toFixed(1)
                        : 0
                    }<span class="small"> p/m</span></span>
                 </div>
              </div>
            </div>
        </div>

        <div class="dash-insights">
           <div class="insight-card strengths">
              <span class="insight-tag">✨ KEY STRENGTHS</span>
              <div class="insight-list">
                 ${getInsights(score, "strengths").map(s => `<div class="tag-pill"><strong>${s.group}:</strong> ${s.name} <span class="text-xs">(${Math.round(s.acc)}%)</span></div>`).join("") || '<span class="opacity-50">Continue Learning to surface Strengths</span>'}
              </div>
           </div>
           <div class="insight-card weaknesses">
              <span class="insight-tag">⚠️ GROWTH AREAS</span>
              <div class="insight-list">
                 ${getInsights(score, "weaknesses").map(w => `<div class="tag-pill"><strong>${w.group}:</strong> ${w.name} <span class="text-xs">(${Math.round(w.acc)}%)</span></div>`).join("") || '<span class="opacity-50">Excellent performance, no major weaknesses</span>'}
              </div>
           </div>
        </div>

        <!-- ── TABS NAVIGATION ── -->
        <div class="dash-nav-with-actions">
          <div class="dash-tabs" id="result-tabs">
             ${(() => {
                const allTabs = [
                  { id: "overview", label: "📊 Overview" },
                  { id: "questions", label: "📝 Review" },
                  { id: "category", label: "📁 Categories" },
                  { id: "difficulty", label: "⚡ Difficulty" },
                  { id: "answer-key", label: "🔑 Key" },
                  { id: "adaptive", label: "🧠 Adaptive" }
                ];
                return allTabs
                  .filter(t => qWise || (t.id !== "questions" && t.id !== "answer-key"))
                  .map(t => `
                    <button class="dash-tab-btn ${t.id === _activeTab ? "active" : ""}" onclick="PageResult.switchTab('${t.id}')">
                      ${t.label}
                    </button>
                  `).join("");
             })()}
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
      
      // Celebration!
      if (score.accuracy >= 80) UI.confetti();
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
        "adaptive"
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
      case "adaptive":
        body.innerHTML = renderAdaptive(result);
        setTimeout(() => initAdaptiveCharts(result), 50);
        break;
    }
  }

  function renderAdaptive(result) {
    return `
      <div class="dash-charts-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(600px, 1fr));gap:var(--sp-md);margin-bottom:var(--sp-lg)">
        <div class="chart-card"><h3 class="chart-label">Performance by Difficulty Tier</h3><div class="chart-box"><canvas id="chart-adaptive-difficulty"></canvas></div></div>
        <div class="chart-card"><h3 class="chart-label">Endurance & Cognitive Fatigue</h3><div class="chart-box"><canvas id="chart-adaptive-fatigue"></canvas></div></div>
        <div class="chart-card"><h3 class="chart-label">Pacing vs Precision Map</h3><div class="chart-box"><canvas id="chart-adaptive-pacing"></canvas></div></div>
        <div class="chart-card"><h3 class="chart-label">Domain Resource Allocation</h3><div class="chart-box"><canvas id="chart-adaptive-time-allocation"></canvas></div></div>
      </div>
      <div class="card" style="padding:var(--sp-lg); background:var(--bg-elevated); border-radius:16px; margin-bottom:var(--sp-lg); border:1px solid var(--border-color)">
        <h3 class="chart-label" style="font-size:1.1rem;margin-bottom:16px;">Diagnostic Intelligence (Current Session)</h3>
        <ul id="adaptive-next-steps" style="line-height:2.0; color:var(--text-secondary); font-weight:700; padding-left:20px;"></ul>
      </div>
    `;
  }

  function initAdaptiveCharts(result) {
    _activeCharts.forEach((c) => c.destroy());
    _activeCharts = [];
    if (typeof Chart === "undefined") return;

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
    Chart.defaults.color = isDark ? "#94a3b8" : "#64748b";
    
    const { score, quiz } = result;

    const createChart = (id, cfg) => {
      const el = document.getElementById(id);
      if (el) _activeCharts.push(new Chart(el, cfg));
    };

    const qCount = quiz.questions.length || 1;
    const items = score.details;

    // 1. Difficulty Tier Performance
    const diffKeys = Object.keys(score.difficultyMap);
    if (!diffKeys.includes("Easy") && !diffKeys.includes("Medium")) {
       diffKeys.push("General");
    }
    const diffData = diffKeys.map(k => {
       const m = score.difficultyMap[k] || { correct: score.correct, total: qCount };
       return (m.correct / (m.total || 1)) * 100;
    });

    createChart("chart-adaptive-difficulty", {
      type: "bar",
      data: {
        labels: diffKeys,
        datasets: [{
          label: "Accuracy %",
          data: diffData,
          backgroundColor: diffData.map(acc => acc > 75 ? "rgba(16, 185, 129, 0.7)" : acc > 50 ? "rgba(245, 158, 11, 0.7)" : "rgba(239, 68, 68, 0.7)"),
          borderRadius: 6
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: gridColor } }, y: { beginAtZero: true, max: 100, grid: { color: gridColor } } } }
    });

    // 2. Endurance & Cognitive Fatigue
    const usePhases = qCount >= 4;
    let fatigueLabels, fatigueData;
    if (usePhases) {
       fatigueLabels = ["Phase 1 (Start)", "Phase 2", "Phase 3", "Phase 4 (End)"];
       fatigueData = fatigueLabels.map((_, i) => {
          const start = Math.floor((i * qCount) / 4);
          const end = Math.floor(((i + 1) * qCount) / 4);
          const qs = items.slice(start, end);
          return qs.length ? (qs.filter(q => q.isCorrect).length / qs.length) * 100 : 0;
       });
    } else {
       fatigueLabels = items.map((_, i) => "Q" + (i + 1));
       fatigueData = items.map(q => q.isCorrect ? 100 : 0);
    }

    createChart("chart-adaptive-fatigue", {
      type: "line",
      data: {
        labels: fatigueLabels,
        datasets: [{
          label: "Accuracy Trajectory",
          data: fatigueData,
          borderColor: "#ec4899",
          backgroundColor: "rgba(236,72,153,0.1)",
          fill: true,
          tension: 0.3
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: gridColor } }, y: { beginAtZero: true, max: 100, grid: { color: gridColor } } } }
    });

    // 3. Pacing vs Precision Taget Map
    createChart("chart-adaptive-pacing", {
      type: "scatter",
      data: {
        datasets: [
          {
             label: "Correct Validation",
             data: items.filter(q => q.isCorrect).map(q => ({ x: q.timeTaken, y: q.score })),
             backgroundColor: "rgba(16, 185, 129, 0.7)",
             pointRadius: 6
          },
          {
             label: "Incorrect Validation",
             data: items.filter(q => !q.isCorrect).map(q => ({ x: q.timeTaken, y: q.score })),
             backgroundColor: "rgba(239, 68, 68, 0.7)",
             pointRadius: 6
          }
        ]
      },
      options: { 
        responsive: true, maintainAspectRatio: false,
        scales: { 
           x: { title: { display: true, text: 'Time Expended (Seconds)' }, grid: { color: gridColor }, beginAtZero: true },
           y: { title: { display: true, text: 'Points Earned' }, grid: { color: gridColor } }
        }
      }
    });

    // 4. Topic Resource Allocation
    const catKeys = Object.keys(score.categoryMap);
    const catTimes = catKeys.map(k => {
        const arr = items.filter((_,i) => (quiz.questions[i].Category || "General") === k);
        return arr.reduce((a,b) => a+b.timeTaken, 0);
    });

    createChart("chart-adaptive-time-allocation", {
      type: "doughnut",
      data: {
        labels: catKeys,
        datasets: [
          {
             label: "Total Seconds Allocated",
             data: catTimes,
             backgroundColor: ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444", "#14b8a6", "#f97316"],
             borderWidth: 0
          }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: "60%" }
    });
    
    // 5. Diagnostic Intelligence AI Text
    const stepsEl = document.getElementById("adaptive-next-steps");
    if (stepsEl) {
      const html = [];
      const weakDiff = diffKeys.find(k => {
         const m = score.difficultyMap[k];
         return m && m.total >= 1 && (m.correct / m.total) < 0.5;
      });
      if (weakDiff) {
         html.push(`Your accuracy on <b>${weakDiff}</b> questions dropped below 50%. Focus your practice on this specific difficulty magnitude.`);
      }

      if (score.timeTaken > 0) {
          if (usePhases && fatigueData[3] < fatigueData[0] - 20) {
             html.push(`You suffered a <b>${Math.round(fatigueData[0] - fatigueData[3])}%</b> accuracy drop towards the end of the session, indicating <b>test fatigue</b>. Simulate longer active exam conditions.`);
          }

          const avgTime = Math.max(score.timeTaken / qCount, 1);
          const rushedErrors = items.filter(i => !i.isCorrect && i.timeTaken < (avgTime * 0.4)).length;
          if (rushedErrors > 1) {
             html.push(`You incorrectly validated <b>${rushedErrors}</b> questions abnormally fast (<${Math.round(avgTime * 0.4)}s). Guard against skipping critical prompt subtext.`);
          }

          const maxCatTimeIdx = catTimes.indexOf(Math.max(...catTimes));
          if (maxCatTimeIdx >= 0 && score.timeTaken > 0) {
             html.push(`You invested a massive <b>${Math.round((catTimes[maxCatTimeIdx] / score.timeTaken) * 100)}%</b> of your total session time purely analyzing the <b>${catKeys[maxCatTimeIdx]}</b> domain.`);
          }
      }

      if (!html.length) html.push("Overall pacing and precision execution are steady. Ensure consistent interval reviews to maintain these strong diagnostics.");
      stepsEl.innerHTML = html.map(h => `<li>${h}</li>`).join("");
    }
  }

  // ── OVERVIEW TAB ──────────────────────────────────────────
  function renderOverview(result) {
    const { score } = result;
    const pace = score.timeTaken / (result.quiz.questions.length || 1);
    
    return `
      <div class="dash-metrics-grid">
        <div class="metric-card">
          <span class="m-label">Knowledge Accuracy</span>
          <div class="m-value text-success">${score.accuracy}%</div>
          <div class="m-sub">${score.correct} of ${result.quiz.questions.length} Correct</div>
        </div>
        <div class="metric-card">
          <span class="m-label">Average Pace</span>
          <div class="m-value text-accent">${pace.toFixed(1)}s</div>
          <div class="m-sub">Seconds per question</div>
        </div>
        <div class="metric-card">
          <span class="m-label">Points Earned</span>
          <div class="m-value">${score.total.toFixed(1)}</div>
          <div class="m-sub">Out of ${score.maxTotal} Max</div>
        </div>
        <div class="metric-card">
          <span class="m-label">Completion Status</span>
          <div class="m-value" style="color:var(--color-warn)">${Math.round(((score.correct + score.wrong)/result.quiz.questions.length)*100)}%</div>
          <div class="m-sub">${score.skipped} questions skipped</div>
        </div>
      </div>

      <div class="dash-charts-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(600px, 1fr));gap:var(--sp-md);margin-bottom:var(--sp-lg)">
        <div class="chart-card"><h3 class="chart-label">Success Profile</h3><div class="chart-box"><canvas id="chart-answers"></canvas></div></div>
        <div class="chart-card"><h3 class="chart-label">Topic Mastery</h3><div class="chart-box"><canvas id="chart-categories"></canvas></div></div>
        <div class="chart-card"><h3 class="chart-label">Weakest Knowledge Areas</h3><div class="chart-box"><canvas id="chart-weak-cats"></canvas></div></div>
        <div class="chart-card"><h3 class="chart-label">Critical Sub-Skill Gaps</h3><div class="chart-box"><canvas id="chart-weak-tags"></canvas></div></div>
        <div class="chart-card"><h3 class="chart-label">Difficulty Mastery</h3><div class="chart-box"><canvas id="chart-difficulties"></canvas></div></div>
        <div class="chart-card"><h3 class="chart-label">Time Drain Analysis (Top 8)</h3><div class="chart-box"><canvas id="chart-time-sinks"></canvas></div></div>
        <div class="chart-card"><h3 class="chart-label">Cumulative Time Consumption</h3><div class="chart-box"><canvas id="chart-total-time"></canvas></div></div>
        <div class="chart-card"><h3 class="chart-label">Skill Balance Radar</h3><div class="chart-box"><canvas id="chart-tags"></canvas></div></div>
        <div class="chart-card"><h3 class="chart-label">Time Intensity per Category</h3><div class="chart-box"><canvas id="chart-cat-time"></canvas></div></div>
        <div class="chart-card"><h3 class="chart-label">Question-wise Time Audit</h3><div class="chart-box"><canvas id="chart-q-time"></canvas></div></div>
        <div class="chart-card"><h3 class="chart-label">Accuracy by Engagement Type</h3><div class="chart-box"><canvas id="chart-q-types"></canvas></div></div>
      </div>
      
      ${renderHeatmap(score)}
    `;
  }

  let _activeCharts = [];

  function initOverviewCharts(result) {
    _activeCharts.forEach((c) => c.destroy());
    _activeCharts = [];
    if (typeof Chart === "undefined") return;

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    Chart.defaults.color = isDark ? "#94a3b8" : "#64748b";
    Chart.defaults.font.family = '"Inter", sans-serif';
    const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
    const { score, quiz } = result;

    const createChart = (id, cfg) => {
      const el = document.getElementById(id);
      if (el) _activeCharts.push(new Chart(el, cfg));
    };

    // 1. Answers Doughnut
    createChart("chart-answers", {
      type: "doughnut",
      data: {
        labels: ["Correct", "Wrong", "Skipped"],
        datasets: [{ data: [score.correct, score.wrong, score.skipped], backgroundColor: ["#10b981", "#ef4444", "#f59e0b"], borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: "75%", plugins: { legend: { position: 'bottom' } } }
    });

    // 2. Categories (Mastery)
    const catLabels = Object.keys(score.categoryMap);
    createChart("chart-categories", {
      type: "bar",
      data: {
        labels: catLabels,
        datasets: [{ 
          label: "Accuracy %", 
          data: catLabels.map(l => Math.round((score.categoryMap[l].correct / score.categoryMap[l].total) * 100)), 
          backgroundColor: isDark ? "rgba(59, 130, 246, 0.7)" : "#3b82f6",
          borderRadius: 6
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        plugins: { legend: { display: false } },
        scales: { 
          x: { grid: { display: false } },
          y: { beginAtZero: true, max: 100, grid: { color: gridColor }, ticks: { callback: v => v + '%' } } 
        } 
      }
    });

    // 3. Difficulty Mastery
    const diffKeys = ["Easy", "Medium", "Hard"];
    createChart("chart-difficulties", {
      type: "bar",
      data: {
        labels: diffKeys,
        datasets: [{ 
          data: diffKeys.map(k => {
            const d = score.difficultyMap[k] || score.difficultyMap[k.toLowerCase()] || { correct: 0, total: 0 };
            return d.total ? Math.round((d.correct/d.total)*100) : 0;
          }), 
          backgroundColor: ["rgba(16, 185, 129, 0.7)", "rgba(245, 158, 11, 0.7)", "rgba(239, 68, 68, 0.7)"], 
          borderRadius: 6 
        }]
      },
      options: { 
        indexAxis: 'y', 
        responsive: true, 
        maintainAspectRatio: false, 
        plugins: { legend: { display:false } },
        scales: { x: { beginAtZero: true, max: 100, grid: { color: gridColor }, ticks: { callback: v => v + '%' } }, y: { grid: { display : false } } }
      }
    });

    // 5. Skill Balance (Radar)
    const tagLabels = Object.keys(score.subCategoryMap).slice(0, 12);
    createChart("chart-tags", {
      type: "radar",
      data: {
        labels: tagLabels,
        datasets: [{ 
          label: "Mastery Level",
          data: tagLabels.map(l => Math.round((score.subCategoryMap[l].correct/score.subCategoryMap[l].total)*100)), 
          borderColor: "#8b5cf6", 
          backgroundColor: "rgba(139, 92, 246, 0.2)",
          pointBackgroundColor: "#8b5cf6",
          borderWidth: 2
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false, 
        scales: { r: { grid: { color: gridColor }, angleLines: { color: gridColor }, beginAtZero: true, max: 100, ticks: { display: false } } },
        plugins: { legend: { display: false } }
      }
    });

    // 6. Time Intensity per Category
    const catKeys = Object.keys(score.categoryMap);
    createChart("chart-cat-time", {
      type: "bar",
      data: {
        labels: catKeys,
        datasets: [{
          label: "Avg Time (s)",
          data: catKeys.map(k => {
            const items = score.details.filter((_, i) => (quiz.questions[i].Category || "General") === k);
            return items.length ? Math.round(items.reduce((a,b) => a + b.timeTaken, 0) / items.length) : 0;
          }),
          backgroundColor: "rgba(59, 130, 246, 0.6)",
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, grid: { color: gridColor } }, y: { grid: { display: false } } }
      }
    });

    // 7. Weakest Categories
    const weakCats = Object.entries(score.categoryMap)
      .map(([name, d]) => ({ 
        name, 
        acc: Math.round((d.correct / d.total) * 100) 
      }))
      .sort((a,b) => a.acc - b.acc)
      .slice(0, 5);

    createChart("chart-weak-cats", {
      type: "bar",
      data: {
        labels: weakCats.map(c => c.name),
        datasets: [{
          label: "Accuracy %",
          data: weakCats.map(c => c.acc),
          backgroundColor: "rgba(239, 68, 68, 0.7)",
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, max: 100, grid: { color: gridColor } }, y: { grid: { display: false } } }
      }
    });

    // 8. Weakest Sub-Skills (Tags)
    const weakTags = Object.entries(score.subCategoryMap)
      .map(([name, d]) => ({ 
        name, 
        acc: Math.round((d.correct / d.total) * 100) 
      }))
      .sort((a,b) => a.acc - b.acc)
      .slice(0, 8);

    createChart("chart-weak-tags", {
      type: "bar",
      data: {
        labels: weakTags.map(c => c.name),
        datasets: [{
          label: "Accuracy %",
          data: weakTags.map(c => c.acc),
          backgroundColor: "rgba(245, 158, 11, 0.7)",
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, max: 100, grid: { color: gridColor } }, y: { grid: { display: false } } }
      }
    });

    // 9. Time Drain Analysis (Time Sinks)
    const timeSinks = score.details
      .map((d, i) => ({ id: `Q${i+1}`, time: d.timeTaken, corr: d.isCorrect }))
      .sort((a,b) => b.time - a.time)
      .slice(0, 8);

    createChart("chart-time-sinks", {
      type: "bar",
      data: {
        labels: timeSinks.map(t => t.id),
        datasets: [{
          label: "Time Spent (s)",
          data: timeSinks.map(t => t.time),
          backgroundColor: timeSinks.map(t => t.corr ? "rgba(59, 130, 246, 0.6)" : "rgba(239, 68, 68, 0.6)"),
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => `${ctx.raw} seconds` } }
        },
        scales: { y: { beginAtZero: true, grid: { color: gridColor } }, x: { grid: { display: false } } }
      }
    });

    // 10. Question-wise Time (Audit)
    createChart("chart-q-time", {
      type: "bar",
      data: {
        labels: quiz.questions.map((_, i) => "Q" + (i + 1)),
        datasets: [{
          label: "Time Taken (s)",
          data: score.details.map(d => d.timeTaken),
          backgroundColor: score.details.map(d => d.isCorrect ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"),
          borderColor: score.details.map(d => d.isCorrect ? "#10b981" : "#ef4444"),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { 
          x: { grid: { display: false }, ticks: { font: { size: 9 } } },
          y: { beginAtZero: true, grid: { color: gridColor }, title: { display: true, text: 'Seconds' } }
        }
      }
    });

    // 11. Accuracy by Question Type
    const typeLabels = Object.keys(score.typeMap);
    createChart("chart-q-types", {
      type: "bar",
      data: {
        labels: typeLabels,
        datasets: [{
          label: "Accuracy %",
          data: typeLabels.map(l => Math.round((score.typeMap[l].correct/score.typeMap[l].total)*100)),
          backgroundColor: "#8b5cf6",
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, max: 100, grid: { color: gridColor }, ticks: { callback: v => v + '%' } },
          y: { grid: { display: false } }
        }
      }
    });

    // 12. Cumulative Time Consumption
    let totalTimeRun = 0;
    createChart("chart-total-time", {
      type: "line",
      data: {
        labels: quiz.questions.map((_, i) => "Q" + (i + 1)),
        datasets: [{
          label: "Total Seconds",
          data: score.details.map(d => {
            totalTimeRun += d.timeTaken;
            return totalTimeRun;
          }),
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, 0.1)",
          fill: true,
          tension: 0.1,
          pointRadius: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { 
          x: { grid: { display: false } }, 
          y: { beginAtZero: true, grid: { color: gridColor }, title: { display: true, text: 'Total Seconds' } } 
        }
      }
    });
  }

  // ── CATEGORY TAB ─────────────────────────────────────────
  function renderCategory(result) {
    const cats = result.score.categoryMap;
    return `
      <div class="animate-up">
        <div class="dash-metrics-grid">
            ${Object.entries(cats).map(([cat, d]) => {
                const pct = d.max ? Math.round((d.score / d.max) * 100) : 0;
                const state = pct > 80 ? 'success' : pct > 50 ? 'warn' : 'err';
                return `
                <div class="report-stat-card" style="padding:20px; border-radius:16px; border-left:4px solid var(--color-${state})">
                   <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:12px">
                      <div>
                         <div class="text-xs font-bold text-muted uppercase tracking-widest" style="margin-bottom:4px">Domain</div>
                         <div style="font-size:1.1rem; font-weight:800; color:var(--text-primary)">${cat}</div>
                      </div>
                      <div style="font-size:1.4rem; font-weight:900; color:var(--color-${state})">${pct}%</div>
                   </div>
                   <div class="progress-bar" style="height:6px; background:var(--border-color); margin-bottom:12px">
                      <div class="progress-fill" style="width:${pct}%; background:var(--color-${state})"></div>
                   </div>
                   <div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:700">
                      <span class="text-muted">${d.correct} / ${d.total} Items</span>
                      <span style="color:var(--color-${state})">${d.score.toFixed(1)} Pts</span>
                   </div>
                </div>`;
            }).join("")}
        </div>
      </div>`;
  }

  // ── DIFFICULTY TAB ────────────────────────────────────────
  function renderDifficulty(result) {
    const diffs = result.score.difficultyMap;
    const colors = {
      easy: "#10b981",
      medium: "#f59e0b",
      hard: "#ef4444",
      unknown: "var(--text-muted)",
    };
    return `
      <div class="animate-up" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:20px">
        ${Object.entries(diffs).map(([d, v]) => {
          const col = colors[d.toLowerCase()] || colors.unknown;
          const pct = v.total ? Math.round((v.correct / v.total) * 100) : 0;
          return `
          <div class="report-stat-card" style="position:relative; overflow:hidden">
             <div style="position:absolute; top:0; left:0; width:100%; height:4px; background:${col}"></div>
             <div class="report-stat-num" style="color:${col}; font-size:2.5rem">${pct}%</div>
             <div class="report-stat-label" style="text-transform:capitalize; letter-spacing:0.1em">${d} Proficiency</div>
             <div class="progress-bar" style="height:4px; margin:16px 0; background:rgba(var(--text-primary-rgb), 0.05)">
                <div class="progress-fill" style="width:${pct}%; background:${col}"></div>
             </div>
             <div class="text-xs font-bold text-muted">${v.correct} of ${v.total} Questions Resolved</div>
          </div>`;
        }).join("")}
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
            ${Object.entries(result.score.typeMap).map(([t, v]) => `
              <tr>
                <td>${t}</td>
                <td><span class="badge badge-success">${v.correct}</span></td>
                <td>${v.total}</td>
                <td>${v.total ? Math.round((v.correct / v.total) * 100) : 0}%</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  }

  function renderQuestions(result) {
    const { quiz } = result;
    return `
      <div class="dash-questions-report">
        <div class="report-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--sp-md);margin-bottom:var(--sp-lg)">
           <div>
              <h2 style="font-size:1.6rem;font-weight:900;letter-spacing:-0.02em;margin:0">Performance Detail</h2>
              <p class="text-xs text-muted">Deep-dive into individual responses and explanations</p>
           </div>
           <div class="review-controls" style="display:flex;gap:var(--sp-sm);flex:1;max-width:500px">
              <div class="review-input-group" style="flex:1">
                 <input type="text" id="review-search" class="form-control" placeholder="Search questions..." oninput="PageResult.applyReviewFilters()">
              </div>
              <select id="review-filter" class="form-control" style="width:160px" onchange="PageResult.applyReviewFilters()">
                 <option value="all">🔍 Show All</option>
                 <option value="correct">✅ Correct</option>
                 <option value="wrong">❌ Incorrect</option>
                 <option value="skipped">⏭ Skipped</option>
              </select>
           </div>
        </div>
        <div class="questions-list" id="review-list">
          ${quiz.questions
            .map((q, i) => {
              const ans = quiz.answers[i] || {};
              const corr = Results.isCorrect(q, ans.userAnswer);
              const type = (q["Question Type"] || "").trim();
              const isSkipped = (ans.userAnswer === undefined || ans.userAnswer === "" || (Array.isArray(ans.userAnswer) && ans.userAnswer.length === 0));
              const timeClass = ans.timeTaken > 30 ? "slow" : ans.timeTaken < 10 ? "fast" : "avg";
              try {
                const status = isSkipped ? "skipped" : (corr ? "correct" : "wrong");
                const insight = Results.getInsight(q);

                return `
                <div class="report-q-card ${status}" data-status="${status}" data-text="${q.Question.toLowerCase()}">
                  <div class="q-status-side">
                     <div class="q-status-badge">${status.toUpperCase()}</div>
                     <div class="q-time-badge ${timeClass}">${ans.timeTaken || 0}s</div>
                  </div>
                  <div class="q-main-content">
                      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:20px; margin-bottom:12px">
                         <p class="q-text" style="font-size:1.1rem; font-weight:700; flex:1"><strong>Q${i + 1}.</strong> <div>${q.Question}</div></p>
                         <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px; flex-shrink:0">
                            <div class="q-meta" style="margin:0; font-size:0.65rem; color:var(--text-muted); font-weight:800; letter-spacing:0.04em">${q.Category || "General"} • ${(q.Difficulty || "Medium").toUpperCase()} • ${type.toUpperCase()}</div>
                            <button class="btn btn-ghost btn-sm" onclick="UI.speak('${q.Question.replace(/'/g, "\\'")}')" title="Read Question" style="padding:4px 10px; border-radius:12px; height:28px; display:flex; align-items:center; gap:6px; background:var(--bg-elevated); border:1px solid var(--border-color); font-size:0.7rem; font-weight:700">
                               <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M11 5L6 9H2V15H6L11 19V5Z"/><path d="M15.54 8.46C16.47 9.4 17 10.63 17 12s-.53 2.6-1.46 3.54M19 5a10 10 0 010 14"/></svg>
                               LISTEN
                            </button>
                         </div>
                      </div>
                      <div class="q-ans-details">${renderQuestionTypeReview(q, ans.userAnswer, corr)}</div>
                      ${insight ? `
                      <div class="q-explanation" style="margin-top:16px; padding:16px; background:rgba(var(--accent-primary-rgb),0.05); border-radius:4px; border-left:2px solid var(--accent-primary)">
                         <p class="label" style="font-size:0.65rem; font-weight:800; color:var(--accent-primary); margin-bottom:4px">LEARNING INSIGHT</p>
                         <p class="text" style="font-size:0.9rem; line-height:1.5">${insight}</p>
                      </div>` : ""}
                  </div>
                </div>`;
              } catch (err) {
                console.error("Render fail:", err);
                return `<div class="report-q-card error">
                  <div class="q-status-side"><div class="q-status-badge">ERROR</div></div>
                  <div class="q-main-content">
                    <p class="q-text"><strong>Q${i+1}.</strong> Unable to render this question component due to content syntax errors.</p>
                  </div>
                </div>`;
              }
            })
            .join("")}
        </div>
      </div>`;
  }

  function renderAnswerKey(result) {
    const { quiz } = result;
    return `
      <div class="dash-report-card">
        <div style="margin-bottom:24px">
           <h2 style="font-size:1.6rem; font-weight:900; margin:0">Quick Answer Reference</h2>
           <p class="text-xs text-muted">A high-density map of your responses vs the baseline</p>
        </div>
        <div style="border:1px solid var(--border-color); border-radius:12px; overflow:hidden">
          <div class="answer-row" style="background:var(--bg-elevated); font-weight:800; border-bottom:2px solid var(--border-color); color:var(--text-muted); text-transform:uppercase; font-size:0.65rem; letter-spacing:0.05em">
            <div class="q-num">ID</div>
            <div>Question Trace</div>
            <div>Your Status</div>
            <div>Target / Key</div>
            <div style="text-align:right">Latency</div>
          </div>
          ${quiz.questions.map((q, i) => {
            const ans = quiz.answers[i] || {};
            const corr = Results.isCorrect(q, ans.userAnswer);
            const isSkipped = (ans.userAnswer === undefined || ans.userAnswer === "" || (Array.isArray(ans.userAnswer) && ans.userAnswer.length === 0));
            const status = isSkipped ? "Skipped" : (corr ? "Correct" : "Wrong");
            const statusColor = isSkipped ? "var(--text-muted)" : (corr ? "var(--color-success)" : "var(--color-error)");
            
            return `
              <div class="answer-row">
                <div class="q-num">${i + 1}</div>
                <div class="text-xs" style="font-weight:600; color:var(--text-primary)">
                  ${q.Question.substring(0, 100)}${q.Question.length > 100 ? '...' : ''}
                </div>
                <div style="color:${statusColor}; font-weight:800; font-size:0.75rem">
                  ${status.toUpperCase()}
                </div>
                <div class="font-mono text-xs" style="color:var(--accent-primary); font-weight:700">
                  ${Results.getCorrectAnswer(q)}
                </div>
                <div class="font-mono text-xs" style="text-align:right; font-weight:700">${ans.timeTaken || 0}s</div>
              </div>`;
          }).join("")}
        </div>
      </div>`;
  }

  function applyReviewFilters() {
    const search = (document.getElementById('review-search')?.value || "").toLowerCase();
    const filter = document.getElementById('review-filter')?.value || "all";
    const cards = document.querySelectorAll('.report-q-card');

    let matchCount = 0;
    cards.forEach(card => {
       const text = (card.getAttribute('data-text') || "").toLowerCase();
       const status = card.getAttribute('data-status') || "all";
       
       let matchSearch = text.includes(search);
       let matchFilter = filter === "all" || status === filter;

       const visible = matchSearch && matchFilter;
       card.style.display = visible ? "block" : "none";
       if (visible) matchCount++;
    });

    const countEl = document.getElementById("review-match-count");
    if (countEl) {
       countEl.innerText = `${matchCount} matching questions found`;
       countEl.style.opacity = search ? "1" : "0.5";
    }
  }

  function renderQuestionTypeReview(q, ua, isCorrect) {
    const type = (q["Question Type"] || "").trim().toLowerCase();
    const correctVal = Results.getCorrectAnswer(q);
    const correct = (correctVal || "").split("|").map(s => s.trim());
    const choices = Results.getChoices(q);

    // Robust relation parser
    const parseRelation = (str) => {
        if (!str) return [];
        return str.split("|").map(p => {
            const match = p.match(/^(.+?)(?:\s*[:\-\u2192]\s*)(.+)$/);
            return match ? { l: match[1].trim(), r: match[2].trim() } : null;
        }).filter(Boolean);
    };

    if (type.includes("choice") || type.includes("select") || type.includes("true/false")) {
      const activeChoices = choices.length > 0 ? choices : (type.includes("true/false") ? ["True", "False"] : []);
      const userAnswers = Array.isArray(ua) ? ua.map(String) : (ua || "").split(", ").map(s => s.trim()).filter(Boolean);
      return `<div class="review-choice-list">${activeChoices.map(c => {
        const isUser = userAnswers.includes(String(c).trim());
        const isCorr = correct.includes(String(c).trim());
        let state = "";
        if (isUser && isCorr) state = "match-ok";
        else if (isUser && !isCorr) state = "match-err";
        else if (!isUser && isCorr) state = "match-missed";
        return `<div class="review-choice-item ${state}">
           <div class="choice-icon">${isUser ? (isCorr ? '✓' : '✕') : (isCorr ? '•' : '○')}</div>
           <div class="choice-text">${c}</div>
           ${state === "match-ok" ? '<span class="state-label">Correct Pick</span>' : ''}
           ${state === "match-err" ? '<span class="state-label">Your Mistake</span>' : ''}
           ${state === "match-missed" ? '<span class="state-label">The Right Answer</span>' : ''}
        </div>`;
      }).join("")}</div>`;
    }

    if (type.includes("sequence")) {
       const userSeq = Array.isArray(ua) ? ua : (ua || "").split("|").map(s => s.trim());
       const rSeq = (seq, isT) => seq.map((s, idx) => `
         <div style="font-size:0.85rem; padding:6px 10px; background:var(--bg-base); border-radius:6px; display:flex; gap:10px; border:1px solid ${!isT && s !== (correct[idx] || '').trim() ? 'var(--color-error)' : 'var(--border-color)'}">
            <span style="opacity:0.5; font-weight:800">${idx+1}</span>
            <span>${s}</span>
            ${!isT ? `<span style="margin-left:auto">${s === (correct[idx] || '').trim() ? '✓' : '✕'}</span>` : ''}
         </div>`).join("");
       return `<div class="q-ans-compare">
            <div class="ans-box user"><span class="label">YOUR ORDER</span><div style="display:flex; flex-direction:column; gap:4px; margin-top:8px">${rSeq(userSeq, false)}</div></div>
            <div class="ans-box target"><span class="label">CORRECT ORDER</span><div style="display:flex; flex-direction:column; gap:4px; margin-top:8px">${rSeq(correct, true)}</div></div>
       </div>`;
    }

    if (type.includes("match") || type.includes("drag & drop") || type.includes("categorization")) {
        const isDD = type.includes("drag") || type.includes("categorization");
        const userStr = Array.isArray(ua) ? ua.join("|") : (ua || "");
        const userParts = parseRelation(userStr).sort((a,b) => a.l.localeCompare(b.l));
        
        let targetParts = parseRelation(correctVal);
        if (targetParts.length === 0) targetParts = parseRelation(choices.join("|"));
        targetParts.sort((a,b) => a.l.localeCompare(b.l));

        const rList = (pts) => {
            if (pts.length === 0) return `<div style="opacity:0.5; font-style:italic; padding:12px; text-align:center">No documentation found</div>`;
            return `<div class="review-pairs">${pts.map(p => `
            <div class="review-pair-item"><span>${p.l}</span> <span style="font-size:0.7rem; font-weight:800; opacity:0.6">${isDD ? 'IN' : '→'}</span> <span>${p.r}</span></div>`).join("")}</div>`;
        };
        return `<div class="q-ans-compare">
            <div class="ans-box user"><span class="label">YOUR ${isDD ? 'PLACEMENT' : 'MATCHES'}</span>${rList(userParts)}</div>
            <div class="ans-box target"><span class="label">EXPECTED ${isDD ? 'PLACEMENT' : 'PAIRS'}</span>${rList(targetParts)}</div>
        </div>`;
    }

    if (type.includes("multi matching")) {
        let uaM = {}; 
        try { 
            uaM = typeof ua === 'string' ? JSON.parse(ua) : (ua || {}); 
        } catch(e){
            parseRelation(ua || "").forEach(p => { if(!uaM[p.l]) uaM[p.l]=[]; uaM[p.l].push(p.r); });
        }

        const rM = (m) => {
           const entries = Object.entries(m);
           if (entries.length === 0) return `<div style="opacity:0.5; font-style:italic; padding:12px; text-align:center">No selections made</div>`;
           return `<div class="review-pairs">${entries.map(([k, v]) => `
             <div class="review-pair-item"><strong>${k}</strong> <span>${Array.isArray(v) ? v.join(", ") : v}</span></div>`).join("")}</div>`;
        };

        let tM = {}; 
        let targetParts = parseRelation(correctVal);
        if (targetParts.length === 0) targetParts = parseRelation(choices.join("|"));
        targetParts.forEach(p => { if(!tM[p.l]) tM[p.l]=[]; tM[p.l].push(p.r); });

        return `<div class="q-ans-compare">
            <div class="ans-box user"><span class="label">YOUR SELECTIONS</span>${rM(uaM)}</div>
            <div class="ans-box target"><span class="label">EXPECTED MAPPING</span>${rM(tM)}</div>
        </div>`;
    }

    return `
      <div class="q-ans-compare">
         <div class="ans-box user"><span class="label">YOUR ANSWER</span><span class="val">${Array.isArray(ua) ? ua.join(" | ") : (ua || "—")}</span></div>
         <div class="ans-box target"><span class="label">CORRECT KEY</span><span class="val" style="color:var(--color-success)">${correct.join(" | ")}</span></div>
      </div>
    `;
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
                  const pts = c.split(/[:\-]/);
                  return `${pts[0]}: ${pts[1] ? pts[1].replace(/\|/g, ", ") : ""}`;
                }
                return c;
              })
              .join(" | ")
          : Results.getCorrectAnswer(q)
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
    link.setAttribute("download", `PrepExecuter_Report_${new Date().getTime()}.csv`);
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
    const items = score.details;
    const qCount = quiz.questions.length || 1;

    // Formal Table Analytics
    const diffKeys = Object.keys(diffs);
    if (!diffKeys.length) diffKeys.push("General");
    const diffTableHtml = diffKeys.map(k => {
       const m = diffs[k] || { correct: score.correct, total: qCount };
       const pct = Math.round((m.correct / (m.total || 1)) * 100);
       return `<tr><td style="padding:8px; border-bottom:1px solid #e2e8f0; font-size:12px">${k}</td>
                   <td style="padding:8px; border-bottom:1px solid #e2e8f0; text-align:center; font-size:12px">${m.correct} / ${m.total}</td>
                   <td style="padding:8px; border-bottom:1px solid #e2e8f0; text-align:right; font-size:12px; font-weight:bold">${pct}%</td></tr>`;
    }).join("");

    const usePhases = qCount >= 4;
    let fatigueHtml = "";
    if (usePhases) {
       fatigueHtml = [0,1,2,3].map(i => {
          const start = Math.floor((i * qCount) / 4);
          const end = Math.floor(((i + 1) * qCount) / 4);
          const qs = items.slice(start, end);
          const pct = qs.length ? Math.round((qs.filter(q => q.isCorrect).length / qs.length) * 100) : 0;
          return `<tr><td style="padding:8px; border-bottom:1px solid #e2e8f0; font-size:12px">Phase ${i+1}</td>
                      <td style="padding:8px; border-bottom:1px solid #e2e8f0; text-align:right; font-size:12px; font-weight:bold">${pct}%</td></tr>`;
       }).join("");
    } else {
       fatigueHtml = `<tr><td colspan="2" style="padding:8px; font-size:12px; color:#64748b">Test too short for phase analysis.</td></tr>`;
    }

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
                    <h1 style="font-size: 28px; font-weight: 800; letter-spacing: -0.5px; margin: 0;">Official Assessment Transcript</h1>
                    <div style="font-size: 14px; color: #64748b; font-weight: 600;">Secure Assessment Engine Diagnostics</div>
                </div>
            </div>
            <div style="text-align: right">
                <div style="font-size: 14px; font-weight: 800;">${
                  quiz.config["Quiz Settings Title"] || "Assessment Report"
                }</div>
                <div style="font-size: 12px; color: #64748b; margin-top: 4px;">UID: ${endTime.slice(0,10)}</div>
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

        <div style="background: #0f172a; color: #fff; border-radius: 12px; padding: 24px; display: flex; justify-content: space-between; gap: 20px; margin-bottom: 40px; align-items: center;">
            <div style="border-right: 1px solid rgba(255,255,255,0.1); padding-right: 20px">
                <div style="font-size: 44px; font-weight: 800; line-height: 1;">${score.accuracy}%</div>
                <div style="font-size: 12px; font-weight: 600; opacity: 0.7; margin-top: 4px;">SYSTEM ACCURACY</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 18px; font-weight: 700; margin-bottom: 2px;">${score.total.toFixed(1)} / ${score.maxTotal}</div>
                <div style="font-size: 10px; font-weight: 600; opacity: 0.6; text-transform: uppercase;">RAW SCORE</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 18px; font-weight: 700; margin-bottom: 2px;">${fmtTime(score.timeTaken)}</div>
                <div style="font-size: 10px; font-weight: 600; opacity: 0.6; text-transform: uppercase;">ELAPSED TIME</div>
            </div>
            <div style="text-align: center;">
                <div style="font-size: 18px; font-weight: 700; margin-bottom: 2px;">${score.correct} / ${quiz.questions.length}</div>
                <div style="font-size: 10px; font-weight: 600; opacity: 0.6; text-transform: uppercase;">VALID RESULTS</div>
            </div>
        </div>

        <h3 style="font-size: 16px; font-weight: 800; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Adaptive Intelligence Analytics</h3>
        <div style="display: flex; gap: 20px; margin-bottom: 40px; page-break-inside: avoid;">
            <div style="flex:1">
               <div style="font-size:12px; font-weight:700; background:#f8fafc; padding:8px; border-radius:4px; margin-bottom:8px; border:1px solid #e2e8f0;">Difficulty Distribution</div>
               <table style="width:100%; border-collapse: collapse;">
                  <thead><tr><th style="text-align:left; font-size:10px; color:#64748b; padding-bottom:4px; border-bottom:2px solid #e2e8f0;">TIER</th><th style="text-align:center; font-size:10px; color:#64748b; padding-bottom:4px; border-bottom:2px solid #e2e8f0;">RATIO</th><th style="text-align:right; font-size:10px; color:#64748b; padding-bottom:4px; border-bottom:2px solid #e2e8f0;">ACCURACY</th></tr></thead>
                  <tbody>${diffTableHtml}</tbody>
               </table>
            </div>
            <div style="flex:1">
               <div style="font-size:12px; font-weight:700; background:#f8fafc; padding:8px; border-radius:4px; margin-bottom:8px; border:1px solid #e2e8f0;">Endurance & Cognitive Fatigue</div>
               <table style="width:100%; border-collapse: collapse;">
                  <thead><tr><th style="text-align:left; font-size:10px; color:#64748b; padding-bottom:4px; border-bottom:2px solid #e2e8f0;">QUARTER</th><th style="text-align:right; font-size:10px; color:#64748b; padding-bottom:4px; border-bottom:2px solid #e2e8f0;">ACCURACY</th></tr></thead>
                  <tbody>${fatigueHtml}</tbody>
               </table>
            </div>
        </div>

        <h3 style="font-size: 16px; font-weight: 800; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Comprehensive Domain Performance</h3>
        <div style="margin-bottom: 40px; page-break-inside: avoid;">
            ${Object.entries(cats)
              .map(([cat, d]) => {
                const pct = d.max ? Math.round((d.score / d.max) * 100) : 0;
                return `
                <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 12px;">
                    <div style="width: 180px; font-size: 13px; font-weight: 700;">${cat}</div>
                    <div style="flex: 1; height: 10px; background: #f8fafc; border-radius: 4px; overflow: hidden; border: 1px solid #e2e8f0;">
                        <div style="height: 100%; background: #0f172a; width: ${pct}%"></div>
                    </div>
                    <div style="width: 40px; text-align: right; font-size: 12px; font-weight: 800;">${pct}%</div>
                </div>`;
              })
              .join("")}
        </div>

         <h3 style="font-size: 16px; font-weight: 800; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; page-break-before: always; padding-top: 15mm;">Official Itemized Data Transcript</h3>
         <table style="width:100%; border-collapse: collapse; font-size: 11px; page-break-inside: auto;">
           <thead>
              <tr style="background: #0f172a; color: #fff;">
                <th style="padding: 12px 10px; text-align: left; border-top-left-radius:8px;">#</th>
                <th style="padding: 12px 10px; text-align: left; width:35%;">Prompt/Question Details</th>
                <th style="padding: 12px 10px; text-align: left;">Options / Targets</th>
                <th style="padding: 12px 10px; text-align: left;">Domain</th>
                <th style="padding: 12px 10px; text-align: center;">Pacing</th>
                <th style="padding: 12px 10px; text-align: left;">Input</th>
                <th style="padding: 12px 10px; text-align: center; border-top-right-radius:8px;">Status</th>
              </tr>
           </thead>
           <tbody>
              ${quiz.questions.map((q, i) => {
                  const ans = quiz.answers[i] || {};
                  const corr = Results.isCorrect(q, ans.userAnswer);
                  const time = (ans.timeTaken || 0);
                  const type = (q["Question Type"] || "").trim().toLowerCase();
                  const choices = Results.getChoices(q);
                  const correctVal = Results.getCorrectAnswer(q);

                  let optsHtml = "";
                  if (type.includes("choice") || type.includes("select")) {
                     optsHtml = choices.map(c => `• ${c}`).join("<br>");
                  } else if (type.includes("match") || type.includes("drag")) {
                     optsHtml = choices.map(c => `• ${c.replace(/\|/g, " / ")}`).join("<br>");
                  } else {
                     optsHtml = "N/A (Open-ended)";
                  }

                  let uaStr = Array.isArray(ans.userAnswer) ? ans.userAnswer.join(", ") : (ans.userAnswer || "—");

                  return `
                    <tr style="border-bottom: 1px solid #e2e8f0; page-break-inside: avoid; background: ${i%2===0 ? '#fff' : '#f8fafc'}">
                       <td style="padding: 12px 10px; vertical-align: top; font-weight:800;">${i+1}</td>
                       <td style="padding: 12px 10px; vertical-align: top;">
                          <div style="font-weight:700; margin-bottom:8px; line-height:1.4;">${q.Question}</div>
                          <div style="font-size:9px; color:#10b981; font-weight:800; padding:4px 8px; background:rgba(16,185,129,0.1); border-radius:4px;">KEY: ${correctVal}</div>
                       </td>
                       <td style="padding: 12px 10px; vertical-align: top; font-size:9px; color:#64748b; font-style:italic;">${optsHtml}</td>
                       <td style="padding: 12px 10px; vertical-align: top; font-size:10px; color:#64748b; font-weight:600;">${q.Category || "-"}</td>
                       <td style="padding: 12px 10px; vertical-align: top; text-align:center; font-family:monospace;">${time}s</td>
                       <td style="padding: 12px 10px; vertical-align: top; font-weight:600; color: ${corr ? '#0f172a': '#ef4444'}">${uaStr}</td>
                       <td style="padding: 12px 10px; vertical-align: top; text-align:center; font-weight:800; color: ${corr ? '#10b981': '#ef4444'}">${corr ? 'PASS' : 'FAIL'}</td>
                    </tr>
                  `;
              }).join("")}
           </tbody>
         </table>
      </div>
    `;

    const opt = {
      margin: 0,
      filename: `PrepExecuter_Report_${user.name.replace(/\s+/g, "_")}.pdf`,
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
                    <div class="q-text"><div>${q.Question}</div></div>
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
            Preparation Executer Analytics Professional Series • Generated via Localized Assessment Engine • Official Transcript
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
    applyReviewFilters
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
            <button class="btn btn-primary btn-sm" style="margin-top:var(--sp-md)" onclick="PageHistory.load()">Load History</button>
          </p>
          <div id="history-body"></div>
        </div>
      </div>`;
  }

  let _cachedHistory = [];
  let _activeTopicFilter = "All Topics";
  let _topicGraphsOpen = false;
  let _historyChart = null;

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
      _cachedHistory = await API.getHistory(user.identifier);

      if (!_cachedHistory || !_cachedHistory.length) {
        body.innerHTML =
          '<p class="text-muted text-sm" style="text-align:center;padding:var(--sp-lg)">No previous attempts found for your ID.</p>';
        return;
      }
      
      _activeTopicFilter = "All Topics";
      _topicGraphsOpen = false;
      renderHistoryUI();
    } catch (e) {
      body.innerHTML = `<div style="padding:20px; text-align:center">
        <p class="text-error text-sm">${e.message}</p>
        <p class="text-xs text-muted">Ensure your Google Script is correctly deployed.</p>
      </div>`;
    }
  }

  function renderHistoryUI() {
    const body = document.getElementById("history-body");
    if (!body) return;

    const topics = [...new Set(_cachedHistory.map(r => r["Quiz Topic"] || "Unknown"))].filter(Boolean).sort();
    
    let filteredHistory = _cachedHistory;
    if (_activeTopicFilter !== "All Topics") {
        filteredHistory = _cachedHistory.filter(r => (r["Quiz Topic"] || "Unknown") === _activeTopicFilter);
    }

    const reversedHistory = [...filteredHistory].reverse(); 
    const last10 = reversedHistory.slice(0, 10).reverse();

    body.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--sp-md); flex-wrap:wrap; gap:16px;">
           <h3 style="font-size:1.2rem; font-weight:800; color:var(--text-primary)">Performance Tracking</h3>
           <select id="history-topic-filter" class="form-control" style="width:auto; min-width:200px; padding:8px 12px; border-radius:8px; font-weight:600; font-size:0.9rem;" onchange="PageHistory.setFilter(this.value)">
              <option value="All Topics" ${_activeTopicFilter === "All Topics" ? "selected" : ""}>All Topics</option>
              ${topics.map(t => `<option value="${t}" ${_activeTopicFilter === t ? "selected" : ""}>${t}</option>`).join("")}
           </select>
        </div>

        <div class="card" style="padding:var(--sp-lg); background:var(--bg-elevated); margin-bottom:var(--sp-xl); border:1px solid var(--border-color); border-radius:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                <h3 style="font-size:1.1rem; font-weight:800; color:var(--text-primary)">Trend Trajectory (${_activeTopicFilter})</h3>
                <button class="btn btn-ghost btn-sm" style="font-weight:700" onclick="PageHistory.toggleTopicGraphs()">
                   📊 Compare Topics <span id="topic-graph-icon" style="opacity:0.5; margin-left:6px">${_topicGraphsOpen ? '▲' : '▼'}</span>
                </button>
            </div>
            
            <div style="height:250px">
               <canvas id="chart-history-adaptive"></canvas>
            </div>
            
            <div id="topic-graphs-container" style="display:${_topicGraphsOpen ? 'block' : 'none'}; margin-top:24px; padding-top:24px; border-top:1px dashed var(--border-color)">
               <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:var(--sp-xl);">
                  <div>
                      <h4 style="font-size:0.9rem; margin-bottom:8px; color:var(--text-secondary); text-align:center;">Average Score by Topic</h4>
                      <div style="height:250px"><canvas id="chart-history-topic-bars"></canvas></div>
                  </div>
                  <div>
                      <h4 style="font-size:0.9rem; margin-bottom:8px; color:var(--text-secondary); text-align:center;">Attempt Frequency per Topic</h4>
                      <div style="height:250px"><canvas id="chart-history-topic-radar"></canvas></div>
                  </div>
               </div>
            </div>

            <div class="dash-metrics-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:var(--sp-md);margin-top:var(--sp-md)">
              <div class="metric-card" style="background:var(--bg-surface)">
                <span class="m-label" style="font-size:0.75rem">Average Score (Top ${last10.length})</span>
                <div class="m-value text-accent">${last10.length ? Math.round(last10.reduce((a,b)=>a+(parseFloat(b["Result Score"])||0),0)/last10.length) : 0}</div>
              </div>
              <div class="metric-card" style="background:var(--bg-surface)">
                <span class="m-label" style="font-size:0.75rem">Trend Trajectory</span>
                <div class="m-value ${last10.length >= 2 && (parseFloat(last10[last10.length-1]["Result Score"]) >= parseFloat(last10[0]["Result Score"])) ? "text-success" : "text-warn"}">${last10.length >= 2 ? (parseFloat(last10[last10.length-1]["Result Score"]) >= parseFloat(last10[0]["Result Score"]) ? "Improving" : "Declining") : "Neutral"}</div>
              </div>
            </div>
        </div>

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
              ${reversedHistory
                .map((r) => {
                  const dateVal = r["End Time"] || r["Start Time"] || "";
                  const date = dateVal ? new Date(dateVal).toLocaleString() : "Date Unknown";
                  const score = r["Result Score"] || "—";
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
               ${reversedHistory.length === 0 ? `<tr><td colspan="5" style="text-align:center; padding:var(--sp-xl)">No attempts found for this topic filter.</td></tr>` : ""}
            </tbody>
          </table>
        </div>`;

      setTimeout(() => {
        if (typeof Chart === "undefined") return;
        if (_historyChart) _historyChart.destroy();
        
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
        Chart.defaults.color = isDark ? "#94a3b8" : "#64748b";
        
        const el = document.getElementById("chart-history-adaptive");
        if (el && last10.length > 0) {
           _historyChart = new Chart(el, {
             type: "line",
             data: {
               labels: last10.map((_, i) => "S" + (i + 1)),
               datasets: [{
                 label: "Score",
                 data: last10.map(r => parseFloat(r["Result Score"]) || 0),
                 borderColor: "#8b5cf6",
                 backgroundColor: "rgba(139, 92, 246, 0.1)",
                 fill: true,
                 tension: 0.3
               }]
             },
             options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: gridColor } }, y: { beginAtZero: true, grid: { color: gridColor } } } }
           });
        }

        if (_topicGraphsOpen) {
           renderDetailedTopicGraphs(_cachedHistory, isDark, gridColor);
        }
      }, 50);
  }

  let _barChart = null;
  let _radarChart = null;

  function renderDetailedTopicGraphs(dataToUse, isDark, gridColor) {
      if (_barChart) _barChart.destroy();
      if (_radarChart) _radarChart.destroy();

      const topicStats = {};
      dataToUse.forEach(r => {
         const t = r["Quiz Topic"] || "Unknown";
         if (!topicStats[t]) topicStats[t] = { scoreSum: 0, count: 0 };
         topicStats[t].scoreSum += (parseFloat(r["Result Score"]) || 0);
         topicStats[t].count += 1;
      });

      const labels = Object.keys(topicStats);
      const avgScores = labels.map(t => topicStats[t].scoreSum / topicStats[t].count);
      const counts = labels.map(t => topicStats[t].count);

      const elBar = document.getElementById("chart-history-topic-bars");
      if (elBar) {
         _barChart = new Chart(elBar, {
             type: "bar",
             data: {
                 labels: labels,
                 datasets: [{
                     label: "Average Score",
                     data: avgScores,
                     backgroundColor: "rgba(59, 130, 246, 0.7)",
                     borderRadius: 4
                 }]
             },
             options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: gridColor } }, y: { beginAtZero: true, max: 100, grid: { color: gridColor } } } }
         });
      }

      const elRadar = document.getElementById("chart-history-topic-radar");
      if (elRadar) {
         _radarChart = new Chart(elRadar, {
             type: "radar",
             data: {
                 labels: labels,
                 datasets: [{
                     label: "Attempt Count",
                     data: counts,
                     backgroundColor: "rgba(16, 185, 129, 0.3)",
                     borderColor: "#10b981",
                     borderWidth: 2
                 }]
             },
             options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { r: { grid: { color: gridColor }, angleLines: { color: gridColor }, ticks: { stepSize: 1 } } } }
         });
      }
  }

  function toggleTopicGraphs() {
      _topicGraphsOpen = !_topicGraphsOpen;
      renderHistoryUI();
  }

  function setFilter(val) {
      _activeTopicFilter = val;
      renderHistoryUI();
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

  return { render, load, viewCloudAttempt, toggleTopicGraphs, setFilter };
})();
