import { useCallback, useEffect, useState } from "react";
import { getRunningWorkouts, mapRunningWorkoutError } from "./runningService";

/* Mesma ordenação usada pela consulta ao Supabase (data desc, created_at
   desc em caso de empate) — reaplicada aqui sempre que o estado local muda
   por fora de uma nova consulta (inclusão ou edição). */
function sortWorkouts(list) {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });
}

/* Busca os treinos reais de public.running_workouts e os compartilha, já no
   mesmo formato (camelCase) que Dashboard, AnalyticsTab, WorkoutRow e a Home
   (camada cruzada de modalidades) sempre consumiram — trocar só a origem
   dos dados aqui é o que basta para essas telas pararem de usar mock. */
export function useWorkouts() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchWorkouts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await getRunningWorkouts();
      setWorkouts(rows);
    } catch (err) {
      setError(mapRunningWorkoutError(err, "Não foi possível carregar seus treinos. Tente novamente."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  /* Inclusão direta no estado compartilhado após um cadastro bem-sucedido —
     evita uma segunda consulta ao Supabase. Usa o registro retornado pelo
     insert (id/created_at reais), deduplica por id e preserva a mesma
     ordenação da consulta (data desc, created_at desc em caso de empate). */
  const addWorkout = useCallback((w) => {
    setWorkouts((prev) => {
      if (prev.some((existing) => existing.id === w.id)) return prev;
      return sortWorkouts([w, ...prev]);
    });
  }, []);

  /* Substitui o registro editado pela versão já retornada pelo update
     (mesmo raciocínio do addWorkout: nada de reconsultar a lista inteira) —
     reordena porque a data editada pode ter mudado a posição do treino. */
  const updateWorkout = useCallback((updated) => {
    setWorkouts((prev) => sortWorkouts(prev.map((w) => (w.id === updated.id ? updated : w))));
  }, []);

  const removeWorkout = useCallback((id) => {
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  }, []);

  return { workouts, loading, error, addWorkout, updateWorkout, removeWorkout, refetch: fetchWorkouts };
}
