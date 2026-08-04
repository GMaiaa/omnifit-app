import { supabase } from "../lib/supabase";

/* Converte uma linha crua de public.workouts (snake_case, blocos embutidos
   via join) para o formato usado pelos componentes (camelCase). */
export function mapWorkoutRow(row) {
  return {
    id: row.id,
    calendarId: row.calendar_id,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    assignedTo: row.assigned_to,
    title: row.title,
    description: row.description,
    modality: row.modality,
    scheduledDate: row.scheduled_date,
    scheduledTime: row.scheduled_time,
    durationSec: row.duration_sec,
    status: row.status,
    originalScheduledDate: row.original_scheduled_date,
    completedAt: row.completed_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    blocks: (row.workout_blocks || [])
      .slice()
      .sort((a, b) => a.order_index - b.order_index)
      .map(mapBlockRow),
  };
}

function mapBlockRow(row) {
  return {
    id: row.id,
    workoutId: row.workout_id,
    order: row.order_index,
    modality: row.modality,
    title: row.title,
    description: row.description,
    durationSec: row.duration_sec,
    distanceM: row.distance_m,
    sets: row.sets,
    reps: row.reps,
    loadKg: row.load_kg,
    notes: row.notes,
  };
}

/* Busca o calendário do usuário autenticado. Nesta fase (sem
   compartilhamento ainda) cada usuário tem exatamente um — se não existir
   nenhum ainda, cria automaticamente na primeira visita. */
export async function getOrCreateCalendar() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("NOT_AUTHENTICATED");
  }

  const { data: existing, error: selectError } = await supabase
    .from("calendars")
    .select("id, owner_id, name, description, timezone, created_at, updated_at")
    .order("created_at", { ascending: true })
    .limit(1);

  if (selectError) {
    if (import.meta.env.DEV) console.error("[calendars] select falhou:", selectError);
    throw selectError;
  }

  if (existing && existing.length > 0) {
    return mapCalendarRow(existing[0]);
  }

  const { data: created, error: insertError } = await supabase
    .from("calendars")
    .insert({ owner_id: user.id, name: "Meu Calendário" })
    .select()
    .single();

  if (insertError) {
    if (import.meta.env.DEV) console.error("[calendars] insert falhou:", insertError);
    throw insertError;
  }

  return mapCalendarRow(created);
}

function mapCalendarRow(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    timezone: row.timezone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* Busca os treinos de um calendário dentro de um intervalo de datas
   (inclusive dos dois lados) — sempre filtrado por range porque a lista
   completa de um calendário pode crescer indefinidamente com o tempo,
   diferente dos módulos por modalidade que carregam tudo de uma vez. */
export async function getWorkouts(calendarId, { start, end }) {
  const { data, error } = await supabase
    .from("workouts")
    .select("*, workout_blocks(*)")
    .eq("calendar_id", calendarId)
    .gte("scheduled_date", start)
    .lte("scheduled_date", end)
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true, nullsFirst: false });

  if (error) {
    if (import.meta.env.DEV) console.error("[workouts] select falhou:", error);
    throw error;
  }

  return (data ?? []).map(mapWorkoutRow);
}

/* Cadastra um treino planejado (+ blocos/etapas, se houver) em
   public.workouts / public.workout_blocks. created_by/updated_by nunca vêm
   do formulário: são sempre lidos da sessão atual. */
export async function createWorkout({
  calendarId, assignedTo = null, title, description = null, modality = null,
  scheduledDate, scheduledTime = null, durationSec = null, notes = null, blocks = [],
}) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("NOT_AUTHENTICATED");
  }

  if (!title || !title.trim()) {
    throw new Error("INVALID_TITLE");
  }
  if (!scheduledDate) {
    throw new Error("INVALID_DATE");
  }

  const { data: workoutRow, error: insertError } = await supabase
    .from("workouts")
    .insert({
      calendar_id: calendarId,
      created_by: user.id,
      updated_by: user.id,
      assigned_to: assignedTo,
      title: title.trim(),
      description,
      modality,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      duration_sec: durationSec,
      notes,
    })
    .select()
    .single();

  if (insertError) {
    if (import.meta.env.DEV) console.error("[workouts] insert falhou:", insertError);
    throw insertError;
  }

  const insertedBlocks = await replaceWorkoutBlocks(workoutRow.id, blocks);
  return mapWorkoutRow({ ...workoutRow, workout_blocks: insertedBlocks });
}

