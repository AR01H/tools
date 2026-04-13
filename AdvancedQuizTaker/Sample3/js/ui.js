// ============================================================
//  ui.js  — UI Helpers: page routing, toast, modals, navbar
// ============================================================

const UI = (() => {

  // ── Page navigation ───────────────────────────────────────
  function showPage(pageId) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const p = document.getElementById("page-" + pageId);
    if (p) p.classList.add("active");
    State.setPage(pageId);
    window.scrollTo(0, 0);
  }

  // ── Toast ─────────────────────────────────────────────────
  function toast(msg, type = "info", duration = 3500) {
    const icons = { success: "fa-check-circle", error: "fa-times-circle", warning: "fa-exclamation-triangle", info: "fa-info-circle" };
    const container = document.getElementById("toast-container");
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.innerHTML = `<i class="fas ${icons[type]}"></i><span>${msg}</span>`;
    container.appendChild(el);
    setTimeout(() => el.remove(), duration);
  }

  // ── Loading overlay on button ─────────────────────────────
  function btnLoading(btn, loading) {
    if (loading) {
      btn.dataset.origHtml = btn.innerHTML;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> Loading…`;
      btn.disabled = true;
    } else {
      btn.innerHTML = btn.dataset.origHtml || btn.innerHTML;
      btn.disabled = false;
    }
  }

  // ── App-level loading screen ──────────────────────────────
  function setAppLoading(loading, msg = "Loading…") {
    const el = document.getElementById("app-loading");
    if (!el) return;
    el.style.display = loading ? "flex" : "none";
    const msgEl = el.querySelector(".loading-msg");
    if (msgEl) msgEl.textContent = msg;
  }

  // ── Modal helpers ─────────────────────────────────────────
  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("open");
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("open");
  }

  // ── Settings panel ────────────────────────────────────────
  function openSettings() {
    document.getElementById("settings-overlay").classList.add("open");
    loadSettingsForm();
  }

  function closeSettings() {
    document.getElementById("settings-overlay").classList.remove("open");
  }

  function loadSettingsForm() {
    const s = API.loadSettings();
    const urlInput = document.getElementById("settings-script-url");
    const folderInput = document.getElementById("settings-folder-id");
    if (urlInput) urlInput.value = s.scriptUrl || "";
    if (folderInput) folderInput.value = s.folderId || "";
  }

  function saveSettingsForm() {
    const scriptUrl = document.getElementById("settings-script-url").value.trim();
    const folderId  = document.getElementById("settings-folder-id").value.trim();
    API.saveSettings({ scriptUrl, folderId });
    toast("Settings saved!", "success");
    closeSettings();
  }

  function clearSettingsForm() {
    if (!confirm("Remove saved Script URL and Folder ID?")) return;
    API.clearSettings();
    document.getElementById("settings-script-url").value = "";
    document.getElementById("settings-folder-id").value = "";
    toast("Settings cleared. Using defaults.", "info");
  }

  // ── Theme toggle ──────────────────────────────────────────
  function toggleTheme() {
    const current = State.getUI().theme;
    State.setTheme(current === "dark" ? "light" : "dark");
    updateThemeIcon();
  }

  function updateThemeIcon() {
    const btn = document.getElementById("theme-toggle");
    const isDark = State.getUI().theme === "dark";
    if (btn) btn.innerHTML = `<i class="fas ${isDark ? "fa-sun" : "fa-moon"}"></i>`;
  }

  // ── Navbar quiz progress ──────────────────────────────────
  function updateQuizNavbar() {
    const q = State.getQuiz();
    const el = document.getElementById("nav-quiz-progress");
    if (!el) return;
    el.style.display = q.active ? "flex" : "none";
    if (q.active) {
      const answered = Object.keys(q.answers).length;
      el.innerHTML = `<span class="text-sm fw-600">${answered}/${q.questions.length} answered</span>`;
    }
  }

  // ── Skeleton row builder ──────────────────────────────────
  function skeletonRows(n, h = 40) {
    return Array.from({ length: n }, () =>
      `<div class="skeleton mb-2" style="height:${h}px;width:${Math.floor(60 + Math.random()*35)}%"></div>`
    ).join("");
  }

  // ── Share / copy link ─────────────────────────────────────
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => toast("Copied to clipboard!", "success"));
  }

  // ── Sidebar toggle (mobile) ───────────────────────────────
  function toggleQuizSidebar() {
    document.querySelector(".quiz-sidebar")?.classList.toggle("open");
  }

  // ── Init ──────────────────────────────────────────────────
  function init() {
    // Restore theme
    const savedTheme = localStorage.getItem("qm_theme") || "light";
    State.setTheme(savedTheme);
    updateThemeIcon();

    // Restore quiz theme
    const savedQTheme = localStorage.getItem("qm_quiz_theme") || "default";
    State.setQuizTheme(savedQTheme);

    // Settings btn
    document.getElementById("btn-settings")?.addEventListener("click", openSettings);
    document.getElementById("settings-close")?.addEventListener("click", closeSettings);
    document.getElementById("settings-overlay")?.addEventListener("click", e => {
      if (e.target === e.currentTarget) closeSettings();
    });
    document.getElementById("btn-save-settings")?.addEventListener("click", saveSettingsForm);
    document.getElementById("btn-clear-settings")?.addEventListener("click", clearSettingsForm);
    document.getElementById("theme-toggle")?.addEventListener("click", toggleTheme);
    document.getElementById("btn-sidebar-toggle")?.addEventListener("click", toggleQuizSidebar);
  }

  return {
    showPage, toast, btnLoading, setAppLoading,
    openModal, closeModal, openSettings, closeSettings,
    toggleTheme, updateThemeIcon, updateQuizNavbar,
    skeletonRows, copyToClipboard, toggleQuizSidebar, init,
  };
})();
