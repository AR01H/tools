// ════════════════════════════════════════════════
//  STATE  –  Single source of truth
// ════════════════════════════════════════════════
var State = (function(){
  var _s = {
    // User
    user: { name:"", dob:"", contact:"" },
    // Setup flow
    selectedTopics:     [],
    filterMeta:         null,   // { categories, categorySubMap, tags, difficulties, questionTypes }
    selectedCategories: [],
    selectedSubCats:    [],
    selectedTags:       [],
    selectedDifficulties:[],
    selectedQTypes:     [],
    questionCount:      20,
    // Quiz config
    quizConfigs:        [],
    selectedConfig:     null,   // config object
    isCustomConfig:     false,
    customConfig:       {},
    // Questions
    allQuestions:       [],
    quizQuestions:      [],     // filtered + shuffled subset
    // Session
    sessionId:          null,
    attemptFileId:      null,
    startTime:          null,
    endTime:            null,
    // Quiz state
    currentIndex:       0,
    answers:            {},     // qIndex → { selected, timeTaken, marked }
    questionStartTime:  null,
    timerInterval:      null,
    quizComplete:       false,
    paused:             false,
    timeRemaining:      0,      // seconds
    // UI
    theme:    "dark",
    template: "classic",
    page:     "landing"
  };

  return {
    get: function(k){ return k ? _s[k] : _s; },
    set: function(k, v){
      if(typeof k === "object"){ Object.assign(_s, k); }
      else { _s[k] = v; }
    },
    init: function(){
      var stored = localStorage.getItem("qmp_state");
      if(stored){
        try{
          var p = JSON.parse(stored);
          if(p.theme)    { _s.theme    = p.theme; }
          if(p.template) { _s.template = p.template; }
          if(p.user)     { _s.user     = p.user; }
        } catch(e){}
      }
      document.body.classList.remove("theme-dark","theme-light");
      document.body.classList.add("theme-" + _s.theme);
    },
    save: function(){
      localStorage.setItem("qmp_state", JSON.stringify({
        theme:    _s.theme,
        template: _s.template,
        user:     _s.user
      }));
    },
    resetQuiz: function(){
      Object.assign(_s, {
        selectedTopics:[], filterMeta:null,
        selectedCategories:[], selectedSubCats:[], selectedTags:[],
        selectedDifficulties:[], selectedQTypes:[], questionCount:20,
        selectedConfig:null, isCustomConfig:false, customConfig:{},
        allQuestions:[], quizQuestions:[],
        currentIndex:0, answers:{}, questionStartTime:null,
        timerInterval:null, quizComplete:false, paused:false,
        timeRemaining:0, sessionId:null, attemptFileId:null,
        startTime:null, endTime:null
      });
    }
  };
})();
