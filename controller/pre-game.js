const {
  getPreGameInfoByName,
  insertNewGame,
  updateUserToJoinGame,
  getGameIdByWsId,
  getReadyByGameId,
  updateReadyByWsId,
  getGameIdByGameName,
  getNumberOfPlayingAndWatingPlayersByGameId,
  checkIfGameStartedByGameId,
  getIsPrivateIsRatedByGameName,
  lockGameName,
  getWsIdsByGameId,
} = require("../model/pre-game");
const {
  SOCKET_TYPES,
  TYPES,
  SERVER,
  MALFORMED_REQUEST,
  BASE_CHIPS,
} = require("../view/src/utils/constants");
const { startGame } = require("./start-game");
const { transactionDecorator } = require("../utils/transaction-decorator");
const { deleteInactiveGame } = require("./session");
const {
  getCardsChipsWsIdByGameId,
  getStartingTimestampByGameId,
  getOrdersByGameId,
  getUserIdByWsId,
  getUserNameByUserId,
} = require("../model/game");
const {
  getIsRegisteredByUserId,
  getWaitingPlayerNameByGameId,
  getCardsByUserId,
} = require("../model/session");
const { throwError } = require("../utils/helper-functions");
const dotenv = require("dotenv").config();

const joinOrCreateGame = async (
  client,
  gameName,
  socket,
  isRated,
  isPrivate,
  actionType
) => {
  const userId = await getUserIdByWsId(client, socket.id);
  if (!userId) {
    setTimeout(() => {socket ? socket.close() : {}}, 1000);
    return {
      socketTypesToInform: SOCKET_TYPES.ITSELF,
      type: TYPES.CLOSING_MESSAGE,
      payload: { reason: SERVER.MESSAGE.SESSION_NOT_FOUND },
    };
  }

  const userGameId = await getGameIdByWsId(client, socket.id);
  if (userGameId && actionType !== "REJOIN") return throwError("User is already in another game.")

  const isRegistered = await getIsRegisteredByUserId(client, userId);
  if (!isRegistered && isRated) {
    return throwError("Guests cannot join rated games.");
  }

  const userName = await getUserNameByUserId(client, userId);
  const gameExists = Boolean(actionType !== "CREATE");
  if (!gameExists) {
    await insertNewGame(client, gameName, isRated, isPrivate);
    setTimeout(() => {
      deleteInactiveGame(gameId);
    }, process.env.GAME_TIMEOUT || 1.2 * 1000 * 60 * 60 * 24);
  }

  const gameId = await getGameIdByGameName(client, gameName);
  const response = await getPreGameInfoByName(client, gameName);
  let playerNames = response.map((row) => row.username);
  let ready = response.map((row) => row.ready);
  let chips = response.map((row) => row.chips);
  const userIds = response.map((row) => row.id);
  const indexToInsert = userIds.filter(
    (inGameUserId) => inGameUserId < userId
  ).length;

  const INITIAL_CHIPS = BASE_CHIPS;
  const numPlayers = await getNumberOfPlayingAndWatingPlayersByGameId(
    client,
    gameId
  );

  if (numPlayers >= 5 && actionType !== "REJOIN") {
    return throwError("Game already full");
  }

  if (actionType !== "REJOIN") {
    playerNames.splice(indexToInsert, 0, userName);
    ready.splice(indexToInsert, 0, false);
    chips.splice(indexToInsert, 0, INITIAL_CHIPS);
  }

  let gameStarted = false;
  if (numPlayers >= 4)
    gameStarted = await checkIfGameStartedByGameId(client, gameId);

  if (actionType !== "REJOIN")
    await updateUserToJoinGame(
      client,
      userId,
      gameId,
      INITIAL_CHIPS,
      gameStarted
    );

  if (gameStarted) {
    const waitingPlayerName = await getWaitingPlayerNameByGameId(
      client,
      gameId
    );
    const cardsChipsWsIds = await getCardsChipsWsIdByGameId(client, gameId);
    const numCards = cardsChipsWsIds.map(
      (row) =>
        row.num_clubs + row.num_spades + row.num_diamonds + row.num_hearts
    );
    const startingTimestamp = await getStartingTimestampByGameId(
      client,
      gameId
    );
    const orders = await getOrdersByGameId(client, gameId);
    const { clubs, spades, diamonds, hearts } = await getCardsByUserId(
      client,
      userId
    );

    if (actionType !== "REJOIN")
      return [
        {
          socketTypesToInform: SOCKET_TYPES.SAME_GAME,
          type: TYPES.JOIN_EXISTING_GAME,
          payload: {
            chips: chips.filter((chipsCount, index) => index !== indexToInsert),
            numCards,
            gameId,
            gameName,
            gameDuration: Number(process.env.GAME_DURATION) || 240000,
            playerNames: playerNames.filter(
              (playerName, index) => index !== indexToInsert
            ),
            ready: ready.filter((ready, index) => index !== indexToInsert),
            waitingPlayerName,
            startingTimestamp,
            userName,
            orders,
            actionType,
          },
        },
        {
          socketTypesToInform: SOCKET_TYPES.ALL,
          type: TYPES.ANNOUNCE_WAITING_PLAYER,
          payload: {
            gameId,
            waitingPlayerName,
          },
        },
      ];

    if (actionType === "REJOIN")
      return {
        socketTypesToInform: SOCKET_TYPES.ITSELF,
        type: TYPES.REJOIN_GAME,
        payload: {
          gameId,
          chips,
          numCards,
          gameName,
          gameDuration: Number(process.env.GAME_DURATION) || 240000,
          playerNames,
          waitingPlayerName,
          startingTimestamp,
          orders,
          clubs,
          spades,
          diamonds,
          hearts,
        },
      };
  }

  const broadcastObjects = [
    {
      socketTypesToInform: SOCKET_TYPES.SAME_GAME,
      type: TYPES.PRE_GAME_CONFIG,
      payload: {
        gameId,
        gameName,
        playerNames,
        isRated,
        ready,
        chips,
        userName,
      },
    },
  ];

  if (!gameExists) {
    broadcastObjects.push({
      type: TYPES.ANNOUNCE_NEW_GAME,
      socketTypesToInform: SOCKET_TYPES.ALL,
      payload: {
        gameId,
        gameName,
        isRated,
        playerNames,
      },
    });
  } else if (actionType !== "REJOIN") {
    broadcastObjects.push({
      socketTypesToInform: SOCKET_TYPES.ALL,
      type: TYPES.ANNOUNCE_PLAYER_JOINED,
      payload: {
        gameId,
        playerName: userName,
      },
    });
  }

  return broadcastObjects;
};

