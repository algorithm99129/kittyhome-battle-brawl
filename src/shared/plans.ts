// Copied from kittyhome.shared (src/plans.ts) by `npm run sync:packages` in the parent repo.
// Don't edit this copy: change packages/shared/src/plans.ts and sync.
/**
 * The Chrome extension's plans: Free, Pro and Ultimate. What each one can do, its daily allowance and
 * its price. Core enforces them (and bills them through Stripe); the extension and the website's
 * pricing page show them. Prices are about half what popular AI writing assistants charge.
 */

export const ASSIST_STYLES = ["friendly", "professional", "funny", "casual", "formal", "persuasive", "empathetic"] as const;
export const ASSIST_LENGTHS = ["short", "medium", "long"] as const;
export const ASSIST_TASKS = ["translate", "explain", "complete", "compose", "summarize", "replies", "subject", "digest", "humanize", "answer"] as const;
export type AssistStyle = (typeof ASSIST_STYLES)[number];
export type AssistLength = (typeof ASSIST_LENGTHS)[number];
export type AssistTask = (typeof ASSIST_TASKS)[number];

export const PLAN_IDS = ["free", "pro", "ultimate"] as const;
export type PlanId = (typeof PLAN_IDS)[number];
export type PaidPlanId = Exclude<PlanId, "free">;
export type BillingInterval = "month" | "year";

export type PlanLimits = {
  /** Assistant requests a day (repeats from the cache don't count) */
  dailyRequests: number;
  /** Characters of text it reads at once (a selection, a draft, an email); conversations and inboxes get more */
  maxInput: number;
  tasks: readonly AssistTask[];
  styles: readonly AssistStyle[];
  lengths: readonly AssistLength[];
  /**
   * Written answers come from stronger models: long ones from the strongest, the rest from a strong
   * one (suggestions while typing stay on the fast one)
   */
  bestModel: boolean;
  /** "Your voice": your own instructions, applied to everything it writes, and the writing style it learns from samples you give it */
  voice: boolean;
  /**
   * "Look it up": web lookups a day (0: not in the plan). Asked for per request, when writing from a
   * prompt or explaining a selection: the assistant searches the web for the facts it needs and
   * shows its sources. Each one is also a request.
   */
  searches: number;
};

/**
 * Answers that cost much more to make count as more than one request: a web lookup ("Look it up"),
 * and a rewrite in your style ("Make it sound like me", and Ultimate's long answers in your style)
 */
export const REQUEST_WEIGHT = { lookup: 5, inYourStyle: 3 } as const;

/** Writing samples it learns your style from (Ultimate) */
export const STYLE_SAMPLES_MAX = 20;
export const STYLE_SAMPLE_CHARS = { min: 80, max: 6000, total: 30000 } as const;

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  /** In US cents; free is 0 */
  price: Record<BillingInterval, number>;
  limits: PlanLimits;
};

// ("answer": autofill's answers to application questions, like "Why do you want to work here?")
const FREE_TASKS: readonly AssistTask[] = ["translate", "explain", "complete", "compose", "summarize", "replies", "answer"];

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Everyday help to get started",
    price: { month: 0, year: 0 },
    limits: {
      dailyRequests: 25,
      maxInput: 2000,
      tasks: FREE_TASKS,
      styles: ["friendly", "professional", "casual"],
      lengths: ["short", "medium"],
      bestModel: false,
      voice: false,
      searches: 0,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "For people who write all day",
    // (October 2026: from $9.99 and $59.99; subscribers keep the price they signed up at)
    price: { month: 1299, year: 9999 },
    limits: {
      dailyRequests: 300,
      maxInput: 4000,
      tasks: ASSIST_TASKS,
      styles: ASSIST_STYLES,
      lengths: ASSIST_LENGTHS,
      bestModel: false,
      voice: false,
      searches: 10,
    },
  },
  ultimate: {
    id: "ultimate",
    name: "Ultimate",
    tagline: "Our best writing, sounding like you",
    // (October 2026: from $19.99 and $149.99)
    price: { month: 2499, year: 19999 },
    limits: {
      dailyRequests: 1000,
      maxInput: 12000,
      tasks: ASSIST_TASKS,
      styles: ASSIST_STYLES,
      lengths: ASSIST_LENGTHS,
      bestModel: true,
      voice: true,
      searches: 15,
    },
  },
};

