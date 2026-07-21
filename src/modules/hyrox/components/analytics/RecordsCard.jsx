import { useMemo } from "react";
import { Trophy } from "lucide-react";
import { C } from "../../../../lib/theme";
import { fmtDuration, fmtPace } from "../../../../lib/format";
import { exerciseOptions, personalRecords } from "../../analytics";
import { Card, CardHeader } from "../../../../components/ui";

function formatMetricValue(metricType, value) {
  if (value === null || value === undefined) return "—";
  if (metricType === "reps") return `${Math.round(value)} reps`;
  if (metricType === "load") return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
  if (metricType === "time") return fmtDuration(value);
  return `${fmtPace(value)} /km`;
}

export function RecordsCard({ sessions }) {
  const records = useMemo(() => personalRecords(sessions), [sessions]);
  const exercises = useMemo(() => exerciseOptions(sessions).slice(0, 12), [sessions]);

  return (
    <Card>
      <CardHeader title="Recordes pessoais" description="Melhor resultado por exercício, de acordo com o tipo de registro" />

      {exercises.length === 0 ? (
        <p className="text-sm py-4" style={{ color: C.gray }}>Sem treinos registrados ainda.</p>
      ) : (
        <div className="overflow-x-auto -mx-1 mb-4">
          <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th className="text-left px-2 py-1.5" style={{ color: C.gray, fontWeight: 600 }}>Exercício</th>
                <th className="text-right px-2 py-1.5" style={{ color: C.gray, fontWeight: 600 }}>Melhor resultado</th>
              </tr>
            </thead>
            <tbody>
              {exercises.map((opt) => {
                const rec = records.byExercise[opt.key];
                return (
                  <tr key={opt.key} style={{ borderTop: `1px solid ${C.borderSoft}` }}>
                    <td className="px-2 py-1.5" style={{ color: C.white, fontWeight: 600 }}>{opt.name}</td>
                    <td className="text-right px-2 py-1.5" style={{ color: rec ? C.white : C.gray }}>
                      {rec ? formatMetricValue(rec.metricType, rec.bestValue) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {records.bestWeek && records.bestWeek.durationSec > 0 && (
        <div className="flex gap-4 pt-3 flex-wrap" style={{ borderTop: `1px solid ${C.borderSoft}` }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: C.gray }}>
            <Trophy size={13} style={{ color: C.amber }} />
            Melhor semana: <span style={{ color: C.white, fontWeight: 600 }}>{fmtDuration(records.bestWeek.durationSec)}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
