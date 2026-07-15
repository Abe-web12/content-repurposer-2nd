export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { brandKitSchema } from "@/lib/validations/brand-kit";
import type { BrandKit } from "@/lib/supabase/types";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("brand_kits")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code === "PGRST116") {
      return NextResponse.json({ data: null });
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data as BrandKit });
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
    const parsed = brandKitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data: existing } = await supabase
      .from("brand_kits")
      .select("id")
      .eq("user_id", user.id)
      .single();

    let result;

    if (existing) {
      result = await supabase
        .from("brand_kits")
        .update({
          company_name: parsed.data.company_name,
          brand_colors: parsed.data.brand_colors,
          brand_voice: parsed.data.brand_voice,
          logo_url: parsed.data.logo_url,
        })
        .eq("id", existing.id)
        .select("*")
        .single();
    } else {
      result = await supabase
        .from("brand_kits")
        .insert({
          user_id: user.id,
          company_name: parsed.data.company_name,
          brand_colors: parsed.data.brand_colors,
          brand_voice: parsed.data.brand_voice,
          logo_url: parsed.data.logo_url,
        })
        .select("*")
        .single();
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ data: result.data as BrandKit });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
