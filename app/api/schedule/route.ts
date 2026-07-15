import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatch";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

    let query = supabase
      .from("scheduled_posts")
      .select("*")
      .eq("user_id", user.id)
      .order("scheduled_at", { ascending: true })
      .limit(limit);

    if (status && ["draft", "scheduled", "posted"].includes(status)) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("Schedule GET error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to load scheduled posts" },
      { status: 500 }
    );
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

    const limit = rateLimitByUser(user.id, { windowMs: 60000, maxRequests: 30 });
    if (!limit.success) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const body = await request.json();
    const { content, platform, scheduled_at, status } = body;

    if (!content || !platform || !scheduled_at) {
      return NextResponse.json(
        { error: "Missing required fields: content, platform, scheduled_at" },
        { status: 400 }
      );
    }

    if (!["linkedin", "twitter", "blog", "other"].includes(platform)) {
      return NextResponse.json(
        { error: "Invalid platform. Must be one of: linkedin, twitter, blog, other" },
        { status: 400 }
      );
    }

    const postStatus = status || "draft";
    if (!["draft", "scheduled", "posted"].includes(postStatus)) {
      return NextResponse.json(
        { error: "Invalid status. Must be one of: draft, scheduled, posted" },
        { status: 400 }
      );
    }

    const scheduledDate = new Date(scheduled_at);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: "Invalid scheduled_at date" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("scheduled_posts")
      .insert({
        user_id: user.id,
        content,
        platform,
        scheduled_at: scheduledDate.toISOString(),
        status: postStatus,
      })
      .select()
      .single();

    if (error) throw error;

    dispatchWebhookEvent(user.id, "schedule.created", {
      post_id: data.id,
      platform: data.platform,
      scheduled_at: data.scheduled_at,
      content_preview: data.content.slice(0, 200),
    }).catch(() => {});

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    console.error("Schedule POST error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to create scheduled post" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
    }

    const allowedFields: Record<string, boolean> = {
      content: true,
      platform: true,
      scheduled_at: true,
      status: true,
    };

    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields[key]) {
        if (key === "platform" && !["linkedin", "twitter", "blog", "other"].includes(value as string)) {
          return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
        }
        if (key === "status" && !["draft", "scheduled", "posted"].includes(value as string)) {
          return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }
        cleanUpdates[key] = value;
      }
    }

    if (Object.keys(cleanUpdates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("scheduled_posts")
      .update(cleanUpdates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error("Schedule PATCH error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to update scheduled post" },
      { status: 500 }
    );
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
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("scheduled_posts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Schedule DELETE error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to delete scheduled post" },
      { status: 500 }
    );
  }
}
