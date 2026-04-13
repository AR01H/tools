// ============================================================
//  QUIZ APP — Google Apps Script Backend  (Code.gs)
//  Deploy as Web App: Execute as Me, Anyone can access
// ============================================================

const ROOT_FOLDER_ID = "YOUR_ROOT_FOLDER_ID_HERE"; // ← Replace this

// ── Folder/File name constants ───────────────────────────────
const FOLDER_QUESTIONS  = "Questions Data";
const FOLDER_CONFIG     = "Quiz Config Data";
const FOLDER_RESULTS    = "Result Data";
const FILE_QUIZ_CONFIG  = "quiz_config.csv";
const FILE_RESULT_DATA  = "Result_Data.csv";

// ============================================================
//  ENTRY POINT
// ============================================================
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("QuizMaster Pro")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action  = payload.action;
    switch (action) {
      case "getTopics":         return jsonRes(getTopics());
      case "getQuizConfigs":    return jsonRes(getQuizConfigs());
      case "getQuestions":      return jsonRes(getQuestions(payload));
      case "startAttempt":      return jsonRes(startAttempt(payload));
      case "submitAttempt":     return jsonRes(submitAttempt(payload));
      case "getAttempt":        return jsonRes(getAttempt(payload));
      case "listAttempts":      return jsonRes(listAttempts(payload));
      default:                  return jsonRes({ error: "Unknown action" });
    }
  } catch (err) {
    return jsonRes({ error: err.message, stack: err.stack });
  }
}

// ============================================================
//  HELPERS
// ============================================================
function jsonRes(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getRootFolder() {
  return DriveApp.getFolderById(ROOT_FOLDER_ID);
}

function getSubFolder(parent, name) {
  const iter = parent.getFoldersByName(name);
  if (iter.hasNext()) return iter.next();
  throw new Error("Folder not found: " + name);
}

function getFileByName(folder, name) {
  const iter = folder.getFilesByName(name);
  if (iter.hasNext()) return iter.next();
  return null;
}

function parseCsv(content) {
  return Utilities.parseCsv(content);
}

function csvToObjects(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(r => r.some(c => c.trim() !== ""))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = (row[i] || "").trim());
      return obj;
    });
}

function objectsToCsvString(headers, rows) {
  const lines = [headers.join(",")];
  rows.forEach(r => {
    lines.push(headers.map(h => {
      const v = String(r[h] || "");
      return v.includes(",") || v.includes('"') ? `"${v.replace(/"/g,'""')}"` : v;
    }).join(","));
  });
  return lines.join("\n");
}

// ============================================================
//  TOPICS  (folder names inside Questions Data)
// ============================================================
function getTopics() {
  const root = getRootFolder();
  const qFolder = getSubFolder(root, FOLDER_QUESTIONS);
  const topics = [];
  const iter = qFolder.getFolders();
  while (iter.hasNext()) {
    const f = iter.next();
    topics.push({ id: f.getId(), name: f.getName() });
  }
  return { topics };
}

// ============================================================
//  QUIZ CONFIGS  (quiz_config.csv)
// ============================================================
function getQuizConfigs() {
  const root = getRootFolder();
  const cfgFolder = getSubFolder(root, FOLDER_CONFIG);
  const file = getFileByName(cfgFolder, FILE_QUIZ_CONFIG);
  if (!file) return { configs: [] };
  const rows = parseCsv(file.getBlob().getDataAsString());
  const configs = csvToObjects(rows);
  return { configs };
}

// ============================================================
//  QUESTIONS  (filter by topics, category, subcategory, tags,
//              difficulty, question type, count)
// ============================================================
function getQuestions(payload) {
  const { topics, categories, subCategories, tags, difficulty, questionTypes, count } = payload;
  const root = getRootFolder();
  const qFolder = getSubFolder(root, FOLDER_QUESTIONS);
  let allQuestions = [];

  // Collect CSVs from selected topic folders
  const topicIter = qFolder.getFolders();
  while (topicIter.hasNext()) {
    const tf = topicIter.next();
    if (topics && topics.length && !topics.includes(tf.getName())) continue;
    const fileIter = tf.getFilesByType(MimeType.CSV);
    while (fileIter.hasNext()) {
      const f = fileIter.next();
      const rows = parseCsv(f.getBlob().getDataAsString());
      const qs = csvToObjects(rows);
      qs.forEach(q => { q._topic = tf.getName(); q._file = f.getName(); });
      allQuestions = allQuestions.concat(qs);
    }
  }

  // Filter active only
  allQuestions = allQuestions.filter(q => (q.Status || "Active") === "Active");

  // Apply filters
  if (categories  && categories.length)    allQuestions = allQuestions.filter(q => categories.includes(q.Category));
  if (subCategories && subCategories.length) allQuestions = allQuestions.filter(q => subCategories.includes(q["Sub Category"]));
  if (tags        && tags.length)          allQuestions = allQuestions.filter(q => tags.some(t => (q.Tags||"").split(",").map(x=>x.trim()).includes(t)));
  if (difficulty  && difficulty.length)    allQuestions = allQuestions.filter(q => difficulty.includes((q.Difficulty||"").toLowerCase()));
  if (questionTypes && questionTypes.length) allQuestions = allQuestions.filter(q => questionTypes.includes(q["Question Type"]));

  // Shuffle
  allQuestions = allQuestions.sort(() => Math.random() - 0.5);

  // Limit count
  if (count && count > 0) allQuestions = allQuestions.slice(0, parseInt(count));

  return { questions: allQuestions, total: allQuestions.length };
}

