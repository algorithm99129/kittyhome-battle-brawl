// Copied from kittyhome-shared (src/battle/bots.ts) by `npm run sync:shared` in the parent repo.
// Don't edit this copy: change shared/src/battle/bots.ts and sync.
/**
 * The arena's AI players: how a bot thinks. Pure decisions from a snapshot of the arena; the arena
 * applies them under the same rules as people (speed, crates, climbing, stuns, fire rate), so bots
 * never cheat. Each bot has its own reaction time, aim and pace, so they're good but beatable.
 *
 * Paw Blaster: pick the best enemy it can see (wounded and close first, with some loyalty to the
 * current one), keep a comfortable range, circle it (strafing), lead its shots (predicting where the
 * target will be when the yarn gets there), jump or sidestep yarn heading its way, steer clear of
 * enemy snares, and duck behind cover on its last heart.
 *
 * Summit Rush (king of the hill: the first team to 5 seconds on top wins): runners race for the top
 * on their own lines, jumping or dodging boulders by predicting where they'll roll, and once there
 * hold the middle; one defender per team chases whoever's highest, and everyone rushes an enemy
 * who's holding the top. Any bot throws yarn at enemies near the top and shoves one in reach.
 *
 * Sky Brawl (a knock-off brawl on a floating island): stay off the edge (and off the part that's about
 * to crumble), step or dash out of meteors and lightning, pick the enemy worth hitting (high damage %,
 * near the edge, close), get between them and the middle so every hit sends them outward, claw
 * through the combo, dash in for the finish, grab power-ups nearby, and unleash the ultimate when it
 * will catch someone (or several).
 *
 * Every bot also uses its character's power (ARENA_ABILITIES) when it pays off: leaps and blinks to
 * close in, escape or reach the top; slams, roars and fire when enemies are close; shields and phase
 * against incoming yarn; snares where enemies will walk.
 */
import {
  AVATAR_COLORS,
  AVATAR_STYLES,
  BLASTER_COVER,
  BLASTER_PIT,
  SUMMIT_HILL,
  type ArenaAbilityKind,
  type ArenaGame,
  type ArenaSpellKind,
  type BrawlUltKind,
  type ArenaTeam,
  type AvatarLook,
  type Emote,
} from "../protocol.js";

export type BotSkill = {
  /** How long it takes to react to a new target (ms) */
  reaction: number;
  /** How much its aim wobbles (radians) */
  aimNoise: number;
  /** How often it rethinks its plan (ms) */
  think: number;
  /** The distance it likes to fight from */
  range: number;
  /** Chance of noticing yarn heading its way */
  awareness: number;
};
export type BotMind = {
  skill: BotSkill;
  role: "runner" | "defender";
  /** Each runner climbs on its own line (an angle offset) */
  lane: number;
  target: string | null;
  acquiredAt: number;
  nextThink: number;
  strafe: 1 | -1;
  strafeUntil: number;
  dodge: { x: number; z: number } | null;
  dodgeUntil: number;
  cover: { x: number; z: number } | null;
  coverUntil: number;
  /** The plan between thinks: which way to go (unit vector or null), and how fast (0–1) */
  heading: { x: number; z: number } | null;
  pace: number;
  emoteAt: number;
  /** When it next weighs up using its power */
  powerThink: number;
  /** When it next weighs up casting its spell */
  spellThink: number;
};
/** What a bot can know about a cat */
export type Seen = {
  id: string;
  team: ArenaTeam;
  x: number;
  z: number;
  vx: number;
  vz: number;
  hp: number;
  ko: boolean;
  stunned: boolean;
  /** Yarn passes through (just back, Shadow Step, Phase) */
  shielded?: boolean;
  /** Shield Wall: yarn bounces off */
  guarded?: boolean;
  /** In the air */
  air?: boolean;
  /** Sky Brawl: damage %, and flying from a hit */
  dmg?: number;
  flying?: boolean;
};
/** What the bot can do this moment (dash and ult: Sky Brawl) */
export type Ready = { jump: boolean; ability: boolean; fire: boolean; dash?: boolean; ult?: boolean; spell?: boolean };
export type World = {
  now: number;
  /** Summit Rush: who's holding the top */
  holder: { id: string; team: ArenaTeam } | null;
  game: ArenaGame;
  phase: "waiting" | "countdown" | "playing" | "results";
  cats: Seen[];
  shots: { team: ArenaTeam; x: number; z: number; dx: number; dz: number }[];
  boulders: { x: number; z: number; dx: number; dz: number }[];
  snares: { team: ArenaTeam; x: number; z: number }[];
  shotSpeed: number;
  shotRange: number;
  shoveRange: number;
  boulderSpeed: number;
  boulderRadius: number;
  /** Did the round go to this bot's team (results: celebrate) */
  won: boolean | null;
  /** Sky Brawl: the island (and the radius it's about to crumble to), what's about to strike, the power-ups, the claw's reach */
  island?: { x: number; z: number; radius: number; crumbleTo: number | null };
  hazards?: { x: number; z: number; r: number; team: ArenaTeam | null; inMs: number }[];
  powerUps?: { x: number; z: number; kind: string }[];
  clawRange?: number;
};
export type Action = {
  /** Which way to walk (unit vector) and how fast (0–1 of top speed); null: stand */
  move: { x: number; z: number; pace: number } | null;
  /** Which way to face (radians) */
  face: number | null;
  fire: boolean;
  shove: boolean;
  jump: boolean;
  /** Use its power (aimed where it faces) */
  ability: boolean;
  emote: Emote | null;
  /** Sky Brawl: dash (where it faces) and unleash the ultimate */
  dash?: boolean;
  ult?: boolean;
  /** Cast its spell (G), aimed where it faces */
  spell?: boolean;
};

