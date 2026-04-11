// ================================================================
// DriveSync — Google Apps Script Backend  (Code.gs)
// ================================================================
// DEPLOY AS:
//   Deploy → New Deployment → Web App
//   Execute as: Me
//   Who has access: Anyone
// ================================================================

const CONFIG = {
  FOLDER_NAME : "LocalStorageBackups",
  META_FILE   : "_config.json",
  USERNAME    : "admin",           // ← Change this
  PASSWORD    : "yourpassword123", // ← Change this
};

function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;

    if (!authenticate(body.username, body.password)) {
      return respond({ error: "Invalid username or password.", auth: false });
    }

    switch (action) {
      case "export"       : return handleExport(body);
      case "import"       : return handleImport(body);
      case "list_files"   : return handleListFiles();
      case "list_keys"    : return handleListKeys(body);
      case "delete_backup": return handleDeleteBackup(body);
      case "verify"       : return respond({ success: true, message: "Auth OK" });
      case "save_config"  : return handleSaveConfig(body);
      default             : return respond({ error: "Unknown action: " + action });
    }
  } catch (err) {
    return respond({ error: "Server error: " + err.message });
  }
}

function doGet() {
  return respond({ status: "ok", service: "DriveSync API", version: "2.0" });
}

function authenticate(username, password) {
  return username === CONFIG.USERNAME && password === CONFIG.PASSWORD;
}

function handleExport(params) {
  const { appName, data, label } = params;
  if (!appName || !data) return respond({ error: "Missing appName or data" });

  const root      = getOrCreateFolder(CONFIG.FOLDER_NAME);
  const appFolder = getOrCreateFolder(appName, root);
  const ts        = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const safeName  = (label || "backup").replace(/[^a-z0-9_\-]/gi, "_");
  const fileName  = safeName + "_" + ts + ".json";

  const content = JSON.stringify({
    _meta: { appName, exportedAt: new Date().toISOString(), keyCount: Object.keys(data).length },
    data
  }, null, 2);

  const file = appFolder.createFile(fileName, content, MimeType.PLAIN_TEXT);
  pruneOldBackups(appFolder, 20);

  return respond({ success: true, fileId: file.getId(), fileName, message: "Exported to Drive ✓" });
}

function handleImport(params) {
  const { fileId } = params;
  if (!fileId) return respond({ error: "Missing fileId" });
  try {
    const file    = DriveApp.getFileById(fileId);
    const content = JSON.parse(file.getBlob().getDataAsString());
    return respond({ success: true, data: content.data, meta: content._meta });
  } catch (err) {
    return respond({ error: "Could not read file: " + err.message });
  }
}

function handleListFiles() {
  const root   = getOrCreateFolder(CONFIG.FOLDER_NAME);
  const subs   = root.getFolders();
  const result = {};

  while (subs.hasNext()) {
    const sub   = subs.next();
    const name  = sub.getName();
    const files = sub.getFiles();
    result[name] = [];
    while (files.hasNext()) {
      const f = files.next();
      result[name].push({
        id      : f.getId(),
        name    : f.getName(),
        size    : f.getSize(),
        modified: f.getLastUpdated().toISOString()
      });
    }
    result[name].sort((a, b) => new Date(b.modified) - new Date(a.modified));
  }
  return respond({ success: true, files: result });
}

function handleListKeys(params) {
  const { fileId } = params;
  if (!fileId) return respond({ error: "Missing fileId" });
  try {
    const content = JSON.parse(DriveApp.getFileById(fileId).getBlob().getDataAsString());
    return respond({ success: true, keys: Object.keys(content.data || {}), meta: content._meta });
  } catch (err) {
    return respond({ error: "Could not read file: " + err.message });
  }
}

function handleDeleteBackup(params) {
  const { fileId } = params;
  if (!fileId) return respond({ error: "Missing fileId" });
  try {
    DriveApp.getFileById(fileId).setTrashed(true);
    return respond({ success: true, message: "Deleted" });
  } catch (err) {
    return respond({ error: "Could not delete: " + err.message });
  }
}

function handleSaveConfig(params) {
  const root    = getOrCreateFolder(CONFIG.FOLDER_NAME);
  const content = JSON.stringify({
    note     : "DriveSync configuration — keep this file safe!",
    scriptURL: params.scriptURL || "",
    username : CONFIG.USERNAME,
    savedAt  : new Date().toISOString()
  }, null, 2);

  const existing = root.getFilesByName(CONFIG.META_FILE);
  while (existing.hasNext()) existing.next().setTrashed(true);
  root.createFile(CONFIG.META_FILE, content, MimeType.PLAIN_TEXT);
  return respond({ success: true, message: "Config saved to Drive" });
}

function getOrCreateFolder(name, parent) {
  const root    = parent || DriveApp;
  const folders = root.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : root.createFolder(name);
}

function pruneOldBackups(folder, maxCount) {
  const files = [];
  const iter  = folder.getFiles();
  while (iter.hasNext()) files.push(iter.next());
  files.sort((a, b) => a.getLastUpdated() - b.getLastUpdated());
  while (files.length > maxCount) files.shift().setTrashed(true);
}

function respond(data) {
  const out = ContentService.createTextOutput(JSON.stringify(data));
  out.setMimeType(ContentService.MimeType.JSON);
  return out;
}