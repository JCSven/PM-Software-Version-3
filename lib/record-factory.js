function createId() {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function createTimestamp() {
  return new Date().toISOString();
}

function createMessageRecord(incoming) {
  return {
    id: createId(),
    text: incoming.text,
    date: createTimestamp(),
    source: "telegram",
    telegram_chat_id: incoming.chat?.id || null,
    telegram_message_id: incoming.message_id || null,
    telegram_media_group_id: incoming.media_group_id || null,
    telegram_from_id: incoming.from?.id || null,
    telegram_from_name: [incoming.from?.first_name, incoming.from?.last_name]
      .filter(Boolean)
      .join(" ") || incoming.from?.username || null,
  };
}

function createCommitmentRecord({
  savedMessage,
  parsed,
  incomingText,
  parsedDate,
  normalizedTrade,
  overrides = {},
}) {
  const timestamp = createTimestamp();
  const validTypes = [
    "commitment",
    "task",
    "follow_up",
    "reminder",
    "issue",
    "unknown",
  ];

  const safeItemType = validTypes.includes(parsed.item_type)
    ? parsed.item_type
    : "unknown";

  const safeOwner = parsed.owner || "Unassigned";
  const safeTask =
    parsed.task || (safeItemType === "unknown" ? "Unknown task" : incomingText);
  const safePriority = parsed.priority || "normal";

  return {
    id: createId(),
    message_id: savedMessage.id,
    owner: safeOwner,
    task: safeTask,
    due_date_text: parsed.due_date_text || null,
    due_date_iso: parsedDate || null,
    trade: normalizedTrade,
    item_type: safeItemType,
    priority: safePriority,
    status: "open",
    approval_status: "approved",
    review_reason: null,
    source: "telegram",
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
    raw_text: incomingText,
    attachments: [],
    notes: [],
    created_at: timestamp,
    updated_at: timestamp,
    ...overrides,
  };
}

module.exports = {
  createId,
  createTimestamp,
  createMessageRecord,
  createCommitmentRecord,
};
