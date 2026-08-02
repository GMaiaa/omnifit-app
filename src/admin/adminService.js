import { supabase } from "../lib/supabase";

export async function isCurrentUserAdmin() {
  try {
    const { data, error } = await supabase.rpc("is_current_user_admin");
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}

/* Checa se a conta atual está marcada como "teste" — usado pro item de
   menu no dropdown de perfil (self-serviço, qualquer usuário pode marcar
   a própria conta). */
export async function isCurrentUserTest() {
  try {
    const { data, error } = await supabase.rpc("is_current_user_test");
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}

/* Alterna a própria conta como teste/não-teste. */
export async function setMyTestStatus(markAsTest) {
  const { error } = await supabase.rpc("set_my_test_status", { mark_as_test: markAsTest });
  if (error) throw error;
}

export async function getAdminOverview(excludeTest = true) {
  const { data, error } = await supabase.rpc("admin_get_overview", { exclude_test: excludeTest });
  if (error) throw error;
  return data;
}

export async function getAdminDailyActivity(days = 30, excludeTest = true) {
  const { data, error } = await supabase.rpc("admin_get_daily_activity", { days, exclude_test: excludeTest });
  if (error) throw error;
  return (data ?? []).map((row) => ({ day: row.day, count: Number(row.count) }));
}

export async function getAdminDailyLogins(days = 30, excludeTest = true) {
  const { data, error } = await supabase.rpc("admin_get_daily_logins", { days, exclude_test: excludeTest });
  if (error) throw error;
  return (data ?? []).map((row) => ({ day: row.day, count: Number(row.count) }));
}

export async function getAdminComparisons(excludeTest = true) {
  const { data, error } = await supabase.rpc("admin_get_comparisons", { exclude_test: excludeTest });
  if (error) throw error;
  return data;
}

export async function getAdminStravaApiUsage() {
  const { data, error } = await supabase.rpc("admin_get_strava_api_usage");
  if (error) throw error;
  return data;
}
