import { useState } from "react";
import { useHistory } from "react-router";
import { postUserNameAndPassword } from "../../api/api";

export const Register = (props) => {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const history = useHistory();

  const handleSubmit = (e) => {
    e.preventDefault();
    postUserNameAndPassword(userName, password, setError, history);
  };

  return (
    <div className="registration-page">
      <div className="error-container">{error}</div>
      Please register here.
      <form onSubmit={handleSubmit}>
        <label htmlFor="username-input">Username (max 6 characters):</label>
        <input
          type="text"
          id="username-input"
          value={userName}
          maxLength="6"
          onChange={(e) => setUserName(e.target.value)}
          required
        />
        <label htmlFor="password-input">Password:</label>
        <input
          type="password"
          id="password-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </form>
    </div>
  );
};
