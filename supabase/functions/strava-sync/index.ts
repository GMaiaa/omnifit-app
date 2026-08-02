import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin, getAuthenticatedUser } from "../_shared/supabaseAdmin.ts";

const CYCLING_TYPES = new Set(["Ride", "VirtualRide", "GravelRide", "MountainBikeRide", "EBikeRide"]);
const RUNNING_TYPES = new Set(["Run", "VirtualRun", "TrailRun"]);

function mapRunningType(workoutType: number | null | undefined) {
  if (workoutType === 1) return "prova";
  if (workoutType === 2) return "longo";
  if (workoutType === 3) return "intervalado";
  return "rodagem";
}

function paceSecKm(distanceKm: number, durationSec: number) {
  if (!distanceKm || distanceKm <= 0 || !durationSec || durationSec <= 0) return null;
  const pace = durationSec / distanceKm;
  return Number.isFinite(pace) ? Math.round(pace) : null;
}

const PER_PAGE = 100;
const MAX_PAGES = 20;

/* Registra uma chamada à API do Strava, pra acompanhar uso contra os
   limites de taxa deles (200/15min, 2000/dia) na aba Admin. Nunca lança
   erro — um log falho não pode derrubar a sincronização em si. */
async function logApiCall(admin: ReturnType<typeof supabaseAdmin>, endpoint: string, statusCode: number, userId: string) {
  try {
    await admin.from("api_call_logs").insert({ provider: "strava", endpoint, status_code: statusCode, user_id: userId });
  } catch {
    // não crítico — segue o fluxo normalmente
  }
}

async function getValidAccessToken(admin: ReturnType<typeof supabaseAdmin>, userId: string) {
  const { data: conn, error } = await admin
    .from("strava_connections")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !conn) throw new Error("NOT_CONNECTED");

  const expiresInMs = new Date(conn.expires_at).getTime() - Date.now();
  if (expiresInMs > 2 * 60 * 1000) return conn.access_token;

  const clientId = Deno.env.get("STRAVA_CLIENT_ID");
  const clientSecret = Deno.env.get("STRAVA_CLIENT_SECRET");

  const refreshRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: conn.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!refreshRes.ok) {
    console.error("[strava-sync] refresh falhou:", refreshRes.status, await refreshRes.text());
    await logApiCall(admin, "oauth/token(refresh)", refreshRes.status, userId);
    throw new Error("STRAVA_REFRESH_FAILED");
  }
  await logApiCall(admin, "oauth/token(refresh)", refreshRes.status, userId);

  const refreshed = await refreshRes.json();
  await admin.from("strava_connections").update({
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
  }).eq("user_id", userId);

  return refreshed.access_token;
}

/* Busca atividades do atleta, opcionalmente só a partir de `afterUnix`
   (segundos desde epoch). Sem esse parâmetro, busca o histórico inteiro
   até o teto de segurança. Paginação para quando a API devolve uma
   página incompleta. */
async function fetchActivities(accessToken: string, admin: ReturnType<typeof supabaseAdmin>, userId: string, afterUnix?: number) {
  const all = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const params = new URLSearchParams({ per_page: String(PER_PAGE), page: String(page) });
    if (afterUnix) params.set("after", String(afterUnix));

    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    await logApiCall(admin, "athlete/activities", res.status, userId);
    if (!res.ok) {
      const bodyText = await res.text();
      console.error("[strava-sync] busca de atividades falhou na página", page, res.status, bodyText);
      throw new Error(res.status === 401 ? "STRAVA_SCOPE_INSUFFICIENT" : "STRAVA_FETCH_FAILED");
    }
    const batch = await res.json();
    all.push(...batch);
    if (batch.length < PER_PAGE) break;
  }
  return all;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await getAuthenticatedUser(req);
    const admin = supabaseAdmin();
    const accessToken = await getValidAccessToken(admin, user.id);

    // Corpo opcional: { afterUnix: 1690000000 } — quando ausente, sincroniza
    // o histórico inteiro (comportamento antigo).
    let afterUnix: number | undefined;
    try {
      const body = await req.json();
      if (body?.afterUnix) afterUnix = Number(body.afterUnix);
    } catch {
      // corpo vazio é normal (sync sem filtro de data) — ignora
    }

    const activities = await fetchActivities(accessToken, admin, user.id, afterUnix);

    const isValid = (a: { distance: number; moving_time: number }) => a.distance > 0 && a.moving_time > 0;

    const cyclingCandidates = activities.filter((a: { type: string }) => CYCLING_TYPES.has(a.type));
    const runningCandidates = activities.filter((a: { type: string }) => RUNNING_TYPES.has(a.type));
    const cyclingActivities = cyclingCandidates.filter(isValid);
    const runningActivities = runningCandidates.filter(isValid);
    const skipped = (cyclingCandidates.length - cyclingActivities.length) + (runningCandidates.length - runningActivities.length);

    let cyclingImported = 0;
    let cyclingFailed = 0;
    let lastError: string | null = null;

    for (const a of cyclingActivities) {
      const { error } = await admin.from("cycling_workouts").upsert(
        {
          user_id: user.id,
          external_id: `strava:${a.id}`,
          source: "strava",
          title: a.name ?? null,
          date: a.start_date_local?.slice(0, 10),
          type: "endurance",
          distance_km: Math.round((a.distance / 1000) * 100) / 100,
          duration_sec: a.moving_time,
          elevation_gain_m: a.total_elevation_gain != null ? Math.round(a.total_elevation_gain) : null,
          avg_hr: a.average_heartrate != null ? Math.round(a.average_heartrate) : null,
          max_hr: a.max_heartrate != null ? Math.round(a.max_heartrate) : null,
          avg_power: a.average_watts != null ? Math.round(a.average_watts) : null,
          max_power: a.max_watts != null ? Math.round(a.max_watts) : null,
          avg_cadence: a.average_cadence != null ? Math.round(a.average_cadence) : null,
          calories: a.calories != null ? Math.round(a.calories) : null,
        },
        { onConflict: "user_id,external_id" },
      );
      if (error) {
        console.error("[strava-sync] upsert ciclismo falhou:", a.id, error);
        cyclingFailed++;
        lastError = error.message;
        continue;
      }
      cyclingImported++;
    }

    let runningImported = 0;
    let runningFailed = 0;

    for (const a of runningActivities) {
      const distanceKm = Math.round((a.distance / 1000) * 100) / 100;
      const { error } = await admin.from("running_workouts").upsert(
        {
          user_id: user.id,
          external_id: `strava:${a.id}`,
          source: "strava",
          date: a.start_date_local?.slice(0, 10),
          type: mapRunningType(a.workout_type),
          distance_km: distanceKm,
          duration_sec: a.moving_time,
          pace_sec_km: paceSecKm(distanceKm, a.moving_time),
          avg_hr: a.average_heartrate != null ? Math.round(a.average_heartrate) : null,
          calories: a.calories != null ? Math.round(a.calories) : null,
          notes: a.name ?? null,
        },
        { onConflict: "user_id,external_id" },
      );
      if (error) {
        console.error("[strava-sync] upsert corrida falhou:", a.id, error);
        runningFailed++;
        lastError = error.message;
        continue;
      }
      runningImported++;
    }

    return new Response(
      JSON.stringify({
        cyclingImported,
        runningImported,
        cyclingFailed,
        runningFailed,
        skipped,
        totalFetched: activities.length,
        lastError,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    const status = message === "NOT_AUTHENTICATED" ? 401 : message === "NOT_CONNECTED" ? 409 : 400;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
