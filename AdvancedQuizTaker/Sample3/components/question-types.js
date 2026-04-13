// ============================================================
//  components/matching.js  — Matching Question Component
// ============================================================

const MatchingComponent = {
  _selected: null,
  _pairs: [],

  render(choices, qIdx, answered) {
    this._pairs = [];
    const left  = choices.map(c => c.split("-")[0]);
    const right = choices.map(c => c.split("-").slice(1).join("-"));
    const shuffled = [...right].sort(() => Math.random() - .5);

    return `
      <div class="mb-2 text-sm text-muted">Click a left item then a right item to match</div>
      <div class="matching-grid" id="matching-grid-${qIdx}">
        <div>${left.map((l, i) => `<div class="match-item" data-side="left" data-idx="${i}" data-val="${escHtml(l)}" onclick="MatchingComponent.pick(${qIdx},'left',${i},'${escJs(l)}')">${l}</div>`).join("")}</div>
        <div>${shuffled.map((r, i) => `<div class="match-item" data-side="right" data-idx="${i}" data-val="${escHtml(r)}" onclick="MatchingComponent.pick(${qIdx},'right',${i},'${escJs(r)}')">${r}</div>`).join("")}</div>
      </div>
      <div id="match-pairs-${qIdx}" class="mt-3" style="font-size:.85rem;color:var(--text-muted)"></div>`;
  },

  renderMulti(choices, qIdx, answered) {
    return this.render(choices, qIdx, answered);
  },

  attachEvents(qIdx) { this._qIdx = qIdx; this._selected = null; this._pairs = []; },

  pick(qIdx, side, idx, val) {
    if (!this._selected) {
      if (side === "left") {
        this._selected = { side, idx, val };
        document.querySelectorAll(`[data-side="left"]`).forEach(el => el.classList.remove("active"));
        document.querySelector(`[data-side="left"][data-idx="${idx}"]`)?.classList.add("active");
      }
    } else if (this._selected.side === "left" && side === "right") {
      const l = this._selected.val, r = val;
      this._pairs.push({ left: l, right: r });
      // Visual
      document.querySelector(`[data-side="left"][data-val="${CSS.escape(l)}"]`)?.classList.add("matched");
      document.querySelector(`[data-side="right"][data-val="${CSS.escape(r)}"]`)?.classList.add("matched");
      this._selected = null;
      // Update display
      const display = document.getElementById(`match-pairs-${qIdx}`);
      if (display) display.innerHTML = this._pairs.map(p => `<span style="padding:3px 10px;background:var(--success-light);border-radius:20px;margin-right:6px;margin-bottom:4px;display:inline-block;color:var(--success)">${p.left} ↔ ${p.right}</span>`).join("");
      // Save
      const selectedStr = this._pairs.map(p => `${p.left}-${p.right}`).join("|");
      Quiz.selectAnswer(qIdx, selectedStr);
    } else {
      this._selected = null;
      document.querySelectorAll(".match-item").forEach(el => el.classList.remove("active"));
    }
  },
};

// ============================================================
//  components/dragdrop.js
// ============================================================

const DragDropComponent = {
  render(choices, qIdx, answered) {
    const items = choices.map(c => {
      const [item, cat] = c.split("-");
      return { item, cat };
    });
    const cats = [...new Set(items.map(i => i.cat))];

    return `
      <div class="mb-2 text-sm text-muted">Drag items to their correct category</div>
      <div class="drag-container" id="drag-sources-${qIdx}">
        ${items.map(i => `
          <div class="draggable-item" draggable="true" data-item="${escHtml(i.item)}" data-cat="${escHtml(i.cat)}">
            <i class="fas fa-grip-vertical seq-handle"></i>${i.item}
          </div>`).join("")}
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:16px">
        ${cats.map(c => `
          <div class="drag-target" data-category="${escHtml(c)}" 
               ondragover="DragDropComponent.over(event)"
               ondrop="DragDropComponent.drop(event,${qIdx})">
            <div style="font-size:.8rem;font-weight:600;color:var(--text-muted);margin-bottom:8px">${c}</div>
          </div>`).join("")}
      </div>`;
  },

  attachEvents(qIdx) {
    document.querySelectorAll(".draggable-item").forEach(el => {
      el.addEventListener("dragstart", e => {
        e.dataTransfer.setData("text", JSON.stringify({ item: el.dataset.item, cat: el.dataset.cat }));
        el.classList.add("dragging");
      });
      el.addEventListener("dragend", () => el.classList.remove("dragging"));
    });
  },

  over(e) { e.preventDefault(); e.currentTarget.classList.add("dragover"); },

  drop(e, qIdx) {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
    const data = JSON.parse(e.dataTransfer.getData("text"));
    const el   = document.querySelector(`.draggable-item[data-item="${CSS.escape(data.item)}"]`);
    if (el) e.currentTarget.appendChild(el);
    // Collect all drops
    const cats = document.querySelectorAll(".drag-target");
    const result = [];
    cats.forEach(c => {
      c.querySelectorAll(".draggable-item").forEach(item => {
        result.push(`${item.dataset.item}-${c.dataset.category}`);
      });
    });
    Quiz.selectAnswer(qIdx, result.join("|"));
  },
};

