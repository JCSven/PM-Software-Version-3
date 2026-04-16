const { loadMessages, saveMessages } = require("../lib/storage");

function getAllMessages() {
  return loadMessages();
}

function saveAllMessages(messages) {
  saveMessages(messages);
}

function createMessage(message) {
  const messages = loadMessages();
  messages.push(message);
  saveMessages(messages);
  return message;
}

module.exports = {
  getAllMessages,
  saveAllMessages,
  createMessage,
};