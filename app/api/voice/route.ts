export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { voiceProfileSchema } from "@/lib/validations/voice";
import { embedVoiceProfile } from "@/lib/ai/embeddings";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("voice_profiles")
      .select("id, name, description, tone, example_posts, is_default, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single();

    const { count } = await supabase
      .from("voice_profiles")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const limits: Record<string, number> = { free: 1, starter: 3, pro: 999 };
    const maxProfiles = limits[profile?.plan || "free"] || 1;

    if ((count || 0) >= maxProfiles) {
      return NextResponse.json(
        { error: `Your plan allows ${maxProfiles} voice profile${maxProfiles > 1 ? "s" : ""}. Upgrade to add more.` },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = voiceProfileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, description, tone, example_posts, is_default } = validation.data;

    const { data, error } = await supabase
      .from("voice_profiles")
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        tone,
        example_posts,
        is_default: is_default || false,
      })
      .select("id, name, description, tone, example_posts, is_default, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data && example_posts.length > 0) {
      embedVoiceProfile(data.id, example_posts).catch(console.error);
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json({ error: "Profile ID is required" }, { status: 400 });
    }

    const validation = voiceProfileSchema.safeParse(fields);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, description, tone, example_posts, is_default } = validation.data;

    const { data, error } = await supabase
      .from("voice_profiles")
      .update({
        name,
        description: description || null,
        tone,
        example_posts,
        is_default: is_default || false,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, name, description, tone, example_posts, is_default, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Voice profile not found" }, { status: 404 });
    }

    if (example_posts.length > 0) {
      embedVoiceProfile(data.id, example_posts).catch(console.error);
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Profile ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("voice_profiles")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