const toggleReady = async (client, wsId) => {
  await updateReadyByWsId(client, wsId);

  const gameId = await getGameIdByWsId(client, wsId);
  const ready = await getReadyByGameId(client, gameId);
  if (
    ready.length >= 4 &&
    ready.length <= 5 &&
    ready.reduce((a, b) => a && b)
  ) {
    const response = await startGame(client, gameId);
    return [
      response,
      {
        socketTypesToInform: SOCKET_TYPES.ALL,
        type: TYPES.ANNOUNCE_HAS_STARTED,
        payload: { gameId },
      },
    ];
  }
  return {
    socketTypesToInform: SOCKET_TYPES.SAME_GAME,
    type: TYPES.PRE_GAME_CONFIG,
    payload: { ready },
  };
};

const joinGame = async (client, gameName, socket) => {
  if (typeof gameName !== "string") throwError(MALFORMED_REQUEST);
  await lockGameName(client, gameName);

  const response = await getIsPrivateIsRatedByGameName(client, gameName);
  if (!response) return throwError("The game does not exist");

  
  const gameId = await getGameIdByGameName(client, gameName);
  const wsIds = await getWsIdsByGameId(client, gameId);
  let actionType = "JOIN";

  if (wsIds.includes(socket.id)) {
    if (response.isPrivate) actionType = "REJOIN";
    else return throwError("User is already in game.");
  }

  return await joinOrCreateGame(
    client,
    gameName,
    socket,
    response.isRated,
    response.isPrivate,
    actionType
  );
};

const createGame = async (client, gameName, socket, isRated, isPrivate) => {
  if (
    typeof gameName !== "string" ||
    typeof isRated !== "boolean" ||
    typeof isPrivate !== "boolean"
  )
    throwError(MALFORMED_REQUEST);
  await lockGameName(client, gameName);

  const gameId = await getGameIdByGameName(client, gameName);
  if (gameId) return throwError("The game already exists.");

  if (gameName.length > 50 || !gameName.length)
    return throwError("Game name too long or empty");

  if (isPrivate && isRated)
    return throwError("A game cannot be both private and rated.");

  const actionType = "CREATE";
  return await joinOrCreateGame(
    client,
    gameName,
    socket,
    isRated,
    isPrivate,
    actionType
  );
};

const rejoinGame = async (client, gameName, socket) => {
  if (typeof gameName !== "string") throwError(MALFORMED_REQUEST);
  await lockGameName(client, gameName);

  const gameId = await getGameIdByGameName(client, gameName);
  if (!gameId)
    return throwError("The game does not exist.");

  const wsIds = await getWsIdsByGameId(client, gameId);
  if (!wsIds.includes(socket.id))
    return throwError("The player is not in the game");

  const response = await getIsPrivateIsRatedByGameName(client, gameName);
  const actionType = "REJOIN";
  return await joinOrCreateGame(
    client,
    gameName,
    socket,
    response.isRated,
    response.isPrivate,
    actionType
  );
};

module.exports.joinGame = transactionDecorator(joinGame);
module.exports.createGame = transactionDecorator(createGame);
module.exports.toggleReady = transactionDecorator(toggleReady);
module.exports.rejoinGame = transactionDecorator(rejoinGame);
