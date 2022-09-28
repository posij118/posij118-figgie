const { assert } = require("chai");
const { getUserIdByUserName } = require("../../model/end-game");
const {
  getRatingByUserId,
  getRatingDevByUserId,
  getRatingVolByUserId,
} = require("../../model/rating");
const {
  getHashedPasswordByUserName,
  getRegisteredAtByUserId,
} = require("../../model/session");
const { zip } = require("../../utils/helper-functions");
const {
  BASE_RATING,
  BASE_RATING_DEV,
  BASE_RATING_VOL,
} = require("../../view/src/utils/constants");
const { registerUser } = require("../backend-test");

describe("Register middleware", function () {
  it("successfully registers an user", async function () {
    const userName = "user";
    const password = "password";

    const response = await registerUser(userName, password);
    assert.equal(response.statusCode, 200);
    assert.equal(response.message, "Registration successful");

    const hashedPassword = await getHashedPasswordByUserName(null, userName);
    assert.ok(hashedPassword);
    assert.isAtLeast(hashedPassword.length, 60);

    const userId = await getUserIdByUserName(null, userName);
    const rating = await getRatingByUserId(null, userId);
    assert.equal(rating, BASE_RATING);
    const ratingDev = await getRatingDevByUserId(null, userId);
    assert.equal(ratingDev, BASE_RATING_DEV);
    const ratingVol = await getRatingVolByUserId(null, userId);
    assert.equal(ratingVol, BASE_RATING_VOL);

    const registeredAt = await getRegisteredAtByUserId(null, userId);
    assert.closeTo(registeredAt.getTime(), Date.now(), 20);
  });

  it("refuses to register the same user twice", async function () {
    const userName = "user";
    const password = "password";

    await registerUser(userName, password);
    const secondResponse = await registerUser(userName, password);

    assert.equal(secondResponse.statusCode, 400);
    assert.equal(secondResponse.message, "User already exists.");
  });

  it("typechecks correctly", async function () {
    const userNames = [null, "", "too-long", "user"];
    const passwords = ["sth", "sth", "sth", ["password"]];

    for (const [userName, password] of zip(userNames, passwords)) {
      const response = await registerUser(userName, password);
      assert.equal(response.statusCode, 400);
      assert.equal(
        response.message,
        "Wrong format of an username or password."
      );
    }
  });
});

module.exports.registerUser = registerUser;
