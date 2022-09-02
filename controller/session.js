const { getUserIdByWsId, deleteOrdersByUserId } = require("../model/game");
const { getIsRegisteredByUserId, deleteWsIdByUserId, deleteUserByUserId, deleteGameByGameId, deleteUsersByGameId } = require("../model/session");
const { transactionDecorator } = require("../utils/transaction-decorator");

const deleteSession = async (client, wsId) => {
	const userId = await getUserIdByWsId(client, wsId);
	await deleteOrdersByUserId(client, userId);
	const isRegistered = await getIsRegisteredByUserId(client, userId);

	if (isRegistered) await deleteWsIdByUserId(client, userId);
	else await deleteUserByUserId(client, userId);
};

const deleteInactiveGame = async (client, gameId) => {
	await deleteUsersByGameId(client, gameId);
	await deleteGameByGameId(client, gameId);
};

module.exports.deleteSession = transactionDecorator(deleteSession);
module.exports.deleteInactiveGame = transactionDecorator(deleteInactiveGame);