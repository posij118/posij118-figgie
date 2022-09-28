const { assert } = require("chai");
const respondToMessage = require("../../app");
const {
  getOrdersByGameId,
  getCardsChipsWsIdByGameId,
} = require("../../model/game");
const { getGameIdByGameName } = require("../../model/pre-game");
const {
  CLIENT,
  TYPES,
  ORDERS_EMPTY,
  MALFORMED_REQUEST,
} = require("../../view/src/utils/constants");
const { mockWsServer } = require("../backend-test");
const { mockPostOrders } = require("./post-orders");
const { startFourPlayerGame } = require("./toggle-ready");
const seed = require("seed-random");
const { zip } = require("../../utils/helper-functions");

const mockFillOrder = async (socket, suitTypeIdentifier, orderId) => {
  await respondToMessage(
    socket,
    mockWsServer,
    JSON.stringify({
      type: CLIENT.MESSAGE.FILL_ORDER,
      payload: {
        suitTypeIdentifier,
        orderId,
      },
    })
  );
};

describe("fillOrder function", function () {
  const gameName = "game";

  it("fills an order and deletes all other orders afterwards", async function () {
    seed("fill-one-order", { global: true });
    const price = 6;
    const { sockets } = await startFourPlayerGame(
      gameName,
      false,
      false,
      false
    );
    await mockPostOrders(sockets[0], { bidsClubs: price });
    await mockPostOrders(sockets[2], {
      bidsSpades: 4,
      offersSpades: 9,
      offersHearts: 7,
    });

    const gameId = await getGameIdByGameName(null, gameName);
    let orders = await getOrdersByGameId(null, gameId);
    const orderId = orders.bidsClubs[0].id;

    const clubs = await getCardsChipsWsIdByGameId(null, gameId).then((rows) =>
      rows.map((row) => row.num_clubs)
    );
    const spades = await getCardsChipsWsIdByGameId(null, gameId).then((rows) =>
      rows.map((row) => row.num_spades)
    );

    assert.ok(orderId);
    await mockFillOrder(sockets[1], "bidsClubs", orderId);

    const newClubs = await getCardsChipsWsIdByGameId(null, gameId).then(
      (rows) => rows.map((row) => row.num_clubs)
    );
    const newSpades = await getCardsChipsWsIdByGameId(null, gameId).then(
      (rows) => rows.map((row) => row.num_spades)
    );

    assert.equal(newClubs[0], clubs[0] + 1);
    assert.equal(newClubs[1], clubs[1] - 1);
    assert.equal(newClubs[2], clubs[2]);
    assert.equal(newClubs[3], clubs[3]);
    assert.deepEqual(newSpades, spades);

    assert.deepEqual(
      sockets[2].messages.slice(-1)[0].payload.numCards,
      [11, 9, 10, 10]
    );
    assert.deepEqual(sockets[2].messages.slice(-1)[0].payload.chips, [
      300 - price,
      300 + price,
      300,
      300,
    ]);

    orders = await getOrdersByGameId(null, gameId);
    assert.deepEqual(orders, ORDERS_EMPTY);
  });

  it("fills a better order if one by another player is available", async function () {
    seed("fill-better-order", { global: true });
    const { sockets } = await startFourPlayerGame(
      gameName,
      false,
      false,
      false
    );

    await mockPostOrders(sockets[0], { bidsClubs: 5, bidsDiamonds: 7 });
    await mockPostOrders(sockets[1], { bidsClubs: 6 });
    await mockPostOrders(sockets[2], { bidsClubs: 9 });

    const gameId = await getGameIdByGameName(null, gameName);
    const orders = await getOrdersByGameId(null, gameId);
    const suitTypeIdentifier = "bidsClubs";

    const worseOrderId = orders[suitTypeIdentifier][0].id;
    assert.equal(orders[suitTypeIdentifier][0].price, 5);

    await mockFillOrder(sockets[2], suitTypeIdentifier, worseOrderId);

    assert.equal(sockets[3].messages.slice(-1)[0].type, TYPES.ORDER_FILLED);
    assert.deepEqual(
      sockets[3].messages.slice(-1)[0].payload.numCards,
      [10, 11, 9, 10]
    );
    assert.deepEqual(
      sockets[3].messages.slice(-1)[0].payload.chips,
      [300, 294, 306, 300]
    );
  });

  it("rejects malformed requests or an order with the corresponding id is not found", async function () {
    const { sockets } = await startFourPlayerGame(
      gameName,
      false,
      false,
      false
    );

    await mockPostOrders(sockets[0], { bidsClubs: 5, bidsSpades: 7 });
    const gameId = await getGameIdByGameName(null, gameName);
    const orders = await getOrdersByGameId(null, gameId);
    const availableOrderIds = [orders.bidsClubs[0].id, orders.bidsSpades[0].id];
    assert.ok(availableOrderIds[0]);
    assert.ok(availableOrderIds[1]);

    const suitTypeIdentifiers = [
      "bidsClubs",
      "bidsClubs",
      "bidsSpades",
      "foo",
      [],
    ];
    const orderIds = [
      availableOrderIds[1],
      -1,
      null,
      availableOrderIds[0],
      availableOrderIds[0],
    ];
    const messages = [
      "Order not found",
      "Order not found",
      "Order not found",
      MALFORMED_REQUEST,
      MALFORMED_REQUEST,
    ];

    for (const [[suitTypeIdentifier, orderId], message] of zip(
      zip(suitTypeIdentifiers, orderIds),
      messages
    )) {
      await mockFillOrder(sockets[1], suitTypeIdentifier, orderId);
      assert.equal(sockets[1].messages.slice(-1)[0].type, TYPES.ERROR);
      assert.equal(sockets[1].messages.slice(-1)[0].payload.message, message);
    }
  });
});

module.exports.mockFillOrder = mockFillOrder;
