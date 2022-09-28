const { WebSocket } = require("ws");
const { registerMiddleware } = require("../routes/routes");

const mockWsServer = {
  clients: [],
};

class MockSocket {
  constructor() {
    this.id = null;
    this.messages = [];
    this.readyState = WebSocket.OPEN;
    mockWsServer.clients.push(this);
  }
}

MockSocket.prototype.send = function (broadcastObject) {
  this.messages.push(JSON.parse(broadcastObject));
};

MockSocket.prototype.close = function () {
  mockWsServer.clients = mockWsServer.clients.filter(
    (client) => client !== this
  );
};

class MockRequester {
  constructor() {
    this.message = "";
    this.statusCode = null;
  }

  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  }

  send(message) {
    this.message = message;
  }
}

const registerUser = async (userName, password) => {
  const response = new MockRequester();
  await registerMiddleware({ body: { userName, password } }, response);
  return response;
};

module.exports = { MockSocket, mockWsServer, registerUser };
