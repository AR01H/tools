// ════════════════════════════════════════════════
//  RESULTS MODULE
// ════════════════════════════════════════════════

Router.register("results", function(){
  return '<div class="result-page container"><div id="resultContent">' +
    '<div class="loading-state"><div class="spinner"></div><span>Calculating results…</span></div>' +
  '</div></div>';
});

window.__onRender_results = function(){
  var qs   = State.get("quizQuestions");
  var ans  = State.get("answers");
  var cfg  = State.get("selectedConfig") || {};
  var user = State.get("user");

  // Calculate
  var totalScore = 0, maxScore = 0;
  var correct = 0, wrong = 0, skipped = 0;
  var timeTaken = 0;
  var catStats = {}, diffStats = {};

  qs.forEach(function(q, i){
    var a = ans[i] || {};
    var sc = parseFloat(q.Score||1);
    maxScore += sc;

    var cor = (q["Correct Answer"]||"").split("|").sort().join("|");
    var giv = (a.selected||"").split("|").sort().join("|");
    timeTaken += a.timeTaken || 0;

    if(!a.selected){ skipped++; return; }

    if(cor === giv){
      correct++;
      totalScore += sc;
      a.isCorrect = true;
    } else {
      wrong++;
      if(cfg["Negative Marking"]==="On") totalScore -= parseFloat(q["Negative Score"]||0);
      a.isCorrect = false;
    }
    ans[i] = a;

    // Category breakdown
    var cat = q.Category||"Other";
    if(!catStats[cat]) catStats[cat]={total:0,correct:0,score:0,maxScore:0};
    catStats[cat].total++;
    catStats[cat].maxScore += sc;
    if(a.isCorrect){ catStats[cat].correct++; catStats[cat].score += sc; }

    // Difficulty breakdown
    var diff = (q.Difficulty||"easy").toLowerCase();
    if(!diffStats[diff]) diffStats[diff]={total:0,correct:0};
    diffStats[diff].total++;
    if(a.isCorrect) diffStats[diff].correct++;
  });

  var pct   = maxScore > 0 ? Math.round((totalScore/maxScore)*100) : 0;
  var grade = Utils.grade(pct);

  var startMs = new Date(State.get("startTime")).getTime();
  var endMs   = new Date(State.get("endTime")).getTime();
  var elapsed = Math.round((endMs - startMs)/1000);

  // Build result HTML
  var html = _buildResultHTML({
    pct, grade, totalScore, maxScore, correct, wrong, skipped,
    timeTaken: elapsed, catStats, diffStats, qs, ans, user, cfg
  });

  document.getElementById("resultContent").innerHTML = html;
  _drawScoreRing(pct, grade.color);
  _initResultTabs();
  _drawCategoryChart(catStats);
  _drawDiffChart(diffStats);

  if(cfg["Question Wise Result"]!=="Off"){
    _renderReviewList(qs, ans, cfg);
  }
};

