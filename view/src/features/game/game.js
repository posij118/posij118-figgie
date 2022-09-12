import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  selectCards,
  selectChips,
  selectGameExists,
  selectNumCards,
  selectOrders,
  selectPlayerNames,
  selectWaitingPlayerName,
} from "../../app/game/game-slice";
import { selectUserName } from "../../app/session/session.slice";
import { moveIndexInFront } from "../../utils/helper-functions-view";
import "./game.css";
import { Player } from "./player/player";
import { Table } from "./table/table";

export const Game = (props) => {
  const playerNamesGlobal = useSelector(selectPlayerNames);
  const numCardsGlobal = useSelector(selectNumCards);
  const chipsGlobal = useSelector(selectChips);
  const orders = useSelector(selectOrders);
  const gameExists = useSelector(selectGameExists);
  const cards = useSelector(selectCards);
  const waitingPlayerName = useSelector(selectWaitingPlayerName);
  const userName = useSelector(selectUserName);

  const { wsClient } = props;
  const [playerNames, setPlayerNames] = useState([]);
  const [playerIndex, setPlayerIndex] = useState(-1);
  const [numCards, setNumCards] = useState([]);
  const [chips, setChips] = useState([]);
  const [dataSet, setDataSet] = useState(false);

  useEffect(() => {
    if (playerNamesGlobal.length)
      setPlayerIndex(
        playerNamesGlobal.findIndex((playerName) => playerName === userName)
      );
    // eslint-disable-next-line
  }, [playerNamesGlobal]);

  useEffect(() => {
    setPlayerNames(moveIndexInFront(playerNamesGlobal, playerIndex));
    setNumCards(moveIndexInFront(numCardsGlobal, playerIndex));
    setChips(moveIndexInFront(chipsGlobal, playerIndex));
    if (playerIndex !== null) setDataSet(true);
  }, [playerIndex, playerNamesGlobal, chipsGlobal, numCardsGlobal]);

  return !gameExists ? (
    <p>Game does not exists or you don't have permission to view it.</p>
  ) : !dataSet ? (
    <p>Please wait. Data is loading.</p>
  ) : (
    <div className="game">
      {playerNames.map((playerName, index) => {
        return playerName ? (
          <Player
            orientation={String(
              Math.round(270 + (360 * index) / playerNames.length) % 360
            )}
            cards={
              playerNames[index] === userName
                ? Object.entries(cards)
                    .map(([suitName, suitCount]) =>
                      Array(suitCount).fill(suitName)
                    )
                    .reduce((cardsSectionA, cardsSectionB) =>
                      cardsSectionA.concat(cardsSectionB)
                    )
                : Array(numCards[index]).fill("hidden")
            }
            playerName={playerName}
            chips={chips[index]}
            cardsVisible={playerNames[index] === userName}
            horVertOrientation={
              index === 1 || index === playerNames.length - 1
                ? "vertical"
                : "horizontal"
            }
            key={playerName}
          />
        ) : (
          <></>
        );
      })}
      <Table
        orders={orders}
        wsClient={wsClient}
        userName={userName}
        cards={cards}
      />
      <div className="waiting-player-container">
        {waitingPlayerName ? `Waiting player: ${waitingPlayerName}` : <></>}
      </div>
    </div>
  );
};
