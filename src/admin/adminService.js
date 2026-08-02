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

/* Lista usuários com e-mail, quando criaram a conta, quantos treinos e
   logins têm, e se já estão marcados como teste. */
export async function getAdminUsers(limit = 200) {
  const { data, error } = await supabase.rpc("admin_list_users", { result_limit: limit });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.user_id,
    email: row.email,
    createdAt: row.created_at,
    isTest: row.is_test,
    workoutCount: Number(row.workout_count),
    loginCount: Number(row.login_count),
    lastLoginAt: row.last_login_at,
  }));
}

/* Marca/desmarca QUALQUER usuário como teste (diferente de
   setMyTestStatus, que só mexe na própria conta do chamador). */
export async function setUserTestStatus(targetUserId, markAsTest) {
  const { error } = await supabase.rpc("admin_set_user_test_status", {
    target_user_id: targetUserId,
    mark_as_test: markAsTest,
  });
  if (error) throw error;
}

/* Exclui permanentemente a conta de um usuário. Ação sem volta — a
   confirmação já deve ter acontecido na UI antes de chamar isso. */
export async function deleteUserAccount(targetUserId) {
  const { data, error } = await supabase.functions.invoke("admin-delete-user", {
    body: { targetUserId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
