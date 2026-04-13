// src/components/UI.js
import React from 'react';
import { useApp } from '../context/AppContext';

// ============================================================
// TOAST
// ============================================================
export function ToastContainer() {
  const { toasts } = useApp();
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✗' : 'ℹ'}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// SPINNER
// ============================================================
export function Spinner({ size = 40 }) {
  return (
    <div style={{ width: size, height: size, border: `3px solid var(--border-color)`, borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
  );
}

export function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <Spinner size={48} />
      <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>{message}</p>
    </div>
  );
}

// ============================================================
// TIMER DISPLAY
// ============================================================
export function TimerDisplay({ seconds, total }) {
  const pct = total > 0 ? (seconds / total) : 1;
  const cls = pct < 0.1 ? 'danger' : pct < 0.25 ? 'warning' : '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const fmt = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return <span className={`timer-display ${cls}`}>{fmt}</span>;
}

// ============================================================
// CHIP SELECT
// ============================================================
export function ChipSelect({ options, selected, onChange, multi = true, showAll = true }) {
  function toggle(val) {
    if (!multi) { onChange([val]); return; }
    if (val === 'ALL') { onChange(['ALL']); return; }
    const withoutAll = selected.filter(s => s !== 'ALL');
    const next = withoutAll.includes(val)
      ? withoutAll.filter(s => s !== val)
      : [...withoutAll, val];
    onChange(next.length === 0 ? ['ALL'] : next);
  }

  const isAll = selected.includes('ALL') || selected.length === 0;

  return (
    <div className="chip-group">
      {showAll && (
        <div className={`chip all-chip ${isAll ? 'active' : ''}`} onClick={() => onChange(['ALL'])}>
          All
        </div>
      )}
      {options.map(opt => (
        <div
          key={opt}
          className={`chip ${!isAll && selected.includes(opt) ? 'active' : ''}`}
          onClick={() => toggle(opt)}
        >
          {opt}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// STEP INDICATOR
// ============================================================
export function StepIndicator({ steps, current }) {
  return (
    <div className="step-indicator" style={{ justifyContent: 'center', maxWidth: 400, margin: '0 auto 32px' }}>
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div className={`step-dot ${i < current ? 'completed' : i === current ? 'active' : ''}`}>
              {i < current ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: 11, color: i === current ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: i === current ? 700 : 400, whiteSpace: 'nowrap' }}>{step}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`step-line ${i < current ? 'completed' : ''}`} style={{ marginBottom: 18 }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ============================================================
// SCORE RING
// ============================================================
export function ScoreRing({ score, total, size = 160, color = 'var(--accent-primary)' }) {
  const pct = total > 0 ? score / total : 0;
  const r = (size / 2) - 12;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * pct;
  const displayPct = Math.round(pct * 100);

  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-color)" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="score-ring-text">
        <div className="score-ring-value">{displayPct}%</div>
        <div className="score-ring-label">{score}/{total}</div>
      </div>
    </div>
  );
}

// ============================================================
// BADGE
// ============================================================
export function DifficultyBadge({ difficulty }) {
  const d = (difficulty || '').toLowerCase();
  const cls = d === 'easy' ? 'badge-easy' : d === 'medium' ? 'badge-medium' : d === 'hard' ? 'badge-hard' : 'badge-info';
  return <span className={`badge ${cls}`}>{difficulty || 'Unknown'}</span>;
}

// ============================================================
// MODAL
// ============================================================
export function Modal({ open, onClose, children, title }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        {title && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>{title}</h3>
            <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ============================================================
// TOPBAR
// ============================================================
export function Topbar({ showBack, onBack, title, actions }) {
  const { setSettingsPanelOpen, settings, updateSettings, page, PAGES } = useApp();
  return (
    <nav className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {showBack && (
          <button className="btn btn-ghost btn-icon" onClick={onBack} title="Back">←</button>
        )}
        <div className="topbar-logo">
          <span style={{ color: 'var(--accent-primary)' }}>⚡</span>
          {title || <><span>Quiz</span>Pro</>}
        </div>
      </div>
      <div className="topbar-actions">
        {actions}
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
          title="Toggle theme"
        >
          {settings.theme === 'dark' ? '☀' : '🌙'}
        </button>
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => setSettingsPanelOpen(true)}
          title="Settings"
        >
          ⚙
        </button>
      </div>
    </nav>
  );
}

// ============================================================
// SETTINGS PANEL
// ============================================================
export function SettingsPanel() {
  const { settingsPanelOpen, setSettingsPanelOpen, settings, updateSettings, resetSettings, addToast, apiCall } = useApp();
  const [localUrl, setLocalUrl] = React.useState(settings.scriptUrl);
  const [localFolder, setLocalFolder] = React.useState(settings.folderId);
  const [validating, setValidating] = React.useState(false);

  async function handleSave() {
    updateSettings({ scriptUrl: localUrl, folderId: localFolder });
    addToast('Settings saved!', 'success');
    setSettingsPanelOpen(false);
  }

  async function handleValidate() {
    setValidating(true);
    try {
      const prev = settings.scriptUrl;
      updateSettings({ scriptUrl: localUrl, folderId: localFolder });
      const result = await apiCall('validateFolder', { folderId: localFolder });
      if (result.valid) addToast(`✓ Connected: "${result.rootName}"`, 'success');
      else addToast('Folder validation failed: ' + result.error, 'error');
    } catch (e) {
      addToast('Error: ' + e.message, 'error');
    }
    setValidating(false);
  }

  const templates = ['classic', 'minimal', 'bold', 'card', 'compact'];

  return (
    <>
      {settingsPanelOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--bg-overlay)', zIndex: 199 }}
          onClick={() => setSettingsPanelOpen(false)} />
      )}
      <div className={`settings-panel ${settingsPanelOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>⚙ Settings</h3>
          <button className="btn btn-ghost btn-icon" onClick={() => setSettingsPanelOpen(false)}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="form-group">
            <label className="form-label">Apps Script URL</label>
            <input className="form-input" value={localUrl} onChange={e => setLocalUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec" />
          </div>

          <div className="form-group">
            <label className="form-label">Root Folder ID</label>
            <input className="form-input" value={localFolder} onChange={e => setLocalFolder(e.target.value)}
              placeholder="Google Drive folder ID" />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleValidate} disabled={validating}>
              {validating ? 'Testing...' : 'Test Connection'}
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>Save</button>
          </div>

          <hr style={{ borderColor: 'var(--border-color)' }} />

          <div className="form-group">
            <label className="form-label">Theme</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['light', 'dark'].map(t => (
                <button key={t} className={`btn ${settings.theme === t ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }} onClick={() => updateSettings({ theme: t })}>
                  {t === 'dark' ? '🌙 Dark' : '☀ Light'}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Quiz Template</label>
            <div className="chip-group">
              {templates.map(t => (
                <div key={t} className={`chip ${settings.template === t ? 'active' : ''}`}
                  style={{ textTransform: 'capitalize' }}
                  onClick={() => updateSettings({ template: t })}>
                  {t}
                </div>
              ))}
            </div>
          </div>

          <hr style={{ borderColor: 'var(--border-color)' }} />

          <button className="btn btn-danger" onClick={resetSettings}>Reset to Defaults</button>
        </div>
      </div>
    </>
  );
}