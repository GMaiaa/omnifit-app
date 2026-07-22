import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(undefined);

/* Única fonte de verdade sobre a sessão do usuário. Recupera a sessão atual
   uma vez ao montar e depois só reage a supabase.auth.onAuthStateChange —
   nenhum outro lugar do app lê/escreve token ou usuário diretamente. */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) console.error("[Supabase Auth] getSession falhou:", error);
      setSession(data?.session ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async ({ name, email, password }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;

    /* Para evitar que se descubra quais e-mails já têm conta, o Supabase
       responde com sucesso (sem erro) e identities:[] quando o e-mail já
       está cadastrado, em vez de um erro explícito — sem este checagem o
       cadastro pareceria ter funcionado. */
    if (data?.user && data.user.identities && data.user.identities.length === 0) {
      throw new Error("User already registered");
    }

    return data; // { user, session } — session é null se a confirmação de e-mail estiver ativa
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo(() => ({
    user: session?.user ?? null,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  }), [session, loading, signUp, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error("useAuth precisa ser usado dentro de um <AuthProvider>.");
  return ctx;
}
