// Copied from kittyhome-shared (src/bus.ts) by `npm run sync:shared` in the parent repo.
// Don't edit this copy: change shared/src/bus.ts and sync.
/**
 * The bus: how the servers tell each other things as they happen, through the database they share
 * (no extra service to run). A message is a document in bus_events; every server reads the new ones
 * twice a second and hands them to whoever listens. Times come from the database's clock, so servers
 * on different machines agree on what's new.
 *
 * Used for wallets and scores: points won in a battle show in the Grid straight away, and battle
 * items bought in the Grid's shop show in the battle.
 */
import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import { busEvents } from "./db.js";

/** This server (its own messages aren't handed back to it) */
const self = randomUUID();
const POLL_MS = 500;
/** How far back each read looks (messages are dropped by id once handed out) */
const WINDOW_MS = 10_000;

const listeners = new Map<string, Set<(data: unknown) => void>>();
const handed = new Map<string, number>();
let timer: NodeJS.Timeout | null = null;
let reading = false;

/** Tells the other servers */
export function publish(kind: string, data: unknown) {
  // (an upsert with a pipeline, so `at` is the database's clock; $literal keeps data as it is)
  void busEvents
    .updateOne({ _id: new ObjectId() }, [{ $set: { from: self, kind, data: { $literal: data }, at: "$$NOW" } }], { upsert: true })
    .catch((e) => console.error("[bus] publish failed:", e));
}

/** Listens for a kind of message from the other servers */
export function subscribe(kind: string, fn: (data: unknown) => void) {
  if (!listeners.has(kind)) listeners.set(kind, new Set());
  listeners.get(kind)!.add(fn);
  timer ??= setInterval(() => void read(), POLL_MS);
  timer.unref?.();
  return () => listeners.get(kind)?.delete(fn);
}

async function read() {
  if (reading) return;
  reading = true;
  try {
    const docs = await busEvents
      .find({ from: { $ne: self }, kind: { $in: [...listeners.keys()] }, $expr: { $gte: ["$at", { $subtract: ["$$NOW", WINDOW_MS] }] } })
      .sort({ at: 1 })
      .toArray();
    const now = Date.now();
    for (const doc of docs) {
      const id = doc._id.toHexString();
      if (handed.has(id)) continue;
      handed.set(id, now);
      for (const fn of listeners.get(doc.kind) ?? []) {
        try {
          fn(doc.data);
        } catch (error) {
          console.error(`[bus] ${doc.kind} listener failed:`, error);
        }
      }
    }
    for (const [id, at] of handed) if (now - at > WINDOW_MS * 3) handed.delete(id);
  } catch (error) {
    console.error("[bus] read failed:", error);
  } finally {
    reading = false;
  }
}

export function stopBus() {
  if (timer) clearInterval(timer);
  timer = null;
}
