import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router";
import { TYPES, CLIENT } from "../../utils/constants";
import {
  setGameToLoading,
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
} from "../../app/game/game-slice";

export const Login = (props) => {
  const { userName, setUserName, gameName, setGameName, wsClient } = props;
  const dispatch = useDispatch();
  const [err, setErr] = useState(false);
  const history = useHistory();

  const handleSubmit = (e) => {
    e.preventDefault();

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

    wsClient.current.onopen = (event) => {
      dispatch(setGameToLoading());
      wsClient.current.send(
        JSON.stringify({
          type: CLIENT.MESSAGE.NEW_GUEST,
          payload: { userName, gameName },
        })
      );
    };

    wsClient.current.addEventListener("message", (messageEvent) => {
      let { type, payload } = JSON.parse(messageEvent.data);

      switch (type) {
        case TYPES.ERROR:
          setErr(payload.message + "\n" + payload.stack);
          break;
        case TYPES.PRE_GAME_CONFIG:
          if (payload.playerNames)
            dispatch(updatePlayerNames(payload.playerNames));
          if (payload.ready) dispatch(updateReady(payload.ready));
          if (payload.chips)
            dispatch(updateCardsOrChips({ chips: payload.chips }));
          if (payload.gameId) dispatch(setGameExists());

          if (payload.gameId) history.push(`/pre-game/${payload.gameId}`);
          dispatch(setGameToNotLoading());
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
          if (payload.clubs) dispatch(updateCardsOrChips({ clubs: payload.clubs }));
          if (payload.spades) dispatch(updateCardsOrChips({ spades: payload.spades }));
          if (payload.diamonds) dispatch(updateCardsOrChips({ diamonds: payload.diamonds }));
          if (payload.hearts) dispatch(updateCardsOrChips({ hearts: payload.hearts }));
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
        case TYPES.NEW_WAITING_PLAYER:
          dispatch(updateCardsOrChips({ chips: payload.chips }));
          dispatch(updateNumCards(payload.numCards));
          dispatch(updateStartingTimestamp(payload.startingTimestamp));
          dispatch(updateWaitingPlayerName(payload.waitingPlayerName));
          dispatch(updateGameDuration(payload.gameDuration));
          dispatch(updatePlayerNames(payload.playerNames));
          dispatch(updateReady(payload.ready));
          dispatch(setGameExists());
          dispatch(setOrders(payload.orders))
          history.push(`/game/${payload.gameId}`);
          break;
        default:
          console.log("No event listener yet", payload);
          break;
      }
    });

    wsClient.current.onclose = (event) => {
      history.push("/logged-out");
      props.setUserName("");
      props.setGameName("");
    };
  };

  return (
    <div className="lobby-container">
      {err ? (
        <p>{err}</p>
      ) : (
        <div className="lobby">
          <p>Or, join a game as a guest.</p>
          <form onSubmit={handleSubmit}>
            <label htmlFor="username-input">Username (max 6 characters):</label>
            <input
              type="text"
              id="username-input"
              value={userName}
              maxLength="6"
              onChange={(e) => setUserName(e.target.value)}
              required
            />
            <label htmlFor="gamename-input">Game name:</label>
            <input
              type="text"
              id="gamename-input"
              value={gameName}
              maxLength="50"
              onChange={(e) => setGameName(e.target.value)}
              required
            />
            <input type="submit" value="Play as guest" />
          </form>
        </div>
      )}
    </div>
  );
};
