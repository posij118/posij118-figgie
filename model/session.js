const {
  initializeAndReleaseClientDecorator,
} = require("../utils/initialize-and-release-decorator");
const { BASE_RATING, BASE_RATING_DEV, BASE_RATING_VOL } = require("../view/src/utils/constants");

const getIsRegisteredByUserId = async (client, userId) => {
  const response = await client.query(
    `SELECT is_registered FROM users WHERE id=$1`,
    [userId]
  );

  if (!response.rows.length) return null;
  return response.rows[0].is_registered;
};

const deleteWsIdByUserId = async (client, userId) => {
  await client.query(`UPDATE users SET ws_session_id=$1 WHERE id=$2`, [
    null,
    userId,
  ]);
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
      (is_registered, username, password, registered_at, rating, rating_dev, rating_vol)
    VALUES
      ($1, $2, $3, $4, $5, $6, $7)
  `,
    [true, userName, hashedPassword, new Date(), BASE_RATING, BASE_RATING_DEV, BASE_RATING_VOL]
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
  (is_registered, ws_session_id, username, registered_at) VALUES ($1, $2, $3, $4)`,
    [false, wsId, userName, new Date()]
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

const getCardsByUserId = async (client, userId) => {
  const response = await client.query(
    `SELECT num_clubs, num_spades, num_diamonds, num_hearts FROM users WHERE id=$1`,
    [userId]
  );

  if (!response.rows.length)
    return {
      clubs: null,
      spades: null,
      diamonds: null,
      hearts: null,
    };
  return {
    clubs: response.rows[0].num_clubs,
    spades: response.rows[0].num_spades,
    diamonds: response.rows[0].num_diamonds,
    hearts: response.rows[0].num_hearts,
  };
};

const getWsIdByUserId = async (client, userId) => {
  const response = await client.query(
    `SELECT ws_session_id FROM users WHERE id=$1`,
    [userId]
  );

  if (!response.rows.length) return null;
  return response.rows[0].ws_session_id;
};

const getRegisteredAtByUserId = async (client, userId) => {
  const response = await client.query(
    `SELECT registered_at FROM users WHERE id=$1`,
    [userId]
  );

  if (!response.rows.length) return null;
  return response.rows[0].registered_at;
}

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
module.exports.getCardsByUserId = getCardsByUserId;
module.exports.getWsIdByUserId = getWsIdByUserId;
module.exports.getRegisteredAtByUserId = getRegisteredAtByUserId;

module.exports = initializeAndReleaseClientDecorator(module.exports);
