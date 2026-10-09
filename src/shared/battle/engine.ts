// Copied from kittyhome-shared (src/battle/engine.ts) by `npm run sync:shared` in the parent repo.
// Don't edit this copy: change shared/src/battle/engine.ts and sync.
/**
 * The battle engine: one room of a game, run by a battle server (server.ts). Everyone in a room is put
 * on Red or Blue (whichever is smaller), and its rounds go waiting → countdown → playing → results:
 *  - Paw Blaster: throw yarn in the colosseum; three hits knock a cat out; most knockouts wins.
 *  - Summit Rush: king of the hill; the first team to hold the top for SUMMIT_HOLD_MS wins; yarn
 *    knocks cats down the slope, shoves too, and boulders roll down.
 *  - Sky Brawl: a knock-off brawl on a floating island. Claws (a 3-hit combo), powers, dashes and
 *    ultimates raise a cat's damage %, and the higher it is the further hits launch them; launched
 *    off the edge is a knockout. Meteors, lightning and a Golden Yarn come and go, power-ups appear,
 *    and near the end the edge crumbles. Up to 24 people, most knockouts wins.
 * In all of them Space jumps (yarn, boulders, shoves and hits pass under you) and every character has
 * its own power (Q, ARENA_ABILITIES) and spell (G, ARENA_SPELLS), plus an ultimate in Sky Brawl
 * (BRAWL_ULTS). People's characters grow: XP after every round, and upgrades bought with coins; those
 * and the shop items they wear add up to small battle modifiers (battleMods: cooldowns, strength,
 * speed, toughness). The room runs the game:
 * it checks moves, flies the yarn, rolls the boulders, decides every hit, power, launch and finish,
 * and pays the winners (in the database every server shares).
 *
 * AI players (bots.ts) fill a room's teams up whenever someone's inside: at least 4 of them, and
 * enough to make it 4 a side (5 in Sky Brawl), so a battle starts as soon as you walk in. The room's
 * game admin (whoever has been inside longest; it passes on when they leave) can set the number
 * instead, from none to ARENA_MAX_BOTS. They play by the same rules as people, and never earn anything.
 */
import { randomUUID } from "node:crypto";
import type { ObjectId, WithId } from "mongodb";
import type { Namespace, Socket } from "socket.io";
import { streakView } from "../activity.js";
import { users, type UserDoc } from "../db.js";
import { buyKit, earn, upgradeCharacter, useKit } from "../economy.js";
import { addCharacterXp, progressView } from "../progress.js";
import { lineBlocked, newBot, think, type Action, type BotMind, type Seen, type World } from "./bots.js";
import {
  ARENA_BASES,
  ARENA_BOMB,
  ARENA_BOOST_SPEED,
  ARENA_GAMES,
  ARENA_ITEM_GAP_MS,
  ARENA_ITEM_USES,
  ARENA_JUMP,
  ARENA_LEAPS,
  ARENA_LOBBY,
  ARENA_MAX_BOTS,
  ARENA_REWARD,
  ARENA_TEAMS,
  BATTLE_ITEM_BY_ID,
  BATTLE_PACKS,
  BLASTER_COVER,
  BLASTER_HP,
  BLASTER_PIT,
  BRAWL_CLAW,
  BRAWL_COMBO,
  BRAWL_CRUMBLE,
  BRAWL_CRUMBLE_WARN_MS,
  BRAWL_DASH,
  BRAWL_ISLAND,
  BRAWL_RESPAWN_MS,
  BRAWL_SPAWN_SHIELD_MS,
  BRAWL_ULT_MAX,
  EMOTES,
  MAX_SPEED,
  SUMMIT_CLIMB,
  SUMMIT_HILL,
  SUMMIT_HOLD_MS,
  ARENA_XP,
  arenaAbilityOf,
  arenaSpellOf,
  battleMods,
  battlePackPrice,
  characterLevel,
  brawlFlightMs,
  brawlLaunch,
  brawlUltOf,
  type ArenaAbilityKind,
  type ArenaClient,
  type ArenaEffects,
  type ArenaGame,
  type ArenaHost,
  type ArenaKitView,
  type ArenaKoHow,
  type ArenaPhase,
  type ArenaPlayer,
  type ArenaRoomInfo,
  type ArenaRound,
  type ArenaServer,
  type ArenaShotKind,
  type ArenaTeam,
  type ArenaWelcome,
  type BattleItemId,
  type BattleKit,
  type BattleMods,
  type BrawlEventKind,
  type BrawlHazardKind,
  type BrawlPowerUp,
  type BrawlPowerUpKind,
  type Emote,
} from "../protocol.js";

const TICK_MS = 50;
const STATE_EVERY = 2; // ticks
const COUNTDOWN_MS = 5_000;
const RESULTS_MS = 8_000;
const MIN_PLAYERS = 2;
// Moving: a budget of distance that refills at a little over walking speed
const BUDGET_RATE = MAX_SPEED * 1.25;
const BUDGET_MAX = MAX_SPEED * 1.5;
const CAT_R = 0.6;
// Throwing: yarn hurts in Paw Blaster, knocks cats down the hill in Summit Rush, and adds damage % in
// Sky Brawl (b: its damage, launch force and stun there)
const FIRE_GAP_MS = 450;
const SHOTS: Record<
  ArenaShotKind,
  { speed: number; range: number; hitR: number; damage: number; push: number; stunMs: number; hillPush: number; hillStunMs: number; bDmg: number; bForce: number; bStunMs: number }
> = {
  yarn: { speed: 30, range: 28, hitR: 1.2, damage: 1, push: 0, stunMs: 0, hillPush: 4, hillStunMs: 450, bDmg: 4, bForce: 1.2, bStunMs: 0 },
  cannon: { speed: 21, range: 30, hitR: 1.5, damage: 2, push: 6, stunMs: 600, hillPush: 7.5, hillStunMs: 900, bDmg: 13, bForce: 4.6, bStunMs: 0 },
  // The Freeze Ball (a battle item): no damage, but whoever it hits can't move
  ice: { speed: 26, range: 24, hitR: 1.2, damage: 0, push: 0, stunMs: 2_000, hillPush: 0, hillStunMs: 2_000, bDmg: 0, bForce: 0, bStunMs: 2_000 },
  // Spells: the Arcane Orb (big and slow) and the Anchor Hook (pulls whoever it catches to you)
  orb: { speed: 16, range: 26, hitR: 1.9, damage: 2, push: 3, stunMs: 300, hillPush: 8, hillStunMs: 700, bDmg: 12, bForce: 4.5, bStunMs: 0 },
  hook: { speed: 34, range: 18, hitR: 1.3, damage: 0, push: 0, stunMs: 0, hillPush: 0, hillStunMs: 0, bDmg: 5, bForce: 0, bStunMs: 0 },
};
const RESPAWN_MS = 3_000;
/** Just back (or just started): yarn passes through you for a moment, so nobody camps a base */
const SPAWN_SHIELD_MS = 1_500;
// Summit Rush
const SHOVE_RANGE = 2.6;
const SHOVE_GAP_MS = 1_200;
const SHOVE_PUSH = 6.5;
const SHOVE_STUN_MS = 1_000;
const BOULDER_EVERY_MS = 1_400;
const BOULDER_SPEED = 8;
const BOULDER_R = 1.3;
const BOULDER_PUSH = 5;
const BOULDER_STUN_MS = 700;
// Powers
const POUNCE_AIR_MS = 650;
const SLAM = { r: 5, push: 5, stunMs: 900 };
const ROAR = { r: 9, stunMs: 1_500 };
const TRIPLE_SPREAD = 0.2;
const BOOST_MS = 3_000;
const SHADOW_SHIELD_MS = 1_000;
const BREATH = { r: 6.5, arc: 0.6, push: 4, stunMs: 500 };
const PHASE_MS = 2_500;
const SNARE = { r: 1.3, lastsMs: 15_000, stunMs: 2_000, max: 2 };
const GUARD_MS = 2_500;
// Sky Brawl
/** How close to the edge you can walk (you only leave it flying) */
const EDGE_PAD = 0.7;
/** A knockout counts for whoever hit the cat last, within this long */
const CREDIT_MS = 8_000;
const POWERUP_EVERY_MS = 11_000;
const POWERUP_MAX = 3;
const POWERUP_R = 1.6;
const EVENT_MS = 8_000;
// AI players: at least this many whenever someone's inside, and enough to make it 4 a side (5 in Sky Brawl)
const MIN_BOTS = 4;
const FILL_TO: Record<ArenaGame, number> = { blaster: 8, summit: 8, brawl: 10 };

/** A round's length (ARENA_ROUND_SECONDS shortens every round, for testing) */
const roundMs = (game: ArenaGame) => (Number(process.env.ARENA_ROUND_SECONDS) || ARENA_GAMES[game].seconds) * 1000;
const round2 = (n: number) => Math.round(n * 100) / 100;
const clampTo = (n: number, center: number, half: number) => Math.max(center - half, Math.min(center + half, n));
const unit = (x: number, z: number) => {
  const l = Math.hypot(x, z) || 1;
  return { x: x / l, z: z / l };
};
const rand = (a: number, b: number) => a + Math.random() * (b - a);

type Player = ArenaPlayer & {
  /** People: their account and connection (AI players have neither) */
  userId: ObjectId | null;
  socket: ArenaSocket | null;
  /** AI players: how they think */
  mind?: BotMind;
  /** How fast they're moving (for leading shots), from the last tick */
  vx: number;
  vz: number;
  lastX: number;
  lastZ: number;
  score: number;
  joinedAt: number;
  budget: number;
  budgetAt: number;
  /** The last placement the server made; moves for older ones are ignored */
  place: number;
  stunnedUntil: number;
  fireAt: number;
  shoveAt: number;
  respawnAt: number;
  emoteAt: number;
  jumpAt: number;
  abilityAt: number;
  /** In the air (a jump or a pounce): yarn, boulders, shoves and powers pass under */
  airUntil: number;
  /** Yarn passes through (just back, or a Shadow Step) */
  shieldUntil: number;
  /** Shield Wall: nothing hurts or pushes them */
  guardUntil: number;
  /** Phase: see-through, nothing touches them */
  phaseUntil: number;
  boostUntil: number;
  /** Summit Rush: time spent holding the top this round */
  holdMs?: number;
  /** People: their battle items, how many of each they've used this round, their coins, and when they last used one */
  kit?: BattleKit;
  used?: BattleKit;
  coins?: number;
  itemAt?: number;
  // Sky Brawl
  dmg: number;
  ult: number;
  glove: number;
  /** Flying from a hit (can't act, can't be hit again until they land) */
  flightUntil: number;
  /** A dash: nothing touches them */
  dodgeUntil: number;
  dashAt: number;
  /** Case Closed: they fly further */
  markUntil: number;
  /** The claw combo: the last step (0–2) and when */
  combo: number;
  comboAt: number;
  /** Damage dealt this round (the MVP's tie-break) */
  dealt: number;
  /** Who hit them last (a knockout counts for them), when and how */
  lastBy: Player | null;
  lastAt: number;
  lastHow: ArenaKoHow;
  /** Upgrades bought for this character (0–5) and what they and worn items add up to */
  tier: number;
  mods: BattleMods;
  /** The spell (G), Smoke Bomb (hard to see) and EMP (no powers or spells) */
  spellAt: number;
  veilUntil: number;
  silenceUntil: number;
};
type Shot = { id: string; by: Player; team: ArenaTeam; kind: ArenaShotKind; x: number; z: number; dx: number; dz: number; left: number };
type Boulder = { id: string; x: number; z: number; dx: number; dz: number };
type Snare = { id: string; by: Player; team: ArenaTeam; x: number; z: number; until: number };
type Bomb = { id: string; by: Player; team: ArenaTeam; x: number; z: number; at: number };
/** Sky Brawl: something about to strike a spot (a meteor, lightning, an ultimate) */
/** Something about to strike a spot (a meteor, lightning, an ultimate, a spell); hit: what it does (else a Sky Brawl strike) */
type Hazard = { id: string; kind: BrawlHazardKind; x: number; z: number; r: number; at: number; by: Player | null; team: ArenaTeam | null; dmg: number; force: number; stunMs: number; hit?: (o: Player) => boolean };
/** A socket's member, their player, and which room (by number) they're in */
type Data = { user: WithId<UserDoc> | null; player: Player | null; room: number | null };
export type ArenaSocket = Socket<ArenaClient, ArenaServer, Record<string, never>, Data>;
export type ArenaNamespace = Namespace<ArenaClient, ArenaServer, Record<string, never>, Data>;

