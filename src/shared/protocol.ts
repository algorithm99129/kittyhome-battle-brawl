// Copied from kittyhome.shared (src/protocol.ts) by `npm run sync:shared` in the parent repo.
// Don't edit this copy: change packages/shared/src/protocol.ts and sync.
// The protocol between the Grid's pages and the KittyHome servers (core and the battle
// servers): shared types, constants and Socket.IO events. The source is kittyhome.shared; every app
// gets a copy from `npm run sync:shared` in the parent repo.
export const WORLD_HALF_SIZE = 120;
export const MAX_SPEED = 9; // units per second
export const TICK_MS = 100;
export const SHOUT_MAX_LENGTH = 200;
export const SHOUT_COOLDOWN_MS = 5_000;
export const EMOTE_COOLDOWN_MS = 800;

export const EMOTES = ["wave", "heart", "idea", "coffee", "party"] as const;
export type Emote = (typeof EMOTES)[number];

/** "ai" is a mentor cat run by the server */
export type Role = "member" | "professional" | "ai";

export const NPC_TALK_RANGE = 12; // how close you must be to chat with a mentor
export const NPC_MESSAGE_MAX_LENGTH = 500;

export type NpcProfile = {
  id: string; // same as the mentor's PlayerInfo id
  name: string;
  title: string;
  zone: string;
  expertise: string[];
  tagline: string;
  greeting: string;
};

/** A message in the open chat */
export type NpcMessage = { role: "user" | "assistant"; content: string };

/**
 * Earlier mentor chats, kept 30 days so you can scroll back. Only for you to read: the mentor
 * replies from its memories, not from this transcript.
 */
export type NpcHistoryItem = NpcMessage & { at: string };

/** A joke by Giggles, the comedy cat. favorite: one of the 10 most liked jokes */
export type Joke = { id: string; text: string; up: number; down: number; favorite: boolean; vote: 1 | -1 | 0 };
export type JokeVote = 1 | -1 | 0;

/** AI reply ideas shown above the chat input */
export const SUGGESTION_MAX_LENGTH = 60;
export type SuggestFor = { kind: "dm"; roomId: string } | { kind: "npc"; npcId: string };

// ——— Guests: try the Grid for a few minutes without signing in ———

/** How long a guest visit lasts (long enough to look around, meet a mentor and want to stay) */
export const GUEST_MINUTES = 12;
/** Messages a guest can send the AI mentors in one visit (members get many more, and are remembered) */
export const GUEST_MENTOR_MESSAGES = 6;
/** Guest player ids start with this (they have no account) */
export const GUEST_PREFIX = "guest:";
export const isGuestId = (id: string) => id.startsWith(GUEST_PREFIX);

// ——— Character looks ———

export const AVATAR_STYLES = [
  "classic",
  "chonk",
  "lion",
  "wizard",
  "robo",
  "astro",
  "ninja",
  "pirate",
  "dragon",
  "ghost",
  "detective",
  "knight",
  // Not cats at all: other animals, the most expensive characters (their powers match everyone else's)
  "rabbit",
  "pig",
  "dog",
  "frog",
  "fox",
  "penguin",
  "owl",
  "panda",
] as const;
export type AvatarStyle = (typeof AVATAR_STYLES)[number];

/** Fur colors players can pick. Gold (AI mentors) and green (professionals) are reserved. */
export const AVATAR_COLORS = {
  orange: 0xff8a3d,
  pink: 0xf472b6,
  sky: 0x38bdf8,
  violet: 0xa78bfa,
  snow: 0xf5f5f4,
  peach: 0xfdba74,
  cherry: 0xf87171,
  shadow: 0x9ca3af,
  // Mythic furs: bought (MYTHIC_FURS), on any character; each one moves in its own way
  gold: 0xffc83d,
  neon: 0x22e5ff,
  rainbow: 0xff6ad5,
  lava: 0xff5a1f,
  obsidian: 0x8b5cf6,
  crystal: 0xbfeaff,
} as const;
export type AvatarColor = keyof typeof AVATAR_COLORS;
/** Fur colors that are bought, and the shop item each one is */
export const MYTHIC_FURS: Partial<Record<AvatarColor, string>> = {
  gold: "fur-gold",
  neon: "fur-neon",
  rainbow: "fur-rainbow",
  lava: "fur-lava",
  obsidian: "fur-obsidian",
  crystal: "fur-crystal",
};
/** Whether someone may wear this fur color (the mythic ones are bought) */
export const furAllowed = (color: AvatarColor, items: readonly string[]) => !MYTHIC_FURS[color] || items.includes(MYTHIC_FURS[color]!);

/** gear: shop items worn (see SHOP_ITEMS) */
export type AvatarLook = { style: AvatarStyle; color: AvatarColor; gear?: Gear };

// ——— Coins and the shop ———
//
// Points (the name tag) are lifetime and never go down. Every point earned also adds a coin to
// your wallet, and coins are what you spend: shop items, arcade entry fees, treasure maps.

export const GEAR_SLOTS = ["hat", "face", "trail", "frame", "aura"] as const;
export type GearSlot = (typeof GEAR_SLOTS)[number];
export type Gear = Partial<Record<GearSlot, string>>;
/** mythic: the most expensive things, for looks only (no battle perk), owned by few */
export type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";

/**
 * kind: a slot you wear it in, "fx" for one-off effects everyone sees (used up on use),
 * "character" for a character you unlock once and can play as from then on (see style), "fur" for a
 * mythic fur color (see fur), or "emote" for the signature emote.
 * earnedBy: can't be bought; this says how to win it.
 * limited: only this many will ever be sold, each numbered (#1, #2…); never sold again after.
 */
export type ShopItem = {
  id: string;
  name: string;
  emoji: string;
  kind: GearSlot | "fx" | "character" | "fur" | "emote";
  /** For characters: which one it unlocks */
  style?: AvatarStyle;
  /** For furs: which color it unlocks */
  fur?: AvatarColor;
  price: number;
  rarity: Rarity;
  description: string;
  earnedBy?: string;
  limited?: { total: number; season: string };
};

export const SHOP_ITEMS: ShopItem[] = [
  // Hats
  { id: "hat-party", name: "Party Hat", emoji: "🥳", kind: "hat", price: 300, rarity: "common", description: "Every day is a party." },
  { id: "hat-beanie", name: "Cozy Beanie", emoji: "🧶", kind: "hat", price: 400, rarity: "common", description: "Warm ears, cool cat." },
  { id: "hat-cap", name: "Coder Cap", emoji: "🧢", kind: "hat", price: 500, rarity: "common", description: "Worn backwards, obviously." },
  { id: "hat-flower", name: "Flower Crown", emoji: "🌸", kind: "hat", price: 800, rarity: "rare", description: "Fresh from Frontend Forest." },
  { id: "hat-headphones", name: "DJ Headphones", emoji: "🎧", kind: "hat", price: 1_000, rarity: "rare", description: "Hear the beat of Cat Radio." },
  { id: "hat-top", name: "Top Hat", emoji: "🎩", kind: "hat", price: 1_200, rarity: "rare", description: "For very distinguished kitties." },
  { id: "hat-propeller", name: "Propeller Beanie", emoji: "🌀", kind: "hat", price: 2_000, rarity: "epic", description: "It spins when you run." },
  { id: "hat-beret", name: "Painter's Beret", emoji: "🎨", kind: "hat", price: 450, rarity: "common", description: "Very artistic. Very French." },
  { id: "hat-chef", name: "Chef Hat", emoji: "👨‍🍳", kind: "hat", price: 500, rarity: "common", description: "Cooking up something good." },
  { id: "hat-grad", name: "Graduation Cap", emoji: "🎓", kind: "hat", price: 600, rarity: "common", description: "For every lesson learned." },
  { id: "hat-cowboy", name: "Cowboy Hat", emoji: "🤠", kind: "hat", price: 1_100, rarity: "rare", description: "Yeehaw, partner." },
  { id: "hat-viking", name: "Viking Helmet", emoji: "🪖", kind: "hat", price: 1_300, rarity: "rare", description: "Horns up, raid the backlog." },
  { id: "hat-tiara", name: "Crystal Tiara", emoji: "👸", kind: "hat", price: 2_400, rarity: "epic", description: "Sparkles in every light." },
  { id: "hat-horns", name: "Devil Horns", emoji: "😈", kind: "hat", price: 2_600, rarity: "epic", description: "A little bit of mischief." },
  { id: "hat-halo", name: "Angel Halo", emoji: "😇", kind: "hat", price: 3_000, rarity: "epic", description: "A glowing ring, floating just above." },
  { id: "hat-samurai", name: "Samurai Kabuto", emoji: "🏯", kind: "hat", price: 6_000, rarity: "legendary", description: "The helmet of a code warrior." },
  { id: "hat-unicorn", name: "Unicorn Horn", emoji: "🦄", kind: "hat", price: 5_500, rarity: "legendary", description: "Magical, and slightly pointy." },
  { id: "hat-diamond", name: "Diamond Crown", emoji: "💎", kind: "hat", price: 120_000, rarity: "mythic", description: "Cut from one enormous diamond. It throws light everywhere." },
  { id: "hat-phoenix", name: "Phoenix Crown", emoji: "🐦‍🔥", kind: "hat", price: 150_000, rarity: "mythic", description: "Feathers of living flame that never go out." },
  { id: "hat-crown", name: "Royal Crown", emoji: "👑", kind: "hat", price: 5_000, rarity: "legendary", description: "Rule the Grid." },
  {
    id: "hat-pirate",
    name: "Treasure Hunter Hat",
    emoji: "🏴‍☠️",
    kind: "hat",
    price: 0,
    rarity: "epic",
    description: "Only for those who found the chest.",
    earnedBy: "Win a treasure hunt",
  },
  {
    id: "hat-supporter",
    name: "Supporter Hat",
    emoji: "💛",
    kind: "hat",
    price: 0,
    rarity: "legendary",
    description: "A golden crown of hearts for the people who keep KittyHome going.",
    earnedBy: "Buy $15 or more in coins",
  },
  // Faces
  { id: "face-patch", name: "Pirate Patch", emoji: "🏴‍☠️", kind: "face", price: 400, rarity: "common", description: "Arr, one eye on the code." },
  { id: "face-mustache", name: "Fancy Mustache", emoji: "🥸", kind: "face", price: 450, rarity: "common", description: "Twirl it thoughtfully." },
  { id: "face-stars", name: "Star Glasses", emoji: "🤩", kind: "face", price: 950, rarity: "rare", description: "Starstruck, always." },
  { id: "face-mask", name: "Hero Mask", emoji: "🦸", kind: "face", price: 2_600, rarity: "epic", description: "Secret identity: senior developer." },
  { id: "face-gold-mask", name: "Golden Mask", emoji: "🎭", kind: "face", price: 6_500, rarity: "legendary", description: "A masquerade in solid gold." },
  { id: "face-laser", name: "Laser Eyes", emoji: "🔴", kind: "face", price: 60_000, rarity: "mythic", description: "Two glowing beams. Everyone knows you mean business." },
  { id: "face-shades", name: "Cool Shades", emoji: "😎", kind: "face", price: 350, rarity: "common", description: "Too cool for the plaza." },
  { id: "face-nerd", name: "Nerd Glasses", emoji: "🤓", kind: "face", price: 350, rarity: "common", description: "+10 to debugging." },
  { id: "face-hearts", name: "Heart Eyes", emoji: "😍", kind: "face", price: 900, rarity: "rare", description: "In love with the Grid." },
  { id: "face-monocle", name: "Fancy Monocle", emoji: "🧐", kind: "face", price: 1_100, rarity: "rare", description: "Indubitably." },
  { id: "face-visor", name: "Cyber Visor", emoji: "🥽", kind: "face", price: 2_200, rarity: "epic", description: "See the matrix." },
  // Trails
  { id: "trail-paws", name: "Paw Prints", emoji: "🐾", kind: "trail", price: 450, rarity: "common", description: "Leave your mark." },
  { id: "trail-leaves", name: "Autumn Leaves", emoji: "🍂", kind: "trail", price: 500, rarity: "common", description: "Crunch, crunch." },
  { id: "trail-snow", name: "Snowflakes", emoji: "❄️", kind: "trail", price: 900, rarity: "rare", description: "Let it snow." },
  { id: "trail-petals", name: "Sakura Petals", emoji: "🌸", kind: "trail", price: 950, rarity: "rare", description: "Spring follows you." },
  { id: "trail-lightning", name: "Lightning", emoji: "⚡", kind: "trail", price: 2_000, rarity: "epic", description: "Fast. Very fast." },
  { id: "trail-fire", name: "Fire Steps", emoji: "🔥", kind: "trail", price: 2_200, rarity: "epic", description: "Too hot to handle." },
  { id: "trail-coins", name: "Coin Trail", emoji: "🪙", kind: "trail", price: 5_500, rarity: "legendary", description: "Make it rain." },
  { id: "trail-diamonds", name: "Diamond Dust", emoji: "💎", kind: "trail", price: 7_000, rarity: "legendary", description: "Sparkles with every step." },
  { id: "trail-comet", name: "Comet Tail", emoji: "☄️", kind: "trail", price: 75_000, rarity: "mythic", description: "A blazing comet tail, wherever you go." },
  { id: "trail-bubbles", name: "Bubble Trail", emoji: "🫧", kind: "trail", price: 500, rarity: "common", description: "Pop, pop, pop." },
  { id: "trail-sparkle", name: "Sparkle Trail", emoji: "✨", kind: "trail", price: 900, rarity: "rare", description: "Leave a little magic behind." },
  { id: "trail-hearts", name: "Love Trail", emoji: "💕", kind: "trail", price: 900, rarity: "rare", description: "Spread the love." },
  { id: "trail-stars", name: "Star Trail", emoji: "⭐", kind: "trail", price: 1_200, rarity: "rare", description: "You're a star." },
  { id: "trail-music", name: "Music Trail", emoji: "🎵", kind: "trail", price: 1_800, rarity: "epic", description: "Every step is a beat." },
  { id: "trail-code", name: "Code Trail", emoji: "💾", kind: "trail", price: 2_000, rarity: "epic", description: "Leaves 0s and 1s behind." },
  { id: "trail-rainbow", name: "Rainbow Trail", emoji: "🌈", kind: "trail", price: 5_000, rarity: "legendary", description: "Taste the rainbow." },
  // Name tags
  { id: "frame-ocean", name: "Ocean Tag", emoji: "🌊", kind: "frame", price: 550, rarity: "common", description: "Calm blue waves." },
  { id: "frame-candy", name: "Candy Tag", emoji: "🍭", kind: "frame", price: 600, rarity: "common", description: "Sweet stripes." },
  { id: "frame-matrix", name: "Matrix Tag", emoji: "💚", kind: "frame", price: 1_100, rarity: "rare", description: "Green code on black." },
  { id: "frame-ice", name: "Ice Tag", emoji: "🧊", kind: "frame", price: 1_200, rarity: "rare", description: "Frosty and cool." },
  { id: "frame-royal", name: "Royal Tag", emoji: "💜", kind: "frame", price: 2_800, rarity: "epic", description: "Purple and gold, fit for royalty." },
  { id: "frame-lava", name: "Lava Tag", emoji: "🌋", kind: "frame", price: 6_000, rarity: "legendary", description: "Molten and moving." },
  { id: "frame-holo", name: "Hologram Tag", emoji: "🔮", kind: "frame", price: 40_000, rarity: "mythic", description: "A shifting hologram, straight from the future." },
  { id: "frame-diamond", name: "Diamond Tag", emoji: "💠", kind: "frame", price: 100_000, rarity: "mythic", description: "A name tag set with diamonds that catch the light." },
  { id: "frame-sakura", name: "Sakura Tag", emoji: "🌸", kind: "frame", price: 500, rarity: "common", description: "Soft pink petals." },
  { id: "frame-pixel", name: "Pixel Tag", emoji: "👾", kind: "frame", price: 600, rarity: "common", description: "8-bit forever." },
  { id: "frame-neon", name: "Neon Tag", emoji: "💡", kind: "frame", price: 1_000, rarity: "rare", description: "Glows in the dark." },
  { id: "frame-fire", name: "Fire Tag", emoji: "🔥", kind: "frame", price: 2_000, rarity: "epic", description: "You're on fire!" },
  { id: "frame-gold", name: "Gold Tag", emoji: "🥇", kind: "frame", price: 2_500, rarity: "epic", description: "Pure gold." },
  {
    id: "frame-champion",
    name: "Champion Tag",
    emoji: "🏆",
    kind: "frame",
    price: 0,
    rarity: "legendary",
    description: "Weekend Cup champions only.",
    earnedBy: "Finish top 3 in a Weekend Cup",
  },
  {
    id: "frame-starter",
    name: "Trailblazer Tag",
    emoji: "🧭",
    kind: "frame",
    price: 0,
    rarity: "epic",
    description: "For the explorers who picked up the starter pack.",
    earnedBy: "Get the starter pack in the shop (once per member)",
  },
  {
    id: "frame-founder",
    name: "Founder Tag",
    emoji: "🌟",
    kind: "frame",
    price: 0,
    rarity: "legendary",
    description: "For KittyHome's founding supporters.",
    earnedBy: "Buy $35 or more in coins",
  },
  // Characters: unlocked once, then pick them any time in the wardrobe
  { id: "char-ninja", name: "Ninja", emoji: "🥷", kind: "character", style: "ninja", price: 2_500, rarity: "epic", description: "Silent paws, and a Shadow Step that teleports you ahead." },
  { id: "char-pirate", name: "Pirate", emoji: "🏴‍☠️", kind: "character", style: "pirate", price: 2_800, rarity: "epic", description: "Swagger in a tricorn, and fire yourself far ahead with Cannonball." },
  { id: "char-ghost", name: "Ghost", emoji: "👻", kind: "character", style: "ghost", price: 3_000, rarity: "epic", description: "Float about and spook everyone nearby with Boo." },
  { id: "char-detective", name: "Detective", emoji: "🕵️", kind: "character", style: "detective", price: 3_500, rarity: "epic", description: "Sniff Out hidden fish and the lost kitten on your radar." },
  { id: "char-knight", name: "Knight", emoji: "🛡️", kind: "character", style: "knight", price: 5_000, rarity: "legendary", description: "Helmet, shield, and a Shield Bash that boops a whole crowd." },
  { id: "char-dragon", name: "Dragon", emoji: "🐉", kind: "character", style: "dragon", price: 8_000, rarity: "legendary", description: "Wings, horns, and Take Flight to soar across the Grid." },
  { id: "char-rabbit", name: "Rabbit", emoji: "🐰", kind: "character", style: "rabbit", price: 9_000, rarity: "legendary", description: "Long ears, a cotton tail, and a Bunny Hop that clears anything." },
  { id: "char-pig", name: "Pig", emoji: "🐷", kind: "character", style: "pig", price: 9_000, rarity: "legendary", description: "Round, pink-nosed and proud. Mud Splash boops everyone nearby." },
  { id: "char-dog", name: "Dog", emoji: "🐶", kind: "character", style: "dog", price: 10_000, rarity: "legendary", description: "Floppy ears, a waggy tail, and a Good Nose for hidden fish." },
  { id: "char-frog", name: "Frog", emoji: "🐸", kind: "character", style: "frog", price: 10_000, rarity: "legendary", description: "Big eyes, a wide grin, and a Frog Leap from strong back legs." },
  { id: "char-fox", name: "Fox", emoji: "🦊", kind: "character", style: "fox", price: 12_000, rarity: "legendary", description: "A bushy white-tipped tail, and a Fox Dash too quick to see." },
  { id: "char-penguin", name: "Penguin", emoji: "🐧", kind: "character", style: "penguin", price: 15_000, rarity: "legendary", description: "A dapper waddle, flippers, and a Belly Slide that zooms." },
  { id: "char-owl", name: "Owl", emoji: "🦉", kind: "character", style: "owl", price: 25_000, rarity: "mythic", description: "Huge round eyes, ear tufts, and a Hoot that startles everyone." },
  { id: "char-panda", name: "Panda", emoji: "🐼", kind: "character", style: "panda", price: 40_000, rarity: "mythic", description: "Black eye patches, a big round belly, and a Roly-Poly roll." },
  // Effects everyone sees (used up)
  // ——— Mythic: the most expensive things, for looks only, owned by few ———
  { id: "aura-flames", name: "Golden Flames", emoji: "🔥", kind: "aura", price: 20_000, rarity: "mythic", description: "A ring of golden fire follows you everywhere." },
  { id: "aura-galaxy", name: "Galaxy Aura", emoji: "🌌", kind: "aura", price: 20_000, rarity: "mythic", description: "A swirl of stars and nebula around your paws." },
  { id: "aura-sakura", name: "Sakura Storm", emoji: "🌸", kind: "aura", price: 35_000, rarity: "mythic", description: "Cherry blossoms whirling around you." },
  { id: "aura-storm", name: "Storm Aura", emoji: "⚡", kind: "aura", price: 40_000, rarity: "mythic", description: "Lightning crackles around your paws." },
  { id: "aura-wings", name: "Angel Wings", emoji: "🪽", kind: "aura", price: 100_000, rarity: "mythic", description: "Glowing wings that slowly beat as you go." },
  { id: "aura-diamond", name: "Diamond Halo", emoji: "💠", kind: "aura", price: 150_000, rarity: "mythic", description: "A ring of diamonds orbiting you, scattering light." },
  { id: "fur-rainbow", name: "Rainbow Fur", emoji: "🌈", kind: "fur", fur: "rainbow", price: 50_000, rarity: "mythic", description: "Every color at once, always moving." },
  { id: "fur-lava", name: "Lava Fur", emoji: "🌋", kind: "fur", fur: "lava", price: 45_000, rarity: "mythic", description: "Glows like molten rock." },
  { id: "fur-obsidian", name: "Obsidian Fur", emoji: "🖤", kind: "fur", fur: "obsidian", price: 45_000, rarity: "mythic", description: "Deep violet stone with a flash of light." },
  { id: "fur-crystal", name: "Crystal Fur", emoji: "🧊", kind: "fur", fur: "crystal", price: 80_000, rarity: "mythic", description: "Icy crystal that sparkles as you move." },
  { id: "fur-gold", name: "Golden Fur", emoji: "🪙", kind: "fur", fur: "gold", price: 30_000, rarity: "mythic", description: "Solid gold with a shimmer, on any character. A Golden Dragon, anyone?" },
  { id: "fur-neon", name: "Neon Fur", emoji: "💠", kind: "fur", fur: "neon", price: 30_000, rarity: "mythic", description: "Glows and shifts color, on any character." },
  { id: "frame-prism", name: "Prism Tag", emoji: "🌈", kind: "frame", price: 15_000, rarity: "mythic", description: "A name tag that shimmers through every color." },
  { id: "emote-signature", name: "Signature Emote", emoji: "💫", kind: "emote", price: 25_000, rarity: "mythic", description: "Your own emote: pick any emoji, then play it big for everyone (key 9)." },
  {
    id: "hat-harvest-moon",
    name: "Harvest Moon Crown",
    emoji: "🌕",
    kind: "hat",
    price: 50_000,
    rarity: "mythic",
    description: "A glowing crescent crown. Only 100 will ever exist, each numbered, never sold again.",
    limited: { total: 100, season: "Autumn 2026" },
  },
  { id: "fx-confetti", name: "Confetti Burst", emoji: "🎊", kind: "fx", price: 50, rarity: "common", description: "Pop confetti around you." },
  { id: "fx-fireworks", name: "Fireworks Show", emoji: "🎆", kind: "fx", price: 300, rarity: "epic", description: "Light up the sky for everyone." },
  { id: "fx-finale", name: "Grand Finale", emoji: "🎇", kind: "fx", price: 10_000, rarity: "mythic", description: "The biggest fireworks show, with your name written in the sky for everyone." },
];
export const SHOP_BY_ID = new Map(SHOP_ITEMS.map((item) => [item.id, item]));

