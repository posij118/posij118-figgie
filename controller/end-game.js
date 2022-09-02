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
const { lockGameId, deleteOrdersByGameId } = require("../model/game");
const { transactionDecorator } = require("../utils/transaction-decorator");
const { SOCKET_TYPES, TYPES } = require("../view/src/utils/constants");
const { zip } = require("../utils/helper-functions");
const { createGame, getWsIdsByGameId, getGameIdByGameName } = require("../model/pre-game");

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
  let chips = [];

  for (const [userId, payoff] of zip(userIds, payoffs)) {
    const userChips = await updateChipsByUserId(client, userId, payoff);
    chips.push(userChips);
  }

  return chips;
};

const endGame = async (client, gameId) => {
  const gameName = await getGameNameByGameId(client, gameId);
  const wsIds = await getWsIdsByGameId(client, gameId);

  await lockGameId(client, gameId);
  const chips = await scoreGame(client, gameId);
  const previousGoalSuit = await getGoalSuitByGameId(client, gameId);
  await deleteOrdersByGameId(client, gameId);
  await restoreUsersToDefaultByGameId(client, gameId);
  await moveGameToArchiveByGameId(client, gameId);
  await createGame(client, gameName, false);
  const newGameId = await getGameIdByGameName(client, gameName);
	for (const wsId of wsIds) {
		await updateGameIdByWsId(client, newGameId, wsId);
	}

	let payload = {};

  wsIds.forEach((wsId) => {
    payload[wsId] = {
      socketTypesToInform: SOCKET_TYPES.MAP_WS_ID_TO_PAYLOAD,
      type: TYPES.END_GAME,
      payload: { chips, newGameId, previousGoalSuit },
    };
  });

  return {
    socketTypesToInform: SOCKET_TYPES.MAP_WS_ID_TO_PAYLOAD,
    type: TYPES.END_GAME,
    payload,
  };
};

module.exports.endGame = transactionDecorator(endGame);
