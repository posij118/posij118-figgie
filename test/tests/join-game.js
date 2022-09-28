const { assert } = require("chai");
const respondToMessage = require("../../app");
const { getGameIdByWsId, getReadyByGameId } = require("../../model/pre-game");
const { zip } = require("../../utils/helper-functions");
const { CLIENT, TYPES } = require("../../view/src/utils/constants");
const { mockWsServer, MockSocket } = require("../backend-test");
const { mockCreateGame } = require("./create-game");
const { mockLoginGuest } = require("./login-guest");
const { mockUserLogin } = require("./login-user");

const mockJoinGame = async (socket, gameName) => {
  await respondToMessage(
    socket,
    mockWsServer,
    JSON.stringify({
      type: CLIENT.MESSAGE.JOIN_GAME,
      payload: { gameName },
    })
  );
};

describe("joinGame function", function () {
  it("allows users to join an existing game", async function () {
    const userNames = ["u1", "u2"];
    const passwords = ["pass", "pass"];
    const gameName = "game";
    const sockets = [new MockSocket(), new MockSocket()];

    for (const [[userName, password], socket] of zip(
      zip(userNames, passwords),
      sockets
    )) {
      await mockUserLogin(socket, userName, password);
    }

    await mockCreateGame(sockets[0], gameName, true, false);
    await mockJoinGame(sockets[1], gameName);

    assert.equal(sockets[1].messages[2].type, TYPES.PRE_GAME_CONFIG);
    assert.equal(sockets[0].messages[3].type, TYPES.PRE_GAME_CONFIG);

    assert.equal(sockets[1].messages[3].type, TYPES.ANNOUNCE_PLAYER_JOINED);
    assert.equal(sockets[1].messages[3].payload.playerName, "u2");
    assert.deepEqual(sockets[1].messages[2].payload.playerNames, ["u1", "u2"]);

    const gameId = await getGameIdByWsId(null, sockets[1].id);
    assert.ok(gameId);

    const ready = await getReadyByGameId(null, gameId);
    assert.deepEqual(ready, [false, false]);
  });

  it("rejects joining a non-existent game or a game user is already in", async function () {
    const userName = "guest";
    const gameName = "game";
    const socket = new MockSocket();

    await mockLoginGuest(socket, userName);
    await mockJoinGame(socket, gameName);

    assert.equal(socket.messages[1].type, TYPES.ERROR);
    assert.equal(socket.messages[1].payload.message, "The game does not exist");
    const gameId = await getGameIdByWsId(null, socket.id);
    assert.notOk(gameId);

    await mockCreateGame(socket, gameName, false, false);
    await mockJoinGame(socket, gameName);

    assert.equal(socket.messages.length, 5);
    assert.equal(socket.messages[4].type, TYPES.ERROR);
    assert.equal(
      socket.messages[4].payload.message,
      "User is already in game."
    );
  });
});

module.exports.mockJoinGame = mockJoinGame;
