import { useCallback, useEffect, useState } from "react";
import { getStrengthTemplates, mapStrengthError } from "./strengthService";

/* Busca as fichas reais de public.strength_templates. Mesmo padrão de
   modules/running/useWorkouts.js: leitura, criação, edição e exclusão já são
   o banco de verdade — addTemplate/updateTemplate/deleteTemplate só refletem
   no estado local o que o caller já confirmou com strengthService.js. */
export function useTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await getStrengthTemplates();
      setTemplates(rows);
    } catch (err) {
      setError(mapStrengthError(err, "Não foi possível carregar seus treinos. Tente novamente."));
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
