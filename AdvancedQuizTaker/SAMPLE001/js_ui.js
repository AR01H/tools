// ════════════════════════════════════════════════
//  UI MODULE – Pages: landing, topics, filters, config
// ════════════════════════════════════════════════
var UI = {
  // ── SETTINGS ──────────────────────────────────
  openSettings: function(){
    document.getElementById("settingsPanel").classList.add("open");
    document.getElementById("settingsOverlay").classList.remove("hidden");
  },
  closeSettings: function(){
    document.getElementById("settingsPanel").classList.remove("open");
    document.getElementById("settingsOverlay").classList.add("hidden");
  },
  saveSettings: function(){
    var fid = document.getElementById("spFolderId").value.trim();
    var sid = document.getElementById("spScriptId").value.trim();
    var msg = document.getElementById("spMsg");
    API.saveConfig(fid, sid).then(function(r){
      msg.className = "sp-msg ok";
      msg.textContent = "✓ Saved successfully";
      setTimeout(function(){ msg.textContent=""; }, 2500);
    }).catch(function(e){
      msg.className = "sp-msg err";
      msg.textContent = "Error: " + e;
    });
  },
  resetSettings: function(){
    API.resetConfig().then(function(){
      document.getElementById("spFolderId").value = "";
      document.getElementById("spScriptId").value = "";
      var msg = document.getElementById("spMsg");
      msg.className = "sp-msg ok";
      msg.textContent = "✓ Reset to defaults";
    });
  },
  setTheme: function(t){
    State.set("theme", t);
    document.body.classList.remove("theme-dark","theme-light");
    document.body.classList.add("theme-" + t);
    document.getElementById("btnDark").classList.toggle("active", t === "dark");
    document.getElementById("btnLight").classList.toggle("active", t === "light");
    State.save();
  },
  setTemplate: function(tpl){
    State.set("template", tpl);
    document.querySelectorAll(".tpl-btn").forEach(function(b){
      b.classList.toggle("active", b.dataset.tpl === tpl);
    });
    State.save();
    showToast("Template: " + tpl);
  },
  copyShareLink: function(){
    var url = window.location.href;
    navigator.clipboard.writeText(url).then(function(){
      showToast("Share link copied!");
    }).catch(function(){
      showToast("Link: " + url);
    });
  }
};

// ══ PAGE: LANDING ════════════════════════════════
Router.register("landing", function(){
  var u = State.get("user");
  return '<div class="landing-wrap"><div class="landing-card">' +
    '<div class="landing-header">' +
      '<div class="landing-logo">QuizMaster Pro</div>' +
      '<p class="landing-subtitle">Adaptive · Intelligent · Competitive</p>' +
    '</div>' +
    '<div class="landing-body">' +
      '<div class="form-group"><label class="form-label">Your Name</label>' +
        '<input class="form-input" id="uName" type="text" placeholder="e.g. Arjun Sharma" value="' + Utils.esc(u.name) + '"/></div>' +
      '<div class="form-group"><label class="form-label">Date of Birth</label>' +
        '<input class="form-input" id="uDob" type="date" value="' + Utils.esc(u.dob) + '"/></div>' +
      '<div class="form-group"><label class="form-label">Phone / Email</label>' +
        '<input class="form-input" id="uContact" type="text" placeholder="e.g. 9876543210 or you@email.com" value="' + Utils.esc(u.contact) + '"/></div>' +
    '</div>' +
    '<div class="landing-footer">' +
      '<button class="btn-primary" style="width:100%;justify-content:center;font-size:1rem;padding:13px;" onclick="Pages.landingNext()">' +
        '<i class="fa fa-arrow-right"></i> Continue to Quiz Setup</button>' +
    '</div>' +
  '</div></div>';
});

var Pages = {
  landingNext: function(){
    var name    = (document.getElementById("uName").value||"").trim();
    var dob     = (document.getElementById("uDob").value||"").trim();
    var contact = (document.getElementById("uContact").value||"").trim();
    if(!name){ showToast("Please enter your name"); return; }
    State.set("user", {name:name, dob:dob, contact:contact});
    State.save();
    Router.go("topics");
  },

  // ══ PAGE: TOPICS ════════════════════════════════
  goTopics: function(){
    Router.go("topics");
  }
};

