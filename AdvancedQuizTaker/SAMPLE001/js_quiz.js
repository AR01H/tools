// ════════════════════════════════════════════════
//  QUIZ ENGINE
// ════════════════════════════════════════════════
var Quiz = {
  launch: function(){
    Router.go("quiz");
  },

  // ── BUILD SHELL ────────────────────────────────
  renderShell: function(){
    var cfg = State.get("selectedConfig") || {};
    var qs  = State.get("quizQuestions");
    var tpl = State.get("template") || "classic";

    var showNav = cfg["Question Navigation"] !== "Sequential";
    var timerHtml = cfg["Quiz Time"] !== "0"
      ? '<div class="qbar-timer" id="qTimer">--:--</div>' : '';

    return '<div class="quiz-shell" data-quiz-tpl="'+tpl+'">' +
      '<div class="quiz-topbar">' +
        '<div class="qbar-meta">' +
          '<div class="qbar-title">'+(cfg["Quiz Settings Title"]||"Quiz")+'</div>' +
          '<div class="qbar-sub" id="qBarSub">Question 1 of '+qs.length+'</div>' +
        '</div>' +
        timerHtml +
        '<button class="btn-icon" title="Submit" onclick="Quiz.confirmSubmit()"><i class="fa fa-flag-checkered"></i></button>' +
      '</div>' +
      '<div class="quiz-progress-line"><div class="quiz-progress-fill" id="qProgress" style="width:0%"></div></div>' +
      '<div class="quiz-body">' +
        '<div class="q-panel" id="qPanel"></div>' +
        (showNav ? '<div class="q-navigator" id="qNavigator">'+Quiz._renderNav()+'</div>' : '') +
      '</div>' +
      '<div class="quiz-actions">' +
        '<div class="qa-left">' +
          (cfg["Allow Back"]==="On" ? '<button class="btn-secondary" id="btnPrev" onclick="Quiz.prev()"><i class="fa fa-chevron-left"></i></button>' : '') +
          (cfg["Show Hint"]==="On"  ? '<button class="btn-ghost" onclick="Quiz.toggleHint()"><i class="fa fa-lightbulb"></i> Hint</button>' : '') +
          (cfg["Mark for Review"]==="On" ? '<button class="btn-ghost" id="btnMark" onclick="Quiz.toggleMark()"><i class="fa fa-bookmark"></i></button>' : '') +
          (cfg["Pause / Resume Allowed"]==="On" ? '<button class="btn-ghost" id="btnPause" onclick="Quiz.togglePause()"><i class="fa fa-pause"></i></button>' : '') +
        '</div>' +
        '<div class="qa-right">' +
          '<button class="btn-primary" id="btnNext" onclick="Quiz.next()">Next <i class="fa fa-chevron-right"></i></button>' +
        '</div>' +
      '</div>' +
      Quiz._submitModal() +
    '</div>';
  },

  _submitModal: function(){
    return '<div class="modal-overlay hidden" id="submitModal">' +
      '<div class="modal-box">' +
        '<div class="modal-title">Submit Quiz?</div>' +
        '<div class="modal-text">You are about to submit your quiz. Review your progress:</div>' +
        '<div class="modal-stats" id="modalStats"></div>' +
        '<div class="modal-actions">' +
          '<button class="btn-secondary" onclick="Quiz.closeModal()">Go Back</button>' +
          '<button class="btn-primary" onclick="Quiz.submitFinal()"><i class="fa fa-check"></i> Submit</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  },

  // ── RENDER QUESTION ────────────────────────────
  renderQuestion: function(idx){
    var qs  = State.get("quizQuestions");
    var cfg = State.get("selectedConfig") || {};
    var q   = qs[idx];
    if(!q) return;

    State.set("questionStartTime", Date.now());
    State.set("currentIndex", idx);

    // Update topbar
    var sub = document.getElementById("qBarSub");
    if(sub) sub.textContent = "Question "+(idx+1)+" of "+qs.length;

    // Progress
    var prog = document.getElementById("qProgress");
    if(prog) prog.style.width = Math.round((idx/qs.length)*100) + "%";

    // Panel
    var ans = (State.get("answers")[idx] || {});
    var html = '';

    if(q.Passage){ html += '<div class="q-passage"><strong>Passage:</strong> '+Utils.esc(q.Passage)+'</div>'; }

    html += '<div class="q-counter">Q '+(idx+1)+' / '+qs.length+'  &nbsp;|&nbsp; '+Utils.diffBadge(q.Difficulty)+
      '  &nbsp;<span class="badge badge-cyan">'+Utils.esc(q["Question Type"]||"")+'</span>'+
      (q.Score ? '  &nbsp;<span style="font-size:.75rem;color:var(--text2)">'+q.Score+' pts</span>' : '') +
      (cfg["Negative Marking"]==="On" && q["Negative Score"] ? '  <span style="font-size:.75rem;color:var(--red)">-'+q["Negative Score"]+'</span>' : '') +
    '</div>';

    if(q["Time Limit"] && q["Time Limit"] !== "0"){
      html += '<div style="font-size:.72rem;color:var(--text3);margin-bottom:8px;"><i class="fa fa-clock"></i> Suggested: '+q["Time Limit"]+'s</div>';
    }

    html += '<div class="q-text">'+Utils.esc(q.Question)+'</div>';

    // Options by type
    var qtype = (q["Question Type"]||"").toLowerCase();
    var locked = !!(ans.instantDone && cfg["Instant Answer"]==="On");

    if(qtype.includes("multichoice") || qtype.includes("multi multichoice")){
      html += Quiz._renderMC(q, ans, locked, qtype.includes("multi "));
    } else if(qtype === "true/false"){
      html += Quiz._renderTF(q, ans, locked);
    } else if(qtype === "sequence"){
      html += Quiz._renderSeq(q, ans);
    } else if(qtype === "short answer"){
      html += Quiz._renderShort(q, ans);
    } else {
      html += Quiz._renderMC(q, ans, locked, false);
    }

    // Hint
    if(ans.hintShown && q.Hint){
      html += '<div class="hint-box"><i class="fa fa-lightbulb"></i> '+Utils.esc(q.Hint)+'</div>';
    }

    // Instant feedback
    if(ans.instantDone){
      var fb = ans.isCorrect
        ? '<div class="instant-feedback correct"><i class="fa fa-circle-check"></i> <strong>Correct!</strong>' +
          (q.Solution ? '<div class="fb-solution">'+Utils.esc(q.Solution)+'</div>' : '') + '</div>'
        : '<div class="instant-feedback wrong"><i class="fa fa-circle-xmark"></i> <strong>Incorrect.</strong> Correct: '+Utils.esc(q["Correct Answer"])+
          (q.Solution ? '<div class="fb-solution">'+Utils.esc(q.Solution)+'</div>' : '') + '</div>';
      html += fb;
    }

    document.getElementById("qPanel").innerHTML = html;
    Quiz._updateActions(idx, ans);
    Quiz._updateNav();
    Quiz._bindSeqDrag();
    Quiz._bindMark(ans);
  },

  _renderMC: function(q, ans, locked, multi){
    var choices = [q.Choice1,q.Choice2,q.Choice3,q.Choice4].filter(Boolean);
    var selected = ans.selected ? ans.selected.split("|") : [];
    var correct  = (q["Correct Answer"]||"").split("|");
    var html = '<div class="options-list">';
    var letters = ["A","B","C","D"];
    choices.forEach(function(c,i){
      var isSel = selected.indexOf(c) >= 0;
      var cls   = "option-item";
      if(locked){
        if(correct.indexOf(c) >= 0) cls += " correct";
        else if(isSel) cls += " wrong";
        cls += " locked";
      } else if(isSel){
        cls += " selected";
      }
      html += '<div class="'+cls+'" onclick="Quiz.selectOption(this,\''+Utils.esc(c)+'\','+multi+')">' +
        '<div class="option-letter">'+letters[i]+'</div>' +
        '<div class="option-text">'+Utils.esc(c)+'</div>' +
      '</div>';
    });
    return html + '</div>';
  },

  _renderTF: function(q, ans, locked){
    var sel = ans.selected || "";
    var html = '<div class="tf-options">';
    ["TRUE","FALSE"].forEach(function(v){
      var isSel = sel === v;
      var cls = "tf-btn " + v.toLowerCase() + "-btn" + (isSel ? " selected" : "") + (locked ? " locked" : "");
      html += '<button class="'+cls+'" onclick="Quiz.selectTF(\''+v+'\')">' +
        '<i class="fa fa-'+(v==="TRUE"?"check":"times")+'"></i> '+v+
      '</button>';
    });
    return html + '</div>';
  },

  _renderSeq: function(q, ans){
    var items = ans.seqOrder || [q.Choice1,q.Choice2,q.Choice3,q.Choice4].filter(Boolean);
    var html = '<div id="seqList">';
    items.forEach(function(item,i){
      html += '<div class="seq-item" draggable="true" data-idx="'+i+'">' +
        '<span class="seq-handle"><i class="fa fa-grip-vertical"></i></span>' +
        '<span class="seq-num">'+(i+1)+'</span>' +
        '<span class="seq-text">'+Utils.esc(item)+'</span>' +
      '</div>';
    });
    return html + '</div><p style="font-size:.78rem;color:var(--text3);margin-top:8px;"><i class="fa fa-hand"></i> Drag to reorder</p>';
  },

  _renderShort: function(q, ans){
    return '<textarea class="short-answer-input" id="shortAns" placeholder="Type your answer here…" oninput="Quiz.saveShort()">' +
      Utils.esc(ans.selected||"") + '</textarea>';
  },

  _updateActions: function(idx, ans){
    var qs  = State.get("quizQuestions");
    var cfg = State.get("selectedConfig") || {};
    var btnNext = document.getElementById("btnNext");
    var btnPrev = document.getElementById("btnPrev");
    if(btnPrev) btnPrev.disabled = (idx === 0);
    if(btnNext){
      if(idx === qs.length-1){
        btnNext.innerHTML = '<i class="fa fa-flag-checkered"></i> Submit';
        btnNext.onclick = function(){ Quiz.confirmSubmit(); };
      } else {
        btnNext.innerHTML = 'Next <i class="fa fa-chevron-right"></i>';
        btnNext.onclick = function(){ Quiz.next(); };
      }
    }
    var btnMark = document.getElementById("btnMark");
    if(btnMark) btnMark.style.color = ans.marked ? "var(--yellow)" : "";
  },

  _bindMark: function(ans){
    var btnMark = document.getElementById("btnMark");
    if(btnMark) btnMark.style.color = ans.marked ? "var(--yellow)" : "";
  },

  _renderNav: function(){
    var qs = State.get("quizQuestions");
    var ans= State.get("answers");
    var cur= State.get("currentIndex");
    var html = '<div class="qnav-title">Navigator</div><div class="qnav-grid">';
    qs.forEach(function(q,i){
      var a = ans[i] || {};
      var cls = "qnav-item";
      if(i === cur)        cls += " current";
      else if(a.marked)    cls += " marked";
      else if(a.selected)  cls += " answered";
      html += '<button class="'+cls+'" onclick="Quiz.jumpTo('+i+')">'+(i+1)+'</button>';
    });
    html += '</div>' +
      '<div class="qnav-legend">' +
        '<div class="qnav-leg-item"><div class="qnav-leg-dot" style="background:var(--accent)"></div>Current</div>' +
        '<div class="qnav-leg-item"><div class="qnav-leg-dot" style="background:var(--green)"></div>Answered</div>' +
        '<div class="qnav-leg-item"><div class="qnav-leg-dot" style="background:var(--yellow)"></div>Marked</div>' +
        '<div class="qnav-leg-item"><div class="qnav-leg-dot" style="background:var(--surface2)"></div>Skipped</div>' +
      '</div>';
    return html;
  },

  _updateNav: function(){
    var nav = document.getElementById("qNavigator");
    if(nav) nav.innerHTML = Quiz._renderNav();
  },

  // ── INTERACTIONS ────────────────────────────────
  selectOption: function(el, val, multi){
    var cfg  = State.get("selectedConfig") || {};
    var idx  = State.get("currentIndex");
    var ans  = State.get("answers")[idx] || {};
    if(ans.instantDone) return;

    var opts = document.querySelectorAll(".option-item");
    var q    = State.get("quizQuestions")[idx];

    if(multi){
      el.classList.toggle("selected");
      var sels = [];
      opts.forEach(function(o){ if(o.classList.contains("selected")) sels.push(o.querySelector(".option-text").textContent); });
      ans.selected = sels.join("|");
    } else {
      opts.forEach(function(o){ o.classList.remove("selected"); });
      el.classList.add("selected");
      ans.selected = val;
    }

    ans.timeTaken = Math.round((Date.now() - State.get("questionStartTime"))/1000);
    State.get("answers")[idx] = ans;

    // Instant answer
    if(cfg["Instant Answer"]==="On"){
      var correct = (q["Correct Answer"]||"").split("|").sort().join("|");
      var given   = (ans.selected||"").split("|").sort().join("|");
      ans.isCorrect = (correct === given);
      ans.instantDone = true;
      State.get("answers")[idx] = ans;
      Quiz.renderQuestion(idx);
      Quiz._saveResponse(idx, ans, q);
      if(cfg["Auto Next Question"]==="On"){
        setTimeout(function(){ Quiz.next(); }, 1200);
      }
    } else {
      // Don't Change Until Correct
      if(cfg["Don't Change Until Correct"]==="On"){
        var cor = (q["Correct Answer"]||"").split("|").sort().join("|");
        var giv = (ans.selected||"").split("|").sort().join("|");
        if(cor !== giv){ showToast("Incorrect — try again"); ans.selected=""; }
      }
    }
  },

  selectTF: function(val){
    var idx = State.get("currentIndex");
    var ans = State.get("answers")[idx] || {};
    var cfg = State.get("selectedConfig") || {};
    if(ans.instantDone) return;
    ans.selected = val;
    ans.timeTaken = Math.round((Date.now() - State.get("questionStartTime"))/1000);
    State.get("answers")[idx] = ans;
    if(cfg["Instant Answer"]==="On"){
      var q = State.get("quizQuestions")[idx];
      ans.isCorrect = (val === q["Correct Answer"]);
      ans.instantDone = true;
      Quiz.renderQuestion(idx);
      Quiz._saveResponse(idx, ans, q);
    } else {
      Quiz.renderQuestion(idx);
    }
  },

  saveShort: function(){
    var idx = State.get("currentIndex");
    var ans = State.get("answers")[idx] || {};
    var el  = document.getElementById("shortAns");
    if(el){
      ans.selected  = el.value;
      ans.timeTaken = Math.round((Date.now() - State.get("questionStartTime"))/1000);
      State.get("answers")[idx] = ans;
    }
  },

  toggleHint: function(){
    var idx = State.get("currentIndex");
    var ans = State.get("answers")[idx] || {};
    ans.hintShown = !ans.hintShown;
    State.get("answers")[idx] = ans;
    Quiz.renderQuestion(idx);
  },

  toggleMark: function(){
    var idx = State.get("currentIndex");
    var ans = State.get("answers")[idx] || {};
    ans.marked = !ans.marked;
    State.get("answers")[idx] = ans;
    Quiz._updateNav();
    var btn = document.getElementById("btnMark");
    if(btn) btn.style.color = ans.marked ? "var(--yellow)" : "";
  },

  togglePause: function(){
    var paused = !State.get("paused");
    State.set("paused", paused);
    if(paused){
      clearInterval(State.get("timerInterval"));
      document.getElementById("qPanel").innerHTML = '<div style="text-align:center;padding:60px 20px;"><div style="font-size:3rem;">⏸</div><p style="color:var(--text2);margin-top:12px;">Quiz Paused</p><button class="btn-primary" style="margin-top:20px;" onclick="Quiz.togglePause()">Resume</button></div>';
    } else {
      Quiz._startTimer();
      Quiz.renderQuestion(State.get("currentIndex"));
    }
    var btn = document.getElementById("btnPause");
    if(btn) btn.innerHTML = paused ? '<i class="fa fa-play"></i>' : '<i class="fa fa-pause"></i>';
  },

  next: function(){
    var cfg = State.get("selectedConfig") || {};
    var idx = State.get("currentIndex");
    var ans = State.get("answers")[idx] || {};
    var q   = State.get("quizQuestions")[idx];

    if(cfg["Mandatory Answer"]==="On" && !ans.selected){ showToast("Please answer before continuing"); return; }

    // Save response if not already saved
    if(!ans.saved){ Quiz._saveResponse(idx, ans, q); ans.saved=true; State.get("answers")[idx]=ans; }

    var qs = State.get("quizQuestions");
    if(idx < qs.length-1){ Quiz.renderQuestion(idx+1); }
    else { Quiz.confirmSubmit(); }
  },

  prev: function(){
    var idx = State.get("currentIndex");
    if(idx > 0) Quiz.renderQuestion(idx-1);
  },

  jumpTo: function(i){ Quiz.renderQuestion(i); },

  _saveResponse: function(idx, ans, q){
    var fileId = State.get("attemptFileId");
    if(!fileId) return;
    API.saveResponse(fileId, {
      question:    q.Question,
      selected:    ans.selected || "",
      correct:     q["Correct Answer"],
      isCorrect:   !!ans.isCorrect,
      timeTaken:   ans.timeTaken || 0,
      marks:       ans.isCorrect ? parseFloat(q.Score||0) : -parseFloat(q["Negative Score"]||0),
      category:    q.Category,
      subCategory: q["Sub Category"],
      difficulty:  q.Difficulty
    });
  },

  // ── TIMER ──────────────────────────────────────
  _startTimer: function(){
    var cfg = State.get("selectedConfig") || {};
    var totalSec = parseInt(cfg["Quiz Time"]||0);
    if(!totalSec) return;

    if(!State.get("timeRemaining")) State.set("timeRemaining", totalSec);
    clearInterval(State.get("timerInterval"));

    var iv = setInterval(function(){
      if(State.get("paused")) return;
      var t = State.get("timeRemaining") - 1;
      State.set("timeRemaining", t);
      var el = document.getElementById("qTimer");
      if(el){
        el.textContent = Utils.fmtTime(t);
        el.className = "qbar-timer" + (t < 60 ? " urgent" : t < 300 ? " warn" : "");
      }
      if(t <= 0){
        clearInterval(iv);
        showToast("Time's up! Submitting…");
        setTimeout(function(){ Quiz.submitFinal(); }, 1000);
      }
    }, 1000);
    State.set("timerInterval", iv);
  },

  // ── SUBMIT ─────────────────────────────────────
  confirmSubmit: function(){
    var qs   = State.get("quizQuestions");
    var ans  = State.get("answers");
    var answered = Object.keys(ans).filter(function(k){ return ans[k].selected; }).length;
    var marked   = Object.keys(ans).filter(function(k){ return ans[k].marked; }).length;

    document.getElementById("modalStats").innerHTML =
      '<div class="modal-stat"><div class="ms-num">'+qs.length+'</div><div class="ms-label">Total</div></div>' +
      '<div class="modal-stat"><div class="ms-num" style="color:var(--green)">'+answered+'</div><div class="ms-label">Answered</div></div>' +
      '<div class="modal-stat"><div class="ms-num" style="color:var(--yellow)">'+marked+'</div><div class="ms-label">Marked</div></div>' +
      '<div class="modal-stat"><div class="ms-num" style="color:var(--red)">'+(qs.length-answered)+'</div><div class="ms-label">Skipped</div></div>';

    document.getElementById("submitModal").classList.remove("hidden");
  },

  closeModal: function(){
    document.getElementById("submitModal").classList.add("hidden");
  },

  submitFinal: function(){
    clearInterval(State.get("timerInterval"));
    var endTime = new Date().toISOString();
    State.set("endTime", endTime);
    State.set("quizComplete", true);

    // Calculate score
    var qs  = State.get("quizQuestions");
    var ans = State.get("answers");
    var cfg = State.get("selectedConfig") || {};
    var score = 0;
    qs.forEach(function(q,i){
      var a = ans[i] || {};
      if(!a.selected) return;
      var correct = (q["Correct Answer"]||"").split("|").sort().join("|");
      var given   = (a.selected||"").split("|").sort().join("|");
      if(correct === given){
        score += parseFloat(q.Score||1);
      } else if(cfg["Negative Marking"]==="On"){
        score -= parseFloat(q["Negative Score"]||0);
      }
    });

    API.completeSession({
      studentName:  State.get("user").name,
      startTime:    State.get("startTime"),
      endTime:      endTime,
      score:        score,
      attemptFileId:State.get("attemptFileId")
    });

    // Show results if configured
    if(cfg["Final Result"] !== "Off"){
      Router.go("results");
    } else {
      Router.go("landing");
      showToast("Quiz submitted! Score: " + score);
    }
  },

  // ── SEQUENCE DRAG ──────────────────────────────
  _bindSeqDrag: function(){
    var list = document.getElementById("seqList");
    if(!list) return;
    var dragging = null;
    list.querySelectorAll(".seq-item").forEach(function(item){
      item.addEventListener("dragstart",function(){ dragging = this; });
      item.addEventListener("dragover", function(e){ e.preventDefault(); this.classList.add("drag-over"); });
      item.addEventListener("dragleave",function(){ this.classList.remove("drag-over"); });
      item.addEventListener("drop",function(e){
        e.preventDefault(); this.classList.remove("drag-over");
        if(dragging && dragging !== this){
          var items = Array.from(list.children);
          var fromI = items.indexOf(dragging);
          var toI   = items.indexOf(this);
          if(fromI < toI) list.insertBefore(dragging, this.nextSibling);
          else            list.insertBefore(dragging, this);
          // Update answer
          var idx = State.get("currentIndex");
          var seqOrder = Array.from(list.querySelectorAll(".seq-text")).map(function(s){ return s.textContent; });
          var ans = State.get("answers")[idx] || {};
          ans.selected  = seqOrder.join("|");
          ans.seqOrder  = seqOrder;
          ans.timeTaken = Math.round((Date.now()-State.get("questionStartTime"))/1000);
          State.get("answers")[idx] = ans;
          // Update numbers
          list.querySelectorAll(".seq-num").forEach(function(n,ni){ n.textContent = ni+1; });
        }
      });
    });
  }
};

// ── REGISTER QUIZ PAGE ─────────────────────────
Router.register("quiz", function(){
  return Quiz.renderShell();
});

window.__onRender_quiz = function(){
  Quiz.renderQuestion(0);
  Quiz._startTimer();
};
