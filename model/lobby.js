const {
  initializeAndReleaseClientDecorator,
} = require("../utils/initialize-and-release-decorator");

const getIsPrivateByGameId = async (client, gameId) => {
  const response = await client.query(
    `SELECT is_private FROM games WHERE id=$1`,
    [gameId]
  );

  if (!response.rows.length) return true;
  else return response.rows[0].is_private;
};

const getAllPublicGamesForLobby = async (client) => {
  const response = await client.query(
    `SELECT
      games.id,
      games.name,
      games.is_rated,
      users.username,
      games.started_at,
      users.game_id,
      users.waiting_game_id
    FROM games INNER JOIN users
    ON games.id = users.game_id OR games.id = users.waiting_game_id
    WHERE NOT games.is_private
    `
  );
  return response;
};

module.exports.getIsPrivateByGameId = getIsPrivateByGameId;
module.exports.getAllPublicGamesForLobby = getAllPublicGamesForLobby;

module.exports = initializeAndReleaseClientDecorator(module.exports);
