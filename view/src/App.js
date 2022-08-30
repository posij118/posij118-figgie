import React, { useRef, useState } from "react";
import "./App.css";
import { Redirect, Route } from "react-router";
import { BrowserRouter as Router } from "react-router-dom";
import { Header } from "./features/header/header";
import { Game } from "./features/game/game";
import { PreGame } from "./features/pre-game/pre-game";
import { Login } from "./features/login/login";

function App() {
  const wsClient = useRef(null);
  const [gameName, setGameName] = useState('');
  const [userName, setUserName] = useState('');
  
  return (
    <div className="app">
      <Router>
        <Header />
        <Route path="/game/:gameId">
          <Game userName={userName} wsClient={wsClient} />
        </Route>
        <Route path="/pre-game/:gameId">
          <PreGame
            wsClient={wsClient}
            gameName={gameName}
            userName={userName}
          />
        </Route>
        <Route path="/login">
          <Login
            gameName={gameName}
            setGameName={setGameName}
            userName={userName}
            setUserName={setUserName}
            wsClient={wsClient}
          />
        </Route>
        <Route path="/">
          <Redirect to="/login"></Redirect>
        </Route>
      </Router>
    </div>
  );
}

export default App;
