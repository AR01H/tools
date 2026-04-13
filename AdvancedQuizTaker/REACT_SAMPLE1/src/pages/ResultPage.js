// src/pages/ResultPage.js
import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Topbar, SettingsPanel, ScoreRing, DifficultyBadge } from '../components/UI';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
  ArcElement, RadialLinearScale, PointElement, LineElement
} from 'chart.js';
import { Bar, Doughnut, Radar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, RadialLinearScale, PointElement, LineElement);

const chartOptions = {
  responsive: true,
  plugins: { legend: { labels: { color: 'var(--text-secondary)', font: { family: 'Plus Jakarta Sans' } } } },
  scales: {
    x: { ticks: { color: 'var(--text-muted)' }, grid: { color: 'var(--border-color)' } },
    y: { ticks: { color: 'var(--text-muted)' }, grid: { color: 'var(--border-color)' } }
  }
};

export default function ResultPage() {
  const { setPage, PAGES, resultData, quizState, userProfile } = useApp();
  const [tab, setTab] = useState('overview');
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const reportRef = useRef();

  const { answers = [], totalScore = 0, config = {}, questions = [], timeUsed = 0 } = resultData || {};

  const showResult = config['Final Result'] === 'On' || config['Final Result'] !== 'Off';

  // Compute stats
  const stats = useMemo(() => {
    const correct = answers.filter(a => a.isCorrect).length;
    const incorrect = answers.filter(a => !a.isCorrect && (a.userAnswer !== '' && a.userAnswer !== undefined)).length;
    const skipped = answers.filter(a => !a.userAnswer || a.userAnswer === '' || (Array.isArray(a.userAnswer) && a.userAnswer.length === 0)).length;
    const maxScore = answers.reduce((s, a) => {
      const q = questions.find(q => q.id === a.questionId);
      return s + (parseFloat(q?.Score) || 1);
    }, 0);
    const accuracy = answers.length > 0 ? Math.round((correct / answers.filter(a => a.userAnswer && a.userAnswer !== '').length || 0) * 100) : 0;

    // Category-wise
    const catMap = {};
    answers.forEach(a => {
      const cat = a.category || 'Other';
      if (!catMap[cat]) catMap[cat] = { correct: 0, total: 0, score: 0 };
      catMap[cat].total++;
      if (a.isCorrect) catMap[cat].correct++;
      catMap[cat].score += parseFloat(a.score) || 0;
    });

    // Difficulty-wise
    const diffMap = {};
    answers.forEach(a => {
      const q = questions.find(q => q.id === a.questionId);
      const diff = q?.Difficulty || 'Unknown';
      if (!diffMap[diff]) diffMap[diff] = { correct: 0, total: 0 };
      diffMap[diff].total++;
      if (a.isCorrect) diffMap[diff].correct++;
    });

    // Time analysis
    const avgTime = answers.length > 0 ? Math.round(answers.reduce((s, a) => s + (parseInt(a.timeTaken) || 0), 0) / answers.length) : 0;

    return { correct, incorrect, skipped, maxScore, accuracy: isNaN(accuracy) ? 0 : accuracy, catMap, diffMap, avgTime };
  }, [answers, questions]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  async function downloadPDF() {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#0A0A0F' });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h);
      pdf.save(`quiz-result-${userProfile?.name || 'student'}-${new Date().toLocaleDateString()}.pdf`);
    } catch (e) {
      alert('PDF download requires html2canvas and jspdf. Add them to your project.');
    }
  }

  function shareResult() {
    const text = `I scored ${Math.round((totalScore / (stats.maxScore || 1)) * 100)}% on ${config['Quiz Settings Title'] || 'a quiz'}! ✓ ${stats.correct} correct, ${stats.accuracy}% accuracy.`;
    if (navigator.share) navigator.share({ title: 'Quiz Result', text });
    else { navigator.clipboard.writeText(text); alert('Result copied to clipboard!'); }
  }

  if (reviewMode) {
    return (
      <ReviewMode
        answers={answers}
        questions={questions}
        reviewIndex={reviewIndex}
        setReviewIndex={setReviewIndex}
        onClose={() => setReviewMode(false)}
      />
    );
  }

  const scorePercent = stats.maxScore > 0 ? Math.round((totalScore / stats.maxScore) * 100) : 0;
  const grade = scorePercent >= 90 ? 'A+' : scorePercent >= 80 ? 'A' : scorePercent >= 70 ? 'B' : scorePercent >= 60 ? 'C' : 'D';
  const gradeColor = scorePercent >= 80 ? 'var(--accent-success)' : scorePercent >= 60 ? 'var(--accent-warning)' : 'var(--accent-danger)';

  const tabs = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'category', label: '📁 Category' },
    { id: 'difficulty', label: '📈 Difficulty' },
    { id: 'questions', label: '❓ Questions' },
  ];

  return (
    <div className="app-shell">
      <Topbar
        title="Quiz Results"
        showBack
        onBack={() => setPage(PAGES.ONBOARDING)}
        actions={
          <>
            <button className="btn btn-secondary btn-sm" onClick={shareResult}>🔗 Share</button>
            <button className="btn btn-secondary btn-sm" onClick={downloadPDF}>📄 PDF</button>
          </>
        }
      />
      <SettingsPanel />

      <div ref={reportRef}>
        <div className="container" style={{ paddingTop: 32, paddingBottom: 80 }}>
          <div className="page-enter">
            {/* Hero Score Card */}
            <div style={{ background: `linear-gradient(135deg, var(--bg-card), var(--bg-elevated))`, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '32px', marginBottom: 28, display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
                    {userProfile?.name || 'Student'} · {config['Quiz Settings Title'] || 'Quiz'}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 800, color: gradeColor, lineHeight: 1 }}>{grade}</div>
                <div style={{ fontSize: 16, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {scorePercent >= 80 ? '🎉 Excellent work!' : scorePercent >= 60 ? '👍 Good effort!' : '📚 Keep practicing!'}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                  {[
                    ['Score', `${totalScore.toFixed(1)}/${stats.maxScore.toFixed(1)}`],
                    ['Accuracy', `${stats.accuracy}%`],
                    ['Time Taken', formatTime(timeUsed)],
                    ['Avg/Q', `${stats.avgTime}s`],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{k}</div>
                      <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <ScoreRing score={totalScore} total={stats.maxScore} size={140} color={gradeColor} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    [stats.correct, 'Correct', 'var(--accent-success)'],
                    [stats.incorrect, 'Incorrect', 'var(--accent-danger)'],
                    [stats.skipped, 'Skipped', 'var(--text-muted)'],
                  ].map(([val, lbl, color]) => (
                    <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                      <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{val}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lbl}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
              <button className="btn btn-primary" onClick={() => setReviewMode(true)}>🔍 Review Answers</button>
              <button className="btn btn-secondary" onClick={() => setPage(PAGES.TOPIC_SELECT)}>🔁 Retake Quiz</button>
              <button className="btn btn-secondary" onClick={() => setPage(PAGES.HISTORY)}>📋 History</button>
              <button className="btn btn-secondary" onClick={downloadPDF}>📄 Download PDF</button>
              <button className="btn btn-secondary" onClick={shareResult}>🔗 Share Result</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-color)', marginBottom: 24, overflowX: 'auto' }}>
              {tabs.map(t => (
                <button key={t.id} className="btn btn-ghost"
                  style={{ borderBottom: tab === t.id ? '2px solid var(--accent-primary)' : '2px solid transparent', borderRadius: 0, paddingBottom: 12, color: tab === t.id ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                  onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {tab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                <div className="chart-container">
                  <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Score Breakdown</h3>
                  <Doughnut
                    data={{
                      labels: ['Correct', 'Incorrect', 'Skipped'],
                      datasets: [{
                        data: [stats.correct, stats.incorrect, stats.skipped],
                        backgroundColor: ['rgba(52,211,153,0.8)', 'rgba(248,113,113,0.8)', 'rgba(100,100,120,0.4)'],
                        borderColor: ['var(--accent-success)', 'var(--accent-danger)', 'var(--border-color)'],
                        borderWidth: 2,
                      }]
                    }}
                    options={{ responsive: true, plugins: { legend: { labels: { color: 'var(--text-secondary)' } } } }}
                  />
                </div>
                <div className="chart-container">
                  <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Time per Question (seconds)</h3>
                  <Bar
                    data={{
                      labels: answers.map((_, i) => `Q${i + 1}`),
                      datasets: [{
                        label: 'Time (s)',
                        data: answers.map(a => parseInt(a.timeTaken) || 0),
                        backgroundColor: answers.map(a => a.isCorrect ? 'rgba(52,211,153,0.6)' : 'rgba(248,113,113,0.6)'),
                        borderRadius: 4,
                      }]
                    }}
                    options={chartOptions}
                  />
                </div>
              </div>
            )}

            {tab === 'category' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                <div className="chart-container">
                  <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Score by Category</h3>
                  <Bar
                    data={{
                      labels: Object.keys(stats.catMap),
                      datasets: [
                        { label: 'Correct', data: Object.values(stats.catMap).map(c => c.correct), backgroundColor: 'rgba(52,211,153,0.7)', borderRadius: 4 },
                        { label: 'Total', data: Object.values(stats.catMap).map(c => c.total), backgroundColor: 'rgba(96,165,250,0.4)', borderRadius: 4 },
                      ]
                    }}
                    options={chartOptions}
                  />
                </div>
                <div className="chart-container">
                  <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Category Performance</h3>
                  <table className="result-table">
                    <thead>
                      <tr><th>Category</th><th>Correct</th><th>Total</th><th>%</th></tr>
                    </thead>
                    <tbody>
                      {Object.entries(stats.catMap).map(([cat, data]) => (
                        <tr key={cat}>
                          <td>{cat}</td>
                          <td style={{ color: 'var(--accent-success)', fontWeight: 700 }}>{data.correct}</td>
                          <td>{data.total}</td>
                          <td><span className={`badge ${Math.round(data.correct / data.total * 100) >= 70 ? 'badge-easy' : 'badge-hard'}`}>{Math.round(data.correct / data.total * 100)}%</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'difficulty' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                <div className="chart-container">
                  <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Performance by Difficulty</h3>
                  <Radar
                    data={{
                      labels: Object.keys(stats.diffMap),
                      datasets: [{
                        label: 'Accuracy %',
                        data: Object.values(stats.diffMap).map(d => Math.round(d.correct / d.total * 100)),
                        backgroundColor: 'rgba(255,90,31,0.15)',
                        borderColor: 'var(--accent-primary)',
                        pointBackgroundColor: 'var(--accent-primary)',
                      }]
                    }}
                    options={{ responsive: true, scales: { r: { ticks: { color: 'var(--text-muted)' }, grid: { color: 'var(--border-color)' }, pointLabels: { color: 'var(--text-secondary)' } } }, plugins: { legend: { labels: { color: 'var(--text-secondary)' } } } }}
                  />
                </div>
                <div className="chart-container">
                  <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Difficulty Breakdown</h3>
                  <table className="result-table">
                    <thead>
                      <tr><th>Difficulty</th><th>Correct</th><th>Total</th><th>Accuracy</th></tr>
                    </thead>
                    <tbody>
                      {Object.entries(stats.diffMap).map(([diff, data]) => (
                        <tr key={diff}>
                          <td><DifficultyBadge difficulty={diff} /></td>
                          <td style={{ color: 'var(--accent-success)', fontWeight: 700 }}>{data.correct}</td>
                          <td>{data.total}</td>
                          <td>{Math.round(data.correct / data.total * 100)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'questions' && (
              <div>
                <table className="result-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Question</th>
                      <th>Type</th>
                      <th>Your Answer</th>
                      <th>Correct</th>
                      <th>Status</th>
                      <th>Time</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {answers.map((a, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{i + 1}</td>
                        <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.question}>{a.question}</td>
                        <td><span style={{ fontSize: 11, color: 'var(--accent-info)' }}>{a.questionType}</span></td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {Array.isArray(a.userAnswer) ? a.userAnswer.join(', ') : (a.userAnswer || <span style={{ color: 'var(--text-muted)' }}>—</span>)}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-success)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.correctAnswer}</td>
                        <td>
                          {!a.userAnswer || a.userAnswer === '' ? (
                            <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>Skipped</span>
                          ) : a.isCorrect ? (
                            <span className="badge badge-easy">✓ Correct</span>
                          ) : (
                            <span className="badge badge-hard">✗ Wrong</span>
                          )}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{a.timeTaken}s</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: parseFloat(a.score) > 0 ? 'var(--accent-success)' : parseFloat(a.score) < 0 ? 'var(--accent-danger)' : 'var(--text-muted)' }}>
                          {parseFloat(a.score) > 0 ? '+' : ''}{a.score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// REVIEW MODE
// ============================================================
function ReviewMode({ answers, questions, reviewIndex, setReviewIndex, onClose }) {
  const a = answers[reviewIndex];
  const q = questions.find(q => q.id === a?.questionId) || {};
  const isCorrect = a?.isCorrect;
  const isSkipped = !a?.userAnswer || a?.userAnswer === '';

  return (
    <div className="app-shell">
      <nav className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>←</button>
          <span style={{ fontWeight: 700 }}>Review Mode · Q {reviewIndex + 1} / {answers.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" disabled={reviewIndex === 0} onClick={() => setReviewIndex(i => i - 1)}>← Prev</button>
          <button className="btn btn-primary btn-sm" disabled={reviewIndex === answers.length - 1} onClick={() => setReviewIndex(i => i + 1)}>Next →</button>
        </div>
      </nav>
      <div className="container" style={{ paddingTop: 32, maxWidth: 720 }}>
        <div className="page-enter">
          <div className="card-elevated">
            {/* Status banner */}
            <div style={{
              padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 20,
              background: isSkipped ? 'var(--bg-elevated)' : isCorrect ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
              border: `1.5px solid ${isSkipped ? 'var(--border-color)' : isCorrect ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
              display: 'flex', alignItems: 'center', gap: 12
            }}>
              <span style={{ fontSize: 24 }}>{isSkipped ? '⏭' : isCorrect ? '✅' : '❌'}</span>
              <div>
                <div style={{ fontWeight: 700, color: isSkipped ? 'var(--text-muted)' : isCorrect ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                  {isSkipped ? 'Skipped' : isCorrect ? 'Correct!' : 'Incorrect'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Score: {a?.score} · Time: {a?.timeTaken}s</div>
              </div>
            </div>

            {/* Topic/category */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {a?.topic && <span style={{ fontSize: 12, padding: '2px 10px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-full)', color: 'var(--text-muted)' }}>{a.topic}</span>}
              {a?.category && <span style={{ fontSize: 12, padding: '2px 10px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-full)', color: 'var(--text-muted)' }}>{a.category}</span>}
              {a?.questionType && <span style={{ fontSize: 12, padding: '2px 10px', background: 'rgba(96,165,250,0.1)', borderRadius: 'var(--radius-full)', color: 'var(--accent-info)' }}>{a.questionType}</span>}
            </div>

            <div className="question-text" style={{ marginBottom: 20 }}>{a?.question}</div>

            {/* Your answer */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Your Answer</div>
              <div style={{ padding: '12px 16px', background: isSkipped ? 'var(--bg-elevated)' : isCorrect ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-mono)', fontSize: 14, color: isSkipped ? 'var(--text-muted)' : isCorrect ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                {isSkipped ? 'Not answered' : Array.isArray(a?.userAnswer) ? a.userAnswer.join(', ') : a?.userAnswer}
              </div>
            </div>

            {/* Correct answer */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Correct Answer</div>
              <div style={{ padding: '12px 16px', background: 'rgba(52,211,153,0.08)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent-success)' }}>
                {a?.correctAnswer}
              </div>
            </div>

            {/* Solution */}
            {q.Solution && (
              <div style={{ padding: '12px 16px', background: 'var(--bg-elevated)', borderLeft: '3px solid var(--accent-info)', borderRadius: '0 var(--radius-md) var(--radius-md) 0' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-info)', textTransform: 'uppercase', marginBottom: 6 }}>Solution / Explanation</div>
                <div style={{ fontSize: 14, lineHeight: 1.7 }}>{q.Solution}</div>
              </div>
            )}
          </div>

          {/* Q navigator */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 20, justifyContent: 'center' }}>
            {answers.map((ans, i) => (
              <div key={i} onClick={() => setReviewIndex(i)}
                style={{
                  width: 36, height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${i === reviewIndex ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  background: i === reviewIndex ? 'var(--accent-primary)' : (!ans.userAnswer || ans.userAnswer === '') ? 'var(--bg-elevated)' : ans.isCorrect ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)',
                  color: i === reviewIndex ? '#fff' : 'var(--text-primary)'
                }}>
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}