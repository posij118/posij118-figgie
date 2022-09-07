export const postUserNameAndPassword = async (userName, password, setError, history) => {
  const API_ENDPOINT = window.location.href.replace("3000", "8000");
  fetch(API_ENDPOINT, { method: "POST", body: { userName, password } })
    .then((response) => {
			if (response.status === 400) setError(response.body);
			else history.push("/registration-successful");
		})
    .catch((err) => setError(err));
};
