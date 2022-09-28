const { assert } = require("chai");
const respondToMessage = require("../../app");
const {
  CLIENT,
  TYPES,
  MALFORMED_REQUEST,
} = require("../../view/src/utils/constants");
const { mockWsServer } = require("../backend-test");
const seed = require("seed-random");
const { zip } = require("../../utils/helper-functions");
const { mockPostOrders } = require("./post-orders");
const { getGameIdByGameName } = require("../../model/pre-game");
const { getOrdersByGameId } = require("../../model/game");
const { startFourPlayerGame } = require("./toggle-ready");

const mockCancelSuitTypeOrders = async (socket, suitTypeIdentifier) => {
  await respondToMessage(
    socket,
    mockWsServer,
    JSON.stringify({
      type: CLIENT.MESSAGE.CANCEL_SUIT_TYPE_ORDERS,
      payload: suitTypeIdentifier,
    })
  );
};

describe("cancelSuitTypeOrders function", function () {
  const gameName = "game";

  it("cancels orders of a given suit, type and user", async function () {
    seed("cancel-suit-type", { global: true });
    const suitTypeIdentifier = "bidsClubs";

    const { sockets } = await startFourPlayerGame(gameName, false, true, false);

    const socketsArray = [
      sockets[0],
      sockets[0],
      sockets[1],
      sockets[2],
      sockets[3],
    ];
    const orderObjects = [
      { bidsClubs: 5, offersClubs: 9, bidsDiamonds: 4 },
      { bidsClubs: 6 },
      { bidsClubs: 2 },
      { offersHearts: 7 },
      { bidsClubs: 3 },
    ];

    for (const [socket, orderObject] of zip(socketsArray, orderObjects)) {
      await mockPostOrders(socket, orderObject);
    }

    await mockCancelSuitTypeOrders(sockets[0], suitTypeIdentifier);

    const gameId = await getGameIdByGameName(null, gameName);
    const orders = await getOrdersByGameId(null, gameId);

    assert.deepEqual(
      orders[suitTypeIdentifier].map((order) => order.price),
      [2, 3]
    );
    assert.deepEqual(
      orders["offersClubs"].map((order) => order.price),
      [9]
    );
    assert.deepEqual(
      orders["bidsDiamonds"].map((order) => order.price),
      [4]
    );
    assert.deepEqual(
      orders["offersHearts"].map((order) => order.price),
      [7]
    );

    const lastMessage = sockets[3].messages.slice(-1)[0];
    assert.equal(lastMessage.type, TYPES.CANCELED_ORDERS_IDS);
    assert.equal(lastMessage.payload.length, 2);
    assert.equal(lastMessage.payload[0] + 3, lastMessage.payload[1]);
  });

  it("rejects invalid suitTypeIdentifiers", async function () {
    const { sockets } = await startFourPlayerGame(gameName, false, true, false);

    await mockPostOrders(sockets[0], { bidsClubs: 5 });
    const suitTypeIdentifiers = ["bidsSth", "", null, 42];

    for (const suitTypeIdentifier of suitTypeIdentifiers) {
      await mockCancelSuitTypeOrders(sockets[0], suitTypeIdentifier);
      const lastMessage = sockets[0].messages.slice(-1)[0];
      assert.equal(lastMessage.type, TYPES.ERROR);
      assert.equal(lastMessage.payload.message, MALFORMED_REQUEST);
    }
  });
});

module.exports.mockCancelSuitTypeOrders = mockCancelSuitTypeOrders;
