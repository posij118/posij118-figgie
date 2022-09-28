const { assert } = require("chai");
const {
  TYPES,
  ORDERS_EMPTY,
  BASE_RATING,
  BASE_RATING_VOL,
  BASE_RATING_DEV,
  BASE_CHIPS,
} = require("../../view/src/utils/constants");
const { mockPostOrders } = require("./post-orders");
const { startFourPlayerGame, mockToggleReady } = require("./toggle-ready");
const seed = require("seed-random");
const { mockFillOrder } = require("./fill-order");
const {
  getGameIdByGameName,
  getGameIdByWsId,
  getReadyByGameId,
} = require("../../model/pre-game");
const {
  getOrdersBySuitTypeGameId,
  getStartingTimestampByGameId,
  getOrdersByGameId,
  getCardsChipsWsIdByGameId,
} = require("../../model/game");
const { sleep, zip } = require("../../utils/helper-functions");
const {
  getGameFromArchiveByGameId,
  getGoalSuitByGameId,
  getGameNameByGameId,
  getUserIdsByGameId,
} = require("../../model/end-game");
const { MockSocket, registerUser } = require("../backend-test");
const { mockLoginGuest } = require("./login-guest");
const { mockJoinGame } = require("./join-game");
const {
  getRatingsByGameId,
  getRatingDevsByGameId,
  getRatingVolsByGameId,
} = require("../../model/rating");
const { loginGuest } = require("../../controller/session");
const { mockUserLogin } = require("./login-user");

