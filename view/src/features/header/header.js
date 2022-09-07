import React from "react";
import { useSelector } from "react-redux";
import { Link, useHistory, useLocation } from "react-router-dom";
import { selectPlayerNames } from "../../app/game/game-slice";
import { CLIENT } from "../../utils/constants";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./header.css";

export const Header = (props) => {
  const { wsClient, userName } = props;
  const location = useLocation();
  const history = useHistory();
  const playerNames = useSelector(selectPlayerNames);

  const handleLeaveGame = () => {
    wsClient.current.send(
      JSON.stringify({
        type: CLIENT.MESSAGE.LEAVE_GAME,
      })
    );
    history.push("/lobby");
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
          <div className="username-container nav-item">
            <FontAwesomeIcon icon={faUser} />
            <span className="username">{userName}</span>
          </div>
        ) : (
          <></>
        )}
      </nav>
    </header>
  );
};
