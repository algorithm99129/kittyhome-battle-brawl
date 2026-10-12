// Copied from kittyhome-shared (src/plans.ts) by `npm run sync:shared` in the parent repo.
// Don't edit this copy: change shared/src/plans.ts and sync.
/**
 * The Chrome extension's plans: Free, Pro and Ultimate. What each one can do, its daily allowance and
 * its price. Core enforces them (and bills them through Stripe); the extension and the website's
 * pricing page show them. Prices are about half what popular AI writing assistants charge.
 */

export const ASSIST_STYLES = ["friendly", "professional", "funny", "casual", "formal", "persuasive", "empathetic"] as const;
export const ASSIST_LENGTHS = ["short", "medium", "long"] as const;
export const ASSIST_TASKS = ["translate", "explain", "complete", "compose", "summarize", "replies", "subject", "digest", "humanize"] as const;
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
  /** Written answers come from the stronger model (suggestions while typing stay on the fast one) */
  bestModel: boolean;
  /** "Your voice": your own instructions, applied to everything it writes, and the writing style it learns from samples you give it */
  voice: boolean;
};

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

const FREE_TASKS: readonly AssistTask[] = ["translate", "explain", "complete", "compose", "summarize", "replies"];

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
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "For people who write all day",
    price: { month: 999, year: 5999 },
    limits: {
      dailyRequests: 300,
      maxInput: 4000,
      tasks: ASSIST_TASKS,
      styles: ASSIST_STYLES,
      lengths: ASSIST_LENGTHS,
      bestModel: false,
      voice: false,
    },
  },
  ultimate: {
    id: "ultimate",
    name: "Ultimate",
    tagline: "Our best writing, sounding like you",
    price: { month: 1999, year: 14999 },
    limits: {
      dailyRequests: 1000,
      maxInput: 12000,
      tasks: ASSIST_TASKS,
      styles: ASSIST_STYLES,
      lengths: ASSIST_LENGTHS,
      bestModel: true,
      voice: true,
    },
  },
};

/** "Your voice" instructions: at most this many characters */
export const VOICE_MAX = 400;

export const isPlanId = (value: unknown): value is PlanId => PLAN_IDS.includes(value as PlanId);
export const isPaidPlan = (value: unknown): value is PaidPlanId => value === "pro" || value === "ultimate";
export const planRank = (id: PlanId) => PLAN_IDS.indexOf(id);

/** The cheapest plan that has this task, style or length */
export function planFor(need: { task?: AssistTask; style?: AssistStyle; length?: AssistLength; voice?: boolean }): PlanId {
  return (
    PLAN_IDS.find((id) => {
      const l = PLANS[id].limits;
      return (
        (!need.task || l.tasks.includes(need.task)) &&
        (!need.style || l.styles.includes(need.style)) &&
        (!need.length || l.lengths.includes(need.length)) &&
        (!need.voice || l.voice)
      );
    }) ?? "ultimate"
  );
}

/** "$9.99" */
export const dollars = (cents: number) => `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;

/** A yearly price per month, rounded down to the cent: "$4.99" */
export const perMonth = (yearCents: number) => dollars(Math.floor(yearCents / 12));

/** How much a year saves against paying monthly, in whole percent */
export const yearlySaving = (plan: Plan) => (plan.price.month ? Math.round((1 - plan.price.year / (plan.price.month * 12)) * 100) : 0);

/** Someone's plan, as core reports it (GET /billing/plan, /assist/quota) */
export type PlanStatus = {
  plan: PlanId;
  interval?: BillingInterval;
  /** Paid plans: the subscription's state at Stripe (active, past_due, …) */
  status?: string;
  /** ISO: when it renews, or (cancelAtPeriodEnd) when it ends */
  periodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  /** Has a Stripe customer, so the billing portal can open */
  manageable: boolean;
};
