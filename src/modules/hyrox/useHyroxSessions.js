import { useCallback, useEffect, useMemo, useState } from "react";
import { STORAGE_KEY_SESSIONS } from "./constants";

/* Loads/persists HYROX execution history via window.storage — mirrors
   strength/useSessions.js. Sessions are append/delete only: a session is
   built up entirely in HyroxRunner's local state and only reaches here once,
   when the workout (salvo ou livre) is finished. */
export function useHyroxSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY_SESSIONS, false);
        setSessions(res ? JSON.parse(res.value) : []);
      } catch {
        setSessions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next) => {
    setSessions(next);
    try {
      const res = await window.storage.set(STORAGE_KEY_SESSIONS, JSON.stringify(next), false);
      if (!res) setSaveError("Não foi possível salvar. Tente novamente.");
      else setSaveError("");
    } catch {
      setSaveError("Não foi possível salvar. Tente novamente.");
    }
  }, []);

  const addSession = useCallback((s) => {
    persist([s, ...sessions].sort((a, b) => (a.date < b.date ? 1 : -1)));
  }, [sessions, persist]);

  const deleteSession = useCallback((id) => {
    persist(sessions.filter((s) => s.id !== id));
  }, [sessions, persist]);

  const sorted = useMemo(
    () => [...sessions].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [sessions]
  );

  return { sessions: sorted, loading, saveError, addSession, deleteSession };
}
