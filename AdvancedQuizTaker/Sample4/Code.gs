// ============================================================
// QuizMaster Pro — Google Apps Script Backend (Code.gs)
// ============================================================
// SETUP:
//   1. Open script.google.com, create new project
//   2. Paste this entire file as Code.gs
//   3. Set ROOT_FOLDER_ID below to your Drive folder ID
//   4. Deploy → New Deployment → Web App
//      Execute as: Me | Who has access: Anyone
//   5. Copy the Web App URL into the app's Settings panel
//
// DRIVE FOLDER STRUCTURE REQUIRED:
//   ROOT_FOLDER_ID/
//   ├── Quiz Config Data/
//   │     └── quiz_config.csv
//   ├── Questions Data/
//   │     ├── Quant/
//   │     │     └── Arithmetic.csv  (etc)
//   │     ├── English/
//   │     └── ...
//   └── Result Data/
//         └── Result_Data.csv
// ============================================================

var ROOT_FOLDER_ID = 'YOUR_ROOT_FOLDER_ID_HERE'; // <-- change this

// ── Entry Point ─────────────────────────────────────────────
function doGet(e) {
  var action = e.parameter.action || '';
  var result;
  try {
    if (action === 'getQuestions')   result = getQuestions(e.parameter);
    else if (action === 'getConfigs')     result = getConfigs();
    else if (action === 'getResults')     result = getResults();
    else if (action === 'getFolderTree')  result = getFolderTree();
    else result = { error: 'Unknown action: ' + action };
  } catch (err) {
    result = { error: err.toString() };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var action = '';
  var payload = {};
  try {
    payload = JSON.parse(e.postData.contents);
    action = payload.action || '';
  } catch (err) {
    return jsonResponse({ error: 'Invalid JSON: ' + err });
  }
  var result;
  try {
    if (action === 'addQuestion')     result = addQuestion(payload.data);
    else if (action === 'updateQuestion') result = updateQuestion(payload.data);
    else if (action === 'deleteQuestion') result = deleteQuestion(payload.id, payload.category, payload.subcategory);
    else if (action === 'addConfig')      result = addConfig(payload.data);
    else if (action === 'updateConfig')   result = updateConfig(payload.data);
    else if (action === 'deleteConfig')   result = deleteConfig(payload.title);
    else if (action === 'addResult')      result = addResult(payload.data);
    else if (action === 'deleteResult')   result = deleteResult(payload.id);
    else result = { error: 'Unknown action: ' + action };
  } catch (err) {
    result = { error: err.toString() };
  }
  return jsonResponse(result);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Folder helpers ───────────────────────────────────────────
function getRootFolder() {
  return DriveApp.getFolderById(ROOT_FOLDER_ID);
}

function getSubFolder(parent, name) {
  var it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

function getFile(folder, name) {
  var it = folder.getFilesByName(name);
  return it.hasNext() ? it.next() : null;
}

function ensureFile(folder, name, headerRow) {
  var f = getFile(folder, name);
  if (!f) {
    f = folder.createFile(name, headerRow + '\n', MimeType.PLAIN_TEXT);
  }
  return f;
}

// ── CSV helpers ──────────────────────────────────────────────
function parseCSV(text) {
  var lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  var headers = parseCSVLine(lines[0]);
  var rows = [];
  for (var i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    var vals = parseCSVLine(lines[i]);
    var obj = {};
    headers.forEach(function(h, idx) { obj[h] = vals[idx] || ''; });
    rows.push(obj);
  }
  return rows;
}

function parseCSVLine(line) {
  var result = [], cur = '', inQ = false;
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
    else { cur += ch; }
  }
  result.push(cur.trim());
  return result;
}

function toCSVLine(obj, headers) {
  return headers.map(function(h) {
    var v = (obj[h] || '').toString().replace(/"/g, '""');
    return '"' + v + '"';
  }).join(',');
}

function readCSV(file) {
  return parseCSV(file.getBlob().getDataAsString());
}

function writeCSV(file, rows, headers) {
  var lines = [headers.join(',')];
  rows.forEach(function(r) { lines.push(toCSVLine(r, headers)); });
  file.setContent(lines.join('\n'));
}

// ── QUESTIONS ────────────────────────────────────────────────
var Q_HEADERS = ['Question','Category','Sub Category','Tags','Difficulty','Question Type','Time Limit','Choice1','Choice2','Choice3','Choice4','Correct Answer','Solution','Hint','Score','Negative Score','Partial Score','Status','Passage'];

function getQuestions(params) {
  var root = getRootFolder();
  var qFolder = getSubFolder(root, 'Questions Data');
  var all = [];
  var catFolders = qFolder.getFolders();
  while (catFolders.hasNext()) {
    var catFolder = catFolders.next();
    var catName = catFolder.getName();
    // Filter by topic if requested
    if (params && params.topic && params.topic !== catName) continue;
    var files = catFolder.getFiles();
    while (files.hasNext()) {
      var file = files.next();
      if (!file.getName().endsWith('.csv')) continue;
      var rows = readCSV(file);
      rows.forEach(function(r, i) {
        r._id = catName + '_' + file.getName() + '_' + i;
        r._file = file.getName();
        r._folder = catName;
        all.push(r);
      });
    }
  }
  return { questions: all };
}

function addQuestion(data) {
  var root = getRootFolder();
  var qFolder = getSubFolder(root, 'Questions Data');
  var catFolder = getSubFolder(qFolder, data['Category'] || 'General');
  var fileName = (data['Sub Category'] || 'questions').replace(/[^a-z0-9]/gi, '_') + '.csv';
  var file = getFile(catFolder, fileName);
  if (!file) {
    file = catFolder.createFile(fileName, Q_HEADERS.join(',') + '\n', MimeType.PLAIN_TEXT);
  }
  var rows = readCSV(file);
  rows.push(data);
  writeCSV(file, rows, Q_HEADERS);
  return { success: true, message: 'Question added to ' + fileName };
}

function updateQuestion(data) {
  var root = getRootFolder();
  var qFolder = getSubFolder(root, 'Questions Data');
  var catFolder = getSubFolder(qFolder, data._folder || data['Category'] || 'General');
  var fileName = data._file;
  var file = getFile(catFolder, fileName);
  if (!file) return { success: false, message: 'File not found: ' + fileName };
  var rows = readCSV(file);
  var updated = false;
  rows = rows.map(function(r, i) {
    if (r._id === data._id || i === parseInt(data._row)) { updated = true; return data; }
    return r;
  });
  if (!updated) rows.push(data);
  writeCSV(file, rows, Q_HEADERS);
  return { success: true };
}

function deleteQuestion(id, category, subcategory) {
  var root = getRootFolder();
  var qFolder = getSubFolder(root, 'Questions Data');
  var catFolder = getSubFolder(qFolder, category || 'General');
  var fileName = (subcategory || 'questions').replace(/[^a-z0-9]/gi, '_') + '.csv';
  var file = getFile(catFolder, fileName);
  if (!file) return { success: false, message: 'File not found' };
  var rows = readCSV(file).filter(function(r) { return r._id !== id; });
  writeCSV(file, rows, Q_HEADERS);
  return { success: true };
}

// ── CONFIGS ──────────────────────────────────────────────────
var CFG_HEADERS = ['Quiz Settings Title','Quiz Time','Section Order','Question Time','Adaptive Mode','Random Options','Allow Option Change',"Don't Change Until Correct",'Mandatory Answer','Negative Marking','Partial Scoring','Question Navigation','Allow Back','Mark for Review','Auto Next Question','Auto Submit','Pause / Resume Allowed','Tracking','Instant Answer','Instant Answer Feedback','Show Hint','Final Result','Question Wise Result','Adaptive Retake'];

function getConfigs() {
  var root = getRootFolder();
  var cfgFolder = getSubFolder(root, 'Quiz Config Data');
  var file = ensureFile(cfgFolder, 'quiz_config.csv', CFG_HEADERS.join(','));
  var rows = readCSV(file);
  return { configs: rows };
}

function addConfig(data) {
  var root = getRootFolder();
  var cfgFolder = getSubFolder(root, 'Quiz Config Data');
  var file = ensureFile(cfgFolder, 'quiz_config.csv', CFG_HEADERS.join(','));
  var rows = readCSV(file);
  rows.push(data);
  writeCSV(file, rows, CFG_HEADERS);
  return { success: true };
}

function updateConfig(data) {
  var root = getRootFolder();
  var cfgFolder = getSubFolder(root, 'Quiz Config Data');
  var file = ensureFile(cfgFolder, 'quiz_config.csv', CFG_HEADERS.join(','));
  var rows = readCSV(file);
  var found = false;
  rows = rows.map(function(r) {
    if (r['Quiz Settings Title'] === data['Quiz Settings Title']) { found = true; return data; }
    return r;
  });
  if (!found) rows.push(data);
  writeCSV(file, rows, CFG_HEADERS);
  return { success: true };
}

function deleteConfig(title) {
  var root = getRootFolder();
  var cfgFolder = getSubFolder(root, 'Quiz Config Data');
  var file = ensureFile(cfgFolder, 'quiz_config.csv', CFG_HEADERS.join(','));
  var rows = readCSV(file).filter(function(r) { return r['Quiz Settings Title'] !== title; });
  writeCSV(file, rows, CFG_HEADERS);
  return { success: true };
}

// ── RESULTS ──────────────────────────────────────────────────
var R_HEADERS = ['Student Name','Quiz Name','Quiz Topic','Start Time','End Time','Result Score','Filepath'];

function getResults() {
  var root = getRootFolder();
  var rFolder = getSubFolder(root, 'Result Data');
  var file = ensureFile(rFolder, 'Result_Data.csv', R_HEADERS.join(','));
  var rows = readCSV(file);
  return { results: rows };
}

function addResult(data) {
  var root = getRootFolder();
  var rFolder = getSubFolder(root, 'Result Data');
  // Main result file
  var mainFile = ensureFile(rFolder, 'Result_Data.csv', R_HEADERS.join(','));
  var rows = readCSV(mainFile);
  var resultRow = {
    'Student Name': data['Student Name'] || '',
    'Quiz Name': data['Quiz Name'] || '',
    'Quiz Topic': data['Quiz Topic'] || '',
    'Start Time': data['Start Time'] || '',
    'End Time': data['End Time'] || '',
    'Result Score': data['Result Score'] || '',
    'Filepath': data['Filepath'] || ''
  };
  rows.push(resultRow);
  writeCSV(mainFile, rows, R_HEADERS);

  // Individual attempt file
  var attemptName = 'result_' + (data['Student Name'] || 'user').replace(/\s/g, '_') + '_' + Date.now() + '.csv';
  var attemptHeaders = ['Question','Category','Difficulty','Question Type','Your Answer','Correct Answer','Result','Score Earned'];
  var attemptRows = (data.questionData || []).map(function(q) {
    return {
      'Question': q.Question || '',
      'Category': q.Category || '',
      'Difficulty': q.Difficulty || '',
      'Question Type': q['Question Type'] || '',
      'Your Answer': q.yourAnswer || '',
      'Correct Answer': q['Correct Answer'] || '',
      'Result': q.result || '',
      'Score Earned': q.scoreEarned || '0'
    };
  });
  var attemptContent = [attemptHeaders.join(',')].concat(attemptRows.map(function(r) { return toCSVLine(r, attemptHeaders); })).join('\n');
  rFolder.createFile(attemptName, attemptContent, MimeType.PLAIN_TEXT);

  return { success: true, filepath: attemptName };
}

function deleteResult(id) {
  // id is the row index or student name + timestamp
  return { success: true, message: 'Delete by row not supported via ID alone; remove from Result_Data.csv manually or re-implement with row tracking.' };
}

// ── FOLDER TREE ──────────────────────────────────────────────
function getFolderTree() {
  var root = getRootFolder();
  function buildTree(folder) {
    var node = { name: folder.getName(), type: 'folder', children: [] };
    var subFolders = folder.getFolders();
    while (subFolders.hasNext()) {
      node.children.push(buildTree(subFolders.next()));
    }
    var files = folder.getFiles();
    while (files.hasNext()) {
      var f = files.next();
      node.children.push({ name: f.getName(), type: 'file', id: f.getId(), size: f.getSize() });
    }
    return node;
  }
  return { tree: buildTree(root) };
}

// ── TEST function (run from Apps Script editor) ───────────────
function testSetup() {
  Logger.log('Root folder: ' + getRootFolder().getName());
  Logger.log('Questions: ' + JSON.stringify(getQuestions({})));
  Logger.log('Configs: ' + JSON.stringify(getConfigs()));
  Logger.log('Results: ' + JSON.stringify(getResults()));
}
