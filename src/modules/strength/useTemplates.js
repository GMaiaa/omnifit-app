import { useCallback, useEffect, useState } from "react";
import { getStrengthTemplates, mapStrengthError } from "./strengthService";

/* Busca as fichas reais de public.strength_templates. Mesmo padrão de
   modules/running/useWorkouts.js: a leitura e a criação (via addTemplate,
   chamado com o registro já retornado pelo insert) já são o banco de
   verdade. Editar/excluir ainda não têm um serviço equivalente — por ora só
   atualizam o estado local desta sessão, sem persistir (a próxima parte da
   integração troca isso por update/delete reais em strength_templates). */
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
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t)));
  }, []);

  const deleteTemplate = useCallback((id) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { templates, loading, error, addTemplate, updateTemplate, deleteTemplate, refetch: fetchTemplates };
}
