export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimitByUser } from "@/lib/utils/rate-limit";
import ytdl from "@distube/ytdl-core";

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
    /(?:youtu\.be\/)([^?\s]+)/,
    /(?:youtube\.com\/embed\/)([^?\s]+)/,
    /(?:youtube\.com\/shorts\/)([^?\s]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function parseCaptionXml(xml: string): string {
  const segments = xml.match(/<text[^>]*>(.*?)<\/text>/gs) || [];
  return segments
    .map((seg) =>
      seg
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n/g, " ")
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fallbackFetchTranscript(videoId: string): Promise<{ transcript: string; title: string }> {
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetch(watchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) throw new Error("Failed to fetch video page");

  const html = await response.text();

  const captionMatch = html.match(/"captionTracks":\[(.+?)\]/);
  if (!captionMatch) throw new Error("No captions found");

  const captionData = JSON.parse(`[${captionMatch[1]}]`);
  const englishTrack = captionData.find(
    (track: any) => track.languageCode === "en" || track.languageCode?.startsWith("en")
  );

  if (!englishTrack?.baseUrl) throw new Error("No English captions");

  const captionResponse = await fetch(englishTrack.baseUrl, {
    signal: AbortSignal.timeout(10000),
  });
  const captionXml = await captionResponse.text();
  const transcript = parseCaptionXml(captionXml);

  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  const title = titleMatch ? titleMatch[1].replace(" - YouTube", "").trim() : `YouTube Video (${videoId})`;

  return { transcript, title };
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

    const limit = rateLimitByUser(user.id, { windowMs: 60000, maxRequests: 10 });
    if (!limit.success) {
      return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string" || !url.trim()) {
      return NextResponse.json({ error: "Video URL is required." }, { status: 400 });
    }

    const videoId = extractVideoId(url.trim());
    if (!videoId) {
      return NextResponse.json(
        { error: "Invalid YouTube URL. Please provide a valid YouTube video link." },
        { status: 400 }
      );
    }

    let transcript = "";
    let title = `YouTube Video (${videoId})`;

    try {
      const info = await ytdl.getInfo(url.trim());
      title = info.videoDetails.title || title;

      const captionTracks =
        info.player_response?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

      const englishTrack = captionTracks.find(
        (track: any) => track.languageCode === "en" || track.languageCode?.startsWith("en")
      );

      if (englishTrack?.baseUrl) {
        const captionResponse = await fetch(englishTrack.baseUrl, {
          signal: AbortSignal.timeout(10000),
        });
        const captionXml = await captionResponse.text();
        transcript = parseCaptionXml(captionXml);
      }
    } catch {
      try {
        const fallback = await fallbackFetchTranscript(videoId);
        transcript = fallback.transcript;
        title = fallback.title;
      } catch {
        return NextResponse.json(
          {
            error:
              "No captions found for this video. The video may not have captions enabled, be private, or be region-locked. Try pasting the transcript manually using the 'Paste Text' option.",
          },
          { status: 422 }
        );
      }
    }

    if (!transcript || transcript.length < 50) {
      return NextResponse.json(
        {
          error:
            "Could not extract a meaningful transcript. Try a different video or paste the content manually.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      transcript: transcript.slice(0, 15000),
      title,
      wordCount: transcript.split(/\s+/).filter(Boolean).length,
    });
  } catch (err: any) {
    console.error("Transcribe error:", err.message);
    return NextResponse.json(
      { error: err.message || "Failed to transcribe video" },
      { status: 500 }
    );
  }
}
