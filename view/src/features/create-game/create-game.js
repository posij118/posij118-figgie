import { useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { selectIsRegistered } from "../../app/session/session.slice";
import { CLIENT } from "../../utils/constants";
import "./create-game.css";

export const CreateGame = (props) => {
  const isRegistered = useSelector(selectIsRegistered);
  const { wsClient } = props;

  const [gameName, setGameName] = useState("");
  const [isRated, setIsRated] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  const handleChangeIsPrivate = (e) => {
    if (e.target.checked) setIsRated(false);
    setIsPrivate(e.target.checked);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    wsClient.current.send(
      JSON.stringify({
        type: CLIENT.MESSAGE.CREATE_GAME,
        payload: { gameName, isRated, isPrivate },
      })
    );
  };

  return (
    <div className="create-game">
      <form onSubmit={handleSubmit}>
        <div className="create-game-header">
          <h2>Game config</h2>
        </div>
        <div className="create-game-row">
          <label htmlFor="create-game-name">Game name:</label>
          <input
            type="text"
            maxLength="50"
            id="create-game-name"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            required
          />
        </div>
        <div className="create-game-row">
          <label htmlFor="create-game-is-rated">Rated:</label>
          <input
            type="checkbox"
            id="create-game-is-rated"
            checked={isRated}
            onChange={(e) => setIsRated(e.target.checked)}
            disabled={isPrivate || !isRegistered}
          />
        </div>
        <div className="create-game-row">
          <label htmlFor="create-game-is-private">Private:</label>
          <input
            type="checkbox"
            id="create-game-is-private"
            checked={isPrivate}
            onChange={handleChangeIsPrivate}
          />
        </div>
        <div className="create-game-footer">
          <input
            type="submit"
            className="create-game-footer-button create-game-button-green"
            value="Create game"
          />
          <Link
            to="/lobby"
            className="create-game-footer-button create-game-button-red"
          >
            Back to lobby
          </Link>
        </div>
      </form>
    </div>
  );
};
