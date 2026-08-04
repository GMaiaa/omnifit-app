import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { C } from "../../lib/theme";
import { fmtDuration } from "../../lib/format";
import { Pill } from "../../components/ui";
import { workoutModalityInfo, workoutStatusInfo } from "../constants";
import { MODALITY_ICON_COMPONENTS } from "../modalityIcons";

export function WorkoutRow({ workout, onEdit, onDelete, onToggleComplete }) {
  const modality = workout.modality ? workoutModalityInfo(workout.modality) : null;
  const status = workoutStatusInfo(workout.status);
  const Icon = modality ? MODALITY_ICON_COMPONENTS[modality.icon] : null;
  const done = workout.status === "completed";

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-3"
      style={{ background: C.surface2, border: `1px solid ${C.borderSoft}`, opacity: workout.status === "canceled" ? 0.55 : 1 }}
    >
      <button onClick={() => onToggleComplete(workout)} className="p-1 flex-shrink-0">
        {done ? <CheckCircle2 size={20} style={{ color: C.positive }} /> : <Circle size={20} style={{ color: C.gray }} />}
      </button>

      {Icon && (
        <div className="rounded-lg p-1.5 flex-shrink-0" style={{ background: `${modality.color}1A`, color: modality.color }}>
          <Icon size={16} />
        </div>
      )}

      <button onClick={() => onEdit(workout)} className="flex-1 min-w-0 text-left">
        <div className="text-sm font-semibold truncate" style={{ color: C.white }}>{workout.title}</div>
        <div className="flex items-center gap-2 mt-0.5 text-xs flex-wrap" style={{ color: C.gray }}>
          {workout.scheduledTime && <span>{workout.scheduledTime.slice(0, 5)}</span>}
          {workout.durationSec > 0 && <span>{workout.scheduledTime && "• "}{fmtDuration(workout.durationSec)}</span>}
          {workout.blocks.length > 0 && <span>• {workout.blocks.length} etapa{workout.blocks.length > 1 ? "s" : ""}</span>}
        </div>
      </button>

      <Pill color={status.color}>{status.label}</Pill>

      <button onClick={() => onDelete(workout.id)} className="p-1.5 rounded-lg flex-shrink-0" style={{ color: C.gray }}>
        <Trash2 size={14} />
      </button>
    </div>
  );
}