/** The shop item that unlocks a character, or undefined if it's free */
export function characterItem(style: AvatarStyle): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.kind === "character" && item.style === style);
}

/** Free characters, and the ones whose unlock is among your items */
export function ownsCharacter(style: AvatarStyle, items: readonly string[]): boolean {
  const item = characterItem(style);
  return !item || items.includes(item.id);
}

/** What's in your wallet (sent only to you) */
/** kit: battle items and how many of each (see BATTLE_ITEMS) */
export type Wallet = {
  coins: number;
  items: string[];
  kit?: BattleKit;
  /** Battle progress per character (the wardrobe shows it): its level from XP, and upgrades bought */
  battle?: Partial<Record<AvatarStyle, { level: number; tier: number }>>;
  /** The signature emote's emoji, once chosen */
  signature?: string;
  /** Limited items they own, and which number each one is (e.g. #12 of 100) */
  limited?: Record<string, number>;
};

/** One emoji (any skin tone or sequence) for the signature emote */
export const isSignatureEmoji = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 16 && /^\p{Extended_Pictographic}(\p{Emoji_Modifier}|\uFE0F|\u200D\p{Extended_Pictographic}\uFE0F?)*$/u.test(value);

/** How many people own each mythic item, and what's left of the limited ones (GET /shop/stats) */
export type ShopStats = { owners: Record<string, number>; limited: Record<string, { sold: number; total: number }> };

// ——— Arcade: mini-games with an entry fee and a prize pot ———

export type GameId = "fish" | "race" | "trivia" | "bomb" | "lava" | "statues" | "hide";
export type GameDef = { id: GameId; name: string; emoji: string; description: string; fee: number; seconds: number };
export const GAMES: Record<GameId, GameDef> = {
  fish: {
    id: "fish",
    name: "Fish Frenzy",
    emoji: "🐟",
    description: "Golden fish rain on the plaza. Grab the most in 60 seconds (rainbow fish count triple).",
    fee: 20,
    seconds: 60,
  },
  race: {
    id: "race",
    name: "Beacon Race",
    emoji: "⚡",
    description: "Race through 6 beacons in order. First one home wins.",
    fee: 30,
    seconds: 75,
  },
  trivia: {
    id: "trivia",
    name: "Trivia Showdown",
    emoji: "🧠",
    description: "5 quick trivia questions. Right and fast wins.",
    fee: 25,
    seconds: 80,
  },
  bomb: {
    id: "bomb",
    name: "Yarn Bomb",
    emoji: "🧨",
    description: "A ticking yarn ball! Touch another cat to pass it on. Holding it when it pops and you're out. Last cat standing wins.",
    fee: 20,
    seconds: 90,
  },
  lava: {
    id: "lava",
    name: "Floor is Lava",
    emoji: "🌋",
    description: "The glowing floor on the plaza vanishes tile by tile. Tiles flash red before they go. Fall in and you're out. Last cat standing wins.",
    fee: 25,
    seconds: 70,
  },
  statues: {
    id: "statues",
    name: "Statues",
    emoji: "🚦",
    description: "Run to the finish while the giant cat looks away. Move while it's watching and it's back to the start line. First one there wins.",
    fee: 25,
    seconds: 75,
  },
  hide: {
    id: "hide",
    name: "Hide and Seek",
    emoji: "🙈",
    description: "Hiders turn into crates, barrels and plants among the real ones. The seeker pounces on what it thinks is a cat. Found cats join the hunt.",
    fee: 30,
    seconds: 90,
  },
};
/**
 * Where the plaza games are played (the server puts everyone there when one starts), so the page
 * draws exactly what the server checks. Yarn Bomb: a ring to stay in. Floor is Lava: a square of
 * tiles around the middle. Statues: a lane up the north avenue. Hide and Seek: a wide ring, and
 * what a hider can be disguised as.
 */
export const ARCADE_BOMB = { r: 16, touch: 2.4 };
/** (a little south of the middle, clear of the arena's gateway) */
export const ARCADE_LAVA = { tiles: 6, size: 5, x: 0, z: 5 };
export const ARCADE_STATUES = { startZ: 14, finishZ: 58, halfWidth: 9 };
export const ARCADE_HIDE = { r: 30, find: 2.2, hideSeconds: 12 };
export const ARCADE_PROPS = ["crate", "barrel", "plant", "cone"] as const;
export const ARCADE_MIN_PLAYERS = 2;
export const ARCADE_MAX_PLAYERS = 8;

/** The public lobby everyone can see and join */
export type ArcadeLobby = {
  game: GameId;
  players: { id: string; name: string }[];
  pot: number;
  /** Seconds until it starts (enough players), or until it closes (still waiting) */
  startsIn: number | null;
  closesIn: number;
  /** A game is being played right now; the next lobby opens after it */
  busy: boolean;
};

/** A game you're playing (sent to its players) */
export type ArcadeMatch = {
  matchId: string;
  game: GameId;
  practice: boolean;
  pot: number;
  secondsLeft: number;
  /** Before the start: seconds of "Get ready" */
  countdown: number;
  players: { id: string; name: string; score: number; done: boolean }[];
  /** A short status, e.g. "Beacon 3/6" or "Question 2/5" */
  label: string;
  /**
   * The plaza games' moment: Statues (go: run, freeze: don't move), Yarn Bomb (hot: you hold it),
   * Hide and Seek (hide: hiders are hiding and seekers can't look yet, seek), out: you're out and watching
   */
  phase?: "go" | "freeze" | "hot" | "hide" | "seek" | "out";
  /** Hide and Seek: what you are, and (hiding) what you're disguised as */
  role?: "seeker" | "hider";
  disguise?: (typeof ARCADE_PROPS)[number];
};

export type ArcadeResult = {
  matchId: string;
  game: GameId;
  practice: boolean;
  places: { id: string; name: string; score: number; place: number; won: number }[];
};

export type TriviaQuestion = {
  matchId: string;
  index: number;
  total: number;
  question: string;
  choices: string[];
  secondsLeft: number;
  /** Set after time is up: the right answer */
  answer: number | null;
};

// ——— Events: Happy Hour, treasure hunts, the Weekend Cup ———

export type WorldEventView = {
  id: "happy-hour" | "treasure" | "cup" | "battle-night";
  emoji: string;
  title: string;
  description: string;
  live: boolean;
  /** ISO time it starts (if upcoming) or ends (if live) */
  at: string;
};
export type CupStanding = { id: string; name: string; points: number; wins: number };
/** Battle Night: every day at a fixed time, the arena is free and battles pay double (see battleNight.ts) */
export const BATTLE_NIGHT = {
  name: "Battle Night",
  emoji: "🌪️",
  description: "Free arena entry, and double coins and XP from every battle. Everyone's there!",
} as const;
/**
 * AI residents: friendly cats who live in the Grid (marked AI), so it never feels empty. They wander,
 * greet newcomers, boop back and chat in speech bubbles. Their ids start with "res:".
 */
export const isResidentId = (id: string) => id.startsWith("res:");
export type EventsView = {
  events: WorldEventView[];
  /** Coins earned are doubled right now */
  happyHour: boolean;
  cup: { live: boolean; standings: CupStanding[]; prizes: number[] };
};

/** Your view of the current treasure hunt */
export type HuntView = {
  active: boolean;
  endsIn: number;
  pot: number;
  mapPrice: number;
  hasMap: boolean;
  hint: string | null;
  mapHolders: number;
};

export type FxKind = "confetti" | "fireworks" | "finale";

// ——— Special abilities (one per character, key Q) ———

export type AbilityId =
  | "pounce"
  | "bellyflop"
  | "roar"
  | "blink"
  | "scan"
  | "boost"
  | "shadowstep"
  | "cannonball"
  | "flight"
  | "spook"
  | "sniff"
  | "shieldbash"
  | "bunnyhop"
  | "mudsplash"
  | "goodnose"
  | "frogleap"
  | "foxdash"
  | "bellyslide"
  | "hoot"
  | "rolypoly";

/**
 * What an ability actually does. Several characters share a mechanic under their own name:
 * leap (arc forward), teleport (jump forward instantly), boost (float up and speed up),
 * areaBoop (boops every kitty nearby), startle (startles players, freezes the runaway yarn),
 * scan (reveals hidden duty items on your radar).
 */
export type AbilityKind = "leap" | "teleport" | "boost" | "areaBoop" | "startle" | "scan";

export type AbilityDef = {
  id: AbilityId;
  kind: AbilityKind;
  name: string;
  emoji: string;
  description: string;
  cooldownMs: number;
  /** Forward leap/teleport distance */
  distance?: number;
  /** Effect radius around the user */
  radius?: number;
  /** How long the effect lasts */
  durationMs?: number;
};

export const ABILITIES: Record<AvatarStyle, AbilityDef> = {
  classic: { id: "pounce", kind: "leap", name: "Pounce", emoji: "🐾", description: "Leap forward in a big arc.", cooldownMs: 6_000, distance: 7 },
  chonk: { id: "bellyflop", kind: "areaBoop", name: "Belly Flop", emoji: "💥", description: "Slam the ground and boop every kitty nearby.", cooldownMs: 12_000, radius: 5 },
  lion: { id: "roar", kind: "startle", name: "Roar", emoji: "🦁", description: "Startle everyone nearby and freeze the runaway yarn.", cooldownMs: 15_000, radius: 14, durationMs: 2_500 },
  wizard: { id: "blink", kind: "teleport", name: "Blink", emoji: "✨", description: "Teleport forward in a puff of sparkles.", cooldownMs: 10_000, distance: 12 },
  robo: { id: "scan", kind: "scan", name: "Scan", emoji: "📡", description: "Reveal hidden fish and the lost kitten on your radar.", cooldownMs: 20_000, radius: 60, durationMs: 8_000 },
  astro: { id: "boost", kind: "boost", name: "Rocket Boost", emoji: "🚀", description: "Blast off: float up and fly faster.", cooldownMs: 14_000, durationMs: 3_000 },
  ninja: { id: "shadowstep", kind: "teleport", name: "Shadow Step", emoji: "💨", description: "Vanish in a puff of smoke and reappear a little way ahead.", cooldownMs: 7_000, distance: 9 },
  pirate: { id: "cannonball", kind: "leap", name: "Cannonball", emoji: "💣", description: "Fire yourself far ahead like a cannonball.", cooldownMs: 9_000, distance: 11 },
  dragon: { id: "flight", kind: "boost", name: "Take Flight", emoji: "🔥", description: "Spread your wings: lift off and fly faster for longer.", cooldownMs: 16_000, durationMs: 4_000 },
  ghost: { id: "spook", kind: "startle", name: "Boo", emoji: "👻", description: "Spook everyone nearby and freeze the runaway yarn.", cooldownMs: 13_000, radius: 11, durationMs: 2_500 },
  detective: { id: "sniff", kind: "scan", name: "Sniff Out", emoji: "🔍", description: "Follow your nose: hidden fish and the lost kitten show on your radar for longer.", cooldownMs: 24_000, radius: 60, durationMs: 11_000 },
  knight: { id: "shieldbash", kind: "areaBoop", name: "Shield Bash", emoji: "🛡️", description: "Bash the ground with your shield and boop every kitty nearby.", cooldownMs: 11_000, radius: 5 },
  rabbit: { id: "bunnyhop", kind: "leap", name: "Bunny Hop", emoji: "🐰", description: "A huge hop far ahead.", cooldownMs: 6_500, distance: 9 },
  pig: { id: "mudsplash", kind: "areaBoop", name: "Mud Splash", emoji: "💦", description: "Splash in the mud and boop every kitty nearby.", cooldownMs: 12_000, radius: 5 },
  dog: { id: "goodnose", kind: "scan", name: "Good Nose", emoji: "👃", description: "Follow your nose: hidden fish and the lost kitten show on your radar.", cooldownMs: 22_000, radius: 60, durationMs: 10_000 },
  frog: { id: "frogleap", kind: "leap", name: "Frog Leap", emoji: "🐸", description: "Spring far ahead on your strong back legs.", cooldownMs: 7_500, distance: 10 },
  fox: { id: "foxdash", kind: "teleport", name: "Fox Dash", emoji: "🦊", description: "Too quick to see: dash a little way ahead.", cooldownMs: 8_000, distance: 10 },
  penguin: { id: "bellyslide", kind: "boost", name: "Belly Slide", emoji: "🐧", description: "Flop onto your belly and slide along faster.", cooldownMs: 13_000, durationMs: 3_000 },
  owl: { id: "hoot", kind: "startle", name: "Hoot", emoji: "🦉", description: "A great hoot startles everyone nearby and freezes the runaway yarn.", cooldownMs: 14_000, radius: 12, durationMs: 2_500 },
  panda: { id: "rolypoly", kind: "leap", name: "Roly-Poly", emoji: "🐼", description: "Curl up and roll far ahead.", cooldownMs: 7_000, distance: 8 },
};

/** Looks up an ability by id (they're unique; ids arrive from the server) */
export function abilityById(id: AbilityId): AbilityDef | undefined {
  return Object.values(ABILITIES).find((a) => a.id === id);
}

/** Speed multiplier during Rocket Boost */
export const BOOST_SPEED = 1.6;

export type PlayerInfo = {
  id: string;
  login: string;
  name: string;
  avatarUrl: string;
  role: Role;
  score: number;
  /** null until the player picks a character (mentors always null) */
  look: AvatarLook | null;
  x: number;
  z: number;
  ry: number;
  /** Their tab is in the background or their phone is locked (players only) */
  away?: boolean;
  /** Trying the Grid without an account, for a few minutes */
  guest?: boolean;
  /** On the KittyHome team (an admin): like professionals, guests may boop them and chat when they start it */
  team?: boolean;
  /** Bought coins: a 💛 on their name tag */
  supporter?: SupporterTier;
  /** Days in a row they've come to the Grid (shown from 2) */
  streak?: number;
  /** The languages they speak and are learning (on their name tag, and to find people to practice with) */
  langs?: Languages;
};

// ——— Languages: what people speak, and what they're learning ———

