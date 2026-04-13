// ============================================================
//  components/mcq.js  — MCQ, Multi-select, True/False
// ============================================================

const MCQComponent = {
  LABELS: ["A", "B", "C", "D", "E", "F"],

  render(choices, labels, qIdx, answered, isInstant, isMulti) {
    const selected = answered?.selected;
    const selArr   = selected ? (Array.isArray(selected) ? selected : [selected]) : [];

    const items = choices.map((c, i) => {
      const lbl  = (labels || this.LABELS)[i] || String.fromCharCode(65 + i);
      const isSel = selArr.includes(c);
      return `
        <div class="option-item${isSel ? " selected" : ""}" data-value="${escHtml(c)}"
             onclick="MCQComponent.pick(${qIdx},'${escJs(c)}',${isMulti})">
          <div class="option-label">${lbl}</div>
          <div class="option-text">${c}</div>
          ${isMulti ? `<i class="fas ${isSel ? "fa-check-square" : "fa-square"} ms-auto text-muted" style="font-size:.85rem"></i>` : ""}
        </div>`;
    }).join("");

    return `<div class="options-grid">${items}</div>
      ${isMulti ? `<div class="mt-3"><button class="btn-qm btn-qm-primary btn-qm-sm" onclick="MCQComponent.submitMulti(${qIdx})"><i class="fas fa-check me-1"></i>Confirm Selection</button></div>` : ""}`;
  },

  pick(qIdx, value, isMulti) {
    if (isMulti) {
      const current = (State.getQuiz().answers[qIdx]?.selected || []).slice();
      const idx     = current.indexOf(value);
      if (idx > -1) current.splice(idx, 1);
      else          current.push(value);
      State.saveAnswer(qIdx, current, 0);
      // Update checkboxes visually
      document.querySelectorAll(".option-item").forEach(el => {
        const v   = el.dataset.value;
        const sel = current.includes(v);
        el.classList.toggle("selected", sel);
        const icon = el.querySelector(".fa-check-square, .fa-square");
        if (icon) { icon.className = `fas ${sel ? "fa-check-square" : "fa-square"} ms-auto text-muted`; }
      });
    } else {
      document.querySelectorAll(".option-item").forEach(el => el.classList.remove("selected"));
      const el = document.querySelector(`.option-item[data-value="${CSS.escape(value)}"]`);
      if (el) el.classList.add("selected");
      Quiz.selectAnswer(qIdx, value);
    }
  },

  submitMulti(qIdx) {
    const ans = State.getQuiz().answers[qIdx]?.selected || [];
    if (ans.length === 0) { UI.toast("Select at least one option.", "warning"); return; }
    Quiz.selectAnswer(qIdx, ans);
  },
};

function escHtml(s) { return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;"); }
function escJs(s)   { return String(s).replace(/\\/g,"\\\\").replace(/'/g,"\\'"); }
