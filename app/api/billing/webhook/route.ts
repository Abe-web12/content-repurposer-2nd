export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, STRIPE_WEBHOOK_SECRET, PLANS_MAP } from "@/lib/stripe/config";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }

    const stripe = getStripe();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET) as Stripe.Event;
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const supabase = createAdminClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        if (!userId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;
        const planData = priceId ? PLANS_MAP[priceId] : null;

        if (planData) {
          await supabase.from("profiles").update({
            plan: planData.key,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            generations_limit: planData.generationsLimit,
          }).eq("id", userId);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;
        const customerId = invoice.customer as string;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_subscription_id", subscriptionId)
          .single();

        if (profile) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = sub.items.data[0]?.price.id;
          const planData = priceId ? PLANS_MAP[priceId] : null;

          if (planData) {
            await supabase.from("profiles").update({
              plan: planData.key,
              generations_limit: planData.generationsLimit,
              generations_used: 0,
            }).eq("id", profile.id);
          }
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const subscriptionId = sub.id;
        const status = sub.status;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_subscription_id", subscriptionId)
          .single();

        if (profile) {
          if (status === "active" || status === "trialing") {
            const priceId = sub.items.data[0]?.price.id;
            const planData = priceId ? PLANS_MAP[priceId] : null;

            if (planData) {
              await supabase.from("profiles").update({
                plan: planData.key,
                generations_limit: planData.generationsLimit,
              }).eq("id", profile.id);
            }
          } else {
            await supabase.from("profiles").update({
              plan: "free",
              generations_limit: 3,
              stripe_subscription_id: null,
            }).eq("id", profile.id);
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
