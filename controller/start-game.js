const { getUserIdsByGameId } = require("../model/end-game");
const {
  updateUserByUserId,
  updateGameByGameId,
  getCardsChipsWsIdByGameId,
} = require("../model/game");
const { getWsIdsByGameId } = require("../model/pre-game");
const {
  SUIT_IDS_ARRAY,
  SOCKET_TYPES,
  TYPES,
} = require("../view/src/utils/constants");
const dotenv = require("dotenv").config();

const randomShuffle = (arr) => {
  return arr
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
};

const getGoalSuitFromCommonSuit = (commonSuit) => {
  switch (commonSuit) {
    case "clubs":
      return "spades";
    case "spades":
      return "clubs";
    case "diamonds":
      return "hearts";
    case "hearts":
      return "diamonds";
  }
};

const startGame = async (client, gameId) => {
  const userIds = await getUserIdsByGameId(client, gameId);
  const suitIdsArrayShuffled = randomShuffle(SUIT_IDS_ARRAY);
  const suitIdsToSuitNames = randomShuffle([
    "clubs",
    "spades",
    "diamonds",
    "hearts",
  ]);

  const cardDraw = userIds.map((userId, index) => {
    return suitIdsArrayShuffled
      .slice((40 * index) / userIds.length, (40 * (index + 1)) / userIds.length)
      .map((suitId) => suitIdsToSuitNames[suitId]);
  });

  const clubs = cardDraw.map(
    (cardDrawSegment) =>
      cardDrawSegment.filter((card) => card === "clubs").length
  );

  const spades = cardDraw.map(
    (cardDrawSegment) =>
      cardDrawSegment.filter((card) => card === "spades").length
  );

  const diamonds = cardDraw.map(
    (cardDrawSegment) =>
      cardDrawSegment.filter((card) => card === "diamonds").length
  );

  const hearts = cardDraw.map(
    (cardDrawSegment) =>
      cardDrawSegment.filter((card) => card === "hearts").length
  );

  const response = await getCardsChipsWsIdByGameId(client, gameId);
  let chips = response.map((row) => row.chips);

  userIds.forEach(async (userId, index) => {
    await updateUserByUserId(client, userId, {
      clubs: clubs[index],
      spades: spades[index],
      diamonds: diamonds[index],
      hearts: hearts[index],
      chips: chips[index] - 200 / userIds.length,
    });
  });

  const startedAt = new Date();
  const commonSuit = suitIdsToSuitNames[3];
  const goalSuit = getGoalSuitFromCommonSuit(commonSuit);

  await updateGameByGameId(client, gameId, startedAt, goalSuit);
  const wsIds = await getWsIdsByGameId(client, gameId);
  return {
    socketTypesToInform: SOCKET_TYPES.MAP_WS_ID_TO_PAYLOAD,
    type: TYPES.GAME_CONFIG,
    payload: Object.fromEntries(
      wsIds.map((wsId, index) => {
        return [
          wsId,
          {
            socketTypesToInform: SOCKET_TYPES.MAP_WS_ID_TO_PAYLOAD,
            type: TYPES.GAME_CONFIG,
            payload: {
              clubs: clubs[index],
              spades: spades[index],
              diamonds: diamonds[index],
              hearts: hearts[index],
              chips: chips.map((userChips) => userChips - 200 / userIds.length),
              numCards: Array(userIds.length).fill(40 / userIds.length),
              gameId,
              gameDuration: Number(process.env.GAME_DURATION) || 240000,
            },
          },
        ];
      })
    ),
  };
};

module.exports.startGame = startGame;
