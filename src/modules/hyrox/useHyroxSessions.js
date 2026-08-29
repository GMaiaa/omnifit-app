import { useCallback, useEffect, useState } from "react";
import { getHyroxSessions, mapHyroxError } from "./hyroxService";

/* Mesmo critério de desempate da consulta ao Supabase (data desc, created_at
   desc) — reaplicado aqui quando o estado local muda por fora de uma nova
   consulta (inclusão de uma sessão recém-finalizada). */
function sortSessions(list) {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });
}

/* Busca o histórico de execuções em public.hyrox_sessions. Mesmo padrão de
   useHyroxTemplates.js: leitura, inclusão e exclusão já são o banco de
   verdade — addSession/deleteSession só refletem no estado local o que o
   caller já confirmou com hyroxService.js. */
export function useHyroxSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await getHyroxSessions();
      setSessions(rows);
    } catch (err) {
      setError(mapHyroxError(err, "Não foi possível carregar seu histórico de treinos. Tente novamente."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  /* Inclusão direta no estado compartilhado após um treino finalizado com
     sucesso — evita uma segunda consulta ao Supabase. Usa o registro
     retornado pelo insert (id/created_at reais). */
  const addSession = useCallback((s) => {
    setSessions((prev) => (prev.some((existing) => existing.id === s.id) ? prev : sortSessions([s, ...prev])));
  }, []);

  const deleteSession = useCallback((id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { sessions, loading, error, addSession, deleteSession, refetch: fetchSessions };
}
