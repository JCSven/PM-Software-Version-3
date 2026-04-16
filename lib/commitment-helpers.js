const { getTodayMidnight, parseDueDateTextToDate, toIsoDate } = require("./date-parser");

function toTitleCase(text) {
  return text
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeTrade(trade, tradeAliases = {}) {
  if (!trade || typeof trade !== "string") {
    return null;
  }

  const cleaned = trade
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");

  if (tradeAliases[cleaned]) {
    return tradeAliases[cleaned];
  }

  const compactCleaned = cleaned.replace(/\s+/g, "");
  if (tradeAliases[compactCleaned]) {
    return tradeAliases[compactCleaned];
  }

  return toTitleCase(trade.trim());
}

function sanitizeTextField(value, fallback = null) {
  if (value === undefined || value === null) {
    return fallback;
  }

  const cleaned = String(value).trim();
  return cleaned === "" ? fallback : cleaned;
}

function isCommitmentOverdue(commitment) {
  if (!commitment || commitment.status === "resolved") {
    return false;
  }

  let dueDate = null;

  if (commitment.due_date_iso) {
    dueDate = parseDueDateTextToDate(commitment.due_date_iso);
  }

  if (!dueDate) {
    dueDate = parseDueDateTextToDate(commitment.due_date_text);
  }

  if (!dueDate) {
    return false;
  }

  const today = getTodayMidnight();
  return dueDate < today;
}

function enrichCommitment(commitment, tradeAliases = {}) {
  const parsedDate =
    parseDueDateTextToDate(commitment.due_date_iso) ||
    parseDueDateTextToDate(commitment.due_date_text);

  const dueDateIso = parsedDate ? toIsoDate(parsedDate) : null;

  const enriched = {
    ...commitment,
    due_date_iso: dueDateIso,
    trade: normalizeTrade(commitment.trade, tradeAliases),
  };

  return {
    ...enriched,
    is_overdue: isCommitmentOverdue(enriched),
  };
}

module.exports = {
  normalizeTrade,
  sanitizeTextField,
  isCommitmentOverdue,
  enrichCommitment,
};