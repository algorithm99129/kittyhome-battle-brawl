// Copied from kittyhome-shared (src/timeSpent.ts) by `npm run sync:shared` in the parent repo.
// Don't edit this copy: change shared/src/timeSpent.ts and sync.
/**
 * Time members spend in the community: counted while a Grid or arena tab is open and in view
 * (a tab in the background or a locked phone doesn't count, and two tabs at once count once),
 * added to users.communityMs every minute and when they leave. Each server counts its own
 * connections (a Grid tab and a battle tab in view at the same moment count twice).
 */
import type { ObjectId } from "mongodb";
import { users } from "./db.js";

const FLUSH_MS = 60_000;

/** Per member: which connections are in view right now, and since when we've been counting */
const live = new Map<string, { userId: ObjectId; keys: Set<string>; since: number }>();

/** Writes still on their way (shutdown waits for them) */
const pending = new Set<Promise<unknown>>();

function save(userId: ObjectId, ms: number) {
  if (ms < 1000) return;
  const write = users
    .updateOne({ _id: userId }, { $inc: { communityMs: Math.round(ms) } })
    .catch((e) => console.error("[time] save failed:", e))
    .finally(() => pending.delete(write));
  pending.add(write);
}

/** A connection (key) is in view or not; the member's clock runs while any of theirs is */
export function trackTime(userId: ObjectId, key: string, active: boolean) {
  const id = userId.toHexString();
  const now = Date.now();
  let entry = live.get(id);
  if (active) {
    if (!entry) {
      entry = { userId, keys: new Set(), since: now };
      live.set(id, entry);
    }
    entry.keys.add(key);
    return;
  }
  if (!entry || !entry.keys.delete(key)) return;
  if (entry.keys.size) return;
  save(userId, now - entry.since);
  live.delete(id);
}

/** Saves the time so far for everyone counting (and keeps counting); resolves once it's written */
export async function flushTime() {
  const now = Date.now();
  for (const entry of live.values()) {
    save(entry.userId, now - entry.since);
    entry.since = now;
  }
  await Promise.all(pending);
}

const timer = setInterval(() => void flushTime(), FLUSH_MS);
timer.unref?.();