/** CEFR levels, from first words to fluent */
export type LangLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export const LANG_LEVELS: { id: LangLevel; name: string }[] = [
  { id: "A1", name: "Beginner" },
  { id: "A2", name: "Elementary" },
  { id: "B1", name: "Intermediate" },
  { id: "B2", name: "Upper intermediate" },
  { id: "C1", name: "Advanced" },
  { id: "C2", name: "Near native" },
];
/** code: ISO 639-1; own: the language's name in itself */
export const LANGUAGES: { code: string; name: string; own: string }[] = [
  { code: "en", name: "English", own: "English" },
  { code: "es", name: "Spanish", own: "Español" },
  { code: "fr", name: "French", own: "Français" },
  { code: "de", name: "German", own: "Deutsch" },
  { code: "it", name: "Italian", own: "Italiano" },
  { code: "pt", name: "Portuguese", own: "Português" },
  { code: "nl", name: "Dutch", own: "Nederlands" },
  { code: "sv", name: "Swedish", own: "Svenska" },
  { code: "no", name: "Norwegian", own: "Norsk" },
  { code: "da", name: "Danish", own: "Dansk" },
  { code: "fi", name: "Finnish", own: "Suomi" },
  { code: "pl", name: "Polish", own: "Polski" },
  { code: "cs", name: "Czech", own: "Čeština" },
  { code: "ro", name: "Romanian", own: "Română" },
  { code: "hu", name: "Hungarian", own: "Magyar" },
  { code: "el", name: "Greek", own: "Ελληνικά" },
  { code: "uk", name: "Ukrainian", own: "Українська" },
  { code: "ru", name: "Russian", own: "Русский" },
  { code: "lv", name: "Latvian", own: "Latviešu" },
  { code: "lt", name: "Lithuanian", own: "Lietuvių" },
  { code: "et", name: "Estonian", own: "Eesti" },
  { code: "tr", name: "Turkish", own: "Türkçe" },
  { code: "ar", name: "Arabic", own: "العربية" },
  { code: "he", name: "Hebrew", own: "עברית" },
  { code: "fa", name: "Persian", own: "فارسی" },
  { code: "hi", name: "Hindi", own: "हिन्दी" },
  { code: "bn", name: "Bengali", own: "বাংলা" },
  { code: "ur", name: "Urdu", own: "اردو" },
  { code: "zh", name: "Chinese", own: "中文" },
  { code: "ja", name: "Japanese", own: "日本語" },
  { code: "ko", name: "Korean", own: "한국어" },
  { code: "vi", name: "Vietnamese", own: "Tiếng Việt" },
  { code: "th", name: "Thai", own: "ไทย" },
  { code: "id", name: "Indonesian", own: "Bahasa Indonesia" },
  { code: "ms", name: "Malay", own: "Bahasa Melayu" },
  { code: "tl", name: "Filipino", own: "Filipino" },
  { code: "sw", name: "Swahili", own: "Kiswahili" },
];
/** speaks: native or fluent; learning: with how far along they are */
export type Languages = { speaks: string[]; learning: { code: string; level: LangLevel }[] };
export const LANGS_MAX_SPEAKS = 4;
export const LANGS_MAX_LEARNING = 3;
export const languageOf = (code: string) => LANGUAGES.find((l) => l.code === code);

/** What a player sent, made safe: known languages, no repeats, within the limits (null: nothing left) */
export function cleanLanguages(raw: unknown): Languages | null {
  const known = new Set(LANGUAGES.map((l) => l.code));
  const levels = new Set<string>(LANG_LEVELS.map((l) => l.id));
  const r = (raw && typeof raw === "object" ? raw : {}) as { speaks?: unknown; learning?: unknown };
  const speaks = [...new Set((Array.isArray(r.speaks) ? r.speaks : []).filter((c): c is string => typeof c === "string" && known.has(c)))].slice(0, LANGS_MAX_SPEAKS);
  const learning: Languages["learning"] = [];
  for (const item of Array.isArray(r.learning) ? r.learning : []) {
    const { code, level } = (item && typeof item === "object" ? item : {}) as { code?: unknown; level?: unknown };
    if (typeof code !== "string" || !known.has(code) || speaks.includes(code) || learning.some((l) => l.code === code)) continue;
    learning.push({ code, level: typeof level === "string" && levels.has(level) ? (level as LangLevel) : "A1" });
    if (learning.length >= LANGS_MAX_LEARNING) break;
  }
  return speaks.length || learning.length ? { speaks, learning } : null;
}

/** They speak what you're learning, and are learning what you speak: a language exchange partner */
export function exchangeWith(me: Languages | undefined | null, them: Languages | undefined | null) {
  if (!me || !them) return null;
  const theyTeach = me.learning.find((l) => them.speaks.includes(l.code));
  const iTeach = them.learning.find((l) => me.speaks.includes(l.code));
  return theyTeach && iTeach ? { theyTeach: theyTeach.code, iTeach: iTeach.code } : null;
}

// ——— Reporting a player (in the Grid, or a private chat) ———

export type PlayerReportReason = "harassment" | "inappropriate" | "spam" | "scam" | "underage" | "other";
export const PLAYER_REPORT_REASONS: { id: PlayerReportReason; label: string; hint: string }[] = [
  { id: "harassment", label: "Harassment or bullying", hint: "Insults, threats, won't leave you alone" },
  { id: "inappropriate", label: "Sexual or inappropriate", hint: "Sexual talk, explicit or hateful content" },
  { id: "spam", label: "Spam or advertising", hint: "Flooding, links, selling things" },
  { id: "scam", label: "Scam or asking for money", hint: "Payments outside KittyHome, passwords, personal details" },
  { id: "underage", label: "Seems under 13", hint: "KittyHome is for 13 and up" },
  { id: "other", label: "Something else", hint: "Tell us below" },
];
export const PLAYER_REPORT_DETAIL_MAX = 500;

/** Helpbots in the Grid have ids "help:<question id>" */

// ——— Daily streaks: come to the Grid every day ———

/** Coins for day 1, 2, … 7 of a streak; then the week starts over (the count keeps going) */
export const STREAK_REWARDS = [50, 75, 100, 150, 200, 300, 500] as const;
export const streakReward = (count: number) => STREAK_REWARDS[(Math.max(1, count) - 1) % STREAK_REWARDS.length];
/** A freeze covers one missed day; bought with coins */
export const STREAK_FREEZE_PRICE = 300;
export const STREAK_FREEZE_MAX = 2;
export type StreakView = { count: number; best: number; freezes: number; /** Today already counted */ today: boolean };

// ——— Getting started: first things to try, for new members ———

export type QuestId = "look" | "hello" | "mentor" | "boop" | "puzzle" | "village" | "build";
export const QUESTS: { id: QuestId; emoji: string; title: string; hint: string }[] = [
  { id: "look", emoji: "🎨", title: "Pick your cat", hint: "Choose a character and color with the 🎨 button" },
  { id: "hello", emoji: "📣", title: "Say hi to the world", hint: "Press Enter and send a broadcast" },
  { id: "mentor", emoji: "🐱", title: "Chat with an AI mentor", hint: "Walk up to a gold cat (Mochi is in the plaza) and press T" },
  { id: "boop", emoji: "🐾", title: "Boop a kitty", hint: "Walk up to another cat and press B" },
  { id: "puzzle", emoji: "🧩", title: "Answer the daily puzzle", hint: "One brain teaser a day: tap it in Getting started" },
  { id: "village", emoji: "🏘️", title: "Visit someone's village", hint: "Open Villages from the 🐱 You menu" },
  { id: "build", emoji: "🏡", title: "Save your own village", hint: "My village → Build → Save" },
];
export const QUEST_REWARD = 100;
/** On top, for doing them all */
export const QUESTS_BONUS = 500;
/** New members see the quests for this many days */
export const QUEST_DAYS = 14;
export type QuestsView = { done: QuestId[] };
/** Going back to the plaza: how often (ms) */
export const PLAZA_WARP_COOLDOWN_MS = 3000;
/** Coins for finishing the Grid tour (once, members) */
export const TOUR_REWARD = 150;

// ——— Members: everyone, in the Grid or at home in their village ———

export type OwnerWhereabouts = {
  /** In the Grid right now */
  inGrid: boolean;
  /** When they last used KittyHome */
  lastVisitAt: string | null;
  supporter?: SupporterTier;
  /** Days in a row (from 2) */
  streak?: number;
};
export type MemberEntry = OwnerWhereabouts & {
  id: string;
  login: string;
  name: string;
  role: Role;
  score: number;
  look: AvatarLook | null;
  /** Their village's name (everyone has one, built or not) */
  village: string;
};
export type MemberList = {
  members: MemberEntry[];
  /** Members matching (all of them without a search) */
  total: number;
  /** In the Grid right now */
  inGrid: number;
  /** Pass as ?skip= for more; null at the end */
  next: number | null;
};

// ——— Coin history: where your coins came from and went ———

export type CoinCategory = "earned" | "bought" | "spent" | "refund";
export type CoinHistoryFilter = "all" | "earned" | "bought" | "spent";
export type CoinHistoryEntry = {
  id: string;
  at: string;
  /** Coins added (+) or taken (−) */
  delta: number;
  /** Coins after it */
  balance: number;
  icon: string;
  /** In words, e.g. "Day 3 of your streak", "Bought Party Hat" */
  label: string;
  category: CoinCategory;
  /** Admins only: the ledger's own reason code */
  reason?: string;
};
export type CoinHistory = {
  balance: number;
  /** All time: coins earned, bought (with bonuses), spent, and refunded */
  totals: { earned: number; bought: number; spent: number; refunds: number };
  entries: CoinHistoryEntry[];
  /** Pass as ?before= for the next page; null at the end */
  next: string | null;
  /** At the end of the full list: coins they had before their history began */
  opening?: { balance: number; at: string | null };
};


// ——— Inviting friends ———

/** Coins for you and your friend once they've settled in */
export const INVITE_REWARD = 1_000;
/** "Settled in": this many getting-started quests done */
export const INVITE_QUESTS = 3;
/** Paid invites per member in any 30 days (friends still get theirs) */
export const INVITE_MONTHLY_CAP = 10;
/**
 * Invites with real money: once a friend you invited has paid this much for coins in total, you're
 * owed a cash reward (paid by the KittyHome team by hand), once per friend.
 */
export const REFERRAL_CASH = { thresholdUsd: 50, rewardUsd: 10 };
/** Cash rewards are paid in USDT, to the address a member saves for it, on one of these networks */
export const USDT_NETWORKS = {
  TRC20: { name: "Tron (TRC20)", example: "T…  (34 characters)", pattern: /^T[1-9A-HJ-NP-Za-km-z]{33}$/ },
  BEP20: { name: "BNB Smart Chain (BEP20)", example: "0x… (42 characters)", pattern: /^0x[0-9a-fA-F]{40}$/ },
  ERC20: { name: "Ethereum (ERC20)", example: "0x… (42 characters)", pattern: /^0x[0-9a-fA-F]{40}$/ },
} as const;
export type UsdtNetwork = keyof typeof USDT_NETWORKS;
export type PayoutWallet = { network: UsdtNetwork; address: string };

export type InviteStatus = {
  link: string;
  /** Friends who joined with your link */
  joined: number;
  /** …and have settled in (you were both paid) */
  rewarded: number;
  /** Joined but not settled in yet: how far they've got */
  pending: { name: string; quests: number }[];
  /** Paid invites left in this 30 days */
  capLeft: number;
  /** Cash rewards (US dollars): owed to you, and already paid */
  cash: { owed: number; paid: number };
  /** Where your cash rewards go (USDT), if you've saved it */
  wallet: PayoutWallet | null;
};

export type Shout = {
  id: string;
  userId: string;
  login: string;
  name: string;
  role: Role;
  text: string;
  x: number;
  z: number;
  createdAt: string;
  /** Their name tag (the frame they wear) and supporter badge */
  frame?: string;
  supporter?: SupporterTier;
};

// ——— Daily duties ———

export const BOOP_RANGE = 4;
export type DutyId = "boop" | "fish" | "dash" | "yarn" | "kitten";

export type DutyView = {
  id: DutyId;
  emoji: string;
  title: string;
  description: string;
  points: number;
  progress: number;
  goal: number;
  done: boolean;
  /** Timed duties (dash, yarn) are started with dutyStart */
  startable: boolean;
  /** Hot/cold style hint, e.g. for the lost kitten */
  hint: string | null;
};

/** Objects only this player sees for their duties */
export type DutyEntity =
  | { kind: "fish"; id: string; x: number; z: number; rare?: boolean }
  | { kind: "chest"; id: string; x: number; z: number }
  | { kind: "beacon"; id: string; x: number; z: number; order: number; current: boolean }
  | { kind: "yarn"; id: string; x: number; z: number }
  | { kind: "kitten"; id: string; x: number; z: number; following: boolean }
  // The plaza games (on: it's on that player, wherever they are)
  | { kind: "bomb"; id: string; x: number; z: number; on?: string; /** 0–1: how close it is to popping */ hot: number }
  | { kind: "zone"; id: string; x: number; z: number; r: number }
  | { kind: "tile"; id: string; x: number; z: number; size: number; warn: boolean }
  | { kind: "line"; id: string; x: number; z: number; width: number; role: "start" | "finish" }
  | { kind: "watcher"; id: string; x: number; z: number; looking: boolean }
  | { kind: "prop"; id: string; x: number; z: number; shape: number; on?: string; mine?: boolean };

// ——— Private chat rooms between players (text and voice) ———

/** How close you must be to start a chat with someone new */
export const DM_RANGE = 8;
export const DM_MAX_LENGTH = 500;
/** How long a request to join someone's private chat waits for the owner */
export const KNOCK_TIMEOUT_MS = 60_000;

/**
 * A private chat. It starts between two players; anyone else who wants in has to be let in by the
 * owner (whoever started it). group: it has had three or more members, so its messages are kept
 * per room instead of per pair. voice: members in the room's voice call.
 */
export type RoomView = { id: string; ownerId: string; members: DmPeer[]; group: boolean; voice: string[] };

// ——— Voice ———

/** Nearby (public) voice: you hear people within this range, louder the closer they are */
export const HEAR_RANGE = 14;
/** Full volume within this distance */
export const HEAR_NEAR = 3;
/** What a voice pass is for: nearby voice in the world, or a private room's call */
export type VoiceScope = { scope: "public" } | { scope: "room"; roomId: string };

/** A private message: text, or an animated sticker (then text is "") */
export type DmMessage = { id: string; from: string; text: string; at: string; sticker?: string };

// ——— Stickers ———

/** "pack/name": public/stickers/<pack>/<name>.json in the Grid app */
export const STICKER_ID = /^[a-z0-9][a-z0-9-]{0,39}\/[a-z0-9][a-z0-9-]{0,39}$/;
/** A sticker sent to a mentor, written into the chat as [sticker:pack/name:😹] */
export const MENTOR_STICKER = /^\[sticker:([a-z0-9][a-z0-9-]{0,39}\/[a-z0-9][a-z0-9-]{0,39}):([^\]]{1,16})\]$/u;
export type DmPeer = { id: string; name: string; role: Role; look: AvatarLook | null };

/** [id, x, z, ry] — compact per-tick position update */
export type PositionUpdate = [string, number, number, number];

export type ServerToClient = {
  /** serverTime lets clients sync their clock for interpolation */
  welcome: (data: {
    self: PlayerInfo | null;
    players: PlayerInfo[];
    shouts: Shout[];
    npcs: NpcProfile[];
    serverTime: number;
    /** Voice chat is set up on this server */
    voice: boolean;
    /** You're a guest: how long your visit has left (ms) */
    guestMsLeft?: number;
    /** You asked to try as a guest but can't right now (and why); you're watching instead */
    guestRefused?: string;
    /** Your daily streak (members) */
    streak?: StreakView;
    /** Your getting-started quests (new members, until they're all done) */
    quests?: QuestsView | null;
  }) => void;
  /** Today's visit continued (or started) your streak */
  streak: (data: StreakView & { reward: number; freezeUsed: boolean }) => void;
  /** Someone's 🔥 on their name tag changed */
  streakBadge: (data: { id: string; streak: number }) => void;
  /** Someone changed the languages they speak or are learning (null: none) */
  langs: (data: { id: string; langs: Languages | null }) => void;
  /** You finished a getting-started quest */
  questDone: (data: QuestsView & { justDone: QuestId; reward: number; bonus: number }) => void;
  /** Someone's supporter badge changed */
  supporter: (data: { id: string; tier: SupporterTier }) => void;
  /** An admin made someone a professional (or a member again): their PRO badge, beam and green dot */
  role: (data: { id: string; role: "member" | "professional" }) => void;
  /** Your guest visit is over: your cat has left the world */
  guestOver: (data: { reason: string }) => void;
  joined: (player: PlayerInfo) => void;
  left: (data: { id: string }) => void;
  /** Positions of players who moved, stamped with server time (ms) */
  state: (snapshot: { t: number; p: PositionUpdate[] }) => void;
  /** Sent only to a player whose move was limited; seq is the move it applies to */
  correct: (data: { seq: number; x: number; z: number }) => void;
  /** The server put you somewhere (a plaza game starting, or sent back to its start): answer with placedOk */
  placed: (data: { x: number; z: number; ry: number }) => void;
  shout: (shout: Shout) => void;
  emote: (data: { id: string; emote: Emote }) => void;
  /** Someone played their signature emote (their own emoji, big) */
  sigEmote: (data: { id: string; emoji: string }) => void;
  /** Someone (an AI resident) says something in a speech bubble over their head */
  bubble: (data: { id: string; text: string }) => void;
  /** Someone switched away from the Grid, or came back */
  presence: (data: { id: string; away: boolean }) => void;
  kicked: (data: { reason: string }) => void;
  /** An admin removed a broadcast */
  shoutRemoved: (data: { id: string }) => void;
  /** A message from an admin to this player, e.g. that they were muted */
  modNotice: (data: { text: string }) => void;
  /** Coins the KittyHome team gave you (at: ISO time it was sent) */
  gift: (data: { amount: number; note: string; at: string }) => void;
  /** Today's duties for this player; run is the timed duty in progress */
  duties: (data: {
    date: string;
    duties: DutyView[];
    run: { dutyId: DutyId; secondsLeft: number; label: string } | null;
  }) => void;
  dutyEntities: (data: { entities: DutyEntity[] }) => void;
  /** A little celebration: progress (small) or a completed duty (big) */
  dutyToast: (data: { text: string; points: number | null; big: boolean }) => void;
  /** Someone booped someone; everyone sees it */
  booped: (data: { from: string; to: string }) => void;
  /** A player's score changed */
  score: (data: { id: string; score: number }) => void;
  /** A player picked a new character */
  look: (data: { id: string; look: AvatarLook }) => void;
  /** A private message in one of your rooms; peer is who sent it */
  dm: (data: { roomId: string; peer: DmPeer; message: DmMessage }) => void;
  /** A room you're in changed: someone joined or left, a new owner, or who's in the call */
  roomUpdate: (data: { room: RoomView; note?: string }) => void;
  /** A room you were in ended (fewer than two people left) */
  roomClosed: (data: { roomId: string; reason: string }) => void;
  /** To a room's owner: someone wants to join */
  roomKnock: (data: { requestId: string; roomId: string; from: DmPeer }) => void;
  /** To the one asking: the owner answered (or didn't in time) */
  roomKnockResult: (
    data:
      | { requestId: string; allowed: true; room: RoomView; history: DmMessage[] }
      | { requestId: string; allowed: false; reason: string },
  ) => void;
  /** Your voice permissions changed (e.g. an admin muted you) */
  voicePermission: (data: { canSpeak: boolean }) => void;
  /** Someone used their ability; x/z/ry is where they end up (leaps and teleports) */
  ability: (data: { id: string; ability: AbilityId; x: number; z: number; ry: number }) => void;
  /** Someone went back to the plaza (they vanish and appear there) */
  warped: (data: { id: string; x: number; z: number; ry: number }) => void;
  /** A mentor's reply, streamed in pieces to the player who asked */
  npcDelta: (data: { npcId: string; replyId: string; delta: string }) => void;
  /**
   * referTo: another mentor's id when the reply suggests them.
   * farewell: the learner said goodbye; the chat closes after this reply.
   */
  npcDone: (data: { npcId: string; replyId: string; text: string; referTo: string | null; farewell: boolean }) => void;
  /** Your coins and items changed */
  wallet: (data: Wallet) => void;
  /** The public arcade lobby changed (null: no lobby open) */
  arcade: (data: { lobby: ArcadeLobby | null }) => void;
  /** The game you're in: scores and time (null: you're not in one) */
  arcadeMatch: (data: { match: ArcadeMatch | null }) => void;
  arcadeResult: (data: ArcadeResult) => void;
  /** Objects of the game you're playing (fish, beacons) */
  arcadeEntities: (data: { entities: DutyEntity[] }) => void;
  trivia: (data: TriviaQuestion) => void;
  /** What's on: Happy Hour, treasure hunt, Weekend Cup */
  events: (data: EventsView) => void;
  hunt: (data: HuntView) => void;
  /** Objects of the treasure hunt (the chest, once you're close) */
  huntEntities: (data: { entities: DutyEntity[] }) => void;
  /** Big news for everyone, e.g. "Sam won Fish Frenzy!" */
  announce: (data: { text: string; emoji: string }) => void;
  /** Someone set off an effect everyone sees */
  fx: (data: { kind: FxKind; id: string; name: string; x: number; z: number }) => void;
  /** The featured spots changed (a board went up or came down) */
  villagePromos: (data: { promos: VillagePromo[] }) => void;
};

