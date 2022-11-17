# A multiplayer Websocket-based online game

Supports users authenticated with a password and guests playing multiple concurrent games. Sessions are currently handled by Websockets.

The client is written in React with Redux as its state-management library. The HTTP server used to maintain Websocket connection is returned by an Express app, which allows us to use Express routing in addition to Websockets. The game state is stored in a PostgreSQL database. The critical server-side code is tested for happy and sad paths, and I am confident that it is (nearly) bug-free.

## Known non-critical issues:
- No client-side tests - makes it harder to update the UX and being sure something does not break
- Websockets session handling - sessions are authomatically terminated when closing a tab or losing an internet connection, better way would be to use a cookie.
- Some unstyled pages

## List of awesome features to work on:
- Player ratings (server-side code already done)
- Global and user stats (clicking the profile would show user stats)
- Bots


The project will not be maintained, but feel free to make a local copy.


