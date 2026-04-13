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
      <div style="max-width:960px;margin:0 auto" class="animate-up">
        <!-- Header -->
        <div style="text-align:center;margin-bottom:var(--sp-xl)">
          <div class="score-ring-wrap" style="margin-bottom:var(--sp-lg)">
            <svg viewBox="0 0 160 160" width="160" height="160">
              <circle class="score-ring-bg" cx="80" cy="80" r="68"/>
              <circle class="score-ring-fill" id="ring-fill" cx="80" cy="80" r="68"
                stroke-dasharray="${2*Math.PI*68}" stroke-dashoffset="${2*Math.PI*68}"/>
            </svg>
            <div class="score-ring-text">
              <div style="display:flex;flex-direction:column;align-items:center">
                <span style="font-size:2.2rem;font-weight:800" id="score-pct">${score.accuracy}%</span>
                <span style="font-size:.7rem;color:var(--text-muted);font-weight:600;letter-spacing:.06em">ACCURACY</span>
              </div>
            </div>
          </div>
          <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:4px">
            ${score.accuracy >= 80 ? '🏆 Excellent!' : score.accuracy >= 60 ? '👍 Good Job!' : score.accuracy >= 40 ? '📚 Keep Practicing!' : '💪 Keep Going!'}
          </h1>
          <p class="text-muted">
            ${score.total.toFixed(1)} / ${score.maxTotal} points •
            ${fmtTime(score.timeTaken)} taken •
            ${new Date(endTime).toLocaleString()}
          </p>
        </div>

        <!-- Quick stats -->
        <div class="grid-4" style="margin-bottom:var(--sp-xl)">
          ${[
            { num: score.correct,  label: 'Correct',  color: 'var(--color-success)' },
            { num: score.wrong,    label: 'Wrong',    color: 'var(--color-error)'   },
            { num: score.skipped,  label: 'Skipped',  color: 'var(--color-warn)'    },
            { num: quiz.questions.length, label: 'Total Qs', color: 'var(--accent-primary)' },
          ].map(s=>`
            <div class="report-stat-card">
              <div class="report-stat-num" style="color:${s.color}">${s.num}</div>
              <div class="report-stat-label">${s.label}</div>
            </div>`).join('')}
        </div>

        <!-- Action bar -->
        <div style="display:flex;gap:var(--sp-sm);flex-wrap:wrap;margin-bottom:var(--sp-xl);justify-content:center">
          <button class="btn btn-primary" onclick="PageResult.downloadPDF()">📥 Download PDF</button>
          <button class="btn btn-secondary" onclick="PageResult.shareResult()">🔗 Share Result</button>
          <button class="btn btn-secondary" onclick="PageResult.retakeQuiz()">🔁 Retake Quiz</button>
          <button class="btn btn-ghost" onclick="UI.navigate('welcome')">🏠 Home</button>
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

    renderTab(_activeTab, result);
  }

  function switchTab(tab) {
    _activeTab = tab;
    document.querySelectorAll('#result-tabs .tab-btn').forEach(b => b.classList.toggle('active', b.textContent.toLowerCase().includes(tab.replace('-',' '))));
    renderTab(tab, State.get('result'));
  }

  function renderTab(tab, result) {
    const body = document.getElementById('result-tab-body');
    if (!body) return;
    switch(tab) {
      case 'overview':   body.innerHTML = renderOverview(result);    break;
      case 'category':   body.innerHTML = renderCategory(result);    initCategoryChart(result); break;
      case 'difficulty': body.innerHTML = renderDifficulty(result);  initDiffChart(result);     break;
      case 'type':       body.innerHTML = renderTypeTab(result);     initTypeChart(result);     break;
      case 'questions':  body.innerHTML = renderQuestions(result);   break;
      case 'answer-key': body.innerHTML = renderAnswerKey(result);   break;
    }
  }

  // ── OVERVIEW TAB ──────────────────────────────────────────
  function renderOverview(result) {
    const { quiz, score } = result;
    return `
      <div style="display:flex;gap:var(--sp-lg);flex-wrap:wrap">
        <div style="flex:1;min-width:280px">
          <canvas id="chart-overview" height="260"></canvas>
        </div>
        <div style="flex:1;min-width:240px;display:flex;flex-direction:column;gap:var(--sp-sm)">
          ${[
            ['Total Score',    `${score.total.toFixed(1)} / ${score.maxTotal}`],
            ['Accuracy',       `${score.accuracy}%`],
            ['Time Taken',     fmtTime(score.timeTaken)],
            ['Questions',      quiz.questions.length],
            ['Correct',        score.correct],
            ['Wrong',          score.wrong],
            ['Skipped',        score.skipped],
            ['Config',         quiz.config['Quiz Settings Title'] || 'Custom'],
            ['Topics',         (quiz.config._topics || State.get('setup').selectedTopics||[]).join(', ')],
          ].map(([k,v])=>`
            <div style="display:flex;justify-content:space-between;padding:8px var(--sp-md);
                        background:var(--bg-elevated);border-radius:var(--radius-sm)">
              <span class="text-sm text-muted">${k}</span>
              <span class="text-sm font-bold">${v}</span>
            </div>`).join('')}
        </div>
      </div>`;
    // Chart is initialized after render
  }

  // ── CATEGORY TAB ─────────────────────────────────────────
  function renderCategory(result) {
    const cats = result.score.categoryMap;
    return `
      <div>
        <canvas id="chart-category" height="280" style="margin-bottom:var(--sp-lg)"></canvas>
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
    const colors = { easy:'#4ade80', medium:'#fbbf24', hard:'#f87171', unknown:'#94a3b8' };
    return `
      <div>
        <canvas id="chart-diff" height="260" style="margin-bottom:var(--sp-lg)"></canvas>
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
        <canvas id="chart-type" height="260" style="margin-bottom:var(--sp-lg)"></canvas>
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

  // ── Chart inits ───────────────────────────────────────────
  function initOverviewChart(result) {
    const { score } = result;
    const ctx = document.getElementById('chart-overview');
    if (!ctx || !window.Chart) return;
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Correct','Wrong','Skipped'],
        datasets: [{ data: [score.correct, score.wrong, score.skipped],
          backgroundColor:['rgba(74,222,128,.8)','rgba(248,113,113,.8)','rgba(251,191,36,.8)'],
          borderWidth:0, hoverOffset:8 }]
      },
      options: { plugins: { legend: { position:'bottom', labels:{color:'var(--text-secondary)',padding:16} } }, cutout:'65%' }
    });
  }

  function initCategoryChart(result) {
    const cats = result.score.categoryMap;
    const ctx  = document.getElementById('chart-category');
    if (!ctx || !window.Chart) return;
    const labels = Object.keys(cats);
    const acc    = labels.map(k => cats[k].max ? Math.round(cats[k].score/cats[k].max*100) : 0);
    new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label:'Accuracy %', data:acc,
        backgroundColor:'rgba(99,102,241,.7)', borderRadius:8 }] },
      options: {
        responsive:true, plugins:{ legend:{display:false} },
        scales: { y:{ max:100, ticks:{color:'var(--text-secondary)'}, grid:{color:'var(--border-color)'} },
                  x:{ ticks:{color:'var(--text-secondary)'}, grid:{display:false} } }
      }
    });
  }

  function initDiffChart(result) {
    const diffs  = result.score.difficultyMap;
    const ctx    = document.getElementById('chart-diff');
    if (!ctx || !window.Chart) return;
    const labels = Object.keys(diffs);
    const colors = { easy:'rgba(74,222,128,.7)', medium:'rgba(251,191,36,.7)', hard:'rgba(248,113,113,.7)', unknown:'rgba(148,163,184,.7)' };
    new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: 'Accuracy %',
          data: labels.map(d => diffs[d].total ? Math.round(diffs[d].correct/diffs[d].total*100) : 0),
          backgroundColor: 'rgba(99,102,241,.2)',
          borderColor: 'var(--accent-primary)', pointBackgroundColor:'var(--accent-primary)',
        }]
      },
      options: {
        plugins:{ legend:{display:false} },
        scales:{ r:{ min:0, max:100, ticks:{stepSize:20,color:'var(--text-secondary)'},
          grid:{color:'var(--border-color)'}, pointLabels:{color:'var(--text-secondary)'} } }
      }
    });
  }

  function initTypeChart(result) {
    const types = result.score.typeMap;
    const ctx   = document.getElementById('chart-type');
    if (!ctx || !window.Chart) return;
    const labels = Object.keys(types);
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label:'Correct', data: labels.map(t=>types[t].correct), backgroundColor:'rgba(74,222,128,.7)', borderRadius:6 },
          { label:'Wrong',   data: labels.map(t=>types[t].total-types[t].correct), backgroundColor:'rgba(248,113,113,.7)', borderRadius:6 },
        ]
      },
      options: {
        responsive:true, indexAxis:'y',
        plugins:{ legend:{position:'bottom',labels:{color:'var(--text-secondary)'}} },
        scales: {
          x:{ stacked:true, ticks:{color:'var(--text-secondary)'}, grid:{color:'var(--border-color)'} },
          y:{ stacked:true, ticks:{color:'var(--text-secondary)'}, grid:{display:false} }
        }
      }
    });
  }

  // Intercept renderTab to also init charts
  const _origRenderTab = switchTab;

  function downloadPDF() {
    UI.toast('Preparing PDF…', 'info');
    setTimeout(() => {
      window.print();
    }, 300);
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

  // Re-render tab + init chart
  function switchTab(tab) {
    _activeTab = tab;
    document.querySelectorAll('#result-tabs .tab-btn').forEach((b,i) => {
      const tabs = ['overview','category','difficulty','type','questions','answer-key'];
      b.classList.toggle('active', tabs[i] === tab);
    });
    renderTab(tab, State.get('result'));
    setTimeout(() => {
      if (tab === 'overview')   initOverviewChart(State.get('result'));
      if (tab === 'category')   initCategoryChart(State.get('result'));
      if (tab === 'difficulty') initDiffChart(State.get('result'));
      if (tab === 'type')       initTypeChart(State.get('result'));
    }, 50);
  }

  return { render, switchTab, downloadPDF, shareResult, retakeQuiz };
})();

// ── History Page ──────────────────────────────────────────
const PageHistory = (() => {
  function render(main) {
    main.innerHTML = `
      <div style="max-width:860px;margin:0 auto" class="animate-up">
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