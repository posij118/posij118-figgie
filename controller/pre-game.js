const {
  checkIfGameExists,
  getPreGameInfoByName,
  createGame,
  updateUserToJoinGame,
  getGameIdByWsId,
  getReadyByGameId,
  updateReadyByWsId,
  getGameIdByGameName,
  getNumberOfPlayingAndWatingPlayersByGameId,
  checkIfGameStartedByGameId,
} = require("../model/pre-game");
const { SOCKET_TYPES, TYPES } = require("../view/src/utils/constants");
const { startGame } = require("./start-game");
const { transactionDecorator } = require("../utils/transaction-decorator");
const { deleteInactiveGame } = require("./session");
const {
  lockGameId,
  getCardsChipsWsIdByGameId,
  getStartingTimestampByGameId,
  getOrdersByGameId,
  getUserIdByWsId,
  getUserNameByUserId,
} = require("../model/game");
const dotenv = require("dotenv").config();

const joinGame = async (client, gameName, socket) => {
  if (gameName.length > 50 || !gameName.length) {
    return {
      socketTypesToInform: SOCKET_TYPES.ITSELF,
      type: TYPES.ERROR,
      payload: "Game name too long",
    };
  }

  const userId = await getUserIdByWsId(client, wsId);
  if (!userId) {
    socket.close();
    return;
  }
  const userName = await getUserNameByUserId(client, userId);

  const gameExists = await checkIfGameExists(client, gameName);
  if (!gameExists) {
    await createGame(client, gameName, false);
    setTimeout(() => {
      deleteInactiveGame(gameId);
    }, process.env.GAME_TIMEOUT || 1.2 * 1000 * 60 * 60 * 24);
  }

  const gameId = await getGameIdByGameName(client, gameName);
  await lockGameId(client, gameId);
  const response = await getPreGameInfoByName(client, gameName);
  const numPlayers = await getNumberOfPlayingAndWatingPlayersByGameId(
    client,
    gameId
  );

  if (numPlayers >= 5) {
    return {
      socketTypesToInform: SOCKET_TYPES.ITSELF,
      type: TYPES.ERROR,
      payload: { message: "Game already full", stack: "" },
    };
  }

  const INITIAL_CHIPS = 350;
  const playerNames = [...response.map((row) => row.username), userName];
  const ready = [...response.map((row) => row.ready), false];
  const chips = [...response.map((row) => row.chips), INITIAL_CHIPS];
  let gameStarted = false;
  if (numPlayers === 4)
    gameStarted = await checkIfGameStartedByGameId(client, gameId);

  await updateUserToJoinGame(
    client,
    userId,
    gameId,
    INITIAL_CHIPS,
    gameStarted
  );

  if (gameStarted) {
    waitingPlayerName = userName;
    const response = await getCardsChipsWsIdByGameId(client, gameId);
    const numCards = response.map(
      (row) =>
        row.num_clubs + row.num_spades + row.num_diamonds + row.num_hearts
    );
    const startingTimestamp = await getStartingTimestampByGameId(
      client,
      gameId
    );
    const orders = await getOrdersByGameId(client, gameId);

    return {
      socketTypesToInform: SOCKET_TYPES.SAME_GAME,
      type: TYPES.NEW_WAITING_PLAYER,
      payload: {
        chips: chips.slice(0, 4),
        numCards,
        gameId,
        gameDuration: Number(process.env.GAME_DURATION) || 240000,
        playerNames: playerNames.slice(0, 4),
        ready: ready.slice(0, 4),
        waitingPlayerName,
        startingTimestamp,
        userName,
        orders,
      },
    };
  }

  return {
    socketTypesToInform: SOCKET_TYPES.SAME_GAME,
    type: TYPES.PRE_GAME_CONFIG,
    payload: {
      gameId,
      playerNames,
      ready,
      chips,
    },
  };
};

const toggleReady = async (client, socket) => {
  const wsId = socket.id;
  await updateReadyByWsId(client, wsId);

  const gameId = await getGameIdByWsId(client, wsId);
  const ready = await getReadyByGameId(client, gameId);
  if (
    ready.length >= 4 &&
    ready.length <= 5 &&
    ready.reduce((a, b) => a && b)
  ) {
    const response = await startGame(client, gameId).catch((err) => {
      console.log(err);
    });
    return response;
  }
  return {
    socketTypesToInform: SOCKET_TYPES.SAME_GAME,
    type: TYPES.PRE_GAME_CONFIG,
    payload: { ready },
  };
};

module.exports.joinGame = transactionDecorator(joinGame);
module.exports.toggleReady = transactionDecorator(toggleReady);
