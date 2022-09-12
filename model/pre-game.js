const {
  initializeAndReleaseClientDecorator,
} = require("../utils/initialize-and-release-decorator");

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

const insertNewGame = async (client, gameName, isRated, isPrivate) => {
  await client.query(
    "INSERT INTO games (name, is_rated, is_private) VALUES ($1, $2, $3)",
    [gameName, isRated, isPrivate]
  );
};

const getPreGameInfoByName = async (client, gameName) => {
  const response = await client.query(
    `
	SELECT users.username, users.id, users.ready, users.chips
		FROM games INNER JOIN users
			ON games.id = users.game_id
		WHERE games.name = $1
    ORDER BY users.id
	`,
    [gameName]
  );

  return response.rows;
};

const updateUserToJoinGame = async (
  client,
  userId,
  gameId,
  chips,
  gameStarted
) => {
  await client.query(
    `
		UPDATE users SET 
			game_id=$1,
      chips=$2,
      waiting_game_id=$3,
			ready=$4
		WHERE id=$5
	`,
    [
      !gameStarted ? gameId : null,
      chips,
      gameStarted ? gameId : null,
      false,
      userId,
    ]
  );
  return;
};

const getGameIdByWsId = async (client, wsId) => {
  const response = await client.query(
    `SELECT game_id, waiting_game_id FROM users WHERE ws_session_id=$1`,
    [wsId]
  );
  if (response.rows.length) return response.rows[0].game_id;
  return null;
};

const getGameIdOrWaitingGameIdByWsId = async (client, wsId) => {
  const response = await client.query(
    `SELECT game_id, waiting_game_id FROM users WHERE ws_session_id=$1`,
    [wsId]
  );
  if (response.rows.length)
    return response.rows[0].game_id || response.rows[0].waiting_game_id;
  return null;
};

const getWsIdsByGameId = async (client, gameId) => {
  const response = await client.query(
    `
	SELECT ws_session_id FROM users WHERE game_id = $1 OR waiting_game_id = $1 ORDER BY id
	`,
    [gameId]
  );

  return response.rows.map((row) => row.ws_session_id).filter((wsId) => wsId);
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

const getGameIdByGameName = async (client, gameName) => {
  const response = await client.query(`SELECT id FROM games WHERE name=$1`, [
    gameName,
  ]);

  if (!response.rows.length) return null;
  return response.rows[0].id;
};

const getNumberOfPlayingAndWatingPlayersByGameId = async (client, gameId) => {
  const response = await client.query(
    `SELECT * FROM users WHERE game_id=$1 OR waiting_game_id=$1`,
    [gameId]
  );

  return response.rows.length;
};

const checkIfGameStartedByGameId = async (client, gameId) => {
  const response = await client.query(
    `SELECT started_at FROM games WHERE id=$1`,
    [gameId]
  );

  return Boolean(response.rows[0].started_at);
};

const getIsPrivateIsRatedByGameName = async (client, gameName) => {
  const response = await client.query(
    `SELECT is_private, is_rated FROM games WHERE name=$1`,
    [gameName]
  );

  if (!response.rows.length) return null;
  return response.rows[0];
};

const lockGameName = async (client, gameName) => {
  await client.query(`SELECT * FROM games WHERE name=$1 FOR UPDATE`, [gameName]);
  return;
}

module.exports.checkIfGameExists = checkIfGameExists;
module.exports.checkIfUserExists = checkIfUserExists;
module.exports.insertNewGame = insertNewGame;
module.exports.getPreGameInfoByName = getPreGameInfoByName;
module.exports.updateUserToJoinGame = updateUserToJoinGame;
module.exports.getWsIdsByGameId = getWsIdsByGameId;
module.exports.updateReadyByWsId = updateReadyByWsId;
module.exports.getGameIdByWsId = getGameIdByWsId;
module.exports.getReadyByGameId = getReadyByGameId;
module.exports.getGameIdByGameName = getGameIdByGameName;
module.exports.getNumberOfPlayingAndWatingPlayersByGameId =
  getNumberOfPlayingAndWatingPlayersByGameId;
module.exports.checkIfGameStartedByGameId = checkIfGameStartedByGameId;
module.exports.getGameIdOrWaitingGameIdByWsId = getGameIdOrWaitingGameIdByWsId;
module.exports.getIsPrivateIsRatedByGameName = getIsPrivateIsRatedByGameName;
module.exports.lockGameName = lockGameName;

module.exports = initializeAndReleaseClientDecorator(module.exports);
