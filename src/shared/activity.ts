// Copied from kittyhome-shared (src/activity.ts) by `npm run sync:shared` in the parent repo.
// Don't edit this copy: change shared/src/activity.ts and sync.
/**
 * Who's active each day (for retention numbers) and streaks, the same on every server.
 */
import type { ObjectId } from "mongodb";
import { dailyActive, users, type UserDoc } from "./db.js";
import type { StreakView } from "./protocol.js";

const DAY_MS = 24 * 60 * 60 * 1000;
export const utcDay = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS);

const seen = new Set<string>();
let seenDay = utcDay();

/** Records that a member used KittyHome today (cheap to call on every request) */
export function markActive(userId: ObjectId) {
  const day = utcDay();
  if (day !== seenDay) {
    seen.clear();
    seenDay = day;
  }
  const key = userId.toHexString();
  if (seen.has(key)) return;
  seen.add(key);
  const at = new Date();
  void Promise.all([
    dailyActive.updateOne({ day, userId }, { $setOnInsert: { day, userId, at } }, { upsert: true }),
    users.updateOne({ _id: userId }, { $set: { lastActiveAt: at } }),
  ]).catch(() => seen.delete(key));
}

export function streakView(user: Pick<UserDoc, "streak">): StreakView {
  const s = user.streak;
  const today = utcDay();
  // A streak that's already broken shows as 0 until they come back
  const alive = s && daysBetween(s.lastDay, today) <= 1 + (s.freezes ?? 0);
  return { count: alive ? s.count : 0, best: s?.best ?? 0, freezes: s?.freezes ?? 0, today: s?.lastDay === today };
}
