const { assert } = require("chai");
const respondToMessage = require("../../app");
const { CLIENT, TYPES } = require("../../view/src/utils/constants");
const { mockWsServer, MockSocket } = require("../backend-test");
const { registerUser } = require("./register");
const { getUserIdByUserName } = require("../../model/end-game");
const { getWsIdByUserId } = require("../../model/session");
const { zip } = require("../../utils/helper-functions");

const mockUserLogin = async (socket, userName, password) => {
  await respondToMessage(
    socket,
    mockWsServer,
    JSON.stringify({
      type: CLIENT.MESSAGE.USER_LOGIN,
      payload: { userName, password },
    })
  );
};

describe("userLogin function", function () {
  it("logs in user", async function () {
    const userName = "user";
    const password = "password";

    await registerUser(userName, password);
    const socket = new MockSocket();
    await mockUserLogin(socket, userName, password);

    assert.equal(socket.messages[0].type, TYPES.LOGIN_SUCCESSFUL);
    assert.equal(socket.messages[0].payload.userName, userName);

    const userId = await getUserIdByUserName(null, userName);
    const wsId = await getWsIdByUserId(null, userId);

    assert.equal(wsId, socket.id);
  });

  it("rejects wrong passwords, usernames and types", async function () {
    const userName = "user";
    const password = "password";

    await registerUser(userName, password);

    const userNames = ["user", "usr", null, "user"];
    const passswords = ["wrong_password", "password", "password", {}];
    for (const [userNameToTest, passwordToTest] of zip(userNames, passswords)) {
      const socket = new MockSocket();

      await mockUserLogin(socket, userNameToTest, passwordToTest);

      assert.equal(socket.messages[0].type, TYPES.CLOSING_MESSAGE);
      const userId = await getUserIdByUserName(null, userName);
      const wsId = await getWsIdByUserId(null, userId);
      assert.notOk(wsId);
    }
  });
});

module.exports.mockUserLogin = mockUserLogin;
