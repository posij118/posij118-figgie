const { assert } = require("chai");
const respondToMessage = require("../../app");
const { getGoalSuitFromCommonSuit } = require("../../controller/start-game");
const { getGoalSuitByGameId } = require("../../model/end-game");
const { getStartingTimestampByGameId } = require("../../model/game");
const {
  getReadyByGameId,
  getGameIdByGameName,
} = require("../../model/pre-game");
const { zip } = require("../../utils/helper-functions");
const { CLIENT, TYPES } = require("../../view/src/utils/constants");
const { mockWsServer, MockSocket, registerUser } = require("../backend-test");
const { mockCreateGame } = require("./create-game");
const { mockJoinGame } = require("./join-game");
const { mockLoginGuest } = require("./login-guest");
const { mockUserLogin } = require("./login-user");

const mockToggleReady = async (socket) => {
  await respondToMessage(
    socket,
    mockWsServer,
    JSON.stringify({
      type: CLIENT.MESSAGE.TOGGLE_READY,
    })
  );
};

const startFourPlayerGame = async (
  gameName,
  isRated,
  isPrivate,
  keepInPreGame
) => {
  const userNames = ["u1", "u2", "u3"];
  const passwords = ["pass", "pass", "pass"];
  const sockets = [new MockSocket(), new MockSocket(), new MockSocket()];

  for (const [[userName, password], socket] of zip(
    zip(userNames, passwords),
    sockets
  )) {
    await mockUserLogin(socket, userName, password);
  }

  const socket = new MockSocket();

  if (!isRated) {
    await mockLoginGuest(socket, "g_u4");
    passwords.push(null);
  } else {
    await registerUser("g_u4", "pass");
    await mockUserLogin(socket, "g_u4", "pass");
    passwords.push("pass");
  }

  userNames.push("g_u4");
  sockets.push(socket);

  for (const [userName, socket] of zip(userNames, sockets)) {
    if (userName === "u1")
      await mockCreateGame(socket, gameName, isRated, isPrivate);
    else await mockJoinGame(socket, gameName);

    if (!keepInPreGame || userName !== "g_u4") await mockToggleReady(socket);
  }

  return { userNames, passwords, sockets };
};

describe("toggleReady function", async function () {
  let sockets;
  const gameName = "game";

  beforeEach(async function () {
    ({ sockets } = await startFourPlayerGame(gameName, false, false, false));
  });

  it("toggles ready", async function () {
    assert.deepEqual(sockets[0].messages[1].payload.ready, [false]);
    assert.equal(sockets[0].messages[3].type, TYPES.PRE_GAME_CONFIG);
    assert.deepEqual(sockets[0].messages[3].payload.ready, [true]);

    const gameId = await getGameIdByGameName(null, gameName);
    const ready = await getReadyByGameId(null, gameId);

    assert.deepEqual(ready, [true, true, true, true]);
  });

  it("starts a game as soon as all >=4 players are ready", async function () {
    await mockToggleReady(sockets[3]);

    assert.equal(sockets[3].messages.slice(-3)[0].type, TYPES.GAME_CONFIG);
    const payloads = sockets.map(
      (socket) => socket.messages.slice(-3)[0].payload
    );

    payloads.forEach((payload, index) => {
      assert.ok(payload.gameId);
      assert.equal(
        payload.clubs + payload.spades + payload.diamonds + payload.hearts,
        10
      );
      assert.deepEqual(payload.numCards, [10, 10, 10, 10]);
      assert.deepEqual(payload.chips, [300, 300, 300, 300]);

      assert.equal(
        sockets[index].messages.slice(-2)[0].type,
        TYPES.ANNOUNCE_HAS_STARTED
      );
      assert.ok(sockets[index].messages.slice(-2)[0].payload.gameId);
    });

    const gameId = payloads[0].gameId;
    const startingTimestamp = await getStartingTimestampByGameId(null, gameId);
    assert.closeTo(startingTimestamp, Date.now(), 100);

    const goalSuit = await getGoalSuitByGameId(null, gameId);
    const commonSuit = getGoalSuitFromCommonSuit(goalSuit); // indevution

    const totalCountCommonSuit = payloads
      .map((payload) => payload[commonSuit])
      .reduce((a, b) => a + b);
    assert.equal(totalCountCommonSuit, 12);
  });
});

module.exports.startFourPlayerGame = startFourPlayerGame;
module.exports.mockToggleReady = mockToggleReady;
