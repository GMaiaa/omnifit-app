import { useCallback, useEffect, useState } from "react";
import { getCyclingWorkouts, deleteCyclingWorkout, mapCyclingWorkoutError } from "./cyclingService";

/* Mesma ordenação usada pela consulta ao Supabase (data desc, created_at
   desc em caso de empate) — reaplicada aqui sempre que o estado local muda
   por fora de uma nova consulta (inclusão ou edição). */
function sortWorkouts(list) {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });
}

/* Busca os treinos reais de public.cycling_workouts e os compartilha, já no
   mesmo formato (camelCase) que Dashboard/AnalyticsTab/WorkoutRow/Home
   sempre esperaram. Substitui a versão anterior baseada em window.storage
   (API que só existe dentro do preview de Artifacts do Claude e não tinha
   nenhuma implementação real no app publicado — por isso os treinos de
   ciclismo nunca eram persistidos de fato em produção). */
export function useCyclingWorkouts() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState("");

  const fetchWorkouts = useCallback(async () => {
    setLoading(true);
    setSaveError("");
    try {
      const rows = await getCyclingWorkouts();
      setWorkouts(rows);
    } catch (err) {
      setSaveError(mapCyclingWorkoutError(err, "Não foi possível carregar seus treinos. Tente novamente."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  /* Inclusão direta no estado compartilhado após um cadastro bem-sucedido
     (formulário manual ou upload de .fit) — evita uma segunda consulta ao
     Supabase. Usa o registro já retornado pelo insert (id/created_at
     reais), deduplica por id e preserva a ordenação da consulta. */
  const addWorkout = useCallback((w) => {
    setWorkouts((prev) => {
      if (prev.some((existing) => existing.id === w.id)) return prev;
      return sortWorkouts([w, ...prev]);
    });
  }, []);

  /* Substitui o registro editado pela versão retornada pelo update —
     reordena porque a data editada pode ter mudado a posição do treino. */
  const updateWorkout = useCallback((updated) => {
    setWorkouts((prev) => sortWorkouts(prev.map((w) => (w.id === updated.id ? updated : w))));
  }, []);

  const deleteWorkout = useCallback(async (id) => {
    const prev = workouts;
    setWorkouts((current) => current.filter((w) => w.id !== id));
    try {
      await deleteCyclingWorkout(id);
    } catch (err) {
      setWorkouts(prev);
      setSaveError(mapCyclingWorkoutError(err, "Não foi possível excluir o treino. Tente novamente."));
    }
  }, [workouts]);

  return { workouts, loading, saveError, addWorkout, updateWorkout, deleteWorkout, refetch: fetchWorkouts };
}
