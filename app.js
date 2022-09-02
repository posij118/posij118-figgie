const express = require("express");
const app = express();
require("dotenv").config();
const morgan = require("morgan");
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const WebSocket = require("ws");
const { addNewGuestToGame, toggleReady } = require("./controller/pre-game");
const { v4: uuidv4 } = require("uuid");
const { getWsIdsByGameId, getGameIdByWsId } = require("./model/pre-game");
const router = require("./routes/routes");
const { CLIENT, SOCKET_TYPES, TYPES } = require("./view/src/utils/constants");
const {
  postOrders,
  cancelSuitTypeOrders,
  cancelAllUserOrders,
  fillOrder,
  leaveGame,
} = require("./controller/game");
const { endGame } = require("./controller/end-game");
const { deleteSession } = require("./controller/session");
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

const wsServer = new WebSocket.Server({ server: app });

server.on("upgrade", (request, socket, head) => {
  wsServer.handleUpgrade(request, socket, head, (socket) => {
    wsServer.emit("connection", socket, request);
  });
});

wsServer.on("connection", (socket) => {
  setInterval(() => socket.ping(), 30000);
  setTimeout(async () => {
    const response = await leaveGame(socket);
    broadcast(socket, response);
    deleteSession(socket.id);
    socket.close();
  }, process.env.SOCKET_CLOSE || 1000 * 60 * 60 * 24);

  socket.on("message", async (data) => {
    const { type, payload } = JSON.parse(data);
    let response;
    switch (type) {
      case CLIENT.MESSAGE.NEW_GUEST:
        const wsId = uuidv4();
        wsServer.clients.forEach((client) => {
          if (client === socket) client.id = wsId;
        });

        response = await addNewGuestToGame(
          payload.userName,
          payload.gameName,
          wsId
        );
        break;
      case CLIENT.MESSAGE.TOGGLE_READY:
        response = await toggleReady(socket);
        if (response.type === TYPES.GAME_CONFIG) {
          const gameId = await getGameIdByWsId(null, socket.id);
          setTimeout(async () => {
            const broadcastObject = await endGame(gameId);
            await broadcast(socket, broadcastObject);
          }, process.env.GAME_DURATION || 240000);
        }
        break;
      case CLIENT.MESSAGE.POST_ORDERS:
        response = await postOrders(socket, payload);
        break;
      case CLIENT.MESSAGE.CANCEL_SUIT_TYPE_ORDERS:
        response = await cancelSuitTypeOrders(socket, payload);
        break;
      case CLIENT.MESSAGE.CANCEL_ALL_ORDERS:
        response = await cancelAllUserOrders(socket);
        break;
      case CLIENT.MESSAGE.FILL_ORDER:
        response = await fillOrder(
          socket,
          payload.suitTypeIdentifier,
          payload.orderId
        );
        break;
      case CLIENT.MESSAGE.LEAVE_GAME:
        response = await leaveGame(socket);
        break;
    }

    await broadcast(socket, response);
  });

  socket.on("close", async () => {
    deleteSession(socket.id);
  });
});

const broadcast = async (socket, broadcastObject) => {
  if (broadcastObject instanceof Array) {
    broadcastObject.forEach(async (object) => await broadcast(socket, object));
    return;
  }

  switch (broadcastObject.socketTypesToInform) {
    case SOCKET_TYPES.ITSELF:
      socket.send(JSON.stringify(broadcastObject));
      break;
    case SOCKET_TYPES.SAME_GAME:
      const gameId = await getGameIdByWsId(null, socket.id);
      let wsIds = [];
      if (gameId) wsIds = await getWsIdsByGameId(null, gameId);
      wsServer.clients.forEach((client) => {
        if (wsIds.includes(client.id) && client.readyState === WebSocket.OPEN)
          client.send(JSON.stringify(broadcastObject));
      });
      break;
    case SOCKET_TYPES.MAP_WS_ID_TO_PAYLOAD:
      Object.entries(broadcastObject.payload).forEach(([wsId, payload]) => {
        wsServer.clients.forEach((client) =>
          wsId === client.id && client.readyState === WebSocket.OPEN
            ? client.send(JSON.stringify(payload))
            : {}
        );
      });
      break;
  }
};
