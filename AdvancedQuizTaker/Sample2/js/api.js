// ============================================================
//  QUIZ APP — api.js
//  All communication with the Google Apps Script backend
// ============================================================

const API = (() => {
  function getUrl() {
    const url = State.get('scriptUrl');
    if (!url) throw new Error('Script URL not configured. Open Settings to add it.');
    return url;
  }
  function getFolderId() {
    return State.get('folderId') || '';
  }

  async function call(action, params = {}, body = null) {
    const baseUrl = getUrl();
    const folderId = getFolderId();
    const qs = new URLSearchParams({ action, folderId, ...params });
    const url = `${baseUrl}?${qs}`;

    const opts = body
      ? { method: 'POST', body: JSON.stringify({ ...body, action }), headers: { 'Content-Type': 'application/json' } }
      : { method: 'GET' };

    const res = await fetch(url, opts);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'API error');
    return json.data;
  }

  // ── Public Methods ────────────────────────────────────────

  async function getTopics() {
    return call('getTopics');
  }

  async function getQuestions(topicNames) {
    return call('getQuestions', { topics: topicNames.join('|') });
  }

  async function getQuizConfigs() {
    return call('getQuizConfigs');
  }

  async function startAttempt(payload) {
    return call('startAttempt', {}, payload);
  }

  async function endAttempt(payload) {
    return call('endAttempt', {}, payload);
  }

  async function saveAttemptDetail(fileId, rows) {
    return call('saveAttemptDetail', {}, { fileId, rows });
  }

  async function getAttempt(fileId) {
    return call('getAttempt', { fileId });
  }

  // ── Test connection ───────────────────────────────────────
  async function testConnection(scriptUrl, folderId) {
    const qs = new URLSearchParams({ action: 'getTopics', folderId });
    const res = await fetch(`${scriptUrl}?${qs}`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error);
    return true;
  }

  return { getTopics, getQuestions, getQuizConfigs, startAttempt, endAttempt, saveAttemptDetail, getAttempt, testConnection };
})();