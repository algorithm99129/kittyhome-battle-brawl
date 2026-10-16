// Copied from kittyhome.shared (src/happyHour.ts) by `npm run sync:packages` in the parent repo.
// Don't edit this copy: change packages/shared/src/happyHour.ts and sync.
import { env } from "./env.js";

/** Happy Hour (coins earned are doubled), the same on every server */
export function isHappyHour(now = Date.now()) {
  return env.happyHourUtc.includes(new Date(now).getUTCHours());
}
