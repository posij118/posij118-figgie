const {
  initializeAndReleaseClientDecorator,
} = require("../utils/initialize-and-release-decorator");

const cleanUpDb = async (client) => {
  await client.query(`DELETE FROM orders`);
  await client.query(
    `DELETE FROM users 
        WHERE NOT (username = 'u1' OR username = 'u2' OR username = 'u3')`
  );

  for (const dummyUserName of ["u1", "u2", "u3"]) {
    await restoreUserToDefaultByUserName(client, dummyUserName);
  }

  await client.query(`DELETE FROM games`);
  return;
};

const restoreUserToDefaultByUserName = async (client, userName) => {
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
          chips=$8,
          ws_session_id=$9
        WHERE username=$10 AND is_registered
      `,
    [...Array(9).map((_) => null), userName]
  );
  return;
};

const getAllOrders = async (client) => {
  const response = await client.query(`SELECT * FROM orders`);
  return response.rows;
};

module.exports.cleanUpDb = cleanUpDb;
module.exports.restoreUserToDefaultByUserName = restoreUserToDefaultByUserName;
module.exports.getAllOrders = getAllOrders;
module.exports = initializeAndReleaseClientDecorator(module.exports);
