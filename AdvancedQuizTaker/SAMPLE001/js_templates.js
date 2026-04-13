// ════════════════════════════════════════════════
//  TEMPLATES MODULE
//  Documents & applies the 4 quiz UI templates.
//  Templates are CSS-only (see css_quiz.html).
//  This file handles JS-side setup & metadata.
// ════════════════════════════════════════════════

var Templates = {
  all: [
    {
      id:       "classic",
      name:     "Classic",
      icon:     "📋",
      desc:     "Clean single-column layout. Question and options stacked vertically. Navigator on the right. Best for SAT/ACT/DSAT style.",
      features: ["Full navigator panel","Progress bar","Minimal distractions","Best for long exams"]
    },
    {
      id:       "card",
      name:     "Card Focus",
      icon:     "🃏",
      desc:     "Each question displayed as a floating card with shadow. Elevated, focused reading experience. Great for mobile.",
      features: ["Floating card design","Deep shadow + glow","Compact navigator","Touch-friendly tap targets"]
    },
    {
      id:       "split",
      name:     "Split View",
      icon:     "⚡",
      desc:     "Left panel = question text. Right panel = answer options. Perfect for passage-based or reading comprehension questions.",
      features: ["Side-by-side layout","Passage always visible","Wide-screen optimized","Scroll independently"]
    },
    {
      id:       "immersive",
      name:     "Immersive",
      icon:     "🌌",
      desc:     "Full dark-mode with glowing gradients and glassmorphism. Premium exam atmosphere. Inspired by high-stakes test centers.",
      features: ["Gradient glow effects","Glassmorphism panels","Blurred topbar","Premium aesthetic"]
    }
  ],

  // Apply template to quiz shell
  apply: function(tplId){
    var shell = document.querySelector(".quiz-shell");
    if(shell) shell.setAttribute("data-quiz-tpl", tplId || "classic");
  },

  // Render template picker (used in settings & config page)
  renderPicker: function(currentTpl){
    return Templates.all.map(function(t){
      var active = (t.id === currentTpl) ? "selected" : "";
      return '<div class="topic-card '+active+'" style="padding:14px;text-align:left;cursor:pointer;" onclick="UI.setTemplate(\''+t.id+'\')" data-tpl="'+t.id+'">' +
        '<div style="font-size:1.5rem;margin-bottom:6px;">'+t.icon+'</div>' +
        '<div style="font-weight:700;font-size:.9rem;margin-bottom:3px;">'+t.name+'</div>' +
        '<div style="font-size:.75rem;color:var(--text2);line-height:1.4;">'+t.desc+'</div>' +
        '<div class="t-check"><i class="fa fa-check"></i></div>' +
      '</div>';
    }).join("");
  }
};

// Override setTemplate to also apply to live quiz
var _origSetTemplate = UI.setTemplate;
UI.setTemplate = function(tpl){
  _origSetTemplate(tpl);
  Templates.apply(tpl);
};