export type ClientToServer = {
  move: (data: { seq: number; x: number; z: number; ry: number }) => void;
  /** Back after a long time away: send everything again, as on joining (welcome, wallet, duties…) */
  resync: () => void;
  shout: (data: { text: string }, ack: (result: { ok: true } | { ok: false; error: string }) => void) => void;
  emote: (data: { emote: Emote }) => void;
  /** The signature emote (owners only): choose its emoji, and play it */
  setSignature: (data: { emoji: string }, ack: (result: { ok: true; wallet: Wallet } | { ok: false; error: string }) => void) => void;
  sigEmote: () => void;
  /** Your tab went to the background (away) or came back */
  presence: (data: { away: boolean }) => void;
  /**
   * Opens a chat. greetingReplyId: the mentor greets you from memory (streamed); null means use
   * the profile greeting. returning: the mentor has met you before.
   */
  npcOpen: (
    data: { npcId: string },
    ack: (
      result:
        | { ok: true; greetingReplyId: string | null; returning: boolean; history: NpcHistoryItem[] }
        // (join: a guest asking for something that needs an account; show the join prompt)
        | { ok: false; error: string; join?: boolean },
    ) => void,
  ) => void;
  /** Closing a chat turns it into the mentor's memories */
  npcClose: (data: { npcId: string }) => void;
  dutyStart: (data: { dutyId: DutyId }, ack: (result: { ok: true } | { ok: false; error: string }) => void) => void;
  boop: (data: { targetId: string }, ack: (result: { ok: true } | { ok: false; error: string }) => void) => void;
  setLook: (data: AvatarLook, ack: (result: { ok: true } | { ok: false; error: string }) => void) => void;
  /**
   * Opens a private chat with someone: needs to be close the first time, afterwards any time
   * you're both online. If they're in a private chat you're not part of, you knock instead and the
   * owner decides (the answer arrives as roomKnockResult).
   */
  dmOpen: (
    data: { peerId: string },
    ack: (
      result:
        | { ok: true; room: RoomView; history: DmMessage[] }
        | { ok: true; knocking: { requestId: string; roomId: string; ownerName: string } }
        | { ok: false; error: string },
    ) => void,
  ) => void;
  /** Send text, or a sticker id instead */
  dmSend: (
    data: { roomId: string; text?: string; sticker?: string },
    ack: (result: { ok: true; message: DmMessage } | { ok: false; error: string }) => void,
  ) => void;
  /** Which room's chat you have open (null when you close it); others knock on the one you're in */
  roomFocus: (data: { roomId: string | null }) => void;
  /** Leave a group chat for good */
  roomLeave: (data: { roomId: string }) => void;
  /** The owner lets someone in, or not */
  roomAnswer: (
    data: { requestId: string; allow: boolean },
    ack: (result: { ok: true } | { ok: false; error: string }) => void,
  ) => void;
  /** Stop knocking */
  knockCancel: (data: { requestId: string }) => void;
  /** A pass for the voice server (LiveKit) */
  voiceToken: (
    data: VoiceScope,
    ack: (result: { ok: true; url: string; token: string; canSpeak: boolean } | { ok: false; error: string }) => void,
  ) => void;
  /** Which room's call you're in (null when you hang up), so members see who's in it */
  voiceCall: (data: { roomId: string | null }) => void;
  /** Stops a player from messaging you */
  dmBlock: (data: { peerId: string }, ack: (result: { ok: true } | { ok: false; error: string }) => void) => void;
  /** The languages you speak and are learning (saved for members; a guest's last for the visit) */
  setLanguages: (
    data: { langs: Languages | null },
    ack: (result: { ok: true; langs: Languages | null } | { ok: false; error: string; join?: true }) => void,
  ) => void;
  /**
   * Report a player to the moderators. roomId: the private chat it happened in (its last messages go
   * with the report); block: also stop them messaging you (members only).
   */
  report: (
    data: { targetId: string; reason: PlayerReportReason; detail?: string; roomId?: string; block?: boolean },
    ack: (result: { ok: true; blocked: boolean } | { ok: false; error: string }) => void,
  ) => void;
  /** seq: the last move sent before using it, so older in-flight moves are ignored after a leap */
  /** Back to the plaza from anywhere; seq is your last move (moves up to it are ignored) */
  toPlaza: (
    data: { seq: number },
    ack: (result: { ok: true; x: number; z: number; ry: number } | { ok: false; error: string; retryInMs?: number }) => void,
  ) => void;
  ability: (
    data: { seq: number },
    ack: (result: { ok: true } | { ok: false; error: string; retryInMs?: number }) => void,
  ) => void;
  npcSay: (
    data: { npcId: string; text: string },
    ack: (result: { ok: true; replyId: string } | { ok: false; error: string; join?: boolean }) => void,
  ) => void;
  /** A joke you haven't seen: a crowd favorite if there's one left, otherwise a new one */
  jokeNext: (data: Record<string, never>, ack: (result: { ok: true; joke: Joke } | { ok: false; error: string }) => void) => void;
  /** 👍 (1), 👎 (-1), or take your vote back (0) */
  jokeVote: (
    data: { jokeId: string; vote: JokeVote },
    ack: (result: { ok: true; up: number; down: number } | { ok: false; error: string }) => void,
  ) => void;
  /** Three short, funny reply ideas for the chat you have open */
  chatSuggest: (
    data: SuggestFor,
    ack: (result: { ok: true; suggestions: string[] } | { ok: false; error: string }) => void,
  ) => void;
  /** Buy an item with coins */
  shopBuy: (data: { itemId: string }, ack: (result: { ok: true; wallet: Wallet } | { ok: false; error: string }) => void) => void;
  /** Battle items for the arena: 1 or a pack of 5 */
  kitBuy: (data: { item: BattleItemId; qty: number }, ack: (result: { ok: true; wallet: Wallet } | { ok: false; error: string }) => void) => void;
  /** Wear an item you own (itemId null: take it off) */
  equip: (data: { slot: GearSlot; itemId: string | null }, ack: (result: { ok: true } | { ok: false; error: string }) => void) => void;
  /** Set off an effect (confetti, fireworks); paid when used */
  useFx: (data: { itemId: string }, ack: (result: { ok: true; wallet: Wallet } | { ok: false; error: string }) => void) => void;
  /** Join the public lobby (pays the entry fee), or start a free practice run just for you */
  arcadeJoin: (
    data: { game: GameId; practice: boolean },
    ack: (result: { ok: true } | { ok: false; error: string }) => void,
  ) => void;
  /** Leave the lobby (fee refunded) or quit a game (no refund) */
  arcadeLeave: (data: Record<string, never>) => void;
  /** You're where the server put you: seq is your last move before that (earlier ones are ignored) */
  placedOk: (data: { seq: number }) => void;
  triviaAnswer: (
    data: { matchId: string; index: number; choice: number },
    ack: (result: { ok: true; correct: boolean; points: number } | { ok: false; error: string }) => void,
  ) => void;
  /** Buy a map for the current treasure hunt */
  huntBuyMap: (data: Record<string, never>, ack: (result: { ok: true; wallet: Wallet } | { ok: false; error: string }) => void) => void;
};

// ——— Villages: every member's own little 3D place (fun.kittyhome.org/v/<login>) ———
//
// A village is a square plot of tiles with objects on it. Basic objects show who you are (house,
// bio signpost, guestbook mailbox); content objects hold text, links and images; decorations are
// bought with coins. In the world an object only shows a short label: the full content opens in a
// panel when you walk up to it, so long text is never drawn in 3D.

/** World units per tile */
export const VILLAGE_TILE = 2;

/** Plot sizes, smallest first: tiles per side, what unlocking costs, and how many objects fit */
export const VILLAGE_SIZES = [
  { tiles: 14, price: 0, maxObjects: 70, label: "Cottage plot" },
  { tiles: 20, price: 1_500, maxObjects: 140, label: "Garden plot" },
  { tiles: 28, price: 5_000, maxObjects: 240, label: "Estate" },
] as const;

export const VILLAGE_THEMES = {
  meadow: { label: "Meadow", ground: 0x16351f, grid: 0x34d399, accent: 0x86efac },
  desert: { label: "Desert", ground: 0x3b2a17, grid: 0xfbbf24, accent: 0xfde68a },
  snow: { label: "Snowfield", ground: 0x1e293b, grid: 0xe0f2fe, accent: 0xbae6fd },
  night: { label: "Night market", ground: 0x1a1033, grid: 0xa78bfa, accent: 0xf0abfc },
} as const;
export type VillageTheme = keyof typeof VILLAGE_THEMES;

export const VILLAGE_LIMITS = {
  name: 40,
  title: 80,
  bio: 600,
  tags: 6,
  tag: 20,
  /** Content objects (boards, frames, stalls, banners, link posts) per village */
  contentObjects: 24,
  objectTitle: 60,
  boardText: 4000,
  stallText: 600,
  caption: 300,
  bannerText: 32,
  links: 6,
  linkLabel: 40,
  url: 300,
  message: 300,
  /** Images per village, each up to imageBytes (the Grid shrinks them before uploading) */
  images: 30,
  imageBytes: 1_500_000,
} as const;

export type VillageCategory = "basic" | "content" | "decor";

export const VILLAGE_ITEMS = {
  // Everyone has these, once each (they can be moved, not removed)
  signpost: { name: "About me", emoji: "🪧", category: "basic", price: 0, description: "Your bio and tags." },
  mailbox: { name: "Guestbook", emoji: "📮", category: "basic", price: 0, description: "Visitors leave you messages here." },
  // Content: free to place (up to VILLAGE_LIMITS.contentObjects)
  board: { name: "Notice board", emoji: "📜", category: "content", price: 0, description: "A title and long text." },
  frame: { name: "Photo frame", emoji: "🖼️", category: "content", price: 0, description: "An image with a caption." },
  stall: { name: "Project stall", emoji: "🛠️", category: "content", price: 0, description: "A project: text, a link and an image." },
  links: { name: "Link post", emoji: "🔗", category: "content", price: 0, description: "Up to six links." },
  banner: { name: "Banner", emoji: "🎏", category: "content", price: 0, description: "A short line shown in the world." },
  // Decorations: bought with coins, then placed (moving or removing one keeps it)
  path: { name: "Path tile", emoji: "🟫", category: "decor", price: 3, description: "Lay out walkways." },
  fence: { name: "Fence", emoji: "🚧", category: "decor", price: 5, description: "Mark out your garden." },
  bush: { name: "Bush", emoji: "🌿", category: "decor", price: 10, description: "A little green." },
  rock: { name: "Rock", emoji: "🪨", category: "decor", price: 10, description: "Solid. Dependable." },
  flowers: { name: "Flowers", emoji: "🌷", category: "decor", price: 15, description: "A splash of color." },
  tree: { name: "Tree", emoji: "🌳", category: "decor", price: 25, description: "Shade for napping cats." },
  pine: { name: "Pine", emoji: "🌲", category: "decor", price: 25, description: "Evergreen." },
  lamp: { name: "Lamp post", emoji: "🏮", category: "decor", price: 30, description: "Lights up at night." },
  bench: { name: "Bench", emoji: "🪑", category: "decor", price: 40, description: "Sit a while." },
  campfire: { name: "Campfire", emoji: "🔥", category: "decor", price: 100, description: "Gather round." },
  pond: { name: "Pond", emoji: "🐟", category: "decor", price: 300, description: "With fish, of course." },
  arch: { name: "Flower arch", emoji: "🌸", category: "decor", price: 450, description: "A grand entrance." },
  fountain: { name: "Fountain", emoji: "⛲", category: "decor", price: 600, description: "The town square centerpiece." },
  statue: { name: "Cat statue", emoji: "🗿", category: "decor", price: 900, description: "A monument to you." },
  windmill: { name: "Windmill", emoji: "🌬️", category: "decor", price: 2_500, description: "Its sails turn in the breeze." },
  treehouse: { name: "Treehouse", emoji: "🛖", category: "decor", price: 4_000, description: "A hideout up in the branches." },
  balloon: { name: "Hot-air balloon", emoji: "🎈", category: "decor", price: 6_000, description: "Floats gently above your village." },
  observatory: { name: "Observatory", emoji: "🔭", category: "decor", price: 8_000, description: "A dome with a telescope that turns to the stars." },
  dragon: { name: "Dragon statue", emoji: "🐉", category: "decor", price: 60_000, description: "Mythic: a great dragon that slowly beats its wings." },
  island: { name: "Floating island", emoji: "🏝️", category: "decor", price: 100_000, description: "Mythic: a piece of land floating in the air, with its own tree and waterfall." },
  palace: { name: "Crystal palace", emoji: "💠", category: "decor", price: 200_000, description: "Mythic: spires of glowing crystal. The rarest thing a village can have." },
  castle: { name: "Castle", emoji: "🏰", category: "decor", price: 40_000, description: "Mythic: towers, flags and a glowing gate. Few villages have one." },
  lighthouse: { name: "Lighthouse", emoji: "🗼", category: "decor", price: 40_000, description: "Mythic: a tall lighthouse whose beam sweeps the whole village." },
  monument: { name: "Golden Paw Monument", emoji: "🏆", category: "decor", price: 0, description: "For KittyHome's village patrons ($75+ in coins)." },
  butterflies: { name: "Butterflies", emoji: "🦋", category: "decor", price: 35, description: "A flutter of color." },
  // Play: things visitors can do something with (bought like decorations)
  bounce: { name: "Bounce pad", emoji: "🤸", category: "decor", price: 150, description: "Boing! Whoever steps on it flies." },
  portal: { name: "Portal", emoji: "🌀", category: "decor", price: 400, description: "Step in, pop out at your next portal." },
  jukebox: { name: "Jukebox", emoji: "📻", category: "decor", price: 250, description: "Plays a tune when someone's near." },
  fireworks: { name: "Fireworks", emoji: "🎆", category: "decor", price: 300, description: "Visitors light a show for everyone here." },
  yarn: { name: "Hidden yarn", emoji: "🧶", category: "decor", price: 20, description: "Hide a few; visitors hunt for them all." },
} as const;
export type VillageKind = keyof typeof VILLAGE_ITEMS;
export const VILLAGE_KINDS = Object.keys(VILLAGE_ITEMS) as VillageKind[];
export type DecorKind = { [K in VillageKind]: (typeof VILLAGE_ITEMS)[K]["category"] extends "decor" ? K : never }[VillageKind];
export const DECOR_KINDS = VILLAGE_KINDS.filter((k) => VILLAGE_ITEMS[k].category === "decor") as DecorKind[];
export const BASIC_KINDS = ["signpost", "mailbox"] as const;
/** Decorations you can't buy: supporters get them (see SUPPORTER_TIERS) */
export const SUPPORTER_DECOR = ["monument"] as const satisfies readonly DecorKind[];
/** Bought items visitors play with (their own tab in the editor) */
export const PLAY_KINDS = ["bounce", "portal", "jukebox", "fireworks", "yarn"] as const satisfies readonly DecorKind[];
/** Sizes an object can be made (tile-sized things and the basics stay 1×) */
export const VILLAGE_SCALES = [1, 1.5, 2, 3] as const;
export const isScalable = (kind: VillageKind) => !["signpost", "mailbox", "path", "fence"].includes(kind);

/**
 * Upgrades: everything in a village can be made brighter, a kind at a time (all your trees, all
 * your benches…). Each level also opens colors.
 */
export type VillageLevel = 1 | 2 | 3;
export const VILLAGE_LEVELS: { level: VillageLevel; name: string; emoji: string; note: string }[] = [
  { level: 1, name: "Classic", emoji: "", note: "As it comes." },
  { level: 2, name: "Bright", emoji: "✨", note: "It glows, on a pool of light. Six colors open." },
  { level: 3, name: "Radiant", emoji: "🌟", note: "Sparkles drift around it and a ring of light turns under it. Six more colors open, a rainbow among them." },
];
/** The level each kind has been upgraded to (kinds not in it are at 1) */
export type VillageUpgrades = Partial<Record<VillageKind, 2 | 3>>;
/** Coins to take a kind to level 2 or 3 (for all of them you have, now and later), from what one of them costs */
export function upgradePrice(kind: VillageKind, level: 2 | 3) {
  const price: number = VILLAGE_ITEMS[kind].price;
  const [times, low, high] = level === 2 ? [2, 200, 8_000] : [5, 600, 25_000];
  return Math.min(high, Math.max(low, Math.round((price * times) / 50) * 50));
}
/** Colors an upgraded object can be made (its main color changes); `level` is the one that opens it */
export const VILLAGE_TINTS = [
  { id: "sky", name: "Sky", color: "#38bdf8", level: 2 },
  { id: "pink", name: "Pink", color: "#f472b6", level: 2 },
  { id: "gold", name: "Gold", color: "#fbbf24", level: 2 },
  { id: "mint", name: "Mint", color: "#34d399", level: 2 },
  { id: "violet", name: "Violet", color: "#a78bfa", level: 2 },
  { id: "coral", name: "Coral", color: "#fb7185", level: 2 },
  { id: "snow", name: "Snow", color: "#f8fafc", level: 3 },
  { id: "ruby", name: "Ruby", color: "#ef4444", level: 3 },
  { id: "aqua", name: "Aqua", color: "#22d3ee", level: 3 },
  { id: "lime", name: "Lime", color: "#a3e635", level: 3 },
  { id: "sunset", name: "Sunset", color: "#fb923c", level: 3 },
  // (cycles through every color)
  { id: "rainbow", name: "Rainbow", color: "#e879f9", level: 3 },
] as const;
export type VillageTint = (typeof VILLAGE_TINTS)[number]["id"];
export const VILLAGE_TINT_BY_ID = new Map<string, (typeof VILLAGE_TINTS)[number]>(VILLAGE_TINTS.map((t) => [t.id, t]));
/** The level an object is drawn at: its kind's, unless it's been set to an earlier one */
export function levelOf(obj: { kind: VillageKind; level?: number }, upgrades: VillageUpgrades | undefined): VillageLevel {
  const unlocked = upgrades?.[obj.kind] ?? 1;
  const own = Number.isInteger(obj.level) && obj.level! >= 1 ? obj.level! : unlocked;
  return Math.min(own, unlocked) as VillageLevel;
}
/** The color an object is in (null: its own), given the level it's drawn at */
export const tintOf = (obj: { tint?: string }, level: VillageLevel) => {
  const tint = obj.tint ? VILLAGE_TINT_BY_ID.get(obj.tint) : undefined;
  return tint && tint.level <= level ? tint : null;
};

