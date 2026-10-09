// Copied from kittyhome-shared (src/battle/server.ts) by `npm run sync:shared` in the parent repo.
// Don't edit this copy: change shared/src/battle/server.ts and sync.
/**
 * A battle server: one game (Paw Blaster, Summit Rush or Sky Brawl) and as many rooms of it as people
 * need. Each game runs on its own server (kittyhome-battle-blaster, -summit, -brawl), so a busy game
 * never slows down the Grid or the other games.
 *
 * - Members: the same database as core, so the same accounts, arena passes, coins and battle kits.
 *   Who's connecting: a battle ticket from core (the page gets one just before it connects, since the
 *   session cookie doesn't reach a server on another domain), or else the session cookie. Points and coins won here show in the
 *   Grid straight away (the bus), and items bought in the Grid's shop show up here.
 * - Rooms: a newcomer goes to the busiest room that still has space (or the one they ask for); when
 *   every room is full a new one opens (up to MAX_ROOMS), and extra rooms close once they've been
 *   empty a minute. Room 1 is always there.
 * - Heartbeat: every 2 seconds it writes where it is and its rooms to arena_servers; core reads that
 *   for the gateway and the arena's "Choose your battle" (and knows a game is offline when it stops).
 *
 * Socket.IO on path /battle, namespace /arena (see ArenaClient and ArenaServer in the protocol).
 */
import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { stopBus } from "../bus.js";
import { arenaServers, closeDb, connectDb, users } from "../db.js";
import { economyEvents, listenToOtherServers } from "../economy.js";
import { ARENA_GAMES, EMOTES, type ArenaGame, type ArenaRoomInfo, type BattleItemId, type BattleKit, type Emote } from "../protocol.js";
import { getUserByTicket, getUserFromCookieHeader } from "../session.js";
import { flushTime, trackTime } from "../timeSpent.js";
import { createRoom, passActive, type ArenaNamespace, type ArenaSocket, type Room } from "./engine.js";

const TICK_MS = 50;
const HEARTBEAT_MS = 2_000;
/** An extra room closes after it's been empty this long */
const EMPTY_ROOM_MS = 60_000;

const list = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim().replace(/\/$/, ""))
    .filter(Boolean);

export type BattleServerOptions = {
  /** Where it listens and where browsers reach it, by default */
  port: number;
};

