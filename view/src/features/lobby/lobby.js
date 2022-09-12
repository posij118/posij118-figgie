import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { selectGames } from "../../app/games/games-slice";
import { selectUserName } from "../../app/session/session.slice";
import { CLIENT } from "../../utils/constants";
import "./lobby.css";

export const Lobby = (props) => {
  const { wsClient } = props;
  const games = useSelector(selectGames);
  const userName = useSelector(selectUserName);

  const handleJoinGame = (e) => {
    const gameName = e.target.parentElement.id.slice(18);
    wsClient.current.send(
      JSON.stringify({
        type: CLIENT.MESSAGE.JOIN_GAME,
        payload: { gameName },
      })
    );
  };

  const handleRejoinGame = (e) => {
    const gameName = e.target.parentElement.id.slice(18);
    wsClient.current.send(
      JSON.stringify({
        type: CLIENT.MESSAGE.REJOIN_GAME,
        payload: { gameName },
      })
    );
  };

  useEffect(() => {
    if (wsClient.current)
      wsClient.current.send(
        JSON.stringify({
          type: CLIENT.MESSAGE.JOIN_LOBBY,
        })
      );
  }, [wsClient]);

  return (
    <div className="lobby">
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
                  game.hasStarted &&
                  (game.waitingPlayer || game.players.length === 5)
                    ? "red"
                    : game.hasStarted
                    ? "yellow"
                    : "green"
                }`}
                onClick={
                  game.hasStarted &&
                  (game.waitingPlayer || game.players.length === 5)
                    ? {}
                    : game.players.includes(userName)
                    ? handleRejoinGame
                    : handleJoinGame
                }
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
                  {game.waitingPlayer ? `, ${game.waitingPlayer}` : <></>}
                </td>
                <td className="rated-column-entry">{game.isRated}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
