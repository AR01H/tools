// src/hooks/useQuizEngine.js
import { useState, useEffect, useRef, useCallback } from 'react';

export function useQuizEngine(questions, config, onComplete) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: { answer, timeTaken, marked, score } }
  const [timeLeft, setTimeLeft] = useState(null);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(null);
  const [paused, setPaused] = useState(false);
  const [started, setStarted] = useState(false);
  const [showInstantFeedback, setShowInstantFeedback] = useState(false);
  const [instantResult, setInstantResult] = useState(null);

  const timerRef = useRef(null);
  const qTimerRef = useRef(null);
  const questionStartRef = useRef(Date.now());

  const cfg = config || {};
  const quizTime = parseInt(cfg['Quiz Time']) || 0;
  const questionTime = parseInt(cfg['Question Time']) || 0;
  const autoNext = cfg['Auto Next Question'] === 'On';
  const instantAnswer = cfg['Instant Answer'] === 'On';
  const allowBack = cfg['Allow Back'] === 'On';
  const randomOptions = cfg['Random Options'] === 'On';
  const negativeMarking = cfg['Negative Marking'] === 'On';
  const partialScoring = cfg['Partial Scoring'] === 'On';

  // Shuffle questions if needed
  const [orderedQuestions] = useState(() => {
    let qs = [...(questions || [])];
    if (cfg['Section Order'] === 'Random') {
      for (let i = qs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [qs[i], qs[j]] = [qs[j], qs[i]];
      }
    }
    // Apply question count limit
    const limit = parseInt(cfg['questionCount']);
    if (limit && limit < qs.length) qs = qs.slice(0, limit);
    return qs;
  });

  // Shuffle options per question
  const getOptions = useCallback((q) => {
    if (!randomOptions) return q.choices;
    const opts = [...q.choices];
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return opts;
  }, [randomOptions]);

  const [questionOptions] = useState(() =>
    orderedQuestions.map(q => getOptions(q))
  );

  // Start timers
  useEffect(() => {
    if (!started) return;
    if (quizTime > 0) {
      setTimeLeft(quizTime);
    }
  }, [started, quizTime]);

  // Quiz-level timer
  useEffect(() => {
    if (!started || paused) return;
    if (timeLeft === null) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [started, timeLeft, paused]);

  // Question-level timer
  useEffect(() => {
    if (!started || paused) return;
    if (questionTime <= 0) return;
    setQuestionTimeLeft(questionTime);
  }, [currentIndex, started, paused, questionTime]);

  useEffect(() => {
    if (!started || paused) return;
    if (questionTimeLeft === null) return;
    if (questionTimeLeft <= 0) {
      if (autoNext) handleNext();
      return;
    }
    qTimerRef.current = setTimeout(() => setQuestionTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(qTimerRef.current);
  }, [started, questionTimeLeft, paused]);

  const currentQuestion = orderedQuestions[currentIndex];

  function getTimeTaken() {
    return Math.round((Date.now() - questionStartRef.current) / 1000);
  }

  function calculateScore(q, userAnswer) {
    const maxScore = parseFloat(q.Score) || 1;
    const negScore = parseFloat(q['Negative Score']) || 0;
    const qType = q['Question Type'] || '';
    const correct = q.correctAnswers || [];

    if (!userAnswer || (Array.isArray(userAnswer) && userAnswer.length === 0)) {
      return { score: 0, isCorrect: false };
    }

    if (['Multichoice', 'True/False', 'Short Answer', 'Fill in the Blanks', 'Range'].includes(qType)) {
      const ua = Array.isArray(userAnswer) ? userAnswer[0] : userAnswer;
      const isCorrect = correct.map(c => c.toLowerCase()).includes((ua || '').toLowerCase());
      return { score: isCorrect ? maxScore : (negativeMarking ? -negScore : 0), isCorrect };
    }

    if (['Multi Multichoice', 'Multichoice Anycorrect', 'Sequence', 'Multi Blanks'].includes(qType)) {
      const ua = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
      if (!partialScoring) {
        const isCorrect = correct.length === ua.length &&
          correct.every((c, i) => c.toLowerCase() === (ua[i] || '').toLowerCase());
        return { score: isCorrect ? maxScore : (negativeMarking ? -negScore : 0), isCorrect };
      }
      // Partial scoring
      const matched = ua.filter(a => correct.map(c => c.toLowerCase()).includes(a.toLowerCase())).length;
      const partial = parseFloat(q['Partial Score']) || 0;
      const score = matched * partial;
      return { score, isCorrect: matched === correct.length };
    }

    if (qType === 'Matching' || qType === 'Multi Matching') {
      const ua = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
      const isCorrect = correct.every(c => ua.some(a => a.toLowerCase() === c.toLowerCase()));
      return { score: isCorrect ? maxScore : 0, isCorrect };
    }

    return { score: 0, isCorrect: false };
  }

  function submitAnswer(questionId, answer) {
    const q = orderedQuestions.find(q => q.id === questionId);
    if (!q) return;
    const timeTaken = getTimeTaken();
    const { score, isCorrect } = calculateScore(q, answer);
    const entry = { answer, timeTaken, score, isCorrect, marked: answers[questionId]?.marked || false };
    setAnswers(prev => ({ ...prev, [questionId]: entry }));

    if (instantAnswer && cfg['Instant Answer'] === 'On') {
      setInstantResult({ isCorrect, correctAnswer: q.correctAnswers.join(', '), solution: q.Solution, hint: q.Hint });
      setShowInstantFeedback(true);
    }
    return entry;
  }

  function toggleMark(questionId) {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || {}), marked: !(prev[questionId]?.marked) }
    }));
  }

  function handleNext() {
    clearTimeout(qTimerRef.current);
    setShowInstantFeedback(false);
    setInstantResult(null);
    if (currentIndex < orderedQuestions.length - 1) {
      setCurrentIndex(i => i + 1);
      questionStartRef.current = Date.now();
    }
  }

  function handlePrev() {
    if (!allowBack) return;
    clearTimeout(qTimerRef.current);
    setShowInstantFeedback(false);
    setInstantResult(null);
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      questionStartRef.current = Date.now();
    }
  }

  function jumpTo(index) {
    clearTimeout(qTimerRef.current);
    setShowInstantFeedback(false);
    setInstantResult(null);
    setCurrentIndex(index);
    questionStartRef.current = Date.now();
  }

  function handleSubmit() {
    clearTimeout(timerRef.current);
    clearTimeout(qTimerRef.current);
    const totalScore = Object.values(answers).reduce((sum, a) => sum + (a.score || 0), 0);
    const compiledAnswers = orderedQuestions.map(q => ({
      questionId: q.id,
      topic: q.topic,
      category: q.Category,
      subCategory: q['Sub Category'],
      questionType: q['Question Type'],
      question: q.Question,
      userAnswer: answers[q.id]?.answer || '',
      correctAnswer: q.correctAnswers.join('|'),
      isCorrect: answers[q.id]?.isCorrect || false,
      timeTaken: answers[q.id]?.timeTaken || 0,
      score: answers[q.id]?.score || 0,
      marked: answers[q.id]?.marked || false,
    }));
    onComplete && onComplete({ answers: compiledAnswers, totalScore, timeUsed: quizTime - (timeLeft || 0) });
  }

  function dismissFeedback() {
    setShowInstantFeedback(false);
    setInstantResult(null);
    if (autoNext) handleNext();
  }

  const stats = {
    total: orderedQuestions.length,
    answered: Object.values(answers).filter(a => a.answer !== undefined && a.answer !== '' && !(Array.isArray(a.answer) && a.answer.length === 0)).length,
    marked: Object.values(answers).filter(a => a.marked).length,
    unanswered: orderedQuestions.length - Object.values(answers).filter(a => a.answer !== undefined && a.answer !== '' && !(Array.isArray(a.answer) && a.answer.length === 0)).length,
  };

  return {
    orderedQuestions,
    questionOptions,
    currentIndex,
    currentQuestion,
    answers,
    timeLeft,
    questionTimeLeft,
    paused,
    started,
    showInstantFeedback,
    instantResult,
    stats,
    allowBack,
    setStarted,
    setPaused,
    submitAnswer,
    toggleMark,
    handleNext,
    handlePrev,
    jumpTo,
    handleSubmit,
    dismissFeedback,
  };
}