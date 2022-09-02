import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck } from "@fortawesome/free-regular-svg-icons";
import {
  selectChips,
  selectGameIsLoading,
  selectPlayerNames,
  selectPreviousGoalSuit,
  selectReady,
} from "../../app/game/game-slice";
import "./pre-game.css";
import { CLIENT } from "../../utils/constants";
import {
  capitalize,
  moveIndexInFront,
  zipThree,
} from "../../utils/helper-functions-view";

export const PreGame = (props) => {
  const { wsClient, userName, gameName } = props;
  const playerNamesGlobal = useSelector(selectPlayerNames);
  const readyGlobal = useSelector(selectReady);
  const chipsGlobal = useSelector(selectChips);
  const previousGoalSuit = useSelector(selectPreviousGoalSuit);
  const isLoading = useSelector(selectGameIsLoading);

  const [ready, setReady] = useState([]);
  const [playerNames, setPlayerNames] = useState([]);
  const [playerIndex, setPlayerIndex] = useState(null);
  const [chips, setChips] = useState([]);

  const handleClick = (e) => {
    e.preventDefault();
    setReady((prev) => [!prev[0], ...prev.slice(1)]);
    wsClient.current.send(
      JSON.stringify({ type: CLIENT.MESSAGE.TOGGLE_READY })
    );
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
    setChips(moveIndexInFront(chipsGlobal, playerIndex));
  }, [playerIndex, playerNamesGlobal, readyGlobal, chipsGlobal]);

  return (
    <div className="pre-game-container">
      {isLoading ? (
        <div>Pre-Game is loading. Please wait.</div>
      ) : (
        <div className="pre-game">
          <h2>Game {gameName}</h2>
          <p>The game starts as soon as all players press the ready button.</p>
          {previousGoalSuit ? (
            <div className="previous-goal-suit-container">
              Previous goal suit was
              <img
                className={`suit-image ${
                  ["diamonds", "hearts"].includes(previousGoalSuit)
                    ? "filter-red"
                    : ""
                }`}
                src={`/assets/${previousGoalSuit}.svg`}
                alt=""
              />
              {capitalize(previousGoalSuit)}
            </div>
          ) : (
            <></>
          )}
          <div className="pre-game-header">
            <span className="pre-game-column-header">Name</span>
            <span className="pre-game-column-header">Ready</span>
            <span className="pre-game-column-header">Chips</span>
          </div>
          <div className="pre-game-grid">
            {zipThree(playerNames, ready, chips).map(
              ([playerName, isReady, chipsCount]) => {
                return (
                  <div className="pre-game-row" key={playerName}>
                    <span className="pre-game-name">{playerName}</span>
                    {isReady ? (
                      <FontAwesomeIcon icon={faCircleCheck} />
                    ) : (
                      <div className="pre-game-ready-empty"></div>
                    )}
                    <span className="pre-game-chips">{chipsCount}</span>
                  </div>
                );
              }
            )}
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
