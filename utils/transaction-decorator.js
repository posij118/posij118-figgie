const pool = require("../database");
const { TYPES, SOCKET_TYPES } = require("../view/src/utils/constants");
const dotenv = require("dotenv").config();

const transactionDecorator =
  (decoratedFunction) =>
  async (...args) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const response = await decoratedFunction(client, ...args);
      if (response && response.type === TYPES.ERROR) {
        throw response.payload;
      }
      await client.query("END");
      return response;
    } catch (err) {
      await client.query("ROLLBACK");
      return process.env.LOCAL
        ? {
            socketTypesToInform: SOCKET_TYPES.ITSELF,
            type: TYPES.ERROR,
            payload: { message: err.message, stack: err.stack },
          }
        : {
            socketTypesToInform: SOCKET_TYPES.ITSELF,
            type: TYPES.ERROR,
            payload: { message: err.message },
          };
    } finally {
      client.release();
    }
  };

module.exports.transactionDecorator = transactionDecorator;
