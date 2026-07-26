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

function toFiniteNumberOrNull(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/* Converte uma linha crua de public.running_workouts (snake_case, campos
   numeric que podem chegar como string) para o formato já usado por todo o
   módulo (camelCase) — o mesmo formato que Dashboard/AnalyticsTab/WorkoutRow
   já esperavam quando os dados vinham do mock local. user_id nunca entra
   aqui: nem é selecionado na consulta. */
export function mapWorkoutRow(row) {
  const distanceKm = toFiniteNumberOrNull(row.distance_km) ?? 0;
  const durationSec = toFiniteNumberOrNull(row.duration_sec) ?? 0;
  const paceFromDb = toFiniteNumberOrNull(row.pace_sec_km);
  // Proteção para registros antigos/incompletos: se o pace salvo estiver
  // ausente ou inválido, recalcula só para exibição (não persiste de volta).
  const paceSecKm = paceFromDb !== null && paceFromDb > 0 ? paceFromDb : computePaceSecKm(durationSec, distanceKm);

  return {
    id: row.id,
    date: row.date,
    type: row.type,
    distanceKm,
    durationSec,
    paceSecKm,
    avgHr: toFiniteNumberOrNull(row.avg_hr),
    calories: toFiniteNumberOrNull(row.calories),
    rpe: toFiniteNumberOrNull(row.rpe),
    notes: row.notes && row.notes.trim() ? row.notes.trim() : null,
    createdAt: row.created_at ?? null,
  };
}

/* Busca os treinos do usuário autenticado. O RLS já garante que só voltam
   registros do próprio usuário (política de select por auth.uid()) — por
   isso nenhum filtro de user_id é necessário aqui, e user_id nem é
   selecionado, então nunca chega aos componentes visuais. */
export async function getRunningWorkouts() {
  const { data, error } = await supabase
    .from("running_workouts")
    .select(`
      id,
      date,
      type,
      distance_km,
      duration_sec,
      pace_sec_km,
      avg_hr,
      calories,
      rpe,
      notes,
      created_at
    `)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (import.meta.env.DEV) console.error("[running_workouts] select falhou:", error);
    throw error;
  }

  return (data ?? []).map(mapWorkoutRow);
}

/* Cadastra um treino de corrida em public.running_workouts para o usuário
   autenticado. O user_id nunca vem de fora: é sempre lido da sessão atual
   via supabase.auth.getUser(), nunca do formulário. Retorna o registro já
   no formato usado pela UI (mesma forma de getRunningWorkouts). */
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

  return mapWorkoutRow(data);
}

/* Traduz erros técnicos (auth ausente, RLS, constraints, rede) para
   mensagens amigáveis em português — o texto original do Supabase nunca
   chega até a UI. O fallback é parametrizável porque o mesmo mapeamento
   serve tanto para o cadastro quanto para a leitura da lista. */
export function mapRunningWorkoutError(error, fallback = "Não foi possível cadastrar o treino. Tente novamente.") {
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
    return "Você não tem permissão para acessar esses dados.";
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
