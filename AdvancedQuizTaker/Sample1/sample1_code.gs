// ============================================================
//  QuizForge — Google Apps Script Backend
//  Paste this into your Apps Script project at script.google.com
// ============================================================

// 🔑 CONFIGURE THIS
const ROOT_FOLDER_ID = "PASTE_YOUR_ROOT_FOLDER_ID_HERE";

// ------------------------------------------------------------
//  FOLDER ACCESS LAYER
// ------------------------------------------------------------
function getFolder(name) {
  const root = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const folders = root.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : null;
}

function getSubFolder(parentFolder, name) {
  const folders = parentFolder.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : null;
}

// ------------------------------------------------------------
//  CSV UTILITIES
// ------------------------------------------------------------
function readCSV(file) {
  const content = file.getBlob().getDataAsString("UTF-8");
  return Utilities.parseCsv(content);
}

function csvToObjects(rows) {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).filter(r => r.some(c => c.trim())).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = (row[i] || "").trim());
    return obj;
  });
}

// ------------------------------------------------------------
//  GET TOPICS  (folder names inside "Questions Data")
// ------------------------------------------------------------
function getTopics() {
  const folder = getFolder("Questions Data");
  if (!folder) return { error: "Questions Data folder not found" };

  const topics = [];
  const subFolders = folder.getFolders();
  while (subFolders.hasNext()) {
    topics.push(subFolders.next().getName());
  }
  return topics;
}

// ------------------------------------------------------------
//  LOAD QUESTIONS  (with filters)
//  filters: { topics[], categories[], subcategories[], difficulty[], types[], status[], tags[], count }
// ------------------------------------------------------------
function getQuestions(filters) {
  const folder = getFolder("Questions Data");
  if (!folder) return { error: "Questions Data folder not found" };

  let allQuestions = [];
  const topicFolders = folder.getFolders();

  while (topicFolders.hasNext()) {
    const topicFolder = topicFolders.next();
    const topicName = topicFolder.getName();

    // Skip if topic filter active and doesn't match
    if (filters.topics && filters.topics.length && !filters.topics.includes(topicName)) continue;

    const files = topicFolder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      if (!file.getName().endsWith(".csv")) continue;

      const rows = readCSV(file);
      const questions = csvToObjects(rows);

      questions.forEach(q => {
        // Apply filters
        if (filters.categories && filters.categories.length && !filters.categories.includes(q["Category"])) return;
        if (filters.subcategories && filters.subcategories.length && !filters.subcategories.includes(q["Sub Category"])) return;
        if (filters.difficulty && filters.difficulty.length && !filters.difficulty.includes((q["Difficulty"] || "").toLowerCase())) return;
        if (filters.types && filters.types.length && !filters.types.includes(q["Question Type"])) return;
        if (filters.status && filters.status.length && !filters.status.includes(q["Status"])) return;
        if (filters.tags && filters.tags.length) {
          const qTags = (q["Tags"] || "").toLowerCase().split(",").map(t => t.trim());
          const hasTag = filters.tags.some(t => qTags.includes(t.toLowerCase()));
          if (!hasTag) return;
        }

        q._topic = topicName;
        allQuestions.push(q);
      });
    }
  }

  // Shuffle and limit
  if (filters.order === "random") allQuestions = shuffleArray(allQuestions);
  else if (filters.order === "difficulty") {
    const ord = { easy: 0, medium: 1, hard: 2 };
    allQuestions.sort((a, b) => (ord[a["Difficulty"]] || 0) - (ord[b["Difficulty"]] || 0));
  }

  const count = parseInt(filters.count) || allQuestions.length;
  return allQuestions.slice(0, count);
}

// ------------------------------------------------------------
//  LOAD QUIZ CONFIG
// ------------------------------------------------------------
function getQuizConfig() {
  const folder = getFolder("Quiz Config Data");
  if (!folder) return { error: "Quiz Config Data folder not found" };

  const files = folder.getFilesByName("quiz_config.csv");
  if (!files.hasNext()) return { error: "quiz_config.csv not found" };

  const rows = readCSV(files.next());
  return csvToObjects(rows);
}

