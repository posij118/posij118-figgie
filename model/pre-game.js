const pool = require("../database");
const { initializeAndReleaseClientDecorator } = require("../utils/initialize-and-release-decorator");

const checkIfGameExists = async (client, gameName) => {
  const response = await client.query("SELECT * FROM games WHERE name=$1", [
    gameName,
  ]);

  return Boolean(response.rows.length);
};

const checkIfUserExists = async (client, userName) => {
  const response = await client.query("SELECT * FROM users WHERE username=$1", [
    userName,
  ]);

  return Boolean(response.rows.length);
};

const createGame = async (client, gameName, isRated) => {
  const response = await client.query(
    "INSERT INTO games (name, is_rated) VALUES ($1, $2) RETURNING id",
    [gameName, isRated]
  );

  return response.rows[0].id;
};

const getPreGameInfoByName = async (client, gameName) => {
  const response = await client.query(
    `
	SELECT games.id, users.username, users.ready
		FROM games INNER JOIN users
			ON games.id = users.game_id
		WHERE games.name = $1
    ORDER BY users.id
	`,
    [gameName]
  );

  return response.rows;
};

const insertNewGuest = async (client, wsId, userName, gameId) => {
  await client.query(
    `
		INSERT INTO users (
			ws_session_id,
			username,
			game_id,
			is_registered,
			ready
		) VALUES ($1, $2, $3, $4, $5)
	`,
    [wsId, userName, gameId, false, false]
  );
  return;
};

const getGameIdByWsId = async (client, wsId) => {
  const response = await client.query(
    `SELECT game_id FROM users WHERE ws_session_id=$1`,
    [wsId]
  );
  if (response.rows.length) return response.rows[0].game_id;
  return null;
};

const getWsIdsByGameId = async (client, gameId) => {
  const response = await client.query(
    `
	SELECT ws_session_id FROM users WHERE game_id = $1 ORDER BY id
	`,
    [gameId]
  );

  return response.rows.map((row) => row.ws_session_id);
};

const updateReadyByWsId = async (client, wsId) => {
  await client.query(
    `
  UPDATE users SET ready = NOT ready WHERE ws_session_id = $1
  `,
    [wsId]
  );
  return;
};

const getReadyByGameId = async (client, gameId) => {
  const response = await client.query(
    `
	SELECT ready FROM users WHERE game_id = $1 ORDER BY id
	`,
    [gameId]
  );

  return response.rows.map((row) => row.ready);
};

module.exports.checkIfGameExists = checkIfGameExists;
module.exports.checkIfUserExists = checkIfUserExists;
module.exports.createGame = createGame;
module.exports.getPreGameInfoByName = getPreGameInfoByName;
module.exports.insertNewGuest = insertNewGuest;
module.exports.getWsIdsByGameId = getWsIdsByGameId;
module.exports.updateReadyByWsId = updateReadyByWsId;
module.exports.getGameIdByWsId = getGameIdByWsId;
module.exports.getReadyByGameId = getReadyByGameId;

module.exports = initializeAndReleaseClientDecorator(module.exports);