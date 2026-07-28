import { supabase } from "../../lib/supabase";

function toFiniteNumberOrNull(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/* Converte uma linha crua de public.cycling_workouts (snake_case, campos
   numeric que podem chegar como string) para o formato já usado pelo
   módulo (camelCase) — o mesmo formato que Dashboard/AnalyticsTab/WorkoutRow
   já esperavam quando os dados vinham do window.storage local. user_id
   nunca entra aqui: nem é selecionado na consulta. */
export function mapWorkoutRow(row) {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    title: row.title ?? null,
    source: row.source ?? "manual",
    distanceKm: toFiniteNumberOrNull(row.distance_km) ?? 0,
    durationSec: toFiniteNumberOrNull(row.duration_sec) ?? 0,
    elevationGainM: toFiniteNumberOrNull(row.elevation_gain_m),
    avgHr: toFiniteNumberOrNull(row.avg_hr),
    maxHr: toFiniteNumberOrNull(row.max_hr),
    avgPower: toFiniteNumberOrNull(row.avg_power),
    maxPower: toFiniteNumberOrNull(row.max_power),
    avgCadence: toFiniteNumberOrNull(row.avg_cadence),
    maxCadence: toFiniteNumberOrNull(row.max_cadence),
    calories: toFiniteNumberOrNull(row.calories),
    rpe: toFiniteNumberOrNull(row.rpe),
    notes: row.notes && row.notes.trim() ? row.notes.trim() : null,
    streamData: row.stream_data ?? null,
    createdAt: row.created_at ?? null,
  };
}

const SELECT_COLUMNS = `
  id, date, type, title, source,
  distance_km, duration_sec, elevation_gain_m,
  avg_hr, max_hr, avg_power, max_power, avg_cadence, max_cadence,
  calories, rpe, notes, stream_data, created_at
`;

/* Busca os treinos do usuário autenticado. O RLS já garante que só voltam
   registros do próprio usuário (política de select por auth.uid()) — por
   isso nenhum filtro de user_id é necessário aqui. stream_data não é
   selecionado na listagem (pode ser grande) — só na busca de um treino
   específico, via getCyclingWorkoutById. */
export async function getCyclingWorkouts() {
  const { data, error } = await supabase
    .from("cycling_workouts")
    .select(SELECT_COLUMNS.replace(", stream_data", ""))
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (import.meta.env.DEV) console.error("[cycling_workouts] select falhou:", error);
    throw error;
  }

  return (data ?? []).map(mapWorkoutRow);
}

/* Busca um único treino já com a série temporal completa (stream_data),
   usada na tela de detalhe/gráficos de um treino específico. */
export async function getCyclingWorkoutById(id) {
  const { data, error } = await supabase
    .from("cycling_workouts")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .single();

  if (error) {
    if (import.meta.env.DEV) console.error("[cycling_workouts] select by id falhou:", error);
    throw error;
  }

  return mapWorkoutRow(data);
}

/* Cadastra um treino de ciclismo em public.cycling_workouts para o usuário
   autenticado. O user_id nunca vem de fora: é sempre lido da sessão atual
   via supabase.auth.getUser(), nunca do formulário/parser. Usado tanto
   pelo formulário manual quanto pelo upload de .fit (payload maior, com
   potência/cadência/stream_data preenchidos). */
export async function createCyclingWorkout({
  date, type, distanceKm, durationSec,
  title = null, source = "manual",
  elevationGainM = null, avgHr = null, maxHr = null,
  avgPower = null, maxPower = null, avgCadence = null, maxCadence = null,
  calories = null, rpe = null, notes = null, streamData = null,
}) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("NOT_AUTHENTICATED");
  }

  if (!distanceKm || distanceKm <= 0 || !durationSec || durationSec <= 0) {
    throw new Error("INVALID_DISTANCE_OR_DURATION");
  }

  const { data, error } = await supabase
    .from("cycling_workouts")
    .insert({
      user_id: user.id,
      date,
      type,
      title,
      source,
      distance_km: distanceKm,
      duration_sec: durationSec,
      elevation_gain_m: elevationGainM,
      avg_hr: avgHr,
      max_hr: maxHr,
      avg_power: avgPower,
      max_power: maxPower,
      avg_cadence: avgCadence,
      max_cadence: maxCadence,
      calories,
      rpe,
      notes,
      stream_data: streamData,
    })
    .select(SELECT_COLUMNS.replace(", stream_data", ""))
    .single();

  if (error) {
    if (import.meta.env.DEV) console.error("[cycling_workouts] insert falhou:", error);
    throw error;
  }

  return mapWorkoutRow(data);
}

/* Atualiza um treino existente (usado hoje pra editar título/notas; aceita
   os demais campos também pra suportar uma futura tela de edição
   completa). Não filtra por user_id no client: a política de RLS de
   update é quem garante que só o dono do registro consegue alterá-lo. */
export async function updateCyclingWorkout(id, updates) {
  const patch = {};
  if ("date" in updates) patch.date = updates.date;
  if ("type" in updates) patch.type = updates.type;
  if ("title" in updates) patch.title = updates.title;
  if ("distanceKm" in updates) patch.distance_km = updates.distanceKm;
  if ("durationSec" in updates) patch.duration_sec = updates.durationSec;
  if ("elevationGainM" in updates) patch.elevation_gain_m = updates.elevationGainM;
  if ("avgHr" in updates) patch.avg_hr = updates.avgHr;
  if ("rpe" in updates) patch.rpe = updates.rpe;
  if ("notes" in updates) patch.notes = updates.notes;

  const { data, error } = await supabase
    .from("cycling_workouts")
    .update(patch)
    .eq("id", id)
    .select(SELECT_COLUMNS.replace(", stream_data", ""))
    .single();

  if (error) {
    if (import.meta.env.DEV) console.error("[cycling_workouts] update falhou:", error);
    throw error;
  }

  return mapWorkoutRow(data);
}

/* Exclui um treino de public.cycling_workouts. Mesma lógica de segurança
   do update: a política de RLS de delete é quem restringe a exclusão ao
   dono do registro. */
export async function deleteCyclingWorkout(id) {
  const { error } = await supabase
    .from("cycling_workouts")
    .delete()
    .eq("id", id);

  if (error) {
    if (import.meta.env.DEV) console.error("[cycling_workouts] delete falhou:", error);
    throw error;
  }
}

/* Traduz erros técnicos (auth ausente, RLS, constraints, rede) para
   mensagens amigáveis em português — o texto original do Supabase nunca
   chega até a UI. */
export function mapCyclingWorkoutError(error, fallback = "Não foi possível salvar o treino. Tente novamente.") {
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
