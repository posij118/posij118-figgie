const {
  initializeAndReleaseClientDecorator,
} = require("../utils/initialize-and-release-decorator");

const getIsRegisteredByUserId = async (client, userId) => {
  const response = await client.query(
    `SELECT is_registered FROM users WHERE id=$1`,
    [userId]
  );

  return response.rows[0].is_registered;
};

const deleteWsIdByUserId = async (client, userId) => {
  await client.query(
    `UPDATE users SET ws_session_id=$1 WHERE id=$2`,
    [null, userId]
  );
  return;
};

const deleteUserByUserId = async (client, userId) => {
  await client.query(`DELETE FROM users WHERE id=$1`, [userId]);
  return;
};

const deleteGameByGameId = async (client, gameId) => {
  await client.query(`DELETE FROM games WHERE id=$1`, [gameId]);
  return;
};

const deleteUsersByGameId = async (client, gameId) => {
  await client.query(`DELETE FROM users WHERE game_id=$1`, [gameId]);
  return;
};

const lockUsers = async (client) => {
  await client.query(`SELECT * FROM users FOR UPDATE`);
  return;
};

const registerUser = async (client, userName, hashedPassword) => {
  await client.query(
    `
    INSERT INTO users
      (is_registered, username, password)
    VALUES
      ($1, $2, $3)
  `,
    [true, userName, hashedPassword]
  );
  return;
};

const getHashedPasswordByUserName = async (client, userName) => {
  const response = await client.query(
    `SELECT password FROM users WHERE username=$1`,
    [userName]
  );

  if (!response.rows.length) return null;
  return response.rows[0].password;
};

const updateWsIdByUserName = async (client, userName, wsId) => {
  await client.query(`UPDATE users SET ws_session_id=$1 WHERE username=$2`, [
    wsId,
    userName,
  ]);
  return;
};

const registerGuest = async (client, wsId, userName) => {
  await client.query(
    `INSERT INTO users 
  (is_registered, ws_session_id, username) VALUES ($1, $2, $3)`,
    [false, wsId, userName]
  );
  return;
};

const getWaitingPlayerNameByGameId = async (client, gameId) => {
  const response = await client.query(
    `SELECT username FROM users WHERE waiting_game_id=$1`,
    [gameId]
  );

  if (!response.rows.length) return null;
  return response.rows[0].username;
};

module.exports.getIsRegisteredByUserId = getIsRegisteredByUserId;
module.exports.deleteWsIdByUserId = deleteWsIdByUserId;
module.exports.deleteUserByUserId = deleteUserByUserId;
module.exports.deleteGameByGameId = deleteGameByGameId;
module.exports.deleteUsersByGameId = deleteUsersByGameId;
module.exports.lockUsers = lockUsers;
module.exports.registerUser = registerUser;
module.exports.getHashedPasswordByUserName = getHashedPasswordByUserName;
module.exports.updateWsIdByUserName = updateWsIdByUserName;
module.exports.registerGuest = registerGuest;
module.exports.getWaitingPlayerNameByGameId = getWaitingPlayerNameByGameId;

module.exports = initializeAndReleaseClientDecorator(module.exports);
