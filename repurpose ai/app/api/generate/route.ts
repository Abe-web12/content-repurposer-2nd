export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSchema } from "@/lib/validations/generate";
import { generateContentStream } from "@/lib/ai/generate";
import { canGenerate, PLANS } from "@/lib/constants/plans";
import type { VoiceProfile } from "@/lib/supabase/types";
import type { PlanKey } from "@/lib/constants/plans";

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
      .select("plan, generations_used, generations_limit")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const plan = profile.plan as PlanKey;

    if (!canGenerate(plan, profile.generations_used)) {
      return NextResponse.json(
        { error: "Generation limit reached. Upgrade your plan for more." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = generateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { content, output_format, voice_profile_id } = validation.data;

    let voice: VoiceProfile | null = null;

    if (voice_profile_id) {
      const { data: voiceData } = await supabase
        .from("voice_profiles")
        .select("*")
        .eq("id", voice_profile_id)
        .eq("user_id", user.id)
        .single();

      voice = voiceData as VoiceProfile | null;
    }

    const stream = await generateContentStream(output_format, content, voice);

    // Atomic: increment and check limit in one RPC call (prevents race condition
    // where concurrent requests both pass the canGenerate check above).
    // Done AFTER stream init so a Gemini API failure doesn't waste a credit.
    const { data: newCount, error: incrementError } = await supabase.rpc(
      "increment_generations_used",
      { user_id: user.id }
    );

    if (incrementError) {
      return NextResponse.json({ error: "Failed to reserve generation credit" }, { status: 500 });
    }

    const planLimit = PLANS[plan].generations;
    if (planLimit !== -1 && newCount > planLimit) {
      try { await supabase.rpc("decrement_generations_used", { user_id: user.id }); } catch {}
      return NextResponse.json(
        { error: "Generation limit reached. Upgrade your plan for more." },
        { status: 403 }
      );
    }

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        let fullContent = "";
        let streamCompleted = false;

        try {
          // NOTE: If client disconnects mid-stream, the AI model may still
          // generate remaining tokens. At Gemini free tier (~$0.002/generation),
          // this is acceptable cost. Credit was already deducted; it won't be
          // saved to history if stream fails, and credit is refunded.
          for await (const chunk of stream) {
            const text = chunk.text();
            fullContent += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }

          streamCompleted = true;

          // Save the generation
          const { data: generation } = await supabase
            .from("generations")
            .insert({
              user_id: user.id,
              input_type: "raw_text",
              input_content: content.slice(0, 500),
              extracted_content: content,
              output_format,
              output_content: fullContent,
              voice_profile_id: voice_profile_id || null,
              model_used: process.env.AI_MODEL || "gemini-1.5-flash",
              is_favorite: false,
            })
            .select("id")
            .single();

          // Log usage
          if (generation) {
            await supabase.from("usage_log").insert({
              user_id: user.id,
              generation_id: generation.id,
              action: "generation",
              credits_consumed: 1,
            });
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, generation_id: generation?.id })}\n\n`
            )
          );
        } catch (err: any) {
          // If stream failed before completing, refund the credit
          if (!streamCompleted) {
            try { await supabase.rpc("decrement_generations_used", { user_id: user.id }); } catch {}
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: err.message || "Generation failed" })}\n\n`)
          );
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    console.error("Generate error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to generate content" },
      { status: 500 }
    );
  }
}
