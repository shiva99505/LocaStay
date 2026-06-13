// @ts-nocheck
/**
 * Notification helpers.
 * Reads: user client (RLS-scoped to the signed-in user).
 * Writes: admin/service-role client only — users cannot self-insert notifications.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Notification, NotificationType } from './database.types';

type DB = SupabaseClient<Database>;

/** Fetch notifications for the signed-in user (newest first). */
export async function getNotifications(
  db: DB,
  opts: { unreadOnly?: boolean; limit?: number } = {},
): Promise<Notification[]> {
  const { unreadOnly = false, limit = 50 } = opts;

  let query = db
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) query = query.eq('is_read', false);

  const { data, error } = await query;
  if (error) throw new Error(`getNotifications: ${error.message}`);
  return data ?? [];
}

/** Mark a single notification as read. */
export async function markNotificationRead(db: DB, id: string): Promise<void> {
  const { error } = await db
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) throw new Error(`markNotificationRead: ${error.message}`);
}

/** Mark all notifications as read for the current user. */
export async function markAllNotificationsRead(db: DB, userId: string): Promise<void> {
  const { error } = await db
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw new Error(`markAllNotificationsRead: ${error.message}`);
}

/** Count unread notifications for badge display. */
export async function getUnreadCount(db: DB, userId: string): Promise<number> {
  const { count, error } = await db
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw new Error(`getUnreadCount: ${error.message}`);
  return count ?? 0;
}

// ─── Service-role writes (use admin client) ───────────────────────────────────

export interface CreateNotificationInput {
  userId:  string;
  type:    NotificationType;
  title:   string;
  message: string;
  link?:   string;
}

/** Insert a notification (must be called with the admin/service-role client). */
export async function createNotification(
  db: DB,
  input: CreateNotificationInput,
): Promise<Notification> {
  const { data, error } = await db
    .from('notifications')
    .insert({
      user_id: input.userId,
      type:    input.type,
      title:   input.title,
      message: input.message,
      link:    input.link,
    })
    .select()
    .single();

  if (error) throw new Error(`createNotification: ${error.message}`);
  return data;
}

/** Batch-insert multiple notifications (e.g., rent reminders to all tenants). */
export async function createNotifications(
  db: DB,
  inputs: CreateNotificationInput[],
): Promise<void> {
  if (inputs.length === 0) return;

  const rows = inputs.map(i => ({
    user_id: i.userId,
    type:    i.type,
    title:   i.title,
    message: i.message,
    link:    i.link,
  }));

  const { error } = await db.from('notifications').insert(rows);
  if (error) throw new Error(`createNotifications: ${error.message}`);
}

/** Delete notifications older than `days` (admin cleanup cron). */
export async function purgeOldNotifications(db: DB, days = 90): Promise<void> {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  const { error } = await db
    .from('notifications')
    .delete()
    .lt('created_at', cutoff)
    .eq('is_read', true);

  if (error) throw new Error(`purgeOldNotifications: ${error.message}`);
}
