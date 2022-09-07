CREATE TYPE order_type AS ENUM ('buy', 'sell');
CREATE TYPE suit_type AS ENUM ('clubs', 'spades', 'diamonds', 'hearts');

CREATE TABLE games (
  id bigserial PRIMARY KEY,
  started_at timestamp,
  goal_suit suit_type,
  name varchar(50) NOT NULL UNIQUE,
  is_rated bool NOT NULL
);

CREATE TABLE users (
  id bigserial PRIMARY KEY,
  is_registered bool NOT NULL,
  ws_session_id uuid,
  username varchar(6) NOT NULL,
  password varchar(255),
  game_id bigint REFERENCES games(id),
  num_clubs integer CHECK (num_clubs >= 0 AND num_clubs <= 12),
  num_spades integer CHECK (num_spades >= 0 AND num_spades <= 12),
  num_diamonds integer CHECK (num_diamonds >= 0 AND num_diamonds <= 12),
  num_hearts integer CHECK (num_hearts >= 0 AND num_hearts <= 12),
  chips real,
  ready bool,
  waiting_game_id bigint REFERENCES games(id)
);

CREATE TABLE orders (
  id bigserial PRIMARY KEY,
  game_id bigint REFERENCES games(id) NOT NULL,
  type order_type NOT NULL,
  suit suit_type NOT NULL,
  price integer CHECK (price > 0 AND price < 100) NOT NULL,
  poster bigint REFERENCES users(id) NOT NULL,
  timestamp timestamp NOT NULL
);

CREATE TABLE games_archive (
  id bigint PRIMARY KEY,
  started_at timestamp,
  goal_suit suit_type,
  name varchar(50) NOT NULL,
  is_rated bool NOT NULL
);