function _buildResultHTML(d){
  var start  = State.get("startTime");
  var end    = State.get("endTime");

  var html = '';

  // Hero
  html += '<div class="result-hero">' +
    '<div class="score-ring-wrap">' +
      '<svg class="score-ring-svg" viewBox="0 0 120 120">' +
        '<defs><linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">' +
          '<stop offset="0%" stop-color="#6c63ff"/><stop offset="100%" stop-color="#06b6d4"/>' +
        '</linearGradient></defs>' +
        '<circle class="score-ring-bg" cx="60" cy="60" r="50"/>' +
        '<circle class="score-ring-fill" id="scoreRing" cx="60" cy="60" r="50" ' +
          'stroke-dasharray="314" stroke-dashoffset="314"/>' +
      '</svg>' +
      '<div class="score-ring-text">' +
        '<div class="score-pct" style="color:'+d.grade.color+'">'+d.pct+'%</div>' +
        '<div class="score-lbl">Score</div>' +
      '</div>' +
    '</div>' +
    '<div class="result-grade" style="color:'+d.grade.color+'">'+d.grade.letter+' — '+d.grade.label+'</div>' +
    '<div class="result-subhead">'+Utils.esc(d.user.name)+' · '+(d.cfg["Quiz Settings Title"]||"Quiz")+'</div>' +
    '<div class="result-stats-row">' +
      '<div class="r-stat"><div class="r-stat-num" style="color:var(--green)">'+d.correct+'</div><div class="r-stat-lbl">Correct</div></div>' +
      '<div class="r-stat"><div class="r-stat-num" style="color:var(--red)">'+d.wrong+'</div><div class="r-stat-lbl">Wrong</div></div>' +
      '<div class="r-stat"><div class="r-stat-num" style="color:var(--text2)">'+d.skipped+'</div><div class="r-stat-lbl">Skipped</div></div>' +
      '<div class="r-stat"><div class="r-stat-num">'+Utils.fmtTime(d.timeTaken)+'</div><div class="r-stat-lbl">Time</div></div>' +
      '<div class="r-stat"><div class="r-stat-num">'+d.totalScore.toFixed(1)+'/'+d.maxScore.toFixed(1)+'</div><div class="r-stat-lbl">Marks</div></div>' +
    '</div>' +
  '</div>';

  // Tabs
  html += '<div class="result-tabs">' +
    '<div class="r-tab active" data-tab="overview">Overview</div>' +
    '<div class="r-tab" data-tab="category">Category</div>' +
    '<div class="r-tab" data-tab="difficulty">Difficulty</div>' +
    (d.cfg["Question Wise Result"]!=="Off" ? '<div class="r-tab" data-tab="review">Review</div>' : '') +
  '</div>';

  // Overview tab
  html += '<div class="r-tab-pane active" id="tab-overview">' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">' +
      _infoCard("Start Time", Utils.fmtDateTime(start)) +
      _infoCard("End Time",   Utils.fmtDateTime(end)) +
      _infoCard("Topics",     State.get("selectedTopics").join(", ")||"—") +
      _infoCard("Mode",       d.cfg["Quiz Settings Title"]||"—") +
      _infoCard("Accuracy",   Math.round((d.correct/d.qs.length)*100)+'%') +
      _infoCard("Avg Time/Q", Math.round(d.timeTaken/d.qs.length)+'s') +
    '</div>' +
    '<canvas id="chartOverview" height="120"></canvas>' +
  '</div>';

  // Category tab
  html += '<div class="r-tab-pane" id="tab-category">' +
    '<canvas id="chartCategory" height="200" style="margin-bottom:20px;"></canvas>' +
    '<div id="catBars"></div>' +
  '</div>';

  // Difficulty tab
  html += '<div class="r-tab-pane" id="tab-difficulty">' +
    '<canvas id="chartDiff" height="200" style="margin-bottom:20px;"></canvas>' +
  '</div>';

  // Review tab
  if(d.cfg["Question Wise Result"]!=="Off"){
    html += '<div class="r-tab-pane" id="tab-review"><div id="reviewList"></div></div>';
  }

  // Action buttons
  html += '<div class="result-actions">' +
    '<button class="btn-secondary" onclick="Router.go(\'topics\');State.resetQuiz();"><i class="fa fa-rotate-left"></i> Retake</button>' +
    '<button class="btn-primary" onclick="Results.downloadPDF()"><i class="fa fa-download"></i> Download PDF</button>' +
    '<button class="btn-ghost" onclick="Results.share()"><i class="fa fa-share-nodes"></i> Share</button>' +
    '<button class="btn-ghost" onclick="Router.go(\'landing\');State.resetQuiz();"><i class="fa fa-house"></i> Home</button>' +
  '</div>';

  return html;
}

function _infoCard(lbl, val){
  return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px;">' +
    '<div style="font-size:.72rem;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">'+lbl+'</div>' +
    '<div style="font-size:.9rem;font-weight:600;color:var(--text);">'+Utils.esc(String(val))+'</div>' +
  '</div>';
}

function _drawScoreRing(pct, color){
  var ring = document.getElementById("scoreRing");
  if(!ring) return;
  var circumference = 2 * Math.PI * 50;
  var offset = circumference - (pct/100)*circumference;
  setTimeout(function(){
    ring.style.strokeDashoffset = offset;
  }, 100);
}

function _initResultTabs(){
  document.querySelectorAll(".r-tab").forEach(function(tab){
    tab.addEventListener("click", function(){
      document.querySelectorAll(".r-tab").forEach(function(t){ t.classList.remove("active"); });
      document.querySelectorAll(".r-tab-pane").forEach(function(p){ p.classList.remove("active"); });
      tab.classList.add("active");
      var pane = document.getElementById("tab-" + tab.dataset.tab);
      if(pane) pane.classList.add("active");
    });
  });
}

function _drawCategoryChart(catStats){
  var catCanvas = document.getElementById("chartCategory");
  if(!catCanvas || typeof Chart === "undefined") return;

  var cats = Object.keys(catStats);
  var colors = ["#6c63ff","#06b6d4","#22c55e","#eab308","#f97316","#ef4444","#a78bfa"];

  new Chart(catCanvas, {
    type: "bar",
    data: {
      labels: cats,
      datasets: [
        {
          label: "Correct",
          data:  cats.map(function(c){ return catStats[c].correct; }),
          backgroundColor: "rgba(34,197,94,.7)", borderRadius:6
        },
        {
          label: "Wrong",
          data:  cats.map(function(c){ return catStats[c].total - catStats[c].correct; }),
          backgroundColor: "rgba(239,68,68,.7)", borderRadius:6
        }
      ]
    },
    options: { responsive:true, plugins:{legend:{labels:{color:"var(--text2)",font:{size:11}}}},
      scales:{x:{ticks:{color:"var(--text2)"},grid:{color:"var(--border)"}}, y:{ticks:{color:"var(--text2)"},grid:{color:"var(--border)"}}} }
  });

  // Category bars
  var barsHtml = cats.map(function(c,i){
    var pct = catStats[c].total ? Math.round((catStats[c].correct/catStats[c].total)*100) : 0;
    var col = colors[i % colors.length];
    return '<div class="cat-bar-item">' +
      '<div class="cat-bar-label"><span class="cat-name">'+Utils.esc(c)+'</span>' +
        '<span class="cat-val">'+catStats[c].correct+'/'+catStats[c].total+' ('+pct+'%)</span></div>' +
      '<div class="cat-bar-wrap"><div class="cat-bar-fill" style="width:'+pct+'%;background:'+col+'"></div></div>' +
    '</div>';
  }).join("");
  var cb = document.getElementById("catBars");
  if(cb) cb.innerHTML = barsHtml;
}