/** Melodies a jukebox can play */
export const VILLAGE_TUNES = ["Lullaby", "Hop along", "Mystery", "Fanfare"] as const;

/** Weather-like effects over the whole village: unlocked once with coins, then picked freely */
export const VILLAGE_AMBIENCES = {
  none: { label: "Clear", emoji: "🌤️", price: 0 },
  fireflies: { label: "Fireflies", emoji: "✨", price: 200 },
  petals: { label: "Cherry petals", emoji: "🌸", price: 200 },
  snow: { label: "Snowfall", emoji: "❄️", price: 200 },
  stardust: { label: "Stardust", emoji: "🌟", price: 300 },
  bubbles: { label: "Bubbles", emoji: "🫧", price: 300 },
} as const;
export type VillageAmbience = keyof typeof VILLAGE_AMBIENCES;
/** The sky: follow the visitor's clock, or always one time of day */
export const VILLAGE_SKIES = { live: "Real time", day: "Always day", sunset: "Golden hour", night: "Starry night" } as const;
export type VillageSky = keyof typeof VILLAGE_SKIES;

// ——— Featured villages: promo boards along the edges of the Grid ———
//
// The world's boundary is lined with featured cells, one per grid square along the fence (a world
// N cells across has 4N − 4). A promo board takes 1 to PROMO_MAX_CELLS cells: its width runs along
// the fence, its height goes up. When there's no free stretch wide enough, bookings wait in a queue
// (first come, first served). Priced per cell per day. A featured village also shows first in search.

/** One featured cell is a grid square this many world units across */
export const PROMO_CELL_SIZE = 4;
/** Cells along one side of the world */
export const PROMO_SIDE_CELLS = (WORLD_HALF_SIZE * 2) / PROMO_CELL_SIZE;
/** Each edge owns the cells from its first corner up to (not including) the next corner */
export const PROMO_EDGE_CELLS = PROMO_SIDE_CELLS - 1;
/** Every featured cell around the world */
export const PROMO_TOTAL_CELLS = 4 * PROMO_EDGE_CELLS;
export const PROMO_MAX_CELLS = 5;
export const PROMO_MAX_DAYS = 7;
/** Coins per cell, per day */
export const PROMO_CELL_PRICE = 50;
/** Board shapes: [width, height] in cells, at most PROMO_MAX_CELLS */
export const PROMO_SHAPES = [
  [1, 1],
  [2, 1],
  [1, 2],
  [3, 1],
  [2, 2],
  [4, 1],
  [5, 1],
] as const;
export const promoPrice = (w: number, h: number, days: number) => w * h * days * PROMO_CELL_PRICE;

/** A promo board on the edge of the Grid; cell is the first of its w cells along the boundary */
export type VillagePromo = { id: string; cell: number; login: string; name: string; ownerName: string; imageId: string; w: number; h: number; endsAt: string };
/** Your booking, as you see it */
export type MyVillagePromo = {
  id: string;
  status: "queued" | "active";
  w: number;
  h: number;
  days: number;
  price: number;
  imageId: string;
  cell: number | null;
  /** Active: when it started and ends. Queued: your place in line and when it should start */
  startsAt: string | null;
  endsAt: string | null;
  position: number | null;
  estimatedStart: string | null;
};
/** How busy the featured cells are */
export type PromoStatus = {
  cells: number;
  used: number;
  /** Boards up */
  active: number;
  queued: number;
  /** The widest board that fits right now (0 to PROMO_MAX_CELLS) */
  freeRun: number;
  /** When the next board comes down, if any are up */
  nextFreeAt: string | null;
};

// ——— Cube building: color cubes stacked anywhere on the plot, like building blocks ———
//
// A cube is half a tile across (about half a cat tall). A build is a list of cubes, each with a
// position on the plot's cube grid and a color: one of the free colors, or a special cube unlocked
// once with coins. Visitors walk on builds: they climb one cube at a time and fall off edges.

/** Cubes per tile side */
export const CUBES_PER_TILE = 2;
/** A cube's size in world units */
export const CUBE_SIZE = VILLAGE_TILE / CUBES_PER_TILE;
/** How high a build goes, in cubes */
export const CUBE_MAX_HEIGHT = 24;
/** How many cubes each plot holds (in VILLAGE_SIZES order) */
export const CUBE_LIMITS = [1_500, 3_000, 6_000] as const;
/** The free colors, in palette order */
export const CUBE_COLORS = [
  0xf8fafc, 0x9ca3af, 0x4b5563, 0x1f2937, 0xef4444, 0xfb923c, 0xfacc15, 0xa3e635,
  0x22c55e, 0x2dd4bf, 0x38bdf8, 0x3b82f6, 0xa855f7, 0xf472b6, 0x92400e, 0xd6b88a,
] as const;
/** Special cubes, unlocked once with coins; their color numbers follow the free colors */
export const CUBE_SPECIALS = {
  glass: { label: "Glass", emoji: "🧊", price: 1_500, color: 0xa5f3fc, description: "See-through, for windows and ice." },
  glow: { label: "Glow", emoji: "💡", price: 2_500, color: 0xfde047, description: "Shines like a lamp, day and night." },
  lava: { label: "Lava", emoji: "🌋", price: 4_000, color: 0xff5a1f, description: "Glows and pulses like molten rock." },
  rainbow: { label: "Rainbow", emoji: "🌈", price: 6_000, color: 0xff6ad5, description: "Every color, always moving." },
} as const;
export type CubeSpecial = keyof typeof CUBE_SPECIALS;
export const CUBE_SPECIAL_KINDS = Object.keys(CUBE_SPECIALS) as CubeSpecial[];
export const CUBE_COLOR_COUNT = CUBE_COLORS.length + CUBE_SPECIAL_KINDS.length;
/** The special cube a color number stands for (null: a free color) */
export const cubeSpecial = (color: number): CubeSpecial | null => CUBE_SPECIAL_KINDS[color - CUBE_COLORS.length] ?? null;
export const specialColor = (kind: CubeSpecial) => CUBE_COLORS.length + CUBE_SPECIAL_KINDS.indexOf(kind);
/** Cube letters: how many characters at once */
export const CUBE_LETTERS_MAX = 12;

/** One cube: x and z across the plot's cube grid, y up from the ground, c its color number */
export type Cube = { x: number; y: number; z: number; c: number };
/** Cubes per side of a plot */
export const cubeSpan = (size: number) => VILLAGE_SIZES[size].tiles * CUBES_PER_TILE;
/** The way in through the gate stays clear (the cubes just inside it) */
export const isGateCube = (x: number, z: number, span: number) => Math.abs(x + 0.5 - span / 2) < 2 && z >= span - 2;

/** A build travels as base64: 4 bytes per cube (x, y, z, color) */
export function encodeCubes(cubes: Cube[]): string {
  let bytes = "";
  for (const c of cubes) bytes += String.fromCharCode(c.x, c.y, c.z, c.c);
  return btoa(bytes);
}

/** The cubes in a build (null: not a valid build) */
export function decodeCubes(text: string): Cube[] | null {
  let bytes: string;
  try {
    bytes = atob(text);
  } catch {
    return null;
  }
  if (bytes.length % 4) return null;
  const cubes: Cube[] = [];
  for (let i = 0; i < bytes.length; i += 4) cubes.push({ x: bytes.charCodeAt(i), y: bytes.charCodeAt(i + 1), z: bytes.charCodeAt(i + 2), c: bytes.charCodeAt(i + 3) });
  return cubes;
}

export type VillageLink = { label: string; url: string };
/** What a content object holds (only the fields for its kind are kept) */
export type VillageObjectData = {
  title?: string;
  text?: string;
  caption?: string;
  /** Uploaded image id (served at /villages/images/:id) */
  imageId?: string;
  url?: string;
  links?: VillageLink[];
  /** Jukebox: index into VILLAGE_TUNES */
  tune?: number;
};
/** rot: quarter turns */
export type VillageObject = {
  id: string;
  kind: VillageKind;
  x: number;
  z: number;
  rot: 0 | 1 | 2 | 3;
  /** One of VILLAGE_SCALES (1 when missing) */
  scale?: number;
  /** An earlier style than its kind is upgraded to (missing: its kind's level) */
  level?: VillageLevel;
  /** A color its level has opened (missing: its own) */
  tint?: VillageTint;
  data?: VillageObjectData;
};

export type VillageView = {
  login: string;
  ownerName: string;
  avatarUrl: string;
  ownerRole: Role;
  look: AvatarLook | null;
  name: string;
  title: string;
  bio: string;
  tags: string[];
  theme: VillageTheme;
  /** Index into VILLAGE_SIZES */
  size: number;
  objects: VillageObject[];
  /** The cube build (encodeCubes; empty: none) */
  cubes: string;
  ambience: VillageAmbience;
  sky: VillageSky;
  /** What each kind has been upgraded to (kinds not in it are Classic) */
  upgrades: VillageUpgrades;
  visits: number;
  messages: number;
  likes: number;
  /** You like this village (false when signed out) */
  liked: boolean;
  /** An AI mentor's village: the mentor stands outside their home */
  mentor?: VillageMentor;
  /** A member's village: whether they're out in the Grid (else they're at home here) */
  owner?: OwnerWhereabouts;
  featuredUntil: string | null;
  updatedAt: string;
};

/** The owner's extras: decorations bought, images uploaded */
export type VillageOwnerView = VillageView & {
  inventory: Partial<Record<DecorKind, number>>;
  images: { id: string; bytes: number }[];
  /** Sizes unlocked (indexes into VILLAGE_SIZES) */
  unlocked: number;
  /** Ambiences bought ("none" is always there) */
  ambiences: VillageAmbience[];
  /** Special cubes unlocked */
  cubeSpecials: CubeSpecial[];
  /** Your coins, to show what you can afford */
  coins: number;
};

/** The mentor living in a mentor village */
export type VillageMentor = { id: string; name: string; title: string; expertise: string[]; greeting: string; tips: string[] };
/** Mentor villages live at /v/<name>.ai (member logins never contain a dot) */
export const mentorVillageLogin = (npcId: string) => `${npcId.replace(/^npc:/, "")}.ai`;

export type VillageCard = {
  login: string;
  ownerName: string;
  ownerSupporter?: SupporterTier;
  ownerRole: Role;
  look: AvatarLook | null;
  name: string;
  title: string;
  tags: string[];
  theme: VillageTheme;
  visits: number;
  likes: number;
  featured: boolean;
  /** An AI mentor's village */
  mentor?: boolean;
};

export type VillageMessage = {
  id: string;
  fromLogin: string;
  fromName: string;
  text: string;
  at: string;
  /** The writer's name tag and supporter badge, as they are now */
  fromFrame?: string;
  fromSupporter?: SupporterTier;
};

/** A sponsor billboard (set up by admins): shown in villages and on the plaza's village board */
export type Billboard = { id: string; sponsor: string; title: string; text: string; url: string; imageId: string | null };

// ——— Live villages: see the other visitors (Socket.IO namespace "/village" on the world's path) ———

export type Villager = { id: string; login: string; name: string; look: AvatarLook | null; x: number; z: number; ry: number };
export type VillageFxKind = "fireworks" | "confetti" | "portal";
export const VILLAGE_LIVE_MAX = 40;

export type VillageLiveClient = {
  /** Enter a village; signed-out visitors only watch (selfId null) */
  vJoin: (
    data: { login: string; x: number; z: number; ry: number },
    ack: (result: { ok: true; selfId: string | null; villagers: Villager[] } | { ok: false; error: string }) => void,
  ) => void;
  vMove: (data: { x: number; z: number; ry: number }) => void;
  vEmote: (data: { emote: Emote }) => void;
  vFx: (data: { kind: VillageFxKind; x: number; z: number }) => void;
};

export type VillageLiveServer = {
  vJoined: (villager: Villager) => void;
  vLeft: (data: { id: string }) => void;
  vMoved: (data: { id: string; x: number; z: number; ry: number }) => void;
  vEmoted: (data: { id: string; emote: Emote }) => void;
  vFx: (data: { id: string; kind: VillageFxKind; x: number; z: number }) => void;
  /** A coin gift (from the team or a promo code), shown wherever you are */
  gift: (data: { amount: number; note: string; at: string }) => void;
  /** A short note for you, e.g. someone signed your guestbook */
  vToast: (data: { text: string }) => void;
};

// ——— Buying coins (CryptumPay: pay with crypto) ———

/** 1,000 coins for $1 */
export const COINS_PER_USD = 1000;
export type CoinPack = { id: string; coins: number; usd: string; tag?: string };
/** Once per member: a cheaper way in, with an item you can't get otherwise */
export const STARTER_PACK = { id: "starter", coins: 3_000, usd: "2.99", itemId: "frame-starter" } as const;
/** Your first regular pack comes with this much extra (0.5 = +50%), up to FIRST_PURCHASE_BONUS_MAX */
export const FIRST_PURCHASE_BONUS = 0.5;
export const FIRST_PURCHASE_BONUS_MAX = 30_000;
export const firstPurchaseBonus = (coins: number) => Math.min(FIRST_PURCHASE_BONUS_MAX, Math.floor(coins * FIRST_PURCHASE_BONUS));
// (bigger packs come with more extra: +5% up to +25%)
export const COIN_PACKS: CoinPack[] = [
  { id: "coins-1k", coins: 1_000, usd: "1.00" },
  { id: "coins-5k", coins: 5_000, usd: "5.00", tag: "Popular" },
  { id: "coins-10k", coins: 10_500, usd: "10.00", tag: "+5% extra" },
  { id: "coins-25k", coins: 27_500, usd: "25.00", tag: "+10% extra" },
  { id: "coins-50k", coins: 57_500, usd: "50.00", tag: "+15% extra" },
  { id: "coins-100k", coins: 120_000, usd: "100.00", tag: "+20% extra" },
  { id: "coins-200k", coins: 250_000, usd: "200.00", tag: "+25% · best value" },
];

export type CoinPurchaseStatus = "pending" | "paid" | "canceled" | "expired" | "refunded";
/** How coins are paid for: by card (Stripe: cards, Apple Pay, Google Pay…) or with crypto (CryptumPay) */
export type CoinPaymentMethod = "card" | "crypto";

// ——— Supporters: everyone who buys coins gets rewards as their total grows ———

export type SupporterTier = "supporter" | "backer" | "founder" | "patron" | "mentor";
export type SupporterLevel = { id: SupporterTier; usd: number; name: string; emoji: string; perks: string[] };
export const SUPPORTER_TIERS: SupporterLevel[] = [
  { id: "supporter", usd: 5, name: "Supporter", emoji: "💛", perks: ["A 💛 badge next to your name, over your cat and in chats"] },
  { id: "backer", usd: 15, name: "Backer", emoji: "👑", perks: ["The Supporter Hat (never sold in the shop)"] },
  { id: "founder", usd: 35, name: "Founder", emoji: "🌟", perks: ["The Founder name tag (never sold)"] },
  { id: "patron", usd: 75, name: "Village Patron", emoji: "🏆", perks: ["The Golden Paw Monument for your village"] },
  { id: "mentor", usd: 250, name: "Mentor Circle", emoji: "🎓", perks: ["A 30-minute call with the KittyHome team: feedback on your project, advice or just a chat"] },
];
export const supporterLevel = (tier: SupporterTier | null | undefined) => SUPPORTER_TIERS.find((t) => t.id === tier) ?? null;
/** The tier a total (in US cents) reaches, or null under the first one */
export function supporterTierFor(cents: number): SupporterLevel | null {
  return [...SUPPORTER_TIERS].reverse().find((t) => cents >= t.usd * 100) ?? null;
}
/** How much you've bought and what's next (for the shop) */
export type SupporterStatus = {
  cents: number;
  tier: SupporterTier | null;
  /** No coins bought yet: the next regular pack comes with the first-purchase bonus */
  firstPurchase: boolean;
  /** The starter pack is once per member */
  starterBought: boolean;
};
/** A purchase as its buyer sees it */
export type CoinPurchase = {
  orderId: string;
  packId: string;
  coins: number;
  usd: string;
  status: CoinPurchaseStatus;
  createdAt: string;
  paidAt: string | null;
  /** Extra coins from the first-purchase bonus */
  bonus: number;
  method: CoinPaymentMethod;
};

// ——— The Battle Arena: team battles behind the magic gateway near the plaza ———

/** Coins for an arena pass and how long it lasts (one pass covers every game) */
export const ARENA_FEE = 50;
export const ARENA_PASS_MINUTES = 30;
/** People in one game's room at most (Sky Brawl takes more: ARENA_GAMES.brawl.maxPlayers) */
export const ARENA_MAX_PLAYERS = 16;
/** The most AI players the game admin can bring in */
export const ARENA_MAX_BOTS = 12;
/**
 * The game admin: whoever has been in that game's room longest (it passes on when they leave). They
 * choose how many AI players there are (wanted; null: automatic, enough to make a battle).
 */
export type ArenaHost = { hostId: string | null; bots: number; wanted: number | null; level: ArenaBotLevel };
/** How good the AI players are: the game admin's choice (a room starts on Normal) */
export type ArenaBotLevel = "easy" | "normal" | "hard";
export const ARENA_BOT_LEVELS: { id: ArenaBotLevel; name: string; note: string }[] = [
  { id: "easy", name: "Easy", note: "Slow to react, they miss a lot, hit softly and come at you one at a time" },
  { id: "normal", name: "Normal", note: "A fair fight: they take a moment to react, miss now and then and give you room to hit back" },
  { id: "hard", name: "Hard", note: "As fast and as sharp as they get" },
];
/** How fast yarn flies (units a second): aiming leads a moving target by it */
export const ARENA_YARN_SPEED = 30;
/** Where the gateway stands in the Grid (near the plaza) */
export const ARENA_GATE = { x: 14, z: -14 };
/** How close you need to be to step through */
export const ARENA_GATE_RANGE = 4.5;

export type ArenaTeam = "red" | "blue";
/**
 * The arena's games. Each one has its own room that always plays it (no rotation): you choose which
 * to join, can switch any time, and drop in mid-round.
 */
