import { HeartPulse, Trash2 } from "lucide-react";
import { C } from "../../../lib/theme";
import { fmtDateShort, fmtPace } from "../../../lib/format";
import { formatDurationHMS } from "../format";
import { typeInfo } from "../constants";
import { Pill } from "../../../components/ui";

/* ---------------------------------------------------------
   WORKOUT LIST ROW
--------------------------------------------------------- */
export function WorkoutRow({ w, onDelete }) {
  const t = typeInfo(w.type);
  // Protege registros antigos: usa o pace salvo no banco (já mapeado por
  // runningService) e só recalcula localmente se ele vier ausente/inválido.
  const pace = w.paceSecKm ?? (w.distanceKm > 0 ? w.durationSec / w.distanceKm : null);
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3 py-3"
      style={{ background: C.surface2, border: `1px solid ${C.borderSoft}` }}
    >
      <div className="flex flex-col items-center justify-center rounded-lg px-2 py-1.5" style={{ background: C.surface, minWidth: 52 }}>
        <span style={{ color: C.gray, fontSize: 10 }}>{fmtDateShort(w.date)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Pill color={t.color}>{t.label}</Pill>
          {w.rpe != null && <span style={{ color: C.gray, fontSize: 11 }}>RPE {w.rpe}/10</span>}
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm flex-wrap" style={{ color: C.white }}>
          <span>{w.distanceKm.toLocaleString("pt-BR")} km</span>
          <span style={{ color: C.gray }}>•</span>
          <span>{formatDurationHMS(w.durationSec)}</span>
          <span style={{ color: C.gray }}>•</span>
          <span>{pace ? `${fmtPace(pace)} /km` : "—"}</span>
          {w.avgHr != null && (
            <>
              <span style={{ color: C.gray }}>•</span>
              <span className="flex items-center gap-1"><HeartPulse size={12} style={{ color: C.danger }} />{w.avgHr}</span>
            </>
          )}
          {w.calories != null && (
            <>
              <span style={{ color: C.gray }}>•</span>
              <span>{w.calories} kcal</span>
            </>
          )}
        </div>
        {w.notes && <div className="mt-1 text-xs truncate" style={{ color: C.gray }}>{w.notes}</div>}
      </div>
      {onDelete && (
        <button onClick={() => onDelete(w.id)} className="p-1.5 rounded-lg flex-shrink-0" style={{ color: C.gray }}>
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}
