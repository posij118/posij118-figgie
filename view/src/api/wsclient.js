import {
  updatePlayerNames,
  updateReady,
  setGameToNotLoading,
  initializeGame,
  addNewOrder,
  deleteOrderById,
  deleteOrdersByPlayerName,
  updateCardsOrChips,
  updateNumCards,
  deleteAllOrders,
  endGame,
  deletePlayer,
  updateWaitingPlayerName,
  setGameExists,
  updateStartingTimestamp,
  updateGameDuration,
  setOrders,
} from "../app/game/game-slice";
import {
  addGame,
  addPlayerForLobby,
  deleteGameById,
  deletePlayerForLobby,
  setGames,
  updateGameById,
} from "../app/games/games-slice";
import { setError } from "../app/session/session.slice";
import { SERVER, SOCKET_TYPES, TYPES } from "../utils/constants";

export const initializeWsClient = (
  wsClient,
  dispatch,
  history,
  setUserName,
  setGameName,
  setWrongPassword,
  games
) => {
  if (wsClient.current) {
    wsClient.current.onerror =
      wsClient.current.onopen =
      wsClient.current.onclose =
        null;
    wsClient.current.close();
  }

  const URL = window.location.href
    .replace(/^http/, "ws")
    .replace("3000", "8000");
  wsClient.current = new WebSocket(URL);
  wsClient.current.addEventListener("message", (messageEvent) => {
    let { socketTypesToInform, type, payload } = JSON.parse(messageEvent.data);

    switch (type) {
      case TYPES.GUEST_REGISTRATION_SUCCESSFUL:
        dispatch(setUserName(payload.userName));
        history.push("/lobby");
        break;
      case TYPES.LOGIN_SUCCESSFUL:
        dispatch(setUserName(payload.userName));
        history.push("/lobby");
        break;
      case TYPES.ERROR:
        dispatch(setError(payload));
        break;
      case TYPES.PRE_GAME_CONFIG:
        if (payload.playerNames)
          dispatch(updatePlayerNames(payload.playerNames));
        if (payload.ready) dispatch(updateReady(payload.ready));
        if (payload.chips)
          dispatch(updateCardsOrChips({ chips: payload.chips }));
        if (payload.gameId) dispatch(setGameExists());
        if (payload.gameName) dispatch(setGameName(payload.gameName));

        if (payload.gameId) history.push(`/pre-game/${payload.gameId}`);
        dispatch(setGameToNotLoading());
        if (socketTypesToInform === SOCKET_TYPES.ALL)
          dispatch(
            addGame({
              id: payload.gameId,
              name: payload.gameName,
              isRated: payload.isRated,
              players: payload.playerNames,
              hasStarted: false,
              waitingPlayerName: null,
            })
          );
        break;
      case TYPES.GAME_CONFIG:
        dispatch(
          initializeGame({
            ...payload,
            startingTimestamp: new Date().toString(),
          })
        );
        if (payload.gameId) history.push(`/game/${payload.gameId}`);
        break;
      case TYPES.NEW_ORDER:
        dispatch(addNewOrder(payload));
        break;
      case TYPES.CANCELED_ORDERS_IDS:
        payload.forEach((orderId) => dispatch(deleteOrderById(orderId)));
        break;
      case TYPES.CANCELED_ORDERS_PLAYER_NAME:
        dispatch(deleteOrdersByPlayerName(payload));
        break;
      case TYPES.ORDER_FILLED:
        if (Number.isInteger(payload.clubs))
          dispatch(updateCardsOrChips({ clubs: payload.clubs }));
        if (Number.isInteger(payload.spades))
          dispatch(updateCardsOrChips({ spades: payload.spades }));
        if (Number.isInteger(payload.diamonds))
          dispatch(updateCardsOrChips({ diamonds: payload.diamonds }));
        if (Number.isInteger(payload.hearts))
          dispatch(updateCardsOrChips({ hearts: payload.hearts }));
        dispatch(updateCardsOrChips({ chips: payload.chips }));
        dispatch(updateNumCards(payload.numCards));
        dispatch(deleteAllOrders());
        break;
      case TYPES.END_GAME:
        dispatch(
          endGame({
            chips: payload.chips,
            previousGoalSuit: payload.previousGoalSuit,
            playerNames: payload.playerNames,
            ready: payload.ready,
          })
        );
        history.push(`/pre-game/${String(payload.newGameId)}`);
        break;
      case TYPES.PLAYER_LEFT:
        dispatch(deletePlayer(payload));
        break;
      case TYPES.JOIN_EXISTING_GAME:
        dispatch(updateCardsOrChips({ chips: payload.chips }));
        dispatch(updateNumCards(payload.numCards));
        dispatch(updateStartingTimestamp(payload.startingTimestamp));
        dispatch(updateWaitingPlayerName(payload.waitingPlayerName));
        dispatch(updateGameDuration(payload.gameDuration));
        dispatch(updatePlayerNames(payload.playerNames));
        dispatch(updateReady(payload.ready));
        dispatch(setGameExists());
        dispatch(setOrders(payload.orders));
        dispatch(setGameName(payload.gameName));

        history.push(`/game/${payload.gameId}`);
        break;
      case TYPES.REJOIN_GAME:
        dispatch(
          updateCardsOrChips({
            clubs: payload.clubs,
            spades: payload.spades,
            diamonds: payload.diamonds,
            hearts: payload.hearts,
            chips: payload.chips,
          })
        );
        dispatch(updateNumCards(payload.numCards));
        dispatch(setGameName(payload.gameName));
        dispatch(updateGameDuration(payload.gameDuration));
        dispatch(updatePlayerNames(payload.playerNames));
        dispatch(updateWaitingPlayerName(payload.waitingPlayerName));
        dispatch(updateStartingTimestamp(payload.startingTimestamp));
        dispatch(setOrders(payload.orders));
        dispatch(setGameExists());

        history.push(`/game/${payload.gameId}`);
        break;
      case TYPES.ANNOUNCE_NEXT_GAME:
        const oldGame = games.find((game) => game.id === payload.gameId);
        dispatch(deleteGameById(payload.gameId));
        dispatch(
          addGame({
            ...oldGame,
            id: payload.newGameId,
            players: payload.playerNames,
            waitingPlayer: null,
            hasStarted: false,
          })
        );
        break;
      case TYPES.ANNOUNCE_WAITING_PLAYER:
        dispatch(
          updateGameById({
            id: payload.gameId,
            waitingPlayer: payload.waitingPlayerName,
          })
        );
        break;
      case TYPES.ANNOUNCE_HAS_STARTED:
        dispatch(
          updateGameById({
            id: payload.gameId,
            hasStarted: true,
          })
        );
        break;
      case TYPES.ANNOUNCE_PLAYER_JOINED:
        dispatch(
          addPlayerForLobby({
            id: payload.gameId,
            playerName: payload.playerName,
          })
        );
        break;
      case TYPES.ANNOUNCE_PLAYER_LEFT:
        dispatch(
          deletePlayerForLobby({
            id: payload.gameId,
            playerName: payload.playerName,
          })
        );
        break;
      case TYPES.ANNOUNCE_GAMES:
        dispatch(setGames(payload.games));
        break;
      case TYPES.CLOSING_MESSAGE:
        switch (payload.reason) {
          case SERVER.MESSAGE.CONNECTION_TIMED_OUT:
            history.push("/logged-out");
            break;
          case SERVER.MESSAGE.SESSION_NOT_FOUND:
            history.push("/logged-out");
            break;
          case SERVER.MESSAGE.WRONG_USERNAME_OR_PASSWORD:
            setWrongPassword(true);
            break;
          default:
            console.log("No event listener yet", payload.reason);
            break;
        }
        break;
      default:
        console.log("No event listener yet", payload);
        break;
    }
  });

  wsClient.current.onclose = (event) => {
    dispatch(setUserName(""));
    dispatch(setGameName(""));
    wsClient.current = null;
  };
  return wsClient.current;
};
