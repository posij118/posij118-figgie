import { faCircleXmark, faClock } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  selectGameDuration,
  selectStartingTimestamp,
} from "../../../app/game/game-slice";
import { CLIENT, ORDERS_EMPTY } from "../../../utils/constants";
import { getSuitNameFromSuitTypeIndentifier } from "../../../utils/helper-functions-view";
import "./table.css";

export const Table = (props) => {
  const { wsClient, userName, cards, orders } = props;
  const [ordersToPost, setOrdersToPost] = useState(ORDERS_EMPTY);
  const startingTimestamp = new Date(
    useSelector(selectStartingTimestamp)
  ).getTime();
  const gameDurationMiliseconds = useSelector(selectGameDuration);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [gameFinished, setGameFinished] = useState(false);

  useEffect(() => {
    if (gameDurationMiliseconds)
      setRemainingSeconds(gameDurationMiliseconds / 1000);
  }, [gameDurationMiliseconds]);

  useEffect(() => {
    if (
      Number.isInteger(remainingSeconds) &&
      remainingSeconds >= 0 &&
      gameDurationMiliseconds &&
      startingTimestamp
    ) {
      const sleep = async () =>
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            setRemainingSeconds((prev) => prev - 1);
            resolve("DONE");
          }, Math.max(startingTimestamp - Date.now() - 1000 * (remainingSeconds - 1) + gameDurationMiliseconds, 900));
        });

      sleep();
    } else if (remainingSeconds === -1) setGameFinished(true);
  }, [remainingSeconds, startingTimestamp, gameDurationMiliseconds]);

  const handleChange = (e, suitTypeIdentifier) => {
    setOrdersToPost((prev) => {
      return {
        ...prev,
        [suitTypeIdentifier]: Number.isInteger(Number(e.target.value))
          ? e.target.value
          : prev[suitTypeIdentifier],
      };
    });
  };

  const handleSubmit = () => {
    wsClient.current.send(
      JSON.stringify({
        type: CLIENT.MESSAGE.POST_ORDERS,
        payload: ordersToPost,
      })
    );

    setOrdersToPost(ORDERS_EMPTY);
  };

  const handleFill = (suitTypeIdentifier) => {
    wsClient.current.send(
      JSON.stringify({
        type: CLIENT.MESSAGE.FILL_ORDER,
        payload: {
          suitTypeIdentifier,
          orderId: orders[suitTypeIdentifier][0].id,
        },
      })
    );
  };

  const handleCancelSuitType = (suitTypeIdentifier) => {
    wsClient.current.send(
      JSON.stringify({
        type: CLIENT.MESSAGE.CANCEL_SUIT_TYPE_ORDERS,
        payload: suitTypeIdentifier,
      })
    );
  };

  const handleCancelAll = () => {
    wsClient.current.send(
      JSON.stringify({
        type: CLIENT.MESSAGE.CANCEL_ALL_ORDERS,
      })
    );
  };

  return gameFinished ? (
    <p>The game has finished. Waiting for the confirmation of the server.</p>
  ) : (
    <div className="table">
      <h2 id="bids-header">Bids</h2>
      <h2 id="offers-header">Offers</h2>
      <div className="bids-header-container dummy-elem"></div>
      <div className="offers-header-container dummy-elem"></div>
      <div className="time-container">
        <h2>
          <FontAwesomeIcon icon={faClock} />
          <span className="time">
            {Math.floor(remainingSeconds / 60)}:{remainingSeconds % 60}
          </span>
        </h2>
      </div>

      {Object.entries(orders).map(
        ([suitTypeIdentifier, ordersArray], index) => (
          <React.Fragment key={suitTypeIdentifier}>
            <div
              className={`${
                new RegExp("bid").test(suitTypeIdentifier) ? "bids" : "offers"
              }-container order-container`}
            >
              <div className="price">
                {ordersArray.length ? ordersArray[0].price : "--"}
              </div>

              <div className="price-fill-container">
                {ordersArray.length ? (
                  <span className="poster">{ordersArray[0].poster}</span>
                ) : (
                  <span className="no-one">No one</span>
                )}

                {ordersArray.length &&
                userName !== ordersArray[0].poster &&
                (index % 2 ||
                  cards[
                    getSuitNameFromSuitTypeIndentifier(suitTypeIdentifier)
                  ]) ? (
                  <span
                    className={`fill ${index % 2 ? "hit" : "lift"}`}
                    onClick={() => handleFill(suitTypeIdentifier)}
                  >
                    {index % 2 ? "BUY" : "SELL"}
                  </span>
                ) : ordersArray.length && userName !== ordersArray[0].poster ? (
                  <></>
                ) : ordersArray.length ? (
                  <span className="cancel">
                    <FontAwesomeIcon
                      icon={faCircleXmark}
                      onClick={() => handleCancelSuitType(suitTypeIdentifier)}
                      className="cancel-icon"
                    />
                  </span>
                ) : (
                  <></>
                )}
              </div>
            </div>

            <div
              className={`${
                new RegExp("bid").test(suitTypeIdentifier) ? "bid" : "offer"
              }-input-container`}
            >
              <input
                type="text"
                min="1"
                max="99"
                maxLength="2"
                className={`${
                  new RegExp("bid").test(suitTypeIdentifier) ? "bid" : "offer"
                }-input`}
                id={`${suitTypeIdentifier}-input`}
                value={ordersToPost[suitTypeIdentifier]}
                onChange={(e) => handleChange(e, suitTypeIdentifier)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
                disabled={
                  !cards[
                    getSuitNameFromSuitTypeIndentifier(suitTypeIdentifier)
                  ] && new RegExp("offer").test(suitTypeIdentifier)
                }
              />
            </div>

            {index % 2 ? (
              <div className="image-wrapper">
                <img
                  className={`suit-image ${
                    ["diamonds", "hearts"].includes(
                      getSuitNameFromSuitTypeIndentifier(suitTypeIdentifier)
                    )
                      ? "filter-red"
                      : ""
                  }`}
                  src={`/assets/${getSuitNameFromSuitTypeIndentifier(
                    suitTypeIdentifier
                  )}.svg`}
                  alt={getSuitNameFromSuitTypeIndentifier(suitTypeIdentifier)}
                />
              </div>
            ) : (
              <></>
            )}
          </React.Fragment>
        )
      )}
      <div className="image-wrapper">
        <FontAwesomeIcon
          icon={faCircleXmark}
          className="cancel-icon cancel-icon-big"
          onClick={() => handleCancelAll()}
        />
      </div>
    </div>
  );
};
