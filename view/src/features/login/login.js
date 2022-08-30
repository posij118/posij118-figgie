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

    const PORT = process.env.port || 8000;
    const URL = "ws://localhost:" + String(PORT);
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
          if (payload.gameId) history.push(`/pre-game/${payload.gameId}`);
          dispatch(setGameToNotLoading());
          break;
        case TYPES.GAME_CONFIG:
          dispatch(initializeGame(payload));
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
          dispatch(updateCardsOrChips({ clubs: payload.clubs }));
          dispatch(updateCardsOrChips({ spades: payload.spades }));
          dispatch(updateCardsOrChips({ diamonds: payload.diamonds }));
          dispatch(updateCardsOrChips({ hearts: payload.hearts }));
          dispatch(updateCardsOrChips({ chips: payload.chips }));
          dispatch(updateNumCards(payload.numCards));
          dispatch(deleteAllOrders());
          break;
        case TYPES.END_GAME:
          dispatch(updateCardsOrChips({ chips: payload.chips }));
          history.push(`/pre-game/${String(payload.newGameId)}`);
          break;
        default:
          console.log("No event listener yet", payload);
          break;
      }
    });
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
