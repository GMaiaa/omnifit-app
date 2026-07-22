import { supabase } from "../../lib/supabase";

/* Calcula o pace (segundos por km) de forma seguindo as regras de segurança
   pedidas: nunca calcula com distância/duração zeradas e nunca deixa
   escapar NaN/Infinity — quem chamar recebe um inteiro válido ou null. */
export function computePaceSecKm(durationSec, distanceKm) {
  if (!durationSec || durationSec <= 0) return null;
  if (!distanceKm || distanceKm <= 0) return null;
  const pace = durationSec / distanceKm;
  if (!Number.isFinite(pace)) return null;
  return Math.round(pace);
}

/* Cadastra um treino de corrida em public.running_workouts para o usuário
   autenticado. O user_id nunca vem de fora: é sempre lido da sessão atual
   via supabase.auth.getUser(), nunca do formulário. */
export async function createRunningWorkout({
  date, type, distanceKm, durationSec,
  avgHr = null, calories = null, rpe = null, notes = null,
}) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("NOT_AUTHENTICATED");
  }

  const paceSecKm = computePaceSecKm(durationSec, distanceKm);
  if (paceSecKm === null) {
    throw new Error("INVALID_DISTANCE_OR_DURATION");
  }

  const { data, error } = await supabase
    .from("running_workouts")
    .insert({
      user_id: user.id,
      date,
      type,
      distance_km: distanceKm,
      duration_sec: durationSec,
      pace_sec_km: paceSecKm,
      avg_hr: avgHr,
      calories,
      rpe,
      notes,
    })
    .select()
    .single();

  if (error) {
    if (import.meta.env.DEV) console.error("[running_workouts] insert falhou:", error);
    throw error;
  }

  return data;
}

/* Traduz erros técnicos (auth ausente, RLS, constraints, rede) para
   mensagens amigáveis em português — o texto original do Supabase nunca
   chega até a UI. */
export function mapRunningWorkoutError(error) {
  const fallback = "Não foi possível cadastrar o treino. Tente novamente.";
  if (!error) return fallback;

  if (error.message === "NOT_AUTHENTICATED") {
    return "Você precisa estar autenticado para cadastrar um treino.";
  }
  if (error.message === "INVALID_DISTANCE_OR_DURATION") {
    return "Distância e duração precisam ser maiores que zero.";
  }

  const message = String(error.message || "").toLowerCase();
  const code = String(error.code || "");

  if (code === "42501" || message.includes("row-level security")) {
    return "Você não tem permissão para cadastrar este treino.";
  }
  if (code === "23514" || message.includes("violates check constraint")) {
    return "Alguns dados do treino são inválidos. Confira os valores informados.";
  }
  if (code === "23503") {
    return "Não foi possível associar o treino ao seu usuário. Tente entrar novamente.";
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }

  return fallback;
}
