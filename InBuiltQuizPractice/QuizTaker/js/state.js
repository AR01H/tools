// ============================================================
//  QUIZ APP — state.js
//  Central state store + reactive subscriptions
// ============================================================

const State = (() => {
  // ── Migration ──
  const OLD_P = 'quiz_';
  const NEW_P = 'prepquiz_quiz_';
  ['scriptUrl','folderId','theme','personalFields','groups'].forEach(k => {
    const old = localStorage.getItem(OLD_P + k);
    if (old !== null && localStorage.getItem(NEW_P + k) === null) {
      localStorage.setItem(NEW_P + k, old);
      localStorage.removeItem(OLD_P + k);
    }
  });

  const _state = {
    // ── Config ─────────────────────────
    scriptUrl: localStorage.getItem(NEW_P + 'scriptUrl') || ENV.scriptUrl,
    folderId:  localStorage.getItem(NEW_P + 'folderId')  || ENV.folders[0].id,
    theme:     localStorage.getItem(NEW_P + 'theme')     || 'dark',
    personalFields: JSON.parse(localStorage.getItem(NEW_P + 'personalFields') || '["name","dob","email"]'),
    groups:         JSON.parse(localStorage.getItem(NEW_P + 'groups') || JSON.stringify(ENV.folders)),

    // ── User Session ───────────────────
    user: JSON.parse(sessionStorage.getItem(NEW_P + 'user') || 'null'),

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
    if (['scriptUrl','folderId','theme','personalFields','groups'].includes(key)) {
      localStorage.setItem('prepquiz_quiz_' + key, typeof value === 'string' ? value : JSON.stringify(value));
    }
    if (key === 'user') {
      sessionStorage.setItem('prepquiz_quiz_' + key, JSON.stringify(value));
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
        revealedIdxs: {},
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