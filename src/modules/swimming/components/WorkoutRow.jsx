import { Trash2, Waves } from "lucide-react";
import { C } from "../../../lib/theme";
import { fmtDateShort, fmtDistanceM, fmtDuration, fmtPace } from "../../../lib/format";
import { ENVIRONMENTS, strokeInfo, typeInfo } from "../constants";
import { paceOf } from "../analytics";
import { Pill } from "../../../components/ui";

function poolLabel(w) {
  if (w.environment === "aguas_abertas") return ENVIRONMENTS.find((e) => e.id === "aguas_abertas").label;
  if (!w.poolLengthM) return "Piscina";
  return `Piscina ${w.poolLengthM}m`;
}

/* ---------------------------------------------------------
   WORKOUT LIST ROW
--------------------------------------------------------- */
export function WorkoutRow({ w, onDelete }) {
  const t = typeInfo(w.type);
  const s = strokeInfo(w.stroke);
  const pace = paceOf(w);
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
          <Pill color={s.color}>{s.label}</Pill>
          <span className="flex items-center gap-1" style={{ color: C.gray, fontSize: 11 }}>
            <Waves size={11} /> {poolLabel(w)}
          </span>
          {w.rpe && <span style={{ color: C.gray, fontSize: 11 }}>RPE {w.rpe}</span>}
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm flex-wrap" style={{ color: C.white }}>
          <span>{fmtDistanceM(w.distanceM)}</span>
          <span style={{ color: C.gray }}>•</span>
          <span>{fmtDuration(w.durationSec)}</span>
          <span style={{ color: C.gray }}>•</span>
          <span>{fmtPace(pace)} /100m</span>
          {w.avgSwolf != null && (
            <>
              <span style={{ color: C.gray }}>•</span>
              <span>SWOLF {w.avgSwolf}</span>
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
