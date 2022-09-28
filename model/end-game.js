const { response } = require("express");
const {
  initializeAndReleaseClientDecorator,
} = require("../utils/initialize-and-release-decorator");

const getGoalSuitByGameId = async (client, gameId) => {
  const response = await client.query(
    `SELECT goal_suit FROM games WHERE id=$1`,
    [gameId]
  );

  if (!response.rows.length) return null;
  return response.rows[0].goal_suit;
};

const getNumCardsBySuitGameId = async (client, suit, gameId) => {
  const response = await client.query(
    `
		SELECT num_${suit} FROM users WHERE game_id=$1 ORDER BY id
	`,
    [gameId]
  );

  return response.rows.map((row) => row[`num_${suit}`]);
};

const getUserIdsByGameId = async (client, gameId) => {
  const response = await client.query(
    `SELECT id FROM users WHERE game_id=$1 ORDER BY id`,
    [gameId]
  );

  return response.rows.map((row) => row.id);
};

const updateChipsByUserId = async (client, userId, payoff) => {
  await client.query(
    `
		UPDATE users SET
		  chips=chips+$1
		WHERE id=$2
	`,
    [payoff, userId]
  );
  return;
};

const restoreUsersToDefaultByGameId = async (client, gameId) => {
  await client.query(
    `
			UPDATE users SET
				num_clubs=$3,
				num_spades=$3,
				num_diamonds=$3,
				num_hearts=$3,
				ready=$2,
				game_id=$4,
        waiting_game_id=$4
			WHERE game_id=$1 OR waiting_game_id=$1
		`,
    [gameId, false, null, null]
  );
};

const moveGameToArchiveByGameId = async (client, gameId) => {
  await client.query(
    `
		WITH moved_rows AS (
			DELETE FROM games
			WHERE id=$1
			RETURNING *
		)
		INSERT INTO games_archive
			SELECT * FROM moved_rows
	`,
    [gameId]
  );
  return;
};

const getGameNameByGameId = async (client, gameId) => {
  const response = await client.query(`SELECT name FROM games WHERE id=$1`, [
    gameId,
  ]);

  if (!response.rows.length) return null;
  return response.rows[0].name;
};

const updateGameIdByUserId = async (client, gameId, userId) => {
  await client.query(
    `
			UPDATE users SET
				game_id=$1,
        waiting_game_id=$2
			WHERE id=$3
		`,
    [gameId, null, userId]
  );
  return;
};

const deleteGameInfoByWsId = async (client, wsId) => {
  await client.query(
    `
      UPDATE users SET
        game_id=$1,
        waiting_game_id=$2,
        num_clubs=$3,
        num_spades=$4,
        num_diamonds=$5,
        num_hearts=$6,
        ready=$7,
        chips=$8
      WHERE ws_session_id=$9
    `,
    [...Array(8).map((elem) => null), wsId]
  );
  return;
};

const getUserIdByUserName = async (client, userName) => {
  const response = await client.query(
    `SELECT id FROM users WHERE username=$1`,
    [userName]
  );

  if (!response.rows.length) return null;
  return response.rows[0].id;
};

const getGameFromArchiveByGameId = async (client, gameId) => {
  const response = await client.query(
    `SELECT * FROM games_archive WHERE id=$1`,
    [gameId]
  );

  if (!response.rows.length) return null;
  return response.rows[0];
};

const setLastGameByUserId = async (client, userId) => {
  await client.query(
    `UPDATE users SET last_game_at = $1 WHERE id=$2`,
    [new Date(), userId]
  );
  return;
};

const addEntryToUsersGamesArchive = async (client, gameId, userId, chipsDelta, ratingDelta) => {
   await client.query(
    `INSERT INTO users_games_archive (
      user_id, game_id, chips_delta, rating_delta
    ) VALUES ($1, $2, $3, $4)`, [gameId, userId, chipsDelta, ratingDelta]
  );
  return;
}

module.exports.getGoalSuitByGameId = getGoalSuitByGameId;
module.exports.getNumCardsBySuitGameId = getNumCardsBySuitGameId;
module.exports.getUserIdsByGameId = getUserIdsByGameId;
module.exports.updateChipsByUserId = updateChipsByUserId;
module.exports.restoreUsersToDefaultByGameId = restoreUsersToDefaultByGameId;
module.exports.moveGameToArchiveByGameId = moveGameToArchiveByGameId;
module.exports.getGameNameByGameId = getGameNameByGameId;
module.exports.updateGameIdByUserId = updateGameIdByUserId;
module.exports.deleteGameInfoByWsId = deleteGameInfoByWsId;
module.exports.getUserIdByUserName = getUserIdByUserName;
module.exports.getGameFromArchiveByGameId = getGameFromArchiveByGameId;
module.exports.setLastGameByUserId = setLastGameByUserId;
module.exports.addEntryToUsersGamesArchive = addEntryToUsersGamesArchive;

module.exports = initializeAndReleaseClientDecorator(module.exports);
