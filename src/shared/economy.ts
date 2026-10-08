// Copied from kittyhome-shared (src/economy.ts) by `npm run sync:shared` in the parent repo.
// Don't edit this copy: change shared/src/economy.ts and sync.
/**
 * Points and coins. Points (user.score) are lifetime and only go up; they're what name tags show.
 * Every point earned also adds coins (double during Happy Hour), and coins are what players spend.
 *
 * Every change is a single atomic database update, so a wallet can never go below zero or be
 * spent twice, and each one is written to the coin ledger.
 *
 * The same on every server; changes are also told to the other servers (the bus), so a wallet or
 * score changed in a battle shows in the Grid straight away, and the other way round.
 */
import { EventEmitter } from "node:events";
import type { ObjectId } from "mongodb";
import { publish, subscribe } from "./bus.js";
import { coinLedger, users } from "./db.js";
import { isHappyHour } from "./happyHour.js";
import { BATTLE_KIT_MAX, type BattleItemId, type BattleKit, type Wallet } from "./protocol.js";

/** "score" (userId, score) and "wallet" (userId, wallet), from this server or another one */
export const economyEvents = new EventEmitter();
economyEvents.setMaxListeners(50);

/** Here and on the other servers */
function tell(kind: "wallet" | "score", userId: string, value: unknown) {
  economyEvents.emit(kind, userId, value);
  publish(`economy:${kind}`, { userId, value });
}
let listening = false;
/** Hear about wallets and scores changed on the other servers (call once the database is up) */
export function listenToOtherServers() {
  if (listening) return;
  listening = true;
  for (const kind of ["wallet", "score"] as const) {
    subscribe(`economy:${kind}`, (data) => {
      const { userId, value } = data as { userId: string; value: unknown };
      if (typeof userId === "string") economyEvents.emit(kind, userId, value);
    });
  }
}

const toWallet = (doc: { coins?: number; items?: string[]; battleKit?: BattleKit }): Wallet => ({
  coins: doc.coins ?? 0,
  items: doc.items ?? [],
  kit: doc.battleKit ?? {},
});
/** What a wallet is made of, for every read */
const WALLET = { coins: 1, items: 1, battleKit: 1 } as const;

function record(userId: ObjectId, delta: number, reason: string, wallet: Wallet) {
  void coinLedger
    .insertOne({ userId, delta, reason, balance: wallet.coins, at: new Date() })
    .catch((e) => console.error("[economy] ledger write failed:", e));
  tell("wallet", userId.toHexString(), wallet);
}

export async function walletOf(userId: ObjectId): Promise<Wallet> {
  const doc = await users.findOne({ _id: userId }, { projection: WALLET });
  return toWallet(doc ?? {});
}

/**
 * Points for playing (puzzle, duties): adds them to the lifetime score and the same number of
 * coins, doubled during Happy Hour. Returns the new score and how many coins were added.
 */
export async function earn(userId: ObjectId, points: number, reason: string) {
  const coins = points * (isHappyHour() ? 2 : 1);
  const doc = await users.findOneAndUpdate(
    { _id: userId },
    { $inc: { score: points, coins }, $set: { updatedAt: new Date() } },
    { returnDocument: "after", projection: { score: 1, ...WALLET } },
  );
  if (!doc) return null;
  tell("score", userId.toHexString(), doc.score);
  record(userId, coins, reason, toWallet(doc));
  return { score: doc.score, coins };
}

/** Takes coins if there are enough; null if not */
export async function spend(userId: ObjectId, amount: number, reason: string): Promise<Wallet | null> {
  const doc = await users.findOneAndUpdate(
    { _id: userId, coins: { $gte: amount } },
    { $inc: { coins: -amount } },
    { returnDocument: "after", projection: WALLET },
  );
  if (!doc) return null;
  const wallet = toWallet(doc);
  record(userId, -amount, reason, wallet);
  return wallet;
}

/** Gives coins: prizes, pots, refunds (the lifetime score isn't touched) */
export async function grant(userId: ObjectId, amount: number, reason: string): Promise<Wallet | null> {
  if (amount <= 0) return null;
  const doc = await users.findOneAndUpdate(
    { _id: userId },
    { $inc: { coins: amount } },
    { returnDocument: "after", projection: WALLET },
  );
  if (!doc) return null;
  const wallet = toWallet(doc);
  record(userId, amount, reason, wallet);
  return wallet;
}

/** Buys an item: pays and adds it in one step. Errors are shown to the player. */
export async function buyItem(
  userId: ObjectId,
  itemId: string,
  price: number,
): Promise<{ ok: true; wallet: Wallet } | { ok: false; error: string }> {
  const doc = await users.findOneAndUpdate(
    { _id: userId, coins: { $gte: price }, items: { $ne: itemId } },
    { $inc: { coins: -price }, $push: { items: itemId } },
    { returnDocument: "after", projection: WALLET },
  );
  if (doc) {
    const wallet = toWallet(doc);
    record(userId, -price, `shop:${itemId}`, wallet);
    return { ok: true, wallet };
  }
  const now = await walletOf(userId);
  if (now.items.includes(itemId)) return { ok: false, error: "You already have it!" };
  return { ok: false, error: `You need ${price - now.coins} more coins.` };
}

/** Gives an item that can't be bought (event prizes); false if they already had it */
export async function giveItem(userId: ObjectId, itemId: string): Promise<boolean> {
  const doc = await users.findOneAndUpdate(
    { _id: userId, items: { $ne: itemId } },
    { $push: { items: itemId } },
    { returnDocument: "after", projection: WALLET },
  );
  if (!doc) return false;
  tell("wallet", userId.toHexString(), toWallet(doc));
  return true;
}

/**
 * Buys battle items: pays and adds qty to the kit in one step (never past BATTLE_KIT_MAX).
 * Errors are shown to the player.
 */
export async function buyKit(
  userId: ObjectId,
  item: BattleItemId,
  qty: number,
  price: number,
): Promise<{ ok: true; wallet: Wallet } | { ok: false; error: string }> {
  const field = `battleKit.${item}`;
  const doc = await users.findOneAndUpdate(
    { _id: userId, coins: { $gte: price }, [field]: { $not: { $gt: BATTLE_KIT_MAX - qty } } },
    { $inc: { coins: -price, [field]: qty } },
    { returnDocument: "after", projection: WALLET },
  );
  if (doc) {
    const wallet = toWallet(doc);
    record(userId, -price, `kit:${item}:${qty}`, wallet);
    return { ok: true, wallet };
  }
  const now = await walletOf(userId);
  if ((now.kit?.[item] ?? 0) + qty > BATTLE_KIT_MAX) return { ok: false, error: `Your kit holds up to ${BATTLE_KIT_MAX} of each item.` };
  return { ok: false, error: `You need ${price - now.coins} more coins.` };
}

/** Takes one battle item out of the kit; the wallet after, or null if there was none */
export async function useKit(userId: ObjectId, item: BattleItemId): Promise<Wallet | null> {
  const field = `battleKit.${item}`;
  const doc = await users.findOneAndUpdate({ _id: userId, [field]: { $gte: 1 } }, { $inc: { [field]: -1 } }, { returnDocument: "after", projection: WALLET });
  if (!doc) return null;
  const wallet = toWallet(doc);
  tell("wallet", userId.toHexString(), wallet);
  return wallet;
}
