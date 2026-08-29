import { useCallback, useEffect, useState } from "react";
import { getHyroxTemplates, mapHyroxError } from "./hyroxService";

/* Busca as fichas reais de public.hyrox_templates. Mesmo padrão de
   strength/useTemplates.js: leitura, criação, edição e exclusão já são o
   banco de verdade — addTemplate/updateTemplate/deleteTemplate só refletem
   no estado local o que o caller já confirmou com hyroxService.js. */
export function useHyroxTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await getHyroxTemplates();
      setTemplates(rows);
    } catch (err) {
      setError(mapHyroxError(err, "Não foi possível carregar seus treinos. Tente novamente."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  /* Inclusão direta no estado compartilhado após um cadastro bem-sucedido —
     evita uma segunda consulta ao Supabase. Usa o registro retornado pelo
     insert (id/created_at/updated_at reais) e deduplica por id. */
  const addTemplate = useCallback((t) => {
    setTemplates((prev) => (prev.some((existing) => existing.id === t.id) ? prev : [t, ...prev]));
  }, []);

  const updateTemplate = useCallback((id, patch) => {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const deleteTemplate = useCallback((id) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { templates, loading, error, addTemplate, updateTemplate, deleteTemplate, refetch: fetchTemplates };
}
