import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin, getAuthenticatedUser } from "../_shared/supabaseAdmin.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await getAuthenticatedUser(req);
    const admin = supabaseAdmin();

    const { data: conn } = await admin
      .from("strava_connections")
      .select("access_token")
      .eq("user_id", user.id)
      .single();

    // Revoga o acesso do lado do Strava também (não só apaga localmente) —
    // falha aqui não deve impedir a desconexão local, só é registrada.
    if (conn?.access_token) {
      try {
        await fetch(`https://www.strava.com/oauth/deauthorize?access_token=${conn.access_token}`, {
          method: "POST",
        });
      } catch (err) {
        console.error("[strava-disconnect] revoke no Strava falhou:", err);
      }
    }

    await admin.from("strava_connections").delete().eq("user_id", user.id);

    return new Response(JSON.stringify({ disconnected: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    const status = message === "NOT_AUTHENTICATED" ? 401 : 400;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
