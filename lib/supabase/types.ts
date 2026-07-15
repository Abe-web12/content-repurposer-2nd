
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  tone_profile: Record<string, unknown>;
  plan: "free" | "starter" | "pro";
  generations_used: number;
  generations_limit: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface VoiceProfile {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  tone: "formal" | "casual" | "witty" | "authoritative" | "friendly";
  example_posts: string[];
  embedding: number[] | null;
  is_default: boolean;
  created_at: string;
}

export interface Generation {
  id: string;
  user_id: string;
  input_type: "youtube_url" | "blog_url" | "podcast_url" | "raw_text";
  input_content: string;
  extracted_content: string | null;
  output_format: "linkedin_post" | "linkedin_carousel" | "twitter_thread";
  output_content: string;
  voice_profile_id: string | null;
  voice_profile?: VoiceProfile | null;
  tokens_used: number | null;
  model_used: string | null;
  is_favorite: boolean;
  created_at: string;
}

export interface BrandKit {
  id: string;
  user_id: string;
  company_name: string;
  brand_colors: string[];
  brand_voice: string;
  logo_url: string;
  created_at: string;
  updated_at: string;
}

export type ScheduledPostStatus = "draft" | "scheduled" | "posted";
export type ScheduledPlatform = "linkedin" | "twitter" | "blog" | "other";

export interface ScheduledPost {
  id: string;
  user_id: string;
  content: string;
  platform: ScheduledPlatform;
  scheduled_at: string;
  status: ScheduledPostStatus;
  created_at: string;
  updated_at: string;
}

export type WebhookTriggerEvent =
  | "generation.completed"
  | "schedule.created"
  | "scheduled.posted"
  | "content.published";

export interface UserWebhook {
  id: string;
  user_id: string;
  name: string;
  url: string;
  secret: string | null;
  trigger_events: WebhookTriggerEvent[];
  is_active: boolean;
  retry_count: number;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageLog {
  id: string;
  user_id: string;
  generation_id: string | null;
  action: "generation" | "regeneration";
  credits_consumed: number;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      voice_profiles: {
        Row: VoiceProfile;
        Insert: Omit<VoiceProfile, "id" | "created_at">;
        Update: Partial<Omit<VoiceProfile, "id" | "user_id" | "created_at">>;
      };
      brand_kits: {
        Row: BrandKit;
        Insert: Omit<BrandKit, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<BrandKit, "id" | "user_id" | "created_at">>;
      };
      generations: {
        Row: Generation;
        Insert: Omit<Generation, "id" | "created_at" | "voice_profile">;
        Update: Partial<Omit<Generation, "id" | "user_id" | "created_at">>;
      };
      scheduled_posts: {
        Row: ScheduledPost;
        Insert: Omit<ScheduledPost, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ScheduledPost, "id" | "user_id" | "created_at">>;
      };
      user_webhooks: {
        Row: UserWebhook;
        Insert: Omit<UserWebhook, "id" | "created_at" | "updated_at" | "retry_count" | "last_success_at" | "last_failure_at" | "last_error">;
        Update: Partial<Omit<UserWebhook, "id" | "user_id" | "created_at">>;
      };
      usage_log: {
        Row: UsageLog;
        Insert: Omit<UsageLog, "id" | "created_at">;
        Update: never;
      };
    };
  };
}