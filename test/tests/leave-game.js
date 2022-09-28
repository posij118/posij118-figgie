const { assert } = require("chai");
const respondToMessage = require("../../app");
const { getUserIdsByGameId } = require("../../model/end-game");
const { getUserIdByWsId } = require("../../model/game");
const {
  getGameIdByWsId,
  getGameIdOrWaitingGameIdByWsId,
	getGameIdByGameName,
} = require("../../model/pre-game");
const { CLIENT, TYPES } = require("../../view/src/utils/constants");
const { mockWsServer, MockSocket } = require("../backend-test");
const { mockJoinGame } = require("./join-game");
const { mockLoginGuest } = require("./login-guest");
const { startFourPlayerGame } = require("./toggle-ready");

const mockLeaveGame = async (socket) => {
  await respondToMessage(
    socket,
    mockWsServer,
    JSON.stringify({
      type: CLIENT.MESSAGE.LEAVE_GAME,
    })
  );
};

describe("leaveGame function", function () {
  const gameName = "game";

  it("removes a player from pre-game", async function () {
    const { sockets, userNames } = await startFourPlayerGame(
      gameName,
      false,
      false,
      true
    );
    await mockLeaveGame(sockets[2]);

    const gameId = await getGameIdByWsId(null, sockets[2].id);
    const userId = await getUserIdByWsId(null, sockets[2].id);
    assert.ok(userId);
    assert.notOk(gameId);

    const announceLastMessage = sockets[0].messages.slice(-2)[0];
    assert.equal(announceLastMessage.type, TYPES.ANNOUNCE_PLAYER_LEFT);
    assert.ok(announceLastMessage.payload.gameId);
    assert.equal(announceLastMessage.payload.playerName, userNames[2]);

    const lastMessage = sockets[0].messages.slice(-1)[0];
    assert.equal(lastMessage.type, TYPES.PLAYER_LEFT);
    assert.equal(lastMessage.payload, userNames[2]);
  });

  it("removes a player from the waiting room", async function () {
    const { sockets } = await startFourPlayerGame(
      gameName,
      false,
      false,
      false
    );

    const userName = "g_wait";
    const socket = new MockSocket();
    await mockLoginGuest(socket, userName);
    await mockJoinGame(socket, gameName);

    await mockLeaveGame(socket);
    const gameId = await getGameIdOrWaitingGameIdByWsId(null, socket.id);
    assert.notOk(gameId);

    const announceLastMessage = sockets[0].messages.slice(-2)[0];
    assert.equal(announceLastMessage.type, TYPES.ANNOUNCE_PLAYER_LEFT);
    assert.ok(announceLastMessage.payload.gameId);
    assert.equal(announceLastMessage.payload.playerName, userName);

    const lastMessage = sockets[0].messages.slice(-1)[0];
    assert.equal(lastMessage.type, TYPES.PLAYER_LEFT);
    assert.equal(lastMessage.payload, userName);
  });

  it("does not allow leaving a running game", async function () {
    const { sockets } = await startFourPlayerGame(
      gameName,
      true,
      false,
      false
    );

		await mockLeaveGame(sockets[2]);
		await mockLeaveGame(sockets[3]);

		const gameId = await getGameIdByGameName(null, gameName);
		const userIds = await getUserIdsByGameId(null, gameId);
		assert.equal(userIds.length, 4);

		assert.equal(sockets[2].messages.slice(-1)[0].type, TYPES.ERROR);
		assert.equal(sockets[3].messages.slice(-1)[0].payload.message, "Users can't leave a running game.");
  });
});

module.exports.mockLeaveGame = mockLeaveGame;
