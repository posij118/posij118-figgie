import { Link } from "react-router-dom";

export const RegistrationSuccessful = (props) => {
	return (
    <div className="registration-successful-page">
      <p>The registration was successful.</p>
			<Link to='/login'>Go back to login.</Link>
		</div>
  );
}