// Copied from kittyhome-shared (src/progress.ts) by `npm run sync:shared` in the parent repo.
// Don't edit this copy: change shared/src/progress.ts and sync.
/**
 * Characters grow: every battle round gives the character you played XP (more for winning, the MVP
 * and knockouts), XP makes levels, and each level unlocks an upgrade you buy with coins
 * (CHARACTER_TIERS). Upgrades and worn shop items add up to the character's battle modifiers.
 * Kept per member and character in users.characters.
 */
import type { ObjectId } from "mongodb";
import { users, type UserDoc } from "./db.js";
import { battleMods, CHARACTER_LEVEL_XP, characterLevel, gearPerk, SHOP_ITEMS, type AvatarStyle, type CharacterProgressView } from "./protocol.js";

/** A member's progress with a character, as the arena shows it */
export function progressView(
  user: Pick<UserDoc, "characters" | "coins" | "look">,
  style: AvatarStyle,
  extra: { gained?: number; levelUp?: boolean } = {},
): CharacterProgressView {
  const c = user.characters?.[style] ?? {};
  const xp = c.xp ?? 0;
  const tier = c.tier ?? 0;
  const level = characterLevel(xp);
  const gear = user.look?.gear ?? {};
  const perks = Object.values(gear).flatMap((id) => {
    const item = SHOP_ITEMS.find((i) => i.id === id);
    const perk = item ? gearPerk(item) : null;
    return item && perk ? [{ emoji: item.emoji, name: item.name, text: perk.text }] : [];
  });
  return {
    style,
    xp,
    level,
    nextLevelXp: CHARACTER_LEVEL_XP[level] ?? null,
    tier,
    coins: user.coins ?? 0,
    mods: battleMods(tier, user.look?.gear),
    perks,
    ...extra,
  };
}

/** XP for a character; the member afterwards (null: not found) */
export async function addCharacterXp(userId: ObjectId, style: AvatarStyle, xp: number) {
  return users.findOneAndUpdate(
    { _id: userId },
    { $inc: { [`characters.${style}.xp`]: Math.max(0, Math.round(xp)) } },
    { returnDocument: "after", projection: { characters: 1, coins: 1, look: 1 } },
  );
}
