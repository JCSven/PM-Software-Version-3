const express = require("express");

function createCommitmentsRouter({
  getAllCommitments,
  findCommitmentById,
  createCommitment,
  updateCommitmentById,
  saveAllCommitments,
  enrichCommitment,
  normalizeTrade,
  sanitizeTextField,
  parseDueDateTextToDate,
  toIsoDate,
  TRADE_ALIASES,
  upload,
}) {
  const router = express.Router();

  router.get("/", (req, res) => {
    const commitments = getAllCommitments();
    const enriched = commitments.map((commitment) =>
      enrichCommitment(commitment, TRADE_ALIASES)
    );
    res.json(enriched);
  });

  router.post("/:id/upload", upload.array("files"), (req, res) => {
    const { id } = req.params;
    const files = req.files || [];

    const commitment = findCommitmentById(id);
    if (!commitment) {
      return res.status(404).json({ error: "Not found" });
    }

    const newAttachments = files.map((file) => ({
      type: file.mimetype.startsWith("image") ? "image" : "file",
      file_name: file.filename,
      url: `/uploads/${file.filename}`,
    }));

    const updated = updateCommitmentById(id, {
      attachments: [...(commitment.attachments || []), ...newAttachments],
      updated_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      commitment: enrichCommitment(updated, TRADE_ALIASES),
    });
  });

  router.post("/:id/notes", (req, res) => {
    const { id } = req.params;
    const commitment = findCommitmentById(id);

    if (!commitment) {
      return res.status(404).json({ error: "Commitment not found" });
    }

    const author = sanitizeTextField(req.body.author, null);
    const text = sanitizeTextField(req.body.text, null);

    if (!author) {
      return res.status(400).json({ error: "Note owner is required" });
    }

    if (!text) {
      return res.status(400).json({ error: "Note text is required" });
    }

    const note = {
      id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      author,
      text,
      created_at: new Date().toISOString(),
    };

    const updated = updateCommitmentById(id, {
      notes: [...(commitment.notes || []), note],
      updated_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      note,
      commitment: enrichCommitment(updated, TRADE_ALIASES),
    });
  });

  router.post("/:id/approve", (req, res) => {
    const { id } = req.params;
    const commitment = findCommitmentById(id);

    if (!commitment) {
      return res.status(404).json({ error: "Commitment not found" });
    }

    const updated = updateCommitmentById(id, {
      approval_status: "approved",
      review_reason: null,
      updated_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      commitment: enrichCommitment(updated, TRADE_ALIASES),
    });
  });

  router.post("/create", (req, res) => {
    const owner = sanitizeTextField(req.body.owner, "Unknown");
    const task = sanitizeTextField(req.body.task, null);
    const dueDateText = sanitizeTextField(req.body.due_date_text, null);
    const trade = normalizeTrade(
      sanitizeTextField(req.body.trade, null),
      TRADE_ALIASES
    );
    const itemType = sanitizeTextField(req.body.item_type, "task");
    const priority = sanitizeTextField(req.body.priority, "normal");
    const approvalStatus = sanitizeTextField(req.body.approval_status, "approved");
    const timestamp = new Date().toISOString();

    if (!task) {
      return res.status(400).json({ error: "Task is required" });
    }

    const parsedDate = parseDueDateTextToDate(dueDateText);
    const dueDateIso = parsedDate ? toIsoDate(parsedDate) : null;

    const created = createCommitment({
      id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
      message_id: null,
      owner,
      task,
      due_date_text: dueDateText,
      due_date_iso: dueDateIso,
      trade,
      item_type: itemType,
      priority,
      status: "open",
      approval_status: approvalStatus,
      review_reason: approvalStatus === "pending_review" ? "manual_review" : null,
      source: "manual",
      confidence: 1,
      raw_text: task,
      attachments: [],
      notes: [],
      created_at: timestamp,
      updated_at: timestamp,
    });

    res.json({
      success: true,
      commitment: enrichCommitment(created, TRADE_ALIASES),
    });
  });

  router.post("/:id/resolve", (req, res) => {
    const id = req.params.id;
    const item = findCommitmentById(id);

    if (!item) {
      return res.status(404).json({ error: "Not found" });
    }

    const updated = updateCommitmentById(id, {
      status: "resolved",
      updated_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      commitment: enrichCommitment(updated, TRADE_ALIASES),
    });
  });

  router.post("/:id/reopen", (req, res) => {
    const id = req.params.id;
    const item = findCommitmentById(id);

    if (!item) {
      return res.status(404).json({ error: "Not found" });
    }

    const updated = updateCommitmentById(id, {
      status: "open",
      updated_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      commitment: enrichCommitment(updated, TRADE_ALIASES),
    });
  });

  router.delete("/:id", (req, res) => {
    const id = req.params.id;
    const item = findCommitmentById(id);

    if (!item) {
      return res.status(404).json({ error: "Not found" });
    }

    const allCommitments = getAllCommitments();
    const filteredCommitments = allCommitments.filter(
      (commitment) => commitment.id !== id
    );

    saveAllCommitments(filteredCommitments);

    res.json({ success: true });
  });

  router.post("/:id/update", (req, res) => {
    const id = req.params.id;
    const item = findCommitmentById(id);

    if (!item) {
      return res.status(404).json({ error: "Commitment not found" });
    }

    const owner = sanitizeTextField(req.body.owner, item.owner || "Unknown");
    const task = sanitizeTextField(req.body.task, item.task || "No task");
    const dueDateText = sanitizeTextField(req.body.due_date_text, null);
    const trade = normalizeTrade(
      sanitizeTextField(req.body.trade, null),
      TRADE_ALIASES
    );
    const itemType = sanitizeTextField(
      req.body.item_type,
      item.item_type || "task"
    );
    const priority = sanitizeTextField(
      req.body.priority,
      item.priority || "normal"
    );

    const parsedDate = parseDueDateTextToDate(dueDateText);
    const dueDateIso = parsedDate ? toIsoDate(parsedDate) : null;

    const updated = updateCommitmentById(id, {
      owner,
      task,
      due_date_text: dueDateText,
      due_date_iso: dueDateIso,
      trade,
      item_type: itemType,
      priority,
      updated_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      commitment: enrichCommitment(updated, TRADE_ALIASES),
    });
  });

  return router;
}

module.exports = {
  createCommitmentsRouter,
};
