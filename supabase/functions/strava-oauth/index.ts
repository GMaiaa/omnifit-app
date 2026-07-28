import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin, getAuthenticatedUser } from "../_shared/supabaseAdmin.ts";

/* Recebe { code } (o código que o Strava manda de volta no redirect_uri
   após o usuário autorizar) e faz a troca por access_token/refresh_token
   junto à API do Strava, usando o client_secret — que só existe aqui
   dentro (variável de ambiente da Edge Function), nunca no navegador.
   Salva o resultado em public.strava_connections. */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await getAuthenticatedUser(req);
    const { code } = await req.json();
    if (!code) throw new Error("MISSING_CODE");

    const clientId = Deno.env.get("STRAVA_CLIENT_ID");
    const clientSecret = Deno.env.get("STRAVA_CLIENT_SECRET");
    if (!clientId || !clientSecret) throw new Error("STRAVA_NOT_CONFIGURED");

    const tokenRes = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error("[strava-oauth] troca de token falhou:", tokenRes.status, body);
      throw new Error("STRAVA_TOKEN_EXCHANGE_FAILED");
    }

    const tokenData = await tokenRes.json();
    // tokenData: { access_token, refresh_token, expires_at (unix seconds), athlete: {...} }

    const admin = supabaseAdmin();
    const { error } = await admin.from("strava_connections").upsert({
      user_id: user.id,
      strava_athlete_id: tokenData.athlete?.id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(tokenData.expires_at * 1000).toISOString(),
      scope: tokenData.scope ?? null,
      connected_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[strava-oauth] upsert falhou:", error);
      throw new Error("SAVE_FAILED");
    }

    return new Response(
      JSON.stringify({ connected: true, athleteId: tokenData.athlete?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    const status = message === "NOT_AUTHENTICATED" ? 401 : 400;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
