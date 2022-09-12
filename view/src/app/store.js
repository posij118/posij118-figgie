import { configureStore } from "@reduxjs/toolkit";
import { gameReducer } from "./game/game-slice";
import { gamesReducer } from "./games/games-slice";
import { sessionReducer } from "./session/session.slice";

export const store = configureStore({
  reducer: {
    game: gameReducer,
    session: sessionReducer,
    games: gamesReducer,
  },
});