export type ArenaGame = "blaster" | "summit" | "brawl";
export const ARENA_GAME_LIST: ArenaGame[] = ["brawl", "blaster", "summit"];
export const ARENA_GAMES: Record<ArenaGame, { name: string; emoji: string; seconds: number; how: string; tagline: string; maxPlayers: number; color: string; badge?: string }> = {
  blaster: {
    name: "Paw Blaster",
    emoji: "🧶",
    seconds: 120,
    how: "F or click throws yarn, Space jumps over it, Q is your character's power. 3 hits knock a cat out. Most knockouts wins.",
    tagline: "A colosseum shoot-out: dodge, take cover, three hits and they're out.",
    maxPlayers: ARENA_MAX_PLAYERS,
    color: "#f472b6",
  },
  summit: {
    name: "Summit Rush",
    emoji: "🏙️",
    seconds: 120,
    how: "E picks up what's near: a flowerpot, a brick, even a cat (theirs or yours). Click/F throws it. Throw the other team off the rooftops to score. Being carried? Mash Space to break free. Space twice is a double jump, for the higher roofs. Q is your power, G your spell.",
    tagline: "A rooftop tussle: grab things, grab cats, and throw the other team off the roofs.",
    maxPlayers: ARENA_MAX_PLAYERS,
    color: "#34d399",
  },
  brawl: {
    name: "Sky Brawl",
    emoji: "🌪️",
    seconds: 180,
    how: "Click/F claws (a 3-hit combo, the last one launches), Q is your power, E dashes, R unleashes your ultimate, T locks onto an enemy (🎯 Target Lock). Every hit raises damage %: the higher it is, the further you fly. Launch enemies off the island to score!",
    tagline: "A floating island, up to 24 cats, meteors, lightning and ultimates. Knock them into the sky!",
    maxPlayers: 24,
    color: "#38bdf8",
    badge: "NEW",
  },
};
export const ARENA_TEAMS: Record<ArenaTeam, { name: string; color: number; css: string }> = {
  red: { name: "Red", color: 0xf87171, css: "#f87171" },
  blue: { name: "Blue", color: 0x60a5fa, css: "#60a5fa" },
};
/** What a round pays (as points and coins): every winner, the MVP on top, everyone in a draw */
export const ARENA_REWARD = { win: 15, mvp: 10, draw: 5 } as const;
export const BLASTER_HP = 3;

// The arena's map: a waiting hall in the middle, the blaster colosseum to the west, the rooftops to the
// east. Shared, so the page draws exactly what the server checks.
export const ARENA_LOBBY = { x: 0, z: 0, half: 12 };
export const BLASTER_PIT = { x: -64, z: 0, half: 30 };
export type CoverKind = "crate" | "pillar" | "wall";
/** Cover (relative to the pit's center): x, z, half width, half depth; mirrored, so both sides are fair */
export const BLASTER_COVER: { x: number; z: number; w: number; d: number; kind: CoverKind }[] = (() => {
  const half: { x: number; z: number; w: number; d: number; kind: CoverKind }[] = [
    { x: 8, z: 8, w: 1.4, d: 1.4, kind: "pillar" },
    { x: 8, z: -8, w: 1.4, d: 1.4, kind: "pillar" },
    { x: 14, z: 0, w: 1.2, d: 4.5, kind: "wall" },
    { x: 7, z: 16, w: 3.5, d: 1.1, kind: "crate" },
    { x: 7, z: -16, w: 3.5, d: 1.1, kind: "crate" },
    { x: 20, z: 10, w: 1.6, d: 3, kind: "crate" },
    { x: 20, z: -10, w: 1.6, d: 3, kind: "crate" },
    { x: 22, z: 22, w: 1.6, d: 1.6, kind: "pillar" },
    { x: 22, z: -22, w: 1.6, d: 1.6, kind: "pillar" },
    { x: 13, z: 24, w: 2.2, d: 1.2, kind: "crate" },
    { x: 13, z: -24, w: 2.2, d: 1.2, kind: "crate" },
  ];
  return [
    { x: 0, z: 0, w: 3, d: 3, kind: "crate" },
    { x: 0, z: 22, w: 5, d: 1.2, kind: "wall" },
    { x: 0, z: -22, w: 5, d: 1.2, kind: "wall" },
    { x: 0, z: 11, w: 1.2, d: 1.2, kind: "pillar" },
    { x: 0, z: -11, w: 1.2, d: 1.2, kind: "pillar" },
    ...half,
    ...half.map((c) => ({ ...c, x: -c.x })),
  ];
})();
/** Paw Blaster's second map, the Frozen Lake: open ice in the middle, ringed by pillars, with snow walls on the flanks */
export const ICE_COVER: typeof BLASTER_COVER = (() => {
  const half: typeof BLASTER_COVER = [
    { x: 9, z: 0, w: 1.3, d: 1.3, kind: "pillar" },
    { x: 6.5, z: 6.5, w: 1.2, d: 1.2, kind: "pillar" },
    { x: 6.5, z: -6.5, w: 1.2, d: 1.2, kind: "pillar" },
    { x: 15, z: 0, w: 1.2, d: 2.2, kind: "crate" },
    { x: 16, z: 10, w: 1.1, d: 3.5, kind: "wall" },
    { x: 16, z: -10, w: 1.1, d: 3.5, kind: "wall" },
    { x: 11, z: 19, w: 3, d: 1.2, kind: "crate" },
    { x: 11, z: -19, w: 3, d: 1.2, kind: "crate" },
    { x: 23, z: 20, w: 1.5, d: 1.5, kind: "pillar" },
    { x: 23, z: -20, w: 1.5, d: 1.5, kind: "pillar" },
  ];
  return [
    { x: 0, z: 9.5, w: 2.4, d: 1.1, kind: "crate" },
    { x: 0, z: -9.5, w: 2.4, d: 1.1, kind: "crate" },
    { x: 0, z: 21, w: 1.4, d: 1.4, kind: "pillar" },
    { x: 0, z: -21, w: 1.4, d: 1.4, kind: "pillar" },
    ...half,
    ...half.map((c) => ({ ...c, x: -c.x })),
  ];
})();
/** Paw Blaster's cover, map by map (ARENA_MAPS.blaster) */
export const BLASTER_COVERS = [BLASTER_COVER, ICE_COVER];

// ——— Summit Rush: a tussle on the rooftops ———
// A big main roof with higher roofs, crates and a water tank on it. Pick up things (and cats) and
// throw them; a cat thrown or knocked off the roofs is a point for the other team.

/** The main roof (a square, `half` from its middle to each edge) */
export const ROOFTOPS = { x: 64, z: 0, half: 20 };
/** How close to the edge you can walk (you only leave the roofs thrown or knocked off) */
export const ROOF_EDGE = 0.6;
/** What stands on the main roof: where (from its middle), half its width (w, along x) and depth (d, along z), how high its top is */
export type RoofBlock = { x: number; z: number; w: number; d: number; top: number; kind: "roof" | "crate" | "tank" | "vent" | "skylight" };
export const ROOF_BLOCKS: RoofBlock[] = [
  // The upper roof along the north side, and the water tank on it
  { x: 0, z: -13, w: 9, d: 5, top: 2.4, kind: "roof" },
  { x: 5, z: -14.5, w: 2, d: 2, top: 4.6, kind: "tank" },
  // Crates against it: a step up
  { x: -6, z: -6.6, w: 1.4, d: 1.4, top: 1.2, kind: "crate" },
  { x: 7, z: -6.6, w: 1.4, d: 1.4, top: 1.2, kind: "crate" },
  // The skylight in the middle, and two vents
  { x: 0, z: 2, w: 3, d: 2, top: 0.9, kind: "skylight" },
  { x: -8, z: 11, w: 2, d: 1.5, top: 1.2, kind: "vent" },
  { x: 8, z: 11, w: 2, d: 1.5, top: 1.2, kind: "vent" },
  // The walkway under the billboard, along the south side
  { x: 0, z: 15.5, w: 6, d: 1.5, top: 2.4, kind: "roof" },
];
/** Jumping on the rooftops: real gravity, and two jumps before you land (the second reaches the higher roofs) */
export const ROOF_JUMP = { gravity: 26, speed: 9.4, jumps: 2 };
/** A ledge this low is just walked up */
export const ROOF_STEP = 0.35;
const ROOF_CAT = 0.35;
/** How high the surface is under (x, z) for a cat at height y: the highest top they're over and can stand on */
export function roofGround(x: number, z: number, y: number, blocks: RoofBlock[] = ROOF_BLOCKS) {
  const rx = x - ROOFTOPS.x;
  const rz = z - ROOFTOPS.z;
  let ground = 0;
  for (const b of blocks) {
    if (Math.abs(rx - b.x) <= b.w && Math.abs(rz - b.z) <= b.d && b.top <= y + ROOF_STEP && b.top > ground) ground = b.top;
  }
  return ground;
}
/** The side of something taller than a step is in the way of a cat at height y going to (x, z) */
export function roofBlocked(x: number, z: number, y: number, blocks: RoofBlock[] = ROOF_BLOCKS) {
  const rx = x - ROOFTOPS.x;
  const rz = z - ROOFTOPS.z;
  return blocks.some((b) => Math.abs(rx - b.x) < b.w + ROOF_CAT && Math.abs(rz - b.z) < b.d + ROOF_CAT && b.top > y + ROOF_STEP);
}
/** Past the edge of the main roof: nothing under you but the street */
export const roofOutside = (x: number, z: number) => Math.abs(x - ROOFTOPS.x) > ROOFTOPS.half || Math.abs(z - ROOFTOPS.z) > ROOFTOPS.half;

/** Things lying about to pick up and throw: how hard they push, how long they stun, how fast and far they fly */
export const ROOF_THINGS = {
  pot: { name: "Flowerpot", emoji: "🪴", push: 3, stunMs: 900, speed: 20, range: 16 },
  brick: { name: "Brick", emoji: "🧱", push: 4, stunMs: 600, speed: 22, range: 18 },
  fish: { name: "Fish", emoji: "🐟", push: 1.5, stunMs: 1_500, speed: 24, range: 16 },
  crate: { name: "Crate", emoji: "📦", push: 5.5, stunMs: 1_100, speed: 15, range: 12 },
} as const;
export type RoofThingKind = keyof typeof ROOF_THINGS;
export const ROOF_THING_KINDS = Object.keys(ROOF_THINGS) as RoofThingKind[];
export type RoofThing = { id: string; kind: RoofThingKind; x: number; z: number; y: number };
/** Where things turn up (from the middle of the main roof; their height is whatever's under them) */
export const ROOF_THING_SPOTS: [number, number][] = [
  [-10, -3], [10, -3], [-4, 7], [4, 7], [-13, 8], [13, 8], [-3, -3], [3, -3], [-15, -12], [15, -12],
  [-5, -13], [0, -11], [5, -10.5], [0, 15.5], [-4, 15.5], [0, 2], [-8, 11], [8, 11], [-14, 15], [14, 15],
];
/**
 * Summit Rush's second map, the Cargo Ship: a deck of containers (one row to hop onto, a second
 * stacked on part of it), a funnel you can just reach with two jumps, hatches and winches.
 */
export const SHIP_BLOCKS: RoofBlock[] = [
  { x: -5, z: -12.5, w: 6, d: 2.5, top: 1.2, kind: "crate" },
  { x: -7.5, z: -12.5, w: 3, d: 2.5, top: 2.4, kind: "roof" },
  { x: 5, z: 12.5, w: 6, d: 2.5, top: 1.2, kind: "crate" },
  { x: 7.5, z: 12.5, w: 3, d: 2.5, top: 2.4, kind: "roof" },
  { x: 0, z: 0, w: 2.5, d: 2.5, top: 0.9, kind: "skylight" },
  { x: 9, z: -5, w: 1.3, d: 1.3, top: 1.2, kind: "crate" },
  { x: -9, z: 5, w: 1.3, d: 1.3, top: 1.2, kind: "crate" },
  { x: -13, z: 14, w: 1.8, d: 1.8, top: 3, kind: "tank" },
  { x: 13, z: 6, w: 1.5, d: 2, top: 1.2, kind: "vent" },
  { x: -13, z: -6, w: 1.5, d: 2, top: 1.2, kind: "vent" },
];
export const SHIP_THING_SPOTS: [number, number][] = [
  [-10, -3], [10, 3], [-3, 7], [3, -7], [-15, 9], [15, -9], [0, -8], [0, 8], [-16, -15], [16, 15],
  [-2, -12.5], [2, 12.5], [-7.5, -12.5], [7.5, 12.5], [0, 0], [-9, 5], [9, -5], [-17, 3], [17, -3], [12, -15],
];
/** Summit Rush's layouts, map by map (ARENA_MAPS.summit): what stands on the deck, and where things turn up */
export const ROOF_LAYOUTS: { blocks: RoofBlock[]; spots: [number, number][] }[] = [
  { blocks: ROOF_BLOCKS, spots: ROOF_THING_SPOTS },
  { blocks: SHIP_BLOCKS, spots: SHIP_THING_SPOTS },
];

/**
 * Each game's maps. A room moves on to the next one every round (ArenaRound.map says which), so
 * everyone sees them all. Paw Blaster and Summit Rush change what stands where; Sky Brawl's island
 * keeps its shape and changes its world.
 */
export type ArenaMap = { id: string; name: string; emoji: string; blurb: string };
export const ARENA_MAPS: Record<ArenaGame, ArenaMap[]> = {
  blaster: [
    { id: "colosseum", name: "The Colosseum", emoji: "🏟️", blurb: "Crates, pillars and energy walls under the lights" },
    { id: "ice", name: "Frozen Lake", emoji: "🧊", blurb: "Open ice in the middle, snow walls on the flanks" },
  ],
  summit: [
    { id: "rooftops", name: "The Rooftops", emoji: "🏙️", blurb: "A roof over the city at night" },
    { id: "ship", name: "Cargo Ship", emoji: "🚢", blurb: "Containers on a deck far out at sea" },
  ],
  brawl: [
    { id: "island", name: "Sky Island", emoji: "🌪️", blurb: "A floating island among lanterns" },
    { id: "volcano", name: "The Volcano", emoji: "🌋", blurb: "The same island, over a lake of lava" },
  ],
};
export const arenaMapOf = (game: ArenaGame, map: number | undefined) => ARENA_MAPS[game][map ?? 0] ?? ARENA_MAPS[game][0];

/**
 * Picking up and carrying. reach, reachY: how near (and how level) something has to be. liftMs: how
 * long it takes to lift a cat overhead (it can't be thrown before: its chance to get away). holdMs:
 * how long a cat can be carried before it wriggles free by itself; struggles: the presses that free
 * it sooner (and stun the carrier). safeMs: nobody can pick a cat up again for this long after
 * (backSafeMs: after it comes back from a fall).
 * carrySpeed: your speed carrying a cat. throwDist, throwMs, throwArc: how far, how long and how high
 * a thrown cat flies; landStunMs: how long an enemy is dazed where it lands.
 */
export const ROOF_GRAB = { reach: 2.4, reachY: 1.5, cooldownMs: 800, liftMs: 1_200, holdMs: 3_000, struggles: 8, safeMs: 1_600, backSafeMs: 3_000, carrySpeed: 0.78, throwDist: 7, throwMs: 650, throwArc: 2.2, landStunMs: 700 };
/** Where each team starts in a game (relative to its area's center) */
export const ARENA_BASES: Record<ArenaGame, Record<ArenaTeam, { x: number; z: number; ry: number }>> = {
  blaster: { red: { x: -24, z: 0, ry: Math.PI / 2 }, blue: { x: 24, z: 0, ry: -Math.PI / 2 } },
  summit: { red: { x: -15, z: 0, ry: Math.PI / 2 }, blue: { x: 15, z: 0, ry: -Math.PI / 2 } },
  brawl: { red: { x: -11, z: 0, ry: Math.PI / 2 }, blue: { x: 11, z: 0, ry: -Math.PI / 2 } },
};

// ——— Sky Brawl: a knock-off brawl on a floating island ———
// Hits raise a cat's damage % (it starts at 0); the higher it is, the further hits launch them.
// Launched off the island: a knockout (for the other team). They come back at 0%.

/** The island (far north of the hall, alone in the sky), and how big it is at the start */
export const BRAWL_ISLAND = { x: 0, z: -300, radius: 21 };
/** Near the end the edge crumbles: when (the share of the round gone) and the new radius. A warning first. */
export const BRAWL_CRUMBLE = [
  { at: 2 / 3, radius: 16.5 },
  { at: 5 / 6, radius: 12.5 },
];
export const BRAWL_CRUMBLE_WARN_MS = 5_000;
/** The claw: a 3-hit combo (the last one launches); how often, how long a combo stays alive, its reach */
export const BRAWL_CLAW = { gapMs: 320, comboMs: 1_000, range: 2.9, arc: 1.05 };
export const BRAWL_COMBO = [
  { dmg: 5, force: 1.3 },
  { dmg: 6, force: 1.5 },
  { dmg: 9, force: 4.4 },
] as const;
/** E: a quick dash you can't be hit during */
export const BRAWL_DASH = { dist: 6.5, cooldownMs: 2_200, ms: 180, dodgeMs: 300 };
/** How far a hit launches: force × (1 + damage% / BRAWL_SCALE) */
export const BRAWL_SCALE = 42;
export const BRAWL_RESPAWN_MS = 2_500;
export const BRAWL_SPAWN_SHIELD_MS = 2_000;
/** A launch's flight time from its distance */
export const brawlFlightMs = (dist: number) => Math.round(Math.min(950, 220 + dist * 38));
export const brawlLaunch = (force: number, dmg: number) => force * (1 + dmg / BRAWL_SCALE);
/** The ultimate (R): charged by dealing damage (and a little by taking it, and over time) */
export const BRAWL_ULT_MAX = 100;