// ══ PAGE: TOPICS ═════════════════════════════════
Router.register("topics", function(){
  return '<div class="step-page">' +
    _stepNav(1) +
    '<div class="container">' +
      '<div class="step-header"><div class="step-title">Select Quiz Topics</div>' +
        '<div class="step-subtitle">Choose one or more topics for your quiz</div></div>' +
      '<div id="topicsContent"><div class="loading-state"><div class="spinner"></div><span>Loading topics…</span></div></div>' +
    '</div>' +
    '<div class="sticky-footer">' +
      '<span class="progress-info" id="topicCount">0 topics selected</span>' +
      '<div style="display:flex;gap:10px;">' +
        '<button class="btn-secondary" onclick="Router.go(\'landing\')"><i class="fa fa-arrow-left"></i> Back</button>' +
        '<button class="btn-primary" id="btnTopicNext" disabled onclick="Pages.topicsNext()">Continue <i class="fa fa-arrow-right"></i></button>' +
      '</div>' +
    '</div>' +
  '</div>';
});

window.__onRender_topics = function(){
  API.getTopics().then(function(res){
    if(!res.success){ document.getElementById("topicsContent").innerHTML='<p style="color:var(--red)">Error: '+res.error+'</p>'; return; }
    var html = '<div class="topic-grid">';
    res.topics.forEach(function(t){
      html += '<div class="topic-card" data-name="'+Utils.esc(t.name)+'" onclick="Pages.toggleTopic(this)">' +
        '<div class="t-icon">'+Utils.topicIcon(t.name)+'</div>' +
        '<div class="t-name">'+Utils.esc(t.name)+'</div>' +
        '<div class="t-check"><i class="fa fa-check"></i></div>' +
      '</div>';
    });
    html += '</div>';
    document.getElementById("topicsContent").innerHTML = html;
    // Restore selections
    State.get("selectedTopics").forEach(function(n){
      var el = document.querySelector('[data-name="'+n+'"]');
      if(el) el.classList.add("selected");
    });
    Pages._updateTopicBtn();
  });
};

Pages.toggleTopic = function(el){
  el.classList.toggle("selected");
  var name = el.dataset.name;
  Utils.toggleArr(State.get("selectedTopics"), name);
  Pages._updateTopicBtn();
};
Pages._updateTopicBtn = function(){
  var n = State.get("selectedTopics").length;
  document.getElementById("topicCount").textContent = n + (n===1?" topic":" topics") + " selected";
  document.getElementById("btnTopicNext").disabled = (n === 0);
};
Pages.topicsNext = function(){
  if(!State.get("selectedTopics").length){ showToast("Select at least one topic"); return; }
  Router.go("filters");
};

// ══ PAGE: FILTERS ═════════════════════════════════
Router.register("filters", function(){
  return '<div class="step-page">' +
    _stepNav(2) +
    '<div class="container">' +
      '<div class="step-header"><div class="step-title">Filter Questions</div>' +
        '<div class="step-subtitle">Narrow down by category, difficulty & more</div></div>' +
      '<div id="filtersContent"><div class="loading-state"><div class="spinner"></div><span>Loading metadata…</span></div></div>' +
    '</div>' +
    '<div class="sticky-footer">' +
      '<button class="btn-secondary" onclick="Router.go(\'topics\')"><i class="fa fa-arrow-left"></i> Back</button>' +
      '<button class="btn-primary" onclick="Pages.filtersNext()">Continue <i class="fa fa-arrow-right"></i></button>' +
    '</div>' +
  '</div>';
});

window.__onRender_filters = function(){
  var topics = State.get("selectedTopics");
  API.getFilterMeta(topics).then(function(meta){
    if(!meta.success){ document.getElementById("filtersContent").innerHTML='<p style="color:var(--red)">'+meta.error+'</p>'; return; }
    State.set("filterMeta", meta);
    _renderFilters(meta);
  });
};

