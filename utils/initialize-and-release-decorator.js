const pool = require('../database');

const initializeAndReleaseClientDecorator = (decoratedObject) =>
  Object.fromEntries(
    Object.entries(decoratedObject).map(([functionName, functionValue]) => [
      functionName,
      async (clientToConnect, ...args) => {
        const client = clientToConnect || (await pool.connect());
        const response = await functionValue(client, ...args);
        if (client !== clientToConnect) client.release();
        return response;
      },
    ])
  );

module.exports.initializeAndReleaseClientDecorator = initializeAndReleaseClientDecorator;