// ============================================================
//  QUIZ APP — admin.js
//  Admin panel page — runs inside the main app using existing API connection
// ============================================================

const PageAdmin = (() => {

  let _authed = false;

  // ── RENDER ─────────────────────────────────────────────────
  function render(container) {
    _authed = !!sessionStorage.getItem('adminToken');
    container.innerHTML = `
      <div style="max-width:1100px; margin:0 auto; padding:var(--sp-2xl)">
        <div style="margin-bottom:32px;">
          <h1 style="font-size:2rem; font-weight:800; font-family:var(--font-display,sans-serif); margin:0;">System Administration</h1>
          <div style="color:var(--text-secondary); margin-top:6px;">Manage database records, users and attempt history</div>
        </div>
        <div id="admin-content"></div>
      </div>`;
    _authed ? renderDashboard() : renderLogin();
  }

  // ── LOGIN VIEW ─────────────────────────────────────────────
  function renderLogin() {
    document.getElementById('admin-content').innerHTML = `
      <div style="max-width:420px; margin:0 auto; background:var(--bg-elevated); border:1px solid var(--border-color); border-radius:16px; padding:32px;">
        <h2 style="margin-bottom:24px; font-size:1.3rem; font-weight:800;">Admin Authentication</h2>
        <div style="margin-bottom:16px;">
          <label style="display:block;font-size:0.8rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Username</label>
          <input type="text" id="adm-user" placeholder="admin" style="width:100%;background:var(--bg-body);border:1px solid var(--border-color);color:var(--text-primary);padding:12px 16px;border-radius:8px;font-size:1rem;font-family:inherit;">
        </div>
        <div style="margin-bottom:24px;">
          <label style="display:block;font-size:0.8rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;margin-bottom:8px;">Password</label>
          <input type="password" id="adm-pass" placeholder="••••••••" style="width:100%;background:var(--bg-body);border:1px solid var(--border-color);color:var(--text-primary);padding:12px 16px;border-radius:8px;font-size:1rem;font-family:inherit;">
        </div>
        <button id="adm-login-btn" onclick="PageAdmin.login()" style="width:100%;background:var(--accent-primary,#6366f1);color:#fff;padding:14px;border:none;border-radius:8px;font-size:1rem;font-weight:700;cursor:pointer;">
          Authenticate Access
        </button>
        <div id="adm-err" style="margin-top:16px;color:#ef4444;font-size:0.9rem;font-weight:600;display:none;"></div>
      </div>`;
  }

  // ── DASHBOARD VIEW ─────────────────────────────────────────
  function renderDashboard() {
    document.getElementById('admin-content').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;">
        <div style="display:flex;gap:12px;">
          <button onclick="PageAdmin.loadDashboard()" style="background:var(--accent-primary,#6366f1);color:#fff;padding:10px 20px;border:none;border-radius:8px;font-weight:700;cursor:pointer;">⟳ Refresh</button>
          <button onclick="PageAdmin.doLogout()" style="background:transparent;color:var(--text-secondary);padding:10px 20px;border:1px solid var(--border-color);border-radius:8px;font-weight:700;cursor:pointer;">Logout</button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;margin-bottom:40px;">
        <div style="background:var(--bg-elevated);border:1px solid var(--border-color);border-radius:12px;padding:24px;">
          <div style="font-size:0.8rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;">Total Attempts</div>
          <div id="adm-attempts" style="font-size:2.5rem;font-weight:900;color:var(--accent-primary,#6366f1);line-height:1;margin-top:8px;">--</div>
        </div>
        <div style="background:var(--bg-elevated);border:1px solid var(--border-color);border-radius:12px;padding:24px;">
          <div style="font-size:0.8rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;">Unique Users</div>
          <div id="adm-users" style="font-size:2.5rem;font-weight:900;color:var(--accent-primary,#6366f1);line-height:1;margin-top:8px;">--</div>
        </div>
        <div style="background:var(--bg-elevated);border:1px solid var(--border-color);border-radius:12px;padding:24px;">
          <div style="font-size:0.8rem;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;">System Status</div>
          <div style="font-size:2rem;font-weight:900;color:#10b981;line-height:1;margin-top:8px;">ONLINE</div>
        </div>
      </div>

      <div style="background:var(--bg-elevated);border:1px solid rgba(239,68,68,0.35);border-radius:12px;padding:24px;margin-bottom:40px;">
        <h3 style="color:#ef4444;margin-bottom:12px;font-size:1rem;">⚠️ Danger Zone</h3>
        <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:20px;">Permanently wipes ALL attempt records and detail files from Google Drive. Irreversible.</p>
        <button onclick="PageAdmin.clearHistory()" style="background:rgba(239,68,68,0.1);color:#ef4444;padding:12px 24px;border:1px solid rgba(239,68,68,0.3);border-radius:8px;font-weight:700;cursor:pointer;">
          Clear All Assessment History
        </button>
      </div>

      <h3 style="margin-bottom:16px;font-size:1.1rem;font-weight:800;">Recent Global Attempts</h3>
      <div style="overflow-x:auto;border:1px solid var(--border-color);border-radius:12px;background:var(--bg-elevated);">
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
          <thead>
            <tr style="background:var(--bg-body);">
              <th style="padding:14px 16px;text-align:left;font-size:0.8rem;font-weight:800;color:var(--text-secondary);text-transform:uppercase;border-bottom:1px solid var(--border-color);">Timestamp</th>
              <th style="padding:14px 16px;text-align:left;font-size:0.8rem;font-weight:800;color:var(--text-secondary);text-transform:uppercase;border-bottom:1px solid var(--border-color);">Candidate</th>
              <th style="padding:14px 16px;text-align:left;font-size:0.8rem;font-weight:800;color:var(--text-secondary);text-transform:uppercase;border-bottom:1px solid var(--border-color);">Quiz/Topic</th>
              <th style="padding:14px 16px;text-align:left;font-size:0.8rem;font-weight:800;color:var(--text-secondary);text-transform:uppercase;border-bottom:1px solid var(--border-color);">Score</th>
              <th style="padding:14px 16px;text-align:left;font-size:0.8rem;font-weight:800;color:var(--text-secondary);text-transform:uppercase;border-bottom:1px solid var(--border-color);">File ID</th>
            </tr>
          </thead>
          <tbody id="adm-table"></tbody>
        </table>
      </div>`;

    loadDashboard();
  }

  // ── ACTIONS ────────────────────────────────────────────────
  async function login() {
    const user = document.getElementById('adm-user').value.trim();
    const pass = document.getElementById('adm-pass').value;
    const btn = document.getElementById('adm-login-btn');
    const err = document.getElementById('adm-err');

    if (!user || !pass) { showErr('Please fill both fields'); return; }
    btn.textContent = 'Authenticating...'; btn.disabled = true;
    err.style.display = 'none';

    try {
      const data = await API.adminLogin(user, pass);
      if (data.token) {
        sessionStorage.setItem('adminToken', data.token);
        _authed = true;
        renderDashboard();
        UI.toast('Admin access granted', 'success');
      } else {
        throw new Error('No token returned');
      }
    } catch(e) {
      showErr(e.message);
    } finally {
      if (btn) { btn.textContent = 'Authenticate Access'; btn.disabled = false; }
    }
  }

  function showErr(msg) {
    const e = document.getElementById('adm-err');
    if (e) { e.textContent = msg; e.style.display = 'block'; }
  }

  function doLogout() {
    sessionStorage.removeItem('adminToken');
    _authed = false;
    renderLogin();
    UI.toast('Logged out of admin', 'info');
  }

  async function loadDashboard() {
    const tbody = document.getElementById('adm-table');
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted);">Loading...</td></tr>';

    try {
      const data = await API.adminStats();
      const ea = document.getElementById('adm-attempts');
      const eu = document.getElementById('adm-users');
      if (ea) ea.textContent = data.totalAttempts || 0;
      if (eu) eu.textContent = data.totalUsers || 0;

      if (!tbody) return;
      if (!data.history || !data.history.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-muted);">No attempts found.</td></tr>';
        return;
      }
      tbody.innerHTML = [...data.history].reverse().map(r => {
        const d = r.timestamp && r.timestamp !== '-' ? new Date(r.timestamp).toLocaleString() : '-';
        return `<tr style="border-bottom:1px solid var(--border-color);">
          <td style="padding:14px 16px;">${d}</td>
          <td style="padding:14px 16px;font-weight:700;color:var(--accent-primary,#6366f1)">${r.userId || '—'}</td>
          <td style="padding:14px 16px;">${r.quizName || '-'} <span style="color:var(--text-muted)">(${r.quizTopic || '-'})</span></td>
          <td style="padding:14px 16px;font-weight:800;">${r.score || '-'}</td>
          <td style="padding:14px 16px;font-size:0.75rem;color:var(--text-muted);font-family:monospace;">${r.fileId || 'N/A'}</td>
        </tr>`;
      }).join('');
    } catch(e) {
      UI.toast('Admin load failed: ' + e.message, 'error');
      if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="color:#ef4444;padding:24px;text-align:center;">Error: ${e.message}</td></tr>`;
      if (e.message.toLowerCase().includes('auth') || e.message.toLowerCase().includes('unauthorized')) doLogout();
    }
  }

  async function clearHistory() {
    if (!confirm('WARNING: Permanently wipes ALL attempt records. Continue?')) return;
    try {
      UI.toast('Wiping database...', 'warn');
      await API.adminClearHistory();
      UI.toast('Database cleared successfully.', 'success');
      loadDashboard();
    } catch(e) {
      UI.toast('Wipe failed: ' + e.message, 'error');
    }
  }

  return { render, login, doLogout, loadDashboard, clearHistory };
})();
