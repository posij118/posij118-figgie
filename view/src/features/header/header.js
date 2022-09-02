import React from "react";
import { Link, useHistory, useLocation } from "react-router-dom";
import { CLIENT } from "../../utils/constants";
import "./header.css";

export const Header = (props) => {
  const { wsClient } = props;
  const location = useLocation();
  const history = useHistory();

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
        {new RegExp("pre-game").test(location.pathname) ? (
          <span
            className="nav-leave-game nav-item"
            onClick={(e) => handleLeaveGame()}
          >
            Leave game
          </span>
        ) : (
          <></>
        )}
      </nav>
    </header>
  );
};
