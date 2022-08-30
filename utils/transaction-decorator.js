const pool = require("../database");
const { SOCKET_TYPES, TYPES } = require('../view/src/utils/constants');

const transactionDecorator =
  (decoratedFunction) =>
  async (...args) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const response = await decoratedFunction(client, ...args);
      await client.query("END");
      return response;
    } catch (err) {
      await client.query("ROLLBACK");
      return {
        socketTypesToInform: SOCKET_TYPES.ITSELF,
        type: TYPES.ERROR,
        payload: { message: err.message, stack: err.stack },
      };
    } finally {
      client.release();
    }
  };

module.exports.transactionDecorator = transactionDecorator;
