const fs = require("fs");
const path = require("path");

const IS_RENDER = !!process.env.RENDER_DISK_PATH || process.env.NODE_ENV === "production";
const DATA_DIR = process.env.RENDER_DISK_PATH || (IS_RENDER ? "/data" : path.join(__dirname, "..", "..", "data"));
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");
const COMMITMENTS_FILE = path.join(DATA_DIR, "commitments.json");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function ensureFile(filePath, fallbackValue = []) {
  ensureDir(path.dirname(filePath));

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallbackValue, null, 2));
  }
}

function ensureStorageReady() {
  ensureDir(DATA_DIR);
  ensureDir(UPLOADS_DIR);
  ensureFile(MESSAGES_FILE, []);
  ensureFile(COMMITMENTS_FILE, []);
}

function loadJson(filePath) {
  try {
    ensureStorageReady();

    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      return raw ? JSON.parse(raw) : [];
    }

    return [];
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    return [];
  }
}

function saveJson(filePath, data) {
  try {
    ensureStorageReady();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error saving ${filePath}:`, error.message);
  }
}

function loadMessages() {
  return loadJson(MESSAGES_FILE);
}

function saveMessages(messages) {
  saveJson(MESSAGES_FILE, messages);
}

function loadCommitments() {
  return loadJson(COMMITMENTS_FILE);
}

function saveCommitments(commitments) {
  saveJson(COMMITMENTS_FILE, commitments);
}

module.exports = {
  IS_RENDER,
  DATA_DIR,
  UPLOADS_DIR,
  MESSAGES_FILE,
  COMMITMENTS_FILE,
  ensureDir,
  ensureFile,
  ensureStorageReady,
  loadJson,
  saveJson,
  loadMessages,
  saveMessages,
  loadCommitments,
  saveCommitments,
};
