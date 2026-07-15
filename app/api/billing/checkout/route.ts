export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkoutSchema } from "@/lib/validations/billing";
import { createCheckoutSession, getCustomerId, getPriceId } from "@/lib/stripe/helpers";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const priceId = getPriceId(parsed.data.plan);
    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const customerId = profile.stripe_customer_id ||
      await getCustomerId(user.id, profile.email || user.email!);

    const session = await createCheckoutSession({
      customerId,
      priceId,
      userId: user.id,
    });

    if (!customerId && session.customer) {
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: session.customer as string })
        .eq("id", user.id);
    }

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
