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

var ROOT_FOLDER_ID = "1qKJihERrxvmtYOYr1umKUsZC6nqRJFep";   // ← paste your Drive folder ID here

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
    var params  = {};
    if (e.parameter) {
       for (var k in e.parameter) params[k] = e.parameter[k];
    }
    var body    = {};
    if (e.postData && e.postData.contents) {
      try { 
        body = JSON.parse(e.postData.contents); 
        for (var key in body) { params[key] = body[key]; }
      } catch(err) {}
    }
    var action  = params.action || body.action || "";
    var folderId = params.folderId || ROOT_FOLDER_ID;
    var result = dispatch(action, params, body, folderId);
    var response = { ok: true, data: result };
    var callback = params.callback;
    if (callback) {
      output = ContentService.createTextOutput(callback + "(" + JSON.stringify(response) + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      output = ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch(err) {
    var errResponse = { ok: false, error: err.message };
    var callback = params ? params.callback : null;
    if (callback) {
      output = ContentService.createTextOutput(callback + "(" + JSON.stringify(errResponse) + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      output = ContentService.createTextOutput(JSON.stringify(errResponse))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
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
    case "getHistory":         return getHistory(folderId, params);
    case "adminLogin":         return adminLogin(params);
    case "adminStats":         return adminStats(folderId, params);
    case "adminClearHistory":  return adminClearHistory(folderId, params);
    case "test":               return { status: "ok", timestamp: new Date().toISOString() };
    default: throw new Error("Unknown action: " + action);
  }
}

// ── HELPERS ──────────────────────────────────────────────────
function getRootFolder(folderId) {
  try {
    const id = folderId || ROOT_FOLDER_ID;
    if (!id || id.includes("exampleID")) throw new Error("Invalid Folder ID detected. Please update your env.js with real Google Drive folder IDs.");
    return DriveApp.getFolderById(id);
  } catch (e) {
    throw new Error("Drive Access Error: " + e.message + " (Check if the Folder ID is correct and the script has permission to access it)");
  }
}

function getOrCreateSubFolder(parent, name) {
  var it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

function csvToObjects(csvText) {
  var lines = csvText.split(/\r?\n/).filter(function(l){ return l.trim(); });
  if (!lines.length) return [];
  
  // Auto-detect separator: check comma vs tab in header
  var separator = (lines[0].indexOf("\t") > -1 && lines[0].indexOf(",") === -1) ? "\t" : ",";
  var headers = lines[0].split(separator).map(function(h){ return h.trim().replace(/^"|"$/g,""); });
  
  return lines.slice(1).map(function(line) {
    var vals = [];
    if (separator === ",") {
      // simple CSV parse (handles quoted commas)
      var cur = "", inQ = false;
      for (var i = 0; i < line.length; i++) {
        var c = line[i];
        if (c === '"') { inQ = !inQ; }
        else if (c === ',' && !inQ) { vals.push(cur.trim()); cur = ""; }
        else { cur += c; }
      }
      vals.push(cur.trim());
    } else {
      vals = line.split("\t").map(function(v){ return v.trim(); });
    }
    
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
  var qFolder = getOrCreateSubFolder(root, "Questions Data");
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
  var qFolder = getOrCreateSubFolder(root, "Questions Data");
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
  var cfgFolder = getOrCreateSubFolder(root, "Quiz Config Data");
  var it = cfgFolder.getFilesByName("quiz_config.csv");
  if (!it.hasNext()) throw new Error("quiz_config.csv not found in Quiz Config Data");
  return readCsvFile(it.next());
}

// START ATTEMPT — write row to Result_Data.csv + create attempt file
function startAttempt(folderId, body) {
  var root = getRootFolder(folderId);
  var resultFolder = getOrCreateSubFolder(root, "Result Data");

  // Get/create Result_Data.csv
  var rdFile;
  var rdIt = resultFolder.getFilesByName("Result_Data.csv");
  if (rdIt.hasNext()) {
    rdFile = rdIt.next();
  } else {
    rdFile = resultFolder.createFile("Result_Data.csv",
      "Student Name,Identifier,Quiz Name,Quiz Topic,Start Time,End Time,Result Score,Filepath\n", MimeType.PLAIN_TEXT);
  }

  var attemptId = "attempt_" + Date.now();
  var attemptFileName = "user_" + attemptId + ".csv";

  // Create attempt detail file
  var detailHeaders = "QuestionIndex,QuestionText,UserAnswer,CorrectAnswer,IsCorrect,TimeTaken,Category,SubCategory,Difficulty,QuestionType,Score,NegScore,PartialScore";
  var detailFile = resultFolder.createFile(attemptFileName, detailHeaders + "\n", MimeType.PLAIN_TEXT);

  // Append to Result_Data
  var rdHeaders = ["Student Name","Identifier","Quiz Name","Quiz Topic","Start Time","End Time","Result Score","Filepath"];
  var row = {
    "Student Name": body.studentName || "",
    "Identifier":   body.identifier || "",
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
  var resultFolder = getOrCreateSubFolder(root, "Result Data");
  var rdIt = resultFolder.getFilesByName("Result_Data.csv");
  if (!rdIt.hasNext()) throw new Error("Result_Data.csv not found");
  var rdFile = rdIt.next();
  var rows = readCsvFile(rdFile);
  var headers = ["Student Name","Identifier","Quiz Name","Quiz Topic","Start Time","End Time","Result Score","Filepath"];

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
  var resultFolder = getOrCreateSubFolder(root, "Result Data");
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

// GET HISTORY — find all attempts for an identifier
function getHistory(folderId, params) {
  var root = getRootFolder(folderId);
  var resultFolder = getOrCreateSubFolder(root, "Result Data");
  var rdIt = resultFolder.getFilesByName("Result_Data.csv");
  if (!rdIt.hasNext()) return [];
  
  var rdFile = rdIt.next();
  var rows = readCsvFile(rdFile);
  var identifier = (params.identifier || "").toLowerCase().trim();
  
  if (!identifier) return [];
  
  return rows.filter(function(r) {
    // Robust key find: find value by key matching 'identifier' or 'phone' or 'email'
    var val = "";
    Object.keys(r).forEach(function(k) {
      var cleanK = k.toLowerCase().trim();
      if (cleanK === "identifier" || cleanK === "email" || cleanK === "phone/email") {
        val = (r[k] || "").toLowerCase().trim();
      }
    });
    return val === identifier;
  });
}

// ── ADMIN ACTIONS ────────────────────────────────────────────

const ADMIN_CREDENTIALS = {
  "admin": "admin123",
  "sysadmin": "securepass"
};

function verifyAuth(token) {
  if (!token) return false;
  const decoded = Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString();
  const parts = decoded.split(":");
  return (parts.length === 2 && ADMIN_CREDENTIALS[parts[0]] === parts[1]);
}

function adminLogin(params) {
  const u = params.username;
  const pass = params.password;
  if (ADMIN_CREDENTIALS[u] && ADMIN_CREDENTIALS[u] === pass) {
    const token = Utilities.base64Encode(u + ":" + pass);
    return { token: token };
  }
  throw new Error("Invalid username or password");
}

function adminStats(folderId, params) {
  if (!verifyAuth(params.auth)) throw new Error("Unauthorized Access");
  
  var root = getRootFolder(folderId);
  var resultFolder = getOrCreateSubFolder(root, "Result Data");
  var rdIt = resultFolder.getFilesByName("Result_Data.csv");
  
  if (!rdIt.hasNext()) {
    return { totalUsers: 0, totalAttempts: 0, history: [] };
  }
  
  var rdFile = rdIt.next();
  var rows = readCsvFile(rdFile);
  
  var historyList = [];
  var uniqueUsers = {};
  
  rows.forEach(function(r) {
    var idField = r["Identifier"] || r["User Identifier"] || r["Student Name"] || "";
    if (idField) uniqueUsers[idField] = true;
    historyList.push({
       timestamp: r["End Time"] || r["Start Time"] || "-",
       userId: idField || "Unknown",
       quizName: r["Quiz Name"] || "Unknown",
       quizTopic: r["Quiz Topic"] || "-",
       score: r["Result Score"] || "-",
       fileId: r["Filepath"] || r["filepath"] || null
    });
  });

  return {
    totalUsers: Object.keys(uniqueUsers).length,
    totalAttempts: historyList.length,
    history: historyList
  };
}

function adminClearHistory(folderId, params) {
  if (!verifyAuth(params.auth)) throw new Error("Unauthorized Access");
  
  var root = getRootFolder(folderId);
  var resultFolder = getOrCreateSubFolder(root, "Result Data");
  
  // Empty Result_Data.csv except headers
  var rdIt = resultFolder.getFilesByName("Result_Data.csv");
  if (rdIt.hasNext()) {
    var rdFile = rdIt.next();
    var existing = rdFile.getBlob().getDataAsString();
    var firstLine = existing.split(/\r?\n/)[0];
    if (firstLine) {
        rdFile.setContent(firstLine + "\n");
    }
  }
  
  // Optionally, delete individual user CSV files
  var filesIt = resultFolder.getFiles();
  while (filesIt.hasNext()) {
    var f = filesIt.next();
    if (f.getName() !== "Result_Data.csv" && (f.getName().indexOf("user_attempt_") > -1 || f.getName().indexOf("user_") > -1)) {
       f.setTrashed(true);
    }
  }
  
  return { message: "System Wipe Complete." };
}