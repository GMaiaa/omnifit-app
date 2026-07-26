import { HeartPulse, Mountain, Trash2 } from "lucide-react";
import { C } from "../../../lib/theme";
import { fmtDateShort, fmtDuration, fmtElevation, fmtSpeed } from "../../../lib/format";
import { typeInfo } from "../constants";
import { Pill } from "../../../components/ui";

/* ---------------------------------------------------------
   WORKOUT LIST ROW
--------------------------------------------------------- */
export function WorkoutRow({ w, onDelete }) {
  const t = typeInfo(w.type);
  const speed = w.distanceKm / (w.durationSec / 3600);
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
          {w.rpe && <span style={{ color: C.gray, fontSize: 11 }}>RPE {w.rpe}</span>}
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm flex-wrap" style={{ color: C.white }}>
          <span>{w.distanceKm.toLocaleString("pt-BR")} km</span>
          <span style={{ color: C.gray }}>•</span>
          <span>{fmtDuration(w.durationSec)}</span>
          <span style={{ color: C.gray }}>•</span>
          <span>{fmtSpeed(speed)} km/h</span>
          {w.elevationGainM && (
            <>
              <span style={{ color: C.gray }}>•</span>
              <span className="flex items-center gap-1"><Mountain size={12} style={{ color: C.gray }} />{fmtElevation(w.elevationGainM)}</span>
            </>
          )}
          {w.avgHr && (
            <>
              <span style={{ color: C.gray }}>•</span>
              <span className="flex items-center gap-1"><HeartPulse size={12} style={{ color: C.danger }} />{w.avgHr}</span>
            </>
          )}
        </div>
        {w.notes && <div className="mt-1 text-xs truncate" style={{ color: C.gray }}>{w.notes}</div>}
      </div>
      <button onClick={() => onDelete(w.id)} className="p-1.5 rounded-lg flex-shrink-0" style={{ color: C.gray }}>
        <Trash2 size={16} />
      </button>
    </div>
  );
}
