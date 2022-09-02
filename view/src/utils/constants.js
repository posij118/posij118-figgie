const CLIENT = {
  MESSAGE: {
    NEW_GUEST: "NEW_GUEST",
    TOGGLE_READY: "TOGGLE_READY",
    POST_ORDERS: "POST_ORDERS",
    CANCEL_SUIT_TYPE_ORDERS: "CANCEL_SUIT_TYPE_ORDERS",
    CANCEL_ALL_ORDERS: "CANCEL_ALL_ORDERS",
    FILL_ORDER: "FILL_ORDER",
    LEAVE_GAME: "LEAVE_GAME",
  },
};

const SOCKET_TYPES = {
  ITSELF: "ITSELF",
  SAME_GAME: "SAME_GAME",
  MAP_WS_ID_TO_PAYLOAD: "MAP_WS_ID_TO_PAYLOAD",
};

const TYPES = {
  ERROR: "ERROR",
  PRE_GAME_CONFIG: "PRE_GAME_CONFIG",
  GAME_CONFIG: "GAME_CONFIG",
  NEW_ORDER: "NEW_ORDER",
  CANCELED_ORDERS_IDS: "CANCELED_ORDERS_IDS",
  CANCELED_ORDERS_PLAYER_NAME: "CANCELED_ORDERS_PLAYER_NAME",
  ORDER_FILLED: "ORDER_FILLED",
  END_GAME: "END_GAME",
  PLAYER_LEFT: "PLAYER_LEFT",
};

// prettier-ignore
const SUIT_IDS_ARRAY = [
  0, 0, 0, 0, 0, 0, 0, 0,              
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
  3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3
];

const ORDERS_EMPTY = {
  bidsClubs: "",
  offersClubs: "",
  bidsSpades: "",
  offersSpades: "",
  bidsDiamonds: "",
  offersDiamonds: "",
  bidsHearts: "",
  offersHearts: "",
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = exports = {
    CLIENT,
    SOCKET_TYPES,
    TYPES,
    SUIT_IDS_ARRAY,
    ORDERS_EMPTY,
  };
}