function _drawDiffChart(diffStats){
  var canvas = document.getElementById("chartDiff");
  if(!canvas || typeof Chart === "undefined") return;
  var diffs = Object.keys(diffStats);
  var colMap = {easy:"rgba(34,197,94,.7)",medium:"rgba(234,179,8,.7)",hard:"rgba(249,115,22,.7)",expert:"rgba(239,68,68,.7)"};

  new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: diffs.map(function(d){ return d.charAt(0).toUpperCase()+d.slice(1); }),
      datasets:[{
        data: diffs.map(function(d){ return diffStats[d].total; }),
        backgroundColor: diffs.map(function(d){ return colMap[d]||"rgba(108,99,255,.7)"; }),
        borderWidth: 0
      }]
    },
    options: { responsive:true, plugins:{legend:{labels:{color:"var(--text2)"}}},
      cutout:"65%" }
  });
}

function _renderReviewList(qs, ans, cfg){
  var el = document.getElementById("reviewList");
  if(!el) return;

  var html = qs.map(function(q,i){
    var a   = ans[i] || {};
    var cor = (q["Correct Answer"]||"").split("|").sort().join("|");
    var giv = (a.selected||"").split("|").sort().join("|");
    var isCorrect = a.selected && (cor===giv);
    var cls = !a.selected ? "ri-skipped" : isCorrect ? "ri-correct" : "ri-wrong";
    var icon = !a.selected ? "—" : isCorrect ? '<i class="fa fa-circle-check" style="color:var(--green)"></i>' : '<i class="fa fa-circle-xmark" style="color:var(--red)"></i>';

    return '<div class="review-item '+cls+'">' +
      '<div class="ri-header">' +
        '<span class="ri-num">Q '+(i+1)+'</span>' +
        Utils.diffBadge(q.Difficulty) +
        '<span class="badge badge-cyan">'+Utils.esc(q.Category||"")+'</span>' +
        '<span class="ri-status">'+icon+'</span>' +
      '</div>' +
      '<div class="ri-q">'+Utils.esc(q.Question)+'</div>' +
      '<div class="ri-ans">' +
        'Your answer: <span class="'+(isCorrect?"ra-correct":!a.selected?"":"ra-wrong")+'">'+Utils.esc(a.selected||"Not answered")+'</span>' +
        (!isCorrect && a.selected ? ' &nbsp;·&nbsp; Correct: <span class="ra-correct">'+Utils.esc(q["Correct Answer"])+'</span>' : '') +
      '</div>' +
      (q.Solution ? '<div style="font-size:.78rem;color:var(--text3);margin-top:5px;"><i class="fa fa-info-circle"></i> '+Utils.esc(q.Solution)+'</div>' : '') +
    '</div>';
  }).join("");
  el.innerHTML = html;
}

// Overview donut
window.__onRender_results_charts = function(correct, wrong, skipped){
  var cv = document.getElementById("chartOverview");
  if(!cv || typeof Chart==="undefined") return;
  new Chart(cv,{
    type:"doughnut",
    data:{
      labels:["Correct","Wrong","Skipped"],
      datasets:[{data:[correct,wrong,skipped],backgroundColor:["rgba(34,197,94,.8)","rgba(239,68,68,.8)","rgba(94,100,120,.5)"],borderWidth:0}]
    },
    options:{responsive:true,plugins:{legend:{labels:{color:"var(--text2)"},position:"bottom"}},cutout:"70%"}
  });
};

var Results = {
  downloadPDF: function(){
    showToast("Preparing PDF…");
    setTimeout(function(){
      window.print();
    }, 500);
  },
  share: function(){
    var url = window.location.href;
    if(navigator.share){
      navigator.share({ title:"My Quiz Result", url:url });
    } else {
      navigator.clipboard.writeText(url).then(function(){ showToast("Link copied!"); });
    }
  }
};

// Load Chart.js lazily
(function(){
  if(typeof Chart !== "undefined") return;
  var s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js";
  s.onload = function(){
    // Re-draw if results page is active
    if(State.get("page")==="results") window.__onRender_results();
  };
  document.head.appendChild(s);
})();