function _renderFilters(meta){
  var html = '';

  // Category + Sub-category
  html += '<div class="section-card">' +
    '<div class="section-card-title"><i class="fa fa-tags"></i> Categories</div>' +
    '<div class="form-group">' +
      '<label class="form-label">Category <small>(all if none selected)</small></label>' +
      '<div class="chips-group" id="chipsCat">' +
        '<div class="chip all-chip" data-val="__all__" onclick="Pages.toggleChip(this,\'cat\')">All Categories</div>' +
        meta.categories.map(function(c){ return '<div class="chip" data-val="'+Utils.esc(c)+'" onclick="Pages.toggleChip(this,\'cat\')">'+Utils.esc(c)+'</div>'; }).join("") +
      '</div>' +
    '</div>' +
    '<div class="form-group" id="subCatWrap" style="display:none">' +
      '<label class="form-label">Sub-Category</label>' +
      '<div class="chips-group" id="chipsSubCat"></div>' +
    '</div>' +
  '</div>';

  // Difficulty
  html += '<div class="section-card">' +
    '<div class="section-card-title"><i class="fa fa-gauge-high"></i> Difficulty</div>' +
    '<div class="chips-group" id="chipsDiff">' +
      '<div class="chip all-chip selected" data-val="__all__" onclick="Pages.toggleChip(this,\'diff\')">All Levels</div>' +
      meta.difficulties.map(function(d){ return '<div class="chip" data-val="'+d+'" onclick="Pages.toggleChip(this,\'diff\')">'+Utils.esc(d.charAt(0).toUpperCase()+d.slice(1))+'</div>'; }).join("") +
    '</div>' +
  '</div>';

  // Question Types
  html += '<div class="section-card">' +
    '<div class="section-card-title"><i class="fa fa-list-check"></i> Question Types</div>' +
    '<div class="chips-group" id="chipsQType">' +
      '<div class="chip all-chip selected" data-val="__all__" onclick="Pages.toggleChip(this,\'qtype\')">All Types</div>' +
      meta.questionTypes.map(function(qt){ return '<div class="chip" data-val="'+Utils.esc(qt)+'" onclick="Pages.toggleChip(this,\'qtype\')">'+Utils.esc(qt)+'</div>'; }).join("") +
    '</div>' +
  '</div>';

  // Tags
  if(meta.tags && meta.tags.length){
    html += '<div class="section-card">' +
      '<div class="section-card-title"><i class="fa fa-hashtag"></i> Tags</div>' +
      '<div class="chips-group" id="chipsTags">' +
        '<div class="chip all-chip selected" data-val="__all__" onclick="Pages.toggleChip(this,\'tag\')">All Tags</div>' +
        meta.tags.map(function(tg){ return '<div class="chip" data-val="'+Utils.esc(tg)+'" onclick="Pages.toggleChip(this,\'tag\')">'+Utils.esc(tg)+'</div>'; }).join("") +
      '</div>' +
    '</div>';
  }

  // Question Count
  html += '<div class="section-card">' +
    '<div class="section-card-title"><i class="fa fa-hashtag"></i> Question Count</div>' +
    '<div class="form-group"><label class="form-label">Number of Questions</label>' +
      '<input class="form-input" id="qCount" type="number" min="1" max="200" value="'+State.get("questionCount")+'" style="max-width:140px;"/>' +
    '</div>' +
  '</div>';

  document.getElementById("filtersContent").innerHTML = html;
}

