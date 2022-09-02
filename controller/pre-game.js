const {
  checkIfGameExists,
  checkIfUserExists,
  getPreGameInfoByName,
  createGame,
  insertNewGuest,
  getGameIdByWsId,
  getReadyByGameId,
  updateReadyByWsId,
  getGameIdByGameName,
} = require("../model/pre-game");
const { SOCKET_TYPES, TYPES } = require("../view/src/utils/constants");
const { startGame } = require("./start-game");
const { transactionDecorator } = require("../utils/transaction-decorator");
const { deleteInactiveGame } = require("./session");
const dotenv = require("dotenv").config();

const addNewGuestToGame = async (client, userName, gameName, wsId) => {
  if (userName.length > 6 || gameName.length > 50) {
    return {
      socketTypesToInform: SOCKET_TYPES.ITSELF,
      type: TYPES.ERROR,
      payload: "Username or game name too long",
    };
  }

  const gameExists = await checkIfGameExists(client, gameName);
  const userExists = await checkIfUserExists(client, userName);

  if (userExists) {
    return {
      socketTypesToInform: SOCKET_TYPES.ITSELF,
      type: TYPES.ERROR,
      payload: { message: "Username already taken", stack: "" },
    };
  }

  if (!gameExists) {
    await createGame(client, gameName, false);
    setTimeout(() => {
      deleteInactiveGame(gameId);
    }, process.env.GAME_TIMEOUT || 1.2 * 1000 * 60 * 60 * 24);
  }

  const response = await getPreGameInfoByName(client, gameName);
  const gameId = await getGameIdByGameName(client, gameName);
  const numPlayers = response.length;

  if (numPlayers >= 5) {
    return {
      socketTypesToInform: SOCKET_TYPES.ITSELF,
      type: TYPES.ERROR,
      payload: { message: "Game already full", stack: "" },
    };
  }

  const INITIAL_CHIPS = 350;
  await insertNewGuest(client, wsId, userName, gameId, INITIAL_CHIPS);
  const playerNames = [...response.map((row) => row.username), userName];
  const ready = [...response.map((row) => row.ready), false];
  const chips = [...response.map((row) => row.chips), INITIAL_CHIPS];
  
  return {
    socketTypesToInform: SOCKET_TYPES.SAME_GAME,
    type: TYPES.PRE_GAME_CONFIG,
    payload: {
      gameId,
      playerNames,
      ready,
      chips
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

module.exports.addNewGuestToGame = transactionDecorator(addNewGuestToGame);
module.exports.toggleReady = transactionDecorator(toggleReady);
