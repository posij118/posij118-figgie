import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck } from "@fortawesome/free-regular-svg-icons";
import {
  selectGameIsLoading,
  selectPlayerNames,
  selectReady,
} from "../../app/game/game-slice";
import "./pre-game.css";
import { CLIENT } from "../../utils/constants";
import { moveIndexInFront, zip } from "../../utils/helper-functions-view";

export const PreGame = (props) => {
  const { wsClient, userName, gameName } = props;
  const playerNamesGlobal = useSelector(selectPlayerNames);
  const readyGlobal = useSelector(selectReady);
  const isLoading = useSelector(selectGameIsLoading);
  const [ready, setReady] = useState([]);
  const [playerNames, setPlayerNames] = useState([]);
  const [playerIndex, setPlayerIndex] = useState(null);

  const handleClick = (e) => {
    e.preventDefault();
    setReady((prev) => [!prev[0], ...prev.slice(1)]);
    wsClient.current.send(JSON.stringify({ type: CLIENT.MESSAGE.TOGGLE_READY }));
  };

  useEffect(() => {
    if (playerNamesGlobal.length)
      setPlayerIndex(
        playerNamesGlobal.findIndex((playerName) => playerName === userName)
      );
    // eslint-disable-next-line
  }, [playerNamesGlobal]);

  useEffect(() => {
    setPlayerNames(moveIndexInFront(playerNamesGlobal, playerIndex));
    setReady(moveIndexInFront(readyGlobal, playerIndex));
  }, [playerIndex, playerNamesGlobal, readyGlobal]);

  return (
    <div className="pre-game-container">
      {isLoading ? (
        <div>Pre-Game is loading. Please wait.</div>
      ) : (
        <div className="pre-game">
          <h2>Game {gameName}</h2>
          <p>The game starts as soon as all players press the ready button.</p>
          <div className="pre-game-header">
            <span className="pre-game-column-header">Name</span>
            <span className="pre-game-column-header">Ready</span>
          </div>
          <div className="pre-game-grid">
            {zip(playerNames, ready).map(([playerName, isReady]) => {
              return (
                <div className="pre-game-row" key={playerName}>
                  <span className="pre-game-name">{playerName}</span>
                  {isReady ? (
                    <FontAwesomeIcon icon={faCircleCheck} />
                  ) : (
                    <div className="pre-game-ready-empty"></div>
                  )}
                </div>
              );
            })}
          </div>
          <input
            type="submit"
            value={ready[0] ? "Unready" : "Ready"}
            className={`pre-game-toggle-ready pre-game-${String(ready[0])}`}
            onClick={handleClick}
          />
        </div>
      )}
    </div>
  );
};
