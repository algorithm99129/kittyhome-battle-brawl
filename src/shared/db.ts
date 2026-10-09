// Copied from kittyhome-shared (src/db.ts) by `npm run sync:shared` in the parent repo.
// Don't edit this copy: change shared/src/db.ts and sync.
/**
 * The database every KittyHome server shares: its collections and their documents. Core sets it up
 * (indexes, migrations); the battle servers only connect.
 */
import { GridFSBucket, MongoClient, type Collection, type ObjectId } from "mongodb";
import { env } from "./env.js";
import type { ArenaGame, ArenaRoomInfo, AvatarLook, DecorKind, QuestId, SupporterTier, VillageAmbience, VillageObject, VillageSky, VillageTheme } from "./protocol.js";

export type UserRole = "member" | "professional";

/** Coins an admin gave a player, with an optional note */
export type CoinGift = { amount: number; note: string; from: string; at: Date };

export type UserDoc = {
  /** Set when they sign in with GitHub (negative for local dev accounts) */
  githubId?: number;
  /** Google's id for them ("sub"), when they sign in with Google */
  googleId?: string;
  login: string;
  name: string;
  avatarUrl: string;
  /** Primary verified email from GitHub (refreshed on each sign-in). Only for admins and support. */
  email?: string;
  role: UserRole;
  score: number;
  /** Last position in the community world */
  world?: { x: number; z: number; ry: number };
  /** Chosen character in the community world */
  look?: AvatarLook;
  /** Players this user has blocked from messaging them */
  blocked?: ObjectId[];
  /** Can open the admin page (see also ADMIN_LOGINS) */
  admin?: boolean;
  /** Spendable coins: every point earned adds coins; shop items and arcade fees use them */
  coins?: number;
  /** Coin gifts from admins that arrived while they were away (shown when they next join) */
  pendingGifts?: CoinGift[];
  /** Shop items owned (ids from SHOP_ITEMS) */
  items?: string[];
  /** Muted by an admin: can't broadcast or send private messages until then */
  muted?: { until: Date; reason: string; by: string };
  /** Suspended by an admin: can't sign in or join the world */
  banned?: { at: Date; reason: string; by: string };
  /** Last sign-in or visit to the world */
  lastSeenAt?: Date;
  /** No more KittyHome updates by email: they unsubscribed, marked one as spam, or the address bounced */
  emailOptOut?: { at: Date; reason: "unsubscribed" | "complained" | "bounced" };
  /** When the welcome email was sent (only new members get one) */
  welcomeEmailAt?: Date;
  /** When they got the new-member coin gift */
  welcomeGiftAt?: Date;
  /** When their first coin pack's bonus was given (once per member) */
  firstBonusAt?: Date;
  /** Days in a row in the Grid: the count, the best ever, the last UTC day counted, freezes held */
  streak?: { count: number; best: number; lastDay: string; freezes: number };
  /** Getting-started quests they've done, and when they finished them all */
  quests?: Partial<Record<QuestId, Date>>;
  questsDoneAt?: Date;
  /** Their Battle Arena pass runs until */
  arenaPassUntil?: Date;
  /** Battle items and how many of each (BATTLE_ITEMS) */
  battleKit?: Partial<Record<string, number>>;
  /** When they finished the Grid tour (paid once) */
  tourDoneAt?: Date;
  /** Time spent in the community (the Grid and the arena, tabs in view), in ms */
  communityMs?: number;
  /** The last day they used KittyHome at all (the Grid, the puzzle, villages…) */
  lastActiveAt?: Date;
  /** Joined with this member's invite link; both were paid when they settled in */
  invitedBy?: ObjectId;
  inviteRewardedAt?: Date;
  /** Whether the inviter was paid too (not over their monthly limit) */
  inviterPaid?: boolean;
  /** Automatic emails: when each was last sent (streak: the UTC day), and village visits at the last weekly one */
  lifecycle?: { lastAt?: Date; streakDay?: string; nudgeAt?: Date; weeklyAt?: Date; weeklyBase?: number; winbackAt?: Date };
  /** Where their cash referral rewards are paid (USDT) */
  payoutWallet?: { network: "TRC20" | "BEP20" | "ERC20"; address: string; updatedAt: Date };
  /** Real money paid for coins in total, in US cents (every paid purchase, tier or not) */
  spentCents?: number;
  /** Bought coins: their tier, the total (US cents), and when they reached each tier */
  supporter?: { tier: SupporterTier; cents: number; reached: Partial<Record<SupporterTier, Date>> };
  /** Last time they proved they own the email address (signing in with a code or link) */
  emailVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Automatic emails (one of each, edited in the admin page and switched on or off there): welcome when
 * someone joins, streak (their streak is about to end), nudge (day 3, hasn't come back), weekly (people
 * visited their village), winback (a week away). Updates are written and sent to everyone subscribed.
 */
export type AutomaticKind = "welcome" | "streak" | "nudge" | "weekly" | "winback";
export const AUTOMATIC_KINDS: AutomaticKind[] = ["welcome", "streak", "nudge", "weekly", "winback"];
export type EmailKind = AutomaticKind | "update";
export const isAutomatic = (kind: EmailKind): kind is AutomaticKind => kind !== "update";
/** Updates: written as drafts, then sent once; "stopped" if an admin stopped it partway */
export type EmailStatus = "draft" | "sending" | "sent" | "stopped";
/** A short feature row under the text: an emoji, a title and a line */
export type EmailHighlight = { icon: string; title: string; text: string };
export type EmailDoc = {
  kind: EmailKind;
  /** For admins only, e.g. "October update" */
  name: string;
  subject: string;
  /** The line inboxes show after the subject */
  preheader: string;
  heading: string;
  /** Paragraphs; "- " bullets, **bold**, [links](https://…) and {{name}} (their first name) */
  body: string;
  /** The picture at the top: "" (none), "art:<name>" (KittyHome artwork) or "upload:<image id>" */
  cover: string;
  highlights: EmailHighlight[];
  button: { label: string; url: string } | null;
  /** Automatic emails: which one-time content updates have been applied (so they apply once) */
  updates?: string[];
  /** The welcome email goes to new members only while this is on */
  enabled: boolean;
  status: EmailStatus;
  stats: { recipients: number; sent: number; failed: number };
  /** Sending goes through members in _id order; the last one done, so it can resume after a restart */
  cursor?: ObjectId;
  sendStartedAt?: Date;
  sentAt?: Date;
  sentBy?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};
/**
 * A pending email sign-in: a 6-digit code and a one-time link, both hashed. Used once, then gone; the
 * code allows a few wrong guesses. Deleted automatically when it runs out.
 */
export type EmailLoginDoc = {
  email: string;
  codeHash: string;
  tokenHash: string;
  /** Where to go after signing in (one of our frontends) */
  returnTo: string;
  attempts: number;
  /** One-way hash of the IP that asked (to limit how many codes one place can request) */
  visitor: string;
  createdAt: Date;
  expiresAt: Date;
};

/** One email to one member (so a resumed send never sends twice) */
export type EmailSendDoc = { emailId: ObjectId; userId: ObjectId; at: Date; ok: boolean; resendId?: string; error?: string };

export type ShoutDoc = {
  userId: ObjectId;
  login: string;
  name: string;
  role: UserRole;
  text: string;
  x: number;
  z: number;
  createdAt: Date;
  /** The name tag they wore and their supporter tier, when they said it */
  frame?: string;
  supporter?: SupporterTier;
};

export type SessionDoc = {
  tokenHash: string;
  userId: ObjectId;
  createdAt: Date;
  expiresAt: Date;
};

export type PuzzleDoc = {
  date: string;
  title: string;
  question: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  source: "openai" | "fallback";
  createdAt: Date;
};

export type AttemptDoc = {
  userId: ObjectId;
  date: string;
  startedAt: Date;
  answeredAt?: Date;
  choice?: number | null;
  correct?: boolean;
  points?: number;
};

/** Something an admin did, kept for accountability */
export type AdminLogDoc = {
  at: Date;
  actorId: ObjectId;
  actorLogin: string;
  targetId: ObjectId | null;
  targetLogin: string;
  action: string;
  detail: string;
};

/** A private message between two players; pair is both user ids, sorted, joined with ":" */
export type DirectMessageDoc = {
  pair: string;
  from: ObjectId;
  to: ObjectId;
  text: string;
  /** An animated sticker ("pack/name") instead of text */
  sticker?: string;
  at: Date;
};

/** A message in a group room (three or more people); two-person chats use direct_messages */
export type RoomMessageDoc = {
  roomId: string;
  from: ObjectId;
  text: string;
  sticker?: string;
  at: Date;
};

/** A support request from a signed-in user (also posted to Slack) */
export type SupportRequestDoc = {
  userId: ObjectId;
  login: string;
  name: string;
  category: string;
  message: string;
  /** Their account email (from GitHub), if we have it */
  email: string;
  /** Another way to reach them, if they left one (Discord…) */
  contact: string;
  from: "web" | "community";
  page: string;
  userAgent: string;
  createdAt: Date;
  slack: { ok: boolean; error?: string; ts?: string };
};

/** A "Start a project" inquiry from the website (anyone can send one; see src/projects.ts) */
export type ProjectInquiryDoc = {
  name: string;
  email: string;
  company: string;
  services: string[];
  budget: string;
  timeline: string;
  message: string;
  /** Their KittyHome account, if they were signed in */
  userId: ObjectId | null;
  /** A one-way hash of their IP address, only for the per-visitor limit */
  visitor: string;
  page: string;
  userAgent: string;
  createdAt: Date;
  slack: { ok: boolean; error?: string; ts?: string };
};

/** Every change to a wallet, for support and auditing (kept 180 days) */
export type CoinLedgerDoc = {
  userId: ObjectId;
  delta: number;
  reason: string;
  /** Coins after the change */
  balance: number;
  at: Date;
};

/** One player's result in an arcade game played for coins (feeds the Weekend Cup) */
export type ArcadeResultDoc = {
  matchId: string;
  game: string;
  userId: ObjectId;
  name: string;
  place: number;
  players: number;
  won: number;
  at: Date;
};

/** A Weekend Cup that has been paid out, by the Saturday it started (YYYY-MM-DD) */
export type CupPayoutDoc = {
  week: string;
  winners: { userId: ObjectId; name: string; points: number; prize: number }[];
  paidAt: Date;
};

/** A code worth coins, made by an admin (see src/promo.ts); code is stored uppercase */
export type PromoCodeDoc = {
  code: string;
  coins: number;
  expiresAt: Date;
  /** Total redemptions allowed across everyone; null for no cap (each player can still only use it once) */
  maxUses: number | null;
  uses: number;
  /** What it's for, e.g. "Product Hunt launch" (admins only) */
  note: string;
  createdBy: string;
  createdAt: Date;
  /** Switched off early by an admin */
  disabledAt?: Date;
  disabledBy?: string;
};

/** A player used a promo code (one per player per code) */
export type PromoRedemptionDoc = {
  code: string;
  userId: ObjectId;
  login: string;
  name: string;
  coins: number;
  at: Date;
};

// ——— Villages (see src/villages.ts) ———

/** A member's village: one per user, found by their login (lowercase) */
export type VillageDoc = {
  userId: ObjectId;
  login: string;
  name: string;
  title: string;
  bio: string;
  tags: string[];
  theme: VillageTheme;
  /** Plot size in use, and the largest unlocked (indexes into VILLAGE_SIZES) */
  size: number;
  unlocked: number;
  objects: VillageObject[];
  /** Decorations bought (placed or not) */
  inventory: Partial<Record<DecorKind, number>>;
  /** Weather over the village, the ones bought, and the sky (missing: none / live) */
  ambience?: VillageAmbience;
  ambiences?: VillageAmbience[];
  sky?: VillageSky;
  visits: number;
  messages: number;
  likes?: number;
  /** Featured (top of search, the plaza board) until then */
  featuredUntil?: Date;
  /** Closed by a moderator */
  hidden?: { reason: string; by: string; at: Date };
  /** An AI mentor's village (the mentor's id); its content comes from mentorVillages.ts */
  mentor?: string;
  createdAt: Date;
  updatedAt: Date;
};

/** A guestbook message left in a village */
export type VillageMessageDoc = {
  villageId: ObjectId;
  fromUserId: ObjectId;
  fromLogin: string;
  fromName: string;
  text: string;
  at: Date;
};

/** One visitor (a user id, or a hashed address for people who aren't signed in) per village per day */
export type VillageVisitDoc = { villageId: ObjectId; visitor: string; day: string; at: Date };
export type VillageLikeDoc = { villageId: ObjectId; userId: ObjectId; at: Date };

// ——— Coin purchases ———

/** Coins bought with crypto (a CryptumPay order); credited once, when CryptumPay confirms payment */
export type CoinPurchaseDoc = {
  userId: ObjectId;
  login: string;
  packId: string;
  coins: number;
  /** Price in USD, as sent to CryptumPay ("5.00") */
  usd: string;
  /** CryptumPay's merchant order id */
  orderId: string;
  status: "pending" | "paid" | "canceled" | "expired";
  /** The latest customer-order status CryptumPay reported (created, pending, crediting, finished) */
  paymentStatus?: string;
  cryptoCurrency?: string;
  cryptoAmount?: string;
  /** What reached us after CryptumPay's fees, in USD */
  income?: string;
  /** Extra coins from the first-purchase bonus */
  bonus?: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
};

/** A cash referral reward owed to an inviter (REFERRAL_CASH), paid by hand by an admin */
export type ReferralPayoutDoc = {
  inviterId: ObjectId;
  inviterLogin: string;
  /** The friend who joined with their invite and paid */
  inviteeId: ObjectId;
  inviteeLogin: string;
  /** What's owed, in US dollars */
  usd: number;
  /** What the friend had paid in total (US cents) when it became owed */
  friendPaidCents: number;
  status: "owed" | "paid";
  createdAt: Date;
  paidAt?: Date;
  /** The admin who marked it paid, and how (a note) */
  paidBy?: string;
  note?: string;
};

// ——— Careers ———

export type JobType = "full-time" | "part-time" | "contract" | "internship";
export type JobStatus = "draft" | "open" | "closed";
/** A role on the careers page (kittyhome.org/careers/<slug>) */
export type JobDoc = {
  slug: string;
  title: string;
  /** Engineering, Design, Community… */
  team: string;
  /** "Remote", "Remote (Europe)", "Seoul, South Korea"… */
  location: string;
  remote: boolean;
  type: JobType;
  /** Free text, e.g. "$60k–80k a year" (empty: not shown) */
  compensation: string;
  /** One or two sentences for the list */
  summary: string;
  about: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  benefits: string[];
  status: JobStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  closedAt?: Date;
};

export type ApplicationStatus = "new" | "reviewing" | "interview" | "offer" | "hired" | "rejected";
/** Someone applying for a role */
export type JobApplicationDoc = {
  jobId: ObjectId;
  jobTitle: string;
  jobSlug: string;
  name: string;
  email: string;
  location: string;
  links: string[];
  message: string;
  /** Their résumé (PDF in the "files" bucket), if they sent one */
  resumeId: ObjectId | null;
  status: ApplicationStatus;
  /** Only the team sees these */
  notes: string;
  /** One-way hash of their IP, for rate limits */
  visitor: string;
  userAgent: string;
  createdAt: Date;
  updatedAt: Date;
  slack: { ok: boolean; error?: string; ts?: string };
};

/** A booking on the Featured Promenade: queued, then active in a spot, then ended */
export type VillagePromoDoc = {
  villageId: ObjectId;
  userId: ObjectId;
  login: string;
  villageName: string;
  imageId: ObjectId;
  /** Board size in cells */
  w: number;
  h: number;
  days: number;
  /** Coins paid */
  price: number;
  status: "queued" | "active" | "ended" | "cancelled" | "removed";
  slot?: number;
  startsAt?: Date;
  endsAt?: Date;
  createdAt: Date;
};

/** Someone reported a village, one of its objects, or a guestbook message */
export type VillageReportDoc = {
  villageId: ObjectId;
  login: string;
  reporterId: ObjectId;
  reporterLogin: string;
  reason: "spam" | "offensive" | "scam" | "other";
  target: { kind: "village" | "object" | "message"; id?: string };
  /** What was there when it was reported (a short excerpt), so moderators see it even if it changes */
  excerpt: string;
  detail: string;
  at: Date;
  status: "open" | "resolved";
  resolution?: { action: string; by: string; at: Date };
};

/** A sponsor billboard made by an admin (shown in villages and on the plaza's village board) */
export type BillboardDoc = {
  sponsor: string;
  title: string;
  text: string;
  url: string;
  imageId: ObjectId | null;
  active: boolean;
  startsAt: Date;
  endsAt: Date;
  createdBy: string;
  createdAt: Date;
};

/** A player's daily duties (see src/world/duties.ts) */
export type DutyProgressDoc = {
  userId: ObjectId;
  date: string;
  progress: Record<string, number>;
  done: string[];
  fishTaken: number[];
  booped: string[];
  updatedAt: Date;
};

// ——— AI mentor memory (see src/ai/memory.ts) ———

/** Something a mentor remembers about a user: one visit, or a merged long-term summary */
export type MemoryDoc = {
  userId: ObjectId;
  npcId: string;
  kind: "episode" | "longterm";
  /** First person, from the mentor's point of view */
  text: string;
  importance: number; // 1-10
  embedding: number[] | null;
  createdAt: Date;
};

/** A lasting fact about a user; shared by all mentors so they can "gossip" */
export type FactDoc = {
  userId: ObjectId;
  key: string;
  value: string;
  /** Mentor who learned it */
  source: string;
  updatedAt: Date;
};

/** A line of a mentor chat, kept so the user can scroll back (the mentor itself uses memories) */
export type MentorMessageDoc = {
  userId: ObjectId;
  npcId: string;
  role: "user" | "assistant";
  text: string;
  at: Date;
};

/** A joke by Giggles, the comedy cat (see src/ai/jokes.ts) */
export type JokeDoc = {
  text: string;
  source: "openai" | "builtin";
  up: number;
  down: number;
  /** How many players have seen it */
  views: number;
  /** Too many thumbs down: never shown again */
  retired?: boolean;
  createdAt: Date;
};

/** A player saw a joke, and maybe voted on it */
export type JokeViewDoc = {
  userId: ObjectId;
  jokeId: ObjectId;
  vote: 1 | -1 | 0;
  at: Date;
};

/** How well a mentor knows a user */
export type BondDoc = {
  userId: ObjectId;
  npcId: string;
  visits: number;
  rapport: number; // 0-100
  nickname: string;
  insideJokes: string[];
  firstMetAt: Date;
  lastSeenAt: Date;
};

const client = new MongoClient(env.mongoUri);
const db = client.db(env.mongoDb);

export const users: Collection<UserDoc> = db.collection("users");
export const sessions: Collection<SessionDoc> = db.collection("sessions");
export const puzzles: Collection<PuzzleDoc> = db.collection("puzzles");
export const attempts: Collection<AttemptDoc> = db.collection("puzzle_attempts");
export const shouts: Collection<ShoutDoc> = db.collection("world_shouts");
export const dutyProgress: Collection<DutyProgressDoc> = db.collection("duty_progress");
export const directMessages: Collection<DirectMessageDoc> = db.collection("direct_messages");
export const memories: Collection<MemoryDoc> = db.collection("mentor_memories");
export const facts: Collection<FactDoc> = db.collection("user_facts");
export const bonds: Collection<BondDoc> = db.collection("mentor_bonds");
export const adminLog: Collection<AdminLogDoc> = db.collection("admin_log");
export const mentorMessages: Collection<MentorMessageDoc> = db.collection("mentor_messages");
export const jokes: Collection<JokeDoc> = db.collection("jokes");
export const roomMessages: Collection<RoomMessageDoc> = db.collection("room_messages");
export const supportRequests: Collection<SupportRequestDoc> = db.collection("support_requests");
export const projectInquiries: Collection<ProjectInquiryDoc> = db.collection("project_inquiries");
export const jokeViews: Collection<JokeViewDoc> = db.collection("joke_views");
export const coinLedger: Collection<CoinLedgerDoc> = db.collection("coin_ledger");
export const arcadeResults: Collection<ArcadeResultDoc> = db.collection("arcade_results");
export const cupPayouts: Collection<CupPayoutDoc> = db.collection("cup_payouts");
export const promoCodes: Collection<PromoCodeDoc> = db.collection("promo_codes");
export const promoRedemptions: Collection<PromoRedemptionDoc> = db.collection("promo_redemptions");
export const villages: Collection<VillageDoc> = db.collection("villages");
export const villageMessages: Collection<VillageMessageDoc> = db.collection("village_messages");
export const villageVisits: Collection<VillageVisitDoc> = db.collection("village_visits");
export const villageLikes: Collection<VillageLikeDoc> = db.collection("village_likes");
export const villagePromos: Collection<VillagePromoDoc> = db.collection("village_promos");
export const jobs: Collection<JobDoc> = db.collection("jobs");
export const coinPurchases: Collection<CoinPurchaseDoc> = db.collection("coin_purchases");
export const referralPayouts: Collection<ReferralPayoutDoc> = db.collection("referral_payouts");
export const jobApplications: Collection<JobApplicationDoc> = db.collection("job_applications");
export const villageReports: Collection<VillageReportDoc> = db.collection("village_reports");
export const billboards: Collection<BillboardDoc> = db.collection("billboards");
export const emails: Collection<EmailDoc> = db.collection("emails");
export const emailSends: Collection<EmailSendDoc> = db.collection("email_sends");
export const emailLogins: Collection<EmailLoginDoc> = db.collection("email_logins");
/** One per member per UTC day they used KittyHome (for retention numbers) */
export const dailyActive: Collection<{ day: string; userId: ObjectId; at: Date }> = db.collection("daily_active");
/** The Founders' Wall: admins' changes to founders (name, note, hidden, place) and names added by hand */
export type WallEntryDoc = {
  /** Added by hand (otherwise it changes how a founder shows) */
  manual: boolean;
  /** The founder, or the member a hand-added name belongs to */
  userId?: ObjectId;
  /** What the wall shows (founders: instead of their account name) */
  name?: string;
  /** For admins only, e.g. "Kickstarter backer #12" */
  note?: string;
  hidden?: boolean;
  /** Wall order (smaller first); defaults to when they got onto the wall */
  position?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};
export const wallEntries: Collection<WallEntryDoc> = db.collection("founders_wall");
/** Messages between the servers (the bus): a wallet or score changed, … Kept a few minutes. */
export type BusDoc = { from: string; kind: string; data: unknown; at: Date };
export const busEvents: Collection<BusDoc> = db.collection("bus_events");
/** Each battle server's heartbeat: where it is and its rooms (core shows them at the gateway) */
export type ArenaServerDoc = { _id: ArenaGame; url: string; rooms: ArenaRoomInfo[]; at: Date; startedAt: Date };
export const arenaServers: Collection<ArenaServerDoc> = db.collection("arena_servers");
/**
 * Battle tickets: core gives a signed-in member one (POST /arena/ticket) and the page hands it to a
 * battle server when it connects. That's how the battle servers know who's connecting without the
 * session cookie, which never reaches them on another domain (e.g. *.onrender.com). Short-lived.
 */
export type ArenaTicketDoc = { tokenHash: string; userId: ObjectId; expiresAt: Date };
export const arenaTickets: Collection<ArenaTicketDoc> = db.collection("arena_tickets");
/** Small site-wide settings, one document each (e.g. "founders-wall": the wall's heading) */
export const settings: Collection<{ _id: string; title?: string; subtitle?: string; updatedAt?: Date }> = db.collection("settings");
/** Uploaded images (village photos, billboard images); metadata: { userId, purpose } */
export const images = new GridFSBucket(db, { bucketName: "images" });
/** Private files (résumés): never served publicly */
export const files = new GridFSBucket(db, { bucketName: "files" });
/** The files' records, to update their metadata */
export const fileRecords = db.collection<{ metadata?: Record<string, unknown> }>("files.files");

let ready = false;
/** True once connected, indexed and migrated (timers that write to the database wait for it) */
export const dbReady = () => ready;

/** Connects; with setup (core), also creates the indexes and runs the migrations */
export async function connectDb({ setup = true }: { setup?: boolean } = {}) {
  await client.connect();
  // The bus's messages only matter for a few minutes
  await busEvents.createIndex({ at: 1 }, { expireAfterSeconds: 300 });
  await arenaTickets.createIndex({ tokenHash: 1 }, { unique: true });
  await arenaTickets.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  if (!setup) {
    ready = true;
    return;
  }
  // Before Google sign-in, every user had a GitHub id and its index covered everyone; now it's
  // only for users who have one. Replace the old index once.
  const old = (await users.indexes().catch(() => [])).find((i) => i.name === "githubId_1");
  if (old && !old.partialFilterExpression) await users.dropIndex("githubId_1");
  await Promise.all([
    // Each GitHub or Google account belongs to one user; users may have either or both
    users.createIndex({ githubId: 1 }, { unique: true, partialFilterExpression: { githubId: { $exists: true } } }),
    users.createIndex({ invitedBy: 1 }, { sparse: true }),
    users.createIndex({ googleId: 1 }, { unique: true, partialFilterExpression: { googleId: { $exists: true } } }),
    users.createIndex({ email: 1 }),
    users.createIndex({ score: -1 }),
    sessions.createIndex({ tokenHash: 1 }, { unique: true }),
    sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    puzzles.createIndex({ date: 1 }, { unique: true }),
    attempts.createIndex({ userId: 1, date: 1 }, { unique: true }),
    // Broadcasts fade from the world after a week
    shouts.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 }),
    dutyProgress.createIndex({ userId: 1, date: 1 }, { unique: true }),
    directMessages.createIndex({ pair: 1, at: -1 }),
    // Private messages are kept for 30 days
    directMessages.createIndex({ at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }),
    // Old days aren't needed
    dutyProgress.createIndex({ updatedAt: 1 }, { expireAfterSeconds: 14 * 24 * 60 * 60 }),
    memories.createIndex({ userId: 1, npcId: 1, createdAt: -1 }),
    facts.createIndex({ userId: 1, key: 1 }, { unique: true }),
    bonds.createIndex({ userId: 1, npcId: 1 }, { unique: true }),
    users.createIndex({ lastSeenAt: -1 }),
    mentorMessages.createIndex({ userId: 1, npcId: 1, at: -1 }),
    jokes.createIndex({ text: 1 }, { unique: true }),
    jokes.createIndex({ up: -1, down: 1 }),
    jokes.createIndex({ views: 1, createdAt: -1 }),
    jokeViews.createIndex({ userId: 1, jokeId: 1 }, { unique: true }),
    roomMessages.createIndex({ roomId: 1, at: -1 }),
    supportRequests.createIndex({ userId: 1, createdAt: -1 }),
    projectInquiries.createIndex({ visitor: 1, createdAt: -1 }),
    projectInquiries.createIndex({ createdAt: -1 }),
    // Group chat messages are kept for 30 days, like private messages
    roomMessages.createIndex({ at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }),
    // Mentor chat history is kept for 30 days, like private messages
    mentorMessages.createIndex({ at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }),
    adminLog.createIndex({ at: -1 }),
    adminLog.createIndex({ targetId: 1, at: -1 }),
    coinLedger.createIndex({ userId: 1, at: -1 }),
    coinLedger.createIndex({ at: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 }),
    arcadeResults.createIndex({ at: -1 }),
    arcadeResults.createIndex({ userId: 1, at: -1 }),
    cupPayouts.createIndex({ week: 1 }, { unique: true }),
    promoCodes.createIndex({ code: 1 }, { unique: true }),
    promoCodes.createIndex({ createdAt: -1 }),
    // The one-use-per-player rule
    promoRedemptions.createIndex({ code: 1, userId: 1 }, { unique: true }),
    promoRedemptions.createIndex({ code: 1, at: -1 }),
    villages.createIndex({ userId: 1 }, { unique: true }),
    villages.createIndex({ login: 1 }, { unique: true }),
    villages.createIndex({ featuredUntil: -1 }),
    villages.createIndex({ visits: -1 }),
    villages.createIndex({ updatedAt: -1 }),
    // Search: names, taglines, tags and bios
    villages.createIndex(
      { name: "text", title: "text", tags: "text", login: "text", bio: "text" },
      { weights: { name: 8, login: 8, tags: 5, title: 4, bio: 1 }, name: "village_search" },
    ),
    villageMessages.createIndex({ villageId: 1, at: -1 }),
    villageMessages.createIndex({ fromUserId: 1, at: -1 }),
    villageVisits.createIndex({ villageId: 1, visitor: 1, day: 1 }, { unique: true }),
    villageLikes.createIndex({ villageId: 1, userId: 1 }, { unique: true }),
    // One board per spot, and one live booking per member
    villagePromos.createIndex({ slot: 1 }, { unique: true, partialFilterExpression: { status: "active" } }),
    villagePromos.createIndex({ userId: 1 }, { unique: true, partialFilterExpression: { status: { $in: ["queued", "active"] } } }),
    villagePromos.createIndex({ status: 1, createdAt: 1 }),
    jobs.createIndex({ slug: 1 }, { unique: true }),
    coinPurchases.createIndex({ orderId: 1 }, { unique: true }),
    // One cash reward per invited friend
    referralPayouts.createIndex({ inviteeId: 1 }, { unique: true }),
    referralPayouts.createIndex({ status: 1, createdAt: -1 }),
    coinPurchases.createIndex({ userId: 1, createdAt: -1 }),
    coinPurchases.createIndex({ status: 1, createdAt: -1 }),
    jobs.createIndex({ status: 1, publishedAt: -1 }),
    jobApplications.createIndex({ jobId: 1, createdAt: -1 }),
    jobApplications.createIndex({ status: 1, createdAt: -1 }),
    jobApplications.createIndex({ visitor: 1, createdAt: -1 }),
    jobApplications.createIndex({ createdAt: 1 }),
    villages.createIndex({ likes: -1 }),
    // Only needed to count a visitor once a day
    villageVisits.createIndex({ at: 1 }, { expireAfterSeconds: 2 * 24 * 60 * 60 }),
    villageReports.createIndex({ status: 1, at: -1 }),
    villageReports.createIndex({ reporterId: 1, at: -1 }),
    billboards.createIndex({ active: 1, endsAt: 1 }),
    emails.createIndex({ kind: 1, createdAt: -1 }),
    emailSends.createIndex({ emailId: 1, userId: 1 }, { unique: true }),
    emailSends.createIndex({ at: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 }),
    emailLogins.createIndex({ tokenHash: 1 }, { unique: true }),
    emailLogins.createIndex({ email: 1, createdAt: -1 }),
    emailLogins.createIndex({ visitor: 1, createdAt: -1 }),
    emailLogins.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    dailyActive.createIndex({ day: 1, userId: 1 }, { unique: true }),
    wallEntries.createIndex({ userId: 1, manual: 1 }),
    dailyActive.createIndex({ userId: 1, day: 1 }),
    dailyActive.createIndex({ at: 1 }, { expireAfterSeconds: 400 * 24 * 60 * 60 }),
  ]);
  // Coins started with the points economy: everyone begins with as many coins as points
  await users.updateMany({ coins: { $exists: false } }, [{ $set: { coins: "$score", items: [] } }]);
  ready = true;
}

export async function closeDb() {
  await client.close();
}

export function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}
