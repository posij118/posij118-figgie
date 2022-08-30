import { faUser } from "@fortawesome/free-regular-svg-icons";
import { faCoins } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import "./player.css";

export const Player = (props) => {
  return (
    <div className={`player o${props.orientation}`}>
      <div className="info">
        <div className="player-name-container">
          <FontAwesomeIcon icon={faUser} />
          <div
            className="player-name"
            style={{
              paddingRight: `${Math.max(
                0,
                String(props.chips).length - props.playerName.length
              )} rem`,
            }}
          >
            {props.playerName}
          </div>
        </div>
        <div className="chips-container">
          <FontAwesomeIcon icon={faCoins} />
          <span
            className="chips-count"
            style={{
              paddingRight: `${Math.max(
                0,
                props.playerName.length - String(props.chips).length
              )} rem`,
            }}
          >
            {Math.round(props.chips)}
          </span>
        </div>
      </div>
      <div
        className={`cards-${props.horVertOrientation}`}
        style={
          props.horVertOrientation === "vertical"
            ? { height: `${String(1.5 * props.cards.length)} rem` }
            : { width: `${String(1.5 * props.cards.length)} rem` }
        }
      >
        {props.cards.map((suit, index) => (
          <div
            className={`card-container-${props.horVertOrientation}`}
            style={
              props.horVertOrientation === "vertical"
                ? {
                    height: `${String(100 / props.cards.length)}%`,
                    zIndex: index + 1,
                  }
                : {
                    width: `${String(100 / props.cards.length)}%`,
                    zIndex: index + 1,
                  }
            }
            key={index}
          >
            <div
              className={`placeholder-card ${suit} ${
                props.cardsVisible ? "visible" : "hidden"
              }`}
            >
              {suit !== "hidden" ? (
                <img
                  className={`card-symbol ${
                    ["diamonds", "hearts"].includes(suit) ? "filter-red" : ""
                  }`}
                  src={`/assets/${suit}.svg`}
                  alt={suit}
                />
              ) : (
                <></>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
