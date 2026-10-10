// Copied from kittyhome-shared (src/protocol.ts) by `npm run sync:shared` in the parent repo.
// Don't edit this copy: change shared/src/protocol.ts and sync.
// The protocol between the community's pages and the KittyHome servers (core and the battle
// servers): shared types, constants and Socket.IO events. The source is kittyhome-shared; every app
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

/** How long a guest visit lasts */
export const GUEST_MINUTES = 3;
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
} as const;
export type AvatarColor = keyof typeof AVATAR_COLORS;

/** gear: shop items worn (see SHOP_ITEMS) */
export type AvatarLook = { style: AvatarStyle; color: AvatarColor; gear?: Gear };

// ——— Coins and the shop ———
//
// Points (the name tag) are lifetime and never go down. Every point earned also adds a coin to
// your wallet, and coins are what you spend: shop items, arcade entry fees, treasure maps.

export const GEAR_SLOTS = ["hat", "face", "trail", "frame"] as const;
export type GearSlot = (typeof GEAR_SLOTS)[number];
export type Gear = Partial<Record<GearSlot, string>>;
export type Rarity = "common" | "rare" | "epic" | "legendary";

/**
 * kind: a slot you wear it in, "fx" for one-off effects everyone sees (used up on use), or
 * "character" for a character you unlock once and can play as from then on (see style).
 * earnedBy: can't be bought; this says how to win it.
 */
export type ShopItem = {
  id: string;
  name: string;
  emoji: string;
  kind: GearSlot | "fx" | "character";
  /** For characters: which one it unlocks */
  style?: AvatarStyle;
  price: number;
  rarity: Rarity;
  description: string;
  earnedBy?: string;
};

