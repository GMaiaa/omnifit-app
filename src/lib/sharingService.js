import { supabase } from "./supabase";
import { createStrengthTemplate } from "../modules/strength/strengthService";
import { createHyroxTemplate } from "../modules/hyrox/hyroxService";
import { createRunningWorkout } from "../modules/running/runningService";
import { createCyclingWorkout } from "../modules/ciclismo/cyclingService";

/* Converte uma linha crua de public.workout_shares (snake_case) para o
   formato usado pelos componentes (camelCase). */
function mapShareRow(row) {
  return {
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    recipientEmail: row.recipient_email,
    modality: row.modality,
    sourceType: row.source_type,
    sourceId: row.source_id,
    title: row.title,
    payload: row.payload,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
    expiresAt: row.expires_at,
  };
}

/* Envia um treino (ficha de Musculação/HYROX, ou treino registrado de
   Corrida/Ciclismo) por e-mail para outro usuário já cadastrado no
   Omnifit. O e-mail de aviso em si ainda não é enviado (precisa de um
   provedor transacional) — por ora o destinatário só recebe a notificação
   dentro do app. */
export async function shareWorkout({ modality, sourceType, sourceId, title, payload, recipientEmail, message = null }) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("NOT_AUTHENTICATED");
  }

  const email = recipientEmail.trim().toLowerCase();
  if (!email) {
    throw new Error("INVALID_EMAIL");
  }
  if (email === (user.email || "").toLowerCase()) {
    throw new Error("CANNOT_SHARE_WITH_SELF");
  }

  const { data: recipientId, error: lookupError } = await supabase.rpc("find_user_id_by_email", { p_email: email });
  if (lookupError) {
    if (import.meta.env.DEV) console.error("[workout_shares] busca de destinatário falhou:", lookupError);
    throw lookupError;
  }
  if (!recipientId) {
    throw new Error("RECIPIENT_NOT_FOUND");
  }

  const { data, error } = await supabase
    .from("workout_shares")
    .insert({
      sender_id: user.id,
      recipient_id: recipientId,
      recipient_email: email,
      modality,
      source_type: sourceType,
      source_id: sourceId,
      title,
      payload,
      message,
    })
    .select()
    .single();

  if (error) {
    if (import.meta.env.DEV) console.error("[workout_shares] insert falhou:", error);
    throw error;
  }

  return mapShareRow(data);
}

/* Compartilhamentos recebidos ainda pendentes (o que a caixa de entrada de
   notificações precisa pra oferecer aceitar/recusar). */
export async function getPendingReceivedShares() {
  const { data, error } = await supabase
    .from("workout_shares")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    if (import.meta.env.DEV) console.error("[workout_shares] select falhou:", error);
    throw error;
  }

  return (data ?? []).map(mapShareRow);
}

/* Cada combinação modalidade+tipo sabe gravar seu próprio payload na
   tabela real, reaproveitando o mesmo serviço que o formulário de criação
   já usa — aceitar um compartilhamento não é um caminho especial, é só
   mais uma chamada de criação normal, com os dados vindos do snapshot em
   vez do formulário. */
const ACCEPT_HANDLERS = {
  "musculacao:template": (payload) => createStrengthTemplate(payload),
  "hyrox:template": (payload) => createHyroxTemplate(payload),
  "corrida:workout": (payload) => createRunningWorkout(payload),
  "ciclismo:workout": (payload) => createCyclingWorkout(payload),
};

/* Aceita um compartilhamento: grava uma cópia própria do conteúdo e só
   depois marca o compartilhamento como aceito — se a cópia falhar, o
   compartilhamento continua pendente para tentar de novo. */
export async function acceptShare(share) {
  const handler = ACCEPT_HANDLERS[`${share.modality}:${share.sourceType}`];
  if (!handler) {
    throw new Error("UNSUPPORTED_SHARE_TYPE");
  }

  const created = await handler(share.payload);

  const { error } = await supabase
    .from("workout_shares")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", share.id);

  if (error) {
    if (import.meta.env.DEV) console.error("[workout_shares] update (accepted) falhou:", error);
    throw error;
  }

  return created;
}

export async function declineShare(id) {
  const { error } = await supabase
    .from("workout_shares")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    if (import.meta.env.DEV) console.error("[workout_shares] update (declined) falhou:", error);
    throw error;
  }
}

export async function revokeShare(id) {
  const { error } = await supabase
    .from("workout_shares")
    .update({ status: "revoked" })
    .eq("id", id);

  if (error) {
    if (import.meta.env.DEV) console.error("[workout_shares] update (revoked) falhou:", error);
    throw error;
  }
}

/* Traduz erros técnicos (auth ausente, RLS, constraints, rede) para
   mensagens amigáveis em português — mesmo padrão dos outros serviços. */
export function mapSharingError(error, fallback = "Não foi possível compartilhar o treino. Tente novamente.") {
  if (!error) return fallback;

  if (error.message === "NOT_AUTHENTICATED") {
    return "Você precisa estar autenticado para compartilhar um treino.";
  }
  if (error.message === "INVALID_EMAIL") {
    return "Informe o e-mail de quem vai receber o treino.";
  }
  if (error.message === "CANNOT_SHARE_WITH_SELF") {
    return "Você não pode compartilhar um treino com você mesmo.";
  }
  if (error.message === "RECIPIENT_NOT_FOUND") {
    return "Não encontramos nenhuma conta Omnifit com esse e-mail.";
  }
  if (error.message === "UNSUPPORTED_SHARE_TYPE") {
    return "Esse tipo de treino ainda não pode ser aceito automaticamente.";
  }

  const message = String(error.message || "").toLowerCase();
  const code = String(error.code || "");

  if (code === "23505" || message.includes("duplicate key")) {
    return "Você já compartilhou esse treino com essa pessoa e ainda está pendente.";
  }
  if (code === "42501" || message.includes("row-level security")) {
    return "Você não tem permissão para fazer essa alteração.";
  }
  if (code === "23514" || message.includes("violates check constraint")) {
    return "Você não pode compartilhar um treino com você mesmo.";
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }

  return fallback;
}
