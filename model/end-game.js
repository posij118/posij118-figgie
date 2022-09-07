const {
  initializeAndReleaseClientDecorator,
} = require("../utils/initialize-and-release-decorator");

const getGoalSuitByGameId = async (client, gameId) => {
  const response = await client.query(
    `SELECT goal_suit FROM games WHERE id=$1`,
    [gameId]
  );

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
				num_clubs=0,
				num_spades=0,
				num_diamonds=0,
				num_hearts=0,
				ready=$2,
				game_id=$3,
        waiting_game_id=$3
			WHERE game_id=$1 OR waiting_game_id=$1
		`,
    [gameId, false, null]
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

  return response.rows[0].name;
};

const updateGameIdByWsId = async (client, gameId, wsId) => {
  await client.query(
    `
			UPDATE users SET
				game_id=$1,
        waiting_game_id=$2
			WHERE ws_session_id=$3
		`,
    [gameId, null, wsId]
  );
  return;
};

module.exports.getGoalSuitByGameId = getGoalSuitByGameId;
module.exports.getNumCardsBySuitGameId = getNumCardsBySuitGameId;
module.exports.getUserIdsByGameId = getUserIdsByGameId;
module.exports.updateChipsByUserId = updateChipsByUserId;
module.exports.restoreUsersToDefaultByGameId = restoreUsersToDefaultByGameId;
module.exports.moveGameToArchiveByGameId = moveGameToArchiveByGameId;
module.exports.getGameNameByGameId = getGameNameByGameId;
module.exports.updateGameIdByWsId = updateGameIdByWsId;

module.exports = initializeAndReleaseClientDecorator(module.exports);
