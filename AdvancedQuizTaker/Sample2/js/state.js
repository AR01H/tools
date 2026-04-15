// ============================================================
//  QUIZ APP — state.js
//  Central state store + reactive subscriptions
// ============================================================

const State = (() => {
  const _state = {
    // ── Config ─────────────────────────
    scriptUrl: localStorage.getItem('quiz_scriptUrl') || ENV.scriptUrl,
    folderId:  localStorage.getItem('quiz_folderId')  || ENV.folders[0].id,
    theme:     localStorage.getItem('quiz_theme')     || 'dark',
    personalFields: JSON.parse(localStorage.getItem('quiz_personalFields') || '["name","dob","email"]'),

    // ── User Session ───────────────────
    user: JSON.parse(sessionStorage.getItem('quiz_user') || 'null'),

    // ── Data ───────────────────────────
    topics:      [],
    questions:   [],
    quizConfigs: [],

    // ── Quiz Setup ─────────────────────
    setup: {
      selectedTopics:    [],
      selectedCategory:  [],
      selectedSubCat:    [],
      selectedTags:      [],
      selectedDifficulty:[],
      selectedTypes:     [],
      questionCount:     20,
      quizConfig:        null,   // preset name or 'custom'
      customConfig:      {},
    },

    // ── Active Quiz ────────────────────
    quiz: {
      active:      false,
      questions:   [],        // filtered + shuffled
      currentIdx:  0,
      answers:     {},        // idx → {userAnswer, timeTaken, flagged}
      startTime:   null,
      pauseTime:   null,
      totalPaused: 0,
      attemptId:   null,
      fileId:      null,
      resultFileId:null,
      config:      {},
    },

    // ── Result ─────────────────────────
    result: null,

    // ── UI ─────────────────────────────
    page: 'welcome',          // welcome|setup-topics|setup-filters|setup-config|quiz|result
    loading: false,
    modal: null,
  };

  const _listeners = {};

  function get(key) {
    return key ? _state[key] : { ..._state };
  }

  function set(key, value) {
    const prev = _state[key];
    _state[key] = value;
    // Persist certain keys
    if (['scriptUrl','folderId','theme','personalFields'].includes(key)) {
      localStorage.setItem('quiz_' + key, typeof value === 'string' ? value : JSON.stringify(value));
    }
    if (key === 'user') {
      sessionStorage.setItem('quiz_user', JSON.stringify(value));
    }
    (_listeners[key] || []).forEach(fn => fn(value, prev));
    (_listeners['*'] || []).forEach(fn => fn(key, value, prev));
  }

  function merge(key, partial) {
    set(key, { ..._state[key], ...partial });
  }

  function on(key, fn) {
    if (!_listeners[key]) _listeners[key] = [];
    _listeners[key].push(fn);
    return () => { _listeners[key] = _listeners[key].filter(f => f !== fn); };
  }

  function reset(key) {
    if (key === 'quiz') {
      set('quiz', {
        active:false, questions:[], currentIdx:0, answers:{},
        startTime:null, pauseTime:null, totalPaused:0,
        attemptId:null, fileId:null, resultFileId:null, config:{},
      });
    }
    if (key === 'setup') {
      set('setup', {
        selectedTopics:[], selectedCategory:[], selectedSubCat:[],
        selectedTags:[], selectedDifficulty:[], selectedTypes:[],
        questionCount:20, quizConfig:null, customConfig:{},
      });
    }
  }

  return { get, set, merge, on, reset };
})();