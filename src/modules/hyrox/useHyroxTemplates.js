import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEY_TEMPLATES } from "./constants";

/* Loads/persists HYROX templates ("fichas") via window.storage — same shape
   of hook as strength/useTemplates.js. Templates only ever hold structure
   (block list/order/rounds), never actual reps/carga/tempo registrados —
   those live on Sessions instead (see useHyroxSessions.js). */
export function useHyroxTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY_TEMPLATES, false);
        setTemplates(res ? JSON.parse(res.value) : []);
      } catch {
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next) => {
    setTemplates(next);
    try {
      const res = await window.storage.set(STORAGE_KEY_TEMPLATES, JSON.stringify(next), false);
      if (!res) setSaveError("Não foi possível salvar. Tente novamente.");
      else setSaveError("");
    } catch {
      setSaveError("Não foi possível salvar. Tente novamente.");
    }
  }, []);

  const addTemplate = useCallback((t) => {
    persist([t, ...templates]);
  }, [templates, persist]);

  const updateTemplate = useCallback((id, patch) => {
    persist(templates.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t)));
  }, [templates, persist]);

  const deleteTemplate = useCallback((id) => {
    persist(templates.filter((t) => t.id !== id));
  }, [templates, persist]);

  return { templates, loading, saveError, addTemplate, updateTemplate, deleteTemplate };
}
