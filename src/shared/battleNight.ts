// Copied from kittyhome-shared (src/battleNight.ts) by `npm run sync:shared` in the parent repo.
// Don't edit this copy: change shared/src/battleNight.ts and sync.
/**
 * Battle Night: every day at the same time (BATTLE_NIGHT_UTC, an hour), the arena is free to enter and
 * battles pay double coins and XP. One fixed time a day brings the community's few members together
 * in the same place, so it feels full. The same on every server.
 */
import { env } from "./env.js";

const HOUR = 60 * 60 * 1000;

export function isBattleNight(now = Date.now()) {
  return env.battleNightUtc.includes(new Date(now).getUTCHours());
}

/** Live (and when it ends), or when the next one starts */
export function battleNightWindow(now = Date.now()): { live: boolean; at: number } {
  const hourStart = Math.floor(now / HOUR) * HOUR;
  if (isBattleNight(now)) return { live: true, at: hourStart + HOUR };
  for (let t = hourStart + HOUR; t < now + 2 * 24 * HOUR; t += HOUR) {
    if (isBattleNight(t)) return { live: false, at: t };
  }
  return { live: false, at: now + 24 * HOUR }; // none configured
}
