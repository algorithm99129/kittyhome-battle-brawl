// Copied from kittyhome-shared (src/session.ts) by `npm run sync:shared` in the parent repo.
// Don't edit this copy: change shared/src/session.ts and sync.
/**
 * Sessions: who a request or a socket belongs to. Core signs people in and sets the session cookie
 * (for the whole site in production: COOKIE_DOMAIN=.kittyhome.org); every server reads it the same
 * way, from the one database, so a member signed in once is signed in on every server.
 */
import { createHash } from "node:crypto";
import type { WithId } from "mongodb";
import { markActive } from "./activity.js";
import { sessions, users, type UserDoc } from "./db.js";

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
