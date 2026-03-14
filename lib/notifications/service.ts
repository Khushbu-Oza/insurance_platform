import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationPayload = {
  organization_id: string;
  recipient_user_id?: string | null;
  type?: string;
  title: string;
  message: string;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown>;
};

export async function createNotification(payload: NotificationPayload) {
  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from("notifications")
    .insert({
      organization_id: payload.organization_id,
      recipient_user_id: payload.recipient_user_id ?? null,
      type: payload.type || "system",
      title: payload.title,
      message: payload.message,
      entity_type: payload.entity_type ?? null,
      entity_id: payload.entity_id ?? null,
      metadata: payload.metadata ?? {},
    })
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  return rows?.[0] ?? null;
}

export async function createNotifications(payloads: NotificationPayload[]) {
  if (!payloads.length) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notifications")
    .insert(
      payloads.map((payload) => ({
        organization_id: payload.organization_id,
        recipient_user_id: payload.recipient_user_id ?? null,
        type: payload.type || "system",
        title: payload.title,
        message: payload.message,
        entity_type: payload.entity_type ?? null,
        entity_id: payload.entity_id ?? null,
        metadata: payload.metadata ?? {},
      })),
    )
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export async function markNotificationRead(notificationId: string) {
  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  return rows?.[0] ?? null;
}
