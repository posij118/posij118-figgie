const express = require("express");
const app = express();
require("dotenv").config();
const morgan = require("morgan");
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const WebSocket = require("ws");
const {
  toggleReady,
  joinGame,
  createGame,
  rejoinGame,
} = require("./controller/pre-game");
const { v4: uuidv4 } = require("uuid");
const {
  getWsIdsByGameId,
  getGameIdOrWaitingGameIdByWsId,
} = require("./model/pre-game");
const { router } = require("./routes/routes");
const {
  CLIENT,
  SOCKET_TYPES,
  TYPES,
  SERVER,
  MALFORMED_REQUEST_OBJECT,
} = require("./view/src/utils/constants");
const {
  postOrders,
  cancelSuitTypeOrders,
  cancelAllUserOrders,
  fillOrder,
  leaveGame,
} = require("./controller/game");
const { endGame } = require("./controller/end-game");
const {
  deleteSession,
  loginUser,
  loginGuest,
  logOut,
} = require("./controller/session");
const { getIsPrivateByGameId } = require("./model/lobby");
const { joinLobby } = require("./controller/lobby");
const { tryParseJSONObject } = require("./utils/helper-functions");
const { getCardsChipsWsIdByGameId } = require("./model/game");
const types = require("pg").types;

const PORT = process.env.PORT || 8000;

types.setTypeParser(20, function (val) {
  return parseInt(val, 10);
});

app.use(morgan("dev"));
app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static("view/build"));
app.use("/", router);

const server = app.listen(PORT, () => {
  console.log("Listening on port 8000");
});

let wsServer = new WebSocket.Server({ server: app });

server.on("upgrade", (request, socket, head) => {
  wsServer.handleUpgrade(request, socket, head, (socket) => {
    wsServer.emit("connection", socket, request);
  });
});

const respondToMessage = async (socket, wss, data) => {
  // Test code provides its own wss.
  if (!wss) wss = wsServer;

  const dataParsed = tryParseJSONObject(data);
  if (!dataParsed) broadcast(socket.id, MALFORMED_REQUEST_OBJECT);
  let { type, payload } = dataParsed;
  payload = payload ?? {};
  let response, wsId;

  switch (type) {
    case CLIENT.MESSAGE.NEW_GUEST:
      wsId = uuidv4();
      wss.clients.forEach((client) => {
        if (client === socket) client.id = wsId;
      });

      response = await loginGuest(socket, payload.userName);
      break;
    case CLIENT.MESSAGE.USER_LOGIN:
      wsId = uuidv4();
      wss.clients.forEach((client) => {
        if (client === socket) client.id = wsId;
      });
      response = await loginUser(socket, payload.userName, payload.password);
      break;
    case CLIENT.MESSAGE.LOG_OUT:
      response = await logOut(socket.id);
      await broadcast(socket.id, response);
      if (!response || response.type !== TYPES.ERROR) socket.close();
      response = null;
      break;
    case CLIENT.MESSAGE.CREATE_GAME:
      response = await createGame(
        payload.gameName,
        socket,
        payload.isRated,
        payload.isPrivate
      );
      break;
    case CLIENT.MESSAGE.JOIN_GAME:
      response = await joinGame(payload.gameName, socket);
      break;
    case CLIENT.MESSAGE.TOGGLE_READY:
      response = await toggleReady(socket.id);
      if (response instanceof Array && response[0].type === TYPES.GAME_CONFIG) {
        const gameId = response[1].payload.gameId;
        const startingResponse = await getCardsChipsWsIdByGameId(null, gameId);
        const chips = startingResponse.map((row) => row.chips + 200 / startingResponse.length);

        setTimeout(
          async () => {
            const endGameResponse = await endGame(gameId, chips);
            await broadcast(socket.id, endGameResponse, wss);
          },
          process.argv[6]
            ? Number(process.argv[6].slice(16)) // Overwritten when testing
            : process.env.GAME_DURATION || 240000
        );
      }
      break;
    case CLIENT.MESSAGE.JOIN_LOBBY:
      response = await joinLobby();
      break;
    case CLIENT.MESSAGE.POST_ORDERS:
      response = await postOrders(socket.id, payload);
      break;
    case CLIENT.MESSAGE.FILL_ORDER:
      response = await fillOrder(
        socket.id,
        payload.suitTypeIdentifier,
        payload.orderId
      );
      break;
    case CLIENT.MESSAGE.CANCEL_SUIT_TYPE_ORDERS:
      response = await cancelSuitTypeOrders(socket.id, payload);
      break;
    case CLIENT.MESSAGE.CANCEL_ALL_ORDERS:
      response = await cancelAllUserOrders(socket.id);
      break;
    case CLIENT.MESSAGE.LEAVE_GAME:
      response = await leaveGame(socket.id);
      break;
    case CLIENT.MESSAGE.REJOIN_GAME:
      response = await rejoinGame(payload.gameName, socket);
      break;
  }

  await broadcast(socket.id, response, wss);
  return { response, wsId };
};

