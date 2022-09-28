const { cleanUpDb } = require("../model/cleanup");
const { zip } = require("../utils/helper-functions");
const { mockWsServer, registerUser } = require("./backend-test");
const seed = require("seed-random");

const cleanUp = async function () {
  mockWsServer.clients = [];
  await cleanUpDb(null);
};

const registerDummyUsers = async function () {
  const userNames = ["u1", "u2", "u3"];
  const passwords = ["pass", "pass", "pass"];

  for (const [userName, password] of zip(userNames, passwords)) {
    await registerUser(userName, password);
  }
};

exports.mochaHooks = {
  afterEach: async () => {
    await cleanUp();
  },
  beforeEach: () => {
    seed(String(new Date()), { global: true });
  },
  beforeAll: async () => {
    await cleanUp();
    await registerDummyUsers();
  },
  afterAll: async () => {
    await registerDummyUsers();
  },
};