/* Atualiza um treino existente (edição, reagendamento ou mudança de status
   usam esta mesma função — a trigger do banco decide sozinha, comparando
   antes/depois, se isso conta como "rescheduled" ou "status_changed" no
   histórico). */
export async function updateWorkout(id, {
  assignedTo = null, title, description = null, modality = null,
  scheduledDate, scheduledTime = null, durationSec = null, status = "planned",
  notes = null, blocks = [],
}) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("NOT_AUTHENTICATED");
  }

  if (!title || !title.trim()) {
    throw new Error("INVALID_TITLE");
  }
  if (!scheduledDate) {
    throw new Error("INVALID_DATE");
  }

  const { data: workoutRow, error: updateError } = await supabase
    .from("workouts")
    .update({
      updated_by: user.id,
      assigned_to: assignedTo,
      title: title.trim(),
      description,
      modality,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      duration_sec: durationSec,
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
      notes,
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    if (import.meta.env.DEV) console.error("[workouts] update falhou:", updateError);
    throw updateError;
  }

  const updatedBlocks = await replaceWorkoutBlocks(id, blocks);
  return mapWorkoutRow({ ...workoutRow, workout_blocks: updatedBlocks });
}

/* Atalho pra marcar como concluído/planejado/pulado sem reabrir o
   formulário inteiro — atualiza só o status, preservando o resto. */
export async function updateWorkoutStatus(workout, status) {
  return updateWorkout(workout.id, {
    assignedTo: workout.assignedTo,
    title: workout.title,
    description: workout.description,
    modality: workout.modality,
    scheduledDate: workout.scheduledDate,
    scheduledTime: workout.scheduledTime,
    durationSec: workout.durationSec,
    status,
    notes: workout.notes,
    blocks: workout.blocks,
  });
}

export async function deleteWorkout(id) {
  const { error } = await supabase.from("workouts").delete().eq("id", id);
  if (error) {
    if (import.meta.env.DEV) console.error("[workouts] delete falhou:", error);
    throw error;
  }
}

/* Substitui todos os blocos de um treino pela lista atual — mais simples e
   seguro que tentar diferenciar item a item (poucos blocos por treino, não
   compensa a complexidade de um diff). */
async function replaceWorkoutBlocks(workoutId, blocks) {
  const { error: deleteError } = await supabase.from("workout_blocks").delete().eq("workout_id", workoutId);
  if (deleteError) {
    if (import.meta.env.DEV) console.error("[workout_blocks] delete falhou:", deleteError);
    throw deleteError;
  }

  if (!blocks || blocks.length === 0) return [];

  const rows = blocks.map((b, i) => ({
    workout_id: workoutId,
    order_index: i,
    modality: b.modality || null,
    title: b.title,
    description: b.description || null,
    duration_sec: b.durationSec ?? null,
    distance_m: b.distanceM ?? null,
    sets: b.sets ?? null,
    reps: b.reps ?? null,
    load_kg: b.loadKg ?? null,
    notes: b.notes || null,
  }));

  const { data, error: insertError } = await supabase.from("workout_blocks").insert(rows).select();
  if (insertError) {
    if (import.meta.env.DEV) console.error("[workout_blocks] insert falhou:", insertError);
    throw insertError;
  }
  return data;
}

/* Traduz erros técnicos (auth ausente, RLS, constraints, rede) para
   mensagens amigáveis em português — mesmo padrão de strengthService.js /
   runningService.js. */
export function mapCalendarError(error, fallback = "Não foi possível salvar o treino. Tente novamente.") {
  if (!error) return fallback;

  if (error.message === "NOT_AUTHENTICATED") {
    return "Você precisa estar autenticado para usar o calendário.";
  }
  if (error.message === "INVALID_TITLE") {
    return "Dê um título para o treino.";
  }
  if (error.message === "INVALID_DATE") {
    return "Escolha uma data para o treino.";
  }

  const message = String(error.message || "").toLowerCase();
  const code = String(error.code || "");

  if (code === "42501" || message.includes("row-level security")) {
    return "Você não tem permissão para fazer essa alteração no calendário.";
  }
  if (code === "23514" || message.includes("violates check constraint")) {
    return "Alguns dados do treino são inválidos. Confira os valores informados.";
  }
  if (code === "23503") {
    return "Não foi possível associar o treino ao calendário. Tente novamente.";
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }

  return fallback;
}
