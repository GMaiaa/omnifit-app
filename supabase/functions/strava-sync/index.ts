import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin, getAuthenticatedUser } from "../_shared/supabaseAdmin.ts";

// Tipos de atividade do Strava que mapeiam pra ciclismo no Omnifit.
const CYCLING_TYPES = new Set(["Ride", "VirtualRide", "GravelRide", "MountainBikeRide", "EBikeRide"]);

/* Garante um access_token válido: se o salvo já expirou (ou expira nos
   próximos 2 minutos), usa o refresh_token pra pedir um novo ao Strava e
   atualiza a conexão salva antes de devolver. */
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
    throw new Error("STRAVA_REFRESH_FAILED");
  }

  const refreshed = await refreshRes.json();
  await admin.from("strava_connections").update({
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
  }).eq("user_id", userId);

  return refreshed.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await getAuthenticatedUser(req);
    const admin = supabaseAdmin();
    const accessToken = await getValidAccessToken(admin, user.id);

    // Busca as últimas 50 atividades do Strava (suficiente pra uma
    // sincronização manual disparada pelo usuário; sincronização
    // incremental automática fica pra uma próxima iteração).
    const activitiesRes = await fetch(
      "https://www.strava.com/api/v3/athlete/activities?per_page=50",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!activitiesRes.ok) {
      console.error("[strava-sync] busca de atividades falhou:", activitiesRes.status, await activitiesRes.text());
      throw new Error("STRAVA_FETCH_FAILED");
    }

    const activities = await activitiesRes.json();
    const cyclingActivities = activities.filter((a: { type: string }) => CYCLING_TYPES.has(a.type));

    let imported = 0;
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
        console.error("[strava-sync] upsert de atividade falhou:", a.id, error);
        continue;
      }
      imported++;
    }

    return new Response(
      JSON.stringify({ imported, total: cyclingActivities.length }),
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
