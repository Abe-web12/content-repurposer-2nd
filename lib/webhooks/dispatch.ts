import { createAdminClient } from "@/lib/supabase/admin";
import { deliverWebhook } from "@/lib/webhooks/trigger";
import type { WebhookTriggerEvent } from "@/lib/supabase/types";

export async function dispatchWebhookEvent(
  userId: string,
  event: WebhookTriggerEvent,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { data: webhooks, error } = await supabase
      .from("user_webhooks")
      .select("id, url, secret")
      .eq("user_id", userId)
      .eq("is_active", true)
      .contains("trigger_events", [event]);

    if (error) {
      console.error(`[Webhook] query failed: user=${userId} event=${event}:`, error.message);
      return;
    }

    if (!webhooks || webhooks.length === 0) return;

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    for (const webhook of webhooks) {
      deliverWebhook(webhook.url, payload, {
        webhookId: webhook.id,
        event,
        secret: webhook.secret,
      }).catch((err: Error) => {
        console.error(`[Webhook] delivery failed: webhook=${webhook.id} event=${event}:`, err.message);
      });
    }
  } catch (err) {
    console.error(`[Webhook] dispatch error: user=${userId} event=${event}:`, (err as Error).message);
  }
}
