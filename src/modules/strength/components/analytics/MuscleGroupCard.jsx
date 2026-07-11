import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { C } from "../../../../lib/theme";
import { frequencyByMuscleGroup, volumeByMuscleGroup } from "../../analytics";
import { Card, CardHeader, SegmentedControl } from "../../../../components/ui";

const MODE_OPTIONS = [
  { value: "volume", label: "Volume" },
  { value: "frequencia", label: "Frequência" },
];

export function MuscleGroupCard({ sessions, windowWeeks }) {
  const [mode, setMode] = useState("volume");

  const data = useMemo(
    () => (mode === "volume" ? volumeByMuscleGroup(sessions) : frequencyByMuscleGroup(sessions, windowWeeks)),
    [sessions, mode, windowWeeks]
  );
  const total = data.reduce((a, d) => a + d.value, 0);

  return (
    <Card>
      <CardHeader
        title="Distribuição por grupo muscular"
        description={mode === "volume" ? "Kg acumulados, histórico completo" : `Sessões que treinaram cada grupo, últimas ${windowWeeks} semanas`}
        right={<SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />}
      />
      {data.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: C.gray }}>Sem dados suficientes ainda.</p>
      ) : (
        <>
          <div style={{ height: 190 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={2}>
                  {data.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }}
                  formatter={(v, n) => [mode === "volume" ? `${v.toLocaleString("pt-BR")} kg` : `${v}x`, n]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-1.5 mt-2">
            {data.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5" style={{ color: C.white }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: d.color, display: "inline-block" }} />
                  {d.name}
                </span>
                <span style={{ color: C.gray }}>
                  {mode === "volume" ? `${d.value.toLocaleString("pt-BR")} kg` : `${d.value}x`}
                  {mode === "volume" && total > 0 && ` (${Math.round((d.value / total) * 100)}%)`}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
