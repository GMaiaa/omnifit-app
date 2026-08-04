import { C } from "../../lib/theme";
import { fmtDateShort, todayStr } from "../../lib/format";
import { daysBetween } from "../dateUtils";
import { WEEKDAY_LABELS } from "../constants";
import { WorkoutRow } from "./WorkoutRow";

export function WeekView({ range, workouts, onEdit, onDelete, onToggleComplete, onAddOnDate }) {
  const days = daysBetween(range.start, range.end);
  const today = todayStr();

  return (
    <div className="flex flex-col gap-4">
      {days.map((date, i) => {
        const dayWorkouts = workouts
          .filter((w) => w.scheduledDate === date)
          .sort((a, b) => (a.scheduledTime || "99:99").localeCompare(b.scheduledTime || "99:99"));
        const isToday = date === today;

        return (
          <div key={date} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-semibold rounded-full px-2 py-1"
                  style={{
                    background: isToday ? `color-mix(in srgb, ${C.positive} 15%, transparent)` : "transparent",
                    color: isToday ? C.positive : C.gray,
                  }}
                >
                  {WEEKDAY_LABELS[i]} • {fmtDateShort(date)}
                </span>
              </div>
              <button onClick={() => onAddOnDate(date)} className="text-xs font-semibold" style={{ color: C.positive }}>
                + treino
              </button>
            </div>

            {dayWorkouts.length === 0 ? (
              <div className="rounded-xl px-3 py-4 text-center text-xs" style={{ background: C.surface2, border: `1px dashed ${C.borderSoft}`, color: C.gray }}>
                Sem treinos planejados
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {dayWorkouts.map((w) => (
                  <WorkoutRow key={w.id} workout={w} onEdit={onEdit} onDelete={onDelete} onToggleComplete={onToggleComplete} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
