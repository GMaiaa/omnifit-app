import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* Client com a service role key — só existe dentro das Edge Functions
   (nunca no navegador). Ignora RLS, por isso é o único lugar que pode ler
   e escrever em public.strava_connections (que não tem policy nenhuma
   pro client comum). */
export function supabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/* Extrai e valida o usuário autenticado a partir do header Authorization
   que o supabase.functions.invoke() do client já envia automaticamente
   com o JWT da sessão atual. Lança se não houver usuário válido. */
export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("NOT_AUTHENTICATED");

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error("NOT_AUTHENTICATED");

  return user;
}
