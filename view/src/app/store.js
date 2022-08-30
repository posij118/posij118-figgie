import { configureStore } from '@reduxjs/toolkit';
import { gameReducer } from './game/game-slice';

export const store = configureStore({
  reducer: {
    game: gameReducer,
  },
});