export type BrawlUltKind = "comet" | "quake" | "kingroar" | "meteors" | "beam" | "orbital" | "cuts" | "broadside" | "inferno" | "vortex" | "closed" | "charge";
export const BRAWL_ULTS: Record<AvatarStyle, { kind: BrawlUltKind; name: string; emoji: string; description: string }> = {
  classic: { kind: "comet", name: "Comet Pounce", emoji: "☄️", description: "A huge leap where you aim: the landing blasts everyone around you away." },
  chonk: { kind: "quake", name: "Mega Quake", emoji: "🌋", description: "Two shockwaves, one after the other: the second one throws everyone far." },
  lion: { kind: "kingroar", name: "King's Roar", emoji: "👑", description: "A roar across half the island: every enemy in it is stunned, hurt and pushed back." },
  wizard: { kind: "meteors", name: "Meteor Spell", emoji: "🌠", description: "Six meteors rain down where you aim." },
  robo: { kind: "beam", name: "Hyper Beam", emoji: "📡", description: "A charged laser straight ahead: everything in its line flies." },
  astro: { kind: "orbital", name: "Orbital Strike", emoji: "🛰️", description: "Lasers from space lock onto the three nearest enemies. Move or fly!" },
  ninja: { kind: "cuts", name: "Thousand Cuts", emoji: "🗡️", description: "Flash between up to four enemies, striking each one. The last strike launches." },
  pirate: { kind: "broadside", name: "Broadside", emoji: "🏴‍☠️", description: "Five cannonballs at once, in a wide fan." },
  dragon: { kind: "inferno", name: "Inferno", emoji: "🔥", description: "A sea of dragon fire ahead: huge damage and a huge launch." },
  ghost: { kind: "vortex", name: "Spirit Vortex", emoji: "🌀", description: "Pull every enemy near you in, then blast them all away." },
  detective: { kind: "closed", name: "Case Closed", emoji: "🔍", description: "Every enemy near you is caught and marked: they fly 60% further for 6 seconds." },
  knight: { kind: "charge", name: "Paladin Charge", emoji: "🛡️", description: "Charge far ahead, unstoppable, sending everyone in your way flying." },
  rabbit: { kind: "comet", name: "Moon Hop", emoji: "🌙", description: "A huge hop where you aim: the landing blasts everyone around you away." },
  pig: { kind: "broadside", name: "Mud Barrage", emoji: "🟤", description: "Five mud balls at once, in a wide fan." },
  dog: { kind: "kingroar", name: "Big Howl", emoji: "🐺", description: "A howl across half the island: every enemy in it is stunned, hurt and pushed back." },
  frog: { kind: "vortex", name: "Swamp Whirl", emoji: "🌀", description: "Pull every enemy near you in, then blast them all away." },
  fox: { kind: "cuts", name: "Fox Flurry", emoji: "🦊", description: "Flash between up to four enemies, striking each one. The last strike launches." },
  penguin: { kind: "charge", name: "Iceberg Slide", emoji: "🧊", description: "Slide far ahead on your belly, unstoppable, sending everyone in your way flying." },
  owl: { kind: "closed", name: "Wise Eyes", emoji: "🦉", description: "Every enemy near you is spotted and marked: they fly 60% further for 6 seconds." },
  panda: { kind: "quake", name: "Panda Quake", emoji: "🐼", description: "Two belly flops, one after the other: the second one throws everyone far." },
};
export const brawlUltOf = (look: AvatarLook | null) => BRAWL_ULTS[look?.style ?? "classic"] ?? BRAWL_ULTS.classic;

/** Power-ups that appear on the island */
export type BrawlPowerUpKind = "heal" | "charge" | "glove" | "golden";
export const BRAWL_POWERUPS: Record<BrawlPowerUpKind, { name: string; emoji: string; description: string }> = {
  heal: { name: "Fish Snack", emoji: "🐟", description: "35% damage off" },
  charge: { name: "Star Yarn", emoji: "⭐", description: "+50% ultimate charge" },
  glove: { name: "Power Paw", emoji: "🥊", description: "Your next 3 hits launch 50% further" },
  golden: { name: "Golden Yarn", emoji: "🏆", description: "Ultimate fully charged and a Power Paw" },
};
export type BrawlPowerUp = { id: string; kind: BrawlPowerUpKind; x: number; z: number };
/** Island events, every half a minute or so */
export type BrawlEventKind = "meteors" | "storm" | "golden" | "crumble";
export const BRAWL_EVENTS: Record<BrawlEventKind, { name: string; emoji: string; text: string }> = {
  meteors: { name: "Meteor Shower", emoji: "☄️", text: "Meteors incoming! Stay out of the red circles" },
  storm: { name: "Lightning Storm", emoji: "⚡", text: "Lightning strikes where cats stand: keep moving!" },
  golden: { name: "Golden Yarn", emoji: "🏆", text: "A Golden Yarn in the middle: grab it for a full ultimate!" },
  crumble: { name: "The Edge Crumbles", emoji: "⚠️", text: "The edge is crumbling: get to the middle!" },
};
export type BrawlHazardKind = "meteor" | "bolt" | "orbital" | "spell" | "tornado";

/** Jumping: how long you're in the air (yarn and hits pass under you then), and how often */
export const ARENA_JUMP = { airMs: 520, cooldownMs: 1000, height: 1.7 };
/** Rocket Boost: how much faster you run */
export const ARENA_BOOST_SPEED = 1.6;

/** In a battle cats are solid to each other: their middles stay this far apart (up in a jump, dashing, phased or flying they pass) */
export const ARENA_CAT_GAP = 1.6;

/** Where a cat stepping to (x, z) ends up, out of the others' way: it slides around them */
export function clearOfCats(x: number, z: number, others: { x: number; z: number }[], gap = ARENA_CAT_GAP) {
  // (twice: stepping out of one cat can step into the next)
  for (let pass = 0; pass < 2; pass++) {
    for (const o of others) {
      const dx = x - o.x;
      const dz = z - o.z;
      const d = Math.hypot(dx, dz);
      if (d >= gap) continue;
      if (d < 1e-3) {
        x = o.x + gap;
        continue;
      }
      x = o.x + (dx / d) * gap;
      z = o.z + (dz / d) * gap;
    }
  }
  return { x, z };
}
/** Pounce, Blink and Shadow Step: how far they take you */
export const ARENA_LEAPS = { pounce: 8, blink: 11, shadow: 8 };

// ——— Every character has its own power in the arena (Q) ———
export type ArenaAbilityKind = "pounce" | "slam" | "roar" | "blink" | "triple" | "boost" | "shadow" | "cannon" | "breath" | "phase" | "snare" | "shield";
export const ARENA_ABILITIES: Record<AvatarStyle, { kind: ArenaAbilityKind; name: string; emoji: string; description: string; cooldownMs: number }> = {
  classic: { kind: "pounce", name: "Pounce", emoji: "🐾", description: "Leap far ahead. Nothing can touch you mid-air.", cooldownMs: 6_000 },
  chonk: { kind: "slam", name: "Belly Flop", emoji: "💥", description: "Slam down: knock back everyone near you (1 damage in Paw Blaster).", cooldownMs: 11_000 },
  lion: { kind: "roar", name: "Roar", emoji: "🦁", description: "Stun the enemies near you for 1.5 seconds.", cooldownMs: 14_000 },
  wizard: { kind: "blink", name: "Blink", emoji: "✨", description: "Teleport ahead in a puff of sparkles.", cooldownMs: 9_000 },
  robo: { kind: "triple", name: "Triple Shot", emoji: "📡", description: "Throw three yarn balls in a fan.", cooldownMs: 8_000 },
  astro: { kind: "boost", name: "Rocket Boost", emoji: "🚀", description: "Run 60% faster for 3 seconds.", cooldownMs: 12_000 },
  ninja: { kind: "shadow", name: "Shadow Step", emoji: "💨", description: "Vanish and reappear ahead, shielded for a second.", cooldownMs: 7_000 },
  pirate: { kind: "cannon", name: "Cannonball", emoji: "💣", description: "Fire a cannonball: 2 damage and a big knockback.", cooldownMs: 9_000 },
  dragon: { kind: "breath", name: "Fire Breath", emoji: "🔥", description: "Breathe fire ahead: 1 damage and a push for everyone in the flames.", cooldownMs: 12_000 },
  ghost: { kind: "phase", name: "Phase", emoji: "👻", description: "Turn see-through for 2.5 seconds: yarn and shoves pass right through.", cooldownMs: 13_000 },
  detective: { kind: "snare", name: "Snare", emoji: "🔍", description: "Drop a trap: the first enemy to step in is stuck for 2 seconds.", cooldownMs: 10_000 },
  knight: { kind: "shield", name: "Shield Wall", emoji: "🛡️", description: "Raise your shield: no damage or knockback for 2.5 seconds.", cooldownMs: 12_000 },
  rabbit: { kind: "pounce", name: "Big Hop", emoji: "🐰", description: "Hop far ahead. Nothing can touch you mid-air.", cooldownMs: 6_000 },
  pig: { kind: "cannon", name: "Mud Ball", emoji: "🟤", description: "Throw a mud ball: 2 damage and a big knockback.", cooldownMs: 9_000 },
  dog: { kind: "roar", name: "Bark", emoji: "🐶", description: "Stun the enemies near you for 1.5 seconds.", cooldownMs: 14_000 },
  frog: { kind: "snare", name: "Lily Trap", emoji: "🍃", description: "Drop a sticky lily pad: the first enemy to step in is stuck for 2 seconds.", cooldownMs: 10_000 },
  fox: { kind: "shadow", name: "Trick Step", emoji: "🦊", description: "Vanish and reappear ahead, shielded for a second.", cooldownMs: 7_000 },
  penguin: { kind: "boost", name: "Belly Slide", emoji: "🐧", description: "Slide 60% faster for 3 seconds.", cooldownMs: 12_000 },
  owl: { kind: "blink", name: "Silent Glide", emoji: "🦉", description: "Glide ahead without a sound.", cooldownMs: 9_000 },
  panda: { kind: "slam", name: "Belly Bump", emoji: "🐼", description: "Bump down: knock back everyone near you (1 damage in Paw Blaster).", cooldownMs: 11_000 },
};
export const arenaAbilityOf = (look: AvatarLook | null) => ARENA_ABILITIES[look?.style ?? "classic"] ?? ARENA_ABILITIES.classic;

// ——— Spells (G): every character's second power, in every battle game ———
export type ArenaSpellKind = "tornado" | "snack" | "rally" | "orb" | "emp" | "meteor" | "smoke" | "hook" | "flamering" | "haunt" | "spotlight" | "bulwark";
export const ARENA_SPELLS: Record<AvatarStyle, { kind: ArenaSpellKind; name: string; emoji: string; description: string; cooldownMs: number }> = {
  classic: { kind: "tornado", name: "Catnado", emoji: "🌪️", description: "A whirlwind where you aim: it throws everyone in it.", cooldownMs: 15_000 },
  chonk: { kind: "snack", name: "Snack Time", emoji: "🍔", description: "Heal yourself and your teammates nearby.", cooldownMs: 18_000 },
  lion: { kind: "rally", name: "Pride Rally", emoji: "📣", description: "Your team nearby runs faster and is shielded for a moment.", cooldownMs: 18_000 },
  wizard: { kind: "orb", name: "Arcane Orb", emoji: "🔮", description: "A big, slow orb of magic: hard to miss, hits hard.", cooldownMs: 14_000 },
  robo: { kind: "emp", name: "EMP", emoji: "⚡", description: "Short-circuit enemies near you: stunned, and no powers or spells for 3 seconds.", cooldownMs: 17_000 },
  astro: { kind: "meteor", name: "Meteor Drop", emoji: "☄️", description: "Call a meteor down where you aim. It lands a moment later.", cooldownMs: 16_000 },
  ninja: { kind: "smoke", name: "Smoke Bomb", emoji: "💨", description: "Vanish in smoke: enemies can barely see you for 3.5 seconds.", cooldownMs: 16_000 },
  pirate: { kind: "hook", name: "Anchor Hook", emoji: "⚓", description: "Throw a hook: the enemy it catches is yanked to you.", cooldownMs: 14_000 },
  dragon: { kind: "flamering", name: "Flame Ring", emoji: "🔥", description: "A ring of fire bursts out around you.", cooldownMs: 15_000 },
  ghost: { kind: "haunt", name: "Haunt", emoji: "👻", description: "Scare the enemies near you: they flee, frozen with fright.", cooldownMs: 17_000 },
  detective: { kind: "spotlight", name: "Spotlight", emoji: "🔦", description: "Mark the enemies near you for 5 seconds: they take more from every hit.", cooldownMs: 16_000 },
  knight: { kind: "bulwark", name: "Holy Bulwark", emoji: "✝️", description: "Shield yourself and your teammates nearby: yarn passes right through.", cooldownMs: 18_000 },
  rabbit: { kind: "snack", name: "Carrot Snack", emoji: "🥕", description: "Heal yourself and your teammates nearby.", cooldownMs: 18_000 },
  pig: { kind: "tornado", name: "Mud Twister", emoji: "🌪️", description: "A whirl of mud where you aim: it throws everyone in it.", cooldownMs: 15_000 },
  dog: { kind: "rally", name: "Pack Rally", emoji: "🐕", description: "Your team nearby runs faster and is shielded for a moment.", cooldownMs: 18_000 },
  frog: { kind: "hook", name: "Tongue Grab", emoji: "👅", description: "Shoot out your tongue: the enemy it catches is yanked to you.", cooldownMs: 14_000 },
  fox: { kind: "smoke", name: "Fox Trick", emoji: "💨", description: "Vanish in a puff: enemies can barely see you for 3.5 seconds.", cooldownMs: 16_000 },
  penguin: { kind: "emp", name: "Deep Freeze", emoji: "🧊", description: "Freeze the enemies near you: stunned, and no powers or spells for 3 seconds.", cooldownMs: 17_000 },
  owl: { kind: "spotlight", name: "Moonlight", emoji: "🌕", description: "Mark the enemies near you for 5 seconds: they take more from every hit.", cooldownMs: 16_000 },
  panda: { kind: "snack", name: "Bamboo Snack", emoji: "🎋", description: "Heal yourself and your teammates nearby.", cooldownMs: 18_000 },
};
export const arenaSpellOf = (look: AvatarLook | null) => ARENA_SPELLS[look?.style ?? "classic"] ?? ARENA_SPELLS.classic;

// ——— Characters grow: XP from battles, levels, and upgrades bought with coins ———
/** XP needed for each level (level 1 at 0 XP … level 6) */
export const CHARACTER_LEVEL_XP = [0, 120, 300, 600, 1_000, 1_600];
export const characterLevel = (xp: number) => CHARACTER_LEVEL_XP.filter((need) => xp >= need).length;
/** XP for a round (each character on its own): taking part, winning, the MVP, each knockout (up to koCap) */
export const ARENA_XP = { round: 10, win: 15, mvp: 10, ko: 3, koCap: 10 } as const;
/** The upgrades, in order: each needs a level and costs coins */
export const CHARACTER_TIERS = [
  { level: 2, cost: 300, name: "Quick Paws", emoji: "⏩", description: "Your power recharges 10% faster." },
  { level: 3, cost: 600, name: "Sharp Claws", emoji: "🗡️", description: "Your power and claws hit 12% harder." },
  { level: 4, cost: 1_000, name: "Spellcraft", emoji: "🔮", description: "Your spell recharges 15% faster and hits 12% harder." },
  { level: 5, cost: 1_600, name: "Thick Fur", emoji: "🛡️", description: "Tougher: less damage % and shorter knockbacks, and a longer shield when you come back." },
  { level: 6, cost: 2_500, name: "Legend", emoji: "🌟", description: "5% faster, and a golden legend's aura." },
] as const;
/** What a character's upgrades and worn items add up to in battle (multipliers, and extras) */
export type BattleMods = {
  /** Cooldown multipliers (0.9 = 10% faster) */
  powerCd: number;
  spellCd: number;
  /** Strength multipliers (1.12 = 12% harder) */
  power: number;
  spell: number;
  /** Speed multiplier */
  speed: number;
  /** Toughness: this much less damage % (Sky Brawl), and shorter knockbacks (Summit Rush) */
  tough: number;
  /** Extra shield when coming back (ms) */
  shieldMs: number;
};
const RARITY_POINTS: Record<Rarity, number> = { common: 1, rare: 2, epic: 3, legendary: 4, mythic: 0 };
/** What a worn item does in battle: a small perk by its slot, bigger the rarer it is */
export function gearPerk(item: Pick<ShopItem, "kind" | "rarity">): { stat: "powerCd" | "spellCd" | "speed" | "tough"; amount: number; text: string } | null {
  const n = RARITY_POINTS[item.rarity];
  // Mythic things are bought for looks: they never give an edge
  if (!n) return null;
  if (item.kind === "hat") return { stat: "powerCd", amount: 0.025 * n, text: `Your power recharges ${2.5 * n}% faster` };
  if (item.kind === "face") return { stat: "spellCd", amount: 0.025 * n, text: `Your spell recharges ${2.5 * n}% faster` };
  if (item.kind === "trail") return { stat: "speed", amount: 0.015 * n, text: `You run ${1.5 * n}% faster` };
  if (item.kind === "frame") return { stat: "tough", amount: 0.015 * n, text: `${1.5 * n}% tougher, and a longer shield when you come back` };
  return null;
}
/** A character's battle modifiers, from its upgrades (tier 0–5) and what it wears */
export function battleMods(tier: number, gear?: Gear): BattleMods {
  const has = (n: number) => tier >= n;
  const perks = Object.values(gear ?? {})
    .map((id) => SHOP_ITEMS.find((item) => item.id === id))
    .flatMap((item) => (item ? [gearPerk(item)] : []))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const sum = (stat: string) => perks.filter((p) => p.stat === stat).reduce((total, p) => total + p.amount, 0);
  const round3 = (n: number) => Math.round(n * 1000) / 1000;
  return {
    powerCd: round3((has(1) ? 0.9 : 1) * (1 - sum("powerCd"))),
    spellCd: round3((has(3) ? 0.85 : 1) * (1 - sum("spellCd"))),
    power: has(2) ? 1.12 : 1,
    spell: has(3) ? 1.12 : 1,
    speed: round3(1 + (has(5) ? 0.05 : 0) + sum("speed")),
    tough: round3((has(4) ? 0.1 : 0) + sum("tough")),
    shieldMs: (has(4) ? 500 : 0) + Math.round((sum("tough") / 0.015) * 200),
  };
}
/** Your character's progress (the arena's Upgrades panel) */
export type CharacterProgressView = {
  style: AvatarStyle;
  xp: number;
  level: number;
  /** XP the next level needs (null: top level) */
  nextLevelXp: number | null;
  /** Upgrades bought (0–5) */
  tier: number;
  coins: number;
  mods: BattleMods;
  /** What your worn items do in battle */
  perks: { emoji: string; name: string; text: string }[];
  /** XP just earned, and whether it was a new level (after a round) */
  gained?: number;
  levelUp?: boolean;
};

// ——— Battle items: bought in the shop (⚔️ Battle), kept in your kit, used in the arena (keys 1–6) ———
export type BattleItemId = "tonic" | "zoomies" | "bubble" | "bomb" | "freeze" | "recharge";
export type BattleItem = { id: BattleItemId; name: string; emoji: string; price: number; rarity: Rarity; description: string };
export const BATTLE_ITEMS: BattleItem[] = [
  { id: "tonic", name: "Catnip Tonic", emoji: "🧪", price: 30, rarity: "common", description: "Get a heart back and shake off a stun. On the hill: a second of standing firm." },
  { id: "zoomies", name: "Zoomies", emoji: "⚡", price: 25, rarity: "common", description: "Run 60% faster for 4 seconds." },
  { id: "bubble", name: "Bubble Shield", emoji: "🫧", price: 40, rarity: "rare", description: "Yarn passes right through you for 3 seconds." },
  { id: "bomb", name: "Hairball Bomb", emoji: "💣", price: 45, rarity: "rare", description: "Lob a bomb ahead: it bursts after a moment, hurting and knocking back every enemy near it." },
  { id: "freeze", name: "Freeze Ball", emoji: "🧊", price: 50, rarity: "epic", description: "Throw an ice ball: whoever it hits is frozen for 2 seconds." },
  { id: "recharge", name: "Power Cell", emoji: "🔋", price: 60, rarity: "epic", description: "Your character's power is ready again, right now." },
];
export const BATTLE_ITEM_BY_ID = new Map(BATTLE_ITEMS.map((item) => [item.id, item]));