// ------------------------------------------------------------
//  SAVE RESULT
//  payload: { name, quizMode, score, maxScore, accuracy, totalTime, date, answers[] }
// ------------------------------------------------------------
function saveResult(payload) {
  const folder = getFolder("Result Data");
  if (!folder) return { error: "Result Data folder not found" };

  // 1) Append summary row to Result_Data.csv
  try {
    const summaryFiles = folder.getFilesByName("Result_Data.csv");
    if (summaryFiles.hasNext()) {
      const file = summaryFiles.next();
      const content = file.getBlob().getDataAsString("UTF-8");
      const newRow = [
        payload.name || "",
        payload.quizMode || "",
        payload.score || 0,
        payload.maxScore || 0,
        payload.accuracy || 0,
        payload.totalTime || 0,
        payload.date || new Date().toLocaleString(),
        payload.attemptFile || "",
      ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(",");
      file.setContent(content + "\n" + newRow);
    }
  } catch (e) {
    Logger.log("Summary write error: " + e);
  }

  // 2) Create detailed attempt CSV
  let detailContent = "Student Name,Quiz Mode,Question,Category,Difficulty,Type,Your Answer,Correct Answer,Correct?,Score,Time(s)\n";
  (payload.answers || []).forEach((a, i) => {
    detailContent += [
      payload.name, payload.quizMode, a.question || "", a.category || "",
      a.difficulty || "", a.qType || "", a.value || "", a.correctAnswer || "",
      a.correct ? "Yes" : "No", a.score || 0, a.time || 0,
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(",") + "\n";
  });

  const fileName = `attempt_${payload.name}_${Date.now()}.csv`;
  const newFile = folder.createFile(fileName, detailContent, MimeType.CSV);

  return {
    success: true,
    fileId: newFile.getId(),
    fileName: fileName,
  };
}

// ------------------------------------------------------------
//  PAST RESULTS  (for dashboard)
// ------------------------------------------------------------
function getResults() {
  const folder = getFolder("Result Data");
  if (!folder) return [];

  const files = folder.getFilesByName("Result_Data.csv");
  if (!files.hasNext()) return [];

  const rows = readCSV(files.next());
  return csvToObjects(rows);
}

// ------------------------------------------------------------
//  HTTP ENTRY POINTS
// ------------------------------------------------------------
function doGet(e) {
  const action = e.parameter.action || "";

  switch (action) {
    case "getTopics":   return json(getTopics());
    case "getConfig":   return json(getQuizConfig());
    case "getResults":  return json(getResults());
    default:            return json({ error: "Unknown GET action: " + action });
  }
}

function doPost(e) {
  let data = {};
  try { data = JSON.parse(e.postData.contents); } catch(err) {}

  const action = e.parameter.action || data.action || "";

  switch (action) {
    case "getQuestions":  return json(getQuestions(data));
    case "saveResult":    return json(saveResult(data));
    default:              return json({ error: "Unknown POST action: " + action });
  }
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------
//  UTILITY
// ------------------------------------------------------------
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ------------------------------------------------------------
//  ONE-TIME SETUP: Creates the required folder structure
// ------------------------------------------------------------
function setupFolders() {
  const root = DriveApp.getFolderById(ROOT_FOLDER_ID);

  const folders = ["Questions Data", "Quiz Config Data", "Result Data"];
  folders.forEach(name => {
    const existing = root.getFoldersByName(name);
    if (!existing.hasNext()) {
      root.createFolder(name);
      Logger.log("Created folder: " + name);
    } else {
      Logger.log("Folder already exists: " + name);
    }
  });

  // Create Result_Data.csv if it doesn't exist
  const resultFolder = getFolder("Result Data");
  const existingCSV = resultFolder.getFilesByName("Result_Data.csv");
  if (!existingCSV.hasNext()) {
    const header = '"Student Name","Quiz Mode","Score","Max Score","Accuracy%","Total Time","Date","Attempt File"';
    resultFolder.createFile("Result_Data.csv", header + "\n", MimeType.CSV);
    Logger.log("Created Result_Data.csv");
  }

  Logger.log("Setup complete. Folder structure ready.");
}
