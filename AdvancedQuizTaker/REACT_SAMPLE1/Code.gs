// ============================================================
// QUIZ APP - Google Apps Script Backend (Code.gs)
// ============================================================

const CONFIG = {
  ROOT_FOLDER_ID: "YOUR_ROOT_FOLDER_ID_HERE", // Replace with your actual folder ID
  QUESTIONS_FOLDER: "Questions Data",
  QUIZ_CONFIG_FOLDER: "Quiz Config Data",
  RESULT_FOLDER: "Result Data",
  QUIZ_CONFIG_FILE: "quiz_config.csv",
  RESULT_FILE: "Result_Data.csv"
};

// ============================================================
// CORS & HTTP HANDLER
// ============================================================
function doGet(e) {
  return handleRequest(e);
}
function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  try {
    const params = e.parameter || {};
    const postData = e.postData ? JSON.parse(e.postData.contents || "{}") : {};
    const action = params.action || postData.action;
    let result = {};
    switch (action) {
      case "getTopics":       result = getTopics(params.folderId); break;
      case "getQuestions":    result = getQuestions(postData); break;
      case "getQuizConfigs":  result = getQuizConfigs(params.folderId); break;
      case "startQuiz":       result = startQuiz(postData); break;
      case "submitQuiz":      result = submitQuiz(postData); break;
      case "getResults":      result = getResults(params.folderId, params.studentName); break;
      case "getAttemptDetail":result = getAttemptDetail(params.fileId); break;
      case "validateFolder":  result = validateFolder(params.folderId); break;
      default: result = { error: "Unknown action: " + action };
    }
    output.setContent(JSON.stringify({ success: true, data: result }));
  } catch (err) {
    output.setContent(JSON.stringify({ success: false, error: err.message, stack: err.stack }));
  }
  return output;
}

// ============================================================
// FOLDER UTILITIES
// ============================================================
function getRootFolder(folderId) {
  return DriveApp.getFolderById(folderId || CONFIG.ROOT_FOLDER_ID);
}

function getSubFolder(parent, name) {
  const iter = parent.getFoldersByName(name);
  if (iter.hasNext()) return iter.next();
  throw new Error("Folder not found: " + name);
}

function getOrCreateFile(folder, fileName) {
  const iter = folder.getFilesByName(fileName);
  if (iter.hasNext()) return iter.next();
  return folder.createFile(fileName, "", MimeType.PLAIN_TEXT);
}

function validateFolder(folderId) {
  try {
    const root = getRootFolder(folderId);
    const name = root.getName();
    const qFolder = getSubFolder(root, CONFIG.QUESTIONS_FOLDER);
    const cFolder = getSubFolder(root, CONFIG.QUIZ_CONFIG_FOLDER);
    const rFolder = getSubFolder(root, CONFIG.RESULT_FOLDER);
    return {
      valid: true,
      rootName: name,
      folderId: folderId,
      folders: {
        questions: qFolder.getId(),
        config: cFolder.getId(),
        results: rFolder.getId()
      }
    };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

// ============================================================
// TOPICS (sub-folders inside Questions Data)
// ============================================================
function getTopics(folderId) {
  const root = getRootFolder(folderId);
  const qFolder = getSubFolder(root, CONFIG.QUESTIONS_FOLDER);
  const folders = qFolder.getFolders();
  const topics = [];
  while (folders.hasNext()) {
    const f = folders.next();
    topics.push({ id: f.getId(), name: f.getName() });
  }
  return topics;
}

// ============================================================
// QUESTIONS
// ============================================================
function getQuestions(params) {
  const folderId = params.folderId;
  const topics = params.topics; // array of topic names, or ["ALL"]
  const filters = params.filters || {};
  const root = getRootFolder(folderId);
  const qFolder = getSubFolder(root, CONFIG.QUESTIONS_FOLDER);
  let allQuestions = [];

  // Collect all topic folders
  const folderIter = qFolder.getFolders();
  while (folderIter.hasNext()) {
    const topicFolder = folderIter.next();
    const topicName = topicFolder.getName();
    if (topics && topics.length > 0 && !topics.includes("ALL") && !topics.includes(topicName)) continue;
    const files = topicFolder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      if (file.getName().endsWith(".csv")) {
        const questions = parseQuestionCSV(file.getBlob().getDataAsString(), topicName);
        allQuestions = allQuestions.concat(questions);
      }
    }
  }

  // Apply filters
  allQuestions = applyFilters(allQuestions, filters);
  return { questions: allQuestions, total: allQuestions.length };
}

function parseQuestionCSV(csvText, topic) {
  const rows = parseCSV(csvText);
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).filter(r => r.length > 1).map((row, idx) => {
    const q = {};
    headers.forEach((h, i) => q[h] = (row[i] || "").trim());
    q.topic = topic;
    q.id = `${topic}_${idx}_${Math.random().toString(36).substr(2, 6)}`;
    q.choices = [q["Choice1"], q["Choice2"], q["Choice3"], q["Choice4"]].filter(Boolean);
    q.correctAnswers = (q["Correct Answer"] || "").split("|").map(s => s.trim()).filter(Boolean);
    return q;
  }).filter(q => q["Status"] === "Active" || !q["Status"]);
}