Pages.toggleChip = function(el, group){
  var val = el.dataset.val;
  var wrap = {cat:"#chipsCat", diff:"#chipsDiff", qtype:"#chipsQType", tag:"#chipsTags"}[group];
  var chips = document.querySelectorAll(wrap + " .chip");

  if(val === "__all__"){
    chips.forEach(function(c){ c.classList.remove("selected"); });
    el.classList.add("selected");
    // Clear specific arrays
    if(group==="cat"){ State.set("selectedCategories",[]); State.set("selectedSubCats",[]); _updateSubCats([]); }
    if(group==="diff") State.set("selectedDifficulties",[]);
    if(group==="qtype") State.set("selectedQTypes",[]);
    if(group==="tag")  State.set("selectedTags",[]);
    return;
  }

  // Deselect "All"
  var allChip = document.querySelector(wrap + ' [data-val="__all__"]');
  if(allChip) allChip.classList.remove("selected");
  el.classList.toggle("selected");

  // Update state
  var arrMap = { cat:"selectedCategories", diff:"selectedDifficulties", qtype:"selectedQTypes", tag:"selectedTags" };
  var arr = State.get(arrMap[group]) || [];
  Utils.toggleArr(arr, val);
  State.set(arrMap[group], arr);

  if(group==="cat") _updateSubCats(arr);
};

function _updateSubCats(cats){
  var wrap = document.getElementById("subCatWrap");
  var meta = State.get("filterMeta");
  if(!meta || !cats.length){ if(wrap) wrap.style.display="none"; return; }
  wrap.style.display = "block";
  var subs = [];
  cats.forEach(function(c){ (meta.categorySubMap[c]||[]).forEach(function(s){ if(subs.indexOf(s)<0) subs.push(s); }); });
  var html = '<div class="chip all-chip selected" data-val="__all__" onclick="Pages.toggleChip(this,\'subcat\')">All</div>' +
    subs.map(function(s){ return '<div class="chip" data-val="'+Utils.esc(s)+'" onclick="Pages.toggleChip(this,\'subcat\')">'+Utils.esc(s)+'</div>'; }).join("");
  document.getElementById("chipsSubCat").innerHTML = html;
}

Pages.filtersNext = function(){
  var n = parseInt(document.getElementById("qCount").value)||20;
  State.set("questionCount", Math.max(1,n));
  Router.go("quizconfig");
};

// ══ PAGE: QUIZ CONFIG ══════════════════════════════
Router.register("quizconfig", function(){
  return '<div class="step-page">' +
    _stepNav(3) +
    '<div class="container">' +
      '<div class="step-header"><div class="step-title">Quiz Configuration</div>' +
        '<div class="step-subtitle">Choose a preset or build a custom config</div></div>' +
      '<div id="cfgContent"><div class="loading-state"><div class="spinner"></div><span>Loading configurations…</span></div></div>' +
    '</div>' +
    '<div class="sticky-footer">' +
      '<button class="btn-secondary" onclick="Router.go(\'filters\')"><i class="fa fa-arrow-left"></i> Back</button>' +
      '<button class="btn-primary" id="btnStartQuiz" onclick="Pages.startQuiz()"><i class="fa fa-play"></i> Start Quiz</button>' +
    '</div>' +
  '</div>';
});

window.__onRender_quizconfig = function(){
  Promise.all([
    API.getQuizConfigs(),
    API.getQuestions(State.get("selectedTopics"))
  ]).then(function(results){
    var cfgRes = results[0];
    var qRes   = results[1];

    if(!qRes.success){ document.getElementById("cfgContent").innerHTML='<p style="color:var(--red)">'+qRes.error+'</p>'; return; }
    State.set("allQuestions", qRes.questions);

    if(!cfgRes.success){ document.getElementById("cfgContent").innerHTML='<p style="color:var(--red)">'+cfgRes.error+'</p>'; return; }
    State.set("quizConfigs", cfgRes.configs);

    _renderCfgPage(cfgRes.configs);
  });
};

