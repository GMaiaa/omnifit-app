import { supabase } from "../../lib/supabase";

/* Converte uma linha crua de public.hyrox_templates (snake_case) para o
   formato já usado pelo módulo (camelCase) — mesmo padrão de
   strength/strengthService.js. `blocks` é jsonb e já chega com a mesma
   forma de array usada no front. user_id nunca entra aqui: nem é
   selecionado nas consultas. */
export function mapTemplateRow(row) {
  return {
    id: row.id,
    name: row.name,
    focus: row.focus,
    blocks: Array.isArray(row.blocks) ? row.blocks : [],
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

/* Mesma lógica de mapTemplateRow, para public.hyrox_sessions. */
export function mapSessionRow(row) {
  return {
    id: row.id,
    templateId: row.template_id,
    templateName: row.template_name,
    focus: row.focus,
    date: row.date,
    startedAt: row.started_at ?? null,
    finishedAt: row.finished_at ?? null,
    durationSec: row.duration_sec ?? 0,
    notes: row.notes ?? null,
    blocks: Array.isArray(row.blocks) ? row.blocks : [],
    createdAt: row.created_at ?? null,
  };
}

/* Busca as fichas do usuário autenticado. RLS (auth.uid() = user_id) já
   garante que só voltam registros do próprio usuário. */
export async function getHyroxTemplates() {
  const { data, error } = await supabase
    .from("hyrox_templates")
    .select("id, name, focus, blocks, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    if (import.meta.env.DEV) console.error("[hyrox_templates] select falhou:", error);
    throw error;
  }

  return (data ?? []).map(mapTemplateRow);
}

/* Cadastra uma ficha em public.hyrox_templates. user_id nunca vem de fora:
   é sempre lido da sessão atual via supabase.auth.getUser(). */
export async function createHyroxTemplate({ name, focus, blocks }) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("NOT_AUTHENTICATED");
  }

  if (!name || !name.trim()) {
    throw new Error("INVALID_NAME");
  }
  if (!Array.isArray(blocks) || blocks.length === 0) {
    throw new Error("EMPTY_BLOCKS");
  }

  const { data, error } = await supabase
    .from("hyrox_templates")
    .insert({ user_id: user.id, name: name.trim(), focus, blocks })
    .select()
    .single();

  if (error) {
    if (import.meta.env.DEV) console.error("[hyrox_templates] insert falhou:", error);
    throw error;
  }

  return mapTemplateRow(data);
}

/* Atualiza uma ficha existente. RLS de update restringe ao dono. */
export async function updateHyroxTemplate(id, { name, focus, blocks }) {
  if (!name || !name.trim()) {
    throw new Error("INVALID_NAME");
  }
  if (!Array.isArray(blocks) || blocks.length === 0) {
    throw new Error("EMPTY_BLOCKS");
  }

  const { data, error } = await supabase
    .from("hyrox_templates")
    .update({ name: name.trim(), focus, blocks })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (import.meta.env.DEV) console.error("[hyrox_templates] update falhou:", error);
    throw error;
  }

  return mapTemplateRow(data);
}

/* Exclui uma ficha. Sessões que a referenciam continuam existindo
   (template_id aceita null) — só perdem o vínculo, mantendo template_name
   já salvo em cada uma para exibição. */
export async function deleteHyroxTemplate(id) {
  const { error } = await supabase.from("hyrox_templates").delete().eq("id", id);
  if (error) {
    if (import.meta.env.DEV) console.error("[hyrox_templates] delete falhou:", error);
    throw error;
  }
}

/* Busca o histórico de execuções do usuário autenticado, mais recentes
   primeiro (mesmo critério de desempate de strength: data desc, created_at
   desc). */
export async function getHyroxSessions() {
  const { data, error } = await supabase
    .from("hyrox_sessions")
    .select("id, template_id, template_name, focus, date, started_at, finished_at, duration_sec, notes, blocks, created_at")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (import.meta.env.DEV) console.error("[hyrox_sessions] select falhou:", error);
    throw error;
  }

  return (data ?? []).map(mapSessionRow);
}

/* Registra a execução de um treino (HyroxRunner) em public.hyrox_sessions.
   template_id pode ir null — "Treino Livre" não tem ficha nenhuma por
   trás, a coluna aceita isso. */
export async function createHyroxSession({
  templateId = null, templateName, focus, date, startedAt = null, finishedAt = null,
  durationSec = 0, notes = null, blocks,
}) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("NOT_AUTHENTICATED");
  }

  if (!Array.isArray(blocks) || blocks.length === 0) {
    throw new Error("EMPTY_BLOCKS");
  }

  const { data, error } = await supabase
    .from("hyrox_sessions")
    .insert({
      user_id: user.id,
      template_id: templateId,
      template_name: templateName,
      focus,
      date,
      started_at: startedAt,
      finished_at: finishedAt,
      duration_sec: durationSec,
      notes,
      blocks,
    })
    .select()
    .single();

  if (error) {
    if (import.meta.env.DEV) console.error("[hyrox_sessions] insert falhou:", error);
    throw error;
  }

  return mapSessionRow(data);
}

/* Exclui uma execução. RLS de delete restringe ao dono. */
export async function deleteHyroxSession(id) {
  const { error } = await supabase.from("hyrox_sessions").delete().eq("id", id);
  if (error) {
    if (import.meta.env.DEV) console.error("[hyrox_sessions] delete falhou:", error);
    throw error;
  }
}

/* Traduz erros técnicos (auth ausente, RLS, constraints, rede) para
   mensagens amigáveis em português — mesmo padrão de strengthService.js. */
export function mapHyroxError(error, fallback = "Não foi possível salvar o treino. Tente novamente.") {
  if (!error) return fallback;

  if (error.message === "NOT_AUTHENTICATED") {
    return "Você precisa estar autenticado para salvar um treino.";
  }
  if (error.message === "INVALID_NAME") {
    return "Dê um nome para o treino.";
  }
  if (error.message === "EMPTY_BLOCKS") {
    return "Adicione pelo menos um bloco.";
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