function applyFilters(questions, filters) {
  return questions.filter(q => {
    if (filters.categories?.length && !filters.categories.includes("ALL") && !filters.categories.includes(q.Category)) return false;
    if (filters.subCategories?.length && !filters.subCategories.includes("ALL") && !filters.subCategories.includes(q["Sub Category"])) return false;
    if (filters.difficulties?.length && !filters.difficulties.includes("ALL") && !filters.difficulties.includes(q.Difficulty)) return false;
    if (filters.questionTypes?.length && !filters.questionTypes.includes("ALL") && !filters.questionTypes.includes(q["Question Type"])) return false;
    if (filters.tags?.length && !filters.tags.includes("ALL")) {
      const qTags = (q.Tags || "").split(",").map(t => t.trim());
      if (!filters.tags.some(t => qTags.includes(t))) return false;
    }
    return true;
  });
}

// ============================================================
// QUIZ CONFIG
// ============================================================
function getQuizConfigs(folderId) {
  const root = getRootFolder(folderId);
  const cFolder = getSubFolder(root, CONFIG.QUIZ_CONFIG_FOLDER);
  const iter = cFolder.getFilesByName(CONFIG.QUIZ_CONFIG_FILE);
  if (!iter.hasNext()) return { configs: [] };
  const file = iter.next();
  const rows = parseCSV(file.getBlob().getDataAsString());
  if (rows.length < 2) return { configs: [] };
  const headers = rows[0].map(h => h.trim());
  const configs = rows.slice(1).filter(r => r.length > 1).map(row => {
    const cfg = {};
    headers.forEach((h, i) => cfg[h] = (row[i] || "").trim());
    return cfg;
  });
  return { configs };
}

// ============================================================
// START QUIZ - create entry in Result_Data.csv
// ============================================================
function startQuiz(data) {
  const folderId = data.folderId;
  const root = getRootFolder(folderId);
  const rFolder = getSubFolder(root, CONFIG.RESULT_FOLDER);
  const resultFile = getOrCreateFile(rFolder, CONFIG.RESULT_FILE);
  const existing = resultFile.getBlob().getDataAsString();
  const headers = "Student Name,Quiz Name,Quiz Topic,Start Time,End Time,Result Score,Filepath\n";
  const startTime = new Date().toISOString();
  const entryId = Utilities.getUuid();
  const attemptFileName = `attempt_${data.studentName.replace(/\s/g,"_")}_${entryId}.csv`;
  
  // Create attempt detail file
  const attemptFile = rFolder.createFile(attemptFileName, buildAttemptCSVHeader(), MimeType.PLAIN_TEXT);
  const attemptFileId = attemptFile.getId();

  // Add row to result file
  const row = `${data.studentName},${data.quizName},${data.topics.join("|")},${startTime},,0,${attemptFileId}\n`;
  if (!existing.includes("Student Name")) {
    resultFile.setContent(headers + row);
  } else {
    resultFile.setContent(existing + row);
  }

  return { entryId, attemptFileId, startTime };
}

