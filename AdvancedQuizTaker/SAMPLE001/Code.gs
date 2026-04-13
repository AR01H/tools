// ============================================================
//  QUIZ APP – Google Apps Script Backend  (Code.gs)
//  Root entry point – delegates to sub-modules
// ============================================================

// ── CONFIG ──────────────────────────────────────────────────
var CONFIG = {
  ROOT_FOLDER_ID: "YOUR_ROOT_FOLDER_ID_HERE",   // ← replace once
  QUIZ_CONFIG_FOLDER: "Quiz Config Data",
  QUESTIONS_FOLDER:   "Questions Data",
  RESULTS_FOLDER:     "Result Data",
  RESULT_FILE:        "Result_Data.csv",
  QUIZ_CONFIG_FILE:   "quiz_config.csv"
};

// ── MAIN WEB-APP ENTRY POINT ─────────────────────────────────
function doGet(e) {
  var tmpl = HtmlService.createTemplateFromFile("index");
  return tmpl.evaluate()
    .setTitle("QuizMaster Pro")
    .addMetaTag("viewport","width=device-width,initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ── SETTINGS / CONFIG ────────────────────────────────────────
function getAppConfig() {
  var props = PropertiesService.getUserProperties();
  return {
    rootFolderId: props.getProperty("ROOT_FOLDER_ID") || CONFIG.ROOT_FOLDER_ID,
    scriptId:     props.getProperty("SCRIPT_ID")      || ScriptApp.getScriptId()
  };
}

function saveAppConfig(rootFolderId, scriptId) {
  var props = PropertiesService.getUserProperties();
  if (rootFolderId) props.setProperty("ROOT_FOLDER_ID", rootFolderId);
  if (scriptId)     props.setProperty("SCRIPT_ID",      scriptId);
  return { success: true };
}

function resetAppConfig() {
  PropertiesService.getUserProperties().deleteAllProperties();
  return { success: true };
}

function getRootFolderId() {
  return getAppConfig().rootFolderId;
}

// ── FOLDER HELPERS ───────────────────────────────────────────
function getSubFolder(parentId, name) {
  var parent = DriveApp.getFolderById(parentId);
  var iter   = parent.getFoldersByName(name);
  if (iter.hasNext()) return iter.next();
  throw new Error("Folder not found: " + name);
}

function getOrCreateFile(folderId, fileName, mimeType) {
  var folder = DriveApp.getFolderById(folderId);
  var iter   = folder.getFilesByName(fileName);
  if (iter.hasNext()) return iter.next();
  return folder.createFile(fileName, mimeType === "csv" ? "" : "", MimeType.PLAIN_TEXT);
}

// ── QUIZ TOPICS (folder names inside Questions Data) ─────────
function getQuizTopics() {
  try {
    var rootId  = getRootFolderId();
    var qFolder = getSubFolder(rootId, CONFIG.QUESTIONS_FOLDER);
    var topics  = [];
    var iter    = qFolder.getFolders();
    while (iter.hasNext()) {
      var f = iter.next();
      topics.push({ id: f.getId(), name: f.getName() });
    }
    return { success: true, topics: topics };
  } catch(e) { return { success: false, error: e.message }; }
}

// ── QUESTIONS ────────────────────────────────────────────────
function getQuestionsForTopics(topicNames) {
  try {
    var rootId  = getRootFolderId();
    var qFolder = getSubFolder(rootId, CONFIG.QUESTIONS_FOLDER);
    var all     = [];

    topicNames.forEach(function(topicName) {
      var tIter = qFolder.getFoldersByName(topicName);
      if (!tIter.hasNext()) return;
      var tFolder = tIter.next();
      var fIter   = tFolder.getFiles();
      while (fIter.hasNext()) {
        var file = fIter.next();
        if (!file.getName().endsWith(".csv")) continue;
        var rows = Utilities.parseCsv(file.getBlob().getDataAsString());
        if (rows.length < 2) continue;
        var headers = rows[0].map(function(h){ return h.trim(); });
        for (var r = 1; r < rows.length; r++) {
          var obj = { topic: topicName, concept: file.getName().replace(".csv","") };
          headers.forEach(function(h, i){ obj[h] = (rows[r][i] || "").trim(); });
          all.push(obj);
        }
      }
    });
    return { success: true, questions: all };
  } catch(e) { return { success: false, error: e.message }; }
}

// ── QUIZ CONFIG ──────────────────────────────────────────────
function getQuizConfigs() {
  try {
    var rootId  = getRootFolderId();
    var cfgDir  = getSubFolder(rootId, CONFIG.QUIZ_CONFIG_FOLDER);
    var iter    = cfgDir.getFilesByName(CONFIG.QUIZ_CONFIG_FILE);
    if (!iter.hasNext()) return { success: false, error: "quiz_config.csv not found" };
    var rows    = Utilities.parseCsv(iter.next().getBlob().getDataAsString());
    if (rows.length < 2) return { success: true, configs: [] };
    var headers = rows[0].map(function(h){ return h.trim(); });
    var configs = [];
    for (var r = 1; r < rows.length; r++) {
      var obj = {};
      headers.forEach(function(h, i){ obj[h] = (rows[r][i] || "").trim(); });
      configs.push(obj);
    }
    return { success: true, configs: configs };
  } catch(e) { return { success: false, error: e.message }; }
}

// ── RESULT RECORDING ─────────────────────────────────────────
function startQuizSession(sessionData) {
  try {
    var rootId     = getRootFolderId();
    var resFolder  = getSubFolder(rootId, CONFIG.RESULTS_FOLDER);
    var resFolId   = resFolder.getId();

    // Append start row to Result_Data.csv
    var mainFile = ensureResultFile(resFolder);
    var row = [
      sessionData.studentName,
      sessionData.quizName,
      sessionData.quizTopics.join("|"),
      sessionData.startTime,
      "", "", ""           // end, score, filepath – filled on complete
    ];
    appendCsvRow(mainFile, row);

    // Create per-attempt file
    var attemptName = "attempt_" + sessionData.studentName.replace(/\s+/g,"_") + "_" + Date.now() + ".csv";
    var headers     = ["Question","Selected Answer","Correct Answer","Is Correct","Time Taken","Marks","Category","Sub Category","Difficulty"];
    var content     = headers.join(",") + "\n";
    var attFile     = resFolder.createFile(attemptName, content, MimeType.PLAIN_TEXT);

    return { success: true, attemptFileId: attFile.getId(), attemptFileName: attemptName };
  } catch(e) { return { success: false, error: e.message }; }
}

function saveQuestionResponse(attemptFileId, responseData) {
  try {
    var file    = DriveApp.getFileById(attemptFileId);
    var content = file.getBlob().getDataAsString();
    var row = [
      '"' + (responseData.question    || "").replace(/"/g,'""') + '"',
      '"' + (responseData.selected    || "").replace(/"/g,'""') + '"',
      '"' + (responseData.correct     || "").replace(/"/g,'""') + '"',
      responseData.isCorrect ? "1" : "0",
      responseData.timeTaken || 0,
      responseData.marks     || 0,
      responseData.category  || "",
      responseData.subCategory || "",
      responseData.difficulty  || ""
    ];
    file.setContent(content + row.join(",") + "\n");
    return { success: true };
  } catch(e) { return { success: false, error: e.message }; }
}

function completeQuizSession(sessionData) {
  try {
    var rootId    = getRootFolderId();
    var resFolder = getSubFolder(rootId, CONFIG.RESULTS_FOLDER);
    var mainFile  = ensureResultFile(resFolder);

    // Re-read and find the row to update
    var content   = mainFile.getBlob().getDataAsString();
    var rows      = Utilities.parseCsv(content);
    var updated   = false;

    for (var i = rows.length - 1; i >= 1; i--) {
      if (rows[i][0] === sessionData.studentName && rows[i][3] === sessionData.startTime && rows[i][4] === "") {
        rows[i][4] = sessionData.endTime;
        rows[i][5] = String(sessionData.score);
        rows[i][6] = sessionData.attemptFileId;
        updated = true;
        break;
      }
    }

    if (updated) {
      var newContent = rows.map(function(r){ return r.map(function(c){ return '"'+c.replace(/"/g,'""')+'"'; }).join(","); }).join("\n");
      mainFile.setContent(newContent);
    }
    return { success: true };
  } catch(e) { return { success: false, error: e.message }; }
}

function ensureResultFile(resFolder) {
  var iter = resFolder.getFilesByName(CONFIG.RESULT_FILE);
  if (iter.hasNext()) return iter.next();
  var headers = ["Student Name","Quiz Name","Quiz Topic","Start Time","End Time","Result Score","Filepath"];
  return resFolder.createFile(CONFIG.RESULT_FILE, headers.join(",") + "\n", MimeType.PLAIN_TEXT);
}

function appendCsvRow(file, rowArr) {
  var content = file.getBlob().getDataAsString();
  var line    = rowArr.map(function(c){ return '"' + String(c).replace(/"/g,'""') + '"'; }).join(",");
  file.setContent(content + line + "\n");
}

// ── ATTEMPT RESULTS ──────────────────────────────────────────
function getAttemptResults(attemptFileId) {
  try {
    var file    = DriveApp.getFileById(attemptFileId);
    var rows    = Utilities.parseCsv(file.getBlob().getDataAsString());
    if (rows.length < 2) return { success: true, responses: [] };
    var headers = rows[0].map(function(h){ return h.trim(); });
    var resp    = [];
    for (var r = 1; r < rows.length; r++) {
      var obj = {};
      headers.forEach(function(h,i){ obj[h] = (rows[r][i]||"").trim(); });
      resp.push(obj);
    }
    return { success: true, responses: resp };
  } catch(e) { return { success: false, error: e.message }; }
}

// ── METADATA FILTERS ─────────────────────────────────────────
function getFilterMetadata(topicNames) {
  var result = getQuestionsForTopics(topicNames);
  if (!result.success) return result;
  var qs = result.questions;

  function unique(arr) {
    return arr.filter(function(v,i,a){ return v && a.indexOf(v) === i; }).sort();
  }

  // Category → subcategories map
  var catMap = {};
  qs.forEach(function(q){
    var cat = q["Category"] || "";
    var sub = q["Sub Category"] || "";
    if (!catMap[cat]) catMap[cat] = [];
    if (sub && catMap[cat].indexOf(sub) < 0) catMap[cat].push(sub);
  });

  return {
    success:        true,
    categories:     Object.keys(catMap).sort(),
    categorySubMap: catMap,
    tags:           unique(qs.map(function(q){ return q["Tags"]; })),
    difficulties:   unique(qs.map(function(q){ return q["Difficulty"]; })),
    questionTypes:  unique(qs.map(function(q){ return q["Question Type"]; }))
  };
}