function _renderCfgPage(configs){
  var html = '';

  // Preset cards
  html += '<div class="section-card">' +
    '<div class="section-card-title"><i class="fa fa-bolt"></i> Quick Presets</div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;" id="presetGrid">';

  configs.forEach(function(c,i){
    var icons = {
      "Practice Mode":"🎯","Exam Mode":"📝","Strict Mode":"⚡",
      "Timed Practice":"⏱️","Adaptive Mode":"🧠","Review Mode":"👁️",
      "Timed Practice Mode":"⏱️"
    };
    var icon = icons[c["Quiz Settings Title"]] || "⚙️";
    html += '<div class="topic-card cfg-preset" data-idx="'+i+'" onclick="Pages.selectPreset(this,'+i+')" style="text-align:left;padding:14px;">' +
      '<div style="font-size:1.4rem;margin-bottom:6px;">'+icon+'</div>' +
      '<div style="font-size:.85rem;font-weight:700;color:var(--text)">'+Utils.esc(c["Quiz Settings Title"])+'</div>' +
      '<div style="font-size:.73rem;color:var(--text2);margin-top:3px;">' +
        (c["Quiz Time"]!=="0" ? Utils.fmtTime(parseInt(c["Quiz Time"])) : "No limit") +
        (c["Negative Marking"]==="On" ? " · -ve" : "") +
        (c["Instant Answer"]==="On" ? " · Instant" : "") +
      '</div>' +
      '<div class="t-check"><i class="fa fa-check"></i></div>' +
    '</div>';
  });

  // Custom
  html += '<div class="topic-card cfg-preset" data-idx="custom" onclick="Pages.selectPreset(this,\'custom\')" style="text-align:left;padding:14px;">' +
    '<div style="font-size:1.4rem;margin-bottom:6px;">🛠️</div>' +
    '<div style="font-size:.85rem;font-weight:700;color:var(--text)">Custom</div>' +
    '<div style="font-size:.73rem;color:var(--text2);margin-top:3px;">Build your own</div>' +
    '<div class="t-check"><i class="fa fa-check"></i></div>' +
  '</div>';

  html += '</div></div>';

  // Config preview
  html += '<div id="cfgPreview"></div>';

  // Custom config builder
  html += '<div id="customCfgBuilder" style="display:none"></div>';

  document.getElementById("cfgContent").innerHTML = html;

  // Auto-select first
  if(configs.length){
    var first = document.querySelector(".cfg-preset");
    if(first) Pages.selectPreset(first, 0);
  }
}

Pages.selectPreset = function(el, idx){
  document.querySelectorAll(".cfg-preset").forEach(function(c){ c.classList.remove("selected"); });
  el.classList.add("selected");

  if(idx === "custom"){
    State.set("isCustomConfig", true);
    State.set("selectedConfig", null);
    document.getElementById("cfgPreview").innerHTML = "";
    document.getElementById("customCfgBuilder").style.display = "block";
    document.getElementById("customCfgBuilder").innerHTML = _renderCustomBuilder();
  } else {
    State.set("isCustomConfig", false);
    document.getElementById("customCfgBuilder").style.display = "none";
    var cfg = State.get("quizConfigs")[idx];
    State.set("selectedConfig", cfg);
    document.getElementById("cfgPreview").innerHTML = _renderCfgPreview(cfg);
  }
};

function _renderCfgPreview(cfg){
  var cfgKeys = [
    ["Quiz Time", function(v){ return v==="0"?"Unlimited":Utils.fmtTime(parseInt(v)); }],
    ["Question Time", function(v){ return v==="0"?"No limit":v+"s"; }],
    ["Section Order",null],["Question Navigation",null],
    ["Allow Back",null],["Mark for Review",null],
    ["Instant Answer",null],["Show Hint",null],
    ["Negative Marking",null],["Partial Scoring",null],
    ["Pause / Resume Allowed",null],["Auto Submit",null]
  ];
  var rows = cfgKeys.map(function(kf){
    var v = cfg[kf[0]] || "-";
    if(kf[1]) v = kf[1](v);
    var cls = v==="On"?"config-val-on":v==="Off"?"config-val-off":"";
    return '<tr><td>'+Utils.esc(kf[0])+'</td><td class="'+cls+'">'+Utils.esc(v)+'</td></tr>';
  }).join("");

  return '<div class="section-card" style="margin-top:16px;">' +
    '<div class="section-card-title"><i class="fa fa-table-list"></i> Config Details — '+Utils.esc(cfg["Quiz Settings Title"])+'</div>' +
    '<table class="config-table"><thead><tr><th>Setting</th><th>Value</th></tr></thead><tbody>'+rows+'</tbody></table>' +
  '</div>';
}

