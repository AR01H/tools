// ============================================================
//  api.js  — Quiz App API layer (calls Google Apps Script)
// ============================================================

const API = (() => {
  // ── Config (loaded from localStorage or defaults) ────────
  function getConfig() {
    const saved = localStorage.getItem("qm_settings");
    return saved ? JSON.parse(saved) : { scriptUrl: "", folderId: "" };
  }

  function getScriptUrl() {
    const url = getConfig().scriptUrl;
    if (!url) throw new Error("Script URL not configured. Open Settings ⚙ to add your Web App URL.");
    return url;
  }

  // ── Generic fetch ─────────────────────────────────────────
  async function call(action, payload = {}) {
    const url = getScriptUrl();
    const res = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ action, ...payload }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  // ── Public API ────────────────────────────────────────────
  return {
    isConfigured() {
      return !!getConfig().scriptUrl;
    },

    saveSettings(settings) {
      localStorage.setItem("qm_settings", JSON.stringify(settings));
    },

    loadSettings() {
      return getConfig();
    },

    clearSettings() {
      localStorage.removeItem("qm_settings");
    },

    async getTopics() {
      return call("getTopics");
    },

    async getQuizConfigs() {
      return call("getQuizConfigs");
    },

    async getFilterMeta(topics) {
      return call("getFilterMeta", { topics });
    },

    async getQuestions(filters) {
      return call("getQuestions", filters);
    },

    async startAttempt(info) {
      return call("startAttempt", info);
    },

    async submitAttempt(result) {
      return call("submitAttempt", result);
    },

    async getAttempt(detailFileId) {
      return call("getAttempt", { detailFileId });
    },

    async listAttempts(contact) {
      return call("listAttempts", { contact });
    },
  };
})();
