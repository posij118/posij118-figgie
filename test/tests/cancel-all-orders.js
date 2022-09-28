const { assert } = require("chai");
const respondToMessage = require("../../app");
const { getOrdersByGameId } = require("../../model/game");
const { getGameIdByGameName } = require("../../model/pre-game");
const { CLIENT, TYPES } = require("../../view/src/utils/constants");
const { mockWsServer } = require("../backend-test");
const { mockPostOrders } = require("./post-orders");
const { startFourPlayerGame } = require("./toggle-ready");

const mockCancelAllOrders = async (socket) => {
  await respondToMessage(
    socket,
    mockWsServer,
    JSON.stringify({
      type: CLIENT.MESSAGE.CANCEL_ALL_ORDERS,
    })
  );
};

describe("cancelAllOrders function", function () {
  it("cancels all orders from the user", async function () {
		const gameName = "game";
    const { sockets, userNames } = await startFourPlayerGame(gameName, false, true, false);
		await mockPostOrders(sockets[0], {bidsClubs: 8, bidsDiamonds: 4});
		await mockPostOrders(sockets[2], {bidsClubs: 6});

		await mockCancelAllOrders(sockets[0]);

		const gameId = await getGameIdByGameName(null, gameName);
		const orders = await getOrdersByGameId(null, gameId);

		assert.equal(orders.bidsClubs.length, 1);
		assert.equal(orders.bidsClubs[0].price, 6);
		assert.deepEqual(orders.bidsDiamonds, []);

		const lastMessage = sockets[2].messages.slice(-1)[0];
		assert.equal(lastMessage.type, TYPES.CANCELED_ORDERS_PLAYER_NAME);
		assert.equal(lastMessage.payload, userNames[0]);
	});
});

module.exports.mockCancelAllOrders = mockCancelAllOrders;
