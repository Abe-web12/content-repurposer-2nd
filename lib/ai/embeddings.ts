import { generateEmbedding } from "./provider";
import { createAdminClient } from "@/lib/supabase/admin";

export async function embedVoiceProfile(
  voiceProfileId: string,
  examplePosts: string[]
): Promise<void> {
  if (!examplePosts.length) return;

  const combinedText = examplePosts
    .map((post, i) => `Example ${i + 1}: ${post}`)
    .join("\n\n");

  try {
    const embedding = await generateEmbedding(combinedText);

    const supabase = createAdminClient();

    const { error } = await supabase
      .from("voice_profiles")
      .update({ embedding: embedding as any })
      .eq("id", voiceProfileId);

    if (error) {
      console.error("Failed to store embedding:", error.message);
    }
  } catch (err) {
    console.warn("Embedding skipped:", err instanceof Error ? err.message : "unknown error");
  }
}

export async function findSimilarVoice(
  userId: string,
  inputText: string
): Promise<string | null> {
  try {
    const embedding = await generateEmbedding(inputText.slice(0, 500));

    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("match_voice_profiles", {
      query_embedding: embedding,
      match_user_id: userId,
      match_count: 1,
    });

    if (error || !data?.length) return null;

    return data[0].id;
  } catch {
    return null;
  }
}