function _renderCustomBuilder(){
  var bools = ["Random Options","Allow Option Change","Mandatory Answer","Negative Marking","Partial Scoring","Allow Back","Mark for Review","Auto Next Question","Auto Submit","Pause / Resume Allowed","Instant Answer","Instant Answer Feedback","Show Hint","Final Result","Question Wise Result"];
  var html = '<div class="section-card"><div class="section-card-title"><i class="fa fa-gear"></i> Custom Config Builder</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
  bools.forEach(function(k){
    html += '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;">' +
      '<input type="checkbox" class="custom-cfg-chk" data-key="'+Utils.esc(k)+'" checked style="width:16px;height:16px;accent-color:var(--accent);"/>' +
      '<span style="font-size:.85rem;">'+Utils.esc(k)+'</span>' +
    '</label>';
  });
  html += '</div></div>';
  return html;
}

Pages.startQuiz = function(){
  // Build config object
  var cfg;
  if(State.get("isCustomConfig")){
    cfg = { "Quiz Settings Title":"Custom", "Quiz Time":"0", "Question Time":"0" };
    document.querySelectorAll(".custom-cfg-chk").forEach(function(c){
      cfg[c.dataset.key] = c.checked ? "On" : "Off";
    });
    State.set("selectedConfig", cfg);
  } else {
    cfg = State.get("selectedConfig");
    if(!cfg){ showToast("Please select a configuration"); return; }
  }

  // Filter & pick questions
  var all  = State.get("allQuestions") || [];
  var cats = State.get("selectedCategories");
  var subs = State.get("selectedSubCats");
  var diffs= State.get("selectedDifficulties");
  var qtys = State.get("selectedQTypes");
  var tags = State.get("selectedTags");

  var filtered = all.filter(function(q){
    if(q.Status && q.Status.toLowerCase() === "inactive") return false;
    if(cats.length && cats.indexOf(q.Category) < 0) return false;
    if(subs.length && subs.indexOf(q["Sub Category"]) < 0) return false;
    if(diffs.length && diffs.indexOf((q.Difficulty||"").toLowerCase()) < 0) return false;
    if(qtys.length && qtys.indexOf(q["Question Type"]) < 0) return false;
    if(tags.length && tags.indexOf(q.Tags) < 0) return false;
    return true;
  });

  if(!filtered.length){ showToast("No questions match your filters"); return; }

  var n = Math.min(State.get("questionCount"), filtered.length);
  var picked;
  if(cfg["Section Order"] === "Random"){
    picked = Utils.pick(filtered, n);
  } else {
    picked = filtered.slice(0, n);
  }
  if(cfg["Random Options"] === "On"){
    picked = picked.map(function(q){
      var choices = [q.Choice1,q.Choice2,q.Choice3,q.Choice4].filter(Boolean);
      choices = Utils.shuffle(choices);
      return Object.assign({},q,{Choice1:choices[0],Choice2:choices[1],Choice3:choices[2],Choice4:choices[3]});
    });
  }
  State.set("quizQuestions", picked);

  // Start session
  var user = State.get("user");
  var now  = new Date().toISOString();
  State.set("startTime", now);
  State.set("currentIndex", 0);
  State.set("answers", {});

  API.startSession({
    studentName: user.name,
    quizName:    cfg["Quiz Settings Title"],
    quizTopics:  State.get("selectedTopics"),
    startTime:   now
  }).then(function(res){
    if(res.success) State.set("attemptFileId", res.attemptFileId);
    Quiz.launch();
  }).catch(function(){ Quiz.launch(); });
};

// ── STEP NAV HELPER ────────────────────────────
function _stepNav(current){
  var steps = ["Topics","Filters","Config","Quiz"];
  var dots = steps.map(function(s,i){
    var cls = i+1 < current ? "done" : i+1 === current ? "active" : "";
    return '<div class="step-dot '+cls+'" title="'+s+'"></div>';
  }).join("");
  return '<div class="topnav"><div class="topnav-brand">QuizMaster Pro</div>' +
    '<div class="topnav-steps">'+dots+'</div></div>';
}
