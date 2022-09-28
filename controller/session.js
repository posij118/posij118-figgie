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
const {
  checkIfUserExists,
  getGameIdByWsId,
  checkIfGameStartedByGameId,
} = require("../model/pre-game");
const {
  SOCKET_TYPES,
  TYPES,
  SERVER,
  MALFORMED_REQUEST,
} = require("../view/src/utils/constants");
const { leaveGameUndecorated } = require("./game");
const { throwError } = require("../utils/helper-functions");

const deleteInactiveGame = async (client, gameId) => {
  await deleteUsersByGameId(client, gameId);
  await deleteGameByGameId(client, gameId);
};

const closeSocketOnUnsuccessfulLogin = (socket, message) => {
  setTimeout(
    () => {
      socket ? socket.close() : {};
    },
    process.argv[7] ? Number(process.argv[7].slice(30)) : 1000
  );

  return {
    socketTypesToInform: SOCKET_TYPES.ITSELF,
    type: TYPES.CLOSING_MESSAGE,
    payload: {
      reason: SERVER.MESSAGE.WRONG_USERNAME_OR_PASSWORD,
      message,
      stack: "",
    },
  };
};

const deleteSession = async (client, wsId) => {
  const userId = await getUserIdByWsId(client, wsId);
  const gameId = await getGameIdByWsId(client, wsId);
  let gameStarted = false;
  if (gameId) gameStarted = await checkIfGameStartedByGameId(client, gameId);

  if (!gameStarted) {
    await deleteOrdersByUserId(client, userId);
    const response = await leaveGameUndecorated(client, wsId);
    const isRegistered = await getIsRegisteredByUserId(client, userId);

    if (isRegistered) await deleteWsIdByUserId(client, userId);
    else await deleteUserByUserId(client, userId);

    return response;
  } else {
    return throwError("Users can't log out while they are in a running game.");
  }
};

const loginUser = async (client, socket, userName, password) => {
  if (typeof userName !== "string" || typeof password !== "string")
    return closeSocketOnUnsuccessfulLogin(socket, MALFORMED_REQUEST);
  const hashedPassword = await getHashedPasswordByUserName(client, userName);
  if (!hashedPassword)
    return closeSocketOnUnsuccessfulLogin(socket, "Wrong username or password");
  const passwordMatches = await bcrypt.compare(password, hashedPassword);

  if (passwordMatches) {
    await updateWsIdByUserName(client, userName, socket.id);
    return {
      socketTypesToInform: SOCKET_TYPES.ITSELF,
      type: TYPES.LOGIN_SUCCESSFUL,
      payload: { userName },
    };
  } else
    return closeSocketOnUnsuccessfulLogin(socket, "Wrong username or password");
};

const loginGuest = async (client, socket, userName) => {
  if (typeof userName !== "string")
    return closeSocketOnUnsuccessfulLogin(socket, MALFORMED_REQUEST);

  if (!userName.length || userName.length > 6) {
    return closeSocketOnUnsuccessfulLogin(socket, "Username too long or empty");
  }

  await lockUsers(client);
  const userExists = await checkIfUserExists(client, userName);
  if (userExists)
    return closeSocketOnUnsuccessfulLogin(socket, "Username already taken");

  await registerGuest(client, socket.id, userName);
  return {
    socketTypesToInform: SOCKET_TYPES.ITSELF,
    type: TYPES.GUEST_REGISTRATION_SUCCESSFUL,
    payload: { userName },
  };
};

const logOut = async (wsId) => {
  const response = await transactionDecorator(deleteSession)(wsId);
  return response;
};

module.exports.deleteSession = transactionDecorator(deleteSession);
module.exports.deleteInactiveGame = transactionDecorator(deleteInactiveGame);
module.exports.loginUser = transactionDecorator(loginUser);
module.exports.loginGuest = transactionDecorator(loginGuest);
module.exports.logOut = logOut;
