import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useHistory, useLocation } from "react-router-dom";
import {
  gameReset,
  selectPlayerNames,
} from "../../app/game/game-slice";
import { CLIENT } from "../../utils/constants";
import { faDoorClosed, faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./header.css";
import { selectUserName, sessionReset, setUserName } from "../../app/session/session.slice";
import { gamesReset } from "../../app/games/games-slice";

export const Header = (props) => {
  const { wsClient } = props;
  const location = useLocation();
  const history = useHistory();
  const playerNames = useSelector(selectPlayerNames);
  const userName = useSelector(selectUserName);
  const dispatch = useDispatch();

  const handleLeaveGame = () => {
    history.push("/lobby");
    wsClient.current.send(
      JSON.stringify({
        type: CLIENT.MESSAGE.LEAVE_GAME,
      })
    );
    dispatch(gameReset());
  };

  const handleLogout = () => {
    history.push("/logged-out");
    dispatch(setUserName(""));

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
        {userName ? (
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
