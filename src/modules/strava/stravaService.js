import { supabase } from "../../lib/supabase";

const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;

/* Monta a URL de autorização do Strava. redirect_uri é sempre a raiz do
   próprio app (sem router) — o retorno é detectado lendo ?code= na URL
   assim que o app carrega (ver handleStravaRedirect). */
export function buildStravaAuthUrl() {
  if (!STRAVA_CLIENT_ID) throw new Error("STRAVA_CLIENT_ID_MISSING");

  const redirectUri = `${window.location.origin}/`;
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read_all",
  });

  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

/* Se a URL atual tem ?code=... (o Strava acabou de redirecionar de volta),
   devolve o code e já limpa a URL (pra não reprocessar num refresh da
   página). Devolve null se não houver nada pra processar. */
export function extractStravaRedirectCode() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  const scope = url.searchParams.get("scope");
  const error = url.searchParams.get("error");

  if (!code && !error) return null;

  url.searchParams.delete("code");
  url.searchParams.delete("scope");
  url.searchParams.delete("state");
  url.searchParams.delete("error");
  window.history.replaceState({}, "", url.toString());

  if (error) return { error };
  return { code, scope };
}

/* Troca o code pelo access_token/refresh_token via Edge Function
   strava-oauth (o client_secret nunca fica no navegador). */
export async function connectStrava(code) {
  const { data, error } = await supabase.functions.invoke("strava-oauth", { body: { code } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

/* Checa se o Strava está conectado sem nunca expor tokens — via função
   SECURITY DEFINER (get_strava_connection_status), não via select direto
   em strava_connections (que não tem policy pro client). */
export async function getStravaConnectionStatus() {
  const { data, error } = await supabase.rpc("get_strava_connection_status");
  if (error) throw error;
  const row = data?.[0];
  return row ? { connected: true, athleteId: row.strava_athlete_id, connectedAt: row.connected_at } : { connected: false };
}

/* Dispara a sincronização COMPLETA do histórico (ciclismo + corrida) via
   Edge Function strava-sync — não só as atividades recentes. Devolve
   quantas foram importadas de cada modalidade nesta chamada. */
export async function syncStravaActivities() {
  const { data, error } = await supabase.functions.invoke("strava-sync");
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data; // { cyclingImported, runningImported, totalFetched }
}

export async function disconnectStrava() {
  const { data, error } = await supabase.functions.invoke("strava-disconnect");
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function mapStravaError(error, fallback = "Não foi possível concluir a operação com o Strava.") {
  if (!error) return fallback;
  const message = String(error.message || "");

  if (message === "STRAVA_CLIENT_ID_MISSING") return "Integração com o Strava ainda não está configurada.";
  if (message === "NOT_CONNECTED") return "Conecte sua conta do Strava primeiro.";
  if (message === "STRAVA_TOKEN_EXCHANGE_FAILED" || message === "STRAVA_REFRESH_FAILED") {
    return "Não foi possível autenticar com o Strava. Tente conectar novamente.";
  }
  if (message === "STRAVA_FETCH_FAILED") return "Não foi possível buscar seus treinos no Strava agora.";
  if (message.toLowerCase().includes("failed to fetch") || message.toLowerCase().includes("network")) {
    return "Falha de conexão. Verifique sua internet e tente novamente.";
  }

  return fallback;
}
