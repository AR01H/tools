// ============================================================
//  QUIZ APP — Google Apps Script Backend  (Code.gs)
//  Deploy as Web App:  Execute as Me | Anyone (with / without Google)
// ============================================================

// ── HOW TO SET UP ────────────────────────────────────────────
// 1. Open script.google.com → New Project → paste this file
// 2. Set ROOT_FOLDER_ID below OR leave "" and pass via ?folderId=
// 3. Deploy → New Deployment → Web App
//    • Execute as: Me
//    • Who has access: Anyone
// 4. Copy the /exec URL → paste into Quiz App Settings
// ─────────────────────────────────────────────────────────────

var ROOT_FOLDER_ID = "";   // ← paste your Drive folder ID here

// ── CORS / Entry Point ───────────────────────────────────────
function doGet(e) {
  return handleRequest(e);
}
function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var output;
  try {
    var params  = e.parameter || {};
    var action  = params.action || (e.postData ? JSON.parse(e.postData.contents).action : "");
    var folderId = params.folderId || ROOT_FOLDER_ID;
    var body    = {};
    if (e.postData && e.postData.contents) {
      try { body = JSON.parse(e.postData.contents); } catch(err) {}
    }
    var result = dispatch(action, params, body, folderId);
    output = ContentService.createTextOutput(JSON.stringify({ ok: true, data: result }));
  } catch(err) {
    output = ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }));
  }
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function dispatch(action, params, body, folderId) {
  switch(action) {
    case "getTopics":          return getTopics(folderId);
    case "getQuestions":       return getQuestions(folderId, params);
    case "getQuizConfigs":     return getQuizConfigs(folderId);
    case "startAttempt":       return startAttempt(folderId, body);
    case "endAttempt":         return endAttempt(folderId, body);
    case "saveAttemptDetail":  return saveAttemptDetail(folderId, body);
    case "getAttempt":         return getAttempt(folderId, params);
    default: throw new Error("Unknown action: " + action);
  }
}

// ── HELPERS ──────────────────────────────────────────────────
function getRootFolder(folderId) {
  return DriveApp.getFolderById(folderId || ROOT_FOLDER_ID);
}

function getSubFolder(parent, name) {
  var it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  throw new Error("Folder not found: " + name);
}

function csvToObjects(csvText) {
  var lines = csvText.split(/\r?\n/).filter(function(l){ return l.trim(); });
  if (!lines.length) return [];
  var headers = lines[0].split(",").map(function(h){ return h.trim().replace(/^"|"$/g,""); });
  return lines.slice(1).map(function(line) {
    // simple CSV parse (handles quoted commas)
    var vals = [], cur = "", inQ = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (c === '"') { inQ = !inQ; }
      else if (c === ',' && !inQ) { vals.push(cur.trim()); cur = ""; }
      else { cur += c; }
    }
    vals.push(cur.trim());
    var obj = {};
    headers.forEach(function(h, idx){ obj[h] = (vals[idx] || "").replace(/^"|"$/g,""); });
    return obj;
  });
}

function readCsvFile(file) {
  return csvToObjects(file.getBlob().getDataAsString());
}

