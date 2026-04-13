// ════════════════════════════════════════════════
//  UTILS + ROUTER
// ════════════════════════════════════════════════

var Utils = {
  // Format seconds → MM:SS
  fmtTime: function(s){
    if(s < 0) s = 0;
    var m = Math.floor(s/60);
    var sec = s % 60;
    return (m < 10 ? "0" : "") + m + ":" + (sec < 10 ? "0" : "") + sec;
  },
  // Format timestamp
  fmtDateTime: function(d){
    if(!d) return "-";
    var dt = new Date(d);
    return dt.toLocaleString();
  },
  // Shuffle array (Fisher-Yates)
  shuffle: function(arr){
    var a = arr.slice();
    for(var i = a.length-1; i > 0; i--){
      var j = Math.floor(Math.random()*(i+1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  },
  // Pick n items from array
  pick: function(arr, n){
    return Utils.shuffle(arr).slice(0, n);
  },
  // Toggle in array
  toggleArr: function(arr, val){
    var i = arr.indexOf(val);
    if(i < 0){ arr.push(val); } else { arr.splice(i,1); }
    return arr;
  },
  // Difficulty color
  diffColor: function(d){
    var map = { easy:"#22c55e", medium:"#eab308", hard:"#f97316", expert:"#ef4444" };
    return map[(d||"").toLowerCase()] || "#9aa0b4";
  },
  diffBadge: function(d){
    var cls = "badge-" + (d||"").toLowerCase();
    return '<span class="badge '+ cls +'">'+(d||"—")+'</span>';
  },
  // Get topic icon by name
  topicIcon: function(name){
    var map = {
      math:"📐", mathematics:"📐", science:"🔬", english:"📖", gk:"🌍",
      history:"📜", geography:"🗺️", programming:"💻", physics:"⚛️",
      chemistry:"🧪", biology:"🧬", economics:"💹", default:"📚"
    };
    return map[(name||"").toLowerCase()] || map.default;
  },
  // Grade
  grade: function(pct){
    if(pct >= 90) return { letter:"A+", label:"Excellent!", color:"#22c55e" };
    if(pct >= 80) return { letter:"A",  label:"Great Work", color:"#06b6d4" };
    if(pct >= 70) return { letter:"B",  label:"Good Job",   color:"#a78bfa" };
    if(pct >= 60) return { letter:"C",  label:"Keep Going", color:"#eab308" };
    if(pct >= 50) return { letter:"D",  label:"Need Work",  color:"#f97316" };
    return               { letter:"F",  label:"Try Again",  color:"#ef4444" };
  },
  // HTML escape
  esc: function(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); },
  // Deep copy
  clone: function(o){ return JSON.parse(JSON.stringify(o)); }
};

// ── ROUTER ───────────────────────────────────────
var Router = {
  _pages: {},
  register: function(name, renderFn){ this._pages[name] = renderFn; },
  go: function(name, data){
    var fn = this._pages[name];
    if(!fn){ console.warn("Page not found:", name); return; }
    State.set("page", name);
    document.getElementById("app").innerHTML = fn(data) || "";
    // Post-render hooks
    if(typeof window["__onRender_"+name] === "function") window["__onRender_"+name]();
    window.scrollTo(0,0);
  }
};

// ── TOAST ────────────────────────────────────────
function showToast(msg, ms){
  var t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(t._t);
  t._t = setTimeout(function(){ t.classList.add("hidden"); }, ms||2500);
}
