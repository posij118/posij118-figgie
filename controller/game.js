const {
  getUserIdByWsId,
  insertNewOrder,
  deleteOrdersByUserIdTypeSuit,
  getUserNameByUserId,
  deleteOrdersByUserId,
  getNumWithSuitByUserId,
  getOrdersBySuitTypeGameId,
  updateGameState,
  deleteOrdersByGameId,
  getCardsChipsWsIdByGameId,
  lockGameId,
} = require("../model/game");
const { getGameIdByWsId, getWsIdsByGameId } = require("../model/pre-game");
const {
  getSuitNameFromSuitTypeIndentifier,
  getTypeFromSuitTypeIdentifier,
  orderComparator,
} = require("../utils/helper-functions");
const { transactionDecorator } = require("../utils/transaction-decorator");
const { SOCKET_TYPES, TYPES } = require("../view/src/utils/constants");
const { capitalize } = require("../utils/helper-functions");
const { updateGameIdByWsId } = require("../model/end-game");

const postOrders = async (client, socket, orders) => {
  const gameId = await getGameIdByWsId(client, socket.id);
  const userId = await getUserIdByWsId(client, socket.id);
  const timestamp = new Date();
  let newOrders = [];
  await lockGameId(client, gameId);

  for (const [suitTypeIdentifier, price] of Object.entries(orders)) {
    if (!price) continue;
    const type = getTypeFromSuitTypeIdentifier(
      suitTypeIdentifier,
      "buy",
      "sell"
    );
    const suit = getSuitNameFromSuitTypeIndentifier(suitTypeIdentifier);
    const oppositeType = type === "buy" ? "sell" : "buy";
    const oppositeSuitTypeIdentifier =
      type === "buy" ? `offers${capitalize(suit)}` : `bids${capitalize(suit)}`;

    if (
      type === "sell" &&
      !(await getNumWithSuitByUserId(client, userId, suit))
    )
      continue;

    const ordersToCompare = await getOrdersBySuitTypeGameId(
      client,
      suit,
      oppositeType,
      gameId
    );
    ordersToCompare.sort(orderComparator);

    let orderAccepted = true;
    for (const orderToCompare of ordersToCompare) {
      if (orderToCompare.poster === userId) {
        if (type === "sell" && orderToCompare.price >= price)
          orderAccepted = false;
        if (type === "buy" && orderToCompare.price <= price)
          orderAccepted = false;
        continue;
      }

      if (type === "sell" && orderToCompare.price >= price)
        return await fillOrder(
          client,
          socket,
          oppositeSuitTypeIdentifier,
          orderToCompare.id
        );

      if (type === "buy" && orderToCompare.price <= price)
        return await fillOrder(
          client,
          socket,
          oppositeSuitTypeIdentifier,
          orderToCompare.id
        );
    }

    if (orderAccepted) {
      const newOrder = await insertNewOrder(client, {
        gameId,
        type,
        suit,
        price,
        userId,
        timestamp,
      });

      newOrders.push({
        socketTypesToInform: SOCKET_TYPES.SAME_GAME,
        type: TYPES.NEW_ORDER,
        payload: newOrder,
      });
    }
  }
  return newOrders;
};

const cancelSuitTypeOrders = async (client, socket, suitTypeIdentifier) => {
  const userId = await getUserIdByWsId(client, socket.id);
  const type = getTypeFromSuitTypeIdentifier(suitTypeIdentifier, "buy", "sell");
  const suit = getSuitNameFromSuitTypeIndentifier(suitTypeIdentifier);

  const deletedOrderIds = await deleteOrdersByUserIdTypeSuit(
    client,
    userId,
    type,
    suit
  );

  return {
    socketTypesToInform: SOCKET_TYPES.SAME_GAME,
    type: TYPES.CANCELED_ORDERS_IDS,
    payload: deletedOrderIds,
  };
};

const cancelAllUserOrders = async (client, socket) => {
  const userId = await getUserIdByWsId(client, socket.id);
  const userName = await getUserNameByUserId(client, userId);

  await deleteOrdersByUserId(client, userId);
  return {
    socketTypesToInform: SOCKET_TYPES.SAME_GAME,
    type: TYPES.CANCELED_ORDERS_PLAYER_NAME,
    payload: userName,
  };
};

const fillOrder = async (client, socket, suitTypeIdentifier, orderId) => {
  const suit = getSuitNameFromSuitTypeIndentifier(suitTypeIdentifier);
  const type = getTypeFromSuitTypeIdentifier(suitTypeIdentifier, "buy", "sell");
  const gameId = await getGameIdByWsId(client, socket.id);
  const userId = await getUserIdByWsId(client, socket.id);

  if (type === "buy" && !(await getNumWithSuitByUserId(client, userId, suit)))
    return;

  const availableOrders = await getOrdersBySuitTypeGameId(
    client,
    suit,
    type,
    gameId
  );
  availableOrders.sort(orderComparator);

  const filledOrder = availableOrders.find((order) => order.id === orderId);
  if (filledOrder) {
    for (let order of availableOrders) {
      if (order.poster !== userId) {
        await lockGameId(client, gameId);
        await deleteOrdersByGameId(client, gameId);
        await updateGameState(
          client,
          order.poster,
          userId,
          suit,
          type,
          order.price
        );

        const playersInfo = await getCardsChipsWsIdByGameId(client, gameId);
        const numCards = playersInfo.map(
          (playerInfo) =>
            playerInfo.num_clubs +
            playerInfo.num_spades +
            playerInfo.num_diamonds +
            playerInfo.num_hearts
        );
        const chips = playersInfo.map((playerInfo) => playerInfo.chips);

        const broadcastObject = {};
        playersInfo.forEach((playerInfo) => {
          broadcastObject[playerInfo.ws_session_id] = {
            socketTypesToInform: SOCKET_TYPES.MAP_WS_ID_TO_PAYLOAD,
            type: TYPES.ORDER_FILLED,
            payload: {
              numCards,
              clubs: playerInfo.num_clubs,
              spades: playerInfo.num_spades,
              diamonds: playerInfo.num_diamonds,
              hearts: playerInfo.num_hearts,
              chips,
            },
          };
        });

        return {
          socketTypesToInform: SOCKET_TYPES.MAP_WS_ID_TO_PAYLOAD,
          payload: broadcastObject,
        };
      }
    }
  }
};

const leaveGame = async (client, socket) => {
  const userId = await getUserIdByWsId(client, socket.id);
  const userName = await getUserNameByUserId(client, userId);
  const gameId = await getGameIdByWsId(client, socket.id);
  await lockGameId(client, gameId);

  await updateGameIdByWsId(client, null, socket.id);
  const wsIds = await getWsIdsByGameId(client, gameId);

  return {
    type: TYPES.PLAYER_LEFT,
    socketTypesToInform: SOCKET_TYPES.MAP_WS_ID_TO_PAYLOAD,
    payload: Object.fromEntries(
      wsIds.map((wsIdToInform) => [
        wsIdToInform,
        {
          type: TYPES.PLAYER_LEFT,
          socketTypesToInform: SOCKET_TYPES.MAP_WS_ID_TO_PAYLOAD,
          payload: userName,
        },
      ])
    ),
  };
};

module.exports.postOrders = transactionDecorator(postOrders);
module.exports.cancelAllUserOrders = transactionDecorator(cancelAllUserOrders);
module.exports.cancelSuitTypeOrders =
  transactionDecorator(cancelSuitTypeOrders);
module.exports.fillOrder = transactionDecorator(fillOrder);
module.exports.leaveGame = transactionDecorator(leaveGame);
