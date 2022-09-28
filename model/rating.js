const {
  initializeAndReleaseClientDecorator,
} = require("../utils/initialize-and-release-decorator");

const getRatingByUserId = async (client, userId) => {
  const response = await client.query(`SELECT rating FROM users WHERE id=$1`, [
    userId,
  ]);

  if (!response.rows.length) return null;
  return response.rows[0].rating;
};

const getRatingDevByUserId = async (client, userId) => {
  const response = await client.query(
    `SELECT rating_dev FROM users WHERE id=$1`,
    [userId]
  );

  if (!response.rows.length) return null;
  return response.rows[0].rating_dev;
};

const getRatingVolByUserId = async (client, userId) => {
  const response = await client.query(
    `SELECT rating_vol FROM users WHERE id=$1`,
    [userId]
  );

  if (!response.rows.length) return null;
  return response.rows[0].rating_vol;
};

const getRatingsByGameId = async (client, gameId) => {
  const response = await client.query(
    `SELECT rating FROM users WHERE game_id=$1 ORDER BY id`,
    [gameId]
  );

  return response.rows.map((row) => row.rating);
};

const getRatingDevsByGameId = async (client, gameId) => {
  const response = await client.query(
    `SELECT rating_dev FROM users WHERE game_id=$1 ORDER BY id`,
    [gameId]
  );

  return response.rows.map((row) => row.rating_dev);
};

const getRatingVolsByGameId = async (client, gameId) => {
  const response = await client.query(
    `SELECT rating_vol FROM users WHERE game_id=$1 ORDER BY id`,
    [gameId]
  );

  return response.rows.map((row) => row.rating_vol);
};

const getLastGameTimestampsByGameId = async (client, gameId) => {
  const response = await client.query(
    `SELECT last_game_at FROM users WHERE game_id=$1 ORDER BY id`,
    [gameId]
  );

  return response.rows.map((row) => row.last_game_at);
};

const updateRatingDataByUserId = async (
  client,
  userId,
  newRating,
  newRatingDev,
  newRatingVol
) => {
  await client.query(
    `UPDATE users SET rating=$1, rating_dev=$2, rating_vol=$3 WHERE id=$4`,
    [newRating, newRatingDev, newRatingVol, userId]
  );
  return;
};

module.exports.getRatingByUserId = getRatingByUserId;
module.exports.getRatingDevByUserId = getRatingDevByUserId;
module.exports.getRatingsByGameId = getRatingsByGameId;
module.exports.getRatingDevsByGameId = getRatingDevsByGameId;
module.exports.getRatingVolsByGameId = getRatingVolsByGameId;
module.exports.getLastGameTimestampsByGameId = getLastGameTimestampsByGameId;
module.exports.getRatingVolByUserId = getRatingVolByUserId;
module.exports.updateRatingDataByUserId = updateRatingDataByUserId;

module.exports = initializeAndReleaseClientDecorator(module.exports);
