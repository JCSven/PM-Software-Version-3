const express = require("express");

function createDashboardRouter() {
  const router = express.Router();

  router.get("/", (req, res) => {
    const query = new URLSearchParams(req.query || {}).toString();
    const suffix = query ? `?${query}` : "";
    res.redirect(`/dashboard${suffix}`);
  });

  return router;
}

module.exports = {
  createDashboardRouter,
};
