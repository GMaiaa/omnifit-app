import { Trash2 } from "lucide-react";
import { C } from "../../../lib/theme";
import { DRILL_LIBRARY, drillLabel, strokeInfo } from "../constants";
import { uid } from "../../../lib/format";

const inputStyle = { background: C.surface, border: `1px solid ${C.border}`, color: C.white };

/* Biblioteca de exercícios educativos, organizada por estilo. Tocar num
   exercício adiciona (ou remove) uma linha de detalhe abaixo — é a base do
   histórico de evolução técnica do nadador. */
export function DrillPicker({ entries, onChange }) {
  function addEntry(drillId) {
    if (entries.some((e) => e.drillId === drillId)) return;
    onChange([...entries, { id: uid(), drillId, reps: "", distanceM: "", notes: "" }]);
  }
  function updateEntry(id, patch) {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }
  function removeEntry(id) {
    onChange(entries.filter((e) => e.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      {DRILL_LIBRARY.map((group) => {
        const stroke = strokeInfo(group.strokeId);
        return (
          <div key={group.strokeId}>
            <div className="text-xs font-semibold mb-1.5" style={{ color: stroke.color }}>{stroke.label}</div>
            <div className="flex flex-wrap gap-1.5">
              {group.drills.map((d) => {
                const activeEntry = entries.find((e) => e.drillId === d.id);
                return (
                  <button
                    key={d.id} type="button"
                    onClick={() => (activeEntry ? removeEntry(activeEntry.id) : addEntry(d.id))}
                    className="rounded-full px-2.5 py-1 text-xs font-semibold transition"
                    style={{
                      background: activeEntry ? `${stroke.color}26` : C.surface2,
                      color: activeEntry ? stroke.color : C.gray,
                      border: `1px solid ${activeEntry ? stroke.color : C.border}`,
                    }}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {entries.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center gap-2 rounded-lg p-2" style={{ background: C.surface2, border: `1px solid ${C.borderSoft}` }}>
              <span className="text-xs flex-1 min-w-0 truncate" style={{ color: C.white }}>{drillLabel(e.drillId)}</span>
              <input
                type="number" min="0" placeholder="séries" value={e.reps}
                onChange={(ev) => updateEntry(e.id, { reps: ev.target.value })}
                className="w-16 rounded-md px-1.5 py-1 text-xs outline-none" style={inputStyle}
              />
              <input
                type="number" min="0" placeholder="m" value={e.distanceM}
                onChange={(ev) => updateEntry(e.id, { distanceM: ev.target.value })}
                className="w-16 rounded-md px-1.5 py-1 text-xs outline-none" style={inputStyle}
              />
              <button type="button" onClick={() => removeEntry(e.id)} className="p-1 rounded-md flex-shrink-0" style={{ color: C.gray }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
