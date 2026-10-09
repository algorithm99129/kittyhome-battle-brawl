// Copied from kittyhome-shared (src/session.ts) by `npm run sync:shared` in the parent repo.
// Don't edit this copy: change shared/src/session.ts and sync.
/**
 * Sessions: who a request or a socket belongs to. Core signs people in and sets the session cookie;
 * every server reads sessions from the one database, so a member signed in once is signed in
 * everywhere. The battle servers usually can't see the cookie (they run on other domains), so they
 * take a battle ticket instead: a short-lived token core gives the member, kept in the same database.
 */
import { createHash, randomBytes } from "node:crypto";
import type { ObjectId, WithId } from "mongodb";
import { markActive } from "./activity.js";
import { arenaTickets, sessions, users, type UserDoc } from "./db.js";

export const SESSION_COOKIE = "kh_session";

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** The member a session token belongs to (null: no session, expired, or suspended) */
export async function getUserByToken(token: unknown): Promise<WithId<UserDoc> | null> {
  if (typeof token !== "string" || !token) return null;
  const session = await sessions.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;
  const user = await users.findOne({ _id: session.userId });
  // Suspended accounts are signed out everywhere
  if (!user || user.banned) return null;
  markActive(user._id);
  return user;
}

/** For non-Express callers (a Socket.IO handshake) that only have the raw Cookie header */
export function getUserFromCookieHeader(header: string | undefined): Promise<WithId<UserDoc> | null> {
  const pair = (header ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return getUserByToken(pair ? decodeURIComponent(pair.slice(SESSION_COOKIE.length + 1)) : undefined);
}

/** How long a battle ticket works (the page asks for a fresh one every time it connects) */
export const TICKET_MS = 2 * 60_000;

/** A battle ticket for a signed-in member (core gives it out) */
export async function createTicket(userId: ObjectId): Promise<string> {
  const ticket = randomBytes(24).toString("base64url");
  await arenaTickets.insertOne({ tokenHash: hashToken(ticket), userId, expiresAt: new Date(Date.now() + TICKET_MS) });
  return ticket;
}

/** The member a battle ticket belongs to (null: unknown, expired, or suspended) */
export async function getUserByTicket(ticket: unknown): Promise<WithId<UserDoc> | null> {
  if (typeof ticket !== "string" || !ticket || ticket.length > 100) return null;
  const doc = await arenaTickets.findOne({ tokenHash: hashToken(ticket), expiresAt: { $gt: new Date() } });
  if (!doc) return null;
  const user = await users.findOne({ _id: doc.userId });
  if (!user || user.banned) return null;
  markActive(user._id);
  return user;
}