export const SHOP_ITEMS: ShopItem[] = [
  // Hats
  { id: "hat-party", name: "Party Hat", emoji: "🥳", kind: "hat", price: 60, rarity: "common", description: "Every day is a party." },
  { id: "hat-beanie", name: "Cozy Beanie", emoji: "🧶", kind: "hat", price: 80, rarity: "common", description: "Warm ears, cool cat." },
  { id: "hat-cap", name: "Coder Cap", emoji: "🧢", kind: "hat", price: 100, rarity: "common", description: "Worn backwards, obviously." },
  { id: "hat-flower", name: "Flower Crown", emoji: "🌸", kind: "hat", price: 120, rarity: "rare", description: "Fresh from Frontend Forest." },
  { id: "hat-headphones", name: "DJ Headphones", emoji: "🎧", kind: "hat", price: 150, rarity: "rare", description: "Hear the beat of Cat Radio." },
  { id: "hat-top", name: "Top Hat", emoji: "🎩", kind: "hat", price: 180, rarity: "rare", description: "For very distinguished kitties." },
  { id: "hat-propeller", name: "Propeller Beanie", emoji: "🌀", kind: "hat", price: 250, rarity: "epic", description: "It spins when you run." },
  { id: "hat-crown", name: "Royal Crown", emoji: "👑", kind: "hat", price: 500, rarity: "legendary", description: "Rule the Grid." },
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
  { id: "face-shades", name: "Cool Shades", emoji: "😎", kind: "face", price: 70, rarity: "common", description: "Too cool for the plaza." },
  { id: "face-nerd", name: "Nerd Glasses", emoji: "🤓", kind: "face", price: 70, rarity: "common", description: "+10 to debugging." },
  { id: "face-hearts", name: "Heart Eyes", emoji: "😍", kind: "face", price: 110, rarity: "rare", description: "In love with the Grid." },
  { id: "face-monocle", name: "Fancy Monocle", emoji: "🧐", kind: "face", price: 140, rarity: "rare", description: "Indubitably." },
  { id: "face-visor", name: "Cyber Visor", emoji: "🥽", kind: "face", price: 300, rarity: "epic", description: "See the matrix." },
  // Trails
  { id: "trail-bubbles", name: "Bubble Trail", emoji: "🫧", kind: "trail", price: 120, rarity: "common", description: "Pop, pop, pop." },
  { id: "trail-sparkle", name: "Sparkle Trail", emoji: "✨", kind: "trail", price: 150, rarity: "rare", description: "Leave a little magic behind." },
  { id: "trail-hearts", name: "Love Trail", emoji: "💕", kind: "trail", price: 150, rarity: "rare", description: "Spread the love." },
  { id: "trail-stars", name: "Star Trail", emoji: "⭐", kind: "trail", price: 180, rarity: "rare", description: "You're a star." },
  { id: "trail-music", name: "Music Trail", emoji: "🎵", kind: "trail", price: 200, rarity: "epic", description: "Every step is a beat." },
  { id: "trail-code", name: "Code Trail", emoji: "💾", kind: "trail", price: 220, rarity: "epic", description: "Leaves 0s and 1s behind." },
  { id: "trail-rainbow", name: "Rainbow Trail", emoji: "🌈", kind: "trail", price: 600, rarity: "legendary", description: "Taste the rainbow." },
  // Name tags
  { id: "frame-sakura", name: "Sakura Tag", emoji: "🌸", kind: "frame", price: 120, rarity: "common", description: "Soft pink petals." },
  { id: "frame-pixel", name: "Pixel Tag", emoji: "👾", kind: "frame", price: 140, rarity: "common", description: "8-bit forever." },
  { id: "frame-neon", name: "Neon Tag", emoji: "💡", kind: "frame", price: 160, rarity: "rare", description: "Glows in the dark." },
  { id: "frame-fire", name: "Fire Tag", emoji: "🔥", kind: "frame", price: 250, rarity: "epic", description: "You're on fire!" },
  { id: "frame-gold", name: "Gold Tag", emoji: "🥇", kind: "frame", price: 300, rarity: "epic", description: "Pure gold." },
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
    id: "frame-helper",
    name: "Helper Tag",
    emoji: "🤝",
    kind: "frame",
    price: 0,
    rarity: "rare",
    description: "For members who help others in the Help Desk.",
    earnedBy: "Reach the Helper rank (15 reputation) by answering questions",
  },
  {
    id: "frame-expert",
    name: "Expert Tag",
    emoji: "🧠",
    kind: "frame",
    price: 0,
    rarity: "epic",
    description: "For trusted helpers whose answers made it into the Knowledge Center.",
    earnedBy: "Reach the Expert rank (100 reputation)",
  },
  {
    id: "frame-sage",
    name: "Sage Tag",
    emoji: "🦉",
    kind: "frame",
    price: 0,
    rarity: "legendary",
    description: "The wisest cats in the Grid.",
    earnedBy: "Reach the Sage rank (300 reputation)",
  },
  {
    id: "frame-founder",
    name: "Founder Tag",
    emoji: "🌟",
    kind: "frame",
    price: 0,
    rarity: "legendary",
    description: "For KittyHome's founding supporters. Your name is on the Founders' Wall too.",
    earnedBy: "Buy $35 or more in coins",
  },
  // Characters: unlocked once, then pick them any time in the wardrobe
  { id: "char-ninja", name: "Ninja", emoji: "🥷", kind: "character", style: "ninja", price: 550, rarity: "epic", description: "Silent paws, and a Shadow Step that teleports you ahead." },
  { id: "char-pirate", name: "Pirate", emoji: "🏴‍☠️", kind: "character", style: "pirate", price: 600, rarity: "epic", description: "Swagger in a tricorn, and fire yourself far ahead with Cannonball." },
  { id: "char-ghost", name: "Ghost", emoji: "👻", kind: "character", style: "ghost", price: 650, rarity: "epic", description: "Float about and spook everyone nearby with Boo." },
  { id: "char-detective", name: "Detective", emoji: "🕵️", kind: "character", style: "detective", price: 700, rarity: "epic", description: "Sniff Out hidden fish and the lost kitten on your radar." },
  { id: "char-knight", name: "Knight", emoji: "🛡️", kind: "character", style: "knight", price: 800, rarity: "legendary", description: "Helmet, shield, and a Shield Bash that boops a whole crowd." },
  { id: "char-dragon", name: "Dragon", emoji: "🐉", kind: "character", style: "dragon", price: 1_000, rarity: "legendary", description: "Wings, horns, and Take Flight to soar across the Grid." },
  // Effects everyone sees (used up)
  { id: "fx-confetti", name: "Confetti Burst", emoji: "🎊", kind: "fx", price: 25, rarity: "common", description: "Pop confetti around you." },
  { id: "fx-fireworks", name: "Fireworks Show", emoji: "🎆", kind: "fx", price: 150, rarity: "epic", description: "Light up the sky for everyone." },
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
export type Wallet = { coins: number; items: string[]; kit?: BattleKit };

// ——— Arcade: mini-games with an entry fee and a prize pot ———

export type GameId = "fish" | "race" | "trivia";
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
    description: "5 quick developer questions. Right and fast wins.",
    fee: 25,
    seconds: 80,
  },
};
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

