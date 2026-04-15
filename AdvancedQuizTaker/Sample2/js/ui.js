// ============================================================
//  QUIZ APP — ui.js
//  DOM helpers, toast, modal, sidebar, topbar
// ============================================================

const UI = (() => {
  // ── Toast ─────────────────────────────────────────────────
  function toast(msg, type = "info", duration = 3500) {
    const icons = { success: "✓", error: "✕", warn: "⚠", info: "ℹ" };
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `<span style="font-size:1.1rem">${
      icons[type] || "ℹ"
    }</span><span class="toast-msg">${msg}</span>`;
    document.getElementById("toast-container").appendChild(el);
    setTimeout(() => (el.style.opacity = "0"), duration);
    setTimeout(() => el.remove(), duration + 300);
  }

  // ── Modal ─────────────────────────────────────────────────
  function modal(html, onClose) {
    closeModal();
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "active-modal";
    overlay.innerHTML = `
      <div class="modal animate-up">
        <button class="modal-close" onclick="UI.closeModal()">✕</button>
        ${html}
      </div>`;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal(onClose);
    });
    document.body.appendChild(overlay);
  }

  function closeModal(cb) {
    const m = document.getElementById("active-modal");
    if (m) m.remove();
    if (cb) cb();
  }

  // ── Loading ───────────────────────────────────────────────
  function setLoading(show, msg = "Processing Request...") {
    let el = document.getElementById("global-loading-overlay");
    if (show) {
      if (!el) {
        el = document.createElement("div");
        el.id = "global-loading-overlay";
        el.style.cssText = `
          position: fixed; inset: 0; 
          background: rgba(var(--bg-base-rgb, 15, 23, 42), 0.8); 
          backdrop-filter: blur(8px);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          z-index: 100000; font-family: var(--font-ui); color: #fff;
          transition: opacity 0.3s var(--ease);
        `;
        el.innerHTML = `
          <div class="spinner" style="width:50px; height:50px; border-width:4px; border-top-color:var(--accent-primary); margin-bottom:20px"></div>
          <p style="font-size:1.1rem; font-weight:800; letter-spacing:0.5px; margin:0; text-transform:uppercase">${msg}</p>
          <div style="margin-top:12px; font-size:0.75rem; opacity:0.6; font-weight:700">STAY ON THIS PAGE</div>
        `;
        document.body.appendChild(el);
      } else {
        el.querySelector("p").textContent = msg;
      }
      document.body.style.overflow = "hidden";
    } else if (el) {
      el.remove();
      document.body.style.overflow = "";
    }
  }

  // ── Page navigation ───────────────────────────────────────
  function navigate(page, data) {
    State.set("page", page);
    renderPage(page, data);
    updateNav(page);
  }

  function renderPage(page, data) {
    const main = document.getElementById("main-content");
    main.innerHTML = "";
    main.scrollTop = 0;
    const pages = {
      welcome: PageWelcome.render,
      "setup-topics": PageSetupTopics.render,
      "setup-filters": PageSetupFilters.render,
      "setup-config": PageSetupConfig.render,
      "setup-template": PageSetupTemplate.render,
      quiz: PageQuiz.render,
      result: PageResult.render,
      history: PageHistory.render,
      admin: PageAdmin.render,
    };
    if (pages[page]) pages[page](main, data);
    else main.innerHTML = `<p class="text-muted">Page not found: ${page}</p>`;
  }

  function updateNav(page) {
    document.querySelectorAll(".nav-item").forEach((b) => {
      b.classList.toggle("active", b.dataset.page === page);
    });
  }

  // ── Settings Modal ────────────────────────────────────────
  function openSettings() {
    const s = State.get("scriptUrl"),
      f = State.get("folderId");
    const fields = State.get("personalFields");
    const themes = [
      "light",
      "dark",
      "ocean",
      "forest",
      "midnight",
      "sat",
      "quizpro-dark",
      "editorial",
      "vibrant",
    ];
    const curTheme = State.get("theme");

    modal(`
      <h2 style="font-size:1.3rem;font-weight:800;margin-bottom:var(--sp-lg)">⚙ Settings</h2>

      <div style="display:flex;flex-direction:column;gap:var(--sp-lg)">
        <div class="card-elevated">
          <p class="form-label" style="margin-bottom:var(--sp-sm)">🎨 Theme</p>
          <div class="theme-picker" style="padding:0;gap:10px">
            ${themes
              .map(
                (t) => `
              <div class="theme-swatch ${
                t === curTheme ? "active" : ""
              }" data-t="${t}"
                   onclick="UI.setTheme('${t}')" title="${t}"></div>
            `
              )
              .join("")}
            <span style="font-size:.8rem;color:var(--text-secondary);align-self:center;margin-left:8px;text-transform:capitalize" id="theme-name">${curTheme}</span>
          </div>
        </div>

        <div style="display:none" id="hidden-config-fields">
          <div class="form-group">
            <label class="form-label">Google Apps Script URL</label>
            <input id="s-url" class="form-control" type="url" placeholder="https://script.google.com/macros/s/…/exec" value="${s}">
          </div>
          <div class="form-group">
            <label class="form-label">Root Folder ID</label>
            <input id="s-fid" class="form-control" type="text" placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs…" value="${f}">
          </div>
        </div>

        <div style="display:flex;gap:var(--sp-sm);flex-wrap:wrap">
          <button class="btn btn-secondary btn-sm" onclick="UI.testConn()">🔗 Test Connection</button>
          <button class="btn btn-danger btn-sm" onclick="UI.clearConfig()">🗑 Remove Config</button>
        </div>
        <button class="btn btn-primary btn-full" onclick="UI.saveSettings()">Save Settings</button>
      </div>
    `);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    State.set("theme", theme);
    document
      .querySelectorAll(".theme-swatch")
      .forEach((s) => s.classList.toggle("active", s.dataset.t === theme));
    const tn = document.getElementById("theme-name");
    if (tn) tn.textContent = theme;
  }

  async function testConn() {
    const url = document.getElementById("s-url").value.trim();
    const fid = document.getElementById("s-fid").value.trim();
    if (!url) return toast("Enter Script URL first", "warn");
    UI.setLoading(true, "Testing connection…");
    try {
      await API.testConnection(url, fid);
      toast("Connection successful!", "success");
    } catch (e) {
      toast("Connection failed: " + e.message, "error");
    } finally {
      UI.setLoading(false);
    }
  }

  function saveSettings() {
    const url = document.getElementById("s-url").value.trim();
    const fid = document.getElementById("s-fid").value.trim();
    State.set("scriptUrl", url);
    State.set("folderId", fid);
    closeModal();
    toast("Settings saved!", "success");
  }

  function clearConfig() {
    if (!confirm("Remove Script URL and Folder ID?")) return;
    State.set("scriptUrl", "");
    State.set("folderId", "");
    closeModal();
    toast("Config removed", "warn");
  }

  // ── Confirm dialog ────────────────────────────────────────
  function confirm2(msg, onYes, onNo) {
    modal(`
      <div style="text-align:center;padding:var(--sp-md) 0">
        <div style="font-size:2.5rem;margin-bottom:var(--sp-md)">⚠️</div>
        <p style="font-size:1rem;margin-bottom:var(--sp-xl)">${msg}</p>
        <div style="display:flex;gap:var(--sp-md);justify-content:center">
          <button class="btn btn-ghost" onclick="UI.closeModal()">Cancel</button>
          <button class="btn btn-danger" onclick="UI.closeModal();(${onYes})()">Confirm</button>
        </div>
      </div>
    `);
  }

  // ── Chip multi-select helper ──────────────────────────────
  function makeChips(container, items, selected = [], multi = true) {
    container.innerHTML = "";
    if (!items.length) {
      container.innerHTML =
        '<span class="text-muted text-sm">None available</span>';
      return;
    }
    items.forEach((item) => {
      const chip = document.createElement("div");
      chip.className = "chip" + (selected.includes(item) ? " selected" : "");
      chip.textContent = item;
      chip.onclick = () => {
        if (multi) {
          chip.classList.toggle("selected");
        } else {
          container
            .querySelectorAll(".chip")
            .forEach((c) => c.classList.remove("selected"));
          chip.classList.add("selected");
        }
      };
      container.appendChild(chip);
    });
  }

  function getSelectedChips(container) {
    return [...container.querySelectorAll(".chip.selected")].map(
      (c) => c.textContent
    );
  }

  // ── Back button history ───────────────────────────────────
  const _history = [];
  function pushPage(page, data) {
    _history.push({ page, data });
    navigate(page, data);
  }
  function goBack() {
    _history.pop(); // remove current
    const prev = _history[_history.length - 1];
    if (prev) navigate(prev.page, prev.data);
    else navigate("welcome");
  }

  function backBtn(label = "Back") {
    return `<button class="btn btn-ghost btn-sm" style="margin-bottom:var(--sp-lg)" onclick="UI.goBack()">← ${label}</button>`;
  }

  // ── Step navigator HTML ───────────────────────────────────
  function stepsHtml(steps, current) {
    return `
      <div class="steps-nav" >
        ${steps
          .map(
            (s, i) => `
          <div class="step-item ${
            i < current ? "done" : i === current ? "active" : ""
          }">
            ${
              i > 0
                ? `<div class="step-line ${i <= current ? "done" : ""}"></div>`
                : ""
            }
            <div class="step-circle">${i < current ? "✓" : i + 1}</div>
            <span class="step-label">${s}</span>
          </div>
        `
          )
          .join("")}
      </div>`;
  }

  function populateGroupSelect() {
    const sel = document.getElementById('group-select');
    if (!sel) return;
    sel.innerHTML = ENV.folders.map(f => `<option value="${f.id}" ${f.id === State.get('folderId') ? 'selected' : ''}>${f.name}</option>`).join('');
  }

  function changeGroup(folderId) {
    State.set('folderId', folderId);
    toast('Group changed! Reloading context...', 'info', 1500);
    setTimeout(() => location.reload(), 1500);
  }

  return {
    toast,
    modal,
    closeModal,
    setLoading,
    navigate,
    renderPage,
    updateNav,
    openSettings,
    setTheme,
    testConn,
    saveSettings,
    clearConfig,
    confirm2,
    makeChips,
    getSelectedChips,
    pushPage,
    goBack,
    backBtn,
    stepsHtml,
    populateGroupSelect,
    changeGroup,
    _history,
  };
})();
