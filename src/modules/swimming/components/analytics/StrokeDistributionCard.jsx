import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Waves } from "lucide-react";
import { C } from "../../../../lib/theme";
import { fmtDistanceM } from "../../../../lib/format";
import { volumeByStroke } from "../../analytics";
import { Card, CardHeader, EmptyState } from "../../../../components/ui";

export function StrokeDistributionCard({ workouts }) {
  const data = useMemo(() => volumeByStroke(workouts), [workouts]);

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Waves}
        title="Sem dados de estilo"
        description="Registre treinos para ver a distribuição por estilo de nado."
      />
    );
  }

  return (
    <Card>
      <CardHeader title="Distribuição por estilo" description="Metros acumulados, histórico completo" />
      <div style={{ height: 190 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={2}>
              {data.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }}
              formatter={(v, n) => [fmtDistanceM(v), n]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-1.5 mt-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5" style={{ color: C.white }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: d.color, display: "inline-block" }} />
              {d.name}
            </span>
            <span style={{ color: C.gray }}>{fmtDistanceM(d.value)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
