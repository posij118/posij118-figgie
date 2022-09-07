const { getUserIdByWsId, deleteOrdersByUserId } = require("../model/game");
const {
  getIsRegisteredByUserId,
  deleteWsIdGameIdByUserId,
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
const { checkIfUserExists } = require("../model/pre-game");
const { SOCKET_TYPES, TYPES } = require("../view/src/utils/constants");

const deleteSession = async (client, wsId) => {
  const userId = await getUserIdByWsId(client, wsId);
  await deleteOrdersByUserId(client, userId);
  const isRegistered = await getIsRegisteredByUserId(client, userId);

  if (isRegistered) await deleteWsIdGameIdByUserId(client, userId);
  else await deleteUserByUserId(client, userId);
};

const deleteInactiveGame = async (client, gameId) => {
  await deleteUsersByGameId(client, gameId);
  await deleteGameByGameId(client, gameId);
};

const loginUser = async (client, socket, userName, password) => {
  const hashedPassword = await getHashedPasswordByUserName(client, userName);
  const passwordMatches = await bcrypt.compare(password, hashedPassword);

  if (passwordMatches) await updateWsIdByUserName(client, userName, socket.id);
  else socket.close();
};

const loginGuest = async (client, socket, userName) => {
  await lockUsers(client);
  if (userName.length > 6) {
    return {
      socketTypesToInform: SOCKET_TYPES.ITSELF,
      type: TYPES.ERROR,
      payload: "Username too long",
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
  };
};

module.exports.deleteSession = transactionDecorator(deleteSession);
module.exports.deleteInactiveGame = transactionDecorator(deleteInactiveGame);
module.exports.loginUser = transactionDecorator(loginUser);
module.exports.loginGuest = transactionDecorator(loginGuest);