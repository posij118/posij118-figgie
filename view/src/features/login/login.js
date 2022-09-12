import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router";
import { Link } from "react-router-dom";
import { CLIENT } from "../../utils/constants";
import { setGameToLoading } from "../../app/game/game-slice";
import { initializeWsClient } from "../../api/wsclient";
import "./login.css";
import { selectError, setGameName, setUserName } from "../../app/session/session.slice";
import { selectGames } from "../../app/games/games-slice";

export const Login = (props) => {
  let { wsClient } = props;
  const dispatch = useDispatch();
  const history = useHistory();
  const games = useSelector(selectGames);
  const err = useSelector(selectError);

  const [WrongPassword, setWrongPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [userNameUser, setUserNameUser] = useState("");
  const [userNameGuest, setUserNameGuest] = useState("");
  

  const handleUserLogin = (e) => {
    e.preventDefault();
    wsClient.current = initializeWsClient(
      wsClient,
      dispatch,
      history,
      setUserName,
      setGameName,
      setWrongPassword,
      games
    );

    wsClient.current.onopen = (event) => {
      wsClient.current.send(
        JSON.stringify({
          type: CLIENT.MESSAGE.USER_LOGIN,
          payload: { userName: userNameUser, password },
        })
      );
    };

    setUserNameUser("");
    setPassword("");
  };

  const handleGuestLogin = (e) => {
    e.preventDefault();
    wsClient.current = initializeWsClient(
      wsClient,
      dispatch,
      history,
      setUserName,
      setGameName,
      setWrongPassword,
      games
    );

    wsClient.current.onopen = (event) => {
      dispatch(setGameToLoading());
      wsClient.current.send(
        JSON.stringify({
          type: CLIENT.MESSAGE.NEW_GUEST,
          payload: { userName: userNameGuest },
        })
      );
    };

    setUserNameGuest("");
  };

  return (
    <>
      {err ? (
        <p>{err}</p>
      ) : (
        <div className="login-container">
          <div className="user-login">
            <form onSubmit={handleUserLogin}>
              <label htmlFor="username-user-input">
                Username (max 6 characters):
              </label>
              <input
                type="text"
                id="username-user-input"
                value={userNameUser}
                maxLength="6"
                onChange={(e) => setUserNameUser(e.target.value)}
                required
              />
              <br />
              <label htmlFor="password-input">Password:</label>
              <input
                type="password"
                id="password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <br />
              {WrongPassword ? (
                <div className="wrong-password-text">
                  The username or password you typed in was incorrect.
                </div>
              ) : (
                <></>
              )}
              <br />
              <input type="submit" value="Login" />
            </form>
          </div>
          <div className="guest-login">
            <p>Or, join a game as a guest.</p>
            <form onSubmit={handleGuestLogin}>
              <label htmlFor="username-guest-input">
                Username (max 6 characters):
              </label>
              <input
                type="text"
                id="username-guest-input"
                value={userNameGuest}
                maxLength="6"
                onChange={(e) => setUserNameGuest(e.target.value)}
                required
              />
              <br />
              <input type="submit" value="Play as guest" />
            </form>
          </div>
          <Link to="/register" className="register-link">
            Don't have an account? Register here.
          </Link>
        </div>
      )}
    </>
  );
};
