const { getUserIdByWsId, deleteOrdersByUserId } = require("../model/game");
const {
  getIsRegisteredByUserId,
  deleteWsIdByUserId,
  deleteUserByUserId,
  deleteGameByGameId,
  deleteUsersByGameId,
  getHashedPasswordByUserName,
  updateWsIdByUserName,
  lockUsers,
  registerGuest,
} = require("../model/session");
const { transactionDecorator } = require("../utils/transaction-decorator");
const bcrypt = require("bcrypt");
const { checkIfUserExists, getGameIdByWsId, checkIfGameStartedByGameId } = require("../model/pre-game");
const { SOCKET_TYPES, TYPES, SERVER } = require("../view/src/utils/constants");
const { leaveGameUndecorated } = require("./game");

const deleteSession = async (client, socket, broadcast) => {
  const userId = await getUserIdByWsId(client, socket.id);
  const isRegistered = await getIsRegisteredByUserId(client, userId);
  const gameId = await getGameIdByWsId(client, socket.id);
  let gameStarted = false;
  if (gameId) gameStarted = await checkIfGameStartedByGameId(client, gameId);

  if (isRegistered && !gameStarted) {
    await deleteOrdersByUserId(client, userId);
    await leaveGameUndecorated(client, socket, broadcast);
    await deleteWsIdByUserId(client, userId);
  } else if (!gameStarted) {
    await deleteOrdersByUserId(client, userId);
    await leaveGameUndecorated(client, socket, broadcast);
    await deleteUserByUserId(client, userId);
  } else {
    return {
      socketTypesToInform: SOCKET_TYPES.ITSELF,
      type: TYPES.ERROR,
      payload: {
        message: "Users can't log out while they are in a running game.",
        stack: "",
      },
    };
  }

  return;
};

const deleteInactiveGame = async (client, gameId) => {
  await deleteUsersByGameId(client, gameId);
  await deleteGameByGameId(client, gameId);
};

const closeSocketOnUnsuccessfulLogin = (socket) => {
  setTimeout(() => {
    socket ? socket.close() : {};
  }, 1000);
  return {
    socketTypesToInform: SOCKET_TYPES.ITSELF,
    type: TYPES.CLOSING_MESSAGE,
    payload: { reason: SERVER.MESSAGE.WRONG_USERNAME_OR_PASSWORD },
  };
};

const loginUser = async (client, socket, userName, password) => {
  const hashedPassword = await getHashedPasswordByUserName(client, userName);
  if (!hashedPassword) return closeSocketOnUnsuccessfulLogin(socket);
  const passwordMatches = await bcrypt.compare(password, hashedPassword);

  if (passwordMatches) {
    await updateWsIdByUserName(client, userName, socket.id);
    return {
      socketTypesToInform: SOCKET_TYPES.ITSELF,
      type: TYPES.LOGIN_SUCCESSFUL,
      payload: { userName },
    };
  } else return closeSocketOnUnsuccessfulLogin(socket);
};

const loginGuest = async (client, socket, userName) => {
  await lockUsers(client);
  if (userName.length > 6) {
    return {
      socketTypesToInform: SOCKET_TYPES.ITSELF,
      type: TYPES.ERROR,
      payload: { message: "Username too long", stack: "" },
    };
  }

  const userExists = await checkIfUserExists(client, userName);

  if (userExists) {
    return {
      socketTypesToInform: SOCKET_TYPES.ITSELF,
      type: TYPES.ERROR,
      payload: { message: "Username already taken", stack: "" },
    };
  }

  await registerGuest(client, socket.id, userName);
  return {
    socketTypesToInform: SOCKET_TYPES.ITSELF,
    type: TYPES.GUEST_REGISTRATION_SUCCESSFUL,
    payload: { userName },
  };
};

const logOut = async (socket, broadcast) => {
  const response = await transactionDecorator(deleteSession)(socket, broadcast);
  if (!response || response.type !== TYPES.ERROR) socket.close();
  return response;
};

module.exports.deleteSession = transactionDecorator(deleteSession);
module.exports.deleteInactiveGame = transactionDecorator(deleteInactiveGame);
module.exports.loginUser = transactionDecorator(loginUser);
module.exports.loginGuest = transactionDecorator(loginGuest);
module.exports.logOut = logOut;
