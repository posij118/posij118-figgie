const express = require("express");
const router = express.Router();
const path = require("path");
const bcrypt = require("bcrypt");
const { checkIfUserExists } = require("../model/pre-game");
const { transactionDecorator } = require("../utils/transaction-decorator");
const { lockUsers, registerUser } = require("../model/session");

const registerMiddleware = transactionDecorator(async (client, req, res) => {
  const userName = req.body.userName;
  const password = req.body.password;

  if (
    typeof userName !== "string" ||
    typeof password !== "string" ||
    userName.length > 6 ||
    !userName.length
  ) {
    res.status(400).send("Wrong format of an username or password.");
    return;
  }

  await lockUsers(client);
  const userExists = await checkIfUserExists(client, userName);
  if (userExists) {
    res.status(400).send("User already exists.");
    return;
  }

  const hashedPassword = await bcrypt.hash(
    password,
    process.argv[8]
      ? Number(process.argv[8].slice(14)) // Speed up testing compared to production
      : 10
  );
  await registerUser(client, userName, hashedPassword);
  res.status(200).send("Registration successful");
  return;
});

router.post(
  "/register",
  async (req, res) => await registerMiddleware(req, res)
);

router.get("*", (req, res) => {
  let url = path.join(__dirname, "../view/build", "index.html");
  if (!url.startsWith("/app/"))
    // since we're on local windows
    url = url.substring(1);
  res.sendFile(url);
});

module.exports = { router, registerMiddleware };
