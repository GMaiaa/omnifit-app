import { CalendarDays } from "lucide-react";
import { EmptyState } from "../../components/ui";
import { WorkoutRow } from "./WorkoutRow";

export function DayView({ date, workouts, onEdit, onDelete, onToggleComplete }) {
  const dayWorkouts = workouts
    .filter((w) => w.scheduledDate === date)
    .sort((a, b) => (a.scheduledTime || "99:99").localeCompare(b.scheduledTime || "99:99"));

  if (dayWorkouts.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Nenhum treino planejado pra esse dia"
        description='Toque em "Novo treino" pra adicionar um.'
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {dayWorkouts.map((w) => (
        <WorkoutRow key={w.id} workout={w} onEdit={onEdit} onDelete={onDelete} onToggleComplete={onToggleComplete} />
      ))}
    </div>
  );
}
