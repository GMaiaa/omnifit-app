import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity } from "lucide-react";
import { C } from "../../../../lib/theme";
import { fmtDateShort, fmtPace } from "../../../../lib/format";
import { typeInfo } from "../../constants";
import { paceTrendByType } from "../../analytics";
import { Card, CardHeader, DeltaBadge, EmptyState } from "../../../../components/ui";

export function PaceEvolutionCard({ workouts, typeId, windowWeeks }) {
  const type = typeInfo(typeId);
  const trend = useMemo(() => paceTrendByType(workouts, typeId, windowWeeks), [workouts, typeId, windowWeeks]);

  const data = useMemo(
    () => trend.points.map((p, i) => ({
      label: fmtDateShort(p.date),
      pace: p.pace,
      trendline: trend.trendline[i]?.value ?? null,
    })),
    [trend]
  );

  if (trend.count < 2) {
    return (
      <EmptyState
        icon={Activity}
        title={`Sem dados suficientes de ${type.label}`}
        description={`Registre mais treinos de ${type.label} para ver a evolução do pace nesse esforço.`}
      />
    );
  }

  return (
    <Card>
      <CardHeader
        title={`Evolução de pace — ${type.label}`}
        description={`Últimas ${windowWeeks} semanas, min/km (${trend.count} treinos)`}
        right={<DeltaBadge value={trend.paceChangePct} positiveIsGood={false} />}
      />
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -20, right: 8 }}>
            <CartesianGrid stroke={C.borderSoft} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: C.gray, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false} />
            <YAxis
              tick={{ fill: C.gray, fontSize: 11 }} axisLine={false} tickLine={false}
              reversed domain={["dataMin - 10", "dataMax + 10"]} tickFormatter={fmtPace}
            />
            <Tooltip
              contentStyle={{ background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }}
              labelStyle={{ color: C.white }}
              formatter={(v, name) => [v ? `${fmtPace(v)} /km` : "—", name === "trendline" ? "Tendência" : "Pace"]}
            />
            <Line type="monotone" dataKey="pace" stroke={type.color} strokeWidth={2.5} dot={{ fill: type.color, r: 3 }} connectNulls />
            <Line type="monotone" dataKey="trendline" stroke={C.gray} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
