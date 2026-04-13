// src/pages/QuizPage.js
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Topbar, SettingsPanel, LoadingScreen, TimerDisplay, Modal } from '../components/UI';
import { QuestionRenderer } from '../components/QuestionTypes';
import { useQuizEngine } from '../hooks/useQuizEngine';

export default function QuizPage() {
  const { setPage, PAGES, apiCall, settings, quizState, setQuizState, userProfile, setResultData, addToast } = useApp();
  const [questions, setQuestions] = useState(null);
  const [loadingQ, setLoadingQ] = useState(true);
  const [submitModal, setSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attemptInfo, setAttemptInfo] = useState(null);
  const [paletteMobile, setPaletteMobile] = useState(false);
  const [hintModal, setHintModal] = useState(false);

  const config = quizState?.selectedConfig || {};

  useEffect(() => {
    const filters = quizState?.filters || {};
    apiCall(null, {}, {
      action: 'getQuestions',
      folderId: settings.folderId,
      topics: quizState?.selectedTopics || ['ALL'],
      filters
    }).then(async (data) => {
      setQuestions(data.questions || []);
      // Start quiz entry in Drive
      try {
        const info = await apiCall(null, {}, {
          action: 'startQuiz',
          folderId: settings.folderId,
          studentName: userProfile?.name || 'Anonymous',
          quizName: config['Quiz Settings Title'] || 'Quiz',
          topics: quizState?.selectedTopics || ['ALL'],
        });
        setAttemptInfo(info);
      } catch (e) {
        addToast('Warning: Could not log quiz start. ' + e.message, 'info');
      }
    }).catch(e => {
      addToast('Failed to load questions: ' + e.message, 'error');
    }).finally(() => setLoadingQ(false));
  }, []);

  async function onComplete(result) {
    setSubmitting(true);
    try {
      if (attemptInfo?.attemptFileId) {
        await apiCall(null, {}, {
          action: 'submitQuiz',
          folderId: settings.folderId,
          attemptFileId: attemptInfo.attemptFileId,
          totalScore: result.totalScore,
          answers: result.answers,
        });
      }
    } catch (e) {
      addToast('Warning: Result save failed. ' + e.message, 'info');
    }
    setResultData({ ...result, config, questions, userProfile, attemptInfo });
    setQuizState(prev => ({ ...prev, completed: true }));
    setPage(PAGES.RESULT);
    setSubmitting(false);
  }

  if (loadingQ || !questions) return <div className="app-shell"><Topbar /><LoadingScreen message="Preparing your quiz..." /></div>;

  return <QuizInterface questions={questions} config={config} onComplete={onComplete} submitting={submitting} />;
}

