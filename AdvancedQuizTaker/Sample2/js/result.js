// ============================================================
//  QUIZ APP — result.js
//  Score calculation + full results page with charts & tabs
// ============================================================

// ── Scoring Engine ────────────────────────────────────────
const Results = (() => {

  function isCorrect(q, userAnswer) {
    if (!userAnswer && userAnswer !== 0) return false;
    const correct = (q['Correct Answer'] || '').split('|').map(s=>s.trim());
    const type    = (q['Question Type'] || '').trim();

    if (type === 'Sequence') {
      const ua = Array.isArray(userAnswer) ? userAnswer : userAnswer.split('|');
      return ua.join('|') === correct.join('|');
    }
    if (type === 'Multi Multichoice' || type === 'Multichoice Anycorrect') {
      const ua = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
      return ua.length === correct.length && ua.every(a => correct.includes(a.trim()));
    }
    if (type === 'Range') {
      const [lo, hi] = correct[0].replace(/"/g,'').split('-').map(Number);
      const val = parseFloat(userAnswer);
      return val >= lo && val <= hi;
    }
    if (type === 'Short Answer') {
      return correct.some(c => c.toLowerCase().trim() === (userAnswer||'').toLowerCase().trim());
    }
    if (type === 'Fill in the Blanks' || type === 'Inline Blank') {
      return correct[0].toLowerCase().trim() === (userAnswer||'').toLowerCase().trim();
    }
    if (type === 'Multi Blanks') {
      const ua = (userAnswer || '').split('|');
      return correct.every((c, i) => c.toLowerCase().trim() === (ua[i]||'').toLowerCase().trim());
    }
    if (type === 'Matching' || type === 'Multi Matching') {
      return userAnswer && userAnswer !== '' &&
        correct.every(c => (userAnswer||'').includes(c));
    }
    // Default single answer
    const ua = Array.isArray(userAnswer) ? userAnswer[0] : userAnswer;
    return correct.includes((ua||'').trim());
  }

  function getQuestionScore(q, userAnswer, cfg) {
    const baseScore   = parseFloat(q.Score || 1);
    const negScore    = parseFloat(q['Negative Score'] || 0);
    const partScore   = parseFloat(q['Partial Score'] || 0);
    const negMarking  = (cfg['Negative Marking'] || 'Off') === 'On';
    const partScoring = (cfg['Partial Scoring'] || 'Off') === 'On';

    if (!userAnswer && userAnswer !== 0) return 0;
    if (isCorrect(q, userAnswer)) return baseScore;

    // Partial scoring for multi-select
    const type = (q['Question Type'] || '').trim();
    if (partScoring && (type === 'Multi Multichoice' || type === 'Multichoice Anycorrect')) {
      const correct = (q['Correct Answer'] || '').split('|');
      const ua      = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
      const hits    = ua.filter(a => correct.includes(a.trim())).length;
      if (hits > 0) return (hits / correct.length) * partScore;
    }

    return negMarking ? -negScore : 0;
  }

  function calculateScore(quiz) {
    const cfg = quiz.config;
    let total = 0, maxTotal = 0, correct = 0, wrong = 0, skipped = 0;
    const categoryMap = {}, difficultyMap = {}, typeMap = {};

    quiz.questions.forEach((q, i) => {
      const maxQ  = parseFloat(q.Score || 1);
      const ans   = quiz.answers[i];
      const ua    = ans ? ans.userAnswer : undefined;
      const s     = getQuestionScore(q, ua, cfg);
      const corr  = isCorrect(q, ua);

      total    += s;
      maxTotal += maxQ;
      if (ua === undefined || ua === null || ua === '') skipped++;
      else if (corr) correct++;
      else wrong++;

      // Category breakdown
      const cat = q.Category || 'Uncategorised';
      if (!categoryMap[cat]) categoryMap[cat] = { score:0, max:0, correct:0, total:0 };
      categoryMap[cat].score   += s;
      categoryMap[cat].max     += maxQ;
      categoryMap[cat].total++;
      if (corr) categoryMap[cat].correct++;

      // Difficulty
      const diff = q.Difficulty || 'unknown';
      if (!difficultyMap[diff]) difficultyMap[diff] = { correct:0, total:0, score:0, max:0 };
      difficultyMap[diff].total++;
      difficultyMap[diff].score += s;
      difficultyMap[diff].max   += maxQ;
      if (corr) difficultyMap[diff].correct++;

      // Type
      const t = q['Question Type'] || 'Other';
      if (!typeMap[t]) typeMap[t] = { correct:0, total:0 };
      typeMap[t].total++;
      if (corr) typeMap[t].correct++;
    });

    const accuracy   = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
    const timeTaken  = Math.round((Date.now() - quiz.startTime) / 1000);

    return { total: Math.max(0, total), maxTotal, accuracy, correct, wrong, skipped, timeTaken, categoryMap, difficultyMap, typeMap };
  }

  return { isCorrect, getQuestionScore, calculateScore };
})();

// ============================================================
//  Page: Result
// ============================================================
const PageResult = (() => {
  let _activeTab = 'overview';

  function render(main, data) {
    const result = data || State.get('result');
    if (!result) { main.innerHTML = '<p class="text-muted">No result data.</p>'; return; }
    const { quiz, score, endTime, startTime } = result;
    const cfg   = quiz.config;
    const showQWise = (cfg['Question Wise Result'] || 'On') === 'On';

    main.innerHTML = `
      <div class="animate-up">
        <!-- Compact Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--sp-md); background:var(--bg-elevated); padding:16px; border-radius:var(--radius-md); border:1px solid var(--border-color)">
          
          <div style="display:flex; flex-direction:column; gap:4px">
            <h1 style="font-size:1.4rem; font-weight:800; margin:0">Session Complete</h1>
            <p class="text-muted" style="margin:0; font-size:0.85rem">
              ${score.total.toFixed(1)} / ${score.maxTotal} points • ${fmtTime(score.timeTaken)} • ${new Date(endTime).toLocaleString()}
            </p>
          </div>

          <div style="display:flex; align-items:center; gap:var(--sp-lg)">
            <!-- Accuracy Bar -->
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px">
               <span style="font-size:1.2rem; font-weight:800; color:${score.accuracy >= 70 ? 'var(--color-success)' : score.accuracy >= 40 ? 'var(--color-warn)' : 'var(--color-error)'}">${score.accuracy}% Accuracy</span>
               <div style="width:150px; height:6px; background:var(--bg-surface); border-radius:3px; overflow:hidden">
                 <div style="height:100%; width:${score.accuracy}%; background:${score.accuracy >= 70 ? 'var(--color-success)' : score.accuracy >= 40 ? 'var(--color-warn)' : 'var(--color-error)'}"></div>
               </div>
            </div>

            <!-- Quick stats -->
            <div style="display:flex; gap:16px; align-items:center; border-left:1px solid var(--border-color); padding-left:16px">
              ${[
                { num: score.correct,  label: '✓ Checked',  color: 'var(--color-success)' },
                { num: score.wrong,    label: '✕ Missed',    color: 'var(--color-error)'   },
                { num: score.skipped,  label: '⚠ Skipped',  color: 'var(--color-warn)'    }
              ].map(s=>`
                <div style="display:flex;flex-direction:column;align-items:center;">
                  <div style="color:${s.color}; font-weight:700; font-size:1.1rem">${s.num}</div>
                  <div style="color:var(--text-muted); font-size:0.7rem; text-transform:uppercase">${s.label}</div>
                </div>`).join('')}
            </div>
          </div>
        </div>

        <!-- Action bar -->
        <div style="display:flex; justify-content:flex-end; gap:var(--sp-sm); margin-bottom:var(--sp-md)">
          <button class="btn btn-ghost btn-sm" onclick="PageResult.downloadPDF()">📥 PDF</button>
          <button class="btn btn-ghost btn-sm" onclick="PageResult.shareResult()">🔗 Share</button>
          <button class="btn btn-secondary btn-sm" onclick="PageResult.retakeQuiz()">🔁 Retake</button>
          <button class="btn btn-secondary btn-sm" onclick="UI.navigate('welcome')">🏠 Home</button>
        </div>

        <!-- Tabs -->
        <div class="tabs" style="margin-bottom:var(--sp-lg)" id="result-tabs">
          ${['overview','category','difficulty','type','questions','answer-key'].map((t,i) => `
            <button class="tab-btn ${t===_activeTab?'active':''}" onclick="PageResult.switchTab('${t}')"
              style="font-size:.78rem;padding:7px 12px">
              ${['📊 Overview','📁 Category','⚡ Difficulty','❓ By Type','📝 Questions','🔑 Answer Key'][i]}
            </button>`).join('')}
        </div>

        <!-- Tab contents -->
        <div id="result-tab-body"></div>
      </div>`;

    // Animate ring
    setTimeout(() => {
      const fill = document.getElementById('ring-fill');
      if (fill) {
        const circ = 2 * Math.PI * 68;
        fill.style.strokeDashoffset = circ - (circ * score.accuracy / 100);
        fill.style.stroke = score.accuracy >= 70 ? 'var(--color-success)' : score.accuracy >= 40 ? 'var(--color-warn)' : 'var(--color-error)';
      }
    }, 300);

    switchTab(_activeTab, result);
  }

  function switchTab(tab, explicitResult = null) {
    _activeTab = tab;
    const result = explicitResult || State.get('result');
    document.querySelectorAll('#result-tabs .tab-btn').forEach((b,i) => {
      const tabs = ['overview','category','difficulty','type','questions','answer-key'];
      b.classList.toggle('active', tabs[i] === tab);
    });
    renderTab(tab, result);
  }

  function renderTab(tab, result) {
    const body = document.getElementById('result-tab-body');
    if (!body) return;
    switch(tab) {
      case 'overview':   
        body.innerHTML = renderOverview(result);    
        setTimeout(() => initOverviewCharts(result), 50);
        break;
      case 'category':   body.innerHTML = renderCategory(result);    break;
      case 'difficulty': body.innerHTML = renderDifficulty(result);  break;
      case 'type':       body.innerHTML = renderTypeTab(result);     break;
      case 'questions':  body.innerHTML = renderQuestions(result);   break;
      case 'answer-key': body.innerHTML = renderAnswerKey(result);   break;
    }
  }

  // ── OVERVIEW TAB ──────────────────────────────────────────
  function renderOverview(result) {
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:var(--sp-md);margin-bottom:var(--sp-lg)">
        
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
    _activeCharts.forEach(c => c.destroy());
    _activeCharts = [];

    if (typeof Chart === 'undefined') return;
    
    // Setup Theme Colors based on active app theme
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    Chart.defaults.color = isDark ? '#94a3b8' : '#64748b';
    Chart.defaults.font.family = '"Inter", "Sora", sans-serif';
    Chart.defaults.font.size = 11;
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    const { score, quiz } = result;

    // 1. Answers Doughnut
    const ctxAnswers = document.getElementById('chart-answers');
    if (ctxAnswers) {
      _activeCharts.push(new Chart(ctxAnswers, {
        type: 'doughnut',
        data: {
          labels: ['Correct', 'Wrong', 'Skipped'],
          datasets: [{
            data: [score.correct, score.wrong, score.skipped],
            backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } },
          cutout: '70%'
        }
      }));
    }

    // 2. Category Bar
    const ctxCat = document.getElementById('chart-categories');
    if (ctxCat) {
      const catLabels = Object.keys(score.categoryMap).slice(0, 8); // Top 8
      const catData = catLabels.map(k => {
        const d = score.categoryMap[k];
        return d.max ? Math.round((d.score/d.max)*100) : 0;
      });
      _activeCharts.push(new Chart(ctxCat, {
        type: 'bar',
        data: {
          labels: catLabels.length ? catLabels : ['Uncategorised'],
          datasets: [{
            label: 'Accuracy %',
            data: catData.length ? catData : [score.accuracy],
            backgroundColor: '#0ea5e9',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { grid: { color: gridColor }, beginAtZero: true, max: 100 }
          }
        }
      }));
    }

    // 3. Difficulty Bar (Horizontal)
    const ctxDiff = document.getElementById('chart-difficulties');
    if (ctxDiff) {
      const diffKeys = ['easy', 'medium', 'hard'];
      const diffData = diffKeys.map(k => {
        const d = score.difficultyMap[k] || score.difficultyMap[k.charAt(0).toUpperCase() + k.slice(1)];
        if (!d || !d.total) return 0;
        return Math.round((d.correct/d.total)*100);
      });
      _activeCharts.push(new Chart(ctxDiff, {
        type: 'bar',
        data: {
          labels: ['Easy', 'Medium', 'Hard'],
          datasets: [{
            label: 'Accuracy %',
            data: diffData,
            backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { x: { grid: { color: gridColor }, beginAtZero: true, max: 100 } }
        }
      }));
    }

    // 4. Timeline (Line)
    const ctxTime = document.getElementById('chart-timeline');
    if (ctxTime) {
      const timeLabels = quiz.questions.map((_, i) => 'Q' + (i+1));
      let runTotal = 0;
      const timeData = quiz.questions.map((q, i) => {
        // Find if this question was correct
        const ua = (quiz.answers[i]||{}).userAnswer;
        const pts = Results.getQuestionScore(q, ua, quiz.config);
        runTotal += pts;
        return Math.max(0, runTotal);
      });
      _activeCharts.push(new Chart(ctxTime, {
        type: 'line',
        data: {
          labels: timeLabels,
          datasets: [{
            label: 'Cumulative Score',
            data: timeData,
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: true, tension: 0.4
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: gridColor }, beginAtZero: true }
          }
        }
      }));
    }

    // 5. Types (Bar)
    const ctxType = document.getElementById('chart-types');
    if (ctxType) {
      const typeLabels = Object.keys(score.typeMap).slice(0, 6);
      const typeData = typeLabels.map(k => Math.round((score.typeMap[k].correct / score.typeMap[k].total)*100));
      _activeCharts.push(new Chart(ctxType, {
        type: 'bar',
        data: {
          labels: typeLabels,
          datasets: [{
            label: 'Accuracy %',
            data: typeData,
            backgroundColor: '#ec4899',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: gridColor }, beginAtZero: true, max: 100 }
          }
        }
      }));
    }

    // 6. Capability Radar
    const ctxRadar = document.getElementById('chart-radar');
    if (ctxRadar) {
      const tops = Object.keys({...score.categoryMap, ...score.typeMap}).slice(0, 6);
      if (tops.length >= 3) {
        const radarData = tops.map(k => {
          if (score.categoryMap[k]) return score.categoryMap[k].max ? Math.round(score.categoryMap[k].score/score.categoryMap[k].max*100) : 0;
          if (score.typeMap[k]) return score.typeMap[k].total ? Math.round(score.typeMap[k].correct/score.typeMap[k].total*100) : 0;
          return 0;
        });
        _activeCharts.push(new Chart(ctxRadar, {
          type: 'radar',
          data: {
            labels: tops,
            datasets: [{
              label: 'Capability (%)',
              data: radarData,
              backgroundColor: 'rgba(14, 165, 233, 0.2)',
              borderColor: '#0ea5e9',
              pointBackgroundColor: '#0ea5e9'
            }]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { r: { suggestedMin: 0, suggestedMax: 100, ticks: { display: false } } }
          }
        }));
      } else {
         // Fallback if not enough dimensions for radar
         ctxRadar.outerHTML = '<p class="text-muted text-sm text-center">Not enough data vectors to generate radar.</p>';
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
            ${Object.entries(cats).map(([cat, d]) => {
              const pct = d.max ? Math.round(d.score/d.max*100) : 0;
              return `
              <div style="display:flex;align-items:center;gap:var(--sp-md)">
                <div style="width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:0.85rem;font-weight:600" title="${cat}">${cat}</div>
                <div style="flex:1;height:24px;background:var(--border-color);border-radius:4px;position:relative;overflow:hidden">
                  <div style="position:absolute;left:0;top:0;height:100%;width:${pct}%;background:var(--accent-primary);border-radius:4px"></div>
                </div>
                <div style="width:40px;text-align:right;font-size:0.85rem;font-weight:bold">${pct}%</div>
              </div>`;
            }).join('')}
          </div>
        </div>
        <table class="data-table">
          <thead><tr><th>Category</th><th>Correct</th><th>Total</th><th>Score</th><th>Max</th><th>%</th></tr></thead>
          <tbody>
            ${Object.entries(cats).map(([cat, d]) => `
              <tr>
                <td><strong>${cat}</strong></td>
                <td><span class="badge badge-success">${d.correct}</span></td>
                <td>${d.total}</td>
                <td>${d.score.toFixed(1)}</td>
                <td>${d.max.toFixed(1)}</td>
                <td>
                  <div style="display:flex;align-items:center;gap:8px">
                    <div class="progress-bar" style="width:80px;height:6px">
                      <div class="progress-fill" style="width:${d.max?Math.round(d.score/d.max*100):0}%"></div>
                    </div>
                    ${d.max ? Math.round(d.score/d.max*100) : 0}%
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  // ── DIFFICULTY TAB ────────────────────────────────────────
  function renderDifficulty(result) {
    const diffs = result.score.difficultyMap;
    const colors = { easy:'var(--color-success)', medium:'var(--color-warn)', hard:'var(--color-error)', unknown:'var(--text-muted)' };
    return `
      <div>
        <div style="margin-bottom:var(--sp-xl);padding:var(--sp-lg);background:var(--bg-elevated);border-radius:var(--radius-lg)">
          <h4 style="margin-bottom:20px;color:var(--text-secondary);font-size:0.95rem">Difficulty Accuracy</h4>
          <div style="display:flex;flex-direction:column;gap:16px">
            ${Object.entries(diffs).map(([d, v]) => {
              const col = colors[d.toLowerCase()] || colors.unknown;
              const pct = v.total ? Math.round(v.correct/v.total*100) : 0;
              return `
              <div style="display:flex;align-items:center;gap:var(--sp-md)">
                <div style="width:100px;text-transform:capitalize;font-size:0.85rem;color:${col};font-weight:600">${d}</div>
                <div style="flex:1;height:20px;background:var(--border-color);border-radius:10px;position:relative;overflow:hidden">
                  <div style="position:absolute;left:0;top:0;height:100%;width:${pct}%;background:${col};border-radius:10px"></div>
                </div>
                <div style="width:40px;text-align:right;font-size:0.85rem;font-weight:bold">${pct}%</div>
              </div>`;
            }).join('')}
          </div>
        </div>
        <div class="grid-3">
          ${Object.entries(diffs).map(([d,v])=>`
            <div class="report-stat-card">
              <div class="report-stat-num" style="color:${colors[d]||'var(--accent-primary)'}">
                ${v.total ? Math.round(v.correct/v.total*100) : 0}%
              </div>
              <div class="report-stat-label">${d} Accuracy</div>
              <p class="text-xs text-muted mt-sm">${v.correct}/${v.total} correct</p>
            </div>`).join('')}
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
            ${Object.entries(types).map(([t, v]) => {
              const wrong = v.total - v.correct;
              const cPct = v.total ? (v.correct/v.total*100) : 0;
              const wPct = v.total ? (wrong/v.total*100) : 0;
              return `
              <div>
                <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:8px;font-weight:600">
                  <span>${t}</span>
                  <span class="text-muted">${v.total} Qs</span>
                </div>
                <div style="height:24px;background:var(--border-color);border-radius:6px;display:flex;overflow:hidden">
                  <div style="width:${cPct}%;background:var(--color-success);display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:#000;font-weight:bold" title="Correct: ${v.correct}">${cPct >= 10 ? v.correct : ''}</div>
                  <div style="width:${wPct}%;background:var(--color-error);display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:#fff;font-weight:bold" title="Wrong: ${wrong}">${wPct >= 10 ? wrong : ''}</div>
                </div>
              </div>`;
            }).join('')}
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
            ${Object.entries(types).map(([t,v])=>`
              <tr>
                <td>${t}</td>
                <td><span class="badge badge-success">${v.correct}</span></td>
                <td>${v.total}</td>
                <td>${v.total ? Math.round(v.correct/v.total*100) : 0}%</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  // ── QUESTIONS TAB ─────────────────────────────────────────
  function renderQuestions(result) {
    const { quiz } = result;
    return `
      <div style="display:flex;flex-direction:column;gap:var(--sp-md)">
        ${quiz.questions.map((q, i) => {
          const ans  = quiz.answers[i] || {};
          const corr = Results.isCorrect(q, ans.userAnswer);
          const ua   = Array.isArray(ans.userAnswer) ? ans.userAnswer.join(', ') : (ans.userAnswer || '—');
          return `
            <div class="card" style="border-left:4px solid ${corr?'var(--color-success)':'var(--color-error)'}">
              <div style="display:flex;align-items:flex-start;gap:var(--sp-md)">
                <span style="font-size:1.2rem">${corr?'✅':'❌'}</span>
                <div style="flex:1">
                  <p style="font-weight:600;margin-bottom:var(--sp-sm)">${i+1}. ${q.Question}</p>
                  <div class="grid-2" style="gap:var(--sp-sm)">
                    <div style="background:var(--bg-elevated);padding:8px 12px;border-radius:var(--radius-sm)">
                      <p class="text-xs text-muted">Your Answer</p>
                      <p class="text-sm font-bold" style="color:${corr?'var(--color-success)':'var(--color-error)'}">${ua}</p>
                    </div>
                    <div style="background:var(--bg-elevated);padding:8px 12px;border-radius:var(--radius-sm)">
                      <p class="text-xs text-muted">Correct Answer</p>
                      <p class="text-sm font-bold text-success">${q['Correct Answer']}</p>
                    </div>
                  </div>
                  ${q.Solution ? `<div style="margin-top:var(--sp-sm);padding:8px 12px;background:var(--accent-muted);border-radius:var(--radius-sm)">
                    <p class="text-xs text-muted">💡 Solution</p>
                    <p class="text-sm">${q.Solution}</p>
                  </div>` : ''}
                  <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
                    ${q.Category?`<span class="badge badge-info">${q.Category}</span>`:''}
                    ${q.Difficulty?`<span class="badge badge-neutral">${q.Difficulty}</span>`:''}
                    ${ans.timeTaken?`<span class="badge badge-neutral">⏱ ${ans.timeTaken}s</span>`:''}
                  </div>
                </div>
              </div>
            </div>`;
        }).join('')}
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
        ${quiz.questions.map((q,i)=>{
          const ans  = quiz.answers[i] || {};
          const corr = Results.isCorrect(q, ans.userAnswer);
          const ua   = Array.isArray(ans.userAnswer) ? ans.userAnswer.join('|') : (ans.userAnswer||'—');
          return `
            <div class="answer-row">
              <span class="q-num">${i+1}</span>
              <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px" title="${q.Question}">${q.Question.substring(0,60)}${q.Question.length>60?'…':''}</span>
              <span class="text-success font-bold">${q['Correct Answer']}</span>
              <span style="color:${corr?'var(--color-success)':'var(--color-error)'}">${ua}</span>
              <span>${corr?'✅':'❌'}</span>
            </div>`;
        }).join('')}
      </div>`;
  }

  function downloadPDF() {
    if (typeof html2pdf === 'undefined') {
      UI.toast('PDF engine loading, please try again in a moment...', 'warn');
      return;
    }
    UI.setLoading(true, 'Generating HD Report…');
    
    const result = State.get('result');
    const user   = State.get('user') || {name: 'Guest'};
    const score  = result.score;
    const cats   = score.categoryMap;
    const diffs  = score.difficultyMap;

    const pdfContainer = document.createElement('div');
    pdfContainer.style.background = '#ffffff';
    pdfContainer.style.color = '#1e293b';
    pdfContainer.style.padding = '40px';
    pdfContainer.style.fontFamily = '"Inter", "Sora", sans-serif';
    pdfContainer.style.width = '800px';

    pdfContainer.innerHTML = `
      <div style="border-bottom: 3px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h1 style="font-size: 28px; font-weight: 800; color: #0f172a; margin-bottom: 8px; letter-spacing: -0.5px;">Performance Report</h1>
          <p style="font-size: 14px; color: #64748b; font-weight: 500;">CANDIDATE: <span style="color:#0f172a;font-weight:700">${user.name}</span></p>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 14px; color: #64748b; margin-bottom: 4px;">DATE: ${new Date(result.endTime).toLocaleDateString()}</p>
          <p style="font-size: 14px; color: #64748b;">QUIZ: ${result.quiz.config['Quiz Settings Title'] || 'Assessment Session'}</p>
        </div>
      </div>

      <div style="display: flex; gap: 20px; margin-bottom: 40px;">
        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center;">
          <p style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Accuracy</p>
          <p style="font-size: 36px; font-weight: 800; color: ${score.accuracy >= 70 ? '#10b981' : score.accuracy >= 40 ? '#f59e0b' : '#ef4444'}; margin-top: 8px;">${score.accuracy}%</p>
        </div>
        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center;">
          <p style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Total Score</p>
          <p style="font-size: 36px; font-weight: 800; color: #0f172a; margin-top: 8px;">${score.total.toFixed(1)} <span style="font-size:16px;color:#94a3b8">/ ${score.maxTotal}</span></p>
        </div>
        <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center;">
          <p style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Time Taken</p>
          <p style="font-size: 36px; font-weight: 800; color: #0f172a; margin-top: 8px;">${fmtTime(score.timeTaken)}</p>
        </div>
      </div>

      <!-- Overview Stats -->
      <div style="display: flex; gap: 20px; margin-bottom: 40px;">
        <div style="flex: 1; padding: 16px; border-left: 4px solid #10b981; background: #ecfdf5; color: #065f46; border-radius: 4px;">
           <strong>${score.correct}</strong> Correct Responses
        </div>
        <div style="flex: 1; padding: 16px; border-left: 4px solid #ef4444; background: #fef2f2; color: #991b1b; border-radius: 4px;">
           <strong>${score.wrong}</strong> Incorrect Responses
        </div>
        <div style="flex: 1; padding: 16px; border-left: 4px solid #f59e0b; background: #fffbeb; color: #92400e; border-radius: 4px;">
           <strong>${score.skipped}</strong> Skipped Questions
        </div>
      </div>

      <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Category Breakdown</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 14px;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="padding: 12px; text-align: left; color: #475569; font-weight: 700; border-bottom: 2px solid #cbd5e1;">Category</th>
            <th style="padding: 12px; text-align: center; color: #475569; font-weight: 700; border-bottom: 2px solid #cbd5e1;">Correct / Total</th>
            <th style="padding: 12px; text-align: right; color: #475569; font-weight: 700; border-bottom: 2px solid #cbd5e1;">Accuracy</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(cats).length > 0 ? Object.entries(cats).map(([cat, d]) => `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">${cat}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #64748b;">${d.correct} / ${d.total}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: ${d.max && (d.score/d.max) >= 0.7 ? '#10b981' : d.max && (d.score/d.max) >= 0.4 ? '#f59e0b' : '#ef4444'};">${d.max ? Math.round(d.score/d.max*100) : 0}%</td>
            </tr>
          `).join('') : '<tr><td colspan="3" style="padding: 12px; text-align: center; color: #94a3b8;">No categories recorded.</td></tr>'}
        </tbody>
      </table>

      <h3 style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Difficulty Breakdown</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 14px;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="padding: 12px; text-align: left; color: #475569; font-weight: 700; border-bottom: 2px solid #cbd5e1;">Level</th>
            <th style="padding: 12px; text-align: center; color: #475569; font-weight: 700; border-bottom: 2px solid #cbd5e1;">Correct / Total</th>
            <th style="padding: 12px; text-align: right; color: #475569; font-weight: 700; border-bottom: 2px solid #cbd5e1;">Accuracy</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(diffs).length > 0 ? Object.entries(diffs).map(([d, v]) => `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-transform: capitalize; font-weight: 600; color: #0f172a;">${d}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #64748b;">${v.correct} / ${v.total}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; color: #0f172a;">${v.total ? Math.round(v.correct/v.total*100) : 0}%</td>
            </tr>
          `).join('') : '<tr><td colspan="3" style="padding: 12px; text-align: center; color: #94a3b8;">No difficulties recorded.</td></tr>'}
        </tbody>
      </table>
      
      <div style="margin-top: 60px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        Generated by QuizPro Assessment Framework • Official Candidate Report
      </div>
    `;

    const opt = {
      margin:       0.4,
      filename:     `QuizPro_Report_${user.name.replace(/\s+/g,'_')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(pdfContainer).save().then(() => {
      UI.setLoading(false);
      UI.toast('Report downloaded successfully!', 'success');
    }).catch(err => {
      UI.setLoading(false);
      UI.toast('Failed to generate PDF.', 'error');
      console.error(err);
    });
  }

  function shareResult() {
    const result = State.get('result');
    const { score } = result;
    const text = `🎯 Quiz Result\nScore: ${score.total.toFixed(1)}/${score.maxTotal}\nAccuracy: ${score.accuracy}%\nCorrect: ${score.correct} | Wrong: ${score.wrong}\nTime: ${fmtTime(score.timeTaken)}`;
    if (navigator.share) {
      navigator.share({ title:'Quiz Result', text });
    } else {
      navigator.clipboard.writeText(text).then(() => UI.toast('Result copied to clipboard!', 'success'));
    }
  }

  function retakeQuiz() {
    UI.confirm2('Retake this quiz with same settings?', () => {
      // Reset quiz answers but keep questions
      const old = State.get('result').quiz;
      State.merge('quiz', {
        active:true, questions:old.questions, currentIdx:0, answers:{},
        startTime:Date.now(), pauseTime:null, totalPaused:0,
        attemptId:null, fileId:null, resultFileId:null, config:old.config,
      });
      State.set('result', null);
      UI.navigate('quiz');
    });
  }

  return { render, switchTab, downloadPDF, shareResult, retakeQuiz };
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
    const body = document.getElementById('history-body');
    if (!body) return;
    body.innerHTML = '<div class="spinner" style="margin:var(--sp-lg) auto"></div>';
    try {
      // We just show last result in session for now; full history needs file list from Drive
      const result = State.get('result');
      if (!result) { body.innerHTML = '<p class="text-muted text-sm" style="text-align:center;padding:var(--sp-lg)">No recent attempts in this session</p>'; return; }
      const { score } = result;
      body.innerHTML = `
        <table class="data-table">
          <thead><tr><th>Date</th><th>Score</th><th>Accuracy</th><th>Correct</th><th>Time</th><th></th></tr></thead>
          <tbody>
            <tr>
              <td>${new Date(result.endTime).toLocaleString()}</td>
              <td>${score.total.toFixed(1)} / ${score.maxTotal}</td>
              <td>${score.accuracy}%</td>
              <td>${score.correct} / ${result.quiz.questions.length}</td>
              <td>${fmtTime(score.timeTaken)}</td>
              <td><button class="btn btn-ghost btn-sm" onclick="UI.navigate('result')">View →</button></td>
            </tr>
          </tbody>
        </table>`;
    } catch(e) {
      body.innerHTML = `<p class="text-error text-sm">${e.message}</p>`;
    }
  }

  return { render, load };
})();