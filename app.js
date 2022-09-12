const express = require("express");
const app = express();
require("dotenv").config();
const morgan = require("morgan");
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const WebSocket = require("ws");
const { toggleReady, joinGame, createGame, rejoinGame } = require("./controller/pre-game");
const { v4: uuidv4 } = require("uuid");
const {
  getWsIdsByGameId,
  getGameIdByWsId,
  getGameIdOrWaitingGameIdByWsId,
} = require("./model/pre-game");
const router = require("./routes/routes");
const {
  CLIENT,
  SOCKET_TYPES,
  TYPES,
  SERVER,
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
    await deleteSession(socket, broadcast);
    await broadcast(socket, {
      socketTypesToInform: SOCKET_TYPES.ITSELF,
      type: TYPES.CLOSING_MESSAGE,
      payload: { reason: SERVER.MESSAGE.CONNECTION_TIMED_OUT },
    });
    setTimeout(socket ? socket.close() : {}, 1000);
  }, process.env.SOCKET_CLOSE || 1000 * 60 * 60 * 24);

  socket.on("message", async (data) => {
    const { type, payload } = JSON.parse(data);
    let response, wsId;

    switch (type) {
      case CLIENT.MESSAGE.NEW_GUEST:
        wsId = uuidv4();
        wsServer.clients.forEach((client) => {
          if (client === socket) client.id = wsId;
        });

        response = await loginGuest(socket, payload.userName);
        break;
      case CLIENT.MESSAGE.USER_LOGIN:
        wsId = uuidv4();
        wsServer.clients.forEach((client) => {
          if (client === socket) client.id = wsId;
        });
        response = await loginUser(socket, payload.userName, payload.password);
        break;
      case CLIENT.MESSAGE.LOG_OUT:
        await logOut(socket, broadcast);
        break;
      case CLIENT.MESSAGE.JOIN_LOBBY:
        response = await joinLobby();
        break;
      case CLIENT.MESSAGE.JOIN_GAME:
        response = await joinGame(payload.gameName, socket);
        if (response.type === TYPES.JOIN_EXISTING_GAME && response.actionType === "JOIN")
          await broadcast(socket, {
            socketTypesToInform: SOCKET_TYPES.ALL,
            type: TYPES.ANNOUNCE_WAITING_PLAYER,
            payload: {
              gameId: response.payload.gameId,
              waitingPlayerName: response.payload.waitingPlayerName,
            },
          });
        if (response.type === TYPES.PRE_GAME_CONFIG)
          await broadcast(socket, {
            socketTypesToInform: SOCKET_TYPES.ALL,
            type: TYPES.ANNOUNCE_PLAYER_JOINED,
            payload: {
              gameId: response.payload.gameId,
              playerName: response.payload.userName,
            },
          });
        break;
      case CLIENT.MESSAGE.CREATE_GAME:
        response = await createGame(
          payload.gameName,
          socket,
          payload.isRated,
          payload.isPrivate
        );
        break;
      case CLIENT.MESSAGE.REJOIN_GAME:
        response = await rejoinGame(payload.gameName, socket);
        break;
      case CLIENT.MESSAGE.TOGGLE_READY:
        response = await toggleReady(socket);
        if (response.type === TYPES.GAME_CONFIG) {
          const gameId = await getGameIdByWsId(null, socket.id);
          await broadcast(socket, {
            socketTypesToInform: SOCKET_TYPES.ALL,
            type: TYPES.ANNOUNCE_HAS_STARTED,
            payload: { gameId },
          });

          setTimeout(async () => {
            console.log("Game Ending.");
            const broadcastObject = await endGame(gameId);
            await broadcast(socket, {
              socketTypesToInform: SOCKET_TYPES.ALL,
              type: TYPES.ANNOUNCE_NEXT_GAME,
              payload: {
                gameId: broadcastObject.gameId,
                newGameId: broadcastObject.newGameId,
                playerNames: broadcastObject.playerNames,
              },
            });
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
        response = await leaveGame(socket, broadcast);
        break;
    }

    await broadcast(socket, response);
  });

  socket.on("close", async () => {
    deleteSession(socket, broadcast);
  });
});

const broadcast = async (socket, broadcastObject) => {
  if (!broadcastObject) {
    console.log("Empty broadcast object");
    return;
  }
  if (broadcastObject instanceof Array) {
    broadcastObject.forEach(async (object) => await broadcast(socket, object));
    return;
  }

  let gameId;
  switch (broadcastObject.socketTypesToInform) {
    case SOCKET_TYPES.ITSELF:
      socket.send(JSON.stringify(broadcastObject));
      break;
    case SOCKET_TYPES.SAME_GAME:
      gameId = await getGameIdOrWaitingGameIdByWsId(null, socket.id);
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
    case SOCKET_TYPES.ALL:
      gameId = await getGameIdOrWaitingGameIdByWsId(null, socket.id);
      const isPrivate = await getIsPrivateByGameId(null, gameId);
      if (!isPrivate)
        wsServer.clients.forEach((client) =>
          client.readyState === WebSocket.OPEN
            ? client.send(JSON.stringify(broadcastObject))
            : {}
        );
      break;
  }
};