// ============================================================
// QUIZ INTERFACE COMPONENT
// ============================================================
function QuizInterface({ questions, config, onComplete, submitting }) {
  const { settings } = useApp();
  const template = settings.template || 'classic';

  const engine = useQuizEngine(questions, config, onComplete);
  const {
    orderedQuestions, questionOptions, currentIndex, currentQuestion,
    answers, timeLeft, questionTimeLeft, paused, started,
    showInstantFeedback, instantResult, stats,
    allowBack, setStarted, setPaused,
    submitAnswer, toggleMark, handleNext, handlePrev, jumpTo, handleSubmit, dismissFeedback
  } = engine;

  const [localAnswer, setLocalAnswer] = useState(null);
  const [submitModal, setSubmitModal] = useState(false);
  const [paletteMobile, setPaletteMobile] = useState(false);

  const quizTime = parseInt(config['Quiz Time']) || 0;
  const questionTime = parseInt(config['Question Time']) || 0;
  const showInstantAnswerFeedback = config['Instant Answer Feedback'] === 'On';
  const showHint = config['Show Hint'] === 'On';
  const canBack = config['Allow Back'] === 'On';
  const markForReview = config['Mark for Review'] === 'On';
  const pauseAllowed = config['Pause / Resume Allowed'] === 'On';
  const mandatory = config['Mandatory Answer'] === 'On';
  const noChangeUntilCorrect = config["Don't Change Until Correct"] === 'On';

  // Sync local answer with stored
  useEffect(() => {
    if (currentQuestion) {
      const stored = answers[currentQuestion.id]?.answer;
      setLocalAnswer(stored !== undefined ? stored : null);
    }
  }, [currentIndex, currentQuestion]);

  if (!started) {
    return (
      <div className="app-shell">
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div className="card-elevated" style={{ textAlign: 'center', maxWidth: 520 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎯</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, marginBottom: 12 }}>
              {config['Quiz Settings Title'] || 'Quiz'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '20px 0 28px', textAlign: 'left' }}>
              {[
                ['Questions', orderedQuestions.length],
                ['Time Limit', quizTime > 0 ? `${Math.floor(quizTime / 60)} min` : 'Unlimited'],
                ['Question Time', questionTime > 0 ? `${questionTime}s each` : 'Unlimited'],
                ['Navigation', config['Question Navigation'] || 'Free'],
                ['Negative Mark', config['Negative Marking']],
                ['Mode', config['Section Order'] || 'Fixed'],
              ].map(([k, v]) => (
                <div key={k} style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k}</div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary btn-lg w-full" onClick={() => setStarted(true)}>
              🚀 Begin Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = currentQuestion;
  const qOpts = questionOptions[currentIndex];
  const isAnswered = answers[q?.id]?.answer !== undefined && answers[q?.id]?.answer !== '' && !(Array.isArray(answers[q?.id]?.answer) && answers[q?.id]?.answer.length === 0);
  const isMarked = answers[q?.id]?.marked;
  const showFeedbackMode = showInstantFeedback && instantResult;
  const disabled = showFeedbackMode || submitting;

  function handleAnswerChange(val) {
    if (noChangeUntilCorrect && isAnswered) return;
    setLocalAnswer(val);
    submitAnswer(q.id, val);
  }

  function confirmSubmit() {
    if (mandatory && stats.unanswered > 0) {
      // Still allow, just warn
    }
    handleSubmit();
    setSubmitModal(false);
  }

  const qStatus = orderedQuestions.map((qq, i) => {
    const a = answers[qq.id];
    const hasAns = a?.answer !== undefined && a?.answer !== '' && !(Array.isArray(a?.answer) && a?.answer.length === 0);
    return { answered: hasAns, marked: a?.marked, current: i === currentIndex };
  });

  return (
    <div className="app-shell" data-template={template}>
      {/* TOPBAR */}
      <nav className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>
            Q {currentIndex + 1} / {orderedQuestions.length}
          </span>
          {q && <span className={`badge badge-${(q.Difficulty || '').toLowerCase()}`}>{q.Difficulty}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {questionTimeLeft !== null && questionTime > 0 && (
            <TimerDisplay seconds={questionTimeLeft} total={questionTime} />
          )}
          {quizTime > 0 && timeLeft !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total</span>
              <TimerDisplay seconds={timeLeft} total={quizTime} />
            </div>
          )}
          {pauseAllowed && (
            <button className="btn btn-ghost btn-sm" onClick={() => setPaused(p => !p)}>
              {paused ? '▶ Resume' : '⏸ Pause'}
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => setPaletteMobile(true)}>
            📋 {stats.answered}/{stats.total}
          </button>
        </div>
      </nav>

      {/* PAUSE OVERLAY */}
      {paused && (
        <div className="modal-overlay">
          <div className="card-elevated" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏸</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, marginBottom: 20 }}>Quiz Paused</h3>
            <button className="btn btn-primary btn-lg" onClick={() => setPaused(false)}>▶ Resume Quiz</button>
          </div>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* QUESTION AREA */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 100px' }}>
          <div style={{ maxWidth: 780, margin: '0 auto' }}>
            {/* Progress bar */}
            <div className="progress-bar" style={{ marginBottom: 28 }}>
              <div className="progress-fill" style={{ width: `${((currentIndex + 1) / orderedQuestions.length) * 100}%` }} />
            </div>

            {/* Topic/category info */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {q.topic && <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '3px 10px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)' }}>{q.topic}</span>}
              {q.Category && <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '3px 10px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)' }}>{q.Category} · {q['Sub Category']}</span>}
              {q['Question Type'] && <span style={{ fontSize: 12, color: 'var(--accent-info)', background: 'rgba(96,165,250,0.1)', padding: '3px 10px', borderRadius: 'var(--radius-full)' }}>{q['Question Type']}</span>}
            </div>

            {/* Passage */}
            {q.Passage && (
              <div className="passage-box">
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-info)', textTransform: 'uppercase', marginBottom: 8 }}>Passage</div>
                {q.Passage}
              </div>
            )}

            {/* Question */}
            <div style={{ marginBottom: 28 }}>
              <div className="question-text">{q.Question}</div>
              {q['Question Type'] === 'Multi Multichoice' && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Select all correct answers</p>
              )}
            </div>

            {/* Answer component */}
            <QuestionRenderer
              question={q}
              options={qOpts}
              answer={localAnswer}
              onChange={handleAnswerChange}
              disabled={disabled}
            />

            {/* Instant feedback */}
            {showFeedbackMode && (
              <div style={{
                marginTop: 20,
                padding: '16px 20px',
                background: instantResult.isCorrect ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)',
                border: `1.5px solid ${instantResult.isCorrect ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
                borderRadius: 'var(--radius-lg)',
              }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: instantResult.isCorrect ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                  {instantResult.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                </div>
                {!instantResult.isCorrect && (
                  <div style={{ fontSize: 14, marginBottom: 6 }}>
                    <b>Correct answer:</b> {instantResult.correctAnswer}
                  </div>
                )}
                {instantResult.solution && (
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                    <b>Solution:</b> {instantResult.solution}
                  </div>
                )}
                <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={dismissFeedback}>
                  Next →
                </button>
              </div>
            )}

            {/* Hint */}
            {showHint && q.Hint && !showFeedbackMode && (
              <div style={{ marginTop: 16 }}>
                <details style={{ cursor: 'pointer' }}>
                  <summary style={{ fontSize: 13, color: 'var(--accent-info)', fontWeight: 600 }}>💡 Show Hint</summary>
                  <div style={{ marginTop: 8, fontSize: 14, color: 'var(--text-secondary)', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>{q.Hint}</div>
                </details>
              </div>
            )}
          </div>
        </div>

        {/* QUESTION PALETTE - Desktop */}
        <div style={{ width: 220, borderLeft: '1px solid var(--border-color)', overflowY: 'auto', padding: 16, display: 'none' }}
          className="desktop-palette">
          <QuestionPalette questions={orderedQuestions} statuses={qStatus} onJump={jumpTo} />
          <div style={{ marginTop: 20 }}>
            <button className="btn btn-danger w-full" onClick={() => setSubmitModal(true)}>
              Submit Quiz
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)',
        padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {canBack && (
            <button className="btn btn-secondary" onClick={handlePrev} disabled={currentIndex === 0}>
              ← Back
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {markForReview && (
            <button
              className={`btn ${isMarked ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => toggleMark(q.id)}
            >
              {isMarked ? '🔖 Marked' : '🔖 Mark'}
            </button>
          )}

          {currentIndex < orderedQuestions.length - 1 ? (
            <button className="btn btn-primary" onClick={handleNext}>
              Next →
            </button>
          ) : (
            <button className="btn btn-danger" onClick={() => setSubmitModal(true)}>
              Submit Quiz ✓
            </button>
          )}
        </div>
      </div>

      {/* MOBILE PALETTE MODAL */}
      {paletteMobile && (
        <div className="modal-overlay" onClick={() => setPaletteMobile(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700 }}>Question Navigator</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setPaletteMobile(false)}>✕</button>
            </div>
            <QuestionPalette questions={orderedQuestions} statuses={qStatus} onJump={i => { jumpTo(i); setPaletteMobile(false); }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button className="btn btn-danger w-full" onClick={() => { setSubmitModal(true); setPaletteMobile(false); }}>
                Submit Quiz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBMIT CONFIRM */}
      {submitModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, marginBottom: 12 }}>Submit Quiz?</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                ['Answered', stats.answered, 'var(--accent-success)'],
                ['Unanswered', stats.unanswered, 'var(--accent-danger)'],
                ['Marked', stats.marked, 'var(--accent-warning)'],
                ['Total', stats.total, 'var(--text-primary)'],
              ].map(([label, val, color]) => (
                <div key={label} style={{ background: 'var(--bg-elevated)', padding: '12px 16px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: 'var(--font-mono)' }}>{val}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
                </div>
              ))}
            </div>
            {stats.unanswered > 0 && (
              <div style={{ padding: '10px 14px', background: 'rgba(251,191,36,0.1)', border: '1px solid var(--accent-warning)', borderRadius: 'var(--radius-md)', fontSize: 14, marginBottom: 16, color: 'var(--accent-warning)' }}>
                ⚠ You have {stats.unanswered} unanswered question{stats.unanswered > 1 ? 's' : ''}.
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSubmitModal(false)}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// QUESTION PALETTE
// ============================================================
function QuestionPalette({ questions, statuses, onJump }) {
  const legend = [
    { label: 'Current', color: 'var(--accent-primary)' },
    { label: 'Answered', color: 'var(--accent-success)' },
    { label: 'Marked', color: 'var(--accent-warning)' },
    { label: 'Unattempted', color: 'var(--bg-elevated)' },
  ];
  return (
    <div>
      <div className="q-palette">
        {questions.map((q, i) => {
          const s = statuses[i] || {};
          let cls = '';
          if (s.current) cls = 'current';
          else if (s.answered && s.marked) cls = 'answered marked';
          else if (s.answered) cls = 'answered';
          else if (s.marked) cls = 'marked';
          else cls = 'skipped';
          return (
            <div key={i} className={`q-bubble ${cls}`} onClick={() => onJump(i)} title={`Q${i + 1}`}>
              {i + 1}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
        {legend.map(({ label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: color, border: '1px solid var(--border-color)' }} />
            <span style={{ color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}