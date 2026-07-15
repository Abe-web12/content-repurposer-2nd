import type { VoiceProfile } from "@/lib/supabase/types";
import type { OutputFormat } from "@/lib/constants/formats";
import { generateStream, generateComplete } from "./provider";
import { buildLinkedInPostPrompt } from "./prompts/linkedin-post";
import { buildTwitterThreadPrompt } from "./prompts/twitter-thread";
import { buildLinkedInCarouselPrompt } from "./prompts/linkedin-carousel";

export function buildPrompt(
  format: OutputFormat,
  content: string,
  voice: VoiceProfile | null
): string {
  switch (format) {
    case "linkedin_post":
      return buildLinkedInPostPrompt(content, voice);
    case "twitter_thread":
      return buildTwitterThreadPrompt(content, voice);
    case "linkedin_carousel":
      return buildLinkedInCarouselPrompt(content, voice);
    default:
      throw new Error(`Unknown output format: ${format}`);
  }
}

export async function generateContentStream(
  format: OutputFormat,
  analyzedContent: string,
  voice: VoiceProfile | null
) {
  const prompt = buildPrompt(format, analyzedContent, voice);
  return generateStream(prompt);
}

export async function generateContentComplete(
  format: OutputFormat,
  analyzedContent: string,
  voice: VoiceProfile | null
) {
  const prompt = buildPrompt(format, analyzedContent, voice);
  return generateComplete(prompt);
}
