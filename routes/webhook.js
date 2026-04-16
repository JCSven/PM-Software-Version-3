const {
  createMessageRecord,
  createCommitmentRecord,
} = require("../lib/record-factory");
const express = require("express");
const fs = require("fs");
const path = require("path");
const https = require("https");
const { UPLOADS_DIR, ensureStorageReady } = require("../lib/storage");

function getJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        let data = "";

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

function downloadFile(url, destinationPath) {
  return new Promise((resolve, reject) => {
    ensureStorageReady();
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });

    const file = fs.createWriteStream(destinationPath);

    https
      .get(url, (response) => {
        response.pipe(file);

        file.on("finish", () => {
          file.close(() => resolve(destinationPath));
        });
      })
      .on("error", (error) => {
        fs.unlink(destinationPath, () => reject(error));
      });
  });
}

async function downloadTelegramFileToUploads(
  fileId,
  fallbackExtension,
  attachmentType,
  originalFileName
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.log("Missing TELEGRAM_BOT_TOKEN. Skipping Telegram file download.");
    return null;
  }

  const fileInfoUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`;
  const fileInfo = await getJson(fileInfoUrl);

  if (!fileInfo.ok || !fileInfo.result || !fileInfo.result.file_path) {
    console.log("Could not get Telegram file path.");
    return null;
  }

  ensureStorageReady();
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const telegramFilePath = fileInfo.result.file_path;
  const extension =
    path.extname(originalFileName || telegramFilePath) || fallbackExtension;
  const fileName = `telegram-${Date.now()}${extension}`;
  const destinationPath = path.join(UPLOADS_DIR, fileName);

  const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${telegramFilePath}`;
  await downloadFile(downloadUrl, destinationPath);

  return {
    type: attachmentType,
    file_name: fileName,
    url: `/uploads/${fileName}`,
  };
}

async function downloadTelegramPhotoToUploads(fileId) {
  return downloadTelegramFileToUploads(fileId, ".jpg", "image");
}

async function downloadTelegramDocumentToUploads(fileId, originalFileName) {
  return downloadTelegramFileToUploads(fileId, ".dat", "file", originalFileName);
}

function cleanString(value) {
  return String(value || "").trim();
}

function matchesTelegramId(actualValue, expectedValue) {
  const actual = cleanString(actualValue);
  const expected = cleanString(expectedValue);

  return !!actual && !!expected && actual === expected;
}

function matchesTelegramName(actualValue, expectedValues = []) {
  const actual = cleanString(actualValue).toLowerCase();
  if (!actual) {
    return false;
  }

  return expectedValues.some(
    (value) => cleanString(value).toLowerCase() === actual
  );
}

function getTelegramRouting(incoming) {
  const chatId = cleanString(incoming.chat?.id);
  const fromId = cleanString(incoming.from?.id);
  const chatType = cleanString(incoming.chat?.type);
  const isPrivateChat = chatType === "private";
  const isGroupChat = chatType === "group" || chatType === "supergroup";

  const fromFirstName = cleanString(incoming.from?.first_name);
  const fromLastName = cleanString(incoming.from?.last_name);
  const fromUsername = cleanString(incoming.from?.username);
  const fromFullName = cleanString(`${fromFirstName} ${fromLastName}`.trim());

  const kevinChatId = cleanString(process.env.KEVIN_G_TELEGRAM_CHAT_ID);
  const justinVChatId = cleanString(process.env.JUSTIN_V_TELEGRAM_CHAT_ID);
  const kevinUserId = cleanString(process.env.KEVIN_G_TELEGRAM_USER_ID);
  const justinVUserId = cleanString(process.env.JUSTIN_V_TELEGRAM_USER_ID);

  const looksLikeKevin =
    matchesTelegramId(fromId, kevinUserId) ||
    matchesTelegramName(fromUsername, ["kevin", "keving"]) ||
    matchesTelegramName(fromFirstName, ["kevin"]) ||
    matchesTelegramName(fromFullName, ["kevin g", "kevin"]);

  const looksLikeJustinV =
    matchesTelegramId(fromId, justinVUserId) ||
    matchesTelegramName(fromUsername, ["justinv", "jv"]) ||
    matchesTelegramName(fromFullName, [
      "justin v",
      "justin vanmeer",
      "justin van meer",
    ]) ||
    (matchesTelegramName(fromFirstName, ["justin"]) &&
      matchesTelegramName(fromLastName, ["v", "vanmeer", "van meer"]));

  const isKevinPrivateChat =
    isPrivateChat &&
    (matchesTelegramId(chatId, kevinChatId) ||
      matchesTelegramId(fromId, kevinUserId) ||
      looksLikeKevin);

  const isJustinVPrivateChat =
    isPrivateChat &&
    (matchesTelegramId(chatId, justinVChatId) ||
      matchesTelegramId(fromId, justinVUserId) ||
      looksLikeJustinV);

  if (isKevinPrivateChat) {
    return {
      forcedOwner: "Kevin G",
      approvalStatus: "approved",
      routingReason: "Kevin G private chat",
    };
  }

  if (isJustinVPrivateChat) {
    return {
      forcedOwner: "Justin V",
      approvalStatus: "approved",
      routingReason: "Justin V private chat",
    };
  }

  if (isGroupChat && looksLikeKevin) {
    return {
      forcedOwner: "Kevin G",
      approvalStatus: "pending_review",
      routingReason: "Kevin G group chat message",
    };
  }

  if (isGroupChat && looksLikeJustinV) {
    return {
      forcedOwner: "Justin V",
      approvalStatus: "pending_review",
      routingReason: "Justin V group chat message",
    };
  }

  return {
    forcedOwner: null,
    approvalStatus: "approved",
    routingReason: "default routing",
  };
}

