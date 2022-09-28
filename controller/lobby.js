const { getAllPublicGamesForLobby } = require("../model/lobby");
const { transactionDecorator } = require("../utils/transaction-decorator");
const { SOCKET_TYPES, TYPES } = require("../view/src/utils/constants");

const joinLobby = async (client) => {
  const response = await getAllPublicGamesForLobby(client);

  const games = [];
  response.rows.forEach((row) => {
    const gameIndex = games.findIndex((game) => game.id === row.id);
    if (gameIndex === -1) {
      const game = {
        id: row.id,
        name: row.name,
        isRated: row.is_rated,
        players: [],
        hasStarted: Boolean(row.started_at),
        waitingPlayer: null,
      };

      if (row.game_id) game.players.push(row.username);
      if (row.waiting_game_id) game.waitingPlayer = row.username;

      games.push(game);
    } else if (row.game_id) games[gameIndex].players.push(row.username);
    else if (row.waiting_game_id) games[gameIndex].waitingPlayer = row.username;
  });

  return {
    socketTypesToInform: SOCKET_TYPES.ITSELF,
    type: TYPES.ANNOUNCE_GAMES,
    payload: { games },
  };
};

module.exports.joinLobby = transactionDecorator(joinLobby);
