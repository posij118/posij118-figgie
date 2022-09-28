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
const {
  getGameIdByWsId,
  getWsIdsByGameId,
  getGameIdOrWaitingGameIdByWsId,
  checkIfGameStartedByGameId,
} = require("../model/pre-game");
const {
  getSuitNameFromSuitTypeIndentifier,
  getTypeFromSuitTypeIdentifier,
  orderComparator,
  throwError,
} = require("../utils/helper-functions");
const { transactionDecorator } = require("../utils/transaction-decorator");
const {
  SOCKET_TYPES,
  TYPES,
  MALFORMED_REQUEST,
} = require("../view/src/utils/constants");
const { capitalize } = require("../utils/helper-functions");
const {
  deleteGameInfoByWsId,
  getUserIdsByGameId,
  moveGameToArchiveByGameId,
} = require("../model/end-game");
const { getWaitingPlayerNameByGameId } = require("../model/session");
const { getIsPrivateByGameId } = require("../model/lobby");

const postOrders = async (client, wsId, orders) => {
  if (typeof orders !== "object" || !orders || !Object.entries(orders).length)
    throwError(MALFORMED_REQUEST);

  const gameId = await getGameIdByWsId(client, wsId);
  const userId = await getUserIdByWsId(client, wsId);
  const timestamp = new Date();
  let newOrders = [];
  await lockGameId(client, gameId);

  for (let [suitTypeIdentifier, price] of Object.entries(orders)) {
    if (!price) continue;
    price = Number(price);

    if (!Number.isInteger(price) || price <= 0 || price >= 100)
      throwError(MALFORMED_REQUEST);

    const type = getTypeFromSuitTypeIdentifier(
      suitTypeIdentifier,
      "buy",
      "sell"
    );
    const suit = getSuitNameFromSuitTypeIndentifier(suitTypeIdentifier);
    if (!suit || !type) throwError(MALFORMED_REQUEST);

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
          wsId,
          oppositeSuitTypeIdentifier,
          orderToCompare.id
        );

      if (type === "buy" && orderToCompare.price <= price)
        return await fillOrder(
          client,
          wsId,
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

const cancelSuitTypeOrders = async (client, wsId, suitTypeIdentifier) => {
  if (typeof suitTypeIdentifier !== "string") throwError(MALFORMED_REQUEST);

  const userId = await getUserIdByWsId(client, wsId);
  const type = getTypeFromSuitTypeIdentifier(suitTypeIdentifier, "buy", "sell");
  const suit = getSuitNameFromSuitTypeIndentifier(suitTypeIdentifier);
  if (!suit || !type) throwError(MALFORMED_REQUEST);

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

const cancelAllUserOrders = async (client, wsId) => {
  const userId = await getUserIdByWsId(client, wsId);
  const userName = await getUserNameByUserId(client, userId);

  await deleteOrdersByUserId(client, userId);
  return {
    socketTypesToInform: SOCKET_TYPES.SAME_GAME,
    type: TYPES.CANCELED_ORDERS_PLAYER_NAME,
    payload: userName,
  };
};

const fillOrder = async (client, wsId, suitTypeIdentifier, orderId) => {
  if (typeof suitTypeIdentifier !== "string") throwError(MALFORMED_REQUEST);

  const suit = getSuitNameFromSuitTypeIndentifier(suitTypeIdentifier);
  const type = getTypeFromSuitTypeIdentifier(suitTypeIdentifier, "buy", "sell");
  if (!suit || !type) throwError(MALFORMED_REQUEST);

  const gameId = await getGameIdByWsId(client, wsId);
  const userId = await getUserIdByWsId(client, wsId);

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
        const wsIds = await getWsIdsByGameId(client, gameId);
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

        wsIds.forEach((wsId) => {
          if (
            !playersInfo
              .map((playerInfo) => playerInfo.ws_session_id)
              .includes(wsId)
          ) {
            broadcastObject[wsId] = {
              socketTypesToInform: SOCKET_TYPES.MAP_WS_ID_TO_PAYLOAD,
              type: TYPES.ORDER_FILLED,
              payload: {
                numCards,
                chips,
              },
            };
          }
        });

        return {
          socketTypesToInform: SOCKET_TYPES.MAP_WS_ID_TO_PAYLOAD,
          type: TYPES.ORDER_FILLED,
          payload: broadcastObject,
        };
      }
    }
  }

  return throwError("Order not found");
};

const leaveGame = async (client, wsId) => {
  const userId = await getUserIdByWsId(client, wsId);
  const userName = await getUserNameByUserId(client, userId);
  const gameId = await getGameIdOrWaitingGameIdByWsId(client, wsId);
  await lockGameId(client, gameId);
  const wsIds = await getWsIdsByGameId(client, gameId);
  
  let gameStarted = false;
  if (gameId) gameStarted = await checkIfGameStartedByGameId(client, gameId);
  const waitingPlayerName = await getWaitingPlayerNameByGameId(client, gameId);
  const userIds = await getUserIdsByGameId(client, gameId);
  const isPrivate = await getIsPrivateByGameId(client, gameId);

  if (gameStarted && waitingPlayerName !== userName)
    return throwError("Users can't leave a running game.");
  await deleteGameInfoByWsId(client, wsId);
  if (userIds.length === 1) moveGameToArchiveByGameId(client, gameId);

  const broadcastObjects = [
    {
      socketTypesToInform: SOCKET_TYPES.ALL,
      type: TYPES.ANNOUNCE_PLAYER_LEFT,
      payload: { gameId, playerName: userName },
      isPrivate,
    },
    {
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
      gameId,
      userName,
    },
  ];

  return broadcastObjects;
};

module.exports.postOrders = transactionDecorator(postOrders);
module.exports.cancelAllUserOrders = transactionDecorator(cancelAllUserOrders);
module.exports.cancelSuitTypeOrders =
  transactionDecorator(cancelSuitTypeOrders);
module.exports.fillOrder = transactionDecorator(fillOrder);
module.exports.leaveGame = transactionDecorator(leaveGame);
module.exports.leaveGameUndecorated = leaveGame;