/** Starts a battle server for one game (PORT, PUBLIC_URL, CLIENT_ORIGINS and MAX_ROOMS from the environment) */
export async function startBattleServer(game: ArenaGame, defaults: BattleServerOptions) {
  const port = Number(process.env.PORT ?? defaults.port);
  const publicUrl = (process.env.PUBLIC_URL ?? `http://localhost:${port}`).replace(/\/$/, "");
  const origins = list(process.env.CLIENT_ORIGINS ?? "http://localhost:5187");
  const maxRooms = Math.max(1, Number(process.env.MAX_ROOMS ?? 20) || 20);
  const name = ARENA_GAMES[game].name;

  await connectDb({ setup: false });
  listenToOtherServers();

  const app = express();
  app.disable("x-powered-by");
  app.use(cors({ origin: origins, credentials: true }));
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    path: "/battle",
    cors: { origin: origins, credentials: true },
    // Only the community's pages (the session cookie comes along, so other sites can't use it)
    allowRequest: (req, done) => {
      const origin = req.headers.origin?.replace(/\/$/, "");
      done(null, !origin || origins.includes(origin));
    },
  });
  const nsp = io.of("/arena") as unknown as ArenaNamespace;

  // ——— Rooms ———

  const rooms = new Map<number, { room: Room; emptySince: number | null }>();
  const open = (n: number) => {
    const room = createRoom(game, nsp, n);
    rooms.set(n, { room, emptySince: Date.now() });
    return room;
  };
  open(1);
  const roomInfos = (): ArenaRoomInfo[] => [...rooms.keys()].sort((a, b) => a - b).map((n) => rooms.get(n)!.room.info());
  /** Where someone goes: the room they're already in, the one they asked for, the busiest with space, or a new one */
  const pick = (userId: string, wanted?: number): Room | null => {
    for (const { room } of rooms.values()) if (room.has(userId)) return room;
    const asked = wanted ? rooms.get(wanted)?.room : undefined;
    if (asked && !asked.full()) return asked;
    const free = [...rooms.values()]
      .map((r) => r.room)
      .filter((r) => !r.full())
      .sort((a, b) => b.count() - a.count() || a.n - b.n)[0];
    if (free) return free;
    if (rooms.size >= maxRooms) return null;
    let n = 1;
    while (rooms.has(n)) n += 1;
    return open(n);
  };

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [n, entry] of rooms) {
      try {
        entry.room.tick();
      } catch (error) {
        console.error(`[battle] ${game} room ${n} tick`, error);
      }
      entry.emptySince = entry.room.count() ? null : (entry.emptySince ?? now);
      if (n !== 1 && entry.emptySince !== null && now - entry.emptySince > EMPTY_ROOM_MS) rooms.delete(n);
    }
  }, TICK_MS);

  // Wallets changed anywhere (a battle here, the shop in the Grid): kits follow
  const onWallet = (userId: string, wallet: { coins: number; kit?: BattleKit }) => {
    for (const { room } of rooms.values()) room.onWallet(userId, wallet);
  };
  economyEvents.on("wallet", onWallet);

  // ——— Heartbeat (for core: where this game is, and its rooms) ———

  const beat = () =>
    arenaServers
      .updateOne({ _id: game }, [{ $set: { url: publicUrl, rooms: { $literal: roomInfos() }, at: "$$NOW", startedAt: { $ifNull: ["$startedAt", "$$NOW"] } } }], { upsert: true })
      .catch((e) => console.error("[battle] heartbeat failed:", e));
  await beat();
  const heart = setInterval(() => void beat(), HEARTBEAT_MS);

  // ——— HTTP ———

  app.get("/health", (_req, res) => {
    res.json({ ok: true, game });
  });
  app.get("/status", (_req, res) => {
    res.json({ game, rooms: roomInfos() });
  });

  // ——— Players ———

  nsp.use(async (socket, next) => {
    try {
      const ticket = (socket.handshake.auth as { ticket?: unknown } | undefined)?.ticket;
      const user = ticket ? await getUserByTicket(ticket) : await getUserFromCookieHeader(socket.handshake.headers.cookie);
      socket.data.user = user && !user.banned ? user : null;
      socket.data.player = null;
      socket.data.room = null;
      next();
    } catch (error) {
      next(error as Error);
    }
  });

  nsp.on("connection", (socket: ArenaSocket) => {
    const roomOf = () => (socket.data.room ? (rooms.get(socket.data.room)?.room ?? null) : null);
    /** You and your room (when you're in one) */
    const me = () => {
      const r = roomOf();
      const p = socket.data.player;
      return r && p && r.live(p) ? { r, p } : null;
    };

    socket.on("aRooms", (ack) => {
      if (typeof ack === "function") ack(roomInfos());
    });

    socket.on("aJoin", async (data, ack) => {
      if (typeof ack !== "function") return;
      if (data?.game !== game) return ack({ ok: false, error: `This is the ${name} server.` });
      const user = socket.data.user ? await users.findOne({ _id: socket.data.user._id }) : null;
      if (!user) return ack({ ok: false, error: "Sign in to enter the arena." });
      if (!passActive(user)) return ack({ ok: false, error: "You need an arena pass. Get one at the gateway near the plaza." });
      const id = user._id.toHexString();
      const wanted = Number.isInteger(data.room) ? data.room : undefined;
      const room = pick(id, wanted);
      if (!room) return ack({ ok: false, error: `${name} is full right now. Try another game, or again in a minute!` });
      // Out of anywhere else on this server first (another room, or another tab)
      for (const { room: r } of rooms.values()) if (r !== room) r.kickUser(id, socket);
      if (socket.data.room && socket.data.room !== room.n) roomOf()?.leave(socket);
      const welcome = room.join(socket, user);
      trackTime(user._id, `arena:${socket.id}`, true);
      ack({ ok: true, welcome });
      room.afterJoin();
    });

    socket.on("aLeave", () => {
      roomOf()?.leave(socket);
    });

    socket.on("aSetBots", (data, ack) => {
      const reply = typeof ack === "function" ? ack : () => undefined;
      const m = me();
      if (!m) return reply({ ok: false, error: "Join a game first." });
      reply(m.r.setBots(m.p, data?.count ?? null));
    });
    socket.on("aMove", (data) => {
      const m = me();
      if (m) m.r.move(m.p, data);
    });
    socket.on("aFire", (data) => {
      const m = me();
      if (m) m.r.fire(m.p, Number(data?.ry));
    });
    socket.on("aJump", () => {
      const m = me();
      if (m) m.r.jump(m.p);
    });
    socket.on("aAbility", (data) => {
      const m = me();
      if (m) m.r.ability(m.p, Number(data?.ry));
    });
    socket.on("aDash", (data) => {
      const m = me();
      if (m) m.r.dash(m.p, Number(data?.ry));
    });
    socket.on("aUlt", (data) => {
      const m = me();
      if (m) m.r.ult(m.p, Number(data?.ry));
    });
    socket.on("aItem", async (data, ack) => {
      const reply = typeof ack === "function" ? ack : () => undefined;
      const m = me();
      if (!m) return reply({ ok: false, error: "Join a game first." });
      reply(await m.r.item(m.p, data?.item as BattleItemId, Number(data?.ry)));
    });
    socket.on("aBuyItem", async (data, ack) => {
      const reply = typeof ack === "function" ? ack : () => undefined;
      const m = me();
      if (!m) return reply({ ok: false, error: "Join the arena first." });
      reply(await m.r.buyItem(m.p, data?.item as BattleItemId, Number(data?.qty)));
    });
    socket.on("aShove", () => {
      const m = me();
      if (m) m.r.shove(m.p);
    });
    socket.on("aEmote", (data) => {
      const m = me();
      if (m && EMOTES.includes(data?.emote as Emote)) m.r.emote(m.p, data.emote);
    });
    socket.on("aPresence", (data) => {
      if (socket.data.user) trackTime(socket.data.user._id, `arena:${socket.id}`, data?.away !== true);
    });
    socket.on("disconnect", () => {
      if (socket.data.user) trackTime(socket.data.user._id, `arena:${socket.id}`, false);
      roomOf()?.leave(socket);
    });
  });

  await new Promise<void>((resolve) => httpServer.listen(port, resolve));
  console.log(`${ARENA_GAMES[game].emoji} ${name} battle server on :${port} (${publicUrl}), up to ${maxRooms} rooms`);

  // ——— Stopping: off the gateway first, then save the time counted so far ———
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    clearInterval(timer);
    clearInterval(heart);
    economyEvents.off("wallet", onWallet);
    await arenaServers.deleteOne({ _id: game }).catch(() => undefined);
    io.close();
    await flushTime().catch(() => undefined);
    stopBus();
    await closeDb().catch(() => undefined);
    process.exit(0);
  };
  process.on("SIGINT", () => void stop());
  process.on("SIGTERM", () => void stop());
  return { stop };
}
