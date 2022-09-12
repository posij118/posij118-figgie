const API_ENDPOINT = "http://" + window.location.host.replace("3000", "8000");

export const postUserNameAndPassword = (
  userName,
  password,
  setError,
  history
) => {
  fetch(`${API_ENDPOINT}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=utf-8",
    },
    body: JSON.stringify({ userName, password }),
  })
    .then(async (response) => {
      if (response.status === 400) {
        const result = await response.text();
        setError(result);
      } else {
        history.push("/registration-successful");
      }
    })
    .catch((err) => setError(err.message + err.stack));
};
