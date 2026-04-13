// ============================================================
//  state.js  — Global App State
// ============================================================

const State = (() => {
  let _state = {
    // User info
    user: { name: "", dob: "", contact: "" },

    // Setup wizard
    setup: {
      step: 1,                  // 1=user info, 2=topics, 3=filters, 4=config, 5=theme
      selectedTopics: [],
      filters: {
        categories:    [],
        subCategories: [],
        tags:          [],
        difficulty:    [],
        questionTypes: [],
        count:         20,
      },
      availableMeta: {
        categories: [], subCategories: [], tags: [], difficulties: [], questionTypes: []
      },
      quizConfigs: [],
      selectedConfig: null,     // preset name OR "custom"
      customConfig:   {},
      selectedTheme:  "default",
    },

    // Active quiz
    quiz: {
      active:       false,
      attemptId:    null,
      questions:    [],
      current:      0,
      answers:      {},         // { idx: { selected, timeSpent } }
      markedReview: new Set(),
      startTime:    null,
      endTime:      null,
      elapsedSec:   0,
      timerId:      null,
      paused:       false,
      config:       {},
    },

    // Result
    result: {
      data:     null,
      mode:     "overview",     // overview | review | question
      reviewIdx: 0,
    },

    // UI
    ui: {
      theme:     "light",
      quizTheme: "default",
      page:      "home",        // home | setup | quiz | result | history
      loading:   false,
    },
  };

  // Subscribers
  const _listeners = [];

  function notify() {
    _listeners.forEach(fn => fn(_state));
  }

  return {
    get: ()         => _state,
    set: (updates)  => { _state = deepMerge(_state, updates); notify(); },
    on:  (fn)       => _listeners.push(fn),
    off: (fn)       => { const i = _listeners.indexOf(fn); if (i > -1) _listeners.splice(i, 1); },

    // Convenience
    getUser:   ()  => _state.user,
    getSetup:  ()  => _state.setup,
    getQuiz:   ()  => _state.quiz,
    getResult: ()  => _state.result,
    getUI:     ()  => _state.ui,

    setPage(page) {
      _state.ui.page = page;
      notify();
    },

    setTheme(theme) {
      _state.ui.theme = theme;
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("qm_theme", theme);
      notify();
    },

    setQuizTheme(theme) {
      _state.ui.quizTheme = theme;
      document.documentElement.setAttribute("data-quiz-theme", theme);
      notify();
    },

    saveAnswer(qIdx, selected, timeSpent) {
      _state.quiz.answers[qIdx] = { selected, timeSpent: timeSpent || 0 };
      notify();
    },

    toggleMark(qIdx) {
      if (_state.quiz.markedReview.has(qIdx)) {
        _state.quiz.markedReview.delete(qIdx);
      } else {
        _state.quiz.markedReview.add(qIdx);
      }
      notify();
    },
  };

  function deepMerge(target, source) {
    const out = Object.assign({}, target);
    for (const key in source) {
      if (source[key] instanceof Set) {
        out[key] = new Set(source[key]);
      } else if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
        out[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        out[key] = source[key];
      }
    }
    return out;
  }
})();
