const { assert } = require("chai");
const respondToMessage = require("../../app");
const { getUserIdsByGameId } = require("../../model/end-game");
const { getCardsChipsWsIdByGameId } = require("../../model/game");
const {
  getGameIdByGameName,
  getReadyByGameId,
} = require("../../model/pre-game");
const { zip } = require("../../utils/helper-functions");
const { CLIENT, TYPES, BASE_CHIPS } = require("../../view/src/utils/constants");
const { mockWsServer, MockSocket } = require("../backend-test");
const { mockLoginGuest } = require("./login-guest");
const { mockUserLogin } = require("./login-user");

const mockCreateGame = async (socket, gameName, isRated, isPrivate) => {
  await respondToMessage(
    socket,
    mockWsServer,
    JSON.stringify({
      type: CLIENT.MESSAGE.CREATE_GAME,
      payload: { gameName, isRated, isPrivate },
    })
  );
};

describe("createGame function", function () {
  it("creates a game", async function () {
    const userName = "guest";
    const gameName = "game";
    const socket = new MockSocket();

    await mockLoginGuest(socket, userName);
    await mockCreateGame(socket, gameName, false, false);

    const gameId = await getGameIdByGameName(null, gameName);
    assert.ok(gameId);

    const ready = await getReadyByGameId(null, gameId);
    assert.deepEqual(ready, [false]);

    const response = await getCardsChipsWsIdByGameId(null, gameId);
    const chips = await response.map((row) => row.chips);
    assert.deepEqual(chips, [BASE_CHIPS]);

    const numClubs = await response.map((row) => row.num_clubs);
    assert.deepEqual(numClubs, [null]);

    const userIds = await getUserIdsByGameId(null, gameId);
    assert.ok(userIds[0]);

    assert.equal(socket.messages[1].type, TYPES.PRE_GAME_CONFIG);
    assert.equal(socket.messages[2].type, TYPES.ANNOUNCE_NEW_GAME);
  });

  it("refuses to create a game whose name already exists", async function () {
    const userName = "u1";
    const password = "pass";
    const gameName = "game";
    const socket = new MockSocket();

    await mockUserLogin(socket, userName, password);

    for (let i = 0; i < 2; i++) {
      await mockCreateGame(socket, gameName, false, false);
    }

    assert.equal(socket.messages[3].type, TYPES.ERROR);
    assert.equal(
      socket.messages[3].payload.message,
      "The game already exists."
    );
  });

  it("refuses to create a game when the creator is already in game", async function () {
    const gameName = "game";
    const userName = "guest";
    const socket = new MockSocket();
    await mockLoginGuest(socket, userName);

    for (let i = 0; i < 2; i++) {
      await mockCreateGame(socket, gameName + String(i), false, false);
    }
  });

  it("refuses to create a game with invalid or wrongly-typed config", async function () {
    const userName = "guest";
    const socket = new MockSocket();
    await mockLoginGuest(socket, userName);

    const gameNames = [42, "game", "", "game", "game"];
    const isRateds = [false, {}, false, true, true];
    const isPrivates = [false, false, false, true, false];
    const errorMessages = [
      "Malformed request",
      "Malformed request",
      "Game name too long or empty",
      "A game cannot be both private and rated.",
      "Guests cannot join rated games.",
    ];

    for (const [[gameName, isRated], [isPrivate, errorMessage]] of zip(
      zip(gameNames, isRateds),
      zip(isPrivates, errorMessages)
    )) {
      await mockCreateGame(socket, gameName, isRated, isPrivate);

      assert.equal(socket.messages.slice(-1)[0].payload.message, errorMessage);
      const gameId = await getGameIdByGameName(null, gameName);
      assert.notOk(gameId);
    }
  });
});

module.exports.mockCreateGame = mockCreateGame;
