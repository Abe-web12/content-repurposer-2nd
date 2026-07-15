import { getStripe, PRICE_IDS } from "./config";
import { getBaseUrl } from "@/lib/utils";

export async function createCheckoutSession({
  customerId,
  priceId,
  userId,
}: {
  customerId: string | null;
  priceId: string;
  userId: string;
}) {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    customer: customerId || undefined,
    customer_email: customerId ? undefined : undefined,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${getBaseUrl()}/dashboard?checkout=success`,
    cancel_url: `${getBaseUrl()}/upgrade?checkout=cancelled`,
    metadata: { user_id: userId },
    subscription_data: {
      metadata: { user_id: userId },
    },
  });

  return session;
}

export async function createPortalSession(customerId: string) {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${getBaseUrl()}/settings`,
  });

  return session;
}

export function getPriceId(planKey: string): string | null {
  if (planKey === "starter") return PRICE_IDS.starter;
  if (planKey === "pro") return PRICE_IDS.pro;
  return null;
}

export function getPlanFromPriceId(priceId: string): string | null {
  if (priceId === PRICE_IDS.starter) return "starter";
  if (priceId === PRICE_IDS.pro) return "pro";
  return null;
}

export async function getCustomerId(userId: string, email: string): Promise<string> {
  const stripe = getStripe();
  const customers = await stripe.customers.list({ email, limit: 1 });
  if (customers.data.length > 0) {
    return customers.data[0].id;
  }
  const customer = await stripe.customers.create({ email, metadata: { user_id: userId } });
  return customer.id;
}
