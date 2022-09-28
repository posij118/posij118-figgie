const { assert } = require("chai");
const respondToMessage = require("../../app");
const {
  CLIENT,
  TYPES,
  MALFORMED_REQUEST,
} = require("../../view/src/utils/constants");
const { mockWsServer, MockSocket } = require("../backend-test");
const { mockPostOrders } = require("./post-orders");
const { startFourPlayerGame, mockToggleReady } = require("./toggle-ready");
const seed = require("seed-random");
const { mockLoginGuest } = require("./login-guest");
const { mockCreateGame } = require("./create-game");
const { getGameIdByWsId } = require("../../model/pre-game");
const { zip } = require("../../utils/helper-functions");

const mockRejoinGame = async (socket, gameName) => {
  await respondToMessage(
    socket,
    mockWsServer,
    JSON.stringify({ type: CLIENT.MESSAGE.REJOIN_GAME, payload: { gameName } })
  );
};

describe("rejoinGame function", function () {
  const gameName = "game";
  it("sends updated game info", async function () {
    seed("rejoin-game", { global: true });
    const { sockets, userNames } = await startFourPlayerGame(
      gameName,
      false,
      false,
      false
    );

    await mockPostOrders(sockets[0], { bidsClubs: 4, offersHearts: 9 });
    await mockPostOrders(sockets[1], { bidsClubs: 6, offersSpades: 8 });
    await mockPostOrders(sockets[2], { offersClubs: 5 });

    await mockPostOrders(sockets[3], { bidsSpades: 6, offersHearts: 7 });
    await mockPostOrders(sockets[0], { bidsDiamonds: 3 });

    await mockRejoinGame(sockets[1], gameName);

    const rejoinMessage = sockets[1].messages.slice(-1)[0];
    assert.equal(rejoinMessage.type, TYPES.REJOIN_GAME);
    assert.ok(rejoinMessage.payload.gameId);
    assert.deepEqual(rejoinMessage.payload.chips, [300, 294, 306, 300]);
    assert.deepEqual(rejoinMessage.payload.numCards, [10, 11, 9, 10]);
    assert.equal(rejoinMessage.payload.gameName, gameName);
    assert.deepEqual(rejoinMessage.payload.playerNames, userNames);
    assert.isNull(rejoinMessage.payload.waitingPlayerName);
    assert.ok(rejoinMessage.payload.startingTimestamp);
    assert.deepEqual(rejoinMessage.payload.orders.bidsClubs, []);
    assert.equal(rejoinMessage.payload.orders.bidsDiamonds.length, 1);
    assert.equal(
      rejoinMessage.payload.clubs +
        rejoinMessage.payload.spades +
        rejoinMessage.payload.diamonds +
        rejoinMessage.payload.hearts,
      11
    );
  });

  it("sends pre-game info if a game is not running", async function () {
    const socket = new MockSocket();
    await mockLoginGuest(socket, "user");
    await mockCreateGame(socket, gameName, false, false);
    await mockToggleReady(socket);

    const messageLength = socket.messages.length;
    await mockRejoinGame(socket, gameName);
    assert(socket.messages.length, messageLength + 1);

    const lastMessage = socket.messages.slice(-1)[0];
    assert.equal(lastMessage.type, TYPES.PRE_GAME_CONFIG);
    assert.deepEqual(lastMessage.payload.playerNames, ["user"]);
    assert.equal(lastMessage.payload.isRated, false);
    assert.deepEqual(lastMessage.payload.ready, [true]);
  });

  it("refuses to rejoin a non-existing game or a game a player is not in", async function () {
    const rejoinerSocket = new MockSocket();
    const otherSocket = new MockSocket();

    await mockLoginGuest(rejoinerSocket, "rejoin");
    await mockLoginGuest(otherSocket, "other");

    await mockCreateGame(otherSocket, "game", false, false);
    const gameNames = ["game", "nonexistent-game", null, 42, ["game"]];
    const messages = [
      "The player is not in the game",
      "The game does not exist.",
      MALFORMED_REQUEST,
      MALFORMED_REQUEST,
      MALFORMED_REQUEST,
    ];

    for (const [gName, message] of zip(gameNames, messages)) {
      await mockRejoinGame(rejoinerSocket, gName);
			const lastMessage = rejoinerSocket.messages.slice(-1)[0];
			assert.equal(lastMessage.type, TYPES.ERROR);
			assert.equal(lastMessage.payload.message, message);

      const gameId = await getGameIdByWsId(null, rejoinerSocket.id);
      assert.isNull(gameId);
    }
  });
});

module.exports.mockRejoinGame = mockRejoinGame;
