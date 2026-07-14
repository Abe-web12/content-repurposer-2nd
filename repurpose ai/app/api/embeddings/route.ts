export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { embedVoiceProfile } from "@/lib/ai/embeddings";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { voice_profile_id, example_posts } = body;

    if (!voice_profile_id || !example_posts?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await embedVoiceProfile(voice_profile_id, example_posts);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
