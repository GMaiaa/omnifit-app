import { supabase } from "./supabase";

/* Registra um login do usuário atual. Chamado no evento SIGNED_IN do
   Supabase Auth — nunca em nome de outro usuário (a policy de insert de
   login_events já garante isso: auth.uid() = user_id). Falha
   silenciosamente: um log perdido não pode atrapalhar o login em si. */
export async function logLoginEvent(userId) {
  if (!userId) return;
  try {
    await supabase.from("login_events").insert({ user_id: userId });
  } catch {
    // não crítico
  }
}
