import { useCallback, useEffect, useMemo, useState } from "react";
import { STORAGE_KEY } from "./constants";

/* Loads/persists Corrida workouts via window.storage and hands back the
   list already sorted newest-first — the shape both the Home and the
   Corrida module need. */
export function useWorkouts() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, false);
        setWorkouts(res ? JSON.parse(res.value) : []);
      } catch {
        setWorkouts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next) => {
    setWorkouts(next);
    try {
      const res = await window.storage.set(STORAGE_KEY, JSON.stringify(next), false);
      if (!res) setSaveError("Não foi possível salvar. Tente novamente.");
      else setSaveError("");
    } catch {
      setSaveError("Não foi possível salvar. Tente novamente.");
    }
  }, []);

  const addWorkout = useCallback((w) => {
    persist([w, ...workouts].sort((a, b) => (a.date < b.date ? 1 : -1)));
  }, [workouts, persist]);

  const deleteWorkout = useCallback((id) => {
    persist(workouts.filter((w) => w.id !== id));
  }, [workouts, persist]);

  const sorted = useMemo(
    () => [...workouts].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [workouts]
  );

  return { workouts: sorted, loading, saveError, addWorkout, deleteWorkout };
}