export type FxKind = "confetti" | "fireworks";

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
  | "shieldbash";

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
  /** Bought coins: a 💛 on their name tag */
  supporter?: SupporterTier;
  /** Days in a row they've come to the Grid (shown from 2) */
  streak?: number;
  /** A helpbot: the question it carries around its topic's part of the Grid */
  help?: { thread: string; title: string; asker: string; answers: number; topic: string };
};

/** Helpbots in the Grid have ids "help:<question id>" */
export const isHelpbotId = (id: string) => id.startsWith("help:");

// ——— Daily streaks: come to the Grid every day ———

/** Coins for day 1, 2, … 7 of a streak; then the week starts over (the count keeps going) */
export const STREAK_REWARDS = [50, 75, 100, 150, 200, 300, 500] as const;
export const streakReward = (count: number) => STREAK_REWARDS[(Math.max(1, count) - 1) % STREAK_REWARDS.length];
/** A freeze covers one missed day; bought with coins */
export const STREAK_FREEZE_PRICE = 300;
export const STREAK_FREEZE_MAX = 2;
export type StreakView = { count: number; best: number; freezes: number; /** Today already counted */ today: boolean };

// ——— Getting started: first things to try, for new members ———

export type QuestId = "look" | "hello" | "mentor" | "boop" | "ask" | "puzzle" | "village" | "build";
export const QUESTS: { id: QuestId; emoji: string; title: string; hint: string }[] = [
  { id: "look", emoji: "🎨", title: "Pick your cat", hint: "Choose a character and color with the 🎨 button" },
  { id: "hello", emoji: "📣", title: "Say hi to the world", hint: "Press Enter and send a broadcast" },
  { id: "mentor", emoji: "🐱", title: "Chat with an AI mentor", hint: "Walk up to a gold cat (Mochi is in the plaza) and press T" },
  { id: "boop", emoji: "🐾", title: "Boop a kitty", hint: "Walk up to another cat and press B" },
  { id: "ask", emoji: "🙋", title: "Ask or answer a question", hint: "Ask for help (Play menu), or answer someone's helpbot" },
  { id: "puzzle", emoji: "🧩", title: "Answer the daily puzzle", hint: "One coding question a day: tap it in Getting started" },
  { id: "village", emoji: "🏘️", title: "Visit someone's village", hint: "Open Villages from the Play menu" },
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

// ——— The Founders' Wall in the plaza (admins can edit its heading, names and order) ———

export type FoundersWallText = { title: string; subtitle: string };
export const FOUNDERS_WALL_TEXT: FoundersWallText = { title: "🌟 FOUNDERS' WALL", subtitle: "Thank you for helping build KittyHome" };
export const FOUNDERS_WALL_LIMITS = { title: 40, subtitle: 80, name: 40, note: 200 } as const;
/** Names the board itself has room for; past this it shows the first ones and "+N more" */
export const FOUNDERS_WALL_SHOWN = 36;

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
  | { kind: "kitten"; id: string; x: number; z: number; following: boolean };

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

/** "pack/name": public/stickers/<pack>/<name>.json in the community app */
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
    /** Names on the Founders' Wall in the plaza, and its heading */
    foundersWall?: string[];
    foundersWallText?: FoundersWallText;
    /** Your daily streak (members) */
    streak?: StreakView;
    /** Your getting-started quests (new members, until they're all done) */
    quests?: QuestsView | null;
  }) => void;
  /** Today's visit continued (or started) your streak */
  streak: (data: StreakView & { reward: number; freezeUsed: boolean }) => void;
  /** Someone's 🔥 on their name tag changed */
  streakBadge: (data: { id: string; streak: number }) => void;
  /** You finished a getting-started quest */
  questDone: (data: QuestsView & { justDone: QuestId; reward: number; bonus: number }) => void;
  /** Someone's supporter badge changed */
  supporter: (data: { id: string; tier: SupporterTier }) => void;
  /** An admin made someone a professional (or a member again): their PRO badge, beam and green dot */
  role: (data: { id: string; role: "member" | "professional" }) => void;
  /** The Founders' Wall has a new name */
  foundersWall: (data: { names: string[]; text?: FoundersWallText }) => void;
  /** Your guest visit is over: your cat has left the world */
  guestOver: (data: { reason: string }) => void;
  joined: (player: PlayerInfo) => void;
  left: (data: { id: string }) => void;
  /** Positions of players who moved, stamped with server time (ms) */
  state: (snapshot: { t: number; p: PositionUpdate[] }) => void;
  /** Sent only to a player whose move was limited; seq is the move it applies to */
  correct: (data: { seq: number; x: number; z: number }) => void;
  shout: (shout: Shout) => void;
  emote: (data: { id: string; emote: Emote }) => void;
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
  shout: (data: { text: string }, ack: (result: { ok: true } | { ok: false; error: string }) => void) => void;
  emote: (data: { emote: Emote }) => void;
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
        | { ok: false; error: string },
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
    ack: (result: { ok: true; replyId: string } | { ok: false; error: string }) => void,
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
  triviaAnswer: (
    data: { matchId: string; index: number; choice: number },
    ack: (result: { ok: true; correct: boolean; points: number } | { ok: false; error: string }) => void,
  ) => void;
  /** Buy a map for the current treasure hunt */
  huntBuyMap: (data: Record<string, never>, ack: (result: { ok: true; wallet: Wallet } | { ok: false; error: string }) => void) => void;
};