/**
 * Arena perks: bought once, yours for good (kept with your shop items). Target Lock (Sky Brawl): your
 * cat locks onto an enemy, facing them, and every claw, power, spell, dash and ultimate aims at them;
 * T switches to the next enemy, X lets go.
 */
export type ArenaPerkId = "perk-lockon";
export type ArenaPerk = { id: ArenaPerkId; name: string; emoji: string; price: number; game: ArenaGame; description: string };
export const ARENA_PERKS: ArenaPerk[] = [
  {
    id: "perk-lockon",
    name: "Target Lock",
    emoji: "🎯",
    price: 3_000,
    game: "brawl",
    description: "Sky Brawl: lock onto an enemy. Your cat faces them and every hit, power, spell, dash and ultimate aims at them. T switches target, X lets go.",
  },
];
export const ARENA_PERK_BY_ID = new Map(ARENA_PERKS.map((p) => [p.id, p]));
/** How many of one item a kit holds, and the packs the shop sells */
export const BATTLE_KIT_MAX = 30;
export const BATTLE_PACKS = [1, 5] as const;
/** A pack of 5 costs this share of five singles */
export const BATTLE_PACK_DISCOUNT = 0.85;
export const battlePackPrice = (item: BattleItem, qty: number) => (qty >= 5 ? Math.round(item.price * qty * BATTLE_PACK_DISCOUNT) : item.price * qty);
/** In a round: each item at most this many times, and a pause between any two */
export const ARENA_ITEM_USES = 2;
export const ARENA_ITEM_GAP_MS = 5_000;
/** The Hairball Bomb: how far it's lobbed, how long it takes to burst, and how far the burst reaches */
export const ARENA_BOMB = { range: 7, fuseMs: 900, radius: 3.5 };
export type BattleKit = Partial<Record<BattleItemId, number>>;

export type ArenaPhase = "waiting" | "countdown" | "playing" | "results";
/** What's going on with a cat right now: how many more ms each lasts (when sent).
 * shield: just back or Shadow Step (yarn passes through); guard: Shield Wall (yarn bounces off);
 * mark (Sky Brawl, Case Closed): flies further */
export type ArenaEffects = { shield?: number; guard?: number; phase?: number; boost?: number; stun?: number; mark?: number; veil?: number; silence?: number };
export type ArenaPlayer = {
  id: string;
  login: string;
  name: string;
  look: AvatarLook | null;
  team: ArenaTeam;
  x: number;
  z: number;
  ry: number;
  hp: number;
  /** Knocked out (blaster), waiting to come back */
  ko: boolean;
  /** Knockouts this round */
  kos: number;
  supporter?: SupporterTier;
  streak?: number;
  /** An AI player */
  bot?: boolean;
  fx?: ArenaEffects;
  /** Sky Brawl: damage % (more flies further), ultimate charge (0–100), Power Paw hits left */
  dmg?: number;
  ult?: number;
  glove?: number;
  /** Upgrades bought for this character (0–5; 5: a legend) */
  tier?: number;
  /** Summit Rush: how high they are, what they're carrying (a thing, or a cat), and who's carrying them */
  y?: number;
  hold?: { thing?: RoofThingKind; cat?: string };
  heldBy?: string;
};
export type ArenaRound = {
  game: ArenaGame;
  phase: ArenaPhase;
  /** When this phase ends (server clock, ms); null while waiting */
  endsAt: number | null;
  score: Record<ArenaTeam, number>;
  /** Results: who won, the MVP, and why */
  winner?: ArenaTeam | "draw";
  mvp?: { id: string; name: string };
  note?: string;
  /** Rounds only pay when both teams had players */
  rewarded?: boolean;
  /** Which of the game's maps this round is on (ARENA_MAPS; the room moves on to the next every round) */
  map?: number;
  /** Sky Brawl: the island's radius now, and (a warning) when the edge crumbles and to what */
  island?: { radius: number; crumbleAt?: number; to?: number };
  /** Sky Brawl: the event going on (until, server clock) */
  event?: { kind: BrawlEventKind; until: number } | null;
};
/** A game's room, for choosing where to play (a game has as many rooms as people need) */
export type ArenaRoomInfo = {
  game: ArenaGame;
  /** Its number (1, 2, …) */
  room: number;
  /** People inside (AI players don't count) */
  players: number;
  bots: number;
  max: number;
  phase: ArenaPhase;
  endsAt: number | null;
  score: Record<ArenaTeam, number>;
};
/** Your battle items: what's in your kit, and how many of each you've used this round */
export type ArenaKitView = { kit: BattleKit; used: BattleKit; coins: number };
export type ArenaWelcome = {
  self: ArenaPlayer;
  players: ArenaPlayer[];
  round: ArenaRound;
  serverTime: number;
  passUntil: string;
  kit: ArenaKitView;
  host: ArenaHost;
  /** Which room of the game you're in */
  room: number;
  /** Sky Brawl: the power-ups on the island */
  powerUps?: BrawlPowerUp[];
  /** Summit Rush: the things lying about on the rooftops */
  things?: RoofThing[];
  /** Your character's level, upgrades and battle perks */
  progress?: CharacterProgressView;
  /** Arena perks you own (ARENA_PERKS) */
  perks?: ArenaPerkId[];
};
export type ArenaStatus = {
  fee: number;
  passMinutes: number;
  /** Your points and coins (null when signed out) */
  points: number | null;
  coins: number | null;
  /** Your pass runs until (null: none) */
  passUntil: string | null;
  /** People inside, all games (AI players fill the teams up and don't count) */
  players: number;
  bots: number;
  /** Every room of every game */
  rooms: ArenaRoomInfo[];
  /** Battle Night: on now (free entry, double rewards) and when it ends, or when the next one starts */
  battleNight: { live: boolean; at: string };
  /** Where each game's battle server is (a game that's missing is offline right now) */
  servers: Partial<Record<ArenaGame, string>>;
};
export type ArenaShotKind = "yarn" | "cannon" | "ice" | "orb" | "hook" | RoofThingKind;
/** How a knockout happened (for the knockout feed) */
export type ArenaKoHow = "yarn" | "cannon" | "breath" | "slam" | "bomb" | "claw" | "power" | "ult" | "hazard" | "crumble" | "fall" | "spell" | "throw";

export type ArenaClient = {
  /** This battle server's rooms */
  aRooms: (ack: (rooms: ArenaRoomInfo[]) => void) => void;
  /** Join the game (the battle server picks a room with space, or the one asked for) */
  aJoin: (data: { game: ArenaGame; room?: number }, ack: (result: { ok: true; welcome: ArenaWelcome } | { ok: false; error: string }) => void) => void;
  /** Leave your room */
  aLeave: () => void;
  /** Sky Brawl: dash (E) and the ultimate (R) */
  aDash: (data: { ry: number }) => void;
  aUlt: (data: { ry: number; seen?: number }) => void;
  /** Your character's spell (G) */
  aSpell: (data: { ry: number; seen?: number }) => void;
  /** Buy your character's next upgrade */
  aUpgrade: (ack: (result: { ok: true } | { ok: false; error: string }) => void) => void;
  /** Where you are; `place` is the last placement the server made (older moves are ignored) */
  /** (y: how high you are, on the rooftops) */
  aMove: (data: { x: number; z: number; ry: number; place: number; y?: number }) => void;
  /** Summit Rush: pick up what's nearest (a thing, or a cat). Throwing it is aFire. */
  aGrab: (data?: { seen?: number }) => void;
  /** Summit Rush: being carried, wriggle (enough of these in time and you're free) */
  aStruggle: () => void;
  /** seen: the server time of what your screen showed (a hit is judged by what you saw) */
  aFire: (data: { ry: number; seen?: number }) => void;
  aJump: () => void;
  aAbility: (data: { ry: number; seen?: number }) => void;
  /** Use a battle item from your kit */
  aItem: (data: { item: BattleItemId; ry: number; seen?: number }, ack: (result: { ok: true } | { ok: false; error: string }) => void) => void;
  /** Buy an arena perk (once, for good); perks: all you own now */
  aBuyPerk: (data: { perk: ArenaPerkId }, ack: (result: { ok: true; perks: ArenaPerkId[]; coins: number } | { ok: false; error: string }) => void) => void;
  /** Buy battle items without leaving the arena */
  aBuyItem: (data: { item: BattleItemId; qty: number }, ack: (result: { ok: true } | { ok: false; error: string }) => void) => void;
  aEmote: (data: { emote: Emote }) => void;
  /** The tab went to the background (or came back): time in the Grid only counts in view */
  aPresence: (data: { away: boolean }) => void;
  /** Game admin only: how many AI players (null: automatic) */
  aSetBots: (data: { count: number | null }, ack: (result: { ok: true } | { ok: false; error: string }) => void) => void;
  /** The game admin: how good the AI players are */
  aSetBotLevel: (data: { level: ArenaBotLevel }, ack: (result: { ok: true } | { ok: false; error: string }) => void) => void;
};
export type ArenaServer = {
  /** Everyone's positions, a few times a second: [id, x, z, ry] (and, on the rooftops, how high: y) */
  aState: (data: { t: number; p: [string, number, number, number, number?][] }) => void;
  /** Summit Rush: every thing lying about (a new round, or you just came in), one more, one gone (picked up by) */
  aThings: (data: { things: RoofThing[] }) => void;
  aThing: (data: RoofThing) => void;
  aThingGone: (data: { id: string; by: string | null }) => void;
  /** What a cat is carrying now (a thing, another cat, or nothing) */
  aCarry: (data: { id: string; thing: RoofThingKind | null; cat: string | null }) => void;
  /** A carried cat wriggled: n of the presses it needs */
  aStruggled: (data: { id: string; n: number; of: number }) => void;
  /** A carried cat is free: it wriggled out (the carrier's dazed), the carrier was too slow, or let go */
  aFreed: (data: { id: string; by: string; how: "struggle" | "time" | "dropped" }) => void;
  /** A cat was thrown: from where to where (and how high), how long it flies, and whether that's off the roofs */
  aThrown: (data: { id: string; by: string; x: number; z: number; y: number; tx: number; tz: number; ty: number; ms: number; out: boolean }) => void;
  aJoined: (player: ArenaPlayer) => void;
  aLeft: (data: { id: string }) => void;
  /** A player's team, health, knockout or effects changed */
  aPlayer: (player: ArenaPlayer) => void;
  aRound: (round: ArenaRound) => void;
  /** The server put you somewhere (round start, respawn, a shove, a blink): go there */
  aPlace: (data: { x: number; z: number; ry: number; place: number; stunnedMs?: number; glideMs?: number; y?: number }) => void;
  /** (y: how high it flies, on the rooftops) */
  aShot: (data: { id: string; by: string; team: ArenaTeam; x: number; z: number; ry: number; speed: number; range: number; kind: ArenaShotKind; y?: number }) => void;
  aHit: (data: { shot: string; target: string | null; x: number; z: number; blocked?: boolean }) => void;
  /** A knockout: by whom (null: nobody, e.g. the edge crumbled under them) */
  aKo: (data: { target: string; by: string | null; how: ArenaKoHow }) => void;
  aJump: (data: { id: string }) => void;
  /** Someone used their power (for the effect); (tx, tz) is where a leap or blink lands */
  aAbility: (data: { id: string; kind: ArenaAbilityKind; x: number; z: number; ry: number; tx?: number; tz?: number }) => void;
  aSnare: (data: { id: string; team: ArenaTeam; x: number; z: number }) => void;
  /** Someone used a battle item (for the effect) */
  aItem: (data: { id: string; item: BattleItemId; x: number; z: number }) => void;
  /** A Hairball Bomb lobbed from (x, z) to (tx, tz); it bursts fuseMs later */
  aBomb: (data: { id: string; team: ArenaTeam; x: number; z: number; tx: number; tz: number; fuseMs: number }) => void;
  aBombBurst: (data: { id: string; x: number; z: number; targets: string[] }) => void;
  /** Who the game admin is, and the AI players (a new admin, or the count changed) */
  aHost: (data: ArenaHost) => void;
  /** Your kit changed (bought, used, a new round) */
  aKit: (data: ArenaKitView) => void;
  aSnareGone: (data: { id: string; caught: string | null }) => void;
  /** A power hit these cats (for the effect) */
  aStruck: (data: { by: string; kind: ArenaAbilityKind; targets: string[] }) => void;
  aEmote: (data: { id: string; emote: Emote }) => void;
  /** What you got from a round */
  aReward: (data: { points: number; text: string }) => void;
  aKicked: (data: { reason: string }) => void;
  // Sky Brawl
  /** A claw swipe (step 0–2 of the combo) and who it hit */
  aSwipe: (data: { id: string; step: number; ry: number; targets: string[] }) => void;
  /** A cat launched from (x, z) to (tx, tz), flying for ms (beyond the edge: it's going to fall) */
  aLaunch: (data: { id: string; x: number; z: number; tx: number; tz: number; ms: number; by: string | null }) => void;
  aDash: (data: { id: string; x: number; z: number; tx: number; tz: number }) => void;
  /** Someone unleashed their ultimate (for the effect); (tx, tz): where it's aimed or lands */
  aUlt: (data: { id: string; kind: BrawlUltKind; x: number; z: number; ry: number; tx?: number; tz?: number }) => void;
  /** Something's about to strike (x, z) within r, in inMs: a meteor, lightning, an orbital laser, a spell */
  aHazard: (data: { id: string; kind: BrawlHazardKind; x: number; z: number; r: number; inMs: number }) => void;
  aHazardHit: (data: { id: string; kind: BrawlHazardKind; x: number; z: number; r: number; targets: string[] }) => void;
  aPowerUp: (data: BrawlPowerUp) => void;
  aPowerUpGone: (data: { id: string; by: string | null }) => void;
  /** An island event starts */
  aEvent: (data: { kind: BrawlEventKind }) => void;
  /** Someone cast their spell (for the effect); (tx, tz): where it's aimed; targets: who it caught */
  aSpell: (data: { id: string; kind: ArenaSpellKind; x: number; z: number; ry: number; tx?: number; tz?: number; targets: string[] }) => void;
  /** Your character's progress changed (XP after a round, an upgrade) */
  aProgress: (data: CharacterProgressView) => void;
};

// ——— Purrla: speaking languages with real people (purrla.kittyhome.org; Socket.IO path "/purrla") ———
//
// Cafés: an always-open table per language (voice and text, up to PURRLA_CAFE_SEATS people).
// Exchanges: two people who each speak what the other is learning, at their own table, taking
// turns: PURRLA_EXCHANGE_MINUTES in one language, then the other.

/** Someone in Purrla right now */
export type PurrlaPerson = {
  id: string;
  name: string;
  look: AvatarLook | null;
  role: Role;
  langs: Languages | null;
  /** The table they're at (null: in the lobby) */
  tableId: string | null;
  /** Said they're 18 or older (only adults do 1:1 exchanges) */
  adult: boolean;
};
export type PurrlaTable = {
  id: string;
  kind: "cafe" | "exchange";
  /** A café's language; an exchange's two languages */
  langs: string[];
  seats: number;
  /** Who's at it (ids) */
  people: string[];
  /** An exchange: whose language it is now, and when it switches (ms since 1970) */
  turn?: { lang: string; endsAt: number; round: number };
};
export type PurrlaMessage = { id: string; tableId: string; from: string; name: string; text: string; at: string };
export type PurrlaAge = "adult" | "teen";

export const PURRLA_CAFE_SEATS = 8;
export const PURRLA_EXCHANGE_MINUTES = 15;
export const PURRLA_MESSAGE_MAX = 300;
/** Cafés that are always open (more open as people learn other languages) */
export const PURRLA_CAFES = ["en", "es", "fr", "de", "ja", "ko", "zh", "pt", "it"] as const;
export const purrlaCafeId = (lang: string) => `cafe-${lang}`;

/** Something to talk about, for every level (said in the table's language) */
export const PURRLA_TOPICS: { level: "starter" | "middle" | "deep"; text: string }[] = [
  { level: "starter", text: "Introduce yourself: your name, where you live, and one thing you like." },
  { level: "starter", text: "What did you eat today?" },
  { level: "starter", text: "Describe your room, or the place you're in right now." },
  { level: "starter", text: "What's the weather like where you are?" },
  { level: "starter", text: "Tell us about your family or your pets." },
  { level: "middle", text: "Talk about a trip you remember well." },
  { level: "middle", text: "What's a hobby you'd like to start, and why?" },
  { level: "middle", text: "Describe your favorite movie or show without saying its name." },
  { level: "middle", text: "What does a perfect weekend look like for you?" },
  { level: "middle", text: "Which food from your country should everyone try?" },
  { level: "deep", text: "Is it better to live in a city or in the countryside?" },
  { level: "deep", text: "What would you change about how schools teach languages?" },
  { level: "deep", text: "Will people still learn languages when machines translate everything?" },
  { level: "deep", text: "What's a tradition in your culture that visitors find surprising?" },
];

export type PurrlaServerToClient = {
  /** On connecting: you (null: not signed in), everyone here, the tables, and whether voice works */
  hello: (data: { self: PurrlaPerson | null; age: PurrlaAge | null; people: PurrlaPerson[]; tables: PurrlaTable[]; voice: boolean }) => void;
  /** Someone arrived, or changed (their table, their languages) */
  person: (person: PurrlaPerson) => void;
  personLeft: (data: { id: string }) => void;
  /** The tables changed (who's at them, an exchange's turn) */
  tables: (tables: PurrlaTable[]) => void;
  /** A message at your table */
  message: (message: PurrlaMessage) => void;
  /** Someone invites you to an exchange */
  invite: (data: { inviteId: string; from: PurrlaPerson; langs: string[] }) => void;
  /** Your invite was answered (accepted: you're both at the new table) */
  inviteAnswered: (data: { inviteId: string; accepted: boolean; tableId?: string }) => void;
  /** A note for you (removed from a table, muted…) */
  notice: (data: { text: string }) => void;
};

type PurrlaAck<T = object> = (result: ({ ok: true } & T) | { ok: false; error: string; join?: true; age?: true }) => void;
export type PurrlaClientToServer = {
  /** Sit at a table (leaving the one you're at) */
  join: (data: { tableId: string }, ack: PurrlaAck<{ table: PurrlaTable; messages: PurrlaMessage[] }>) => void;
  /** Back to the lobby */
  leave: (ack?: PurrlaAck) => void;
  say: (data: { text: string }, ack: PurrlaAck) => void;
  /** A pass for your table's voice call */
  voice: (ack: PurrlaAck<{ url: string; token: string; canSpeak: boolean }>) => void;
  /** Invite someone to an exchange (both adults, each speaks what the other learns) */
  invite: (data: { peerId: string }, ack: PurrlaAck<{ inviteId: string }>) => void;
  answer: (data: { inviteId: string; accept: boolean }, ack: PurrlaAck<{ tableId?: string }>) => void;
  /** How old you are, asked once */
  setAge: (data: { age: PurrlaAge }, ack: PurrlaAck) => void;
  setLanguages: (data: { langs: Languages | null }, ack: PurrlaAck<{ langs: Languages | null }>) => void;
  report: (data: { targetId: string; reason: PlayerReportReason; detail?: string; block?: boolean }, ack: PurrlaAck<{ blocked: boolean }>) => void;
};
