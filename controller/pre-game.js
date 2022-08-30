const {
  checkIfGameExists,
  checkIfUserExists,
  getPreGameInfoByName,
  createGame,
  insertNewGuest,
  getGameIdByWsId,
  getReadyByGameId,
  updateReadyByWsId,
} = require("../model/pre-game");
const pool = require("../database");
const { SOCKET_TYPES, TYPES } = require("../view/src/utils/constants");
const { startGame } = require("./start-game");
const { transactionDecorator } = require("../utils/transaction-decorator");

const addNewGuest = async (client, userName, gameName, wsId) => {
  if (userName.length > 6 || gameName.length > 50) {
    return {
      socketTypesToInform: SOCKET_TYPES.ITSELF,
      type: TYPES.ERROR,
      payload: "Username or game name too long",
    };
  }

  const gameExists = await checkIfGameExists(client, gameName);
  const userExists = await checkIfUserExists(client, userName);
  let gameId;

  if (userExists) {
    return {
      socketTypesToInform: SOCKET_TYPES.ITSELF,
      type: TYPES.ERROR,
      payload: { message: "Username already taken", stack: "" },
    };
  }

  if (!gameExists) {
    gameId = await createGame(client, gameName, false);
  }

  const response = await getPreGameInfoByName(client, gameName);
  const numPlayers = response.length;

  if (numPlayers >= 5) {
    return {
      socketTypesToInform: SOCKET_TYPES.ITSELF,
      type: TYPES.ERROR,
      payload: { message: "Game already full", stack: "" },
    };
  }

  gameId = gameId || response[0].id;
  await insertNewGuest(client, wsId, userName, gameId);
  const playerNames = [...response.map((row) => row.username), userName];
  const ready = [...response.map((row) => row.ready), false];

  return {
    socketTypesToInform: SOCKET_TYPES.SAME_GAME,
    type: TYPES.PRE_GAME_CONFIG,
    payload: {
      gameId,
      playerNames,
      ready,
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

module.exports.addNewGuest = transactionDecorator(addNewGuest);
module.exports.toggleReady = transactionDecorator(toggleReady);