export const passActive = (u: Pick<UserDoc, "arenaPassUntil">) => Boolean(u.arenaPassUntil && u.arenaPassUntil > new Date());

/** Which area a game is played in, and its bounds (Sky Brawl's island is round: see fit) */
function areaOf(game: ArenaGame | null) {
  if (game === "blaster") return { x: BLASTER_PIT.x, z: BLASTER_PIT.z, half: BLASTER_PIT.half - 0.8 };
  if (game === "summit") return { x: SUMMIT_HILL.x, z: SUMMIT_HILL.z, half: SUMMIT_HILL.radius + 6 };
  if (game === "brawl") return { x: BRAWL_ISLAND.x, z: BRAWL_ISLAND.z, half: BRAWL_ISLAND.radius };
  return { x: ARENA_LOBBY.x, z: ARENA_LOBBY.z, half: ARENA_LOBBY.half - 0.8 };
}

/** Inside cover (blaster), with a cat's radius around it */
function inCover(x: number, z: number, pad = CAT_R) {
  const rx = x - BLASTER_PIT.x;
  const rz = z - BLASTER_PIT.z;
  return BLASTER_COVER.some((c) => Math.abs(rx - c.x) < c.w + pad && Math.abs(rz - c.z) < c.d + pad);
}

/** Smallest difference between two angles */
const angleGap = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