wsServer.on("connection", (socket) => {
  setInterval(() => socket.ping(), 30000);
  setTimeout(async () => {
    const response = await deleteSession(socket.id);
    await broadcast(socket.id, [
      ...response,
      {
        socketTypesToInform: SOCKET_TYPES.ITSELF,
        type: TYPES.CLOSING_MESSAGE,
        payload: { reason: SERVER.MESSAGE.CONNECTION_TIMED_OUT },
      },
    ]);
    setTimeout(() => {
      socket ? socket.close() : {};
    }, 1000);
  }, process.env.SOCKET_CLOSE || 1000 * 60 * 60 * 24);

  socket.on("message", respondToMessage.bind(null, socket, null));

  socket.on("close", async () => {
    const response = await deleteSession(socket);
    broadcast(socket.id, response);
  });
});

const broadcast = async (wsId, broadcastObject, wss) => {
  // Test code provides its own wss.
  if (!wss) wss = wsServer;

  if (!broadcastObject) return;
  if (broadcastObject instanceof Array) {
    for (const object of broadcastObject) {
      await broadcast(wsId, object, wss);
    }
    return;
  }

  let socket;
  wss.clients.forEach((client) =>
    client.id === wsId ? (socket = client) : {}
  );
  if (!socket) return;

  let gameId;
  switch (broadcastObject.socketTypesToInform) {
    case SOCKET_TYPES.ITSELF:
      socket.send(JSON.stringify(broadcastObject));
      break;
    case SOCKET_TYPES.SAME_GAME:
      gameId = await getGameIdOrWaitingGameIdByWsId(null, socket.id);
      let wsIds = [];
      if (gameId) wsIds = await getWsIdsByGameId(null, gameId);
      wss.clients.forEach((client) => {
        if (wsIds.includes(client.id) && client.readyState === WebSocket.OPEN)
          client.send(JSON.stringify(broadcastObject));
      });
      break;
    case SOCKET_TYPES.MAP_WS_ID_TO_PAYLOAD:
      Object.entries(broadcastObject.payload).forEach(([wsId, payload]) => {
        wss.clients.forEach((client) =>
          wsId === client.id && client.readyState === WebSocket.OPEN
            ? client.send(JSON.stringify(payload))
            : {}
        );
      });
      break;
    case SOCKET_TYPES.ALL:
      gameId = await getGameIdOrWaitingGameIdByWsId(null, socket.id);
      let isPrivate = await getIsPrivateByGameId(null, gameId);
      if (broadcastObject.type === TYPES.ANNOUNCE_PLAYER_LEFT) {
        gameId = broadcastObject.payload.gameId;
        isPrivate = broadcastObject.isPrivate;
      }

      if (!isPrivate)
        wss.clients.forEach((client) =>
          client.readyState === WebSocket.OPEN
            ? client.send(JSON.stringify(broadcastObject))
            : {}
        );
      break;
  }
};

module.exports = respondToMessage;