function buildAttemptCSVHeader() {
  return "QuestionID,Topic,Category,SubCategory,QuestionType,Question,UserAnswer,CorrectAnswer,IsCorrect,TimeTaken,Score,Marked\n";
}

// ============================================================
// SUBMIT QUIZ - update result entry & write attempt details
// ============================================================
function submitQuiz(data) {
  const folderId = data.folderId;
  const root = getRootFolder(folderId);
  const rFolder = getSubFolder(root, CONFIG.RESULT_FOLDER);

  const endTime = new Date().toISOString();

  // Update Result_Data.csv
  const resultFile = getOrCreateFile(rFolder, CONFIG.RESULT_FILE);
  let content = resultFile.getBlob().getDataAsString();
  const rows = content.split("\n");
  const updatedRows = rows.map(row => {
    if (row.includes(data.attemptFileId)) {
      const cols = row.split(",");
      cols[4] = endTime;
      cols[5] = data.totalScore;
      return cols.join(",");
    }
    return row;
  });
  resultFile.setContent(updatedRows.join("\n"));

  // Write attempt details
  const attemptFileIter = DriveApp.getFileById(data.attemptFileId);
  let attemptContent = buildAttemptCSVHeader();
  data.answers.forEach(ans => {
    attemptContent += [
      ans.questionId, ans.topic, ans.category, ans.subCategory,
      ans.questionType, `"${ans.question.replace(/"/g,'""')}"`,
      `"${(Array.isArray(ans.userAnswer) ? ans.userAnswer.join("|") : ans.userAnswer || "").replace(/"/g,'""')}"`,
      `"${ans.correctAnswer.replace(/"/g,'""')}"`,
      ans.isCorrect ? 1 : 0,
      ans.timeTaken, ans.score,
      ans.marked ? 1 : 0
    ].join(",") + "\n";
  });
  attemptFileIter.setContent(attemptContent);

  return { endTime, message: "Quiz submitted successfully" };
}

// ============================================================
// GET RESULTS
// ============================================================
function getResults(folderId, studentName) {
  const root = getRootFolder(folderId);
  const rFolder = getSubFolder(root, CONFIG.RESULT_FOLDER);
  const resultFile = getOrCreateFile(rFolder, CONFIG.RESULT_FILE);
  const rows = parseCSV(resultFile.getBlob().getDataAsString());
  if (rows.length < 2) return { results: [] };
  const headers = rows[0].map(h => h.trim());
  let results = rows.slice(1).filter(r => r.length > 1).map(row => {
    const r = {};
    headers.forEach((h, i) => r[h] = (row[i] || "").trim());
    return r;
  });
  if (studentName) results = results.filter(r => r["Student Name"] === studentName);
  return { results };
}

function getAttemptDetail(fileId) {
  const file = DriveApp.getFileById(fileId);
  const rows = parseCSV(file.getBlob().getDataAsString());
  if (rows.length < 2) return { answers: [] };
  const headers = rows[0].map(h => h.trim());
  const answers = rows.slice(1).filter(r => r.length > 1).map(row => {
    const a = {};
    headers.forEach((h, i) => a[h] = (row[i] || "").trim());
    return a;
  });
  return { answers };
}

// ============================================================
// CSV PARSER
// ============================================================
function parseCSV(text) {
  const result = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  lines.forEach(line => {
    if (!line.trim()) return;
    const row = [];
    let inQuotes = false, current = "";
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { row.push(current); current = ""; continue; }
      current += ch;
    }
    row.push(current);
    result.push(row);
  });
  return result;
}