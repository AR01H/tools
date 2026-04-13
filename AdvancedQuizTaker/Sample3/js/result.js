// ============================================================
//  result.js  — Results Page: Overview, Charts, Review, PDF
// ============================================================

const Result = (() => {

  let _charts = {};

  function render() {
    const r = State.getResult().data;
    if (!r) return;

    // Render hero
    renderHero(r);

    // Stats cards
    renderStats(r);

    // Charts
    setTimeout(() => {
      renderCategoryChart(r);
      renderDifficultyChart(r);
      renderTimelineChart(r);
    }, 100);

    // Render result tabs
    setupResultTabs(r);

    // Confetti if good score
    if (r.percentage >= 70) launchConfetti();
  }

  // ── Hero ──────────────────────────────────────────────────
  function renderHero(r) {
    const hero = document.getElementById("result-hero");
    if (!hero) return;
    const minutes = Math.floor(r.timeTaken / 60);
    const seconds = r.timeTaken % 60;
    hero.innerHTML = `
      <div class="result-score-ring">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="10"/>
          <circle cx="80" cy="80" r="68" fill="none" stroke="white" stroke-width="10"
            stroke-dasharray="${2 * Math.PI * 68}"
            stroke-dashoffset="${2 * Math.PI * 68 * (1 - r.percentage / 100)}"
            stroke-linecap="round" style="transition:stroke-dashoffset 1.5s ease"/>
        </svg>
        <div class="score-text">
          <div class="score-pct">${r.percentage}%</div>
          <div class="score-label-sm">${r.score}/${r.totalScore} pts</div>
        </div>
      </div>
      <h2 class="fw-700 mb-1">${getGradeLabel(r.percentage)}</h2>
      <div style="opacity:.85;font-size:.9rem">
        ${r.quizName} &nbsp;·&nbsp; ${r.quizTopic} &nbsp;·&nbsp; 
        ${minutes}m ${String(seconds).padStart(2,"0")}s
      </div>
      <div style="margin-top:8px;opacity:.75;font-size:.82rem">
        ${r.studentName} &nbsp;·&nbsp; ${new Date(r.endTime).toLocaleString()}
      </div>`;
  }

  function getGradeLabel(pct) {
    if (pct >= 90) return "🏆 Outstanding!";
    if (pct >= 75) return "🎉 Great Performance!";
    if (pct >= 60) return "👍 Good Job!";
    if (pct >= 40) return "📚 Keep Practicing!";
    return "💪 Don't Give Up!";
  }

  // ── Stats ─────────────────────────────────────────────────
  function renderStats(r) {
    const el = document.getElementById("result-stats");
    if (!el) return;
    const stats = [
      { icon: "fa-check-circle", color: "var(--success)", val: r.correct,  label: "Correct" },
      { icon: "fa-times-circle", color: "var(--danger)",  val: r.wrong,    label: "Wrong" },
      { icon: "fa-minus-circle", color: "var(--warning)", val: r.skipped,  label: "Skipped" },
      { icon: "fa-clock",        color: "var(--info)",    val: formatTime(r.timeTaken), label: "Time Taken" },
    ];
    el.innerHTML = stats.map(s => `
      <div class="stat-card">
        <i class="fas ${s.icon}" style="font-size:1.4rem;color:${s.color};margin-bottom:8px"></i>
        <div class="stat-value" style="color:${s.color}">${s.val}</div>
        <div class="stat-label">${s.label}</div>
      </div>`).join("");
  }

  function formatTime(sec) {
    if (!sec) return "0:00";
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  // ── Charts ────────────────────────────────────────────────
  function renderCategoryChart(r) {
    const canvas = document.getElementById("chart-category");
    if (!canvas) return;
    if (_charts.category) _charts.category.destroy();
    const cats  = Object.keys(r.categoryScores || {});
    const pcts  = cats.map(c => {
      const d = r.categoryScores[c];
      return d.max > 0 ? Math.round((Math.max(0, d.score) / d.max) * 100) : 0;
    });
    _charts.category = new Chart(canvas, {
      type: "bar",
      data: {
        labels: cats,
        datasets: [{
          label: "Score %",
          data: pcts,
          backgroundColor: cats.map((_, i) => `hsl(${220 + i * 35},70%,55%)`),
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, max: 100, ticks: { callback: v => v + "%" } }
        }
      }
    });
  }

  function renderDifficultyChart(r) {
    const canvas = document.getElementById("chart-difficulty");
    if (!canvas) return;
    if (_charts.difficulty) _charts.difficulty.destroy();
    const diffs = Object.keys(r.difficultyScores || {});
    const correct = diffs.map(d => r.difficultyScores[d].correct || 0);
    const wrong   = diffs.map(d => r.difficultyScores[d].wrong   || 0);
    _charts.difficulty = new Chart(canvas, {
      type: "bar",
      data: {
        labels: diffs.map(d => d[0].toUpperCase() + d.slice(1)),
        datasets: [
          { label: "Correct", data: correct, backgroundColor: "rgba(16,185,129,.7)", borderRadius: 4 },
          { label: "Wrong",   data: wrong,   backgroundColor: "rgba(239,68,68,.7)",  borderRadius: 4 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: "top" } },
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }
      }
    });
  }

  function renderTimelineChart(r) {
    const canvas = document.getElementById("chart-timeline");
    if (!canvas || !r.answers) return;
    if (_charts.timeline) _charts.timeline.destroy();
    const labels = r.questions.map((_, i) => "Q" + (i + 1));
    const times  = r.questions.map((_, i) => r.answers[i]?.timeSpent || 0);
    _charts.timeline = new Chart(canvas, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Time Spent (s)",
          data: times,
          borderColor: "rgba(99,102,241,.8)",
          backgroundColor: "rgba(99,102,241,.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 4,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  // ── Tabs ──────────────────────────────────────────────────
  function setupResultTabs(r) {
    const tabEl = document.querySelectorAll(".result-tab");
    tabEl.forEach(t => t.addEventListener("click", () => {
      tabEl.forEach(x => x.classList.remove("active"));
      t.classList.add("active");
      const mode = t.dataset.tab;
      State.set({ result: { mode } });
      renderTabContent(mode, r);
    }));
    renderTabContent("overview", r);
  }

  function renderTabContent(mode, r) {
    const container = document.getElementById("result-tab-content");
    if (!container) return;
    switch (mode) {
      case "overview":   renderOverviewTab(container, r);  break;
      case "review":     renderReviewTab(container, r);    break;
      case "analytics":  renderAnalyticsTab(container, r); break;
    }
  }

  function renderOverviewTab(container, r) {
    const cat  = r.categoryScores  || {};
    const diff = r.difficultyScores || {};

    container.innerHTML = `
      <div class="row g-4">
        <div class="col-md-6">
          <div class="qm-card">
            <div class="qm-card-header"><span class="qm-card-title">Category Scores</span></div>
            <div class="chart-wrap"><canvas id="chart-category"></canvas></div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="qm-card">
            <div class="qm-card-header"><span class="qm-card-title">Difficulty Breakdown</span></div>
            <div class="chart-wrap"><canvas id="chart-difficulty"></canvas></div>
          </div>
        </div>
        <div class="col-12">
          <div class="qm-card">
            <div class="qm-card-header"><span class="qm-card-title">Time Per Question</span></div>
            <div class="chart-wrap"><canvas id="chart-timeline"></canvas></div>
          </div>
        </div>
      </div>`;

    setTimeout(() => {
      renderCategoryChart(r);
      renderDifficultyChart(r);
      renderTimelineChart(r);
    }, 50);
  }

  function renderReviewTab(container, r) {
    const questions = r.questions || [];
    const answers   = r.answers || {};
    container.innerHTML = `
      <div class="d-flex gap-2 mb-3 flex-wrap">
        <button class="btn-qm btn-qm-sm btn-qm-secondary" onclick="Result.filterReview('all')">All (${questions.length})</button>
        <button class="btn-qm btn-qm-sm btn-qm-success"  onclick="Result.filterReview('correct')">✓ Correct (${r.correct})</button>
        <button class="btn-qm btn-qm-sm btn-qm-danger"   onclick="Result.filterReview('wrong')">✗ Wrong (${r.wrong})</button>
        <button class="btn-qm btn-qm-sm" style="background:var(--warning-light);color:var(--warning)"
                onclick="Result.filterReview('skipped')">⊘ Skipped (${r.skipped})</button>
      </div>
      <div id="review-list">
        ${questions.map((q, i) => buildReviewItem(q, i, answers[i])).join("")}
      </div>`;
  }

  function buildReviewItem(q, i, ans) {
    const correctRaw = (q["Correct Answer"] || "").trim();
    const correctArr = correctRaw.split("|").map(s => s.trim());
    const selected   = ans?.selected;
    const selArr     = selected ? (Array.isArray(selected) ? selected : [selected]) : [];
    const isCorrect  = selected && JSON.stringify([...correctArr].sort()) === JSON.stringify([...selArr].map(String).sort());
    const isSkipped  = !selected;
    const status     = isSkipped ? "skipped" : (isCorrect ? "correct" : "wrong");
    const icon       = isSkipped ? "fa-minus" : (isCorrect ? "fa-check" : "fa-times");
    const choices    = [q.Choice1, q.Choice2, q.Choice3, q.Choice4].filter(Boolean);

    return `
      <div class="review-item ${status}" data-status="${status}">
        <div class="d-flex justify-between align-center mb-2 flex-wrap gap-2">
          <div class="fw-600">Q${i + 1}. ${q.Question}</div>
          <span class="review-status-badge ${status}"><i class="fas ${icon} me-1"></i>${capitalize(status)}</span>
        </div>
        ${q.Category ? `<div class="text-sm text-muted mb-2"><i class="fas fa-tag me-1"></i>${q.Category} › ${q["Sub Category"]}</div>` : ""}
        ${choices.length > 0 ? `
          <div style="display:grid;gap:6px;margin-bottom:12px">
            ${choices.map(c => {
              const isC = correctArr.includes(c);
              const isS = selArr.includes(c);
              let style = "padding:8px 14px;border-radius:8px;font-size:.88rem;border:1.5px solid var(--border);";
              if (isC) style += "background:var(--success-light);border-color:var(--success);";
              else if (isS && !isC) style += "background:var(--danger-light);border-color:var(--danger);";
              return `<div style="${style}">${isC ? "✓ " : isS && !isC ? "✗ " : ""}${c}</div>`;
            }).join("")}
          </div>` : ""}
        ${q.Solution ? `
          <div style="background:var(--info-light);border-left:3px solid var(--info);padding:10px 14px;border-radius:0 8px 8px 0;font-size:.85rem">
            <strong><i class="fas fa-info-circle me-1" style="color:var(--info)"></i>Explanation:</strong> ${q.Solution}
          </div>` : ""}
        <div class="text-sm text-muted mt-2">
          Time spent: ${ans?.timeSpent || 0}s &nbsp;·&nbsp;
          Score: ${q.Score || 1} pts
          ${parseFloat(q["Negative Score"] || 0) > 0 ? ` (Negative: -${q["Negative Score"]})` : ""}
        </div>
      </div>`;
  }

  function filterReview(filter) {
    document.querySelectorAll(".review-item").forEach(el => {
      el.style.display = (filter === "all" || el.dataset.status === filter) ? "block" : "none";
    });
  }

  function renderAnalyticsTab(container, r) {
    const cat  = r.categoryScores  || {};
    const diff = r.difficultyScores || {};
    const rows = Object.entries(cat).map(([c, d]) => `
      <tr>
        <td>${c}</td>
        <td>${d.correct || 0}</td>
        <td>${d.wrong || 0}</td>
        <td>${d.max > 0 ? Math.round((Math.max(0,d.score)/d.max)*100) : 0}%</td>
        <td>${Math.max(0,d.score).toFixed(1)}/${d.max}</td>
      </tr>`).join("");

    container.innerHTML = `
      <div class="qm-card mb-4">
        <div class="qm-card-header"><span class="qm-card-title">Category Analysis</span></div>
        <div class="table-responsive">
          <table class="table table-hover" style="font-size:.88rem">
            <thead><tr><th>Category</th><th>Correct</th><th>Wrong</th><th>Accuracy</th><th>Score</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
      <div class="qm-card">
        <div class="qm-card-header"><span class="qm-card-title">Performance Summary</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;text-align:center">
          ${[
            ["Accuracy", r.correct + "/" + r.questions.length, "var(--success)"],
            ["Score",    r.score + "/" + r.totalScore, "var(--accent)"],
            ["Time",     formatTime(r.timeTaken), "var(--info)"],
          ].map(([l,v,c]) => `
            <div style="padding:16px;background:var(--bg-primary);border-radius:12px">
              <div style="font-size:1.4rem;font-weight:700;color:${c}">${v}</div>
              <div class="text-muted text-sm">${l}</div>
            </div>`).join("")}
        </div>
      </div>`;
  }

  // ── Download PDF ──────────────────────────────────────────
  function downloadPDF() {
    window.print();
  }

  // ── Share ─────────────────────────────────────────────────
  function shareResult() {
    const r = State.getResult().data;
    const text = `I scored ${r.percentage}% (${r.score}/${r.totalScore}) on ${r.quizName}! 🎯`;
    UI.copyToClipboard(text);
    UI.openModal("share-modal");
  }

  // ── Retake ────────────────────────────────────────────────
  function retakeQuiz() {
    State.set({ setup: { step: 1 } });
    UI.showPage("setup");
    Filters.init();
  }

  // ── Confetti ──────────────────────────────────────────────
  function launchConfetti() {
    const colors = ["#6366f1","#06b6d4","#10b981","#f59e0b","#ef4444","#8b5cf6"];
    const wrap   = document.createElement("div");
    wrap.className = "confetti-wrap";
    document.body.appendChild(wrap);
    for (let i = 0; i < 80; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti-piece";
      piece.style.cssText = `
        left:${Math.random()*100}%;
        background:${colors[Math.floor(Math.random()*colors.length)]};
        border-radius:${Math.random()>0.5?"50%":"2px"};
        animation-duration:${1.5+Math.random()*2}s;
        animation-delay:${Math.random()*.8}s;
        width:${6+Math.random()*6}px;
        height:${6+Math.random()*6}px;`;
      wrap.appendChild(piece);
    }
    setTimeout(() => wrap.remove(), 4000);
  }

  function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ""; }

  return { render, filterReview, shareResult, retakeQuiz, downloadPDF };
})();
