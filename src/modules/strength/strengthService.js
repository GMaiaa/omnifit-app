import { supabase } from "../../lib/supabase";

/* Converte uma linha crua de public.strength_templates (snake_case) para o
   formato já usado pelo módulo (camelCase) — o mesmo formato que TemplateForm/
   TemplateCard/StrengthModule já esperam vindo do mock local. `exercises` é
   jsonb e já chega com a mesma forma de array usada no front, então não
   precisa de mapeamento item a item. user_id nunca entra aqui: nem é
   selecionado nas consultas. */
export function mapTemplateRow(row) {
  return {
    id: row.id,
    name: row.name,
    exercises: Array.isArray(row.exercises) ? row.exercises : [],
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

/* Mesma lógica de mapTemplateRow, para public.strength_sessions. */
export function mapSessionRow(row) {
  return {
    id: row.id,
    templateId: row.template_id,
    templateName: row.template_name,
    date: row.date,
    startedAt: row.started_at ?? null,
    finishedAt: row.finished_at ?? null,
    durationSec: row.duration_sec ?? 0,
    notes: row.notes ?? null,
    exercises: Array.isArray(row.exercises) ? row.exercises : [],
    createdAt: row.created_at ?? null,
  };
}

/* Busca as fichas do usuário autenticado. O RLS já garante que só voltam
   registros do próprio usuário (política de select por auth.uid()) — por
   isso nenhum filtro de user_id é necessário aqui, e user_id nem é
   selecionado, então nunca chega aos componentes visuais. */
export async function getStrengthTemplates() {
  const { data, error } = await supabase
    .from("strength_templates")
    .select(`
      id,
      name,
      exercises,
      created_at,
      updated_at
    `)
    .order("created_at", { ascending: false });

  if (error) {
    if (import.meta.env.DEV) console.error("[strength_templates] select falhou:", error);
    throw error;
  }

  return (data ?? []).map(mapTemplateRow);
}

/* Cadastra uma ficha de treino em public.strength_templates para o usuário
   autenticado. O user_id nunca vem de fora: é sempre lido da sessão atual
   via supabase.auth.getUser(), nunca do formulário. Retorna o registro já
   no formato usado pela UI (id/created_at/updated_at reais do banco). */
export async function createStrengthTemplate({ name, exercises }) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("NOT_AUTHENTICATED");
  }

  if (!name || !name.trim()) {
    throw new Error("INVALID_NAME");
  }
  if (!Array.isArray(exercises) || exercises.length === 0) {
    throw new Error("EMPTY_EXERCISES");
  }

  const { data, error } = await supabase
    .from("strength_templates")
    .insert({
      user_id: user.id,
      name: name.trim(),
      exercises,
    })
    .select()
    .single();

  if (error) {
    if (import.meta.env.DEV) console.error("[strength_templates] insert falhou:", error);
    throw error;
  }

  return mapTemplateRow(data);
}

/* Atualiza uma ficha existente em public.strength_templates. Não filtra por
   user_id no client: a política de RLS de update (auth.uid() = user_id) é
   quem garante que só o dono do registro consegue alterá-lo — se o id
   pertencer a outro usuário, a query simplesmente não afeta nenhuma linha e
   o .single() abaixo lança, o que já cai no mapeamento de erro genérico. */
export async function updateStrengthTemplate(id, { name, exercises }) {
  if (!name || !name.trim()) {
    throw new Error("INVALID_NAME");
  }
  if (!Array.isArray(exercises) || exercises.length === 0) {
    throw new Error("EMPTY_EXERCISES");
  }

  const { data, error } = await supabase
    .from("strength_templates")
    .update({ name: name.trim(), exercises })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (import.meta.env.DEV) console.error("[strength_templates] update falhou:", error);
    throw error;
  }

  return mapTemplateRow(data);
}

/* Exclui uma ficha de public.strength_templates. Sessões que referenciam
   essa ficha continuam existindo (template_id aceita null) — só perdem o
   vínculo, mantendo template_name já salvo em cada uma para exibição.
   Mesma lógica de segurança do update: a política de RLS de delete é quem
   restringe a exclusão ao dono do registro. */