// ============================================================
//  START ATTEMPT  — write header row to Result_Data.csv
// ============================================================
function startAttempt(payload) {
  const { studentName, dob, contact, quizName, quizTopic, startTime } = payload;
  const root = getRootFolder();
  const resFolder = getSubFolder(root, FOLDER_RESULTS);

  // Ensure Result_Data.csv exists with headers
  let rdFile = getFileByName(resFolder, FILE_RESULT_DATA);
  const headers = ["Attempt ID","Student Name","DOB","Contact","Quiz Name","Quiz Topic","Start Time","End Time","Result Score","Filepath"];
  if (!rdFile) {
    rdFile = resFolder.createFile(FILE_RESULT_DATA, headers.join(",") + "\n", MimeType.CSV);
  }

  const attemptId = "ATT_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5).toUpperCase();

  // Append row (end time blank for now)
  const content = rdFile.getBlob().getDataAsString();
  const newRow = [attemptId, studentName, dob, contact, quizName, quizTopic, startTime, "", "", ""].join(",");
  rdFile.setContent(content + newRow + "\n");

  return { attemptId };
}

// ============================================================
//  SUBMIT ATTEMPT — update Result_Data.csv + write detail file
// ============================================================
function submitAttempt(payload) {
  const { attemptId, studentName, dob, contact, quizName, quizTopic,
          startTime, endTime, score, totalScore, questions, answers,
          timeTaken, categoryScores, difficultyScores } = payload;

  const root = getRootFolder();
  const resFolder = getSubFolder(root, FOLDER_RESULTS);

  // Create detailed attempt file
  const detailFileName = "attempt_" + attemptId + ".json";
  const detailContent = JSON.stringify({
    attemptId, studentName, dob, contact, quizName, quizTopic,
    startTime, endTime, score, totalScore, timeTaken,
    categoryScores, difficultyScores, questions, answers
  }, null, 2);
  const detailFile = resFolder.createFile(detailFileName, detailContent, MimeType.PLAIN_TEXT);
  const detailFileId = detailFile.getId();

  // Update Result_Data.csv row
  let rdFile = getFileByName(resFolder, FILE_RESULT_DATA);
  if (rdFile) {
    let content = rdFile.getBlob().getDataAsString();
    const lines = content.split("\n");
    const updated = lines.map(line => {
      if (line.startsWith(attemptId + ",")) {
        const parts = line.split(",");
        parts[7] = endTime;
        parts[8] = score + "/" + totalScore;
        parts[9] = detailFileId;
        return parts.join(",");
      }
      return line;
    });
    rdFile.setContent(updated.join("\n"));
  }

  return { success: true, detailFileId };
}

// ============================================================
//  GET SINGLE ATTEMPT
// ============================================================
function getAttempt(payload) {
  const { detailFileId } = payload;
  const file = DriveApp.getFileById(detailFileId);
  const data = JSON.parse(file.getBlob().getDataAsString());
  return { attempt: data };
}

// ============================================================
//  LIST ATTEMPTS for a student (by contact/name)
// ============================================================
function listAttempts(payload) {
  const { contact } = payload;
  const root = getRootFolder();
  const resFolder = getSubFolder(root, FOLDER_RESULTS);
  const rdFile = getFileByName(resFolder, FILE_RESULT_DATA);
  if (!rdFile) return { attempts: [] };

  const rows = parseCsv(rdFile.getBlob().getDataAsString());
  const all = csvToObjects(rows);
  const filtered = contact
    ? all.filter(r => r["Contact"] === contact || r["Student Name"].toLowerCase().includes(contact.toLowerCase()))
    : all;

  return { attempts: filtered };
}

// ============================================================
//  UTILITY: Get metadata for filters (unique categories, etc.)
// ============================================================
function getFilterMeta(payload) {
  const { topics } = payload;
  const root = getRootFolder();
  const qFolder = getSubFolder(root, FOLDER_QUESTIONS);
  let allQ = [];
  const topicIter = qFolder.getFolders();
  while (topicIter.hasNext()) {
    const tf = topicIter.next();
    if (topics && topics.length && !topics.includes(tf.getName())) continue;
    const fi = tf.getFilesByType(MimeType.CSV);
    while (fi.hasNext()) {
      const f = fi.next();
      const rows = parseCsv(f.getBlob().getDataAsString());
      allQ = allQ.concat(csvToObjects(rows));
    }
  }
  const uniq = (arr) => [...new Set(arr.filter(Boolean))];
  return {
    categories:    uniq(allQ.map(q => q.Category)),
    subCategories: uniq(allQ.map(q => q["Sub Category"])),
    tags:          uniq(allQ.flatMap(q => (q.Tags||"").split(",").map(t=>t.trim()))),
    difficulties:  uniq(allQ.map(q => (q.Difficulty||"").toLowerCase())),
    questionTypes: uniq(allQ.map(q => q["Question Type"])),
  };
}
