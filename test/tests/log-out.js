const { assert } = require("chai");
const respondToMessage = require("../../app");
const { CLIENT } = require("../../view/src/utils/constants");
const { mockWsServer, MockSocket, registerUser } = require("../backend-test");
const { getUserIdByUserName } = require("../../model/end-game");
const { getWsIdByUserId } = require("../../model/session");
const { mockUserLogin } = require("./login-user");
const { mockLoginGuest } = require("./login-guest");

const mockLogOut = async (socket) => {
  await respondToMessage(
    socket,
    mockWsServer,
    JSON.stringify({
      type: CLIENT.MESSAGE.LOG_OUT,
    })
  );
};

describe("logOut function", function () {
  it("deletes a guest", async function () {
    const userName = "user";
    const socket = new MockSocket();

    await mockLoginGuest(socket, userName);
    await mockLogOut(socket);

    assert.equal(socket.messages.length, 1);
    assert.deepEqual(mockWsServer.clients, []);
    const userId = await getUserIdByUserName(null, userName);
    assert.notOk(userId);
  });

  it("only deletes wsId from a registered user", async function () {
    const userName = "user";
    const password = "password";
    const socket = new MockSocket();

    await registerUser(userName, password);
    await mockUserLogin(socket, userName, password);
    await mockLogOut(socket);

    assert.equal(socket.messages.length, 1);
    assert.deepEqual(mockWsServer.clients, []);
    const userId = await getUserIdByUserName(null, userName);
    assert.ok(userId);
    const wsId = await getWsIdByUserId(null, userId);
    assert.notOk(wsId);
  });
});

module.exports.mockLogOut = mockLogOut;