function createWebhookRouter({
  createMessage,
  getAllMessages,
  createCommitment,
  getAllCommitments,
  saveAllCommitments,
  extractCommitmentWithOpenAI,
  parseDueDateTextToDate,
  toIsoDate,
  normalizeTrade,
  TRADE_ALIASES,
}) {
  const router = express.Router();

  router.post("/", async (req, res) => {
    try {
      console.log("Full update:", JSON.stringify(req.body, null, 2));

      const incoming = req.body.message || req.body.channel_post;
      if (!incoming) {
        return res.sendStatus(200);
      }

      const text = incoming.text || incoming.caption || "";
      const hasPhoto = Array.isArray(incoming.photo) && incoming.photo.length > 0;
      const hasDocument = !!incoming.document;
      const hasCaptionText = !!text.trim();

      if (!incoming.text && !hasPhoto && !hasDocument) {
        return res.sendStatus(200);
      }

      const routing = getTelegramRouting(incoming);
      console.log("Telegram routing:", routing);

      const existingMessages = getAllMessages();
      let existingCommitmentForGroup = null;

      if (incoming.media_group_id) {
        const matchingMessage = existingMessages.find(
          (m) => m.telegram_media_group_id === incoming.media_group_id
        );

        if (matchingMessage) {
          const allCommitments = getAllCommitments();
          existingCommitmentForGroup = allCommitments.find(
            (c) => c.message_id === matchingMessage.id
          );
        }
      }

      if ((hasPhoto || hasDocument) && !hasCaptionText && !existingCommitmentForGroup) {
        console.log(
          "Telegram attachment received without caption and no matching media group task. Skipping task creation."
        );
        return res.sendStatus(200);
      }

      console.log("New message:", text);

      const alreadyExists = existingMessages.some((message) => {
        return (
          message.telegram_chat_id === (incoming.chat?.id || null) &&
          message.telegram_message_id === (incoming.message_id || null)
        );
      });

      if (alreadyExists) {
        console.log("Duplicate Telegram message detected. Skipping save.");
        return res.sendStatus(200);
      }

      const savedMessage = createMessageRecord({
        ...incoming,
        text,
      });
      createMessage(savedMessage);

      let commitment = null;

      try {
        if (!existingCommitmentForGroup) {
          const parsed = await extractCommitmentWithOpenAI(text);
          console.log("AI result:", parsed);

          let finalParsed = parsed;

          if (!parsed.is_commitment) {
            console.log("AI marked as non-commitment. Saving as UNKNOWN instead.");

            finalParsed = {
              ...parsed,
              is_commitment: true,
              item_type: "unknown",
              task: parsed.task || "Unknown task",
              owner: parsed.owner || "Unassigned",
            };
          }

          if (routing.forcedOwner) {
            finalParsed.owner = routing.forcedOwner;
          }

          const parsedDate = parseDueDateTextToDate(finalParsed.due_date_text || "");

          commitment = createCommitmentRecord({
            savedMessage,
            parsed: finalParsed,
            incomingText: text,
            parsedDate: parsedDate ? toIsoDate(parsedDate) : null,
            normalizedTrade: normalizeTrade(finalParsed.trade || null, TRADE_ALIASES),
          });

          if (routing.forcedOwner) {
            commitment.owner = routing.forcedOwner;
          }

          commitment.approval_status = routing.approvalStatus;
          commitment.review_reason =
            routing.approvalStatus === "pending_review"
              ? "telegram_group_review"
              : null;
          commitment.telegram_chat_type = incoming.chat?.type || null;
          commitment.telegram_chat_id = incoming.chat?.id || null;
          commitment.telegram_from_id = incoming.from?.id || null;
          commitment.telegram_routing_reason = routing.routingReason;

          createCommitment(commitment);
        } else {
          commitment = existingCommitmentForGroup;
        }

        const newAttachments = [];

        if (hasPhoto) {
          try {
            const photo = incoming.photo[incoming.photo.length - 1];
            const downloadedPhoto = await downloadTelegramPhotoToUploads(
              photo.file_id
            );

            if (downloadedPhoto) {
              newAttachments.push(downloadedPhoto);
            }
          } catch (photoError) {
            console.error(
              "Telegram photo download failed:",
              photoError.message
            );
          }
        }

        if (hasDocument) {
          try {
            const doc = incoming.document;
            const downloadedDocument = await downloadTelegramDocumentToUploads(
              doc.file_id,
              doc.file_name
            );

            if (downloadedDocument) {
              newAttachments.push(downloadedDocument);
            }
          } catch (docError) {
            console.error(
              "Telegram document download failed:",
              docError.message
            );
          }
        }

        if (commitment && newAttachments.length > 0) {
          commitment.attachments = [
            ...(commitment.attachments || []),
            ...newAttachments,
          ];

          const all = getAllCommitments();
          const index = all.findIndex((c) => c.id === commitment.id);

          if (index !== -1) {
            all[index] = commitment;
            saveAllCommitments(all);
          }
        }

        console.log("Saved commitment:", commitment);
      } catch (aiError) {
        console.error("OpenAI extraction failed:", aiError.message);
      }

      return res.sendStatus(200);
    } catch (error) {
      console.error("Webhook error:", error.message);
      return res.sendStatus(500);
    }
  });

  return router;
}

module.exports = {
  createWebhookRouter,
};
