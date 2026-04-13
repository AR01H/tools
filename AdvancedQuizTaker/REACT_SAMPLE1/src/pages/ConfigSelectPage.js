// src/pages/ConfigSelectPage.js
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Topbar, SettingsPanel, LoadingScreen, StepIndicator } from '../components/UI';

const TOGGLE_FIELDS = [
  'Adaptive Mode', 'Random Options', 'Allow Option Change', "Don't Change Until Correct",
  'Mandatory Answer', 'Negative Marking', 'Partial Scoring', 'Allow Back',
  'Mark for Review', 'Auto Next Question', 'Auto Submit', 'Pause / Resume Allowed',
  'Tracking', 'Instant Answer', 'Instant Answer Feedback', 'Show Hint',
  'Final Result', 'Question Wise Result', 'Adaptive Retake'
];

const SELECT_FIELDS = [
  { key: 'Section Order', options: ['Fixed', 'Random'] },
  { key: 'Question Navigation', options: ['Free', 'Sequential'] },
];

export default function ConfigSelectPage() {
  const { setPage, PAGES, apiCall, settings, quizState, setQuizState, addToast } = useApp();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('preset'); // 'preset' | 'custom'
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customConfig, setCustomConfig] = useState({});

  useEffect(() => {
    apiCall('getQuizConfigs', { folderId: settings.folderId })
      .then(data => {
        setConfigs(data.configs || []);
        if (data.configs?.length) setSelectedPreset(data.configs[0]);
      })
      .catch(e => addToast('Failed to load configs: ' + e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Init custom config from first preset
  useEffect(() => {
    if (configs.length && Object.keys(customConfig).length === 0) {
      setCustomConfig({ ...configs[0] });
    }
  }, [configs]);

  function handleStart() {
    const finalConfig = mode === 'preset' ? selectedPreset : customConfig;
    if (!finalConfig) { addToast('Please select a configuration', 'error'); return; }
    setQuizState(prev => ({ ...prev, selectedConfig: { ...finalConfig, questionCount: quizState?.filters?.questionCount } }));
    setPage(PAGES.QUIZ);
  }

  function toggleCustom(key) {
    setCustomConfig(prev => ({ ...prev, [key]: prev[key] === 'On' ? 'Off' : 'On' }));
  }

  if (loading) return <div className="app-shell"><Topbar /><LoadingScreen message="Loading configurations..." /></div>;

  const cfg = mode === 'preset' ? selectedPreset : customConfig;

  return (
    <div className="app-shell">
      <Topbar showBack onBack={() => setPage(PAGES.FILTER_SELECT)} />
      <SettingsPanel />
      <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div className="page-enter">
          <StepIndicator steps={['Topic', 'Filters', 'Config', 'Quiz']} current={2} />

          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, marginBottom: 8, textAlign: 'center' }}>
              Quiz Configuration
            </h2>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: 32 }}>
              Choose a preset mode or customize every setting
            </p>

            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 28, justifyContent: 'center' }}>
              <button className={`btn ${mode === 'preset' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setMode('preset')}>
                📋 Preset Modes
              </button>
              <button className={`btn ${mode === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setMode('custom')}>
                ⚙ Custom
              </button>
            </div>

            {mode === 'preset' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
                {configs.map((c, i) => {
                  const isSelected = selectedPreset?.['Quiz Settings Title'] === c['Quiz Settings Title'];
                  const icons = ['📝', '🎯', '🔒', '⏱', '🧠', '🔄'];
                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedPreset(c)}
                      style={{
                        padding: '20px',
                        border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-lg)',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(255,90,31,0.06)' : 'var(--bg-card)',
                        transition: 'all var(--transition)',
                      }}
                    >
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{icons[i % icons.length]}</div>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{c['Quiz Settings Title']}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {c['Quiz Time'] > 0 ? `${Math.floor(c['Quiz Time'] / 60)} min` : 'Untimed'}
                        {c['Negative Marking'] === 'On' ? ' · Negative' : ''}
                        {c['Adaptive Mode'] === 'On' ? ' · Adaptive' : ''}
                      </div>
                      {isSelected && (
                        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--accent-primary)', fontWeight: 700 }}>✓ SELECTED</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="card-elevated" style={{ marginBottom: 28 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 20, fontFamily: 'var(--font-display)' }}>Custom Configuration</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div className="form-group">
                    <label className="form-label">Quiz Time (seconds, 0 = unlimited)</label>
                    <input type="number" className="form-input" value={customConfig['Quiz Time'] || ''}
                      onChange={e => setCustomConfig(p => ({ ...p, 'Quiz Time': e.target.value }))} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Question Time (seconds, 0 = unlimited)</label>
                    <input type="number" className="form-input" value={customConfig['Question Time'] || ''}
                      onChange={e => setCustomConfig(p => ({ ...p, 'Question Time': e.target.value }))} placeholder="0" />
                  </div>
                  {SELECT_FIELDS.map(({ key, options }) => (
                    <div className="form-group" key={key}>
                      <label className="form-label">{key}</label>
                      <select className="form-select" value={customConfig[key] || options[0]}
                        onChange={e => setCustomConfig(p => ({ ...p, [key]: e.target.value }))}>
                        {options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                  {TOGGLE_FIELDS.map(field => (
                    <div key={field}
                      onClick={() => toggleCustom(field)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', cursor: 'pointer', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{field}</span>
                      <div style={{
                        width: 36, height: 20, borderRadius: 10,
                        background: customConfig[field] === 'On' ? 'var(--accent-primary)' : 'var(--border-strong)',
                        position: 'relative', transition: 'all var(--transition)'
                      }}>
                        <div style={{
                          width: 14, height: 14, borderRadius: '50%', background: '#fff',
                          position: 'absolute', top: 3,
                          left: customConfig[field] === 'On' ? 19 : 3,
                          transition: 'left var(--transition)'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Config Preview */}
            {cfg && (
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Configuration Summary</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {[
                    ['Time', cfg['Quiz Time'] > 0 ? `${Math.floor(cfg['Quiz Time'] / 60)}m` : 'Untimed'],
                    ['Q-Time', cfg['Question Time'] > 0 ? `${cfg['Question Time']}s` : 'None'],
                    ['Order', cfg['Section Order']],
                    ['Navigation', cfg['Question Navigation']],
                    ['Negative', cfg['Negative Marking']],
                    ['Partial', cfg['Partial Scoring']],
                    ['Instant', cfg['Instant Answer']],
                    ['Back', cfg['Allow Back']],
                    ['Result', cfg['Final Result']],
                  ].map(([k, v]) => v && (
                    <span key={k} style={{ fontSize: 12, padding: '4px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-full)', color: 'var(--text-secondary)' }}>
                      <b>{k}:</b> {v}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button className="btn btn-primary btn-lg w-full" onClick={handleStart}>
              🚀 Start Quiz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}