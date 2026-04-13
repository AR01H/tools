// src/pages/HistoryPage.js
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Topbar, SettingsPanel, LoadingScreen } from '../components/UI';

export default function HistoryPage() {
  const { setPage, PAGES, apiCall, settings, userProfile, addToast } = useApp();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiCall('getResults', { folderId: settings.folderId, studentName: userProfile?.name || '' })
      .then(data => setResults(data.results || []))
      .catch(e => addToast('Failed to load history: ' + e.message, 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="app-shell"><Topbar /><LoadingScreen message="Loading history..." /></div>;

  return (
    <div className="app-shell">
      <Topbar showBack onBack={() => setPage(PAGES.ONBOARDING)} title="Quiz History" />
      <SettingsPanel />
      <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>
        <div className="page-enter">
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, marginBottom: 8 }}>Past Attempts</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>
            {userProfile?.name ? `Showing results for ${userProfile.name}` : 'All results'}
          </p>

          {results.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No history yet</div>
              <div style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Take your first quiz to see results here</div>
              <button className="btn btn-primary" onClick={() => setPage(PAGES.TOPIC_SELECT)}>Start a Quiz</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {results.reverse().map((r, i) => {
                const score = parseFloat(r['Result Score']) || 0;
                const start = r['Start Time'] ? new Date(r['Start Time']) : null;
                const end = r['End Time'] ? new Date(r['End Time']) : null;
                const duration = start && end ? Math.round((end - start) / 60000) : null;

                return (
                  <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: score >= 70 ? 'rgba(52,211,153,0.15)' : score >= 50 ? 'rgba(251,191,36,0.15)' : 'rgba(248,113,113,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: score >= 70 ? 'var(--accent-success)' : score >= 50 ? 'var(--accent-warning)' : 'var(--accent-danger)', flexShrink: 0 }}>
                      {score.toFixed(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div style={{ fontWeight: 700 }}>{r['Quiz Name'] || 'Quiz'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {r['Quiz Topic']} · {start ? start.toLocaleDateString() : 'Unknown date'}
                        {duration ? ` · ${duration} min` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Score</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: score >= 70 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>{score.toFixed(1)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}