// ============================================================
//  components/sequence.js
// ============================================================

const SequenceComponent = {
  _drag: null,

  render(choices, qIdx, answered) {
    const shuffled = [...choices].sort(() => Math.random() - .5);
    return `
      <div class="mb-2 text-sm text-muted">Drag to arrange in correct order</div>
      <ul class="sequence-list" id="seq-list-${qIdx}">
        ${shuffled.map((c, i) => `
          <li class="sequence-item" draggable="true" data-val="${escHtml(c)}" data-idx="${i}">
            <i class="fas fa-grip-vertical seq-handle"></i>
            <span>${c}</span>
          </li>`).join("")}
      </ul>`;
  },

  attachEvents(qIdx) {
    const list = document.getElementById(`seq-list-${qIdx}`);
    if (!list) return;
    list.querySelectorAll(".sequence-item").forEach(item => {
      item.addEventListener("dragstart", e => { this._drag = item; item.style.opacity = ".4"; });
      item.addEventListener("dragend",   e => { item.style.opacity = "1"; this._drag = null; this._saveOrder(qIdx); });
      item.addEventListener("dragover",  e => { e.preventDefault(); item.classList.add("drag-over"); });
      item.addEventListener("dragleave", () => item.classList.remove("drag-over"));
      item.addEventListener("drop", e => {
        e.preventDefault(); item.classList.remove("drag-over");
        if (this._drag && this._drag !== item) list.insertBefore(this._drag, item);
      });
    });
  },

  _saveOrder(qIdx) {
    const items  = document.querySelectorAll(`#seq-list-${qIdx} .sequence-item`);
    const order  = [...items].map(el => el.dataset.val).join("|");
    Quiz.selectAnswer(qIdx, order);
  },
};

// ============================================================
//  components/range.js
// ============================================================

const RangeComponent = {
  render(choices, qIdx, answered) {
    const min  = parseFloat(choices[0] || 0);
    const max  = parseFloat(choices[choices.length - 1] || 100);
    const val  = answered?.selected || min;
    return `
      <div class="mb-2 text-sm text-muted">Select a value in range</div>
      <div class="range-value" id="range-display-${qIdx}">${val}</div>
      <input type="range" class="range-input" id="range-input-${qIdx}"
             min="${min}" max="${max}" step="1" value="${val}"
             oninput="RangeComponent.update(${qIdx},this.value)">
      <div class="range-labels"><span>${min}</span><span>${max}</span></div>`;
  },

  attachEvents(qIdx) {},

  update(qIdx, val) {
    document.getElementById(`range-display-${qIdx}`).textContent = val;
    Quiz.selectAnswer(qIdx, val);
  },
};

// ============================================================
//  components/fillblank.js
// ============================================================

const FillBlankComponent = {
  render(question, qIdx, answered, isShort) {
    const val = answered?.selected || "";
    return `
      <div class="mb-2 text-sm text-muted">Type your answer below</div>
      <input type="text" class="qm-input" id="blank-input-${qIdx}"
             placeholder="Your answer..." value="${escHtml(val)}"
             oninput="FillBlankComponent.update(${qIdx},this.value)"
             onkeydown="if(event.key==='Enter') FillBlankComponent.update(${qIdx},this.value)">`;
  },

  renderMulti(qIdx, answered, choices) {
    const vals = answered?.selected ? answered.selected.split("|") : [];
    return `
      <div class="mb-2 text-sm text-muted">Fill in all blanks</div>
      <div style="display:grid;gap:10px">
        ${choices.map((_, i) => `
          <div class="d-flex align-center gap-2">
            <span class="text-muted text-sm fw-600">Blank ${i + 1}:</span>
            <input type="text" class="qm-input" id="blank-multi-${qIdx}-${i}"
                   placeholder="Answer ${i+1}..." value="${escHtml(vals[i] || "")}"
                   oninput="FillBlankComponent.updateMulti(${qIdx})">
          </div>`).join("")}
      </div>`;
  },

  renderInline(question, qIdx, answered) {
    const val = answered?.selected || "";
    const html = question.replace(/\[blank\]/gi, `<input type="text" class="fill-blank" id="inline-blank-${qIdx}" value="${escHtml(val)}" oninput="FillBlankComponent.update(${qIdx},this.value)" placeholder="___">`);
    return `<div style="font-size:1rem;line-height:2">${html}</div>`;
  },

  update(qIdx, val) {
    Quiz.selectAnswer(qIdx, val.trim());
  },

  updateMulti(qIdx) {
    const inputs = document.querySelectorAll(`[id^="blank-multi-${qIdx}-"]`);
    const vals   = [...inputs].map(el => el.value.trim()).join("|");
    Quiz.selectAnswer(qIdx, vals);
  },
};
