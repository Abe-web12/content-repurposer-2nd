import Stripe from "stripe";

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(key, {
    typescript: true,
  });
}

export const PRICE_IDS = {
  starter: process.env.STRIPE_STARTER_PRICE_ID || "",
  pro: process.env.STRIPE_PRO_PRICE_ID || "",
} as const;

export const PLANS_MAP: Record<string, { key: string; name: string; generationsLimit: number }> = {
  [PRICE_IDS.starter]: { key: "starter", name: "Starter", generationsLimit: 30 },
  [PRICE_IDS.pro]: { key: "pro", name: "Pro", generationsLimit: -1 },
};

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
