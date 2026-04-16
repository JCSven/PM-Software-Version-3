require("dotenv").config();

const fs = require("fs");
const multer = require("multer");
const path = require("path");
const express = require("express");
const OpenAI = require("openai");
const { parseDueDateTextToDate, toIsoDate } = require("./lib/date-parser");
const {
  normalizeTrade,
  sanitizeTextField,
  enrichCommitment,
} = require("./lib/commitment-helpers");
const { TRADE_ALIASES } = require("./config/trades");
const {
  getAllCommitments,
  findCommitmentById,
  createCommitment,
  saveAllCommitments,
  updateCommitmentById,
} = require("./repositories/commitment-repository");
const {
  getAllMessages,
  createMessage,
} = require("./repositories/message-repository");
const { createMessagesRouter } = require("./routes/messages");
const { createCommitmentsRouter } = require("./routes/commitments");
const { APP_CONFIG } = require("./config/app");
const { createWebhookRouter } = require("./routes/webhook");
const { createDashboardRouter } = require("./routes/dashboard");
const {
  extractCommitmentWithOpenAI,
} = require("./services/commitment-extractor");
const { UPLOADS_DIR, ensureStorageReady } = require("./lib/storage");

ensureStorageReady();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureStorageReady();
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = APP_CONFIG.port;
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function requireDashboardKey(expectedKey) {
  return (req, res, next) => {
    if (!expectedKey) {
      return next();
    }

    if ((req.query.key || "") === expectedKey) {
      return next();
    }

    return res.status(403).send("Access denied. Missing or invalid dashboard key.");
  };
}

app.get(
  "/dashboard",
  requireDashboardKey(APP_CONFIG.mainDashboardAccessKey),
  (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
  }
);

app.get(
  "/dashboard.html",
  requireDashboardKey(APP_CONFIG.mainDashboardAccessKey),
  (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
  }
);

app.get(
  "/kevin-g.html",
  requireDashboardKey(APP_CONFIG.kevinDashboardAccessKey),
  (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
  }
);

app.get(
  "/justin-v.html",
  requireDashboardKey(APP_CONFIG.justinVDashboardAccessKey),
  (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
  }
);

app.use("/uploads", express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  "/messages",
  createMessagesRouter({
    getAllMessages,
  })
);

app.use("/", createDashboardRouter());

app.use(
  "/webhook",
  createWebhookRouter({
    createMessage,
    getAllMessages,
    createCommitment,
    getAllCommitments,
    saveAllCommitments,
    extractCommitmentWithOpenAI: (text) =>
      extractCommitmentWithOpenAI(client, text),
    parseDueDateTextToDate,
    toIsoDate,
    normalizeTrade,
    TRADE_ALIASES,
  })
);

app.use(
  "/commitments",
  createCommitmentsRouter({
    getAllCommitments,
    findCommitmentById,
    createCommitment,
    saveAllCommitments,
    updateCommitmentById,
    enrichCommitment,
    normalizeTrade,
    sanitizeTextField,
    parseDueDateTextToDate,
    toIsoDate,
    TRADE_ALIASES,
    upload,
  })
);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
