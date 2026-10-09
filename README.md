# kittyhome-battle-brawl

The **🌪️ Sky Brawl** server of the KittyHome Battle Arena: a knock-off brawl on a floating island for up to 24 cats: hits raise damage %, launches get longer, and knocking enemies off the edge scores; claw combos, dashes, ultimates, meteors, lightning and a crumbling edge.

Each Battle Arena game runs on its own server, so a busy game never slows down the Grid (core) or the
other games. This one runs Sky Brawl only, in as many rooms as people need: a newcomer goes to the busiest
room with space, a new room opens when they're all full (up to `MAX_ROOMS`), and extra rooms close once
they've been empty for a minute.

## How it fits together

- **Members are shared.** It uses the same MongoDB as core (`MONGODB_URI`, `MONGODB_DB`), so the same
  accounts, arena passes, coins and battle kits. Core signs people in. This server can run on any
  domain (e.g. Render's), where the session cookie never goes, so the arena page brings a battle ticket
  from core each time it connects, and this server looks it up in the database.
- **Live updates between servers** go through the database (the bus): points and coins won here show in
  the Grid straight away, and battle items bought in the Grid's shop show up here.
- **Core finds it** through its heartbeat: every 2 seconds it writes its `PUBLIC_URL` and rooms to
  `arena_servers`. The gateway and the arena page's "Choose your battle" read that from core; when the
  heartbeat stops, the game shows as offline.
- **The code** is in `src/shared/`, copied from kittyhome-shared (the battle engine, the database,
  sessions, the economy). Don't edit it here: change `shared/` in the parent repo and run
  `npm run sync:shared` there. `src/index.ts` just starts the server for Sky Brawl.

## Running it

```bash
cp .env.example .env
npm install
npm run dev          # http://localhost:5203
```

Or from the parent repo, everything together: `npm run dev`.

## Production

- Run behind HTTPS at its own address (e.g. `https://kittyhome-battle-brawl.onrender.com`) and set
  `PUBLIC_URL` to exactly that: core tells the community where this game is from it.
- `CLIENT_ORIGINS=https://community.kittyhome.org`
- The same `MONGODB_URI`, `MONGODB_DB` and `HAPPY_HOUR_UTC` as core.
- `npm run build && npm start`. On stopping (SIGTERM) it takes itself off the gateway first.

## Endpoints

| What | Where |
| --- | --- |
| Liveness | `GET /health` |
| Its rooms | `GET /status` |
| The game | Socket.IO, path `/battle`, namespace `/arena` (see `ArenaClient` / `ArenaServer` in the protocol) |