describe("endGame function", function () {
  const gameName = "game";
  it("scores and ends game", async function () {
    seed("end-game", { global: true });
    const { sockets } = await startFourPlayerGame(
      gameName,
      false,
      false,
      false
    );
    const gameId = await getGameIdByGameName(null, gameName);
    const goalSuit = await getGoalSuitByGameId(null, gameId);

    await mockPostOrders(sockets[0], { offersHearts: 8 });
    const offersHearts = await getOrdersBySuitTypeGameId(
      null,
      "hearts",
      "sell",
      gameId
    );
    await mockFillOrder(sockets[1], "offersHearts", offersHearts[0].id);
    await mockPostOrders(sockets[2], { bidsClubs: 5, bidsDiamonds: 7 });

    const socket = new MockSocket();
    await mockLoginGuest(socket, "g_wait");
    await mockJoinGame(socket, gameName);

    await sleep(Number(process.argv[6].slice(16)) + 50);

    const newGameId = await getGameIdByGameName(null, gameName);
    assert.notEqual(gameId, newGameId);
    assert.ok(newGameId);

    const gameInArchive = await getGameFromArchiveByGameId(null, gameId);
    assert.equal(gameInArchive.name, gameName);
    assert.closeTo(
      gameInArchive.started_at.getTime(),
      Date.now() - process.argv[6].slice(16) - 50,
      50
    );
    assert.equal(gameInArchive.goal_suit, goalSuit);

    const newGameName = await getGameNameByGameId(null, newGameId);
    assert.equal(newGameName, gameName);
    const newStartingTimestamp = await getStartingTimestampByGameId(
      null,
      newGameId
    );
    assert.isNull(newStartingTimestamp);

    const orders = await getOrdersByGameId(null, gameId);
    assert.deepEqual(orders, ORDERS_EMPTY);

    const userIds = await getUserIdsByGameId(null, newGameId);
    assert.equal(userIds.length, 5);

    const ready = await getReadyByGameId(null, newGameId);
    assert.deepEqual(ready, [false, false, false, false, false]);

    const response = await getCardsChipsWsIdByGameId(null, newGameId);
    const chips = response.map((row) => row.chips);
    assert.deepEqual(chips, [328, 432, 320, 320, 350]);

    const numClubs = response.map((row) => row.num_clubs);
    assert.deepEqual(numClubs, [null, null, null, null, null]);

    const endGameMessage = sockets[3].messages.slice(-2)[0];
    assert.equal(endGameMessage.type, TYPES.END_GAME);
    assert.deepEqual(endGameMessage.payload.chips, chips);
    assert.equal(endGameMessage.payload.newGameId, newGameId);
    assert.equal(endGameMessage.payload.previousGoalSuit, goalSuit);
    assert.includeMembers(endGameMessage.payload.playerNames, ["g_wait"]);
    assert.deepEqual(endGameMessage.payload.ready, ready);

    const announceNextGameMessage = socket.messages.slice(-1)[0];
    assert.equal(announceNextGameMessage.type, TYPES.ANNOUNCE_NEXT_GAME);
  });

  it("recalculates ratings for a rated game", async function () {
    const gameName = "game";
    const password = "pass";
    const userName = "wait_u";

    const socket = new MockSocket();
    await registerUser(userName, password);
    await mockUserLogin(socket, userName, password);

    const { sockets } = await startFourPlayerGame(gameName, true, false, false);
    await mockJoinGame(socket, gameName);

    const gameId = await getGameIdByGameName(null, gameName);
    const oldRatings = await getRatingsByGameId(null, gameId);
    const oldRatingDevs = await getRatingDevsByGameId(null, gameId);
    const oldRatingVols = await getRatingVolsByGameId(null, gameId);

    await sleep(Number(process.argv[6].slice(16)) + 50);

    const ratings = await getRatingsByGameId(null, gameId);
    const ratingsChanged = zip(ratings, oldRatings).map(
      ([rating, oldRating]) => oldRating !== rating
    );
    assert.isAtLeast(ratingsChanged.filter((didChange) => didChange).length, 3); // just to make sure we don't get a random equality

    const ratingDevs = await getRatingDevsByGameId(null, gameId);
    const ratingsDevsChanged = zip(ratingDevs, oldRatingDevs).map(
      ([ratingDev, oldRatingDev]) => oldRatingDev !== ratingDev
    );
    assert.isAtLeast(
      ratingsDevsChanged.filter((didChange) => didChange).length,
      3
    );

    const ratingVols = await getRatingVolsByGameId(null, gameId);
    const ratingsVolsChanged = zip(ratingVols, oldRatingVols).map(
      ([ratingVol, oldRatingVol]) => oldRatingVol !== ratingVol
    );
    assert.isAtLeast(
      ratingsVolsChanged.filter((didChange) => didChange).length,
      3
    );

    ratingVols.forEach((ratingVols) =>
      assert.isBelow(ratingVols, BASE_RATING_VOL)
    );

    const endGameMessage = sockets[3].messages.slice(-2)[0];
    assert.equal(endGameMessage.payload.ratings.length, 5);
    assert.equal(endGameMessage.payload.ratings[3], BASE_RATING);
    assert.equal(endGameMessage.payload.chips[3], BASE_CHIPS);
    assert.equal(endGameMessage.payload.playerNames[3], userName);
    assert.equal(endGameMessage.payload.ratingDeltas.length, 5);
    assert.isNull(endGameMessage.payload.ratingDeltas[3]);
    assert.closeTo(
      endGameMessage.payload.ratings[4] -
        endGameMessage.payload.ratingDeltas[4],
      BASE_RATING,
      0.01
    );

    const announceNextGameMessage = sockets[1].messages.slice(-1)[0];
    assert.deepEqual(
      announceNextGameMessage.payload.ratings,
      endGameMessage.payload.ratings
    );
  });

  it("deals correctly with a game with four players", async function () {
    seed("4-player", { global: true });
    const { sockets, userNames } = await startFourPlayerGame(
      gameName,
      false,
      false,
      false
    );

    await sleep(Number(process.argv[6].slice(16)) + 50);

    const endGameMessage = sockets[2].messages.slice(-2)[0];

    assert.deepEqual(endGameMessage.payload.chips, [310, 390, 390, 310]);
    assert.deepEqual(endGameMessage.payload.playerNames, userNames);
    assert.deepEqual(endGameMessage.payload.ready, [
      false,
      false,
      false,
      false,
    ]);
  });

  it("deals correctly with a game with five players", async function () {
    seed("5-player", { global: true });
    let { sockets, userNames } = await startFourPlayerGame(
      gameName,
      false,
      false,
      true
    );

    const socket = new MockSocket();
    const userName = "g_u5";
	userNames.push(userName);
    await mockLoginGuest(socket, userName);
    await mockJoinGame(socket, gameName);
    await mockToggleReady(sockets[3]);
    await mockToggleReady(socket);

    await sleep(Number(process.argv[6].slice(16)) + 50);

    const endGameMessage = sockets[2].messages.slice(-2)[0];

    assert.deepEqual(endGameMessage.payload.chips, [390, 320, 330, 390, 320]);
    assert.deepEqual(
      endGameMessage.payload.playerNames,
      userNames
    );
    assert.deepEqual(endGameMessage.payload.ready, [
      false,
      false,
      false,
      false,
      false,
    ]);
  });
});
