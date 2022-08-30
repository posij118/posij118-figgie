const express = require('express');
const router = express.Router();
const path = require('path');

router.get("*", (req, res) => {
  let url = path.join(__dirname, "../view/build", "index.html");
  if (!url.startsWith("/app/"))
    // since we're on local windows
    url = url.substring(1);
  res.sendFile(url);
});

module.exports = router;