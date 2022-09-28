import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { selectGames } from "../../app/games/games-slice";
import { selectUserName } from "../../app/session/session.slice";
import { CLIENT } from "../../utils/constants";
import "./lobby.css";

export const Lobby = (props) => {
  const { wsClient } = props;
  const games = useSelector(selectGames);
  const userName = useSelector(selectUserName);

  const [isLoading, setIsLoading] = useState(true);
  const [gameName, setGameName] = useState("");

  useEffect(() => {
    if (wsClient.current)
      wsClient.current.send(
        JSON.stringify({
          type: CLIENT.MESSAGE.JOIN_LOBBY,
        })
      );
  }, [wsClient]);

  useEffect(() => {
    if (userName) setIsLoading(false);
  }, [userName]);

  const joinGame = (e) => {
    e.preventDefault();
    wsClient.current.send(JSON.stringify({
      type: CLIENT.MESSAGE.JOIN_GAME,
      payload: {gameName}
    }));

    setGameName("");
  };

  const handleRowClick = (e, game) => {
    let focusedElem = e.target;
    while (focusedElem.tagName !== "TR")
      focusedElem = focusedElem.parentElement;
    const gameName = focusedElem.id.slice(18);

    return game.players.includes(userName)
      ? handleRejoinGame(gameName)
      : (game.hasStarted && game.waitingPlayer) || game.players.length === 5
      ? {}
      : handleJoinGame(gameName);
  };

  const handleJoinGame = (gameName) => {
    wsClient.current.send(
      JSON.stringify({
        type: CLIENT.MESSAGE.JOIN_GAME,
        payload: { gameName },
      })
    );
  };

  const handleRejoinGame = (gameName) => {
    wsClient.current.send(
      JSON.stringify({
        type: CLIENT.MESSAGE.REJOIN_GAME,
        payload: { gameName },
      })
    );
  };

  if (isLoading) return <></>;

  return (
    <div className="lobby">
      {games.length ? (
        <table className="games-container">
          <thead className="header-container">
            <tr>
              <th className="name-column-entry">Game name</th>
              <th className="players-column-entry">Players</th>
              <th className="rated-column-entry">Rated</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => {
              return (
                <tr
                  key={game.name}
                  id={`injection-padding-${game.name}`}
                  className={`color-${
                    game.players.includes(userName) || game.waitingPlayer === userName
                      ? "green"
                      : (game.hasStarted && game.waitingPlayer) ||
                        game.players.length === 5
                      ? "red"
                      : game.hasStarted
                      ? "yellow"
                      : "green"
                  }`}
                  onClick={(e) => handleRowClick(e, game)}
                  onKeyDown={(e) =>
                    e.key === "Enter" ? handleRowClick(e, game) : {}
                  }
                  tabIndex="0"
                >
                  <td className="name-column-entry">{game.name}</td>
                  <td className="players-column-entry">
                    {game.players.map((player, index) => {
                      const prefixComma = index === 0 ? "" : ", ";
                      const isUserClassName =
                        player === userName ? "is-user" : "";

                      return (
                        <React.Fragment key={player}>
                          {prefixComma}
                          <span className={`player-name ${isUserClassName}`}>
                            {player}
                          </span>
                        </React.Fragment>
                      );
                    })}
                    {game.waitingPlayer ? (
                      <>
                        <span className="prefix-comma">, </span>
                        <span
                          className={`waiting-player-name ${
                            game.waitingPlayer === userName ? "is-user" : ""
                          }`}
                        >
                          {game.waitingPlayer}
                        </span>
                      </>
                    ) : (
                      <></>
                    )}
                  </td>
                  <td className="rated-column-entry">{String(game.isRated)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="placeholder">No games found.</div>
      )}

      <div className="lobby-footer">
        <Link to="/create-game" className="lobby-footer-button lobby-footer-button-green">
          <FontAwesomeIcon icon={faPlus} />
          Create game
        </Link>

        <form id="join-game-form" onSubmit={joinGame}>
          <label htmlFor="join-game-name">Game name</label>
          <input
            type="text"
            maxLength="50"
            id="join-game-name"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            required  
          />
          <input
            type="submit"
            value="Join Game"
            id="join-game-submit"
          />
        </form>
      </div>
    </div>
  );
};