export async function deleteStrengthTemplate(id) {
  const { error } = await supabase
    .from("strength_templates")
    .delete()
    .eq("id", id);

  if (error) {
    if (import.meta.env.DEV) console.error("[strength_templates] delete falhou:", error);
    throw error;
  }
}

/* Busca o histórico de execuções do usuário autenticado, mais recentes
   primeiro (mesmo critério de desempate de modules/running: data desc,
   created_at desc). Mesma lógica de RLS de getStrengthTemplates. */
export async function getStrengthSessions() {
  const { data, error } = await supabase
    .from("strength_sessions")
    .select(`
      id,
      template_id,
      template_name,
      date,
      started_at,
      finished_at,
      duration_sec,
      notes,
      exercises,
      created_at
    `)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (import.meta.env.DEV) console.error("[strength_sessions] select falhou:", error);
    throw error;
  }

  return (data ?? []).map(mapSessionRow);
}

/* Registra a execução de um treino (SessionRunner) em
   public.strength_sessions. `templateId` deve apontar para uma ficha real
   já existente — a FK garante isso; se algum dia formos permitir treino
   avulso sem ficha, `templateId` pode ir como null (a coluna aceita). */
export async function createStrengthSession({
  templateId = null, templateName, date, startedAt = null, finishedAt = null,
  durationSec = 0, notes = null, exercises,
}) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("NOT_AUTHENTICATED");
  }

  if (!Array.isArray(exercises) || exercises.length === 0) {
    throw new Error("EMPTY_EXERCISES");
  }

  const { data, error } = await supabase
    .from("strength_sessions")
    .insert({
      user_id: user.id,
      template_id: templateId,
      template_name: templateName,
      date,
      started_at: startedAt,
      finished_at: finishedAt,
      duration_sec: durationSec,
      notes,
      exercises,
    })
    .select()
    .single();

  if (error) {
    if (import.meta.env.DEV) console.error("[strength_sessions] insert falhou:", error);
    throw error;
  }

  return mapSessionRow(data);
}

/* Atualiza uma execução existente em public.strength_sessions (corrigir
   carga/reps registradas, data, duração ou notas). Mesma lógica de
   segurança do update de fichas: RLS restringe ao dono do registro. */
export async function updateStrengthSession(id, {
  templateId = null, templateName, date, startedAt = null, finishedAt = null,
  durationSec = 0, notes = null, exercises,
}) {
  if (!Array.isArray(exercises) || exercises.length === 0) {
    throw new Error("EMPTY_EXERCISES");
  }

  const { data, error } = await supabase
    .from("strength_sessions")
    .update({
      template_id: templateId,
      template_name: templateName,
      date,
      started_at: startedAt,
      finished_at: finishedAt,
      duration_sec: durationSec,
      notes,
      exercises,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (import.meta.env.DEV) console.error("[strength_sessions] update falhou:", error);
    throw error;
  }

  return mapSessionRow(data);
}

/* Exclui uma execução de public.strength_sessions. Mesma lógica de
   segurança do update: RLS restringe a exclusão ao dono do registro. */
export async function deleteStrengthSession(id) {
  const { error } = await supabase
    .from("strength_sessions")
    .delete()
    .eq("id", id);

  if (error) {
    if (import.meta.env.DEV) console.error("[strength_sessions] delete falhou:", error);
    throw error;
  }
}

/* Traduz erros técnicos (auth ausente, RLS, constraints, rede) para
   mensagens amigáveis em português — o texto original do Supabase nunca
   chega até a UI. Mesmo padrão de modules/running/runningService.js;
   compartilhado entre fichas e sessões porque os códigos de erro relevantes
   (auth, RLS, constraint, FK, rede) são os mesmos nas duas tabelas. */
export function mapStrengthError(error, fallback = "Não foi possível salvar o treino. Tente novamente.") {
  if (!error) return fallback;

  if (error.message === "NOT_AUTHENTICATED") {
    return "Você precisa estar autenticado para salvar um treino.";
  }
  if (error.message === "INVALID_NAME") {
    return "Dê um nome para o treino.";
  }
  if (error.message === "EMPTY_EXERCISES") {
    return "Adicione pelo menos um exercício.";
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
    return "Não foi possível associar o treino ao seu usuário ou à ficha selecionada. Tente novamente.";
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }

  return fallback;
}
