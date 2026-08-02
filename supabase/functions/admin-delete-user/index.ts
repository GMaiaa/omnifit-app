import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin, getAuthenticatedUser } from "../_shared/supabaseAdmin.ts";

/* Exclui permanentemente a conta de um usuário (auth.users + tudo que
   depende dela via ON DELETE CASCADE). Só quem está em public.admin_users
   pode chamar — checado diretamente aqui, e não delegado só ao client,
   já que essa ação não tem volta. */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const caller = await getAuthenticatedUser(req);
    const admin = supabaseAdmin();

    const { data: isAdminRow } = await admin
      .from("admin_users")
      .select("user_id")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (!isAdminRow) throw new Error("NOT_ADMIN");

    const { targetUserId } = await req.json();
    if (!targetUserId) throw new Error("MISSING_TARGET_USER_ID");
    if (targetUserId === caller.id) throw new Error("CANNOT_DELETE_SELF");

    const { error } = await admin.auth.admin.deleteUser(targetUserId);
    if (error) {
      console.error("[admin-delete-user] falhou:", error);
      throw new Error("DELETE_FAILED");
    }

    return new Response(JSON.stringify({ deleted: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    const status = message === "NOT_AUTHENTICATED" ? 401 : message === "NOT_ADMIN" ? 403 : 400;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
