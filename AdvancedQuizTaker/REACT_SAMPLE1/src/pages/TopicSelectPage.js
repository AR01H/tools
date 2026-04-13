// src/pages/TopicSelectPage.js
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Topbar, SettingsPanel, LoadingScreen, ChipSelect, StepIndicator } from '../components/UI';

export default function TopicSelectPage() {
  const { setPage, PAGES, apiCall, settings, quizState, setQuizState, addToast } = useApp();
  const [topics, setTopics] = useState([]);
  const [selected, setSelected] = useState(quizState?.selectedTopics || ['ALL']);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiCall('getTopics', { folderId: settings.folderId })
      .then(data => setTopics(data))
      .catch(e => addToast('Failed to load topics: ' + e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  function handleContinue() {
    if (!selected.length) { addToast('Please select at least one topic', 'error'); return; }
    setQuizState(prev => ({ ...prev, selectedTopics: selected }));
    setPage(PAGES.FILTER_SELECT);
  }

  if (loading) return <div className="app-shell"><Topbar /><LoadingScreen message="Loading topics..." /></div>;

  return (
    <div className="app-shell">
      <Topbar showBack onBack={() => setPage(PAGES.ONBOARDING)} />
      <SettingsPanel />
      <div className="container" style={{ paddingTop: 48, paddingBottom: 80 }}>
        <div className="page-enter">
          <StepIndicator steps={['Topic', 'Filters', 'Config', 'Quiz']} current={0} />

          <div style={{ maxWidth: 620, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, marginBottom: 8, textAlign: 'center' }}>
              Select Topics
            </h2>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: 36 }}>
              Choose one or more subject areas for your quiz
            </p>

            <div className="card-elevated">
              {topics.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  No topics found in your Questions Data folder.<br />
                  <span style={{ fontSize: 13 }}>Make sure your Google Drive is set up correctly.</span>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                  {/* ALL card */}
                  <div
                    onClick={() => setSelected(['ALL'])}
                    style={{
                      padding: '20px 16px',
                      border: `2px solid ${selected.includes('ALL') ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      borderRadius: 'var(--radius-lg)',
                      cursor: 'pointer',
                      background: selected.includes('ALL') ? 'rgba(255,90,31,0.06)' : 'var(--bg-elevated)',
                      transition: 'all var(--transition)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🌐</div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>All Topics</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{topics.length} subjects</div>
                  </div>

                  {topics.map(t => {
                    const isSelected = !selected.includes('ALL') && selected.includes(t.name);
                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          const withoutAll = selected.filter(s => s !== 'ALL');
                          const next = withoutAll.includes(t.name)
                            ? withoutAll.filter(s => s !== t.name)
                            : [...withoutAll, t.name];
                          setSelected(next.length === 0 ? ['ALL'] : next);
                        }}
                        style={{
                          padding: '20px 16px',
                          border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                          borderRadius: 'var(--radius-lg)',
                          cursor: 'pointer',
                          background: isSelected ? 'rgba(255,90,31,0.06)' : 'var(--bg-elevated)',
                          transition: 'all var(--transition)',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 28, marginBottom: 8 }}>📚</div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                        {isSelected && <div style={{ fontSize: 11, color: 'var(--accent-primary)', marginTop: 4 }}>✓ Selected</div>}
                      </div>
                    );
                  })}
                </div>
              )}

              <button className="btn btn-primary btn-lg w-full" style={{ marginTop: 28 }} onClick={handleContinue}>
                Continue →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}