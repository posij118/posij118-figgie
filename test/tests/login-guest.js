const { assert } = require("chai");
const respondToMessage = require("../../app");
const { mockWsServer, MockSocket, registerUser } = require("../backend-test");
const { getUserIdByUserName } = require("../../model/end-game");
const { CLIENT, TYPES } = require("../../view/src/utils/constants");
const { sleep } = require("../../utils/helper-functions");
const { getRegisteredAtByUserId } = require("../../model/session");

const mockLoginGuest = async (socket, userName) => {
  await respondToMessage(
    socket,
    mockWsServer,
    JSON.stringify({
      type: CLIENT.MESSAGE.NEW_GUEST,
      payload: { userName },
    })
  );
};

describe("loginGuest function", function () {
  it("logs in guest", async function () {
    const userName = "guest";
    const socket = new MockSocket();
    await mockLoginGuest(socket, userName);

    assert.equal(socket.messages[0].type, TYPES.GUEST_REGISTRATION_SUCCESSFUL);
    assert.equal(socket.messages[0].payload.userName, userName);

    const userId = await getUserIdByUserName(null, userName);
    assert.ok(userId);

    const registeredAt = await getRegisteredAtByUserId(null, userId);
    assert.closeTo(registeredAt.getTime(), Date.now(), 20);
  });

  it("refuses to log in if the name already exists", async function () {
    const userName = "user";
    const passsword = "password";
    await registerUser(userName, passsword);

    const socket = new MockSocket();
    await mockLoginGuest(socket, userName);

    assert.equal(socket.messages[0].type, TYPES.CLOSING_MESSAGE);
    assert.equal(socket.messages[0].payload.message, "Username already taken");
    await sleep(15);
    assert.deepEqual(mockWsServer.clients, []);
  });

  it("typechecks correctly", async function () {
    const userNames = [null, 42, "", "too-long"];
    for (const userName of userNames) {
      const socket = new MockSocket();
      await mockLoginGuest(socket, userName);

      assert.equal(socket.messages[0].type, TYPES.CLOSING_MESSAGE);
      const userId = await getUserIdByUserName(null, userName);
      assert.notOk(userId);
      await sleep(15);
      assert.deepEqual(mockWsServer.clients, []);
    }
  });
});

module.exports.mockLoginGuest = mockLoginGuest;
