export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildContentPrompt } from "@/lib/ai/prompt-engine";
import { canGenerate, PLANS } from "@/lib/constants/plans";
import { dispatchWebhookEvent } from "@/lib/webhooks/dispatch";
import type { PlanKey } from "@/lib/constants/plans";

const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_BASE_URL = process.env.AI_BASE_URL || "https://api.morphllm.com/v1";
const AI_MODEL = process.env.AI_MODEL || "morph-glm52-744b";

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
    const { extraction, brandKit, voiceProfile, tone, audience, format } = body;

    if (!extraction || !format) {
      return NextResponse.json(
        { error: "Missing required fields: extraction and format are required." },
        { status: 400 }
      );
    }

    const prompt = buildContentPrompt({
      extraction,
      brandKit: brandKit || null,
      voiceProfile: voiceProfile || null,
      tone: tone || "thought_leader",
      audience: audience || "",
      format,
    });

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

    const aiResponse = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status} ${aiResponse.statusText}`);
    }

    const encoder = new TextEncoder();
    const reader = aiResponse.body!.getReader();
    const decoder = new TextDecoder();

    const readable = new ReadableStream({
      async start(controller) {
        let fullContent = "";
        let streamCompleted = false;
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") continue;
                try {
                  const parsed = JSON.parse(data);
                  const text = parsed.choices?.[0]?.delta?.content || "";
                  if (text) {
                    fullContent += text;
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                    );
                  }
                } catch {}
              }
            }
          }

          streamCompleted = true;

          const { data: generation } = await supabase
            .from("generations")
            .insert({
              user_id: user.id,
              input_type: "raw_text",
              input_content: `Generated via AI prompt-engine (${format})`,
              extracted_content: prompt.slice(0, 500),
              output_format: format,
              output_content: fullContent,
              voice_profile_id: voiceProfile?.id || null,
              model_used: AI_MODEL,
              is_favorite: false,
            })
            .select("id")
            .single();

          if (generation) {
            await supabase.from("usage_log").insert({
              user_id: user.id,
              generation_id: generation.id,
              action: "generation",
              credits_consumed: 1,
            });

            dispatchWebhookEvent(user.id, "generation.completed", {
              generation_id: generation.id,
              format,
              content_preview: fullContent.slice(0, 200),
            }).catch(() => {});
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ done: true, generation_id: generation?.id })}\n\n`
            )
          );
        } catch (err: any) {
          if (!streamCompleted) {
            try { await supabase.rpc("decrement_generations_used", { user_id: user.id }); } catch {}
          }

          const message = err.message || "Generation failed";

          if (message.includes("SAFETY") || message.includes("safety")) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: "Content was blocked by safety filters. Try different tone or audience settings." })}\n\n`
              )
            );
          } else if (message.includes("429") || message.includes("quota") || message.includes("RESOURCE_EXHAUSTED")) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: "AI rate limit reached. Please wait a moment and try again." })}\n\n`
              )
            );
          } else {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
            );
          }
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
    console.error("Generate-content error:", err.message);

    if (err.message?.includes("API_KEY")) {
      return NextResponse.json(
        { error: "AI API key is not configured. Contact support." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Failed to generate content" },
      { status: 500 }
    );
  }
}
