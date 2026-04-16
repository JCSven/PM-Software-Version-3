const express = require("express");

function createMessagesRouter({ getAllMessages }) {
  const router = express.Router();

  router.get("/", (req, res) => {
    const messages = getAllMessages();
    res.json(messages);
  });

  return router;
}

module.exports = {
  createMessagesRouter,
};
