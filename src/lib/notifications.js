import { supabase } from "./supabase";

/* Busca as notificações mais recentes do usuário autenticado. RLS garante
   que só vêm as do próprio usuário. */
export async function getNotifications(limit = 20) {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, type, read, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getUnreadCount() {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("read", false);

  if (error) throw error;
  return count ?? 0;
}

/* Marca todas de uma vez via função SECURITY DEFINER (evita um UPDATE por
   notificação — ver migration 004). */
export async function markAllNotificationsRead() {
  const { error } = await supabase.rpc("mark_all_notifications_read");
  if (error) throw error;
}
