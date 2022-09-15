import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useHistory, useLocation } from "react-router-dom";
import { gameReset, selectPlayerNames, selectStartingTimestamp } from "../../app/game/game-slice";
import { CLIENT, TYPES } from "../../utils/constants";
import { faDoorClosed, faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./header.css";
import {
  selectUserName,
  sessionReset,
  setError,
} from "../../app/session/session.slice";
import { gamesReset } from "../../app/games/games-slice";

const announceGamesListener = (...args) => {
  const messageEvent = args[2];
  const wsClient = args[0];
  const dispatch = args[1];

  let { type } = JSON.parse(
    messageEvent.data
  );

  if (type === TYPES.ANNOUNCE_GAMES) {
    wsClient.current.send(
      JSON.stringify({
        type: CLIENT.MESSAGE.LEAVE_GAME,
      })
    );
    wsClient.current.removeEventListener("message", announceGamesListener);
    dispatch(gameReset());
  }
}

export const Header = (props) => {
  const { wsClient } = props;
  const location = useLocation();
  const history = useHistory();
  const playerNames = useSelector(selectPlayerNames);
  const userName = useSelector(selectUserName);
  const dispatch = useDispatch();
  const startingTimestamp = useSelector(selectStartingTimestamp);

  useEffect(() => {
    dispatch(setError(""));
    //eslint-disable-next-line
  }, [location]);

  const handleLeaveGame = () => {
    history.push("/lobby");
    wsClient.current.addEventListener("message", announceGamesListener.bind({}, wsClient, dispatch)); 
  };

  const handleLogout = () => {
    history.push("/logged-out");

    wsClient.current.send(
      JSON.stringify({
        type: CLIENT.MESSAGE.LOG_OUT,
      })
    );
    dispatch(gameReset());
    dispatch(gamesReset());
    dispatch(sessionReset());
  };

  return (
    <header>
      <Link to="/lobby">
        <h1>Figgie</h1>
      </Link>

      <nav>
        {new RegExp("pre-game").test(location.pathname) ||
        (!playerNames.includes(userName) &&
          new RegExp("/game").test(location.pathname)) ? (
          <span
            className="nav-leave-game nav-item"
            onClick={(e) => handleLeaveGame()}
          >
            Leave game
          </span>
        ) : (
          <></>
        )}
        {userName && !startingTimestamp ? (
          <>
            <div className="logout-container nav-item">
              <FontAwesomeIcon
                icon={faDoorClosed}
                onClick={(e) => handleLogout()}
              />
              <span className="log-out">Log out</span>
            </div>
            <div className="username-container nav-item">
              <FontAwesomeIcon icon={faUser} />
              <span className="username">{userName}</span>
            </div>
          </>
        ) : (
          <></>
        )}
      </nav>
    </header>
  );
};
