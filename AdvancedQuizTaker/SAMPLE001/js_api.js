// ════════════════════════════════════════════════
//  API  –  Wraps google.script.run calls
//  Falls back to mock data for local testing
// ════════════════════════════════════════════════
var API = {
  _isMock: (typeof google === "undefined" || !google.script),

  _run: function(fnName, args){
    return new Promise(function(resolve, reject){
      if(API._isMock){
        resolve(API._mockData(fnName, args));
        return;
      }
      var runner = google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject);
      runner[fnName].apply(runner, args || []);
    });
  },

  loadConfig: function(){
    return API._run("getAppConfig", []);
  },

  saveConfig: function(folderId, scriptId){
    return API._run("saveAppConfig", [folderId, scriptId]);
  },

  resetConfig: function(){
    return API._run("resetAppConfig", []);
  },

  getTopics: function(){
    return API._run("getQuizTopics", []);
  },

  getFilterMeta: function(topics){
    return API._run("getFilterMetadata", [topics]);
  },

  getQuestions: function(topics){
    return API._run("getQuestionsForTopics", [topics]);
  },

  getQuizConfigs: function(){
    return API._run("getQuizConfigs", []);
  },

  startSession: function(data){
    return API._run("startQuizSession", [data]);
  },

  saveResponse: function(fileId, data){
    return API._run("saveQuestionResponse", [fileId, data]);
  },

  completeSession: function(data){
    return API._run("completeQuizSession", [data]);
  },

  getAttemptResults: function(fileId){
    return API._run("getAttemptResults", [fileId]);
  },

  // ── MOCK DATA (demo / local dev) ──────────────
  _mockData: function(fn, args){
    var mocks = {
      getAppConfig: { rootFolderId:"MOCK_ROOT", scriptId:"MOCK_SCRIPT" },
      saveAppConfig: { success:true },
      resetAppConfig: { success:true },
      getQuizTopics: { success:true, topics:[
        {id:"t1",name:"Math"},{id:"t2",name:"Science"},
        {id:"t3",name:"English"},{id:"t4",name:"Programming"},
        {id:"t5",name:"GK"},{id:"t6",name:"History"}
      ]},
      getFilterMetadata: { success:true,
        categories:["Quant","English","GK","Programming"],
        categorySubMap:{
          Quant:["Arithmetic","Algebra","Geometry","Numbers"],
          English:["Grammar","Vocabulary","Reading"],
          GK:["Science","Current Affairs","History"],
          Programming:["OOP","Data Structures","Algorithms"]
        },
        tags:["addition","prime","vowels","sorting","loops","recursion"],
        difficulties:["easy","medium","hard","expert"],
        questionTypes:["Multichoice","Multi Multichoice","True/False","Sequence","Short Answer","Multichoice Anycorrect"]
      },
      getQuestionsForTopics: { success:true, questions: API._genMockQs() },
      getQuizConfigs: { success:true, configs:[
        {"Quiz Settings Title":"Practice Mode","Quiz Time":"0","Section Order":"Fixed","Question Time":"0","Adaptive Mode":"Off","Random Options":"On","Allow Option Change":"On","Don't Change Until Correct":"Off","Mandatory Answer":"Off","Negative Marking":"Off","Partial Scoring":"On","Question Navigation":"Free","Allow Back":"On","Mark for Review":"On","Auto Next Question":"Off","Auto Submit":"Off","Pause / Resume Allowed":"On","Tracking":"On","Instant Answer":"On","Instant Answer Feedback":"On","Show Hint":"On","Final Result":"On","Question Wise Result":"On","Adaptive Retake":"Off"},
        {"Quiz Settings Title":"Exam Mode","Quiz Time":"7200","Section Order":"Fixed","Question Time":"60","Adaptive Mode":"Off","Random Options":"On","Allow Option Change":"Off","Don't Change Until Correct":"Off","Mandatory Answer":"On","Negative Marking":"On","Partial Scoring":"Off","Question Navigation":"Sequential","Allow Back":"Off","Mark for Review":"On","Auto Next Question":"On","Auto Submit":"On","Pause / Resume Allowed":"Off","Tracking":"On","Instant Answer":"Off","Instant Answer Feedback":"Off","Show Hint":"Off","Final Result":"On","Question Wise Result":"On","Adaptive Retake":"Off"},
        {"Quiz Settings Title":"Strict Mode","Quiz Time":"3600","Section Order":"Fixed","Question Time":"60","Adaptive Mode":"Off","Random Options":"On","Allow Option Change":"Off","Don't Change Until Correct":"Off","Mandatory Answer":"On","Negative Marking":"On","Partial Scoring":"Off","Question Navigation":"Sequential","Allow Back":"Off","Mark for Review":"Off","Auto Next Question":"On","Auto Submit":"On","Pause / Resume Allowed":"Off","Tracking":"On","Instant Answer":"Off","Instant Answer Feedback":"Off","Show Hint":"Off","Final Result":"On","Question Wise Result":"On","Adaptive Retake":"On"},
        {"Quiz Settings Title":"Timed Practice","Quiz Time":"1800","Section Order":"Random","Question Time":"45","Adaptive Mode":"Off","Random Options":"On","Allow Option Change":"On","Don't Change Until Correct":"Off","Mandatory Answer":"Off","Negative Marking":"Off","Partial Scoring":"On","Question Navigation":"Free","Allow Back":"On","Mark for Review":"On","Auto Next Question":"On","Auto Submit":"On","Pause / Resume Allowed":"On","Tracking":"On","Instant Answer":"On","Instant Answer Feedback":"On","Show Hint":"On","Final Result":"On","Question Wise Result":"On","Adaptive Retake":"Off"},
        {"Quiz Settings Title":"Review Mode","Quiz Time":"0","Section Order":"Fixed","Question Time":"0","Adaptive Mode":"Off","Random Options":"Off","Allow Option Change":"On","Don't Change Until Correct":"Off","Mandatory Answer":"Off","Negative Marking":"Off","Partial Scoring":"Off","Question Navigation":"Free","Allow Back":"On","Mark for Review":"On","Auto Next Question":"Off","Auto Submit":"Off","Pause / Resume Allowed":"On","Tracking":"On","Instant Answer":"On","Instant Answer Feedback":"On","Show Hint":"On","Final Result":"On","Question Wise Result":"On","Adaptive Retake":"On"}
      ]},
      startQuizSession:   { success:true, attemptFileId:"mock_file_001", attemptFileName:"attempt_mock.csv" },
      saveQuestionResponse:{ success:true },
      completeQuizSession: { success:true },
      getAttemptResults:   { success:true, responses:[] }
    };
    return mocks[fn] || { success:false, error:"Mock not defined: " + fn };
  },

  _genMockQs: function(){
    var qs = [
      {topic:"Math",concept:"arithmetic",Question:"What is 2 + 2?",Category:"Quant","Sub Category":"Arithmetic",Tags:"addition",Difficulty:"easy","Question Type":"Multichoice","Time Limit":"30",Choice1:"2",Choice2:"3",Choice3:"4",Choice4:"5","Correct Answer":"4",Solution:"2+2=4",Hint:"Basic addition",Score:"1","Negative Score":"0","Partial Score":"0"},
      {topic:"Math",concept:"arithmetic",Question:"Which are prime numbers?",Category:"Quant","Sub Category":"Arithmetic",Tags:"prime",Difficulty:"medium","Question Type":"Multi Multichoice","Time Limit":"45",Choice1:"2",Choice2:"3",Choice3:"4",Choice4:"5","Correct Answer":"2|3|5",Solution:"Prime: divisible by 1 & itself",Hint:"Check divisibility",Score:"2","Negative Score":"0.5","Partial Score":"1"},
      {topic:"Math",concept:"numbers",Question:"Arrange in ascending order",Category:"Quant","Sub Category":"Numbers",Tags:"ordering",Difficulty:"easy","Question Type":"Sequence","Time Limit":"40",Choice1:"3",Choice2:"1",Choice3:"4",Choice4:"2","Correct Answer":"1|2|3|4",Solution:"1,2,3,4",Hint:"Smallest first",Score:"2","Negative Score":"0","Partial Score":"0"},
      {topic:"Science",concept:"physics",Question:"Earth revolves around the Sun.",Category:"GK","Sub Category":"Science",Tags:"fact",Difficulty:"easy","Question Type":"True/False","Time Limit":"15",Choice1:"TRUE",Choice2:"FALSE",Choice3:"",Choice4:"","Correct Answer":"TRUE",Solution:"Heliocentric model",Hint:"Solar system",Score:"1","Negative Score":"0","Partial Score":"0"},
      {topic:"English",concept:"grammar",Question:"Which is a vowel?",Category:"English","Sub Category":"Grammar",Tags:"vowels",Difficulty:"easy","Question Type":"Multichoice Anycorrect","Time Limit":"20",Choice1:"A",Choice2:"B",Choice3:"E",Choice4:"G","Correct Answer":"A|E",Solution:"A and E are vowels",Hint:"Think AEIOU",Score:"1","Negative Score":"0","Partial Score":"0"},
      {topic:"Programming",concept:"oop",Question:"Define polymorphism in OOP.",Category:"Programming","Sub Category":"OOP",Tags:"concept",Difficulty:"medium","Question Type":"Short Answer","Time Limit":"60",Choice1:"",Choice2:"",Choice3:"",Choice4:"","Correct Answer":"Ability of object to take many forms",Solution:"OOP pillar",Hint:"Think objects",Score:"2","Negative Score":"0","Partial Score":"0"},
      {topic:"Math",concept:"algebra",Question:"If x + 5 = 12, what is x?",Category:"Quant","Sub Category":"Algebra",Tags:"algebra",Difficulty:"easy","Question Type":"Multichoice","Time Limit":"30",Choice1:"5",Choice2:"6",Choice3:"7",Choice4:"8","Correct Answer":"7",Solution:"x = 12-5 = 7",Hint:"Subtract 5",Score:"1","Negative Score":"0","Partial Score":"0"},
      {topic:"Science",concept:"chemistry",Question:"What is the chemical symbol for water?",Category:"GK","Sub Category":"Science",Tags:"chemistry",Difficulty:"easy","Question Type":"Multichoice","Time Limit":"20",Choice1:"H2O",Choice2:"CO2",Choice3:"O2",Choice4:"NaCl","Correct Answer":"H2O",Solution:"Water is H2O",Hint:"Hydrogen + Oxygen",Score:"1","Negative Score":"0","Partial Score":"0"},
      {topic:"GK",concept:"world",Question:"What is the capital of France?",Category:"GK","Sub Category":"Current Affairs",Tags:"geography",Difficulty:"easy","Question Type":"Multichoice","Time Limit":"20",Choice1:"Berlin",Choice2:"Paris",Choice3:"Rome",Choice4:"Madrid","Correct Answer":"Paris",Solution:"Paris is the capital",Hint:"Eiffel Tower city",Score:"1","Negative Score":"0","Partial Score":"0"},
      {topic:"Math",concept:"geometry",Question:"Area of a circle with radius 7 is?",Category:"Quant","Sub Category":"Geometry",Tags:"area",Difficulty:"medium","Question Type":"Multichoice","Time Limit":"45",Choice1:"44",Choice2:"154",Choice3:"88",Choice4:"22","Correct Answer":"154",Solution:"πr² = 22/7 × 49 = 154",Hint:"Use πr²",Score:"2","Negative Score":"0.5","Partial Score":"0"}
    ];
    // Duplicate to 30 questions for demo
    var out = [];
    for(var i = 0; i < 30; i++) out.push(Object.assign({},qs[i % qs.length],{_idx:i}));
    return out;
  }
};
