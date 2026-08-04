import { useCallback, useEffect, useState } from "react";
import { getOrCreateCalendar, getWorkouts, mapCalendarError } from "./calendarService";

/* Carrega (ou cria, na primeira visita) o calendário do usuário e os
   treinos dentro de um intervalo de datas — o range muda toda vez que o
   usuário troca de dia/semana/mês ou navega pra frente/trás, então cada
   troca de range dispara uma nova consulta (só o que a tela precisa, não
   o histórico inteiro). */
export function useCalendar(range) {
  const [calendar, setCalendar] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCalendar = useCallback(async () => {
    try {
      const cal = await getOrCreateCalendar();
      setCalendar(cal);
      return cal;
    } catch (err) {
      setError(mapCalendarError(err, "Não foi possível carregar seu calendário. Tente novamente."));
      return null;
    }
  }, []);

  const fetchWorkouts = useCallback(async (calendarId, r) => {
    if (!calendarId || !r) return;
    setLoading(true);
    setError("");
    try {
      const rows = await getWorkouts(calendarId, r);
      setWorkouts(rows);
    } catch (err) {
      setError(mapCalendarError(err, "Não foi possível carregar os treinos. Tente novamente."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const cal = calendar ?? (await fetchCalendar());
      if (cal) await fetchWorkouts(cal.id, range);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range?.start, range?.end]);

  const refetch = useCallback(() => {
    if (calendar) fetchWorkouts(calendar.id, range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendar, range?.start, range?.end]);

  const addWorkout = useCallback((w) => {
    setWorkouts((prev) => (prev.some((existing) => existing.id === w.id) ? prev : [...prev, w]));
  }, []);

  const replaceWorkout = useCallback((updated) => {
    setWorkouts((prev) => {
      const stillInRange = range && updated.scheduledDate >= range.start && updated.scheduledDate <= range.end;
      const withoutOld = prev.filter((w) => w.id !== updated.id);
      return stillInRange ? [...withoutOld, updated] : withoutOld;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range?.start, range?.end]);

  const removeWorkout = useCallback((id) => {
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  }, []);

  return { calendar, workouts, loading, error, addWorkout, replaceWorkout, removeWorkout, refetch };
}
