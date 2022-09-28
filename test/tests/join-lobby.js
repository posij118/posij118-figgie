const { assert } = require("chai");
const respondToMessage = require("../../app");
const { CLIENT, TYPES } = require("../../view/src/utils/constants");
const { mockWsServer, MockSocket } = require("../backend-test");
const { startFourPlayerGame } = require("./toggle-ready");

const mockJoinLobby = async (socket) => {
  await respondToMessage(
    socket,
    mockWsServer,
    JSON.stringify({
      type: CLIENT.MESSAGE.JOIN_LOBBY,
    })
  );
};

describe("joinLobby function", function () {
  it("returns all public games", async function () {
    const gameNamePublic = "game_public";
    await startFourPlayerGame(gameNamePublic, false, false, false); // public
    const socket = new MockSocket();
    await mockJoinLobby(socket);

    assert.equal(socket.messages.length, 1);
    assert.equal(socket.messages[0].type, TYPES.ANNOUNCE_GAMES);
    assert.equal(socket.messages[0].payload.games[0].name, gameNamePublic);
  });

  it("does not give away info about private games", async function () {
    const gameNamePrivate = "game_private";
    await startFourPlayerGame(gameNamePrivate, false, true, false); // private

    const socket = new MockSocket();
    await mockJoinLobby(socket);

    assert.equal(socket.messages.length, 1);
    assert.deepEqual(socket.messages[0].payload.games, []);
  });
});

module.exports.mockJoinLobby = mockJoinLobby;
