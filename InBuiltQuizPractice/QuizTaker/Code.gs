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
  var params = {};
  try {
    if (e.parameter) {
      for (var k in e.parameter) params[k] = e.parameter[k];
    }
    var body = {};
    if (e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
        for (var key in body) { params[key] = body[key]; }
      } catch(err) {}
    }
    var action   = params.action || body.action || "";
    var folderId = params.folderId || ROOT_FOLDER_ID;
    var result   = dispatch(action, params, body, folderId);
    var response = { ok: true, data: result };
    var callback = params.callback;
    if (callback) {
      output = ContentService
        .createTextOutput(callback + "(" + JSON.stringify(response) + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      output = ContentService
        .createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch(err) {
    var errResponse = { ok: false, error: err.message };
    var callback = params ? params.callback : null;
    if (callback) {
      output = ContentService
        .createTextOutput(callback + "(" + JSON.stringify(errResponse) + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      output = ContentService
        .createTextOutput(JSON.stringify(errResponse))
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

// ════════════════════════════════════════════════════════════
//  ROBUST CSV HELPERS
//  Handles HTML content, multiline values, embedded commas,
//  and escaped quotes correctly.
// ════════════════════════════════════════════════════════════

/**
 * Core character-by-character CSV parser.
 * Correctly handles:
 *   - Quoted fields containing commas, newlines, and HTML tags
 *   - Escaped double-quotes ("") inside quoted fields
 *   - Mixed \r\n and \n line endings
 * Returns an array of row-objects keyed by the header row.
 */
function parseFullCSV(csvText) {
  var result  = [];
  var headers = null;
  var i       = 0;
  var len     = csvText.length;

  // Parse a single field starting at position i
  function parseField() {
    if (i >= len) return "";

    if (csvText[i] === '"') {
      // ── Quoted field ──────────────────────────────────────
      i++; // skip opening quote
      var val = "";
      while (i < len) {
        if (csvText[i] === '"') {
          if (i + 1 < len && csvText[i + 1] === '"') {
            // Escaped quote: "" → "
            val += '"';
            i += 2;
          } else {
            // Closing quote
            i++;
            break;
          }
        } else {
          val += csvText[i++];
        }
      }
      return val;
    } else {
      // ── Unquoted field ────────────────────────────────────
      var val = "";
      while (i < len &&
             csvText[i] !== ',' &&
             csvText[i] !== '\n' &&
             csvText[i] !== '\r') {
        val += csvText[i++];
      }
      return val.trim();
    }
  }

  while (i < len) {
    var row = [];

    // Parse one complete row (may span multiple lines if fields are quoted)
    while (i < len) {
      row.push(parseField());

      if (i < len && csvText[i] === ',') {
        i++; // comma → next field in same row
      } else {
        // End of row: consume \r\n or \n
        if (i < len && csvText[i] === '\r') i++;
        if (i < len && csvText[i] === '\n') i++;
        break;
      }
    }

    // Skip completely blank rows
    if (row.length === 1 && row[0] === "") continue;

    if (!headers) {
      // First non-blank row = header
      headers = row.map(function(h) { return h.trim(); });
    } else {
      var obj = {};
      headers.forEach(function(h, idx) {
        obj[h] = (row[idx] !== undefined) ? row[idx] : "";
      });
      result.push(obj);
    }
  }

  return result;
}

/**
 * Escape a single value for safe inclusion in a CSV cell.
 * Always quotes the field if it contains: comma, double-quote,
 * newline, carriage-return, or any HTML angle bracket.
 */
function escapeCSVField(val) {
  var s = (val === undefined || val === null) ? "" : String(val);
  var needsQuoting = (
    s.indexOf(',')  > -1 ||
    s.indexOf('"')  > -1 ||
    s.indexOf('\n') > -1 ||
    s.indexOf('\r') > -1 ||
    s.indexOf('<')  > -1 ||
    s.indexOf('>')  > -1
  );
  if (needsQuoting) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Convert an array of row-objects back to a CSV string.
 */
function objectsToCSV(headers, rows) {
  var lines = [ headers.map(escapeCSVField).join(",") ];
  rows.forEach(function(r) {
    lines.push(
      headers.map(function(h) { return escapeCSVField(r[h]); }).join(",")
    );
  });
  return lines.join("\n") + "\n";
}

/**
 * Read a Drive file and parse it as CSV.
 */
function readCsvFile(file) {
  return parseFullCSV(file.getBlob().getDataAsString("UTF-8"));
}

/**
 * Append a single row-object to an existing CSV file in Drive.
 * Safe for HTML content in any field.
 */
function appendRowToSheet(fileId, rowObj, headers) {
  var file     = DriveApp.getFileById(fileId);
  var existing = file.getBlob().getDataAsString("UTF-8");

  // If file is empty or missing headers, write header line first
  if (!existing.trim()) {
    existing = headers.map(escapeCSVField).join(",") + "\n";
  } else if (existing[existing.length - 1] !== '\n') {
    // Ensure there's a trailing newline before we append
    existing += "\n";
  }

  var newRow = headers.map(function(h) {
    return escapeCSVField(rowObj[h]);
  }).join(",");

  file.setContent(existing + newRow + "\n");
}

// ── DRIVE HELPERS ─────────────────────────────────────────────

function getRootFolder(folderId) {
  try {
    var id = folderId;
    if (!id || id === "" || id === "undefined" || id === "null" || id === "[object Object]") {
      id = ROOT_FOLDER_ID;
    }
    if (!id || id.indexOf("exampleID") > -1) {
      throw new Error("Invalid Folder ID. Please update your Settings or Code.gs.");
    }
    return DriveApp.getFolderById(id);
  } catch (e) {
    throw new Error("Drive Access Error: " + e.message + " (ID: " + folderId + ")");
  }
}

function getOrCreateSubFolder(parent, name) {
  var it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

// ════════════════════════════════════════════════════════════
//  ACTIONS
// ════════════════════════════════════════════════════════════

// ── GET TOPICS — folder names inside "Questions Data" ────────
function getTopics(folderId) {
  var root    = getRootFolder(folderId);
  var qFolder = getOrCreateSubFolder(root, "Questions Data");
  var topics  = [];
  var it      = qFolder.getFolders();
  while (it.hasNext()) {
    var f = it.next();
    topics.push({ id: f.getId(), name: f.getName() });
  }
  return topics;
}

// ── GET QUESTIONS — read all CSVs in selected topic folders ──
function getQuestions(folderId, params) {
  var root       = getRootFolder(folderId);
  var qFolder    = getOrCreateSubFolder(root, "Questions Data");
  var topicNames = (params.topics || "")
    .split("|")
    .map(function(t) { return t.trim(); })
    .filter(Boolean);
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
      rows.forEach(function(r) {
        r._topic = f.getName();
        r._file  = file.getName();
      });
      allQuestions = allQuestions.concat(rows);
    }
  }
  return allQuestions;
}

// ── GET QUIZ CONFIGS ──────────────────────────────────────────
function getQuizConfigs(folderId) {
  var root      = getRootFolder(folderId);
  var cfgFolder = getOrCreateSubFolder(root, "Quiz Config Data");
  var it        = cfgFolder.getFilesByName("quiz_config.csv");
  if (!it.hasNext()) throw new Error("quiz_config.csv not found in Quiz Config Data");
  return readCsvFile(it.next());
}

// ── START ATTEMPT ─────────────────────────────────────────────
function startAttempt(folderId, body) {
  var root         = getRootFolder(folderId);
  var resultFolder = getOrCreateSubFolder(root, "Result Data");

  // Get or create Result_Data.csv
  var rdFile;
  var rdIt = resultFolder.getFilesByName("Result_Data.csv");
  if (rdIt.hasNext()) {
    rdFile = rdIt.next();
  } else {
    rdFile = resultFolder.createFile(
      "Result_Data.csv",
      "Student Name,Identifier,Quiz Name,Quiz Topic,Start Time,End Time,Result Score,Filepath\n",
      MimeType.PLAIN_TEXT
    );
  }

  var attemptId      = "attempt_" + Date.now();
  var attemptFileName = "user_" + attemptId + ".csv";

  // Create per-attempt detail file with headers
  var detailHeaders = "QuestionIndex,QuestionText,UserAnswer,CorrectAnswer,IsCorrect,TimeTaken," +
                      "Category,SubCategory,Difficulty,QuestionType,Score,NegScore,PartialScore";
  var detailFile = resultFolder.createFile(
    attemptFileName,
    detailHeaders + "\n",
    MimeType.PLAIN_TEXT
  );

  // Append summary row to Result_Data.csv
  var rdHeaders = [
    "Student Name", "Identifier", "Quiz Name", "Quiz Topic",
    "Start Time", "End Time", "Result Score", "Filepath"
  ];
  var row = {
    "Student Name": body.studentName || "",
    "Identifier":   body.identifier  || "",
    "Quiz Name":    body.quizName    || "",
    "Quiz Topic":   body.quizTopic   || "",
    "Start Time":   body.startTime   || new Date().toISOString(),
    "End Time":     "",
    "Result Score": "",
    "Filepath":     detailFile.getId()
  };
  appendRowToSheet(rdFile.getId(), row, rdHeaders);

  return {
    attemptId:    attemptId,
    fileId:       detailFile.getId(),
    resultFileId: rdFile.getId()
  };
}

// ── END ATTEMPT — update End Time + score in Result_Data ──────
function endAttempt(folderId, body) {
  var root         = getRootFolder(folderId);
  var resultFolder = getOrCreateSubFolder(root, "Result Data");
  var rdIt         = resultFolder.getFilesByName("Result_Data.csv");
  if (!rdIt.hasNext()) throw new Error("Result_Data.csv not found");

  var rdFile  = rdIt.next();
  var rows    = readCsvFile(rdFile);
  var headers = [
    "Student Name", "Identifier", "Quiz Name", "Quiz Topic",
    "Start Time", "End Time", "Result Score", "Filepath"
  ];

  var updated = false;
  rows = rows.map(function(r) {
    if (r["Filepath"] === body.fileId) {
      r["End Time"]     = body.endTime || new Date().toISOString();
      r["Result Score"] = (body.score !== undefined) ? String(body.score) : "";
      updated = true;
    }
    return r;
  });

  if (updated) {
    // Rewrite the whole file using the safe helper
    rdFile.setContent(objectsToCSV(headers, rows));
  }
  return { updated: updated };
}

// ── SAVE ATTEMPT DETAIL — append answered question rows ───────
function saveAttemptDetail(folderId, body) {
  var file     = DriveApp.getFileById(body.fileId);
  var existing = file.getBlob().getDataAsString("UTF-8");
  var headers  = [
    "QuestionIndex", "QuestionText", "UserAnswer", "CorrectAnswer",
    "IsCorrect", "TimeTaken", "Category", "SubCategory",
    "Difficulty", "QuestionType", "Score", "NegScore", "PartialScore"
  ];
  var rows = body.rows || [];

  // Build new lines using the safe escaper
  var newLines = rows.map(function(r) {
    return headers.map(function(h) {
      return escapeCSVField(r[h]);
    }).join(",");
  });

  // Ensure existing content ends with a newline before appending
  var base = existing.trimEnd();
  if (base.length > 0) base += "\n";

  file.setContent(base + newLines.join("\n") + "\n");
  return { saved: rows.length };
}

// ── GET ATTEMPT DETAIL ────────────────────────────────────────
function getAttempt(folderId, params) {
  var file = DriveApp.getFileById(params.fileId);
  return readCsvFile(file);
}

// ── GET HISTORY — find all attempts for an identifier ─────────
function getHistory(folderId, params) {
  var root         = getRootFolder(folderId);
  var resultFolder = getOrCreateSubFolder(root, "Result Data");
  var rdIt         = resultFolder.getFilesByName("Result_Data.csv");
  if (!rdIt.hasNext()) return [];

  var rdFile     = rdIt.next();
  var rows       = readCsvFile(rdFile);
  var identifier = (params.identifier || "").toLowerCase().trim();
  if (!identifier) return [];

  return rows.filter(function(r) {
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

// ════════════════════════════════════════════════════════════
//  ADMIN ACTIONS
// ════════════════════════════════════════════════════════════

var ADMIN_CREDENTIALS = {
  "admin":    "admin123",
  "sysadmin": "securepass"
};

function verifyAuth(token) {
  if (!token) return false;
  try {
    var decoded = Utilities.newBlob(Utilities.base64Decode(token)).getDataAsString();
    var parts   = decoded.split(":");
    return (parts.length === 2 && ADMIN_CREDENTIALS[parts[0]] === parts[1]);
  } catch(e) {
    return false;
  }
}

function adminLogin(params) {
  var u    = params.username;
  var pass = params.password;
  if (ADMIN_CREDENTIALS[u] && ADMIN_CREDENTIALS[u] === pass) {
    var token = Utilities.base64Encode(u + ":" + pass);
    return { token: token };
  }
  throw new Error("Invalid username or password");
}

function adminStats(folderId, params) {
  if (!verifyAuth(params.auth)) throw new Error("Unauthorized Access");

  var root         = getRootFolder(folderId);
  var resultFolder = getOrCreateSubFolder(root, "Result Data");
  var rdIt         = resultFolder.getFilesByName("Result_Data.csv");

  if (!rdIt.hasNext()) {
    return { totalUsers: 0, totalAttempts: 0, history: [] };
  }

  var rdFile      = rdIt.next();
  var rows        = readCsvFile(rdFile);
  var historyList = [];
  var uniqueUsers = {};

  rows.forEach(function(r) {
    var idField = r["Identifier"] || r["User Identifier"] || r["Student Name"] || "";
    if (idField) uniqueUsers[idField] = true;
    historyList.push({
      timestamp: r["End Time"]    || r["Start Time"] || "-",
      userId:    idField          || "Unknown",
      quizName:  r["Quiz Name"]   || "Unknown",
      quizTopic: r["Quiz Topic"]  || "-",
      score:     r["Result Score"]|| "-",
      fileId:    r["Filepath"]    || r["filepath"]   || null
    });
  });

  return {
    totalUsers:    Object.keys(uniqueUsers).length,
    totalAttempts: historyList.length,
    history:       historyList
  };
}

function adminClearHistory(folderId, params) {
  if (!verifyAuth(params.auth)) throw new Error("Unauthorized Access");

  var root         = getRootFolder(folderId);
  var resultFolder = getOrCreateSubFolder(root, "Result Data");

  // Wipe Result_Data.csv but keep the header row
  var rdIt = resultFolder.getFilesByName("Result_Data.csv");
  if (rdIt.hasNext()) {
    var rdFile   = rdIt.next();
    var existing = rdFile.getBlob().getDataAsString("UTF-8");
    var firstLine = existing.split(/\r?\n/)[0];
    if (firstLine) {
      rdFile.setContent(firstLine + "\n");
    }
  }

  // Trash individual user attempt CSV files
  var filesIt = resultFolder.getFiles();
  while (filesIt.hasNext()) {
    var f = filesIt.next();
    var name = f.getName();
    if (name !== "Result_Data.csv" &&
        (name.indexOf("user_attempt_") > -1 || name.indexOf("user_") > -1)) {
      f.setTrashed(true);
    }
  }

  return { message: "System Wipe Complete." };
}