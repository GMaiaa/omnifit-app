import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Target } from "lucide-react";
import { C } from "../../../../lib/theme";
import { fmtDuration } from "../../../../lib/format";
import { focusDistribution } from "../../analytics";
import { Card, CardHeader, EmptyState } from "../../../../components/ui";

export function FocusDistributionCard({ sessions }) {
  const data = useMemo(() => focusDistribution(sessions), [sessions]);

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="Sem dados de objetivo"
        description="Registre treinos para ver a distribuição de tempo por objetivo (força, resistência, prova...)."
      />
    );
  }

  return (
    <Card>
      <CardHeader title="Distribuição por objetivo" description="Tempo treinado, histórico completo" />
      <div style={{ height: 190 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={2}>
              {data.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }}
              formatter={(v, n) => [fmtDuration(v), n]}
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
            <span style={{ color: C.gray }}>{fmtDuration(d.value)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