/** One room of a game (numbered from 1): its players and AI players, its rounds, its game admin */
export function createRoom(game: ArenaGame, nsp: ArenaNamespace, n: number) {
  const key = `arena:${game}:${n}`;
  const out = nsp.to(key);
  const maxPlayers = ARENA_GAMES[game].maxPlayers;
  const players = new Map<string, Player>();
  let shots: Shot[] = [];
  let boulders: Boulder[] = [];
  let snares: Snare[] = [];
  let bombs: Bomb[] = [];
  let hazards: Hazard[] = [];
  let powerUps: BrawlPowerUp[] = [];
  /** Things that happen a moment later (an ultimate's second wave, a landing) */
  let later: { at: number; fn: () => void }[] = [];
  let round: ArenaRound = { game, phase: "waiting", endsAt: null, score: { red: 0, blue: 0 } };
  let boulderAt = 0;
  let tickCount = 0;
  /** Both teams had players when the round started (rounds only pay then) */
  let contested = false;
  let botSerial = 0;
  // Sky Brawl: the next power-up, the next event, the crumbling steps done, the last event
  let powerUpAt = 0;
  let eventAt = 0;
  let eventTickAt = 0;
  let crumbleStep = 0;
  let lastEvent: BrawlEventKind | null = null;
  const humans = () => [...players.values()].filter((p) => !p.mind);
  const bots = () => [...players.values()].filter((p) => p.mind);
  const live = (p: Player) => players.get(p.id) === p;
  const playing = (g?: ArenaGame) => round.phase === "playing" && (!g || round.game === g);
  /** Cover stands in the colosseum through the round and its results */
  const solidCover = () => round.game === "blaster" && (round.phase === "playing" || round.phase === "results");
  const isBrawl = game === "brawl";
  const islandR = () => round.island?.radius ?? BRAWL_ISLAND.radius;
  const fromMiddle = (x: number, z: number) => Math.hypot(x - BRAWL_ISLAND.x, z - BRAWL_ISLAND.z);
  const later_ = (ms: number, fn: () => void) => later.push({ at: Date.now() + ms, fn });

  // What can touch a cat right now
  const airborne = (p: Player, now: number) => p.airUntil > now;
  /** Yarn, shoves, boulders and powers pass by them */
  const untouchable = (p: Player, now: number) => p.ko || p.airUntil > now || p.phaseUntil > now || p.shieldUntil > now || p.dodgeUntil > now || p.flightUntil > now;

  const effects = (p: Player, now = Date.now()): ArenaEffects | undefined => {
    const fx: ArenaEffects = {};
    const left = (until: number) => Math.max(0, until - now);
    if (p.shieldUntil > now) fx.shield = left(p.shieldUntil);
    if (p.guardUntil > now) fx.guard = left(p.guardUntil);
    if (p.phaseUntil > now) fx.phase = left(p.phaseUntil);
    if (p.boostUntil > now) fx.boost = left(p.boostUntil);
    if (p.stunnedUntil > now && p.flightUntil <= now) fx.stun = left(p.stunnedUntil);
    if (p.markUntil > now) fx.mark = left(p.markUntil);
    if (p.veilUntil > now) fx.veil = left(p.veilUntil);
    if (p.silenceUntil > now) fx.silence = left(p.silenceUntil);
    return Object.keys(fx).length ? fx : undefined;
  };
  const view = (p: Player): ArenaPlayer => {
    const fx = effects(p);
    return {
      id: p.id,
      login: p.login,
      name: p.name,
      look: p.look,
      team: p.team,
      x: p.x,
      z: p.z,
      ry: p.ry,
      hp: p.hp,
      ko: p.ko,
      kos: p.kos,
      ...(p.supporter ? { supporter: p.supporter } : {}),
      ...(p.streak ? { streak: p.streak } : {}),
      ...(p.mind ? { bot: true } : {}),
      ...(fx ? { fx } : {}),
      ...(isBrawl ? { dmg: Math.round(p.dmg), ult: Math.floor(p.ult), ...(p.glove ? { glove: p.glove } : {}) } : {}),
      ...(p.tier ? { tier: p.tier } : {}),
    };
  };
  const teamSize = (team: ArenaTeam) => [...players.values()].filter((p) => p.team === team).length;
  const smallerTeam = (): ArenaTeam => {
    const red = teamSize("red");
    const blue = teamSize("blue");
    if (red !== blue) return red < blue ? "red" : "blue";
    // Same size: the side with fewer points
    const pts = (t: ArenaTeam) => [...players.values()].filter((p) => p.team === t).reduce((s, p) => s + p.score, 0);
    return pts("red") <= pts("blue") ? "red" : "blue";
  };
  const sendRound = () => out.emit("aRound", round);

  /** Put a player somewhere (they're told, and older moves are ignored); glideMs: they slide there */
  const placeAt = (p: Player, x: number, z: number, ry: number, stunnedMs = 0, glideMs = 0) => {
    p.x = round2(x);
    p.z = round2(z);
    p.ry = round2(ry);
    p.place += 1;
    p.budget = BUDGET_MAX;
    p.budgetAt = Date.now();
    if (stunnedMs) p.stunnedUntil = Math.max(p.stunnedUntil, Date.now() + stunnedMs);
    p.lastX = p.x;
    p.lastZ = p.z;
    const stunLeft = Math.max(0, p.stunnedUntil - Date.now());
    p.socket?.emit("aPlace", { x: p.x, z: p.z, ry: p.ry, place: p.place, ...(stunLeft ? { stunnedMs: stunLeft } : {}), ...(glideMs ? { glideMs } : {}) });
  };

  /** Where a spot ends up inside the area you can walk (the island: short of its edge) */
  const fit = (x: number, z: number) => {
    const g = round.phase === "playing" || round.phase === "results" ? round.game : null;
    if (g === "brawl") {
      const r = islandR() - EDGE_PAD;
      const d = fromMiddle(x, z);
      if (d <= r) return { x, z };
      return { x: BRAWL_ISLAND.x + ((x - BRAWL_ISLAND.x) / d) * r, z: BRAWL_ISLAND.z + ((z - BRAWL_ISLAND.z) / d) * r };
    }
    const area = areaOf(g);
    return { x: clampTo(x, area.x, area.half), z: clampTo(z, area.z, area.half) };
  };

  /** At their team's base for the current game (spread out a little), or in the waiting hall */
  const toBase = (p: Player) => {
    if (round.phase === "countdown" || round.phase === "playing") {
      const area = areaOf(round.game);
      const base = ARENA_BASES[round.game][p.team];
      const mates = [...players.values()].filter((o) => o.team === p.team);
      const i = Math.max(0, mates.indexOf(p));
      if (round.game === "brawl") {
        // Two lines of cats on their side of the island (closer in once the edge has crumbled)
        const scale = islandR() / BRAWL_ISLAND.radius;
        const back = Math.floor(i / 7) * 2.2 * Math.sign(base.x);
        placeAt(p, area.x + base.x * scale + back * scale, area.z + ((i % 7) - 3) * 2 * scale, base.ry);
        return;
      }
      const spread = ((i % 6) - 2.5) * 2;
      placeAt(p, area.x + base.x, area.z + base.z + spread, base.ry);
    } else {
      const a = Math.random() * Math.PI * 2;
      const r = 3 + Math.random() * 6;
      placeAt(p, ARENA_LOBBY.x + Math.cos(a) * r, ARENA_LOBBY.z + Math.sin(a) * r, Math.atan2(-Math.cos(a), -Math.sin(a)));
    }
  };

  /**
   * Where a move of `dist` along `ang` ends: stopping short of cover, or (`through`, a teleport)
   * the farthest point that isn't inside any
   */
  const reach = (p: Player, ang: number, dist: number, through: boolean) => {
    const crates = solidCover();
    const sx = Math.sin(ang);
    const sz = Math.cos(ang);
    const at = (d: number) => fit(p.x + sx * d, p.z + sz * d);
    if (!crates) return at(dist);
    if (through) {
      for (let d = dist; d > 0; d -= 0.25) {
        const spot = at(d);
        if (!inCover(spot.x, spot.z)) return spot;
      }
      return { x: p.x, z: p.z };
    }
    let last = { x: p.x, z: p.z };
    for (let d = 0.25; d <= dist + 0.001; d += 0.25) {
      const spot = at(d);
      if (inCover(spot.x, spot.z)) break;
      last = spot;
    }
    return last;
  };

  const stun = (p: Player, ms: number) => {
    placeAt(p, p.x, p.z, p.ry, ms);
    out.emit("aPlayer", view(p));
  };

  /**
   * Knock a cat back along (dx, dz). On the hill it's always partly downhill, so a hit from below
   * never helps anyone up. Shield Wall stands firm.
   */
  const knock = (p: Player, dx: number, dz: number, dist: number, stunMs: number) => {
    const now = Date.now();
    if (p.guardUntil > now || p.ko) return;
    // Tough fur (upgrades, name tags) shortens it; a Spotlight's mark lengthens it
    dist *= Math.max(0.5, 1 - p.mods.tough * 1.5) * (p.markUntil > now ? 1.4 : 1);
    let dir = unit(dx, dz);
    if (round.game === "summit") {
      const away = unit(p.x - SUMMIT_HILL.x, p.z - SUMMIT_HILL.z);
      dir = unit(dir.x + away.x, dir.z + away.z);
    }
    const to = reach(p, Math.atan2(dir.x, dir.z), dist, false);
    placeAt(p, to.x, to.z, p.ry, stunMs);
    out.emit("aPlayer", view(p));
  };

  /** Damage (Paw Blaster): a knockout scores for the other team */
  const hurt = (p: Player, by: Player, amount: number, how: ArenaKoHow) => {
    if (!playing("blaster") || p.ko) return;
    // Marked by a Spotlight: every hit takes one more heart
    if (p.markUntil > Date.now()) amount += 1;
    p.hp = Math.max(0, p.hp - amount);
    if (p.hp <= 0) {
      p.ko = true;
      p.respawnAt = Date.now() + RESPAWN_MS;
      round.score[by.team] += 1;
      if (live(by)) by.kos += 1;
      out.emit("aKo", { target: p.id, by: by.id, how });
      if (live(by)) out.emit("aPlayer", view(by));
      sendRound();
    }
    out.emit("aPlayer", view(p));
  };

  // ——— Sky Brawl: hits, launches and falls ———

  /** A cat flies `dist` along (dx, dz) (past the edge: they'll fall when they come down) */
  const launchCat = (p: Player, dx: number, dz: number, dist: number, by: Player | null, stunMs = 0) => {
    let dir = unit(dx, dz);
    if (!dx && !dz) {
      const a = Math.random() * Math.PI * 2;
      dir = { x: Math.sin(a), z: Math.cos(a) };
    }
    const ms = brawlFlightMs(dist);
    const tx = round2(p.x + dir.x * dist);
    const tz = round2(p.z + dir.z * dist);
    p.flightUntil = Date.now() + ms;
    out.emit("aLaunch", { id: p.id, x: p.x, z: p.z, tx, tz, ms, by: by?.id ?? null });
    placeAt(p, tx, tz, p.ry, ms + stunMs, ms);
    out.emit("aPlayer", view(p));
  };

  /**
   * A hit in Sky Brawl: damage %, ultimate charge (both sides), then a launch along (dx, dz) that's
   * longer the more damage they have. False if it didn't land (dodged, shielded, flying).
   */
  const strike = (o: Player, by: Player | null, dmg: number, force: number, dx: number, dz: number, how: ArenaKoHow, stunMs = 0) => {
    const now = Date.now();
    if (!playing("brawl") || untouchable(o, now)) return false;
    // Shield Wall: nothing gets through
    if (o.guardUntil > now) return false;
    let f = force;
    if (by && by.glove > 0 && force > 0) {
      f *= 1.5;
      by.glove -= 1;
    }
    if (o.markUntil > now) f *= 1.6;
    // Upgrades: the hitter's strength (claws and powers, or spells); the target's toughness
    if (by && by !== o) {
      const strength = how === "spell" ? by.mods.spell : how === "power" || how === "claw" ? by.mods.power : 1;
      dmg *= strength;
      f *= strength;
    }
    dmg *= Math.max(0.5, 1 - o.mods.tough);
    o.dmg = Math.min(999, o.dmg + dmg);
    o.ult = Math.min(BRAWL_ULT_MAX, o.ult + dmg * 0.2);
    if (by && by !== o) {
      o.lastBy = by;
      o.lastAt = now;
      o.lastHow = how;
      by.dealt += dmg;
      by.ult = Math.min(BRAWL_ULT_MAX, by.ult + dmg * 0.7);
      if (live(by)) out.emit("aPlayer", view(by));
    }
    if (f > 0) launchCat(o, dx, dz, brawlLaunch(f, o.dmg), by, stunMs);
    else if (stunMs) stun(o, stunMs);
    else out.emit("aPlayer", view(o));
    return true;
  };

  /** Everyone near (x, z) on the other team hit and launched away from it */
  const blast = (by: Player, x: number, z: number, r: number, dmg: number, force: number, how: ArenaKoHow, stunMs = 0) => {
    const now = Date.now();
    const hit = [...players.values()].filter((o) => o.team !== by.team && !untouchable(o, now) && Math.hypot(o.x - x, o.z - z) < r);
    return hit.filter((o) => strike(o, by, dmg, force, o.x - x, o.z - z, how, stunMs));
  };

  /** Off the island: a knockout for whoever hit them last (or just for the other team) */
  const fallOut = (p: Player, how?: ArenaKoHow) => {
    const now = Date.now();
    if (p.ko) return;
    p.ko = true;
    p.flightUntil = 0;
    p.respawnAt = now + BRAWL_RESPAWN_MS;
    const by = p.lastBy && live(p.lastBy) && p.lastBy.team !== p.team && now - p.lastAt < CREDIT_MS ? p.lastBy : null;
    round.score[p.team === "red" ? "blue" : "red"] += 1;
    if (by) {
      by.kos += 1;
      by.ult = Math.min(BRAWL_ULT_MAX, by.ult + 10);
      out.emit("aPlayer", view(by));
    }
    out.emit("aKo", { target: p.id, by: by?.id ?? null, how: how ?? (by ? p.lastHow : "fall") });
    p.lastBy = null;
    out.emit("aPlayer", view(p));
    sendRound();
  };

  /** A spot on the island away from danger (a respawn) */
  const brawlSpawn = (p: Player) => {
    const base = ARENA_BASES.brawl[p.team];
    const scale = (islandR() - 3) / BRAWL_ISLAND.radius;
    let best = { x: BRAWL_ISLAND.x + base.x * scale, z: BRAWL_ISLAND.z, score: -Infinity };
    for (let i = 0; i < 8; i++) {
      const x = BRAWL_ISLAND.x + base.x * scale + rand(-3, 3);
      const z = BRAWL_ISLAND.z + rand(-7, 7) * scale;
      const near = Math.min(99, ...[...players.values()].filter((o) => o.team !== p.team && !o.ko).map((o) => Math.hypot(o.x - x, o.z - z)));
      const danger = hazards.some((h) => Math.hypot(h.x - x, h.z - z) < h.r + 1) ? 50 : 0;
      const score = Math.min(near, 10) - danger;
      if (score > best.score) best = { x, z, score };
    }
    const to = fit(best.x, best.z);
    placeAt(p, to.x, to.z, base.ry);
  };

  const addHazard = (kind: BrawlHazardKind, x: number, z: number, r: number, inMs: number, by: Player | null, dmg: number, force: number, stunMs = 0, hit?: (o: Player) => boolean) => {
    const h: Hazard = { id: randomUUID().slice(0, 8), kind, x: round2(x), z: round2(z), r, at: Date.now() + inMs, by, team: by?.team ?? null, dmg, force, stunMs, hit };
    hazards.push(h);
    out.emit("aHazard", { id: h.id, kind, x: h.x, z: h.z, r, inMs });
  };

  /** A random spot on the island, at most `edge` from the middle */
  const islandSpot = (edge = islandR() - 1) => {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * edge;
    return { x: BRAWL_ISLAND.x + Math.cos(a) * r, z: BRAWL_ISLAND.z + Math.sin(a) * r };
  };

  const addPowerUp = (kind: BrawlPowerUpKind, at?: { x: number; z: number }) => {
    const spot = at ?? islandSpot(islandR() - 3);
    const u: BrawlPowerUp = { id: randomUUID().slice(0, 8), kind, x: round2(spot.x), z: round2(spot.z) };
    powerUps.push(u);
    out.emit("aPowerUp", u);
  };

  const pickUp = (p: Player, u: BrawlPowerUp) => {
    powerUps = powerUps.filter((o) => o !== u);
    if (u.kind === "heal") p.dmg = Math.max(0, p.dmg - 35);
    if (u.kind === "charge") p.ult = Math.min(BRAWL_ULT_MAX, p.ult + 50);
    if (u.kind === "glove") p.glove = 3;
    if (u.kind === "golden") {
      p.ult = BRAWL_ULT_MAX;
      p.glove = 3;
    }
    out.emit("aPowerUpGone", { id: u.id, by: p.id });
    out.emit("aPlayer", view(p));
    if (u.kind === "golden" && round.event?.kind === "golden") endEvent();
  };

  const startEvent = (now: number) => {
    const kinds = (["meteors", "storm", "golden"] as BrawlEventKind[]).filter((k) => k !== lastEvent);
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    lastEvent = kind;
    round.event = { kind, until: now + (kind === "golden" ? 15_000 : EVENT_MS) };
    eventTickAt = now + 400;
    if (kind === "golden") addPowerUp("golden", { x: BRAWL_ISLAND.x, z: BRAWL_ISLAND.z });
    out.emit("aEvent", { kind });
    sendRound();
  };
  const endEvent = () => {
    if (!round.event) return;
    if (round.event.kind === "golden") {
      for (const u of powerUps.filter((o) => o.kind === "golden")) out.emit("aPowerUpGone", { id: u.id, by: null });
      powerUps = powerUps.filter((o) => o.kind !== "golden");
    }
    round.event = null;
    eventAt = Date.now() + rand(18_000, 28_000);
    sendRound();
  };

  /** Sky Brawl, a tick at a time: landings, respawns, the edge, events, hazards, power-ups */
  const brawlTick = (now: number) => {
    // Delayed parts of powers and ultimates
    if (later.length) {
      const due = later.filter((l) => l.at <= now);
      later = later.filter((l) => l.at > now);
      for (const l of due) l.fn();
    }
    for (const p of players.values()) {
      // Coming down from a launch: on the island, or off it (a knockout)
      if (p.flightUntil && now >= p.flightUntil) {
        p.flightUntil = 0;
        if (!p.ko && fromMiddle(p.x, p.z) > islandR() + 0.2) fallOut(p);
        else out.emit("aPlayer", view(p));
      }
      if (p.ko && now >= p.respawnAt) {
        p.ko = false;
        p.dmg = 0;
        p.stunnedUntil = 0;
        p.markUntil = 0;
        p.shieldUntil = now + BRAWL_SPAWN_SHIELD_MS + p.mods.shieldMs;
        brawlSpawn(p);
        out.emit("aPlayer", view(p));
      }
    }
    // A little ultimate charge over time (only you need to see it, until it's full)
    if (tickCount % 40 === 0) {
      for (const p of players.values()) {
        if (p.ko || p.ult >= BRAWL_ULT_MAX) continue;
        p.ult = Math.min(BRAWL_ULT_MAX, p.ult + 1);
        if (p.ult >= BRAWL_ULT_MAX) out.emit("aPlayer", view(p));
        else p.socket?.emit("aPlayer", view(p));
      }
    }

    // The edge crumbles near the end (with a warning)
    const total = roundMs("brawl");
    const start = (round.endsAt ?? now) - total;
    const step = BRAWL_CRUMBLE[crumbleStep];
    const island = round.island ?? { radius: BRAWL_ISLAND.radius };
    if (step && island.crumbleAt === undefined && now - start >= step.at * total - BRAWL_CRUMBLE_WARN_MS) {
      round.island = { radius: island.radius, crumbleAt: Math.max(now + 1_000, start + step.at * total), to: step.radius };
      out.emit("aEvent", { kind: "crumble" });
      sendRound();
    } else if (island.crumbleAt !== undefined && now >= island.crumbleAt) {
      round.island = { radius: island.to ?? island.radius };
      crumbleStep += 1;
      sendRound();
      // Whoever's standing on the part that fell goes with it (a flying cat finds out when it lands)
      for (const p of players.values()) {
        if (!p.ko && p.flightUntil <= now && fromMiddle(p.x, p.z) > islandR() + 0.1) fallOut(p, p.lastBy && now - p.lastAt < CREDIT_MS ? undefined : "crumble");
      }
      for (const u of powerUps.filter((o) => fromMiddle(o.x, o.z) > islandR() - 0.5)) {
        powerUps = powerUps.filter((o) => o !== u);
        out.emit("aPowerUpGone", { id: u.id, by: null });
      }
    }

    // Island events: meteors, lightning, the Golden Yarn
    const left = (round.endsAt ?? now) - now;
    if (!round.event && now >= eventAt && left > 15_000) startEvent(now);
    else if (round.event && now >= round.event.until) endEvent();
    else if (round.event && now >= eventTickAt) {
      if (round.event.kind === "meteors") {
        eventTickAt = now + 480;
        const s = islandSpot();
        addHazard("meteor", s.x, s.z, 2.6, 1_300, null, 12, 4.4);
      } else if (round.event.kind === "storm") {
        eventTickAt = now + 850;
        const targets = [...players.values()].filter((p) => !p.ko && p.flightUntil <= now);
        const t = targets[Math.floor(Math.random() * targets.length)];
        if (t) addHazard("bolt", t.x, t.z, 2.1, 1_000, null, 10, 3.2, 300);
      } else eventTickAt = now + 1_000;
    }

    // Power-ups: a new one now and then, picked up by walking over it
    if (now >= powerUpAt) {
      powerUpAt = now + POWERUP_EVERY_MS;
      if (powerUps.filter((u) => u.kind !== "golden").length < POWERUP_MAX) {
        const r = Math.random();
        addPowerUp(r < 0.4 ? "heal" : r < 0.72 ? "charge" : "glove");
      }
    }
    for (const u of [...powerUps]) {
      const taker = [...players.values()].find((p) => !p.ko && p.flightUntil <= now && Math.hypot(p.x - u.x, p.z - u.z) < POWERUP_R);
      if (taker) pickUp(taker, u);
    }
  };

  // ——— Rounds ———

  const setPhase = (phase: ArenaPhase, ms: number | null) => {
    round = { ...round, phase, endsAt: ms === null ? null : Date.now() + ms };
    if (phase !== "results") {
      delete round.winner;
      delete round.mvp;
      delete round.note;
      delete round.rewarded;
    }
    if (phase !== "playing") {
      delete round.holder;
      delete round.event;
    }
  };

  const clearField = () => {
    shots = [];
    for (const b of boulders) out.emit("aBoulderGone", { id: b.id });
    boulders = [];
    for (const s of snares) out.emit("aSnareGone", { id: s.id, caught: null });
    snares = [];
    for (const b of bombs) out.emit("aBombBurst", { id: b.id, x: b.x, z: b.z, targets: [] });
    bombs = [];
    for (const u of powerUps) out.emit("aPowerUpGone", { id: u.id, by: null });
    powerUps = [];
    hazards = [];
    later = [];
    for (const p of players.values()) p.flightUntil = 0;
  };

  // ——— Battle items ———

  const kitView = (p: Player): ArenaKitView => ({ kit: p.kit ?? {}, used: p.used ?? {}, coins: p.coins ?? 0 });
  const sendKit = (p: Player) => p.socket?.emit("aKit", kitView(p));
  // Bought in the shop (another tab), or used here: the kit follows the wallet
  const onWallet = (userId: string, wallet: { coins: number; kit?: BattleKit }) => {
    const p = players.get(userId);
    if (!p || p.mind) return;
    p.kit = wallet.kit ?? {};
    p.coins = wallet.coins;
    sendKit(p);
  };

  /** Teams within one of each other (moves AI players first, then the latest joiners) */
  const rebalance = () => {
    for (let guard = 0; guard < maxPlayers * 2; guard++) {
      const red = teamSize("red");
      const blue = teamSize("blue");
      if (Math.abs(red - blue) <= 1) return;
      const from: ArenaTeam = red > blue ? "red" : "blue";
      const mover = [...players.values()]
        .filter((p) => p.team === from)
        .sort((a, b) => Number(Boolean(b.mind)) - Number(Boolean(a.mind)) || b.joinedAt - a.joinedAt)[0];
      if (!mover) return;
      mover.team = from === "red" ? "blue" : "red";
      out.emit("aPlayer", view(mover));
      mover.socket?.emit("aReward", { points: 0, text: `⚖️ Teams evened out: you're on ${mover.team === "red" ? "🔴 Red" : "🔵 Blue"} now` });
    }
  };

  type Fresh = "spellAt" | "veilUntil" | "silenceUntil" | "vx" | "vz" | "lastX" | "lastZ" | "budget" | "budgetAt" | "place" | "stunnedUntil" | "fireAt" | "shoveAt" | "respawnAt" | "emoteAt" | "jumpAt" | "abilityAt" | "airUntil" | "shieldUntil" | "guardUntil" | "phaseUntil" | "boostUntil" | "dmg" | "ult" | "glove" | "flightUntil" | "dodgeUntil" | "dashAt" | "markUntil" | "combo" | "comboAt" | "dealt" | "lastBy" | "lastAt" | "lastHow";
  const freshPlayer = (base: Omit<Player, Fresh>): Player => ({
    ...base,
    vx: 0,
    vz: 0,
    lastX: 0,
    lastZ: 0,
    budget: BUDGET_MAX,
    budgetAt: Date.now(),
    place: 0,
    stunnedUntil: 0,
    fireAt: 0,
    shoveAt: 0,
    respawnAt: 0,
    emoteAt: 0,
    jumpAt: 0,
    abilityAt: 0,
    airUntil: 0,
    shieldUntil: 0,
    guardUntil: 0,
    phaseUntil: 0,
    boostUntil: 0,
    dmg: 0,
    ult: 0,
    glove: 0,
    flightUntil: 0,
    dodgeUntil: 0,
    dashAt: 0,
    markUntil: 0,
    combo: 0,
    comboAt: 0,
    dealt: 0,
    lastBy: null,
    lastAt: 0,
    lastHow: "claw",
    spellAt: 0,
    veilUntil: 0,
    silenceUntil: 0,
  });

  // ——— The game admin and how many AI players ———

  /** The game admin's choice of AI players (null: automatic) */
  let botsWanted: number | null = null;
  let hostId: string | null = null;
  let lastHost = "";
  const hostView = (): ArenaHost => ({ hostId, bots: bots().length, wanted: botsWanted });
  /** Tells everyone when the game admin or the AI players change */
  const sendHost = () => {
    const host = hostView();
    const k = JSON.stringify(host);
    if (k === lastHost) return;
    lastHost = k;
    out.emit("aHost", host);
  };
  /** The game admin: whoever has been inside longest */
  const syncHost = () => {
    const first = humans().sort((a, b) => a.joinedAt - b.joinedAt)[0] ?? null;
    const next = first?.id ?? null;
    if (next !== hostId) {
      hostId = next;
      if (first) first.socket?.emit("aReward", { points: 0, text: "👑 You're the game admin: add or remove AI players any time" });
    }
    // Nobody inside: back to automatic for whoever comes next
    if (!first) botsWanted = null;
    sendHost();
  };

  /**
   * AI players in or out: none when nobody's here; what the game admin chose; otherwise (automatic)
   * at least MIN_BOTS, up to 4 a side (5 in Sky Brawl), even teams
   */
  const syncBots = () => {
    const people = humans().length;
    let want = people === 0 ? 0 : Math.max(MIN_BOTS, FILL_TO[game] - people);
    if ((people + want) % 2) want += 1;
    if (people && botsWanted !== null) want = botsWanted;
    want = Math.min(want, Math.max(0, maxPlayers + ARENA_MAX_BOTS - people));
    const list = bots();
    while (list.length > want) {
      const from: ArenaTeam = teamSize("red") >= teamSize("blue") ? "red" : "blue";
      const b = list.find((x) => x.team === from) ?? list[0];
      list.splice(list.indexOf(b), 1);
      players.delete(b.id);
      out.emit("aLeft", { id: b.id });
    }
    while (list.length < want) {
      botSerial += 1;
      const made = newBot(new Set([...players.values()].map((p) => p.name.replace(/^🤖 /, ""))), botSerial);
      const botTier = Math.floor(Math.random() * 4);
      const b = freshPlayer({
        tier: botTier,
        mods: battleMods(botTier),
        id: `bot:${game}:${n}:${botSerial}`,
        login: made.login,
        name: `🤖 ${made.name}`,
        look: made.look,
        team: smallerTeam(),
        x: 0,
        z: 0,
        ry: 0,
        hp: BLASTER_HP,
        ko: false,
        kos: 0,
        userId: null,
        socket: null,
        mind: made.mind,
        score: 0,
        joinedAt: Date.now(),
      });
      players.set(b.id, b);
      list.push(b);
      toBase(b);
      if (round.phase === "playing") b.shieldUntil = Date.now() + SPAWN_SHIELD_MS;
      out.emit("aJoined", view(b));
    }
    sendHost();
  };

  const startCountdown = () => {
    syncBots();
    rebalance();
    round = { game, phase: "countdown", endsAt: Date.now() + COUNTDOWN_MS, score: { red: 0, blue: 0 }, ...(isBrawl ? { island: { radius: BRAWL_ISLAND.radius }, event: null } : {}) };
    crumbleStep = 0;
    lastEvent = null;
    clearField();
    for (const p of players.values()) {
      p.hp = BLASTER_HP;
      p.ko = false;
      p.kos = 0;
      p.stunnedUntil = 0;
      p.respawnAt = 0;
      p.holdMs = 0;
      p.abilityAt = 0;
      p.spellAt = 0;
      p.veilUntil = 0;
      p.silenceUntil = 0;
      p.dmg = 0;
      p.ult = 0;
      p.glove = 0;
      p.markUntil = 0;
      p.dodgeUntil = 0;
      p.dashAt = 0;
      p.combo = 0;
      p.dealt = 0;
      p.lastBy = null;
      if (!p.mind) {
        p.used = {};
        p.itemAt = 0;
        sendKit(p);
      }
      p.airUntil = p.shieldUntil = p.guardUntil = p.phaseUntil = p.boostUntil = 0;
      out.emit("aPlayer", view(p));
    }
    for (const p of players.values()) toBase(p);
    sendRound();
  };

  const startPlaying = () => {
    contested = teamSize("red") > 0 && teamSize("blue") > 0;
    // Summit Rush: one AI player per team (of 3 or more) defends; the rest race for the top
    for (const team of ["red", "blue"] as ArenaTeam[]) {
      const teamBots = bots().filter((b) => b.team === team);
      teamBots.forEach((b, i) => {
        b.mind!.role = i === 0 && teamSize(team) >= 3 ? "defender" : "runner";
        b.mind!.lane = (Math.random() - 0.5) * 1.2;
        b.mind!.target = null;
        b.mind!.cover = null;
      });
    }
    setPhase("playing", roundMs(round.game));
    const now = Date.now();
    for (const p of players.values()) {
      p.shieldUntil = now + SPAWN_SHIELD_MS;
      out.emit("aPlayer", view(p));
    }
    boulderAt = now + 2000;
    powerUpAt = now + 6_000;
    eventAt = now + rand(20_000, 26_000);
    sendRound();
  };

  const finish = async (winner: ArenaTeam | "draw", mvp: Player | null, note: string) => {
    const rewarded = contested && teamSize("red") > 0 && teamSize("blue") > 0 && humans().length > 0;
    round = { ...round, phase: "results", endsAt: Date.now() + RESULTS_MS, winner, note, rewarded, ...(mvp ? { mvp: { id: mvp.id, name: mvp.name } } : {}) };
    delete round.holder;
    delete round.event;
    clearField();
    sendRound();
    if (!rewarded) return;
    for (const p of players.values()) {
      if (!p.userId || !p.socket) continue; // AI players don't earn
      // XP for the character they played: taking part, winning, the MVP, knockouts
      const kos = round.game === "summit" ? 0 : Math.min(ARENA_XP.koCap, p.kos);
      const xp = ARENA_XP.round + (p.team === winner ? ARENA_XP.win : winner === "draw" ? Math.round(ARENA_XP.win / 2) : 0) + (mvp?.id === p.id ? ARENA_XP.mvp : 0) + kos * ARENA_XP.ko;
      const style = p.look?.style ?? "classic";
      const socket = p.socket;
      void addCharacterXp(p.userId, style, xp)
        .then((doc) => {
          if (!doc) return;
          const after = doc.characters?.[style]?.xp ?? xp;
          socket.emit("aProgress", progressView(doc, style, { gained: xp, levelUp: characterLevel(after) > characterLevel(after - xp) }));
        })
        .catch((e) => console.error("[arena] xp", e));
      let points = winner === "draw" ? ARENA_REWARD.draw : p.team === winner ? ARENA_REWARD.win : 0;
      const isMvp = mvp?.id === p.id;
      if (isMvp) points += ARENA_REWARD.mvp;
      if (!points) continue;
      const reason = isMvp ? "arena:mvp" : winner === "draw" ? "arena:draw" : "arena:win";
      await earn(p.userId, points, reason).catch((e) => console.error("[arena] reward", e));
      p.socket.emit("aReward", {
        points,
        text: isMvp ? `🏅 MVP! +${points} pts and coins` : winner === "draw" ? `🤝 Draw: +${points} pts and coins` : `🏆 Your team won! +${points} pts and coins`,
      });
    }
  };

  /** Paw Blaster and Sky Brawl: most knockouts wins */
  const knockoutsOver = () => {
    const { red, blue } = round.score;
    const winner: ArenaTeam | "draw" = red === blue ? "draw" : red > blue ? "red" : "blue";
    const pool = [...players.values()].filter((p) => winner === "draw" || p.team === winner);
    const mvp = pool.sort((a, b) => b.kos - a.kos || b.dealt - a.dealt)[0];
    const what = round.game === "brawl" ? "launched off" : "knockouts";
    void finish(winner, mvp && mvp.kos > 0 ? mvp : null, winner === "draw" ? `${red} : ${blue}, all square` : `${red} : ${blue} ${what}`);
  };

  // ——— Actions (people and AI players alike) ———

  const launch = (p: Player, ry: number, kind: ArenaShotKind) => {
    const spec = SHOTS[kind];
    const dx = Math.sin(ry);
    const dz = Math.cos(ry);
    const s: Shot = { id: randomUUID().slice(0, 8), by: p, team: p.team, kind, x: p.x + dx * 0.9, z: p.z + dz * 0.9, dx, dz, left: spec.range };
    shots.push(s);
    out.emit("aShot", { id: s.id, by: p.id, team: p.team, x: round2(s.x), z: round2(s.z), ry: round2(ry), speed: spec.speed, range: spec.range, kind });
  };

  const canAct = (p: Player, now: number) => playing() && !p.ko && p.stunnedUntil <= now && p.flightUntil <= now;

  /** Enemies a power can reach: in range (and in a cone, for fire), not hidden behind cover */
  const enemiesNear = (p: Player, r: number, now: number, arc?: number) =>
    [...players.values()].filter((o) => {
      if (o.team === p.team || untouchable(o, now)) return false;
      const d = Math.hypot(o.x - p.x, o.z - p.z);
      if (d > r) return false;
      if (arc !== undefined && d > 0.5 && angleGap(Math.atan2(o.x - p.x, o.z - p.z), p.ry) > arc) return false;
      return !(playing("blaster") && lineBlocked(p.x, p.z, o.x, o.z, 0.1));
    });

  /** Sky Brawl: a claw swipe, the next step of the combo (the third launches) */
  const claw = (p: Player, ry: number) => {
    const now = Date.now();
    if (!canAct(p, now) || now - p.fireAt < BRAWL_CLAW.gapMs || !Number.isFinite(ry)) return;
    p.fireAt = now;
    p.ry = round2(ry);
    p.combo = now - p.comboAt < BRAWL_CLAW.comboMs ? (p.combo + 1) % BRAWL_COMBO.length : 0;
    p.comboAt = now;
    const step = BRAWL_COMBO[p.combo];
    const last = p.combo === BRAWL_COMBO.length - 1;
    const fx = Math.sin(p.ry);
    const fz = Math.cos(p.ry);
    const hit = enemiesNear(p, BRAWL_CLAW.range, now, BRAWL_CLAW.arc).filter((o) =>
      strike(o, p, step.dmg, step.force, o.x - p.x + fx * 1.5, o.z - p.z + fz * 1.5, "claw", last ? 0 : 150),
    );
    out.emit("aSwipe", { id: p.id, step: p.combo, ry: p.ry, targets: hit.map((o) => o.id) });
  };

  const fireShot = (p: Player, ry: number) => {
    if (round.game === "brawl") return claw(p, ry);
    const now = Date.now();
    // No throwing mid-air: a jump is a dodge, not a free shot
    if (!canAct(p, now) || airborne(p, now) || now - p.fireAt < FIRE_GAP_MS || !Number.isFinite(ry)) return;
    p.fireAt = now;
    p.ry = round2(ry);
    launch(p, p.ry, "yarn");
  };

  const doJump = (p: Player) => {
    const now = Date.now();
    // (anywhere but the countdown: hopping about in the hall is half the fun)
    if (p.ko || p.stunnedUntil > now || p.flightUntil > now || round.phase === "countdown") return;
    if (now - p.jumpAt < ARENA_JUMP.cooldownMs || airborne(p, now)) return;
    p.jumpAt = now;
    p.airUntil = now + ARENA_JUMP.airMs;
    out.emit("aJump", { id: p.id });
  };

  const doShove = (p: Player) => {
    const now = Date.now();
    if (!canAct(p, now) || round.game !== "summit" || airborne(p, now)) return;
    if (now - p.shoveAt < SHOVE_GAP_MS) return;
    p.shoveAt = now;
    const target = [...players.values()]
      .filter((o) => o.team !== p.team && !untouchable(o, now) && Math.hypot(o.x - p.x, o.z - p.z) < SHOVE_RANGE)
      .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
    if (!target) return;
    out.emit("aShoved", { by: p.id, target: target.id });
    knock(target, target.x - p.x, target.z - p.z, SHOVE_PUSH, SHOVE_STUN_MS);
  };

  /** Sky Brawl (E): a quick dash nothing can touch */
  const doDash = (p: Player, ry: number) => {
    const now = Date.now();
    if (!playing("brawl") || !canAct(p, now) || now - p.dashAt < BRAWL_DASH.cooldownMs || !Number.isFinite(ry)) return;
    p.dashAt = now;
    p.ry = round2(ry);
    p.dodgeUntil = now + BRAWL_DASH.dodgeMs;
    const from = { x: p.x, z: p.z };
    const to = reach(p, p.ry, BRAWL_DASH.dist, false);
    out.emit("aDash", { id: p.id, x: round2(from.x), z: round2(from.z), tx: round2(to.x), tz: round2(to.z) });
    placeAt(p, to.x, to.z, p.ry, 0, BRAWL_DASH.ms);
  };

  const useAbility = (p: Player, ry: number) => {
    const now = Date.now();
    const ability = arenaAbilityOf(p.look);
    if (!canAct(p, now) || p.silenceUntil > now || now - p.abilityAt < ability.cooldownMs * p.mods.powerCd) return;
    if (Number.isFinite(ry)) p.ry = round2(ry);
    p.abilityAt = now;
    const brawl = round.game === "brawl";
    const from = { x: p.x, z: p.z };
    const told = (kind: ArenaAbilityKind, to?: { x: number; z: number }) =>
      out.emit("aAbility", { id: p.id, kind, x: round2(from.x), z: round2(from.z), ry: p.ry, ...(to ? { tx: round2(to.x), tz: round2(to.z) } : {}) });
    const struck = (kind: ArenaAbilityKind, hit: Player[]) => hit.length && out.emit("aStruck", { by: p.id, kind, targets: hit.map((h) => h.id) });

    switch (ability.kind) {
      case "pounce": {
        const to = reach(p, p.ry, ARENA_LEAPS.pounce, false);
        p.airUntil = now + POUNCE_AIR_MS;
        told("pounce", to);
        placeAt(p, to.x, to.z, p.ry);
        // Sky Brawl: the landing knocks everyone near away
        if (brawl) later_(POUNCE_AIR_MS - 120, () => live(p) && !p.ko && struck("pounce", blast(p, p.x, p.z, 3, 7, 2.6, "power")));
        break;
      }
      case "blink":
      case "shadow": {
        const to = reach(p, p.ry, ARENA_LEAPS[ability.kind], true);
        if (ability.kind === "shadow") p.shieldUntil = Math.max(p.shieldUntil, now + SHADOW_SHIELD_MS);
        told(ability.kind, to);
        placeAt(p, to.x, to.z, p.ry);
        out.emit("aPlayer", view(p));
        break;
      }
      case "slam": {
        told("slam");
        if (brawl) {
          struck("slam", blast(p, p.x, p.z, SLAM.r, 11, 3.6, "power"));
          break;
        }
        const hit = enemiesNear(p, SLAM.r, now);
        for (const o of hit) {
          if (o.guardUntil > now) continue;
          hurt(o, p, 1, "slam");
          if (!o.ko) knock(o, o.x - p.x, o.z - p.z, SLAM.push, SLAM.stunMs);
        }
        struck("slam", hit);
        break;
      }
      case "roar": {
        told("roar");
        const hit = enemiesNear(p, ROAR.r, now).filter((o) => o.guardUntil <= now);
        if (brawl) struck("roar", hit.filter((o) => strike(o, p, 4, 0, 0, 0, "power", ROAR.stunMs)));
        else {
          for (const o of hit) stun(o, ROAR.stunMs);
          struck("roar", hit);
        }
        break;
      }
      case "breath": {
        told("breath");
        const hit = enemiesNear(p, BREATH.r, now, BREATH.arc);
        if (brawl) {
          struck("breath", hit.filter((o) => strike(o, p, 10, 3.2, o.x - p.x, o.z - p.z, "power")));
          break;
        }
        for (const o of hit) {
          if (o.guardUntil > now) continue;
          hurt(o, p, 1, "breath");
          if (!o.ko) knock(o, o.x - p.x, o.z - p.z, BREATH.push, BREATH.stunMs);
        }
        struck("breath", hit);
        break;
      }
      case "triple":
        told("triple");
        for (const turn of [-TRIPLE_SPREAD, 0, TRIPLE_SPREAD]) launch(p, p.ry + turn, "yarn");
        p.fireAt = now;
        break;
      case "cannon":
        told("cannon");
        launch(p, p.ry, "cannon");
        p.fireAt = now;
        break;
      case "boost":
        p.boostUntil = now + BOOST_MS;
        told("boost");
        out.emit("aPlayer", view(p));
        break;
      case "phase":
        p.phaseUntil = now + PHASE_MS;
        told("phase");
        out.emit("aPlayer", view(p));
        break;
      case "shield":
        p.guardUntil = now + GUARD_MS;
        told("shield");
        out.emit("aPlayer", view(p));
        break;
      case "snare": {
        const mine = snares.filter((s) => s.by === p);
        if (mine.length >= SNARE.max) {
          snares = snares.filter((s) => s !== mine[0]);
          out.emit("aSnareGone", { id: mine[0].id, caught: null });
        }
        const s: Snare = { id: randomUUID().slice(0, 8), by: p, team: p.team, x: round2(p.x), z: round2(p.z), until: now + SNARE.lastsMs };
        snares.push(s);
        told("snare");
        out.emit("aSnare", { id: s.id, team: s.team, x: s.x, z: s.z });
        break;
      }
    }
  };

  /** Sky Brawl (R): your character's ultimate, once it's charged */
  const ultimate = (p: Player, ry: number) => {
    const now = Date.now();
    if (!playing("brawl") || !canAct(p, now) || p.silenceUntil > now || p.ult < BRAWL_ULT_MAX) return;
    if (Number.isFinite(ry)) p.ry = round2(ry);
    p.ult = 0;
    const u = brawlUltOf(p.look);
    const from = { x: p.x, z: p.z };
    const fx = Math.sin(p.ry);
    const fz = Math.cos(p.ry);
    const told = (to?: { x: number; z: number }) =>
      out.emit("aUlt", { id: p.id, kind: u.kind, x: round2(from.x), z: round2(from.z), ry: p.ry, ...(to ? { tx: round2(to.x), tz: round2(to.z) } : {}) });
    const still = () => live(p) && !p.ko;
    const struck = (hit: Player[]) => hit.length && out.emit("aStruck", { by: p.id, kind: arenaAbilityOf(p.look).kind, targets: hit.map((h) => h.id) });

    switch (u.kind) {
      case "comet": {
        const to = reach(p, p.ry, 12, false);
        p.airUntil = now + 640;
        told(to);
        placeAt(p, to.x, to.z, p.ry, 0, 560);
        later_(560, () => still() && struck(blast(p, p.x, p.z, 5, 16, 6, "ult")));
        break;
      }
      case "quake":
        told();
        p.guardUntil = Math.max(p.guardUntil, now + 900);
        struck(blast(p, p.x, p.z, 5, 9, 2.4, "ult", 200));
        later_(480, () => still() && struck(blast(p, p.x, p.z, 9.5, 12, 6.4, "ult")));
        break;
      case "kingroar":
        told();
        struck(enemiesNear(p, 12.5, now).filter((o) => strike(o, p, 10, 2.6, o.x - p.x, o.z - p.z, "ult", 1_600)));
        break;
      case "meteors": {
        const to = fit(p.x + fx * 9, p.z + fz * 9);
        told(to);
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = i === 0 ? 0 : rand(1.5, 4.8);
          addHazard("spell", to.x + Math.cos(a) * r, to.z + Math.sin(a) * r, 2.5, 650 + i * 170, p, 12, 4.6);
        }
        break;
      }
      case "beam":
        told(fit(p.x + fx * 17, p.z + fz * 17));
        p.guardUntil = Math.max(p.guardUntil, now + 450);
        later_(380, () => {
          if (!still()) return;
          const t = Date.now();
          const hit = [...players.values()].filter((o) => {
            if (o.team === p.team || untouchable(o, t)) return false;
            const along = (o.x - p.x) * fx + (o.z - p.z) * fz;
            const side = Math.abs((o.x - p.x) * fz - (o.z - p.z) * fx);
            return along > -0.5 && along < 17 && side < 1.9;
          });
          struck(hit.filter((o) => strike(o, p, 18, 6, fx, fz, "ult")));
        });
        break;
      case "orbital": {
        told();
        const targets = enemiesNear(p, 22, now)
          .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))
          .slice(0, 3);
        for (const o of targets) addHazard("orbital", o.x, o.z, 2.8, 1_100, p, 20, 6.4);
        break;
      }
      case "cuts": {
        const targets = enemiesNear(p, 12, now)
          .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))
          .slice(0, 4);
        told();
        p.dodgeUntil = now + targets.length * 170 + 250;
        targets.forEach((o, i) =>
          later_(i * 170 + 60, () => {
            if (!still() || o.ko || !live(o)) return;
            const d = unit(o.x - p.x, o.z - p.z);
            const spot = fit(o.x - d.x * 1.2, o.z - d.z * 1.2);
            out.emit("aDash", { id: p.id, x: p.x, z: p.z, tx: round2(spot.x), tz: round2(spot.z) });
            placeAt(p, spot.x, spot.z, Math.atan2(d.x, d.z), 0, 90);
            const lastOne = i === targets.length - 1;
            if (strike(o, p, 9, lastOne ? 6 : 1.4, d.x, d.z, "ult", lastOne ? 0 : 300)) struck([o]);
          }),
        );
        break;
      }
      case "broadside":
        told();
        for (const turn of [-0.36, -0.18, 0, 0.18, 0.36]) launch(p, p.ry + turn, "cannon");
        p.fireAt = now;
        break;
      case "inferno":
        told();
        struck(enemiesNear(p, 11, now, 0.75).filter((o) => strike(o, p, 20, 6.2, o.x - p.x, o.z - p.z, "ult")));
        break;
      case "vortex": {
        told();
        const pulled = enemiesNear(p, 10, now).filter((o) => o.guardUntil <= now);
        for (const o of pulled) {
          const d = Math.hypot(o.x - p.x, o.z - p.z);
          o.lastBy = p;
          o.lastAt = now;
          o.lastHow = "ult";
          if (d > 1.6) launchCat(o, p.x - o.x, p.z - o.z, d - 1.4, p, 250);
        }
        later_(700, () => still() && struck(blast(p, p.x, p.z, 4.4, 15, 6.2, "ult")));
        break;
      }
      case "closed": {
        told();
        const caught = enemiesNear(p, 14, now).filter((o) => o.guardUntil <= now);
        for (const o of caught) o.markUntil = now + 6_000;
        struck(caught.filter((o) => strike(o, p, 5, 0, 0, 0, "ult", 1_500)));
        break;
      }
      case "charge": {
        const to = reach(p, p.ry, 13, false);
        told(to);
        p.guardUntil = Math.max(p.guardUntil, now + 650);
        const len = Math.hypot(to.x - from.x, to.z - from.z);
        const hit = enemiesNear(p, len + 2.3, now).filter((o) => {
          const along = (o.x - from.x) * fx + (o.z - from.z) * fz;
          const side = Math.abs((o.x - from.x) * fz - (o.z - from.z) * fx);
          return along > -0.5 && along < len + 1.5 && side < 2.3;
        });
        placeAt(p, to.x, to.z, p.ry, 0, 450);
        for (const o of hit) {
          const along = (o.x - from.x) * fx + (o.z - from.z) * fz;
          const sideSign = (o.x - from.x) * fz - (o.z - from.z) * fx >= 0 ? 1 : -1;
          later_(Math.max(40, Math.min(420, (along / Math.max(1, len)) * 450)), () => {
            if (still() && strike(o, p, 16, 6, fx + fz * sideSign * 0.6, fz - fx * sideSign * 0.6, "ult")) struck([o]);
          });
        }
        break;
      }
    }
    out.emit("aPlayer", view(p));
  };

  /** The Anchor Hook: whoever it catches is yanked to the thrower (and held a moment) */
  const pullTo = (o: Player, by: Player) => {
    const now = Date.now();
    if (o.ko || o.guardUntil > now || !live(by)) return;
    const d = Math.hypot(o.x - by.x, o.z - by.z);
    const u = unit(o.x - by.x, o.z - by.z);
    if (round.game === "brawl") {
      strike(o, by, SHOTS.hook.bDmg, 0, 0, 0, "spell");
      if (!o.ko && d > 1.8) launchCat(o, by.x - o.x, by.z - o.z, d - 1.6, by, 500);
      return;
    }
    let spot = fit(by.x + u.x * 1.6, by.z + u.z * 1.6);
    if (solidCover() && inCover(spot.x, spot.z)) spot = { x: o.x, z: o.z };
    placeAt(o, spot.x, spot.z, o.ry, 700);
    out.emit("aPlayer", view(o));
  };

  /** Your spell (G): every character's own, in every game */
  const castSpell = (p: Player, ry: number) => {
    const now = Date.now();
    const spell = arenaSpellOf(p.look);
    if (!canAct(p, now) || p.silenceUntil > now || now - p.spellAt < spell.cooldownMs * p.mods.spellCd) return;
    if (Number.isFinite(ry)) p.ry = round2(ry);
    p.spellAt = now;
    const fx = Math.sin(p.ry);
    const fz = Math.cos(p.ry);
    const m = p.mods.spell;
    const told = (targets: Player[], to?: { x: number; z: number }) =>
      out.emit("aSpell", { id: p.id, kind: spell.kind, x: round2(p.x), z: round2(p.z), ry: p.ry, ...(to ? { tx: round2(to.x), tz: round2(to.z) } : {}), targets: targets.map((o) => o.id) });
    /** A spell's hit, by game: damage % and a launch (Sky Brawl), hearts (Paw Blaster), a push (all), a stun */
    const zap = (o: Player, hp: number, dmg: number, force: number, push: number, stunMs: number, dx: number, dz: number) => {
      const t = Date.now();
      if (o.guardUntil > t) return false;
      if (round.game === "brawl") return strike(o, p, dmg, force, dx, dz, "spell", stunMs);
      if (untouchable(o, t)) return false;
      if (round.game === "blaster" && hp) hurt(o, p, hp, "spell");
      if (o.ko) return true;
      if (push) knock(o, dx, dz, push * m * (round.game === "summit" ? 1 : 0.7), stunMs);
      else if (stunMs) stun(o, stunMs);
      return true;
    };
    const team = (r: number) => [...players.values()].filter((o) => o.team === p.team && !o.ko && Math.hypot(o.x - p.x, o.z - p.z) < r);
    switch (spell.kind) {
      case "tornado":
      case "meteor": {
        const tornado = spell.kind === "tornado";
        const to = fit(p.x + fx * (tornado ? 8 : 10), p.z + fz * (tornado ? 8 : 10));
        told([], to);
        const r = tornado ? 3 : 3.4;
        addHazard(tornado ? "tornado" : "meteor", to.x, to.z, r, tornado ? 450 : 900, p, 0, 0, 0, (o) =>
          tornado ? zap(o, 1, 10, 4, 6, 400, o.x - to.x, o.z - to.z) : zap(o, 2, 16, 6, 8, 600, o.x - to.x, o.z - to.z),
        );
        break;
      }
      case "snack": {
        const friends = team(7);
        for (const o of friends) {
          if (round.game === "blaster") o.hp = Math.min(BLASTER_HP, o.hp + 1);
          if (round.game === "brawl") o.dmg = Math.max(0, o.dmg - 25 * m);
          if (round.game === "summit") o.guardUntil = Math.max(o.guardUntil, now + 1_500);
          out.emit("aPlayer", view(o));
        }
        told(friends);
        break;
      }
      case "rally": {
        const friends = team(10);
        for (const o of friends) {
          o.boostUntil = Math.max(o.boostUntil, now + 3_000);
          o.shieldUntil = Math.max(o.shieldUntil, now + 1_000);
          out.emit("aPlayer", view(o));
        }
        told(friends);
        break;
      }
      case "orb":
        told([]);
        launch(p, p.ry, "orb");
        break;
      case "hook":
        told([]);
        launch(p, p.ry, "hook");
        break;
      case "emp": {
        const hit = enemiesNear(p, 7, now).filter((o) => o.guardUntil <= now);
        for (const o of hit) o.silenceUntil = now + 3_000;
        told(hit.filter((o) => zap(o, 0, 4, 0, 0, 600, o.x - p.x, o.z - p.z)));
        break;
      }
      case "smoke":
        p.veilUntil = now + 3_500;
        out.emit("aPlayer", view(p));
        told([]);
        break;
      case "flamering":
        told(enemiesNear(p, 5.5, now).filter((o) => zap(o, 1, 9, 3.5, 5, 300, o.x - p.x, o.z - p.z)));
        break;
      case "haunt":
        told(enemiesNear(p, 8, now).filter((o) => zap(o, 0, 4, 2.5, 5, 1_000, o.x - p.x, o.z - p.z)));
        break;
      case "spotlight": {
        const hit = enemiesNear(p, 13, now);
        for (const o of hit) {
          o.markUntil = now + 5_000;
          // (and out of any smoke)
          o.veilUntil = 0;
          out.emit("aPlayer", view(o));
        }
        told(hit);
        break;
      }
      case "bulwark": {
        const friends = team(6);
        for (const o of friends) {
          o.shieldUntil = Math.max(o.shieldUntil, now + 3_000);
          out.emit("aPlayer", view(o));
        }
        p.guardUntil = Math.max(p.guardUntil, now + 1_500);
        out.emit("aPlayer", view(p));
        told(friends);
        break;
      }
    }
  };

  /** Buys the next upgrade for the character someone plays (coins), and puts it to use straight away */
  const upgrade = async (p: Player): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (!p.userId) return { ok: false, error: "Join the arena first." };
    const style = p.look?.style ?? "classic";
    const r = await upgradeCharacter(p.userId, style);
    if (!r.ok) return r;
    p.coins = r.wallet.coins;
    p.kit = r.wallet.kit ?? {};
    sendKit(p);
    const user = await users.findOne({ _id: p.userId }, { projection: { characters: 1, coins: 1, look: 1 } });
    if (user && live(p)) {
      const progress = progressView(user, style);
      p.tier = progress.tier;
      p.mods = progress.mods;
      p.socket?.emit("aProgress", progress);
      out.emit("aPlayer", view(p));
    }
    return { ok: true };
  };

  /** A battle item from someone's kit: one from the database, then its effect */
  const useItem = async (p: Player, id: BattleItemId, ry: number): Promise<{ ok: true } | { ok: false; error: string }> => {
    const item = BATTLE_ITEM_BY_ID.get(id);
    if (!item || !p.userId) return { ok: false, error: "That item doesn't exist." };
    const now = Date.now();
    if (round.phase !== "playing") return { ok: false, error: "Items work once the battle starts." };
    if (p.ko) return { ok: false, error: "You're knocked out." };
    if (p.flightUntil > now) return { ok: false, error: "Not while you're flying!" };
    // Only the tonic works through a stun (that's what it's for)
    if (p.stunnedUntil > now && id !== "tonic") return { ok: false, error: "You're stunned! (a Catnip Tonic shakes it off)" };
    const throws = id === "bomb" || id === "freeze";
    if (throws && airborne(p, now)) return { ok: false, error: "Not mid-air!" };
    if ((p.kit?.[id] ?? 0) < 1) return { ok: false, error: `You're out of ${item.name}. Get more in the shop!` };
    if ((p.used?.[id] ?? 0) >= ARENA_ITEM_USES) return { ok: false, error: `${item.emoji} ${item.name}: ${ARENA_ITEM_USES} per round, all used.` };
    if (now - (p.itemAt ?? 0) < ARENA_ITEM_GAP_MS) return { ok: false, error: "One item at a time: wait a moment." };
    // Claimed before the database answers, so a double press can't use two
    const before = { used: { ...(p.used ?? {}) }, itemAt: p.itemAt ?? 0 };
    p.used = { ...(p.used ?? {}), [id]: (p.used?.[id] ?? 0) + 1 };
    p.itemAt = now;
    const wallet = await useKit(p.userId, id);
    if (!wallet) {
      p.used = before.used;
      p.itemAt = before.itemAt;
      p.kit = { ...(p.kit ?? {}), [id]: 0 };
      sendKit(p);
      return { ok: false, error: `You're out of ${item.name}. Get more in the shop!` };
    }
    p.kit = wallet.kit ?? {};
    p.coins = wallet.coins;
    sendKit(p);
    if (!live(p) || round.phase !== "playing" || p.ko) return { ok: true };
    const t = Date.now();
    if (Number.isFinite(ry)) p.ry = round2(ry);
    out.emit("aItem", { id: p.id, item: id, x: p.x, z: p.z });
    switch (id) {
      case "tonic":
        if (round.game === "blaster" && p.hp < BLASTER_HP) p.hp += 1;
        if (round.game === "summit") p.guardUntil = Math.max(p.guardUntil, t + 1_000);
        if (round.game === "brawl") p.dmg = Math.max(0, p.dmg - 25);
        if (p.stunnedUntil > t) {
          p.stunnedUntil = 0;
          placeAt(p, p.x, p.z, p.ry);
        }
        out.emit("aPlayer", view(p));
        break;
      case "zoomies":
        p.boostUntil = Math.max(p.boostUntil, t + 4_000);
        out.emit("aPlayer", view(p));
        break;
      case "bubble":
        p.shieldUntil = Math.max(p.shieldUntil, t + 3_000);
        out.emit("aPlayer", view(p));
        break;
      case "bomb": {
        // Lobbed over cover, landing short of anything solid
        const to = reach(p, p.ry, ARENA_BOMB.range, true);
        const b: Bomb = { id: randomUUID().slice(0, 8), by: p, team: p.team, x: round2(to.x), z: round2(to.z), at: t + ARENA_BOMB.fuseMs };
        bombs.push(b);
        out.emit("aBomb", { id: b.id, team: b.team, x: p.x, z: p.z, tx: b.x, tz: b.z, fuseMs: ARENA_BOMB.fuseMs });
        break;
      }
      case "freeze":
        launch(p, p.ry, "ice");
        p.fireAt = t;
        break;
      case "recharge":
        p.abilityAt = 0;
        break;
    }
    return { ok: true };
  };

  // ——— AI players ———

  /** A bot walks the way it wants, under people's rules: speed (slower uphill, faster boosted), area, cover, stuns */
  const moveBot = (p: Player, a: Action, now: number) => {
    if (a.face !== null) p.ry = round2(a.face);
    // By the real time since its last step (like people's moves), so a late tick never means extra speed
    const dt = Math.min(0.1, Math.max(0, (now - p.budgetAt) / 1000));
    p.budgetAt = now;
    if (!a.move || p.ko || p.stunnedUntil > now || p.flightUntil > now || round.phase === "countdown") return;
    const climbing = playing("summit") && Math.hypot(p.x - SUMMIT_HILL.x, p.z - SUMMIT_HILL.z) < SUMMIT_HILL.radius;
    const boost = p.boostUntil > now ? ARENA_BOOST_SPEED : 1;
    const step = MAX_SPEED * Math.min(1, Math.max(0, a.move.pace)) * (climbing ? SUMMIT_CLIMB : 1) * boost * p.mods.speed * dt;
    const crates = solidCover();
    const base = Math.atan2(a.move.x, a.move.z);
    // Around cover: try turning a little, then more, either way
    for (const turn of [0, 0.45, -0.45, 0.9, -0.9, 1.4, -1.4, 2]) {
      const ang = base + turn;
      const to = fit(p.x + Math.sin(ang) * step, p.z + Math.cos(ang) * step);
      if (crates && inCover(to.x, to.z)) continue;
      p.x = round2(to.x);
      p.z = round2(to.z);
      return;
    }
  };

  const botsTurn = (now: number) => {
    const cats: Seen[] = [...players.values()].map((p) => ({
      id: p.id,
      team: p.team,
      x: p.x,
      z: p.z,
      vx: p.vx,
      vz: p.vz,
      hp: p.hp,
      ko: p.ko,
      stunned: p.stunnedUntil > now,
      shielded: p.shieldUntil > now || p.phaseUntil > now || p.dodgeUntil > now || p.veilUntil > now,
      guarded: p.guardUntil > now,
      air: p.airUntil > now,
      dmg: p.dmg,
      flying: p.flightUntil > now,
    }));
    const world: World = {
      now,
      holder: round.holder ? { id: round.holder.id, team: round.holder.team } : null,
      game: round.game,
      phase: round.phase,
      cats,
      shots: shots.map((s) => ({ team: s.team, x: s.x, z: s.z, dx: s.dx, dz: s.dz })),
      boulders: boulders.map((b) => ({ x: b.x, z: b.z, dx: b.dx, dz: b.dz })),
      snares: snares.map((s) => ({ team: s.team, x: s.x, z: s.z })),
      shotSpeed: SHOTS.yarn.speed,
      shotRange: SHOTS.yarn.range,
      shoveRange: SHOVE_RANGE,
      boulderSpeed: BOULDER_SPEED,
      boulderRadius: BOULDER_R,
      won: null,
      ...(isBrawl
        ? {
            island: { x: BRAWL_ISLAND.x, z: BRAWL_ISLAND.z, radius: islandR(), crumbleTo: round.island?.to ?? null },
            hazards: hazards.map((h) => ({ x: h.x, z: h.z, r: h.r, team: h.team, inMs: h.at - now })),
            powerUps: powerUps.map((u) => ({ x: u.x, z: u.z, kind: u.kind })),
            clawRange: BRAWL_CLAW.range,
          }
        : {}),
    };
    for (const p of bots()) {
      const me = cats.find((c) => c.id === p.id)!;
      const ability = arenaAbilityOf(p.look);
      const ready = {
        jump: now - p.jumpAt >= ARENA_JUMP.cooldownMs && !airborne(p, now),
        ability: now - p.abilityAt >= ability.cooldownMs * p.mods.powerCd && p.silenceUntil <= now,
        spell: now - p.spellAt >= arenaSpellOf(p.look).cooldownMs * p.mods.spellCd && p.silenceUntil <= now,
        fire: now - p.fireAt >= (isBrawl ? BRAWL_CLAW.gapMs : FIRE_GAP_MS),
        dash: isBrawl && now - p.dashAt >= BRAWL_DASH.cooldownMs,
        ult: isBrawl && p.ult >= BRAWL_ULT_MAX,
      };
      const action = think(
        me,
        p.mind!,
        { ...world, won: round.phase === "results" && round.winner ? round.winner === p.team || round.winner === "draw" : null },
        ability.kind,
        ready,
        isBrawl ? brawlUltOf(p.look).kind : undefined,
        arenaSpellOf(p.look).kind,
      );
      moveBot(p, action, now);
      if (action.jump && ready.jump) doJump(p);
      if (action.dash && ready.dash) doDash(p, p.ry);
      if (action.ult && ready.ult) ultimate(p, p.ry);
      if (action.ability && ready.ability) useAbility(p, p.ry);
      else if (action.spell && ready.spell) castSpell(p, p.ry);
      if (action.fire) fireShot(p, p.ry);
      if (action.shove) doShove(p);
      if (action.emote && now - p.emoteAt > 700) {
        p.emoteAt = now;
        out.emit("aEmote", { id: p.id, emote: action.emote });
      }
    }
  };

  // ——— The game, a tick at a time ———

  const tick = () => {
    const now = Date.now();
    tickCount += 1;

    // Nobody (but AI players) left: everyone goes home and the room waits
    if (humans().length === 0 && players.size > 0) {
      syncBots();
      clearField();
      if (round.phase !== "waiting") {
        setPhase("waiting", null);
        sendRound();
      }
    }
    if (round.phase === "waiting" && humans().length > 0) syncBots();
    if (players.size === 0) return;

    // How fast everyone's moving (bots lead their shots with this)
    for (const p of players.values()) {
      const vx = (p.x - p.lastX) / (TICK_MS / 1000);
      const vz = (p.z - p.lastZ) / (TICK_MS / 1000);
      // A jump (respawn, shove, blink) isn't speed
      if (Math.hypot(vx, vz) < MAX_SPEED * ARENA_BOOST_SPEED * 1.5) {
        p.vx = p.vx * 0.5 + vx * 0.5;
        p.vz = p.vz * 0.5 + vz * 0.5;
      }
      p.lastX = p.x;
      p.lastZ = p.z;
    }
    if (bots().length) botsTurn(now);

    // Phases
    if (round.phase === "waiting" && players.size >= MIN_PLAYERS) startCountdown();
    else if (round.phase === "countdown" && now >= (round.endsAt ?? 0)) {
      if (players.size < MIN_PLAYERS) {
        setPhase("waiting", null);
        for (const p of players.values()) toBase(p);
        sendRound();
      } else startPlaying();
    } else if (round.phase === "playing") {
      if (teamSize("red") === 0 || teamSize("blue") === 0) {
        const left = teamSize("red") ? "red" : teamSize("blue") ? "blue" : "draw";
        void finish(left, null, "The other team left");
      } else if (now >= (round.endsAt ?? 0)) {
        if (round.game !== "summit") knockoutsOver();
        else if (round.holder && players.has(round.holder.id)) {
          // Overtime: someone's holding the top, so it plays out (they win, or get knocked off)
        } else {
          // Time's up: the team that held it longer wins (a draw if it's even)
          const { red, blue } = round.score;
          const winner: ArenaTeam | "draw" = red === blue ? "draw" : red > blue ? "red" : "blue";
          const mvp = winner === "draw" ? null : [...players.values()].filter((p) => p.team === winner).sort((x, y) => (y.holdMs ?? 0) - (x.holdMs ?? 0))[0] ?? null;
          void finish(winner, mvp, winner === "draw" ? (red ? "Even time on top" : "Nobody held the top") : `${ARENA_TEAMS[winner].name} held the top longer`);
        }
      }
    } else if (round.phase === "results" && now >= (round.endsAt ?? 0)) {
      if (players.size >= MIN_PLAYERS) startCountdown();
      else {
        setPhase("waiting", null);
        for (const p of players.values()) toBase(p);
        sendRound();
      }
    }

    if (playing("blaster")) {
      // Knocked-out cats come back at their base
      for (const p of players.values()) {
        if (p.ko && now >= p.respawnAt) {
          p.ko = false;
          p.hp = BLASTER_HP;
          p.stunnedUntil = 0;
          p.shieldUntil = now + SPAWN_SHIELD_MS + p.mods.shieldMs;
          toBase(p);
          out.emit("aPlayer", view(p));
        }
      }
    }
    if (playing("brawl")) brawlTick(now);
    if (playing()) {
      // Hazards land (meteors, lightning, ultimates, spells): in every game
      if (hazards.length) {
        const due = hazards.filter((h) => h.at <= now);
        hazards = hazards.filter((h) => h.at > now);
        for (const h of due) {
          const hit = [...players.values()].filter((o) => (!h.team || o.team !== h.team) && !untouchable(o, now) && Math.hypot(o.x - h.x, o.z - h.z) < h.r);
          const struck = hit.filter((o) => (h.hit ? h.hit(o) : strike(o, h.by && live(h.by) ? h.by : null, h.dmg, h.force, o.x - h.x, o.z - h.z, h.by ? "ult" : "hazard", h.stunMs)));
          out.emit("aHazardHit", { id: h.id, kind: h.kind, x: h.x, z: h.z, r: h.r, targets: struck.map((o) => o.id) });
        }
      }
    }

    if (playing()) {
      // Yarn (and cannonballs) in flight
      const area = areaOf(round.game);
      const crates = round.game === "blaster";
      const span = round.game === "brawl" ? area.half + 6 : area.half + 0.8;
      shots = shots.filter((s) => {
        const spec = SHOTS[s.kind];
        const step = (spec.speed * TICK_MS) / 1000;
        for (let sub = 0; sub < 3; sub++) {
          const d = step / 3;
          s.x += s.dx * d;
          s.z += s.dz * d;
          s.left -= d;
          if (s.left <= 0 || Math.abs(s.x - area.x) > span || Math.abs(s.z - area.z) > span || (crates && inCover(s.x, s.z, 0.15))) {
            out.emit("aHit", { shot: s.id, target: null, x: round2(s.x), z: round2(s.z) });
            return false;
          }
          const hit = [...players.values()].find(
            (p) =>
              p.team !== s.team &&
              !untouchable(p, now) &&
              // On the hill a cat that's just been knocked can't be juggled
              !(round.game === "summit" && p.stunnedUntil > now) &&
              Math.hypot(p.x - s.x, p.z - s.z) < spec.hitR,
          );
          if (!hit) continue;
          if (hit.guardUntil > now) {
            out.emit("aHit", { shot: s.id, target: hit.id, x: round2(s.x), z: round2(s.z), blocked: true });
            return false;
          }
          out.emit("aHit", { shot: s.id, target: hit.id, x: round2(s.x), z: round2(s.z) });
          const by = s.by;
          if (s.kind === "hook") {
            pullTo(hit, by);
            return false;
          }
          if (round.game === "brawl") {
            strike(hit, by, spec.bDmg, spec.bForce, s.dx, s.dz, s.kind === "cannon" ? "power" : s.kind === "orb" ? "spell" : "claw", spec.bStunMs);
            return false;
          }
          const onHill = round.game === "summit";
          if (!onHill && spec.damage) hurt(hit, by, spec.damage, s.kind === "cannon" ? "cannon" : s.kind === "orb" ? "spell" : "yarn");
          const push = onHill ? spec.hillPush : spec.push;
          const stunMs = onHill ? spec.hillStunMs : spec.stunMs;
          if (!hit.ko) {
            if (push) knock(hit, s.dx, s.dz, push, stunMs);
            else if (stunMs) stun(hit, stunMs);
          }
          return false;
        }
        return true;
      });

      // Hairball Bombs burst: enemies near are hurt (Paw Blaster) and knocked back
      bombs = bombs.filter((b) => {
        if (now < b.at) return true;
        const hit = [...players.values()].filter((o) => o.team !== b.team && !untouchable(o, now) && o.guardUntil <= now && Math.hypot(o.x - b.x, o.z - b.z) < ARENA_BOMB.radius);
        out.emit("aBombBurst", { id: b.id, x: b.x, z: b.z, targets: hit.map((o) => o.id) });
        for (const o of hit) {
          if (round.game === "brawl") {
            strike(o, b.by, 10, 4, o.x - b.x, o.z - b.z, "power");
            continue;
          }
          if (round.game === "blaster") hurt(o, b.by, 1, "bomb");
          if (!o.ko) knock(o, o.x - b.x, o.z - b.z, round.game === "blaster" ? 4 : 6, round.game === "blaster" ? 500 : 700);
        }
        return false;
      });

      // Snares: the first enemy to step in is stuck
      snares = snares.filter((s) => {
        if (now >= s.until) {
          out.emit("aSnareGone", { id: s.id, caught: null });
          return false;
        }
        const caught = [...players.values()].find((p) => p.team !== s.team && !untouchable(p, now) && p.guardUntil <= now && Math.hypot(p.x - s.x, p.z - s.z) < SNARE.r);
        if (!caught) return true;
        if (round.game === "brawl") strike(caught, s.by, 4, 0, 0, 0, "power", SNARE.stunMs);
        else stun(caught, SNARE.stunMs);
        out.emit("aSnareGone", { id: s.id, caught: caught.id });
        return false;
      });
    }

    if (playing("summit")) {
      // Yarn boulders roll down from the top
      if (now >= boulderAt) {
        boulderAt = now + BOULDER_EVERY_MS;
        const a = Math.random() * Math.PI * 2;
        const b: Boulder = { id: randomUUID().slice(0, 8), x: SUMMIT_HILL.x + Math.cos(a) * 1.5, z: SUMMIT_HILL.z + Math.sin(a) * 1.5, dx: Math.cos(a), dz: Math.sin(a) };
        boulders.push(b);
        out.emit("aBoulder", { id: b.id, x: round2(b.x), z: round2(b.z), dx: round2(b.dx), dz: round2(b.dz), speed: BOULDER_SPEED });
      }
      const step = (BOULDER_SPEED * TICK_MS) / 1000;
      boulders = boulders.filter((b) => {
        b.x += b.dx * step;
        b.z += b.dz * step;
        if (Math.hypot(b.x - SUMMIT_HILL.x, b.z - SUMMIT_HILL.z) > SUMMIT_HILL.radius + 2) {
          out.emit("aBoulderGone", { id: b.id });
          return false;
        }
        for (const p of players.values()) {
          if (p.stunnedUntil > now || untouchable(p, now)) continue;
          if (Math.hypot(p.x - b.x, p.z - b.z) < BOULDER_R + CAT_R) knock(p, b.dx, b.dz, BOULDER_PUSH, BOULDER_STUN_MS);
        }
        return true;
      });
      // King of the hill: whoever's on top adds to their team's time; first team to SUMMIT_HOLD_MS wins
      const onTop = (p: Player) => p.stunnedUntil <= now && Math.hypot(p.x - SUMMIT_HILL.x, p.z - SUMMIT_HILL.z) < SUMMIT_HILL.top;
      let holder = round.holder ? players.get(round.holder.id) : undefined;
      if (!holder || !onTop(holder)) {
        holder = [...players.values()].find(onTop);
        const was = round.holder?.id ?? null;
        round.holder = holder ? { id: holder.id, name: holder.name, team: holder.team } : null;
        if ((round.holder?.id ?? null) !== was) sendRound();
      }
      if (holder) {
        round.score[holder.team] = Math.min(SUMMIT_HOLD_MS, round.score[holder.team] + TICK_MS);
        holder.holdMs = (holder.holdMs ?? 0) + TICK_MS;
        holder.kos = holder.holdMs;
        if (round.score[holder.team] >= SUMMIT_HOLD_MS) {
          const mvp = [...players.values()].filter((p) => p.team === holder!.team).sort((x, y) => (y.holdMs ?? 0) - (x.holdMs ?? 0))[0] ?? holder;
          void finish(holder.team, mvp, `${ARENA_TEAMS[holder.team].name} held the summit!`);
        } else if (tickCount % 10 === 0) {
          sendRound(); // the time on top, twice a second
          out.emit("aPlayer", view(holder));
        }
      }
    }

    if (tickCount % STATE_EVERY === 0 && players.size) {
      out.emit("aState", { t: now, p: [...players.values()].map((p) => [p.id, p.x, p.z, p.ry] as [string, number, number, number]) });
    }
  };

  // ——— People coming and going ———

  /** Someone's in (their user from the database); the welcome for them */
  const join = (socket: ArenaSocket, user: WithId<UserDoc>): ArenaWelcome => {
    const id = user._id.toHexString();
    const existing = players.get(id);
    if (existing) {
      // Newest tab wins (or the same tab joining again)
      if (existing.socket && existing.socket !== socket) {
        existing.socket.emit("aKicked", { reason: "You joined the arena from another tab." });
        existing.socket.data.player = null;
        existing.socket.data.room = null;
        existing.socket.disconnect(true);
      }
      players.delete(id);
    }
    const streak = streakView(user).count;
    const style = user.look?.style ?? "classic";
    const progress = progressView(user, style);
    const p = freshPlayer({
      tier: progress.tier,
      mods: progress.mods,
      id,
      login: user.login,
      name: user.name,
      look: user.look ?? null,
      team: existing?.team ?? smallerTeam(),
      x: 0,
      z: 0,
      ry: 0,
      hp: BLASTER_HP,
      ko: false,
      kos: existing?.kos ?? 0,
      ...(user.supporter ? { supporter: user.supporter.tier } : {}),
      ...(streak >= 2 ? { streak } : {}),
      userId: user._id,
      socket,
      score: user.score ?? 0,
      joinedAt: existing?.joinedAt ?? Date.now(),
      kit: (user.battleKit ?? {}) as BattleKit,
      used: existing?.used ?? {},
      coins: user.coins ?? 0,
      itemAt: existing?.itemAt ?? 0,
    });
    players.set(id, p);
    socket.data.player = p;
    socket.data.room = n;
    void socket.join(key);
    toBase(p);
    // Dropping in mid-round: a moment's shield
    if (round.phase === "playing") p.shieldUntil = Date.now() + (isBrawl ? BRAWL_SPAWN_SHIELD_MS : SPAWN_SHIELD_MS);
    if (!existing) socket.to(key).emit("aJoined", view(p));
    else socket.to(key).emit("aPlayer", view(p));
    return {
      self: view(p),
      players: [...players.values()].filter((o) => o !== p).map(view),
      round,
      serverTime: Date.now(),
      passUntil: user.arenaPassUntil!.toISOString(),
      kit: kitView(p),
      host: hostView(),
      room: n,
      progress,
      ...(isBrawl ? { powerUps } : {}),
    };
  };

  /** Someone's out (gone, or switching games) */
  const leave = (socket: ArenaSocket) => {
    const p = socket.data.player;
    socket.data.player = null;
    socket.data.room = null;
    void socket.leave(key);
    if (!p || !live(p)) return;
    players.delete(p.id);
    snares = snares.filter((s) => {
      if (s.by !== p) return true;
      out.emit("aSnareGone", { id: s.id, caught: null });
      return false;
    });
    out.emit("aLeft", { id: p.id });
    syncHost();
  };

  /** This user is somewhere else now: out of here (another tab is told why) */
  const kickUser = (id: string, socket: ArenaSocket) => {
    const p = players.get(id);
    if (!p?.socket) return;
    if (p.socket === socket) return leave(socket);
    p.socket.emit("aKicked", { reason: "You joined the arena from another tab." });
    const old = p.socket;
    leave(old);
    old.disconnect(true);
  };

  const info = (): ArenaRoomInfo => ({
    game,
    room: n,
    players: humans().length,
    bots: bots().length,
    max: maxPlayers,
    phase: round.phase,
    endsAt: round.endsAt,
    score: round.score,
  });

  /** A move from someone's page: within their budget, the area and (in the colosseum) out of cover */
  const move = (p: Player, data: { x: number; z: number; ry: number; place: number }) => {
    if (!data || !Number.isFinite(data.x) || !Number.isFinite(data.z) || !Number.isFinite(data.ry) || data.place !== p.place) return;
    const now = Date.now();
    if (p.ko || p.stunnedUntil > now || p.flightUntil > now || round.phase === "countdown") return;
    // Uphill is slower, a Rocket Boost faster (the same as the page)
    const climbing = playing("summit") && Math.hypot(p.x - SUMMIT_HILL.x, p.z - SUMMIT_HILL.z) < SUMMIT_HILL.radius;
    const boost = (p.boostUntil > now - 250 ? ARENA_BOOST_SPEED : 1) * p.mods.speed;
    p.budget = Math.min(BUDGET_MAX * boost, p.budget + ((now - p.budgetAt) / 1000) * BUDGET_RATE * (climbing ? SUMMIT_CLIMB : 1) * boost);
    p.budgetAt = now;
    // During results you stay where the round left you (the next countdown takes you to your base)
    const to = fit(data.x, data.z);
    let { x, z } = to;
    let dx = x - p.x;
    let dz = z - p.z;
    const dist = Math.hypot(dx, dz);
    const limited = dist > p.budget;
    if (limited) {
      dx = (dx / dist) * p.budget;
      dz = (dz / dist) * p.budget;
      x = p.x + dx;
      z = p.z + dz;
    }
    p.budget = Math.max(0, p.budget - Math.min(dist, p.budget));
    // No walking into (or through) cover
    if (solidCover() && (inCover(x, z) || lineBlocked(p.x, p.z, x, z, 0.3))) {
      placeAt(p, p.x, p.z, data.ry);
      return;
    }
    p.x = round2(x);
    p.z = round2(z);
    p.ry = round2(data.ry);
    if (limited) placeAt(p, p.x, p.z, p.ry);
  };

  const setBots = (p: Player, count: number | null): { ok: true } | { ok: false; error: string } => {
    if (p.id !== hostId) return { ok: false, error: "Only the game admin can change the AI players." };
    if (count !== null && !(Number.isInteger(count) && count >= 0 && count <= ARENA_MAX_BOTS)) return { ok: false, error: `Choose 0 to ${ARENA_MAX_BOTS} AI players.` };
    botsWanted = count;
    syncBots();
    sendHost();
    return { ok: true };
  };

  const buyItem = async (p: Player, itemId: BattleItemId, qty: number): Promise<{ ok: true } | { ok: false; error: string }> => {
    const item = BATTLE_ITEM_BY_ID.get(itemId);
    if (!p.userId) return { ok: false, error: "Join the arena first." };
    if (!item || !(BATTLE_PACKS as readonly number[]).includes(qty)) return { ok: false, error: "That isn't for sale." };
    const r = await buyKit(p.userId, item.id, qty, battlePackPrice(item, qty));
    if (!r.ok) return r;
    p.kit = r.wallet.kit ?? {};
    p.coins = r.wallet.coins;
    sendKit(p);
    return { ok: true };
  };

  const emote = (p: Player, e: Emote) => {
    const now = Date.now();
    if (now - p.emoteAt < 700) return;
    p.emoteAt = now;
    out.emit("aEmote", { id: p.id, emote: e });
  };

  return {
    game,
    n,
    live,
    count: () => humans().length,
    botCount: () => bots().length,
    full: () => humans().length >= maxPlayers,
    has: (id: string) => players.has(id),
    info,
    tick,
    onWallet,
    join,
    afterJoin: syncHost,
    leave,
    kickUser,
    move,
    fire: fireShot,
    jump: doJump,
    ability: useAbility,
    item: useItem,
    buyItem,
    shove: doShove,
    dash: doDash,
    ult: ultimate,
    spell: castSpell,
    upgrade,
    emote,
    setBots,
  };
}
export type Room = ReturnType<typeof createRoom>;
