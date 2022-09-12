const {
  getGoalSuitByGameId,
  getNumCardsBySuitGameId,
  getUserIdsByGameId,
  updateChipsByUserId,
  restoreUsersToDefaultByGameId,
  moveGameToArchiveByGameId,
  getGameNameByGameId,
  updateGameIdByWsId,
} = require("../model/end-game");
const {
  lockGameId,
  deleteOrdersByGameId,
  getUserNameByUserId,
  getCardsChipsWsIdByGameId,
} = require("../model/game");
const { transactionDecorator } = require("../utils/transaction-decorator");
const { SOCKET_TYPES, TYPES } = require("../view/src/utils/constants");
const { zip } = require("../utils/helper-functions");
const {
  getGameIdByGameName,
  getWsIdsByGameId,
  getReadyByGameId,
  getIsPrivateIsRatedByGameName,
  insertNewGame,
} = require("../model/pre-game");

const scoreGame = async (client, gameId) => {
  const goalSuit = await getGoalSuitByGameId(client, gameId);
  const userIds = await getUserIdsByGameId(client, gameId);
  const numGoalSuit = await getNumCardsBySuitGameId(client, goalSuit, gameId);
  const maxGoalSuit = Math.max(...numGoalSuit);
  const sumGoalSuit = numGoalSuit.reduce((cntA, cntB) => cntA + cntB);
  const countMaxGoalSuit = numGoalSuit
    .map((numCards) => Number(numCards === maxGoalSuit))
    .reduce((cntA, cntB) => cntA + cntB);

  const payoffs = numGoalSuit.map((numCards) => {
    if (numCards < maxGoalSuit) return 10 * numCards;
    if (sumGoalSuit === 8) return 10 * numCards + 120 / countMaxGoalSuit;
    if (sumGoalSuit === 10) return 10 * numCards + 100 / countMaxGoalSuit;
  });

  for (const [userId, payoff] of zip(userIds, payoffs)) {
    await updateChipsByUserId(client, userId, payoff);
  }
};

const endGame = async (client, gameId) => {
  await lockGameId(client, gameId);
  const gameName = await getGameNameByGameId(client, gameId);
  const { isPrivate, isRated } = await getIsPrivateIsRatedByGameName(
    client,
    gameName
  );
  const wsIds = await getWsIdsByGameId(client, gameId);

  await scoreGame(client, gameId);
  const previousGoalSuit = await getGoalSuitByGameId(client, gameId);
  await deleteOrdersByGameId(client, gameId);
  await restoreUsersToDefaultByGameId(client, gameId);
  await moveGameToArchiveByGameId(client, gameId);
  await insertNewGame(client, gameName, isRated, isPrivate);
  const newGameId = await getGameIdByGameName(client, gameName);

  for (const wsId of wsIds) {
    await updateGameIdByWsId(client, newGameId, wsId);
  }

  const userIds = await getUserIdsByGameId(client, newGameId);
  let playerNames = [];
  for (const userId of userIds) {
    playerNames.push(await getUserNameByUserId(client, userId));
  }
  const ready = await getReadyByGameId(client, newGameId);
  const response = await getCardsChipsWsIdByGameId(client, newGameId);
  const chips = response.map((row) => row.chips);

  let payload = {};
  payload.gameId = gameId;
  payload.newGameId = newGameId;
  payload.playerNames = playerNames;

  wsIds.forEach((wsId) => {
    payload[wsId] = {
      socketTypesToInform: SOCKET_TYPES.MAP_WS_ID_TO_PAYLOAD,
      type: TYPES.END_GAME,
      payload: { chips, newGameId, previousGoalSuit, playerNames, ready },
    };
  });

  return {
    socketTypesToInform: SOCKET_TYPES.MAP_WS_ID_TO_PAYLOAD,
    type: TYPES.END_GAME,
    payload,
  };
};

module.exports.endGame = transactionDecorator(endGame);