const BOT_NAMES = ["Nova", "Bolt", "Ziggy", "Comet", "Mittens", "Turbo", "Gizmo", "Luna", "Sprocket", "Rocket", "Pixelpaw", "Biscuit", "Orbit", "Mochi Jr", "Patch", "Echo"];
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
const len = (x: number, z: number) => Math.hypot(x, z) || 1;

/** A new bot: a name not in use, a look, and its own skill */
export function newBot(taken: Set<string>, n: number): { name: string; login: string; look: AvatarLook; mind: BotMind } {
  const free = BOT_NAMES.filter((name) => !taken.has(name));
  const name = free.length ? free[Math.floor(Math.random() * free.length)] : `Bot ${n}`;
  const styles = AVATAR_STYLES;
  const colors = Object.keys(AVATAR_COLORS) as (keyof typeof AVATAR_COLORS)[];
  const look = { style: styles[Math.floor(Math.random() * styles.length)], color: colors[Math.floor(Math.random() * colors.length)] } as AvatarLook;
  return {
    name,
    login: `bot-${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
    look,
    mind: {
      skill: { reaction: rand(220, 480), aimNoise: rand(0.03, 0.09), think: rand(120, 260), range: rand(8, 13), awareness: rand(0.55, 0.9) },
      role: "runner",
      lane: rand(-0.5, 0.5),
      target: null,
      acquiredAt: 0,
      nextThink: 0,
      strafe: Math.random() < 0.5 ? 1 : -1,
      strafeUntil: 0,
      dodge: null,
      dodgeUntil: 0,
      cover: null,
      coverUntil: 0,
      heading: null,
      pace: 0,
      emoteAt: 0,
      powerThink: 0,
      spellThink: 0,
    },
  };
}

/** Is the straight line between two points blocked by a crate (Paw Blaster) */
export function lineBlocked(ax: number, az: number, bx: number, bz: number, pad = 0.15) {
  const steps = Math.max(2, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = ax + (bx - ax) * t - BLASTER_PIT.x;
    const z = az + (bz - az) * t - BLASTER_PIT.z;
    if (BLASTER_COVER.some((c) => Math.abs(x - c.x) < c.w + pad && Math.abs(z - c.z) < c.d + pad)) return true;
  }
  return false;
}

// ——— Finding a way around the crates ———

/** Walking room around a crate (a cat's radius and a little more) */
const CLEAR = 0.75;
/** The corners just outside each crate, where a path can turn */
const CORNERS: { x: number; z: number }[] = (() => {
  const out: { x: number; z: number }[] = [];
  for (const c of BLASTER_COVER) {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const x = BLASTER_PIT.x + c.x + sx * (c.w + 1.1);
        const z = BLASTER_PIT.z + c.z + sz * (c.d + 1.1);
        if (Math.abs(x - BLASTER_PIT.x) > BLASTER_PIT.half - 1 || Math.abs(z - BLASTER_PIT.z) > BLASTER_PIT.half - 1) continue;
        const rx = x - BLASTER_PIT.x;
        const rz = z - BLASTER_PIT.z;
        if (BLASTER_COVER.some((o) => Math.abs(rx - o.x) < o.w + CLEAR && Math.abs(rz - o.z) < o.d + CLEAR)) continue;
        out.push({ x, z });
      }
    }
  }
  return out;
})();
/** Which corners can walk straight to which (worked out once) */
const LINKS: number[][] = CORNERS.map((a, i) => CORNERS.flatMap((b, j) => (i !== j && !lineBlocked(a.x, a.z, b.x, b.z, CLEAR) ? [j] : [])));

/**
 * The next point to walk to on the shortest way from `from` to `to` around the crates (a search
 * over the crates' corners); `to` itself when the way is clear.
 */
export function nextStep(from: { x: number; z: number }, to: { x: number; z: number }) {
  if (!lineBlocked(from.x, from.z, to.x, to.z, CLEAR)) return to;
  const n = CORNERS.length;
  const dist = new Array<number>(n).fill(Infinity);
  const prev = new Array<number>(n).fill(-1);
  const done = new Array<boolean>(n).fill(false);
  for (let i = 0; i < n; i++) if (!lineBlocked(from.x, from.z, CORNERS[i].x, CORNERS[i].z, CLEAR)) dist[i] = Math.hypot(CORNERS[i].x - from.x, CORNERS[i].z - from.z);
  let best = -1;
  let bestTotal = Infinity;
  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0) break;
    done[u] = true;
    if (!lineBlocked(CORNERS[u].x, CORNERS[u].z, to.x, to.z, CLEAR)) {
      const total = dist[u] + Math.hypot(to.x - CORNERS[u].x, to.z - CORNERS[u].z);
      if (total < bestTotal) {
        bestTotal = total;
        best = u;
      }
    }
    for (const v of LINKS[u]) {
      const d = dist[u] + Math.hypot(CORNERS[v].x - CORNERS[u].x, CORNERS[v].z - CORNERS[u].z);
      if (d < dist[v]) {
        dist[v] = d;
        prev[v] = u;
      }
    }
  }
  if (best < 0) return to;
  // Walk back to the first corner on the way
  let step = best;
  while (prev[step] >= 0) step = prev[step];
  return CORNERS[step];
}

/** Where to aim so a throw meets a moving target (two refinements of the flight time) */
function lead(me: Seen, t: Seen, speed: number) {
  let px = t.x;
  let pz = t.z;
  for (let i = 0; i < 2; i++) {
    const time = Math.hypot(px - me.x, pz - me.z) / speed;
    px = t.x + t.vx * time;
    pz = t.z + t.vz * time;
  }
  return { x: px, z: pz };
}

const angleTo = (from: { x: number; z: number }, to: { x: number; z: number }) => Math.atan2(to.x - from.x, to.z - from.z);
const unit = (x: number, z: number) => {
  const l = len(x, z);
  return { x: x / l, z: z / l };
};
const distTo = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);

/** Enemy yarn about to hit: how soon (in distance) and which side of its line we're on */
function incoming(me: Seen, w: World, reach: number, width: number) {
  for (const s of w.shots) {
    if (s.team === me.team) continue;
    const rx = me.x - s.x;
    const rz = me.z - s.z;
    const along = rx * s.dx + rz * s.dz;
    if (along <= 0 || along > reach) continue;
    const side = rx * s.dz - rz * s.dx;
    if (Math.abs(side) > width) continue;
    return { shot: s, along, side };
  }
  return null;
}

/** Bend a way around enemy snares it can see (a bot that notices them) */
function avoidSnares(me: Seen, dir: { x: number; z: number }, w: World, awareness: number) {
  for (const s of w.snares) {
    if (s.team === me.team) continue;
    const rx = s.x - me.x;
    const rz = s.z - me.z;
    const ahead = rx * dir.x + rz * dir.z;
    if (ahead < 0 || ahead > 3.5) continue;
    const side = rx * dir.z - rz * dir.x;
    if (Math.abs(side) > 1.8 || Math.random() > awareness + 0.1) continue;
    const sign = side >= 0 ? -1 : 1;
    return unit(dir.x + dir.z * sign * 1.4, dir.z - dir.x * sign * 1.4);
  }
  return dir;
}

export function think(
  me: Seen,
  mind: BotMind,
  w: World,
  power: ArenaAbilityKind = "pounce",
  ready: Ready = { jump: true, ability: true, fire: true },
  ult?: BrawlUltKind,
  spell?: ArenaSpellKind,
): Action {
  const action = play(me, mind, w, power, ready, ult);
  // The spell, on top of whatever else it's doing (not with its power in the same moment)
  if (spell && ready.spell && w.phase === "playing" && !me.ko && !me.stunned && !action.ability && !action.ult) {
    const cast = decideSpell(me, mind, w, spell);
    if (cast) {
      action.spell = true;
      if (cast.face !== null) action.face = cast.face;
      action.fire = false;
    }
  }
  return action;
}

function play(me: Seen, mind: BotMind, w: World, power: ArenaAbilityKind, ready: Ready, ult?: BrawlUltKind): Action {
  const idle: Action = { move: null, face: null, fire: false, shove: false, jump: false, ability: false, emote: null };
  if (me.ko || me.stunned) return idle;

  // Between rounds: mill about (with the odd hop), and celebrate a win
  if (w.phase !== "playing") {
    if (w.phase === "results" && w.won && w.now > mind.emoteAt) {
      mind.emoteAt = w.now + rand(2500, 5000);
      return { ...idle, emote: Math.random() < 0.6 ? "party" : "heart", jump: ready.jump };
    }
    if (w.phase === "countdown") return idle;
    if (w.now > mind.nextThink) {
      mind.nextThink = w.now + rand(1500, 3500);
      mind.heading = Math.random() < 0.5 ? unit(rand(-1, 1), rand(-1, 1)) : null;
      mind.pace = 0.35;
    }
    return { ...idle, move: mind.heading ? { ...mind.heading, pace: mind.pace } : null, face: mind.heading ? Math.atan2(mind.heading.x, mind.heading.z) : null };
  }

  if (w.game === "brawl") return brawl(me, mind, w, power, ready, ult);
  return w.game === "blaster" ? blaster(me, mind, w, power, ready) : summit(me, mind, w, power, ready);
}

/** Time to weigh up the power again (so bots don't fire it the instant it's back) */
function mayUsePower(mind: BotMind, w: World, ready: Ready) {
  if (!ready.ability || w.now < mind.powerThink) return false;
  mind.powerThink = w.now + rand(250, 700);
  return true;
}

// ——— Paw Blaster ———

function blaster(me: Seen, mind: BotMind, w: World, power: ArenaAbilityKind, ready: Ready): Action {
  // (shielded cats just came back or phased: yarn can't hit them, so nobody aims at them)
  const enemies = w.cats.filter((c) => c.team !== me.team && !c.ko && !c.shielded);
  const out: Action = { move: null, face: null, fire: false, shove: false, jump: false, ability: false, emote: null };
  if (!enemies.length) return out;

  // Yarn heading this way: jump it at the last moment, or sidestep off its line (if noticed)
  const threat = incoming(me, w, 8, 1.5);
  // (a jump is the last resort: they don't always see it coming)
  if (threat && threat.along < 4 && Math.abs(threat.side) < 1.3 && ready.jump && Math.random() < mind.skill.awareness * 0.55) out.jump = true;
  if (w.now > mind.dodgeUntil) {
    mind.dodge = null;
    if (threat && !out.jump && Math.random() < mind.skill.awareness * 0.75) {
      const sign = threat.side >= 0 ? 1 : -1;
      mind.dodge = { x: threat.shot.dz * sign, z: -threat.shot.dx * sign };
      mind.dodgeUntil = w.now + 380;
    }
  }

  // Rethink: who to fight, where to stand
  if (w.now >= mind.nextThink) {
    mind.nextThink = w.now + mind.skill.think;
    const score = (e: Seen) => distTo(e, me) + e.hp * 4 + (lineBlocked(me.x, me.z, e.x, e.z) ? 14 : 0) + (e.guarded ? 10 : 0);
    const best = enemies.reduce((a, b) => (score(a) <= score(b) ? a : b));
    const current = enemies.find((e) => e.id === mind.target);
    // Loyal to the current target unless another is clearly better
    if (!current || score(best) + 3 < score(current)) {
      if (mind.target !== best.id) mind.acquiredAt = w.now;
      mind.target = best.id;
    }
    // Last heart: hide behind cover from the nearest threat for a moment
    const near = enemies.reduce((a, b) => (distTo(a, me) <= distTo(b, me) ? a : b));
    if (me.hp === 1 && !mind.cover && w.now > mind.coverUntil) {
      let bestSpot: { x: number; z: number } | null = null;
      let bestD = Infinity;
      for (const c of BLASTER_COVER) {
        const cx = BLASTER_PIT.x + c.x;
        const cz = BLASTER_PIT.z + c.z;
        const away = unit(cx - near.x, cz - near.z);
        const spot = { x: cx + away.x * (Math.max(c.w, c.d) + 1.4), z: cz + away.z * (Math.max(c.w, c.d) + 1.4) };
        if (Math.abs(spot.x - BLASTER_PIT.x) > BLASTER_PIT.half - 1.5 || Math.abs(spot.z - BLASTER_PIT.z) > BLASTER_PIT.half - 1.5) continue;
        if (!lineBlocked(near.x, near.z, spot.x, spot.z)) continue;
        const d = distTo(spot, me);
        if (d < bestD) {
          bestD = d;
          bestSpot = spot;
        }
      }
      if (bestSpot) {
        mind.cover = bestSpot;
        mind.coverUntil = w.now + rand(2200, 3200);
      }
    }
    if (mind.cover && w.now > mind.coverUntil) mind.cover = null;
    if (w.now > mind.strafeUntil) {
      mind.strafe = mind.strafe === 1 ? -1 : 1;
      mind.strafeUntil = w.now + rand(900, 2000);
    }
  }

  const target = enemies.find((e) => e.id === mind.target) ?? enemies[0];
  const dist = distTo(target, me);
  const to = unit(target.x - me.x, target.z - me.z);
  const visible = !lineBlocked(me.x, me.z, target.x, target.z);

  // Where to go (around cover, by the shortest way, steering clear of snares)
  const toward = (goal: { x: number; z: number }) => {
    const step = nextStep(me, goal);
    return unit(step.x - me.x, step.z - me.z);
  };
  let move: { x: number; z: number; pace: number } | null;
  if (mind.dodge) move = { ...mind.dodge, pace: 1 };
  else if (mind.cover) move = distTo(mind.cover, me) > 0.6 ? { ...toward(mind.cover), pace: 1 } : null;
  else if (!visible || dist > mind.skill.range + 2) move = { ...toward(target), pace: 1 };
  else if (dist < mind.skill.range - 3) move = { x: -to.x, z: -to.z, pace: 0.75 };
  else move = { x: to.z * mind.strafe, z: -to.x * mind.strafe, pace: 0.75 };
  if (move) move = { ...avoidSnares(me, move, w, mind.skill.awareness), pace: move.pace };
  out.move = move;

  // Aim (leading the target, with this bot's wobble) and throw when it can see them
  const aim = lead(me, target, w.shotSpeed);
  const angle = angleTo(me, aim) + gauss() * mind.skill.aimNoise;
  out.face = angle;
  const reacted = w.now - mind.acquiredAt > mind.skill.reaction;
  // Throws from a sensible range (far throws are easy to dodge)
  // and only down a clear lane (to where they are and where they'll be), not grazing cover
  const clearShot =
    reacted && dist < Math.min(w.shotRange - 1, mind.skill.range + 5) && !lineBlocked(me.x, me.z, aim.x, aim.z, 0.55) && !lineBlocked(me.x, me.z, target.x, target.z, 0.45) && !target.guarded;
  out.fire = clearShot && !out.jump && !(mind.cover && w.now < mind.coverUntil && dist > 6);

  // The power
  if (!mayUsePower(mind, w, ready)) return out;
  const close = (r: number) => enemies.filter((e) => distTo(e, me) < r && !lineBlocked(me.x, me.z, e.x, e.z) && !e.guarded && !e.air);
  const moveAngle = move ? Math.atan2(move.x, move.z) : angle;
  const escaping = me.hp === 1 && dist < 9;
  switch (power) {
    case "pounce":
      // Dodge yarn the jump can't, or close in on someone far away
      if ((threat && threat.along < 6 && !ready.jump) || (!escaping && dist > mind.skill.range + 6)) {
        out.ability = true;
        out.face = threat && !ready.jump ? Math.atan2(threat.shot.dz * (threat.side >= 0 ? 1 : -1), -threat.shot.dx * (threat.side >= 0 ? 1 : -1)) : moveAngle;
      }
      break;
    case "blink":
    case "shadow":
      if (escaping || (threat && threat.along < 5 && !ready.jump)) {
        out.ability = true;
        out.face = mind.cover ? angleTo(me, mind.cover) : Math.atan2(-to.x, -to.z) + rand(-0.6, 0.6);
      } else if (dist > mind.skill.range + 8) {
        out.ability = true;
        out.face = moveAngle;
      }
      break;
    case "slam":
      if (close(4.5).length) out.ability = true;
      break;
    case "roar":
      if (close(8).length >= 2 || (close(6).length && me.hp <= 2)) out.ability = true;
      break;
    case "breath":
      if (visible && dist < 6 && !target.guarded) {
        out.ability = true;
        out.face = angleTo(me, target);
      }
      break;
    case "triple":
      if (clearShot && dist < 15) out.ability = true;
      break;
    case "cannon":
      if (reacted && visible && dist < 18 && !target.guarded) {
        const heavy = lead(me, target, 21);
        if (!lineBlocked(me.x, me.z, heavy.x, heavy.z)) {
          out.ability = true;
          out.face = angleTo(me, heavy) + gauss() * mind.skill.aimNoise;
        }
      }
      break;
    case "boost":
      if (dist > 16 || escaping) out.ability = true;
      break;
    case "phase":
    case "shield":
      if ((threat && threat.along < 6 && !ready.jump) || (me.hp <= 2 && close(12).length >= 2)) out.ability = true;
      break;
    case "snare":
      // Where someone's coming, or behind it on the run
      if (escaping || (dist < 8 && target.vx * (me.x - target.x) + target.vz * (me.z - target.z) > 0)) out.ability = true;
      break;
  }
  if (out.ability) out.fire = false;
  return out;
}

// ——— Summit Rush ———

function summit(me: Seen, mind: BotMind, w: World, power: ArenaAbilityKind, ready: Ready): Action {
  const out: Action = { move: null, face: null, fire: false, shove: false, jump: false, ability: false, emote: null };
  const rOf = (c: { x: number; z: number }) => Math.hypot(c.x - SUMMIT_HILL.x, c.z - SUMMIT_HILL.z);
  const myR = rOf(me);
  const enemies = w.cats.filter((c) => c.team !== me.team && !c.stunned && !c.ko);
  const mates = w.cats.filter((c) => c.team === me.team && c.id !== me.id);
  const top = { x: SUMMIT_HILL.x, z: SUMMIT_HILL.z };

  // Shove anyone in reach who's ahead of us or near the top
  const inReach = enemies.filter((e) => distTo(e, me) < w.shoveRange - 0.3 && !e.air && !e.shielded);
  const victim = inReach.find((e) => rOf(e) < myR + 1.5 || rOf(e) < 8);
  if (victim) {
    if (mind.target !== victim.id) {
      mind.target = victim.id;
      mind.acquiredAt = w.now;
    }
    if (w.now - mind.acquiredAt > mind.skill.reaction * 0.6) out.shove = true;
  }

  // A boulder about to roll into us: jump it (or step aside, below)
  for (const b of w.boulders) {
    const relX = me.x - b.x;
    const relZ = me.z - b.z;
    const along = relX * b.dx + relZ * b.dz;
    const side = relX * b.dz - relZ * b.dx;
    if (along > -0.5 && along < w.boulderSpeed * 0.3 && Math.abs(side) < w.boulderRadius + 0.8 && ready.jump && Math.random() < mind.skill.awareness + 0.1) out.jump = true;
  }
  // Yarn about to knock us off
  const threat = incoming(me, w, 9, 1.4);
  if (threat && threat.along < 3.5 && ready.jump && Math.random() < mind.skill.awareness * 0.55) out.jump = true;

  // Rethink the plan
  if (w.now >= mind.nextThink) {
    mind.nextThink = w.now + mind.skill.think;
    let goal = { ...top };
    // The defender (and anyone close to them) goes after whoever's highest, if they're getting close
    const leader = enemies.length ? enemies.reduce((a, b) => (rOf(a) <= rOf(b) ? a : b)) : null;
    const holderIsEnemy = w.holder && w.holder.team !== me.team;
    const chase = leader && rOf(leader) < 12 && (mind.role === "defender" || holderIsEnemy || distTo(leader, me) < 5);
    if (w.holder?.id === me.id || (myR < 2 && !holderIsEnemy)) {
      // On top: stay in the middle (small steps, the shove still fires at anyone in reach)
      goal = { ...top };
    } else if (chase && leader) {
      // Get between them and the top
      const toTop = unit(top.x - leader.x, top.z - leader.z);
      goal = { x: leader.x + toTop.x * 1.2, z: leader.z + toTop.z * 1.2 };
    } else if (myR > 8) {
      // Climb on our own line: aim a little off-center, straightening as we get close
      const a = Math.atan2(me.z - top.z, me.x - top.x) + mind.lane * Math.min(1, (myR - 8) / 10);
      const r = Math.max(0, myR - 6);
      goal = { x: top.x + Math.cos(a) * r, z: top.z + Math.sin(a) * r };
    }
    let dir = unit(goal.x - me.x, goal.z - me.z);

    // Boulders: if one will run into us soon, step sideways off its line
    for (const b of w.boulders) {
      const relX = me.x - b.x;
      const relZ = me.z - b.z;
      const along = relX * b.dx + relZ * b.dz;
      if (along < -1 || along > w.boulderSpeed * 1.3) continue;
      const side = relX * b.dz - relZ * b.dx;
      if (Math.abs(side) > w.boulderRadius + 1.4) continue;
      const sign = side >= 0 ? 1 : -1;
      dir = unit(b.dz * sign * 1.6 + dir.x * 0.3, -b.dx * sign * 1.6 + dir.z * 0.3);
      break;
    }
    // Don't bunch up with teammates
    for (const m of mates) {
      const d = distTo(m, me);
      if (d < 1.6 && d > 0.01) dir = unit(dir.x + ((me.x - m.x) / d) * 0.6, dir.z + ((me.z - m.z) / d) * 0.6);
    }
    mind.heading = avoidSnares(me, dir, w, mind.skill.awareness);
    mind.pace = 1;
  }
  out.move = mind.heading ? { ...mind.heading, pace: mind.pace } : null;
  const headingAngle = mind.heading ? Math.atan2(mind.heading.x, mind.heading.z) : null;
  out.face = victim ? angleTo(me, victim) : headingAngle;

  // Throw: at an enemy on top, or the one nearest it, when they're in range
  const mark =
    enemies.find((e) => e.id === w.holder?.id && !e.shielded && !e.guarded) ??
    enemies.filter((e) => rOf(e) < 9 && !e.shielded && !e.guarded && !e.air).sort((a, b) => rOf(a) - rOf(b))[0];
  if (!victim && mark && distTo(mark, me) < 17) {
    if (mind.target !== mark.id) {
      mind.target = mark.id;
      mind.acquiredAt = w.now;
    }
    const aim = lead(me, mark, w.shotSpeed);
    out.face = angleTo(me, aim) + gauss() * mind.skill.aimNoise;
    out.fire = w.now - mind.acquiredAt > mind.skill.reaction && !out.jump;
  }

  // The power
  if (!mayUsePower(mind, w, ready)) return out;
  const close = (r: number) => enemies.filter((e) => distTo(e, me) < r && !e.guarded && !e.air && !e.shielded);
  const contested = close(6).some((e) => rOf(e) < 8 || rOf(e) < myR);
  switch (power) {
    case "pounce":
    case "blink":
    case "shadow": {
      // Leap up the hill (the top is the whole game)
      const leap = power === "blink" ? 11 : 8;
      if (myR > SUMMIT_HILL.top + 2 && myR < leap + 6) {
        out.ability = true;
        out.face = angleTo(me, top);
      }
      break;
    }
    case "slam":
      if (close(4.5).length && contested) out.ability = true;
      break;
    case "roar":
      if (close(8).some((e) => rOf(e) < 8 || e.id === w.holder?.id)) out.ability = true;
      break;
    case "breath": {
      const near = close(6).find((e) => rOf(e) < 9);
      if (near) {
        out.ability = true;
        out.face = angleTo(me, near);
      }
      break;
    }
    case "triple":
    case "cannon":
      if (mark && distTo(mark, me) < 15 && w.now - mind.acquiredAt > mind.skill.reaction) out.ability = true;
      break;
    case "boost":
      if (myR > 9 && myR < SUMMIT_HILL.radius + 4) out.ability = true;
      break;
    case "phase":
    case "shield":
      if ((myR < SUMMIT_HILL.top + 2 && close(7).length) || (threat && threat.along < 5 && !ready.jump)) out.ability = true;
      break;
    case "snare":
      // Trap the way up to the top
      if (myR < SUMMIT_HILL.top + 3 && w.snares.filter((s) => s.team === me.team).length < 2) out.ability = true;
      break;
  }
  if (out.ability && (power === "triple" || power === "cannon") && mark) out.face = angleTo(me, lead(me, mark, power === "cannon" ? 21 : w.shotSpeed));
  if (out.ability) out.fire = false;
  return out;
}

// ——— Sky Brawl ———

function brawl(me: Seen, mind: BotMind, w: World, power: ArenaAbilityKind, ready: Ready, ult?: BrawlUltKind): Action {
  const out: Action = { move: null, face: null, fire: false, shove: false, jump: false, ability: false, emote: null, dash: false, ult: false };
  const isl = w.island;
  if (!isl) return out;
  const rOf = (c: { x: number; z: number }) => Math.hypot(c.x - isl.x, c.z - isl.z);
  const toMid = unit(isl.x - me.x, isl.z - me.z);
  const myR = rOf(me);
  // Where it's safe to stand: short of the edge, and of the part that's about to crumble
  const safeR = Math.min(isl.radius, isl.crumbleTo ?? isl.radius) - 2.6;
  const inside = (spot: { x: number; z: number }, pad = 0) => rOf(spot) < safeR + 1.8 - pad;
  const enemies = w.cats.filter((c) => c.team !== me.team && !c.ko && !c.flying);
  const ahead = (ang: number, d: number) => ({ x: me.x + Math.sin(ang) * d, z: me.z + Math.cos(ang) * d });

  // Something about to land here: out of the circle (a jump or a dash at the last moment)
  const danger = (w.hazards ?? []).find((h) => (h.team === null || h.team !== me.team) && distTo(h, me) < h.r + 0.9 && h.inMs < 1_500);
  if (danger && Math.random() < mind.skill.awareness + 0.25) {
    let away = distTo(danger, me) < 0.3 ? unit(rand(-1, 1), rand(-1, 1)) : unit(me.x - danger.x, me.z - danger.z);
    if (myR > safeR - 2) away = unit(away.x + toMid.x * 1.6, away.z + toMid.z * 1.6);
    out.move = { ...away, pace: 1 };
    out.face = Math.atan2(away.x, away.z);
    if (danger.inMs < 380 && ready.jump) out.jump = true;
    else if (danger.inMs < 650 && ready.dash && inside(ahead(out.face, 6.5), 1)) out.dash = true;
    return out;
  }

  // Rethink who to go for: someone with lots of damage, near the edge, close by
  if (w.now >= mind.nextThink) {
    mind.nextThink = w.now + mind.skill.think;
    if (enemies.length) {
      const score = (e: Seen) => distTo(e, me) - (e.dmg ?? 0) * 0.07 - (rOf(e) > isl.radius - 6 ? 4 : 0) + (e.guarded ? 8 : 0) + (e.shielded ? 6 : 0);
      const best = enemies.reduce((a, b) => (score(a) <= score(b) ? a : b));
      const current = enemies.find((e) => e.id === mind.target);
      if (!current || score(best) + 3 < score(current)) {
        if (mind.target !== best.id) mind.acquiredAt = w.now;
        mind.target = best.id;
      }
    }
    if (w.now > mind.strafeUntil) {
      mind.strafe = mind.strafe === 1 ? -1 : 1;
      mind.strafeUntil = w.now + rand(700, 1600);
    }
  }
  const target = enemies.find((e) => e.id === mind.target) ?? null;

  // A power-up close by (and nobody right on top of it): grab it
  const prize = (w.powerUps ?? [])
    .filter((u) => distTo(u, me) < (u.kind === "golden" ? 30 : 8) && rOf(u) < safeR + 1)
    .sort((a, b) => distTo(a, me) - distTo(b, me))[0];
  const busy = target && distTo(target, me) < 4;

  // Where to go
  let goal: { x: number; z: number } | null = null;
  let pace = 1;
  if (prize && (!busy || prize.kind === "golden")) goal = prize;
  else if (target) {
    const d = distTo(target, me);
    if (d < 4.5) {
      // Get between them and the middle, so the hits send them outward (circling a little)
      const outward = unit(target.x - isl.x, target.z - isl.z);
      const side = { x: outward.z * mind.strafe * 0.5, z: -outward.x * mind.strafe * 0.5 };
      goal = { x: target.x - outward.x * 1.7 + side.x, z: target.z - outward.z * 1.7 + side.z };
      pace = 0.8;
    } else goal = target;
  } else goal = { x: isl.x, z: isl.z };
  let dir = goal && distTo(goal, me) > 0.5 ? unit(goal.x - me.x, goal.z - me.z) : null;
  // Never toward the edge: near it, the way back in comes first
  if (myR > safeR) dir = dir ? unit(dir.x * 0.3 + toMid.x, dir.z * 0.3 + toMid.z) : toMid;
  else if (dir && rOf(ahead(Math.atan2(dir.x, dir.z), 1.5)) > safeR) dir = unit(dir.x + toMid.x, dir.z + toMid.z);
  out.move = dir ? { ...dir, pace } : null;
  // Way out at the edge (about to go over): dash back in
  if (myR > isl.radius - 2.2 && ready.dash && Math.random() < 0.5) {
    out.dash = true;
    out.face = Math.atan2(toMid.x, toMid.z);
    return out;
  }
  if (!target) {
    out.face = dir ? Math.atan2(dir.x, dir.z) : null;
    return out;
  }

  const dist = distTo(target, me);
  const angle = angleTo(me, lead(me, target, 30)) + gauss() * mind.skill.aimNoise;
  out.face = angle;
  const reacted = w.now - mind.acquiredAt > mind.skill.reaction;
  const open = !target.shielded && !target.guarded && !target.air;
  // Claws when in reach
  if (reacted && open && dist < (w.clawRange ?? 2.9) - 0.15) out.fire = true;
  // Dash in on someone worth finishing (not over the edge)
  if (ready.dash && reacted && open && dist > 4.5 && dist < 8.5 && (target.dmg ?? 0) > 45 && inside(ahead(angleTo(me, target), 6.5), 1) && Math.random() < 0.12) {
    out.dash = true;
    out.face = angleTo(me, target);
  }
  // Yarn or a cannonball on the way: hop it
  const threat = incoming(me, w, 7, 1.4);
  if (threat && threat.along < 4 && ready.jump && Math.random() < mind.skill.awareness * 0.6) out.jump = true;

  const near = (r: number) => enemies.filter((e) => distTo(e, me) < r && !e.guarded && !e.shielded);
  // The ultimate: when it'll catch someone worth it
  if (ready.ult && ult && reacted && w.now >= mind.powerThink) {
    mind.powerThink = w.now + rand(250, 600);
    const heavy = (target.dmg ?? 0) > 70;
    let go = false;
    switch (ult) {
      case "comet":
        go = dist > 5 && dist < 13 && inside(target);
        break;
      case "meteors":
        go = dist > 5 && dist < 13;
        break;
      case "quake":
        go = near(8).length >= 2 || (near(5).length >= 1 && heavy);
        break;
      case "kingroar":
        go = near(12).length >= 2 || (near(9).length >= 1 && heavy);
        break;
      case "vortex":
        go = near(9.5).length >= 2 || (near(6).length >= 1 && heavy);
        break;
      case "closed":
        go = near(13).length >= 2;
        break;
      case "beam":
      case "broadside":
        go = dist < 14 && open;
        break;
      case "orbital":
        go = near(20).length >= 1;
        break;
      case "cuts":
        go = near(11).length >= 2 || (near(11).length >= 1 && heavy);
        break;
      case "inferno":
        go = dist < 9 && open;
        break;
      case "charge":
        go = dist < 11 && open && inside(ahead(angleTo(me, target), 13), 1);
        break;
    }
    if (go) {
      out.ult = true;
      out.face = angleTo(me, target);
      out.fire = false;
      return out;
    }
  }

  // The power (Q)
  if (!mayUsePower(mind, w, ready)) return out;
  switch (power) {
    case "pounce":
      if (dist > 4 && dist < 9 && inside(target, 1)) {
        out.ability = true;
        out.face = angleTo(me, target);
      }
      break;
    case "blink":
    case "shadow":
      // Away from trouble with lots of damage, or onto someone far off
      if ((me.dmg ?? 0) > 90 && near(4).length) {
        out.ability = true;
        out.face = Math.atan2(toMid.x, toMid.z) + rand(-0.5, 0.5);
      } else if (dist > 10 && inside(target, 1)) {
        out.ability = true;
        out.face = angleTo(me, target);
      }
      break;
    case "slam":
      if (near(4.5).length) out.ability = true;
      break;
    case "roar":
      if (near(7.5).length >= 2 || (near(4).length && (target.dmg ?? 0) > 50)) out.ability = true;
      break;
    case "breath":
      if (dist < 6 && open) {
        out.ability = true;
        out.face = angleTo(me, target);
      }
      break;
    case "triple":
    case "cannon":
      if (dist < 14 && open) out.ability = true;
      break;
    case "boost":
      if (dist > 10) out.ability = true;
      break;
    case "phase":
    case "shield":
      if ((me.dmg ?? 0) > 70 && near(3.5).length) out.ability = true;
      break;
    case "snare":
      if (dist < 5) out.ability = true;
      break;
  }
  if (out.ability) out.fire = false;
  return out;
}

// ——— Spells ———

/** When a spell pays off (and which way to face): null to wait */
function decideSpell(me: Seen, mind: BotMind, w: World, spell: ArenaSpellKind): { face: number | null } | null {
  if (w.now < mind.spellThink) return null;
  mind.spellThink = w.now + rand(400, 900);
  const enemies = w.cats.filter((c) => c.team !== me.team && !c.ko && !c.shielded);
  const allies = w.cats.filter((c) => c.team === me.team && !c.ko);
  const near = (r: number) => enemies.filter((e) => distTo(e, me) < r && !e.guarded);
  const nearest = enemies.length ? enemies.reduce((a, b) => (distTo(a, me) <= distTo(b, me) ? a : b)) : null;
  const d = nearest ? distTo(nearest, me) : Infinity;
  const aim = nearest ? angleTo(me, lead(me, nearest, 18)) + gauss() * mind.skill.aimNoise : null;
  /** Someone on the team (or itself) is in trouble */
  const hurting = (c: Seen) => (w.game === "brawl" ? (c.dmg ?? 0) > 70 : w.game === "blaster" ? c.hp <= 1 : false);
  const fighting = near(10).length > 0;
  switch (spell) {
    case "tornado":
      return nearest && d > 4 && d < 11 ? { face: aim } : null;
    case "meteor":
      return nearest && d > 5 && d < 12 ? { face: aim } : null;
    case "orb":
      return nearest && d < 14 && !nearest.guarded ? { face: aim } : null;
    case "hook":
      return nearest && d > 4 && d < 12 && !nearest.guarded ? { face: aim } : null;
    case "snack":
      return hurting(me) || allies.some((a) => a.id !== me.id && distTo(a, me) < 7 && hurting(a)) || (w.game === "summit" && near(4).length > 0) ? { face: null } : null;
    case "rally":
    case "bulwark":
      return fighting && allies.filter((a) => distTo(a, me) < 8).length >= 2 ? { face: null } : null;
    case "emp":
      return near(6.5).length >= 1 ? { face: null } : null;
    case "flamering":
      return near(5).length >= 1 ? { face: null } : null;
    case "haunt":
      return near(7).length >= (w.game === "summit" ? 1 : 2) || (hurting(me) && near(6).length > 0) ? { face: null } : null;
    case "spotlight":
      return near(12).length >= 2 ? { face: null } : null;
    case "smoke":
      return hurting(me) && near(10).length > 0 ? { face: null } : fighting && Math.random() < 0.15 ? { face: null } : null;
  }
}
