import React from "react";
import { Link } from "react-router-dom";

export const Header = (props) => {
    return (
      <header>
        <Link to="/">
          <h1>Figgie</h1>
        </Link>
      </header>
    );
};