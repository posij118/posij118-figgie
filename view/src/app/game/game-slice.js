const { createSlice } = require("@reduxjs/toolkit");
const { capitalize } = require("../../utils/helper-functions-view");

const INFINITY = 10000000000;

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
    gameDuration: null,
    previousGoalSuit: null,
    waitingPlayerName: null,
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
        gameDuration: gameConfig.gameDuration,
        previousGoalSuit: null,
        waitingPlayerName: null,
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
              (new Date(orderA.timestamp).getTime() -
                new Date(orderB.timestamp).getTime())
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

    endGame: (state, action) => {
      state = {
        playerNames: action.payload.playerNames,
        clubs: 0,
        spades: 0,
        diamonds: 0,
        hearts: 0,
        chips: action.payload.chips,
        numCards: action.payload.playerNames.map((playerName) => null),
        ready: action.payload.ready,
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
        gameDuration: null,
        previousGoalSuit: action.payload.previousGoalSuit,
        waitingPlayerName: null,
      };

      return state;
    },

    deletePlayer: (state, action) => {
      if (action.payload === state.waitingPlayerName) {
        state.waitingPlayerName = null;
        return state;
      }

      const deletedPlayerIndex = state.playerNames.findIndex(
        (playerName) => playerName === action.payload
      );
      state.playerNames.splice(deletedPlayerIndex, 1);
      state.chips.splice(deletedPlayerIndex, 1);
      state.numCards.splice(deletedPlayerIndex, 1);
      state.ready.splice(deletedPlayerIndex, 1);

      return state;
    },

    updateWaitingPlayerName: (state, action) => {
      state.waitingPlayerName = action.payload;
    },

    setGameExists: (state, action) => {
      state.gameExists = true;
    },

    updateStartingTimestamp: (state, action) => {
      state.startingTimestamp = action.payload;
    },

    updateGameDuration: (state, action) => {
      state.gameDuration = action.payload;
    },

    setOrders: (state, action) => {
      state.orders = action.payload;
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
export const endGame = gameReducerObject.actions.endGame;
export const deletePlayer = gameReducerObject.actions.deletePlayer;
export const updateWaitingPlayerName =
  gameReducerObject.actions.updateWaitingPlayerName;
export const setGameExists = gameReducerObject.actions.setGameExists;
export const updateStartingTimestamp =
  gameReducerObject.actions.updateStartingTimestamp;
export const updateGameDuration = gameReducerObject.actions.updateGameDuration;
export const setOrders = gameReducerObject.actions.setOrders;

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
export const selectStartingTimestamp = (state) => state.game.startingTimestamp;
export const selectGameDuration = (state) => state.game.gameDuration;
export const selectPreviousGoalSuit = (state) => state.game.previousGoalSuit;
export const selectWaitingPlayerName = (state) => state.game.waitingPlayerName;