/** The tasks that can look things up on the web when asked ("Look it up") */
export const SEARCH_TASKS: readonly AssistTask[] = ["compose", "explain"];
/** Where an answer's facts came from (a looked-up answer shows these) */
export type AssistSource = { title: string; url: string };

/** "Your voice" instructions: at most this many characters */
export const VOICE_MAX = 400;

export const isPlanId = (value: unknown): value is PlanId => PLAN_IDS.includes(value as PlanId);
export const isPaidPlan = (value: unknown): value is PaidPlanId => value === "pro" || value === "ultimate";
export const planRank = (id: PlanId) => PLAN_IDS.indexOf(id);

/** The cheapest plan that has this task, style or length (or looks things up on the web) */
export function planFor(need: { task?: AssistTask; style?: AssistStyle; length?: AssistLength; voice?: boolean; search?: boolean }): PlanId {
  return (
    PLAN_IDS.find((id) => {
      const l = PLANS[id].limits;
      return (
        (!need.task || l.tasks.includes(need.task)) &&
        (!need.style || l.styles.includes(need.style)) &&
        (!need.length || l.lengths.includes(need.length)) &&
        (!need.voice || l.voice) &&
        (!need.search || l.searches > 0)
      );
    }) ?? "ultimate"
  );
}

/** "$9.99" */
export const dollars = (cents: number) => `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;

/** A yearly price per month, rounded down to the cent: "$4.99" */
export const perMonth = (yearCents: number) => dollars(Math.floor(yearCents / 12));

/** Paying with crypto costs this much less, every period (no card fees or chargebacks for us) */
export const CRYPTO_DISCOUNT_PERCENT = 10;

/** A plan's price when paid with crypto, in US cents (to the cent below: $12.99 → $11.69) */
export const cryptoPrice = (plan: PaidPlanId, interval: BillingInterval) => Math.floor((PLANS[plan].price[interval] * (100 - CRYPTO_DISCOUNT_PERCENT)) / 100);

/** How much a year saves against paying monthly, in whole percent */
export const yearlySaving = (plan: Plan) => (plan.price.month ? Math.round((1 - plan.price.year / (plan.price.month * 12)) * 100) : 0);

/** An invoice, as core shows it (the billing page, the invoice page) */
export type InvoiceView = {
  id: string;
  number: string;
  provider: "stripe" | "cryptumpay";
  kind: "new" | "renewal" | "upgrade";
  plan: PaidPlanId;
  interval: BillingInterval;
  periodStart: string;
  periodEnd: string;
  lines: { description: string; amountCents: number }[];
  amountCents: number;
  currency: "usd";
  status: "open" | "paid" | "void";
  autoCharge: boolean;
  dueAt: string;
  issuedAt: string;
  paidAt?: string;
  billTo: { name: string; email: string };
  /** Card: Stripe's own copy of the invoice (and its PDF), once Stripe has made it */
  stripeUrl?: string;
  pdfUrl?: string;
  /** Crypto, once paid: what was sent */
  paidWith?: string;
  /** Signed link to the invoice page (works without signing in) */
  url: string;
};

/** Someone's plan, as core reports it (GET /billing/plan, /assist/quota) */
export type PlanStatus = {
  plan: PlanId;
  interval?: BillingInterval;
  /** Paid plans: the subscription's state (active, past_due, …) */
  status?: string;
  /** ISO: when it renews, or (cancelAtPeriodEnd) when it ends */
  periodEnd?: string;
  /** Card: auto-renew is off. Crypto: cancelled (no more invoices) */
  cancelAtPeriodEnd?: boolean;
  /** Has a Stripe customer, so the billing portal can open (card details, Stripe's own invoices) */
  manageable: boolean;
  /** How the plan is paid: by card (Stripe, renews automatically unless turned off) or with crypto (from invoices) */
  provider?: "stripe" | "cryptumpay";
  /** Crypto: a change that starts with the next period */
  next?: { plan: PaidPlanId; interval: BillingInterval };
  /** An invoice waiting to be paid (crypto, or a card that was declined) */
  due?: { id: string; number: string; amountCents: number; dueAt: string; url: string; provider: "stripe" | "cryptumpay" };
  /** A card plan switching to crypto at the end of the period */
  switching?: "crypto";
  /** Paying with crypto is available */
  crypto?: boolean;
  /** Where the plan comes from: a paid subscription, or a gift from KittyHome (an admin gave it) */
  source?: "subscription" | "gift";
  /** A gift: ISO, when it ends (none: it doesn't) */
  giftUntil?: string;
};
