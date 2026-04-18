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
    let container = document.getElementById("toast-container");
    if (!container) {
       container = document.createElement("div");
       container.id = "toast-container";
       document.body.appendChild(container);
    }
    container.appendChild(el);
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
          text-align: center;
        `;
        el.innerHTML = `
          <div class="spinner" style="width:50px; height:50px; border-width:4px; border-top-color:var(--accent-primary); margin-bottom:20px"></div>
          <p style="font-size:1.1rem; font-weight:800; letter-spacing:0.5px; margin:0; text-transform:uppercase; text-align: center;">${msg}</p>
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

  function stopSpeaking() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  // ── Typewriter Effect ────────────────────────────────────
  // NOTE: `text` must be plain text (no HTML). For HTML content, animate
  // plain text then swap innerHTML in the onComplete callback.
  function typewriter(el, text, speed = 15, onComplete) {
    if (!el) return;
    el.textContent = "";
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i++;
        if (el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight;
      } else {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, speed);
    return interval;
  }

  // ── Speech ────────────────────────────────────────────────
  function speak(text) {
    if (!window.speechSynthesis) {
      toast("Speech not supported in this browser", "warn");
      return;
    }

    stopSpeaking();

    try {
      // 1. Decode HTML entities
      const textarea = document.createElement("textarea");
      textarea.innerHTML = text;
      let decoded = textarea.value;

      // 2. Remove HTML tags
      const div = document.createElement("div");
      div.innerHTML = decoded;
      let cleanText = div.textContent || div.innerText || "";

      // 3. Improve readability (pauses, spacing)
      cleanText = cleanText
        .replace(/\s+/g, ' ')          // remove extra spaces
        .replace(/,/g, ', ')          // slight pause at commas
        .replace(/\./g, '. ')         // pause at full stop
        .replace(/\?/g, '? ')         // pause at question
        .replace(/!/g, '! ')          // pause at exclamation
        .trim();

      // 4. Speak
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.lang = "en-US"; // change if needed

      window.speechSynthesis.speak(utterance);

    } catch (e) {
      console.error("Speech error:", e);
    }
  }
  
  // ── Page navigation ───────────────────────────────────────
  function navigate(page, data) {
    State.set("page", page);
    renderPage(page, data);
    updateNav(page);
    if(page && page == 'history') {
      PageHistory.load();
    }
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

        <div style="display:none;gap:var(--sp-sm);flex-wrap:wrap">
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
    return `<button class="btn btn-ghost btn-sm" onclick="UI.goBack()">← ${label}</button>`;
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
    const menu = document.getElementById('group-dropdown-menu');
    const label = document.getElementById('active-group-label');
    if (!menu) return;
    
    const activeId = State.get('folderId');
    const groups = State.get('groups');
    const activeGroup = groups.find(f => f.id === activeId) || groups[0];
    if (label) label.textContent = activeGroup.name;

    let html = groups.map(f => `
      <div class="menu-item ${f.id === activeId ? 'active' : ''}" onclick="UI.changeGroup('${f.id}')">
        ${f.name}
      </div>
    `).join('');

    html += `
      <div class="menu-divider" style="height:1px; background:var(--border-color); margin:8px 0"></div>
      <div class="menu-item" style="color:var(--accent-primary); font-weight:800; text-align:center" onclick="UI.openGroupManager()">
        ⚙ MANAGE SETS
      </div>
    `;

    menu.innerHTML = html;
  }

  function toggleGroupMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('group-dropdown-menu');
    if (menu) menu.classList.toggle('hidden');
  }

  function toggleNavMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('nav-dropdown-menu');
    if (menu) menu.classList.toggle('hidden');
  }

  function changeGroup(folderId) {
    const groups = State.get('groups');
    const group = groups.find(g => g.id === folderId);
    
    State.set('folderId', folderId);
    if (group && group.scriptUrl) {
       State.set('scriptUrl', group.scriptUrl);
       toast('Custom Script Active for this Set!', 'success', 2000);
    } else {
       // Reset to global default if no override
       State.set('scriptUrl', localStorage.getItem('prepquiz_quiz_scriptUrl') || ENV.scriptUrl);
    }

    toast('Group switched! Syncing content...', 'info', 1000);
    setTimeout(() => location.reload(), 1000);
  }

  function updateGroupLabel() {
    const label = document.getElementById('active-group-label');
    if (!label) return;
    const activeId = State.get('folderId');
    const groups = State.get('groups');
    const activeGroup = groups.find(f => f.id === activeId) || groups[0];
    if (activeGroup) label.textContent = activeGroup.name;
  }

  // ── Group Manager ──────────────────────────────────────────
  function openGroupManager() {
    const groups = State.get('groups');
    const html = `
      <div style="padding: 10px">
        <h3 style="font-size:1.4rem; font-weight:900; margin-bottom:12px">Manage Choice Sets</h3>
        <p style="color:var(--text-muted); font-size:0.8rem; margin-bottom:20px">Add or edit your Google Script Folder IDs and optional Script URL overrides.</p>
        
        <div id="group-list-m" style="display:flex; flex-direction:column; gap:12px; max-height:350px; overflow-y:auto; margin-bottom:20px; padding-right:5px">
          ${groups.map((g, i) => `
            <div class="card-elevated" style="padding:6px; position:relative; border:1px solid var(--border-color); background:var(--bg-surface)">
               <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px">
                  <div style="font-weight:900; font-size:0.95rem; color:var(--accent-primary)">${g.name}</div>
                  <button class="icon-btn btn-sm" onclick="UI.removeGroup(${i})" style="color:var(--color-error); padding:4px">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
               </div>
               <div style="font-size:0.7rem; font-family:var(--font-mono); opacity:0.6; overflow:hidden; text-overflow:ellipsis">FOLDER: ${g.id}</div>
               ${g.scriptUrl ? ` <div style="font-size:0.6rem; color:var(--color-success); margin-top:6px; font-weight:800; display:flex; align-items:center; gap:4px">
                  <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  CUSTOM SCRIPT OVERRIDE ACTIVE
               </div>` : ''}
            </div>
          `).join('')}
        </div>

        <button class="btn btn-primary btn-outline btn-sm" onclick="UI.showAddGroupForm()" style="width:100%; border-style:dashed; margin-bottom:24px; border-radius:12px; height:44px; font-weight:800">+ Add New Location</button>

        <div style="text-align:right">
          <button class="btn btn-secondary" onclick="UI.closeModal()">Close</button>
        </div>
      </div>
    `;
    modal(html);
  }

  function showAddGroupForm() {
    const html = `
      <div style="padding: 10px">
        <h3 style="font-size:1.4rem; font-weight:900; margin-bottom:12px">Add New Set</h3>
        
        <div class="form-group" style="margin-bottom:16px">
           <label class="pro-label">SET NAME</label>
           <input type="text" id="new-g-name" class="pro-input" placeholder="e.g. Science Mastery">
        </div>

        <div class="form-group" style="margin-bottom:16px">
           <label class="pro-label">FOLDER ID</label>
           <input type="text" id="new-g-id" class="pro-input" placeholder="Google Drive Folder ID">
        </div>

        <div class="form-group" style="margin-bottom:24px">
           <label class="pro-label">CUSTOM SCRIPT URL (OPTIONAL)</label>
           <input type="text" id="new-g-script" class="pro-input" placeholder="Leave blank to use global default">
           <p style="font-size:0.65rem; color:var(--text-muted); margin-top:8px">Use this if this particular folder requires a different processing script.</p>
        </div>

        <div style="display:flex; gap:12px; justify-content:flex-end">
          <button class="btn btn-secondary" onclick="UI.openGroupManager()">Cancel</button>
          <button class="btn btn-primary" onclick="UI.addGroup()">Save Location</button>
        </div>
      </div>
    `;
    modal(html);
  }

  function addGroup() {
    const name = document.getElementById('new-g-name').value.trim();
    const id = document.getElementById('new-g-id').value.trim();
    const scriptUrl = document.getElementById('new-g-script').value.trim();

    if (!name || !id) {
       toast('Name and Folder ID are required', 'warn');
       return;
    }

    const groups = State.get('groups');
    groups.push({ name, id, scriptUrl: scriptUrl || undefined });
    State.set('groups', groups);

    toast('New location added!', 'success');
    openGroupManager();
    populateGroupSelect();
  }

  function removeGroup(idx) {
    const groups = State.get('groups');
    if (groups.length <= 1) {
       toast('At least one location is required', 'warn');
       return;
    }
    
    groups.splice(idx, 1);
    State.set('groups', groups);
    openGroupManager();
    populateGroupSelect();
  }

  // Global click management
  document.addEventListener('click', () => {
    document.getElementById('group-dropdown-menu')?.classList.add('hidden');
    document.getElementById('nav-dropdown-menu')?.classList.add('hidden');
  });

  function confetti() {
    let canvas = document.getElementById('confetti-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'confetti-canvas';
      document.body.appendChild(canvas);
    }
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles = [];
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6'];

    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            r: Math.random() * 6 + 4,
            d: Math.random() * 150,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.random() * 10 - 10,
            tiltAngleIncremental: Math.random() * 0.07 + 0.05,
            tiltAngle: 0
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let finished = true;
        particles.forEach((p, i) => {
            p.tiltAngle += p.tiltAngleIncremental;
            p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
            p.x += Math.sin(p.d);
            p.tilt = Math.sin(p.tiltAngle) * 15;
            if (p.y <= canvas.height) finished = false;
            ctx.beginPath(); ctx.lineWidth = p.r; ctx.strokeStyle = p.color;
            ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
            ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
            ctx.stroke();
        });
        if (!finished) requestAnimationFrame(draw);
        else canvas.remove();
    }
    draw();
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
    toggleGroupMenu,
    toggleNavMenu,
    updateGroupLabel,
    openGroupManager,
    showAddGroupForm,
    addGroup,
    removeGroup,
    speak,
    stopSpeaking,
    typewriter,
    confetti
  };
})();
