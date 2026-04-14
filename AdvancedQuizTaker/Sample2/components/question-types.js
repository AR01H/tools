// ============================================================
//  QUIZ APP — components / question-types.js
//  Renders every question type + collects answers
// ============================================================

const QuestionRenderer = (() => {
  let _currentType = "";
  let _currentQ = null;
  let _currentIdx = 0;

  function getChoices(obj) {
    return Object.keys(obj)
      .filter((k) => /^(choice|option)\s*\d+$/i.test(k))
      .sort((a, b) => {
        const na = parseInt(a.match(/\d+/)[0]) || 0;
        const nb = parseInt(b.match(/\d+/)[0]) || 0;
        return na - nb;
      })
      .map((k) => obj[k])
      .filter(Boolean);
  }

  function render(panel, q, idx) {
    _currentQ = q;
    _currentIdx = idx;
    _currentType = (q["Question Type"] || "Multichoice").trim();


    // Restore saved answer
    const savedAns = (State.get("quiz").answers[idx] || {}).userAnswer;

    // Passage
    const passageHtml = q.Passage
      ? `<div style="background:var(--bg-elevated);border-left:4px solid var(--accent-primary);
                     padding:var(--sp-md);border-radius:var(--radius-sm);margin-bottom:var(--sp-lg);
                     font-family:var(--font-serif);font-size:.9rem;line-height:1.7;color:var(--text-secondary)">
           <p class="text-xs text-muted font-bold" style="margin-bottom:4px">📖 PASSAGE</p>
           ${q.Passage}
         </div>`
      : "";

    const diffColor = {
      easy: "var(--color-success)",
      medium: "var(--color-warn)",
      hard: "var(--color-error)",
    };
    const dc =
      diffColor[(q.Difficulty || "").toLowerCase()] || "var(--text-muted)";

    panel.innerHTML = `
      <div class="q-left-panel" style="display:${
        q.Passage ? "flex" : "none"
      };flex-direction:column;gap:var(--sp-md);background:var(--bg-elevated);border-right:1px solid var(--border-color)">
        ${
          q.Passage
            ? passageHtml
            : `<div style="padding:var(--sp-lg);color:var(--text-muted);text-align:center;font-style:italic;margin:auto">Read the question carefully and select the best answer from the options provided.</div>`
        }
      </div>
      <div class="q-right-panel animate-fade" style="display:flex;flex-direction:column;gap:var(--sp-lg)">
        <!-- Meta row -->
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          ${(q.Category || "")
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean)
            .map((c) => `<span class="badge badge-info">${c}</span>`)
            .join("")}
          ${(q["Sub Category"] || "")
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean)
            .map((c) => `<span class="badge badge-neutral">${c}</span>`)
            .join("")}
          ${
            q.Difficulty
              ? `<span class="badge" style="background:${dc}22;color:${dc}">${q.Difficulty}</span>`
              : ""
          }
          <span class="badge badge-neutral">${_currentType}</span>
          ${
            q.Score
              ? `<span class="badge badge-neutral">+${q.Score} pts</span>`
              : ""
          }
          ${
            q["Negative Score"] > 0
              ? `<span class="badge badge-error">-${q["Negative Score"]}</span>`
              : ""
          }
          <span style="margin-left:auto;font-size:.75rem;color:var(--text-muted)">#${
            idx + 1
          }</span>
        </div>

        <!-- Question text -->
        <div style="font-size:1.05rem;font-weight:600;line-height:1.6;color:var(--text-primary)">
          ${renderQuestionText(q)}
        </div>

        <!-- Answer area -->
        <div id="answer-area">
          ${renderAnswerArea(q, savedAns)}
        </div>
      </div>`;

    // Post-render init for drag/drop, etc.
    postRenderInit(q, savedAns);
  }

  function renderQuestionText(q) {
    let text = q.Question || "";
    // Fill in the Blanks: replace underscores with input boxes
    if (_currentType === "Inline Blank") {
      text = text.replace(
        /\[blank\]/gi,
        '<input class="inline-blank" type="text" placeholder="…" style="border:none;border-bottom:2px solid var(--accent-primary);background:transparent;color:var(--text-primary);font-family:var(--font-ui);font-size:1rem;width:120px;outline:none;padding:2px 4px;">'
      );
    }
    return text;
  }

  function renderAnswerArea(q, saved) {
    const choices = getChoices(q);

    switch (_currentType) {
      case "Multichoice":
      case "Multichoice Anycorrect":
        return renderMCQ(choices, saved, false);

      case "Multi Multichoice":
        return renderMCQ(choices, saved, true);

      case "True/False":
        return renderTrueFalse(saved);

      case "Sequence":
        return renderSequence(choices, saved);

      case "Short Answer":
        return `<textarea id="short-ans" class="form-control" rows="4" style="width:100%;" placeholder="Type your answer here…"
                  style="resize:vertical">${saved || ""}</textarea>`;

      case "Fill in the Blanks":
        return renderFillBlanks(q, saved);

      case "Multi Blanks":
        return renderMultiBlanks(q, saved);

      case "Inline Blank":
        return ""; // already in question text

      case "Matching":
        return renderMatching(choices, q["Correct Answer"], saved);

      case "Multi Matching":
        return renderMultiMatching(choices, q["Correct Answer"], saved);

      case "Drag & Drop":
        return renderDragDrop(choices, saved);

      case "Range":
        return renderRange(q, saved);

      default:
        return renderMCQ(choices, saved, false);
    }
  }

  // ── MCQ ───────────────────────────────────────────────────
  function renderMCQ(choices, saved, multi) {
    const savedArr = saved ? (Array.isArray(saved) ? saved : [saved]) : [];
    return `
      <div id="mcq-options" style="display:flex;flex-direction:column;gap:var(--sp-sm)">
        ${choices
          .map((c, i) => {
            const labels = ["A", "B", "C", "D"];
            const isSel = savedArr.includes(c);
            const quiz = State.get("quiz");
            const cfg = quiz.config;
            const showInstant = (cfg["Instant Answer"] || "Off") === "On";
            const correctArr = (
              quiz.questions[_currentIdx]["Correct Answer"] || ""
            ).split("|");
            const isCorrect = correctArr.includes(c);
            let extraClass = isSel ? "selected" : "";
            if (showInstant && isSel)
              extraClass = isCorrect ? "correct" : "wrong";
            return `
            <div class="option-card ${extraClass}" data-val="${c}" onclick="QuestionRenderer.toggleMCQ(this,'${multi}')">
              <div class="option-label">${labels[i]}</div>
              <div style="flex:1;line-height:1.5">${c}</div>
              ${
                showInstant && isSel
                  ? `<span>${isCorrect ? "✓" : "✕"}</span>`
                  : ""
              }
            </div>`;
          })
          .join("")}
      </div>`;
  }

  // ── True / False ──────────────────────────────────────────
  function renderTrueFalse(saved) {
    return `
      <div style="display:flex;gap:var(--sp-md)">
        ${["TRUE", "FALSE"]
          .map(
            (v) => `
          <div class="option-card ${
            saved === v ? "selected" : ""
          }" style="flex:1;justify-content:center;font-size:1.1rem;font-weight:700"
               data-val="${v}" onclick="QuestionRenderer.toggleMCQ(this,'false')">
            ${v === "TRUE" ? "✓ TRUE" : "✕ FALSE"}
          </div>`
          )
          .join("")}
      </div>`;
  }

  // ── Sequence ──────────────────────────────────────────────
  function renderSequence(choices, saved) {
    const order = saved ? saved : choices;
    return `
      <div id="seq-list" style="display:flex;flex-direction:column;gap:8px">
        ${order
          .map(
            (c, i) => `
          <div class="option-card" draggable="true" data-val="${c}"
               style="cursor:grab;justify-content:space-between"
               ondragstart="SeqDrag.start(event)" ondragover="SeqDrag.over(event)" ondrop="SeqDrag.drop(event)">
            <span style="font-weight:700;color:var(--text-muted)">${
              i + 1
            }.</span>
            <span style="flex:1;margin:0 var(--sp-md)">${c}</span>
            <span style="color:var(--text-muted)">⠿</span>
          </div>`
          )
          .join("")}
      </div>`;
  }

  // ── Fill in Blanks ────────────────────────────────────────
  function renderFillBlanks(q, saved) {
    return `
      <div class="form-group">
        <label class="form-label">Your Answer</label>
        <input id="fill-ans" class="form-control" type="text" placeholder="Type answer…" value="${
          saved || ""
        }">
      </div>`;
  }

  function renderMultiBlanks(q, saved) {
    const correct = (q["Correct Answer"] || "").split("|");
    const saved2 = saved
      ? Array.isArray(saved)
        ? saved
        : saved.split("|")
      : [];
    return `
      <div style="display:flex;flex-direction:column;gap:var(--sp-sm)">
        ${correct
          .map(
            (_, i) => `
          <div class="form-group">
            <label class="form-label">Blank ${i + 1}</label>
            <input class="form-control multi-blank" data-idx="${i}" type="text"
              placeholder="Answer ${i + 1}…" value="${saved2[i] || ""}">
          </div>`
          )
          .join("")}
      </div>`;
  }

  // ── Matching ──────────────────────────────────────────────
  function renderMatching(choices, correctStr, saved) {
    const pairs = choices.map((c) => c.split("-"));
    const lefts = pairs.map((p) => p[0]);
    const rights = pairs.map((p) => p[1] || "");
    const shuffled = Filters.shuffle([...rights]);
    const savedMap = saved
      ? Object.fromEntries(saved.split("|").map((p) => p.split("-")))
      : {};
    return `
      <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:var(--sp-sm);align-items:center">
        ${lefts
          .map(
            (l, i) => `
          <div style="background:var(--bg-elevated);padding:10px var(--sp-md);border-radius:var(--radius-sm);font-weight:600">${l}</div>
          <span style="color:var(--accent-primary)">→</span>
          <select class="form-control match-select" data-left="${l}">
            <option value="">— Select —</option>
            ${shuffled
              .map(
                (r) =>
                  `<option value="${r}" ${
                    savedMap[l] === r ? "selected" : ""
                  }>${r}</option>`
              )
              .join("")}
          </select>`
          )
          .join("")}
      </div>`;
  }

  function renderMultiMatching(choices, correctStr, saved) {
    // Multi-matching: each left item can match multiple right items
    const rows = choices.map((c) => {
      const parts = c.split("-");
      // Split tags by | if present, otherwise use slice(1)
      const tags = parts[1] ? parts[1].split("|").map(t => t.trim()) : parts.slice(1);
      return { left: parts[0], tags: tags };
    });
    const allTags = [...new Set(rows.flatMap((r) => r.tags))].filter(Boolean);
    const savedMap = saved ? JSON.parse(saved || "{}") : {};
    return `
      <div style="overflow-x:auto">
        <table class="data-table">
          <thead><tr><th>Item</th>${allTags
            .map((t) => `<th>${t}</th>`)
            .join("")}</tr></thead>
          <tbody>
            ${rows
              .map(
                (r) => `
              <tr>
                <td><strong>${r.left}</strong></td>
                ${allTags
                  .map(
                    (t) => `
                  <td style="text-align:center">
                    <input type="checkbox" class="multi-match-cb" data-left="${
                      r.left
                    }" data-tag="${t}"
                      ${(savedMap[r.left] || []).includes(t) ? "checked" : ""}>
                  </td>`
                  )
                  .join("")}
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`;
  }

  // ── Drag & Drop ───────────────────────────────────────────
  function renderDragDrop(choices, saved) {
    const categories = [
      ...new Set(choices.map((c) => c.split("-")[1]).filter(Boolean)),
    ];
    return `
      <div style="display:flex;gap:var(--sp-md);flex-wrap:wrap">
        <div style="flex:1;min-width:180px">
          <p class="form-label" style="margin-bottom:var(--sp-sm)">Items</p>
          <div id="drag-source" style="display:flex;flex-direction:column;gap:6px;min-height:60px">
            ${choices
              .map((c) => {
                const label = c.split("-")[0];
                return `<div class="option-card" draggable="true" data-val="${c}"
                           ondragstart="DragDrop.startDrag(event)" style="cursor:grab">${label}</div>`;
              })
              .join("")}
          </div>
        </div>
        <div style="flex:2;min-width:240px">
          <p class="form-label" style="margin-bottom:var(--sp-sm)">Categories</p>
          <div style="display:flex;flex-direction:column;gap:var(--sp-sm)">
            ${categories
              .map(
                (cat) => `
              <div>
                <p style="font-size:.8rem;font-weight:700;margin-bottom:4px;color:var(--accent-primary)">${cat}</p>
                <div class="drag-target" data-cat="${cat}"
                     ondragover="DragDrop.over(event)" ondrop="DragDrop.drop(event)"
                     style="min-height:52px;border:2px dashed var(--border-color);border-radius:var(--radius-md);
                            padding:var(--sp-sm);display:flex;flex-wrap:wrap;gap:6px"></div>
              </div>`
              )
              .join("")}
          </div>
        </div>
      </div>`;
  }

  // ── Range ─────────────────────────────────────────────────
  function renderRange(q, saved) {
    const choices = ["Choice1", "Choice2", "Choice3", "Choice4"]
      .map((k) => q[k])
      .filter(Boolean);
    const min = parseFloat(choices[0]) || 0;
    const max = parseFloat(choices[choices.length - 1]) || 100;
    const savedVal = saved || min;
    return `
      <div class="form-group">
        <label class="form-label">Select Value: <span id="range-disp" class="font-mono font-bold text-accent">${savedVal}</span></label>
        <input type="range" id="range-input" class="w-full" min="${min}" max="${max}" step="1" value="${savedVal}"
          oninput="document.getElementById('range-disp').textContent=this.value"
          style="accent-color:var(--accent-primary)">
        <div style="display:flex;justify-content:space-between;font-size:.75rem;color:var(--text-muted)">
          <span>${min}</span><span>${max}</span>
        </div>
      </div>`;
  }

  // ── Post render inits ─────────────────────────────────────
  function postRenderInit(q, saved) {
    // Instant answer feedback wiring already in renderMCQ
  }

  // ── Collect Answer ────────────────────────────────────────
  function collectAnswer() {
    const type = _currentType;
    try {
      if (
        type === "Multichoice" ||
        type === "True/False" ||
        type === "Multichoice Anycorrect"
      ) {
        const sel = document.querySelector(
          "#mcq-options .option-card.selected, [data-val].selected"
        );
        return sel ? sel.dataset.val : null;
      }
      if (type === "Multi Multichoice") {
        const sels = [
          ...document.querySelectorAll("#mcq-options .option-card.selected"),
        ];
        return sels.length ? sels.map((s) => s.dataset.val) : null;
      }
      if (type === "Short Answer") {
        return document.getElementById("short-ans")?.value || null;
      }
      if (type === "Fill in the Blanks") {
        return document.getElementById("fill-ans")?.value || null;
      }
      if (type === "Inline Blank") {
        return (
          [...document.querySelectorAll(".inline-blank")]
            .map((i) => i.value)
            .join("|") || null
        );
      }
      if (type === "Multi Blanks") {
        const vals = [...document.querySelectorAll(".multi-blank")].map(
          (i) => i.value
        );
        return vals.join("|") || null;
      }
      if (type === "Sequence") {
        const items = [...document.querySelectorAll("#seq-list [data-val]")];
        return items.map((i) => i.dataset.val);
      }
      if (type === "Matching") {
        const sels = [...document.querySelectorAll(".match-select")];
        return sels.map((s) => `${s.dataset.left}-${s.value}`).join("|");
      }
      if (type === "Multi Matching") {
        const map = {};
        document.querySelectorAll(".multi-match-cb:checked").forEach((cb) => {
          if (!map[cb.dataset.left]) map[cb.dataset.left] = [];
          map[cb.dataset.left].push(cb.dataset.tag);
        });
        return JSON.stringify(map);
      }
      if (type === "Drag & Drop") {
        const result = [];
        document.querySelectorAll(".drag-target").forEach((tgt) => {
          const cat = tgt.dataset.cat;
          tgt.querySelectorAll("[data-val]").forEach((el) => {
            // Get item part of the data-val (Item-Category)
            const item = (el.dataset.val || "").split("-")[0];
            result.push(`${item}-${cat}`);
          });
        });
        return result.length ? result.join("|") : null;
      }
      if (type === "Range") {
        return document.getElementById("range-input")?.value || null;
      }
    } catch (e) {}
    return null;
  }

  // ── Toggle MCQ ────────────────────────────────────────────
  function toggleMCQ(el, multiStr) {
    const quiz = State.get("quiz");
    const cfg = quiz.config;
    const answered = quiz.answers[_currentIdx];
    const noChange = (cfg["Allow Option Change"] || "On") === "Off";
    if (noChange && answered && answered.userAnswer) {
      UI.toast("Option change not allowed", "warn");
      return;
    }
    const multi = multiStr === "true";
    if (!multi) {
      document
        .querySelectorAll("#mcq-options .option-card")
        .forEach((c) => c.classList.remove("selected"));
    }
    el.classList.toggle("selected");

    // Don't change until correct
    const dontChange = (cfg["Don't Change Until Correct"] || "Off") === "On";
    if (dontChange) {
      const correct = (_currentQ["Correct Answer"] || "").split("|");
      if (
        el.classList.contains("selected") &&
        !correct.includes(el.dataset.val)
      ) {
        el.classList.add("wrong");
        setTimeout(() => {
          el.classList.remove("selected", "wrong");
        }, 600);
      }
    }

    // Instant answer feedback
    if ((cfg["Instant Answer"] || "Off") === "On") {
      const correct = (_currentQ["Correct Answer"] || "").split("|");
      document.querySelectorAll("#mcq-options .option-card").forEach((card) => {
        card.classList.remove("correct", "wrong");
        if (card.classList.contains("selected")) {
          card.classList.add(
            correct.includes(card.dataset.val) ? "correct" : "wrong"
          );
        }
      });
    }

    // Auto next
    if ((cfg["Auto Next Question"] || "Off") === "On" && !multi) {
      setTimeout(() => QuizEngine.next(), 800);
    }
  }

  return { render, collectAnswer, toggleMCQ };
})();

// ── Drag helpers ──────────────────────────────────────────
const SeqDrag = {
  _el: null,
  start(e) {
    this._el = e.currentTarget;
    e.dataTransfer.effectAllowed = "move";
  },
  over(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  },
  drop(e) {
    e.preventDefault();
    const target = e.currentTarget;
    const list = document.getElementById("seq-list");
    if (target !== this._el && list) {
      const children = [...list.children];
      const fromIdx = children.indexOf(this._el);
      const toIdx = children.indexOf(target);
      if (fromIdx > -1 && toIdx > -1) {
        if (fromIdx < toIdx) list.insertBefore(this._el, target.nextSibling);
        else list.insertBefore(this._el, target);
      }
    }
  },
};

const DragDrop = {
  _val: null,
  _src: null,
  startDrag(e) {
    this._val = e.currentTarget.dataset.val;
    this._src = e.currentTarget;
    e.dataTransfer.effectAllowed = "move";
  },
  over(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = "var(--accent-primary)";
  },
  drop(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = "";
    if (this._src && this._val) {
      const clone = this._src.cloneNode(true);
      clone.draggable = false;
      clone.style.cursor = "default";
      clone.style.fontSize = ".8rem";
      clone.style.padding = "4px 8px";
      e.currentTarget.appendChild(clone);
      this._src.style.opacity = ".3";
    }
  },
};