// ——— Villages: every member's own little 3D place (community.kittyhome.org/v/<login>) ———
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
  { tiles: 20, price: 400, maxObjects: 140, label: "Garden plot" },
  { tiles: 28, price: 1200, maxObjects: 240, label: "Estate" },
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
  /** Images per village, each up to imageBytes (the community shrinks them before uploading) */
  images: 30,
  imageBytes: 1_500_000,
} as const;

export type VillageCategory = "basic" | "content" | "decor";

export const VILLAGE_ITEMS = {
  // Everyone has these, once each (they can be moved, not removed)
  house: { name: "Home", emoji: "🏠", category: "basic", price: 0, description: "Your name and tagline." },
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
  campfire: { name: "Campfire", emoji: "🔥", category: "decor", price: 60, description: "Gather round." },
  pond: { name: "Pond", emoji: "🐟", category: "decor", price: 150, description: "With fish, of course." },
  arch: { name: "Flower arch", emoji: "🌸", category: "decor", price: 220, description: "A grand entrance." },
  fountain: { name: "Fountain", emoji: "⛲", category: "decor", price: 300, description: "The town square centerpiece." },
  statue: { name: "Cat statue", emoji: "🗿", category: "decor", price: 450, description: "A monument to you." },
  monument: { name: "Golden Paw Monument", emoji: "🏆", category: "decor", price: 0, description: "For KittyHome's village patrons ($75+ in coins)." },
  butterflies: { name: "Butterflies", emoji: "🦋", category: "decor", price: 35, description: "A flutter of color." },
  // Play: things visitors can do something with (bought like decorations)
  bounce: { name: "Bounce pad", emoji: "🤸", category: "decor", price: 80, description: "Boing! Whoever steps on it flies." },
  portal: { name: "Portal", emoji: "🌀", category: "decor", price: 180, description: "Step in, pop out at your next portal." },
  jukebox: { name: "Jukebox", emoji: "📻", category: "decor", price: 120, description: "Plays a tune when someone's near." },
  fireworks: { name: "Fireworks", emoji: "🎆", category: "decor", price: 150, description: "Visitors light a show for everyone here." },
  yarn: { name: "Hidden yarn", emoji: "🧶", category: "decor", price: 20, description: "Hide a few; visitors hunt for them all." },
} as const;
export type VillageKind = keyof typeof VILLAGE_ITEMS;
export const VILLAGE_KINDS = Object.keys(VILLAGE_ITEMS) as VillageKind[];
export type DecorKind = { [K in VillageKind]: (typeof VILLAGE_ITEMS)[K]["category"] extends "decor" ? K : never }[VillageKind];
export const DECOR_KINDS = VILLAGE_KINDS.filter((k) => VILLAGE_ITEMS[k].category === "decor") as DecorKind[];
export const BASIC_KINDS = ["house", "signpost", "mailbox"] as const;
/** Decorations you can't buy: supporters get them (see SUPPORTER_TIERS) */
export const SUPPORTER_DECOR = ["monument"] as const satisfies readonly DecorKind[];
/** Bought items visitors play with (their own tab in the editor) */
export const PLAY_KINDS = ["bounce", "portal", "jukebox", "fireworks", "yarn"] as const satisfies readonly DecorKind[];
/** Sizes an object can be made (tile-sized things and the three basics stay 1×) */
export const VILLAGE_SCALES = [1, 1.5, 2, 3] as const;
export const isScalable = (kind: VillageKind) => !["house", "signpost", "mailbox", "path", "fence"].includes(kind);
/** Melodies a jukebox can play */
export const VILLAGE_TUNES = ["Lullaby", "Hop along", "Mystery", "Fanfare"] as const;

