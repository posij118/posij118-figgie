import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  userName: "",
  gameName: "",
  error: "",
}

const sessionReducerObject = createSlice({
  name: "sessionReducer",
  initialState,

  reducers: {
    setUserName: (state, action) => {
      state.userName = action.payload;
    },

    setGameName: (state, action) => {
      state.gameName = action.payload;
    },

    setError: (state, action) => {
      state.error = action.payload;
    },

    reset: () => initialState,
  },
});

export const sessionReducer = sessionReducerObject.reducer;
export const setUserName = sessionReducerObject.actions.setUserName;
export const setGameName = sessionReducerObject.actions.setGameName;
export const setError = sessionReducerObject.actions.setError;
export const sessionReset = sessionReducerObject.actions.reset;

export const selectUserName = (state) => state.session.userName;
export const selectGameName = (state) => state.session.gameName;
export const selectError = (state) => state.session.error;