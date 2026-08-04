import { C } from "../../lib/theme";
import { todayStr } from "../../lib/format";
import { daysBetween } from "../dateUtils";
import { WEEKDAY_LABELS, workoutModalityInfo, workoutStatusInfo } from "../constants";

const MAX_VISIBLE_PER_DAY = 3;

function WorkoutChip({ workout, onEdit }) {
  const color = workout.modality ? workoutModalityInfo(workout.modality).color : workoutStatusInfo(workout.status).color;
  const done = workout.status === "completed";
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onEdit(workout); }}
      className="w-full flex items-center gap-1 rounded px-1.5 py-0.5 text-left"
      style={{ background: `${color}1F`, opacity: done ? 0.6 : 1 }}
    >
      <span className="flex-shrink-0 rounded-full" style={{ width: 5, height: 5, background: color }} />
      <span className="truncate text-[10px] font-semibold" style={{ color: C.white, textDecoration: done ? "line-through" : "none" }}>
        {workout.title}
      </span>
    </button>
  );
}

export function MonthView({ range, anchorDate, workouts, onSelectDay, onEdit }) {
  const days = daysBetween(range.start, range.end);
  const today = todayStr();
  const currentMonth = anchorDate.slice(0, 7);

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold py-1" style={{ color: C.gray }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((date) => {
          const dayWorkouts = workouts
            .filter((w) => w.scheduledDate === date)
            .sort((a, b) => (a.scheduledTime || "99:99").localeCompare(b.scheduledTime || "99:99"));
          const inMonth = date.slice(0, 7) === currentMonth;
          const isToday = date === today;
          const visible = dayWorkouts.slice(0, MAX_VISIBLE_PER_DAY);
          const overflow = dayWorkouts.length - visible.length;

          return (
            <div
              key={date}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDay(date)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelectDay(date); }}
              className="flex flex-col items-stretch text-left rounded-lg p-1 min-h-[76px] sm:min-h-[92px] cursor-pointer"
              style={{
                background: C.surface2,
                border: `1px solid ${isToday ? C.positive : C.borderSoft}`,
                opacity: inMonth ? 1 : 0.4,
              }}
            >
              <span
                className="text-[11px] font-semibold mb-1 self-start rounded-full px-1.5"
                style={{ color: isToday ? C.positive : C.gray }}
              >
                {Number(date.slice(8, 10))}
              </span>
              <div className="flex flex-col gap-0.5 min-w-0">
                {visible.map((w) => <WorkoutChip key={w.id} workout={w} onEdit={onEdit} />)}
                {overflow > 0 && (
                  <span className="text-[10px] px-1.5" style={{ color: C.gray }}>+{overflow} mais</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