/** Weather-like effects over the whole village: unlocked once with coins, then picked freely */
export const VILLAGE_AMBIENCES = {
  none: { label: "Clear", emoji: "🌤️", price: 0 },
  fireflies: { label: "Fireflies", emoji: "✨", price: 100 },
  petals: { label: "Cherry petals", emoji: "🌸", price: 100 },
  snow: { label: "Snowfall", emoji: "❄️", price: 100 },
  stardust: { label: "Stardust", emoji: "🌟", price: 150 },
  bubbles: { label: "Bubbles", emoji: "🫧", price: 150 },
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
  ambience: VillageAmbience;
  sky: VillageSky;
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
/** Your first regular pack comes with this much extra (0.5 = +50%) */
export const FIRST_PURCHASE_BONUS = 0.5;
export const firstPurchaseBonus = (coins: number) => Math.floor(coins * FIRST_PURCHASE_BONUS);
export const COIN_PACKS: CoinPack[] = [
  { id: "coins-1k", coins: 1_000, usd: "1.00" },
  { id: "coins-5k", coins: 5_000, usd: "5.00", tag: "Popular" },
  { id: "coins-10k", coins: 10_000, usd: "10.00" },
  { id: "coins-25k", coins: 25_000, usd: "25.00" },
  { id: "coins-50k", coins: 50_000, usd: "50.00", tag: "Best for big plans" },
];

export type CoinPurchaseStatus = "pending" | "paid" | "canceled" | "expired";

// ——— Supporters: everyone who buys coins gets rewards as their total grows ———

export type SupporterTier = "supporter" | "backer" | "founder" | "patron" | "mentor";
export type SupporterLevel = { id: SupporterTier; usd: number; name: string; emoji: string; perks: string[] };
export const SUPPORTER_TIERS: SupporterLevel[] = [
  { id: "supporter", usd: 5, name: "Supporter", emoji: "💛", perks: ["A 💛 Supporter badge on your name tag"] },
  { id: "backer", usd: 15, name: "Backer", emoji: "👑", perks: ["The Supporter Hat (never sold in the shop)"] },
  { id: "founder", usd: 35, name: "Founder", emoji: "🌟", perks: ["The Founder name tag (never sold)", "Your name on the Founders' Wall in the plaza"] },
  { id: "patron", usd: 75, name: "Village Patron", emoji: "🏆", perks: ["The Golden Paw Monument for your village"] },
  { id: "mentor", usd: 250, name: "Mentor Circle", emoji: "🎓", perks: ["A 30-minute call with the KittyHome team: code review, career chat or project feedback"] },
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
export type ArenaHost = { hostId: string | null; bots: number; wanted: number | null };
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
    emoji: "⛰️",
    seconds: 120,
    how: "Hold the glowing top: the first team to 5 seconds wins! Yarn knocks cats down the hill, E shoves up close, Space jumps the boulders.",
    tagline: "King of the hill: race up, hold the top, knock everyone else down.",
    maxPlayers: ARENA_MAX_PLAYERS,
    color: "#34d399",
  },
  brawl: {
    name: "Sky Brawl",
    emoji: "🌪️",
    seconds: 180,
    how: "Click/F claws (a 3-hit combo, the last one launches), Q is your power, E dashes, R unleashes your ultimate. Every hit raises damage %: the higher it is, the further you fly. Launch enemies off the island to score!",
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

// The arena's map: a waiting hall in the middle, the blaster colosseum to the west, the summit to the
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
export const SUMMIT_HILL = { x: 64, z: 0, radius: 24, top: 3 };
/** Terraces from the foot to the top */
export const SUMMIT_STEPS = 6;
export const SUMMIT_STEP_HEIGHT = 1.8;
/** Climbing is slower: your speed on the hill's slopes */
export const SUMMIT_CLIMB = 0.6;
/** Summit Rush: the first team to hold the top this long in total wins (score counts milliseconds) */
export const SUMMIT_HOLD_MS = 5000;
/** How high the ground is at a distance r from the summit's middle */
export function summitHeight(r: number) {
  if (r >= SUMMIT_HILL.radius) return 0;
  if (r <= SUMMIT_HILL.top) return SUMMIT_STEPS * SUMMIT_STEP_HEIGHT;
  const ring = (SUMMIT_HILL.radius - SUMMIT_HILL.top) / SUMMIT_STEPS;
  return Math.floor((SUMMIT_HILL.radius - r) / ring) * SUMMIT_STEP_HEIGHT;
}
/** Where each team starts in a game (relative to its area's center) */
export const ARENA_BASES: Record<ArenaGame, Record<ArenaTeam, { x: number; z: number; ry: number }>> = {
  blaster: { red: { x: -24, z: 0, ry: Math.PI / 2 }, blue: { x: 24, z: 0, ry: -Math.PI / 2 } },
  summit: { red: { x: -27, z: 0, ry: Math.PI / 2 }, blue: { x: 27, z: 0, ry: -Math.PI / 2 } },
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

/** Jumping: how long you're in the air (yarn, boulders and shoves pass under you then), and how often */
export const ARENA_JUMP = { airMs: 520, cooldownMs: 1000, height: 1.7 };
/** Rocket Boost: how much faster you run */
export const ARENA_BOOST_SPEED = 1.6;
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
  { level: 2, cost: 150, name: "Quick Paws", emoji: "⏩", description: "Your power recharges 10% faster." },
  { level: 3, cost: 300, name: "Sharp Claws", emoji: "🗡️", description: "Your power and claws hit 12% harder." },
  { level: 4, cost: 500, name: "Spellcraft", emoji: "🔮", description: "Your spell recharges 15% faster and hits 12% harder." },
  { level: 5, cost: 800, name: "Thick Fur", emoji: "🛡️", description: "Tougher: less damage % and shorter knockbacks, and a longer shield when you come back." },
  { level: 6, cost: 1_200, name: "Legend", emoji: "🌟", description: "5% faster, and a golden legend's aura." },
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
const RARITY_POINTS: Record<Rarity, number> = { common: 1, rare: 2, epic: 3, legendary: 4 };
/** What a worn item does in battle: a small perk by its slot, bigger the rarer it is */
export function gearPerk(item: Pick<ShopItem, "kind" | "rarity">): { stat: "powerCd" | "spellCd" | "speed" | "tough"; amount: number; text: string } | null {
  const n = RARITY_POINTS[item.rarity];
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
  /** Knockouts this round (blaster), or time on top (summit, ms) */
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
  /** Summit Rush: who's on top right now (each team's total time on top is its score, in ms) */
  holder?: { id: string; name: string; team: ArenaTeam } | null;
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
  /** Your character's level, upgrades and battle perks */
  progress?: CharacterProgressView;
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
export type ArenaShotKind = "yarn" | "cannon" | "ice" | "orb" | "hook";
/** How a knockout happened (for the knockout feed) */
export type ArenaKoHow = "yarn" | "cannon" | "breath" | "slam" | "bomb" | "claw" | "power" | "ult" | "hazard" | "crumble" | "fall" | "spell";

export type ArenaClient = {
  /** This battle server's rooms */
  aRooms: (ack: (rooms: ArenaRoomInfo[]) => void) => void;
  /** Join the game (the battle server picks a room with space, or the one asked for) */
  aJoin: (data: { game: ArenaGame; room?: number }, ack: (result: { ok: true; welcome: ArenaWelcome } | { ok: false; error: string }) => void) => void;
  /** Leave your room */
  aLeave: () => void;
  /** Sky Brawl: dash (E) and the ultimate (R) */
  aDash: (data: { ry: number }) => void;
  aUlt: (data: { ry: number }) => void;
  /** Your character's spell (G) */
  aSpell: (data: { ry: number }) => void;
  /** Buy your character's next upgrade */
  aUpgrade: (ack: (result: { ok: true } | { ok: false; error: string }) => void) => void;
  /** Where you are; `place` is the last placement the server made (older moves are ignored) */
  aMove: (data: { x: number; z: number; ry: number; place: number }) => void;
  aFire: (data: { ry: number }) => void;
  aJump: () => void;
  aAbility: (data: { ry: number }) => void;
  /** Use a battle item from your kit */
  aItem: (data: { item: BattleItemId; ry: number }, ack: (result: { ok: true } | { ok: false; error: string }) => void) => void;
  /** Buy battle items without leaving the arena */
  aBuyItem: (data: { item: BattleItemId; qty: number }, ack: (result: { ok: true } | { ok: false; error: string }) => void) => void;
  aShove: () => void;
  aEmote: (data: { emote: Emote }) => void;
  /** The tab went to the background (or came back): time in the community only counts in view */
  aPresence: (data: { away: boolean }) => void;
  /** Game admin only: how many AI players (null: automatic) */
  aSetBots: (data: { count: number | null }, ack: (result: { ok: true } | { ok: false; error: string }) => void) => void;
};
export type ArenaServer = {
  /** Everyone's positions, a few times a second: [id, x, z, ry] */
  aState: (data: { t: number; p: [string, number, number, number][] }) => void;
  aJoined: (player: ArenaPlayer) => void;
  aLeft: (data: { id: string }) => void;
  /** A player's team, health, knockout or effects changed */
  aPlayer: (player: ArenaPlayer) => void;
  aRound: (round: ArenaRound) => void;
  /** The server put you somewhere (round start, respawn, a shove, a blink): go there */
  aPlace: (data: { x: number; z: number; ry: number; place: number; stunnedMs?: number; glideMs?: number }) => void;
  aShot: (data: { id: string; by: string; team: ArenaTeam; x: number; z: number; ry: number; speed: number; range: number; kind: ArenaShotKind }) => void;
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
  aShoved: (data: { by: string; target: string }) => void;
  /** A power hit these cats (for the effect) */
  aStruck: (data: { by: string; kind: ArenaAbilityKind; targets: string[] }) => void;
  aBoulder: (data: { id: string; x: number; z: number; dx: number; dz: number; speed: number }) => void;
  aBoulderGone: (data: { id: string }) => void;
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
// ——— Helpbots & the Knowledge Center (see docs/helpbots-knowledge-center.md) ———
//
// Ask a question and a helpbot (a little cat carrying it) wanders its topic's district of the Grid
// until the asker accepts an answer. Then the thread is summarized, a professional verifies it, and it's published
// to the Knowledge Center, where the Librarian (a search bot) finds it for everyone.

export const HELP_LIMITS = {
  title: 120,
  body: 8_000,
  comment: 1_000,
  tags: 5,
  tag: 24,
  /** Helpbots out at once in a topic's district; more questions wait in line */
  alivePerTopic: 10,
  /** Questions alive or waiting per person */
  openPerUser: 3,
  askPerDay: 5,
  /** Between two posts (answers, comments, details) */
  postGapMs: 20_000,
  postsPerDay: 60,
  /** A question with no activity for this long retires (its helpbot leaves) */
  idleDays: 14,
  /** Answers that earn points, per day */
  answersPaidPerDay: 5,
  /** A verifier's note when sending an entry back */
  note: 600,
  /** What you type to the Librarian */
  search: 300,
} as const;

/**
 * waiting: in line for a slot in its village (it can still be answered); open: its helpbot is out;
 * accepted: the asker accepted an answer (the helpbot left), waiting for a professional to verify;
 * verified: in the Knowledge Center; closed: the asker closed it, or it went quiet for too long.
 */
export type HelpStatus = "waiting" | "open" | "accepted" | "verified" | "closed";

export type HelpTopic = {
  slug: string;
  name: string;
  emoji: string;
  /** For chips and the tower's floors */
  color: string;
  description: string;
  /** Where its helpbots wander in the Grid: the district's name and its circle */
  place: string;
  area: { x: number; z: number; r: number };
  alive: number;
  waiting: number;
  entries: number;
};

export type HelpRankId = "learner" | "helper" | "expert" | "sage";
/** Reputation ranks; each one past Learner comes with a name tag you can't buy */
export const HELP_RANKS: { id: HelpRankId; name: string; emoji: string; rep: number; item: string | null }[] = [
  { id: "learner", name: "Learner", emoji: "🌱", rep: 0, item: null },
  { id: "helper", name: "Helper", emoji: "🤝", rep: 15, item: "frame-helper" },
  { id: "expert", name: "Expert", emoji: "🧠", rep: 100, item: "frame-expert" },
  { id: "sage", name: "Sage", emoji: "🦉", rep: 300, item: "frame-sage" },
];
export const helpRank = (rep: number) => [...HELP_RANKS].reverse().find((r) => rep >= r.rep) ?? HELP_RANKS[0];
export const HELP_RANK_BY_ID = new Map(HELP_RANKS.map((r) => [r.id, r]));

/** What helping earns (points come with as many coins); rep is reputation */
export const HELP_REWARDS = {
  answer: { points: 2, rep: 1 },
  helpful: { points: 0, rep: 2 },
  accepted: { points: 25, rep: 15 },
  verifiedAnswer: { points: 25, rep: 10 },
  verifiedAsker: { points: 10, rep: 5 },
  verify: { points: 10, rep: 5 },
} as const;
/** Coins for last week's top 3 helpers (paid on Mondays, UTC) */
export const TOP_HELPER_PRIZES = [500, 250, 100];

/** Someone in a thread or an entry */
export type HelpPerson = { id: string; login: string; name: string; role: Role; rank: HelpRankId; frame: string | null };
export type HelpEdit = { body: string; at: string };

/** An answer, or a comment under an answer (parentId) or under the question (parentId null) */
export type HelpPost = {
  id: string;
  kind: "answer" | "comment";
  parentId: string | null;
  author: HelpPerson;
  body: string;
  createdAt: string;
  /** Earlier versions, oldest first (edits keep them) */
  history: HelpEdit[];
  editedAt: string | null;
  /** The asker marked it helpful / accepted it */
  helpful: boolean;
  accepted: boolean;
  /** Hidden by an admin: only the author and admins see the text */
  hidden: boolean;
};

/** A helpbot: who it is (each one in a village looks different) */
export type HelpbotLook = { name: string; look: AvatarLook };

export type HelpThreadCard = {
  id: string;
  title: string;
  topic: string;
  status: HelpStatus;
  asker: HelpPerson;
  tags: string[];
  answers: number;
  bot: HelpbotLook;
  createdAt: string;
  lastActivityAt: string;
  /** Waiting: their place in line (1 = next) */
  queue: number | null;
};

export type HelpThread = HelpThreadCard & {
  body: string;
  history: HelpEdit[];
  editedAt: string | null;
  posts: HelpPost[];
  acceptedId: string | null;
  /** Its entry in the Knowledge Center (a draft until verified) */
  knowledgeId: string | null;
  /** A professional sent the draft back with this note */
  returned: { note: string; by: string; at: string } | null;
  closedReason: "asker" | "idle" | "admin" | null;
  /** What you can do here */
  you: { id: string | null; asker: boolean; canAnswer: boolean; canVerify: boolean; admin: boolean };
};


/** A Knowledge Center entry */
export type KnowledgeEntry = {
  id: string;
  topic: string;
  title: string;
  /** Markdown */
  problem: string;
  solution: string;
  keyPoints: string[];
  tags: string[];
  status: "draft" | "published";
  credits: { asker: HelpPerson | null; answerers: HelpPerson[]; verifier: HelpPerson | null };
  threadId: string;
  helped: number;
  youHelped: boolean;
  views: number;
  /** Drafted by AI (or just copied from the thread when AI is off) */
  aiDrafted: boolean;
  createdAt: string;
  verifiedAt: string | null;
};
export type KnowledgeCard = { id: string; topic: string; title: string; snippet: string; tags: string[]; helped: number; verifier: string | null; verifiedAt: string | null };

/** The Librarian's reply: an answer from the entries it found (cited [1], [2]…), or just the results */
export type LibrarianReply = { answer: string | null; results: KnowledgeCard[]; ai: boolean; suggestTopic: string | null };

export type HelperRow = { id: string; login: string; name: string; rank: HelpRankId; rep: number };
export type HelpersBoard = { week: HelperRow[]; all: HelperRow[]; prizes: number[] };

/** Someone's helping record: their Knowledge Tower and its panel */
export type HelpStats = { rep: number; rank: HelpRankId; asked: number; answers: number; accepted: number; verified: number; reviews: number };
export type TowerFloor = { id: string; title: string; topic: string; color: string; /** they wrote the accepted answer */ answered: boolean; at: string };
export type TowerView = { login: string; name: string; stats: HelpStats; floors: TowerFloor[]; open: HelpThreadCard[] };

/** The review queue for professionals: drafts waiting, oldest first */
export type ReviewItem = { entry: KnowledgeEntry; thread: HelpThreadCard };

/** A title for addresses: "Why does my useEffect run twice?" → "why-does-my-useeffect-run-twice" */
export function slugOf(title: string, fallback = "question") {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // At most 80 characters, ending on a whole word
  const short = slug.length > 80 ? slug.slice(0, 80).replace(/-[^-]*$/, "") : slug;
  return short || fallback;
}
/** A question's page: its id (what finds it) and its title (for people and search engines) */
export const questionPath = (id: string, title: string) => `/q/${id}/${slugOf(title)}`;
/** A Knowledge Center entry's page */
export const entryPath = (id: string, title: string) => `/knowledge/${id}/${slugOf(title, "entry")}`;
