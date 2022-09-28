const pool = require("../database");

/*
  Usage: 
    This function should be passed to any database processing function f.
    Then f should be called client-first,
    passing a falsey value as a client makes f initialize and release its own client for the query.
*/

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

module.exports.initializeAndReleaseClientDecorator =
  initializeAndReleaseClientDecorator;
