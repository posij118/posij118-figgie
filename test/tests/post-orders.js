const { assert } = require("chai");
const respondToMessage = require("../../app");
const {
  getOrdersByGameId,
  getCardsChipsWsIdByGameId,
  getUserIdByWsId,
} = require("../../model/game");
const { getGameIdByGameName } = require("../../model/pre-game");
const { getCardsByUserId } = require("../../model/session");
const { orderComparator } = require("../../utils/helper-functions");
const {
  CLIENT,
  TYPES,
  ORDER_PRICES_EMPTY,
  ORDERS_EMPTY,
} = require("../../view/src/utils/constants");
const { mockWsServer } = require("../backend-test");
const { startFourPlayerGame } = require("./toggle-ready");
const seed = require("seed-random");

const mockPostOrders = async (socket, orderObject) => {
  await respondToMessage(
    socket,
    mockWsServer,
    JSON.stringify({
      type: CLIENT.MESSAGE.POST_ORDERS,
      payload: {
        ...ORDER_PRICES_EMPTY,
        ...orderObject,
      },
    })
  );
};

describe("postOrders function", function () {
  const gameName = "game";

  it("posts an order", async function () {
    const { sockets, userNames } = await startFourPlayerGame(
      gameName,
      false,
      true,
      false
    );

    await mockPostOrders(sockets[0], { bidsClubs: 5 });

    const payload = sockets[1].messages.slice(-1)[0].payload;
    assert.ok(payload.id);
    assert.equal(payload.type, "buy");
    assert.equal(payload.suit, "clubs");
    assert.equal(payload.price, 5);
    assert.equal(payload.poster, userNames[0]);
    assert.closeTo(new Date(payload.timestamp).getTime(), Date.now(), 100);

    const gameId = await getGameIdByGameName(null, gameName);
    const orders = await getOrdersByGameId(null, gameId);

    assert.equal(orders.bidsClubs.length, 1);
  });

  it("orders the orders primarily by attractiveness, secondarily by oldness", async function () {
    const { sockets, userNames } = await startFourPlayerGame(
      gameName,
      false,
      true,
      false
    );

    await mockPostOrders(sockets[2], { bidsClubs: 4 });
    await mockPostOrders(sockets[0], { bidsClubs: 3 });
    await mockPostOrders(sockets[1], { bidsClubs: 3 });

    const gameId = await getGameIdByGameName(null, gameName);
    const sortedOrders = Object.fromEntries(
      Object.entries(await getOrdersByGameId(null, gameId)).map(
        ([suitTypeIdentifier, ordersArray]) => [
          suitTypeIdentifier,
          ordersArray.sort(orderComparator),
        ]
      )
    );

    assert.equal(sortedOrders.bidsClubs.length, 3);
    assert.equal(sortedOrders.bidsClubs[0].poster, userNames[2]);
    assert.equal(sortedOrders.bidsClubs[1].poster, userNames[0]);
    assert.equal(sortedOrders.bidsClubs[2].poster, userNames[1]);
  });

  it("fills the best available order if it can", async function () {
    seed("fills-best-available", { global: true });
    const { sockets } = await startFourPlayerGame(gameName, false, true, false);

    await mockPostOrders(sockets[0], { bidsClubs: 6 });
    await mockPostOrders(sockets[1], { bidsClubs: 8 });
    await mockPostOrders(sockets[1], { offersClubs: 5 });

    const gameId = await getGameIdByGameName(null, gameName);
    const orders = await getOrdersByGameId(null, gameId);
    assert.deepEqual(orders, ORDERS_EMPTY);

    const response = await getCardsChipsWsIdByGameId(null, gameId);
    assert.deepEqual(
      response.map((row) => row.chips),
      [294, 306, 300, 300]
    );
    assert.deepEqual(
      response.map(
        (row) =>
          row.num_clubs + row.num_spades + row.num_diamonds + row.num_hearts
      ),
      [11, 9, 10, 10]
    );
  });

  it("does not add an order if it would fill only an order by the same player", async function () {
    const { sockets } = await startFourPlayerGame(gameName, false, true, false);

    await mockPostOrders(sockets[0], { bidsClubs: 6 });
    await mockPostOrders(sockets[0], { offersClubs: 5 });

    const gameId = await getGameIdByGameName(null, gameName);
    const orders = await getOrdersByGameId(null, gameId);
    assert.equal(orders.bidsClubs.length, 1);
    assert.equal(orders.bidsClubs[0].price, 6);
    assert.deepEqual(orders.offersClubs, []);
  });

  it("rejects a sell order if a player does not have a particular card", async function () {
    seed("no-cards", { global: true });
    const { sockets } = await startFourPlayerGame(gameName, false, true, false);

    const socket = sockets[0];
    const userId = await getUserIdByWsId(null, socket.id);
    const cards = await getCardsByUserId(null, userId);
    assert.strictEqual(cards.diamonds, 0);

    await mockPostOrders(socket, { offersDiamonds: 7 });

    assert.equal(socket.messages.slice(-1)[0].type, TYPES.GAME_CONFIG);
    const gameId = await getGameIdByGameName(null, gameName);
    const orders = await getOrdersByGameId(null, gameId);

    assert.deepEqual(orders, ORDERS_EMPTY);
  });

  it("reject wrong prices and typechecks", async function () {
    const { sockets } = await startFourPlayerGame(gameName, false, true, false);
    const gameId = await getGameIdByGameName(null, gameName);

    const postedOrdersArray = [
      { ...ORDER_PRICES_EMPTY, bidsClubs: 7, offersClubs: -8 },
      null,
      {
        ...ORDER_PRICES_EMPTY,
        offersClubs: 12,
        bidsSpades: [5, 7],
        offersDiamonds: 8,
      },
      { offersFifthSuit: 9 },
      "foo",
    ];

    let lastMessagesLength = sockets[0].messages.length;
    for (const postedOrders of postedOrdersArray) {
      await respondToMessage(
        sockets[0],
        mockWsServer,
        JSON.stringify({
          type: CLIENT.MESSAGE.POST_ORDERS,
          payload: postedOrders,
        })
      );

      assert.equal(sockets[0].messages.length, lastMessagesLength + 1);
      lastMessagesLength++;
      assert.equal(sockets[0].messages.slice(-1)[0].type, TYPES.ERROR);
      const orders = await getOrdersByGameId(null, gameId);
      assert.deepEqual(orders, ORDERS_EMPTY);
    }
  });
});

module.exports.mockPostOrders = mockPostOrders;
