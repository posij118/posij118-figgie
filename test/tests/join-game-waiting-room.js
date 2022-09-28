const { assert } = require("chai");
const { TYPES } = require("../../view/src/utils/constants");
const { MockSocket } = require("../backend-test");
const { mockJoinGame } = require("./join-game");
const { mockLoginGuest } = require("./login-guest");
const { startFourPlayerGame } = require("./toggle-ready");

describe("joinGame funcion", function () {
  it("places a player in the waiting room if a game is running", async function () {
    const userName = "guest";
    const gameName = "game";

    const { userNames } = await startFourPlayerGame(
      gameName,
      false,
      false,
      false
    );

    const socket = new MockSocket();
    await mockLoginGuest(socket, userName);
    await mockJoinGame(socket, gameName);

    assert.equal(socket.messages[1].type, TYPES.JOIN_EXISTING_GAME);
    assert.equal(socket.messages[1].payload.gameName, gameName);
    assert.deepEqual(socket.messages[1].payload.playerNames, userNames);
    assert.equal(socket.messages[1].payload.waitingPlayerName, userName);
    assert.equal(socket.messages[2].type, TYPES.ANNOUNCE_WAITING_PLAYER);
    assert.ok(socket.messages[2].payload.gameId);
  });
});