function appendRowToSheet(fileId, rowObj, headers) {
  // Read existing CSV, append row, write back
  var file = DriveApp.getFileById(fileId);
  var existing = file.getBlob().getDataAsString();
  var lines = existing.split(/\r?\n/).filter(function(l){ return l.trim(); });
  if (!lines.length) {
    lines.push(headers.join(","));
  }
  var newRow = headers.map(function(h){ return '"' + (rowObj[h] || "").toString().replace(/"/g,'""') + '"'; });
  lines.push(newRow.join(","));
  file.setContent(lines.join("\n"));
}

// ── ACTIONS ──────────────────────────────────────────────────

// GET TOPICS — folder names inside "Questions Data"
function getTopics(folderId) {
  var root = getRootFolder(folderId);
  var qFolder = getSubFolder(root, "Questions Data");
  var topics = [];
  var it = qFolder.getFolders();
  while (it.hasNext()) {
    var f = it.next();
    topics.push({ id: f.getId(), name: f.getName() });
  }
  return topics;
}

// GET QUESTIONS — read all CSVs in selected topic folders
function getQuestions(folderId, params) {
  var root = getRootFolder(folderId);
  var qFolder = getSubFolder(root, "Questions Data");
  var topicNames = (params.topics || "").split("|").map(function(t){ return t.trim(); }).filter(Boolean);
  var allQuestions = [];

  var folderIt = qFolder.getFolders();
  while (folderIt.hasNext()) {
    var f = folderIt.next();
    if (topicNames.length && topicNames.indexOf(f.getName()) === -1) continue;
    var fileIt = f.getFiles();
    while (fileIt.hasNext()) {
      var file = fileIt.next();
      if (!file.getName().endsWith(".csv")) continue;
      var rows = readCsvFile(file);
      rows.forEach(function(r){ r._topic = f.getName(); r._file = file.getName(); });
      allQuestions = allQuestions.concat(rows);
    }
  }
  return allQuestions;
}

// GET QUIZ CONFIGS
function getQuizConfigs(folderId) {
  var root = getRootFolder(folderId);
  var cfgFolder = getSubFolder(root, "Quiz Config Data");
  var it = cfgFolder.getFilesByName("quiz_config.csv");
  if (!it.hasNext()) throw new Error("quiz_config.csv not found in Quiz Config Data");
  return readCsvFile(it.next());
}

// START ATTEMPT — write row to Result_Data.csv + create attempt file
function startAttempt(folderId, body) {
  var root = getRootFolder(folderId);
  var resultFolder = getSubFolder(root, "Result Data");

  // Get/create Result_Data.csv
  var rdFile;
  var rdIt = resultFolder.getFilesByName("Result_Data.csv");
  if (rdIt.hasNext()) {
    rdFile = rdIt.next();
  } else {
    rdFile = resultFolder.createFile("Result_Data.csv",
      "Student Name,Quiz Name,Quiz Topic,Start Time,End Time,Result Score,Filepath\n", MimeType.PLAIN_TEXT);
  }

  var attemptId = "attempt_" + Date.now();
  var attemptFileName = "user_" + attemptId + ".csv";

  // Create attempt detail file
  var detailHeaders = "QuestionIndex,QuestionText,UserAnswer,CorrectAnswer,IsCorrect,TimeTaken,Category,SubCategory,Difficulty,QuestionType,Score,NegScore,PartialScore";
  var detailFile = resultFolder.createFile(attemptFileName, detailHeaders + "\n", MimeType.PLAIN_TEXT);

  // Append to Result_Data
  var rdHeaders = ["Student Name","Quiz Name","Quiz Topic","Start Time","End Time","Result Score","Filepath"];
  var row = {
    "Student Name": body.studentName || "",
    "Quiz Name":    body.quizName || "",
    "Quiz Topic":   body.quizTopic || "",
    "Start Time":   body.startTime || new Date().toISOString(),
    "End Time":     "",
    "Result Score": "",
    "Filepath":     detailFile.getId()
  };
  appendRowToSheet(rdFile.getId(), row, rdHeaders);

  return { attemptId: attemptId, fileId: detailFile.getId(), resultFileId: rdFile.getId() };
}

// END ATTEMPT — update End Time + score in Result_Data
function endAttempt(folderId, body) {
  var root = getRootFolder(folderId);
  var resultFolder = getSubFolder(root, "Result Data");
  var rdIt = resultFolder.getFilesByName("Result_Data.csv");
  if (!rdIt.hasNext()) throw new Error("Result_Data.csv not found");
  var rdFile = rdIt.next();
  var rows = readCsvFile(rdFile);
  var headers = ["Student Name","Quiz Name","Quiz Topic","Start Time","End Time","Result Score","Filepath"];

  // Find matching row by fileId (Filepath column)
  var updated = false;
  rows = rows.map(function(r) {
    if (r["Filepath"] === body.fileId) {
      r["End Time"]     = body.endTime || new Date().toISOString();
      r["Result Score"] = body.score !== undefined ? String(body.score) : "";
      updated = true;
    }
    return r;
  });

  if (updated) {
    var csv = headers.join(",") + "\n";
    csv += rows.map(function(r){
      return headers.map(function(h){ return '"' + (r[h]||"").replace(/"/g,'""') + '"'; }).join(",");
    }).join("\n");
    rdFile.setContent(csv);
  }
  return { updated: updated };
}

// SAVE ATTEMPT DETAIL — append answered question rows
function saveAttemptDetail(folderId, body) {
  var root = getRootFolder(folderId);
  var resultFolder = getSubFolder(root, "Result Data");
  var file = DriveApp.getFileById(body.fileId);
  var existing = file.getBlob().getDataAsString();
  var headers = ["QuestionIndex","QuestionText","UserAnswer","CorrectAnswer","IsCorrect","TimeTaken",
                 "Category","SubCategory","Difficulty","QuestionType","Score","NegScore","PartialScore"];
  var rows = body.rows || [];
  var newLines = rows.map(function(r){
    return headers.map(function(h){ return '"' + (r[h]||"").toString().replace(/"/g,'""') + '"'; }).join(",");
  });
  file.setContent(existing.trimEnd() + "\n" + newLines.join("\n") + "\n");
  return { saved: rows.length };
}

// GET ATTEMPT DETAIL
function getAttempt(folderId, params) {
  var file = DriveApp.getFileById(params.fileId);
  return readCsvFile(file);
}