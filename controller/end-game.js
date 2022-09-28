const {
  getGoalSuitByGameId,
  getNumCardsBySuitGameId,
  getUserIdsByGameId,
  updateChipsByUserId,
  restoreUsersToDefaultByGameId,
  moveGameToArchiveByGameId,
  getGameNameByGameId,
  updateGameIdByUserId,
  getUserIdByUserName,
  setLastGameByUserId,
  addEntryToUsersGamesArchive,
} = require("../model/end-game");
const {
  lockGameId,
  deleteOrdersByGameId,
  getUserNameByUserId,
  getCardsChipsWsIdByGameId,
} = require("../model/game");
const { transactionDecorator } = require("../utils/transaction-decorator");
const {
  SOCKET_TYPES,
  TYPES,
  DAILY_DEV_INCREASE,
  DELTA_CHIPS_TO_GET_PLUS_ONE_SCORE,
} = require("../view/src/utils/constants");
const { zip } = require("../utils/helper-functions");
const {
  getGameIdByGameName,
  getWsIdsByGameId,
  getReadyByGameId,
  getIsPrivateIsRatedByGameName,
  insertNewGame,
} = require("../model/pre-game");
const { getWaitingPlayerNameByGameId } = require("../model/session");
const glicko2 = require("glicko2-lite");
const {
  getRatingsByGameId,
  getRatingDevsByGameId,
  getRatingVolsByGameId,
  getLastGameTimestampsByGameId,
  updateRatingDataByUserId,
} = require("../model/rating");

const calculateAndUpdateRatings = async (
  client,
  gameId,
  userIds,
  chipsDeltas
) => {
  const ratings = await getRatingsByGameId(client, gameId);
  const ratingDevs = await getRatingDevsByGameId(client, gameId);
  const ratingVols = await getRatingVolsByGameId(client, gameId);
  const lastGameTimestamps = await getLastGameTimestampsByGameId(
    client,
    gameId
  );
  const now = Date.now();

  zip(ratingDevs, lastGameTimestamps).map(([ratingDev, lastGameTimestamp]) => {
    [
      Math.sqrt(
        ratingDev * ratingDev +
          ((now - (lastGameTimestamp ?? now)) / (1000 * 60 * 60 * 24)) *
            DAILY_DEV_INCREASE
      ),
      lastGameTimestamp,
    ];
  });

  const newRatings = zip(
    zip(ratings, chipsDeltas),
    zip(ratingDevs, ratingVols)
  ).map(([[rating, chipsDelta], [ratingDev, ratingVol]], index) => {
    const opponents = zip(zip(ratings, ratingDevs), chipsDeltas)
      .map(([[otherRating, otherRatingDev], otherChipsDelta]) => [
        otherRating,
        otherRatingDev,
        0.5 +
          (chipsDelta - otherChipsDelta) / DELTA_CHIPS_TO_GET_PLUS_ONE_SCORE,
      ])
      .filter((_, otherIndex) => otherIndex !== index);

    return glicko2(rating, ratingDev, ratingVol, opponents);
  });

  for (const [{ rating, rd, vol }, userId] of zip(newRatings, userIds)) {
    await updateRatingDataByUserId(client, userId, rating, rd, vol);
  }

  return zip(ratings, newRatings).map(
    ([rating, newRating]) => newRating.rating - rating
  );
};

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

const endGame = async (client, gameId, startingChips) => {
  if (!gameId) throw "The game which is supposed to end does not exist";

  await lockGameId(client, gameId);
  const gameName = await getGameNameByGameId(client, gameId);
  const { isPrivate, isRated } = await getIsPrivateIsRatedByGameName(
    client,
    gameName
  );
  const userIds = await getUserIdsByGameId(client, gameId);
  const waitingPlayerName = await getWaitingPlayerNameByGameId(client, gameId);
  const previousGoalSuit = await getGoalSuitByGameId(client, gameId);

  await scoreGame(client, gameId);
  const newChipsResponse = await getCardsChipsWsIdByGameId(client, gameId);
  const newChips = newChipsResponse.map((row) => row.chips);
  const chipsDeltas = zip(startingChips, newChips).map(
    ([startingChipsPlayer, newChipsPlayer]) =>
      newChipsPlayer - startingChipsPlayer
  );
  let ratingDeltas = chipsDeltas.map((_) => null);
  if (isRated)
    ratingDeltas = await calculateAndUpdateRatings(
      client,
      gameId,
      userIds,
      chipsDeltas
    );

  for (const [userId, [chipsDelta, ratingDelta]] of zip(
    userIds,
    zip(chipsDeltas, ratingDeltas)
  )) {
    await addEntryToUsersGamesArchive(
      client,
      gameId,
      userId,
      chipsDelta,
      ratingDelta
    );
  }

  await deleteOrdersByGameId(client, gameId);
  await restoreUsersToDefaultByGameId(client, gameId);
  await moveGameToArchiveByGameId(client, gameId);
  await insertNewGame(client, gameName, isRated, isPrivate);
  const newGameId = await getGameIdByGameName(client, gameName);

  let playerNames = [];
  userIds.push(await getUserIdByUserName(client, waitingPlayerName));
  for (const userId of userIds) {
    await setLastGameByUserId(client, userId);
    await updateGameIdByUserId(client, newGameId, userId);
    playerNames.push(await getUserNameByUserId(client, userId));
  }

  const ready = await getReadyByGameId(client, newGameId);
  const response = await getCardsChipsWsIdByGameId(client, newGameId);
  const chips = response.map((row) => row.chips);

  let payload = {};

  const wsIds = await getWsIdsByGameId(client, newGameId);
  wsIds.forEach((wsId) => {
    payload[wsId] = {
      socketTypesToInform: SOCKET_TYPES.MAP_WS_ID_TO_PAYLOAD,
      type: TYPES.END_GAME,
      payload: { chips, newGameId, previousGoalSuit, playerNames, ready },
    };
  });

  return [
    {
      socketTypesToInform: SOCKET_TYPES.MAP_WS_ID_TO_PAYLOAD,
      type: TYPES.END_GAME,
      payload,
    },
    {
      socketTypesToInform: SOCKET_TYPES.ALL,
      type: TYPES.ANNOUNCE_NEXT_GAME,
      payload: {
        gameId,
        newGameId,
        playerNames,
      },
    },
  ];
};
module.exports.endGame = transactionDecorator(endGame);
