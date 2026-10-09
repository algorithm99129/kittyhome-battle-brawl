// Copied from kittyhome-shared (src/env.ts) by `npm run sync:shared` in the parent repo.
// Don't edit this copy: change shared/src/env.ts and sync.
/**
 * The settings every KittyHome server shares, from the environment: the one database they all use
 * (so they share members, sessions, coins and battle kits) and Happy Hour.
 */
export const env = {
  mongoUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/kittyhome",
  mongoDb: process.env.MONGODB_DB ?? "kittyhome",
  /** UTC hours when Happy Hour runs (coins earned x2), e.g. "18" or "2,18" */
  happyHourUtc: (process.env.HAPPY_HOUR_UTC ?? "18")
    .split(",")
    .map((h) => Number(h.trim()))
    .filter((h) => Number.isInteger(h) && h >= 0 && h < 24),
  /** UTC hours of Battle Night (free arena, double battle rewards), e.g. "19" or "13,19" */
  battleNightUtc: (process.env.BATTLE_NIGHT_UTC ?? "19")
    .split(",")
    .map((h) => Number(h.trim()))
    .filter((h) => Number.isInteger(h) && h >= 0 && h < 24),
};
