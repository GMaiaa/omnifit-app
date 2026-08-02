import { supabase } from "../lib/supabase";

/* Checa se o usuário atual é admin — usada pra decidir se mostra a aba
   Admin na navegação. Não expõe nenhum dado sensível, só um booleano. */
export async function isCurrentUserAdmin() {
  try {
    const { data, error } = await supabase.rpc("is_current_user_admin");
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}

/* Busca as métricas gerais do produto (usuários, treinos, conexões com o
   Strava). Lança se o usuário não for admin — as próprias funções no
   banco fazem essa checagem, então isso nunca deveria disparar pra
   ninguém que não tenha passado por isCurrentUserAdmin() antes. */
export async function getAdminOverview() {
  const { data, error } = await supabase.rpc("admin_get_overview");
  if (error) throw error;
  return data;
}

export async function getAdminDailyActivity(days = 30) {
  const { data, error } = await supabase.rpc("admin_get_daily_activity", { days });
  if (error) throw error;
  return (data ?? []).map((row) => ({ day: row.day, count: Number(row.count) }));
}

export async function getAdminStravaApiUsage() {
  const { data, error } = await supabase.rpc("admin_get_strava_api_usage");
  if (error) throw error;
  return data;
}
