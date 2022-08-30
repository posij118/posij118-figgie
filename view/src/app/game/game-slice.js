const { createSlice } = require("@reduxjs/toolkit");
const { capitalize } = require("../../utils/helper-functions-view");

const INFINITY = 1000000000000000;

const gameReducerObject = createSlice({
  name: "gameReducer",
  initialState: {
    playerNames: [],
    clubs: 0,
    spades: 0,
    diamonds: 0,
    hearts: 0,
    chips: [],
    numCards: [],
    ready: [],
    orders: {
      bidsClubs: [],
      bidsSpades: [],
      bidsDiamonds: [],
      bidsHearts: [],
      offersClubs: [],
      offersSpades: [],
      offersDiamonds: [],
      offersHearts: [],
    },
    gameExists: false,
    gameIsLoading: false,
    startingTimestamp: null,
  },

  reducers: {
    initializeGame: (state, action) => {
      const gameConfig = action.payload;
      state = {
        playerNames: state.playerNames,
        clubs: gameConfig.clubs,
        spades: gameConfig.spades,
        diamonds: gameConfig.diamonds,
        hearts: gameConfig.hearts,
        chips: gameConfig.chips,
        numCards: gameConfig.numCards,
        ready: [],
        orders: {
          bidsClubs: [],
          offersClubs: [],
          bidsSpades: [],
          offersSpades: [],
          bidsDiamonds: [],
          offersDiamonds: [],
          bidsHearts: [],
          offersHearts: [],
        },
        gameExists: true,
        gameIsLoading: false,
        startingTimestamp: gameConfig.startingTimestamp,
      };

      return state;
    },

    addNewOrder: (state, action) => {
      const orderConfig = action.payload;
      const propName = `${
        orderConfig.type === "buy" ? "bid" : "offer"
      }s${capitalize(orderConfig.suit)}`;

      return {
        ...state,
        orders: {
          ...state.orders,
          [propName]: [
            ...state.orders[propName],
            {
              price: orderConfig.price,
              timestamp: orderConfig.timestamp,
              poster: orderConfig.poster,
              id: orderConfig.id,
            },
          ].sort((orderA, orderB) => {
            let directionConstant;
            if (orderConfig.type === "buy") directionConstant = 1;
            else directionConstant = -1;
            return (
              directionConstant * INFINITY * (orderB.price - orderA.price) +
              (new Date(orderB.timestamp).getTime() -
                new Date(orderA.timestamp).getTime())
            );
          }),
        },
      };
    },

    deleteOrderById: (state, action) => {
      const id = action.payload;
      state.orders = Object.fromEntries(
        Object.entries(state.orders).map(
          ([suitTypeIdentifier, ordersOfOneSuitType]) => [
            suitTypeIdentifier,
            ordersOfOneSuitType.filter((order) => order.id !== id),
          ]
        )
      );
    },

    deleteOrdersByPlayerName: (state, action) => {
      const playerName = action.payload;
      state.orders = Object.fromEntries(
        Object.entries(state.orders).map(
          ([suitTypeIdentifier, ordersOfOneSuitType]) => [
            suitTypeIdentifier,
            ordersOfOneSuitType.filter((order) => order.poster !== playerName),
          ]
        )
      );
    },

    deleteAllOrders: (state, action) => {
      state.orders = Object.fromEntries(
        Object.entries(state.orders).map(([suitTypeIdentifier, orders]) => [
          suitTypeIdentifier,
          [],
        ])
      );
    },

    updateCardsOrChips: (state, action) => {
      const propName = Object.keys(action.payload)[0];
      state[propName] = action.payload[propName];
    },

    updatePlayerNames: (state, action) => {
      state.playerNames = action.payload;
    },

    updateReady: (state, action) => {
      state.ready = action.payload;
    },

    setGameToLoading: (state, action) => {
      state.gameIsLoading = true;
    },

    setGameToNotLoading: (state, action) => {
      state.gameIsLoading = false;
    },

    updateNumCards: (state, action) => {
      state.numCards = action.payload;
    },
  },
});

export const gameReducer = gameReducerObject.reducer;
export const updateCardsOrChips = gameReducerObject.actions.updateCardsOrChips;
export const initializeGame = gameReducerObject.actions.initializeGame;
export const addNewOrder = gameReducerObject.actions.addNewOrder;
export const updateReady = gameReducerObject.actions.updateReady;
export const setGameToLoading = gameReducerObject.actions.setGameToLoading;
export const updatePlayerNames = gameReducerObject.actions.updatePlayerNames;
export const setGameToNotLoading =
  gameReducerObject.actions.setGameToNotLoading;
export const deleteOrderById = gameReducerObject.actions.deleteOrderById;
export const deleteOrdersByPlayerName =
  gameReducerObject.actions.deleteOrdersByPlayerName;
export const updateNumCards = gameReducerObject.actions.updateNumCards;
export const deleteAllOrders = gameReducerObject.actions.deleteAllOrders;

export const selectCards = (state) => {
  return {
    clubs: state.game.clubs,
    spades: state.game.spades,
    diamonds: state.game.diamonds,
    hearts: state.game.hearts,
  };
};

export const selectChips = (state) => state.game.chips;
export const selectOrders = (state) => state.game.orders;
export const selectPlayerNames = (state) => state.game.playerNames;
export const selectGameExists = (state) => state.game.gameExists;
export const selectReady = (state) => state.game.ready;
export const selectGameIsLoading = (state) => state.game.gameIsLoading;
export const selectNumCards = (state) => state.game.numCards;