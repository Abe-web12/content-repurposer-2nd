export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { webhookSchema } from "@/lib/validations/webhook";
import type { UserWebhook } from "@/lib/supabase/types";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_webhooks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code === "PGRST116") {
      return NextResponse.json({ data: null });
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as UserWebhook });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = webhookSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        { error: Object.values(firstError).flat()[0] || "Invalid input" },
        { status: 400 },
      );
    }

    const { data: existing } = await supabase
      .from("user_webhooks")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const payload = {
      url: parsed.data.url,
      secret: parsed.data.secret || null,
      is_active: parsed.data.is_active,
      trigger_events: parsed.data.trigger_events,
    };

    let result;

    if (existing) {
      result = await supabase
        .from("user_webhooks")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single();
    } else {
      result = await supabase
        .from("user_webhooks")
        .insert({ ...payload, user_id: user.id, name: "Default" })
        .select("*")
        .single();
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ data: result.data as UserWebhook });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
