const { capitalize } = require("../utils/helper-functions");
const {
  initializeAndReleaseClientDecorator,
} = require("../utils/initialize-and-release-decorator");
const { ORDERS_EMPTY } = require("../view/src/utils/constants");

const updateUserByWsId = async (client, wsId, updatedValuesWrapper) => {
  const { clubs, spades, diamonds, hearts, chips } = updatedValuesWrapper;

  await client.query(
    `
		UPDATE users SET
			num_clubs = COALESCE($1, num_clubs),
			num_spades = COALESCE($2, num_spades),
			num_diamonds = COALESCE($3, num_diamonds),
			num_hearts = COALESCE($4, num_hearts),
			chips = COALESCE($5, chips)
			WHERE ws_session_id = $6
			`,
    [
      clubs ?? null,
      spades ?? null,
      diamonds ?? null,
      hearts ?? null,
      chips ?? null,
      wsId,
    ]
  );
  return;
};

const updateGameByGameId = async (client, gameId, startedAt, goalSuit) => {
  await client.query(
    `
		UPDATE games SET
			started_at = $1,
			goal_suit = $2
			WHERE id = $3
	`,
    [startedAt, goalSuit, gameId]
  );
  return;
};

const getUserIdByWsId = async (client, wsId) => {
  const response = await client.query(
    `SELECT id FROM users WHERE ws_session_id=$1`,
    [wsId]
  );
  
  if (!response.rows.length) return null;
  return response.rows[0].id;
};

const getUserNameByUserId = async (client, userId) => {
  const response = await client.query(
    `SELECT username FROM users WHERE id=$1`,
    [userId]
  );
  return response.rows[0].username;
};

const insertNewOrder = async (client, orderParametersWrapper) => {
  const { gameId, type, suit, price, userId, timestamp } =
    orderParametersWrapper;

  const response = await client.query(
    `INSERT INTO orders (
				game_id,
				type,
				suit,
				price, 
				poster, 
				timestamp
			) VALUES (
				$1, $2, $3, $4, $5, $6
			) RETURNING id, type, suit, price, poster, timestamp
			`,
    [gameId, type, suit, price, userId, timestamp]
  );

  const newOrder = response.rows[0];
  newOrder.poster = await getUserNameByUserId(client, newOrder.poster);
  return newOrder;
};

const deleteOrdersByUserIdTypeSuit = async (client, userId, type, suit) => {
  const response = await client.query(
    `
    DELETE FROM orders
      WHERE poster=$1 AND type=$2 AND suit=$3
      RETURNING id
    `,
    [userId, type, suit]
  );

  return response.rows.map((row) => row.id);
};

const deleteOrdersByUserId = async (client, userId) => {
  await client.query("DELETE FROM orders WHERE poster=$1", [userId]);
  return;
};

const deleteOrdersByGameId = async (client, gameId) => {
  await client.query("DELETE FROM orders WHERE game_id=$1", [gameId]);
  return;
};

const getNumWithSuitByUserId = async (client, userId, suit) => {
  const response = await client.query(
    `
    SELECT num_${suit} FROM users WHERE id=$1 
  `,
    [userId]
  );
  return response.rows.length;
};

const getOrdersBySuitTypeGameId = async (client, suit, type, gameId) => {
  const response = await client.query(
    `
    SELECT * FROM orders WHERE suit=$1 AND type=$2 AND game_id=$3
  `,
    [suit, type, gameId]
  );
  return response.rows;
};

const updateGameState = async (
  client,
  posterId,
  customerId,
  suit,
  type,
  price
) => {
  await client.query(
    `
    UPDATE users SET
      num_${suit} = num_${suit} + $1,
      chips = chips + $2
    WHERE id = $3
  `,
    [
      2 * Number(type === "buy") - 1,
      (2 * Number(type === "sell") - 1) * price,
      posterId,
    ]
  );

  await client.query(
    `
    UPDATE users SET
      num_${suit} = num_${suit} + $1,
      chips = chips + $2
    WHERE id = $3
  `,
    [
      2 * Number(type === "sell") - 1,
      (2 * Number(type === "buy") - 1) * price,
      customerId,
    ]
  );
};

const getCardsChipsWsIdByGameId = async (client, gameId) => {
  const response = await client.query(
    `
    SELECT num_clubs, num_spades, num_diamonds, num_hearts, chips, ws_session_id 
      FROM users
      WHERE game_id = $1
      ORDER BY id
  `,
    [gameId]
  );

  return response.rows;
};

const lockGameId = async (client, gameId) => {
  await client.query(`SELECT * FROM users WHERE game_id=$1 FOR UPDATE`, [
    gameId,
  ]);
  await client.query(`SELECT * FROM orders WHERE game_id=$1 FOR UPDATE`, [
    gameId,
  ]);
  return;
};

const getStartingTimestampByGameId = async (client, gameId) => {
  const response = await client.query(
    `SELECT started_at FROM games WHERE id=$1`,
    [gameId]
  );

  return new Date(response.rows[0].started_at).getTime();
};

const getOrdersByGameId = async (client, gameId) => {
  const response = await client.query(`
  SELECT 
    orders.id,
    orders.price,
    orders.timestamp,
    orders.suit,
    orders.type,
    users.username
  FROM
   orders INNER JOIN users ON
   orders.poster = users.id
   WHERE orders.game_id=$1
  `, [
    gameId,
  ]);

  const orders = ORDERS_EMPTY;
  response.rows.forEach((row) => {
    orders[
      `${row.type === "buy" ? "bids" : "offers"}${capitalize(row.suit)}`
    ].push({
      price: row.price,
      timestamp: row.timestamp,
      poster: row.username,
      id: row.id,
    });
  });

  return orders;
};

module.exports.updateUserByWsId = updateUserByWsId;
module.exports.updateGameByGameId = updateGameByGameId;
module.exports.getUserIdByWsId = getUserIdByWsId;
module.exports.insertNewOrder = insertNewOrder;
module.exports.deleteOrdersByUserIdTypeSuit = deleteOrdersByUserIdTypeSuit;
module.exports.getUserNameByUserId = getUserNameByUserId;
module.exports.deleteOrdersByUserId = deleteOrdersByUserId;
module.exports.deleteOrdersByGameId = deleteOrdersByGameId;
module.exports.getNumWithSuitByUserId = getNumWithSuitByUserId;
module.exports.getOrdersBySuitTypeGameId = getOrdersBySuitTypeGameId;
module.exports.updateGameState = updateGameState;
module.exports.getCardsChipsWsIdByGameId = getCardsChipsWsIdByGameId;
module.exports.lockGameId = lockGameId;
module.exports.getStartingTimestampByGameId = getStartingTimestampByGameId;
module.exports.getOrdersByGameId = getOrdersByGameId;

module.exports = initializeAndReleaseClientDecorator(module.exports);
