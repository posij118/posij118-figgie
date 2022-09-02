import { Link } from "react-router-dom"

export const LoggedOut = (props) => {
	return (
    <div className="logged-out">
      <p>You have been logged out. Please log in again.</p>
      <Link to="/login">Back to log in.</Link>
    </div>
  );
}