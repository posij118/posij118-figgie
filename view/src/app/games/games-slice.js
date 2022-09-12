import { createSlice } from "@reduxjs/toolkit";

const initialState = []

const gamesReducerObject = createSlice({
  name: "games",
  initialState,
  reducers: {
    addGame: (state, action) => {
      state.push(action.payload);
      return state;
    },

    deleteGameById: (state, action) => {
      state = state.filter((game) => game.id !== action.payload);
      return state;
    },

    updateGameById: (state, action) => {
      state = state.map((game) =>
        game.id === action.payload.id
          ? {
              id: game.id,
              name: game.name,
              isRated: action.payload.isRated || game.isRated,
              players: action.payload.players || game.players,
              hasStarted: action.payload.hasStarted || game.hasStarted,
              waitingPlayer: action.payload.waitingPlayer || game.waitingPlayer,
            }
          : game
      );
      return state;
    },

    addPlayerForLobby: (state, action) => {
      state = state.map((game) =>
        game.id === action.payload.id
          ? {
              ...game,
              players: [...game.players, action.payload.playerName],
            }
          : game
      );
      return state;
    },

    deletePlayerForLobby: (state, action) => {
      state = state.map((game) =>
        game.id === action.payload.id
          ? {
              ...game,
              players: game.players.filter(
                (player) => player !== action.payload.playerName
              ),
            }
          : game
      );
      return state;
    },

    setGames: (state, action) => {
      state = action.payload;
      return state;
    },

    reset: () => initialState,
  },
});

export const gamesReducer = gamesReducerObject.reducer;
export const addGame = gamesReducerObject.actions.addGame;
export const deleteGameById = gamesReducerObject.actions.deleteGameById;
export const updateGameById = gamesReducerObject.actions.updateGameById;
export const addPlayerForLobby = gamesReducerObject.actions.addPlayerForLobby;
export const deletePlayerForLobby = gamesReducerObject.actions.deletePlayerForLobby;
export const setGames = gamesReducerObject.actions.setGames;
export const gamesReset = gamesReducerObject.actions.reset;

export const selectGames = (state) => state.games;
