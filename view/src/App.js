import React, { useRef } from "react";
import "./App.css";
import { Redirect, Route } from "react-router";
import { BrowserRouter as Router } from "react-router-dom";
import { Header } from "./features/header/header";
import { Game } from "./features/game/game";
import { PreGame } from "./features/pre-game/pre-game";
import { Login } from "./features/login/login";
import { LoggedOut } from "./features/logged-out/logged-out";
import { Register } from "./features/register/register";
import { RegistrationSuccessful } from "./features/register/registration-successful";
import { Lobby } from "./features/lobby/lobby";
import { useSelector } from "react-redux";
import { selectError, selectUserName } from "./app/session/session.slice";

function App() {
  const wsClient = useRef(null);
  const userName = useSelector(selectUserName);
  const error = useSelector(selectError);

  return (
    <div className="app">
      {error ? (
        <div className="error-container">
          {error.message}
          <br />
          {error.stack}
        </div>
      ) : (
        <></>
      )}
      <Router>
        <Header wsClient={wsClient} />
        <Route path="/game/:gameId">
          <Game wsClient={wsClient} />
        </Route>
        <Route path="/pre-game/:gameId">
          <PreGame wsClient={wsClient} />
        </Route>
        <Route
          path="/login"
          render={(props) => <Login {...props} wsClient={wsClient} />}
        />
        <Route path="/register">
          <Register />
        </Route>
        <Route path="/registration-successful">
          <RegistrationSuccessful />
        </Route>
        <Route path="/logged-out">
          <LoggedOut />
        </Route>
        <Route path="/lobby">
          {userName ? (
            <Lobby wsClient={wsClient} />
          ) : (
            <Redirect to="/login"></Redirect>
          )}
        </Route>
        <Route path="/">
          <Redirect to="/login"></Redirect>
        </Route>
      </Router>
    </div>
  );
}

export default App;
