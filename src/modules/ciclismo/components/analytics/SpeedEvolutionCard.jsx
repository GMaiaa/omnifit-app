import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity } from "lucide-react";
import { C } from "../../../../lib/theme";
import { fmtDateShort, fmtSpeed } from "../../../../lib/format";
import { typeInfo } from "../../constants";
import { speedTrendByType } from "../../analytics";
import { Card, CardHeader, DeltaBadge, EmptyState } from "../../../../components/ui";

export function SpeedEvolutionCard({ workouts, typeId, windowWeeks }) {
  const type = typeInfo(typeId);
  const trend = useMemo(() => speedTrendByType(workouts, typeId, windowWeeks), [workouts, typeId, windowWeeks]);

  const data = useMemo(
    () => trend.points.map((p, i) => ({
      label: fmtDateShort(p.date),
      speed: p.speed,
      trendline: trend.trendline[i]?.value ?? null,
    })),
    [trend]
  );

  if (trend.count < 2) {
    return (
      <EmptyState
        icon={Activity}
        title={`Sem dados suficientes de ${type.label}`}
        description={`Registre mais treinos de ${type.label} para ver a evolução da velocidade nesse esforço.`}
      />
    );
  }

  return (
    <Card>
      <CardHeader
        title={`Evolução de velocidade — ${type.label}`}
        description={`Últimas ${windowWeeks} semanas, km/h (${trend.count} treinos)`}
        right={<DeltaBadge value={trend.speedChangePct} />}
      />
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -20, right: 8 }}>
            <CartesianGrid stroke={C.borderSoft} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: C.gray, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false} />
            <YAxis
              tick={{ fill: C.gray, fontSize: 11 }} axisLine={false} tickLine={false}
              domain={["dataMin - 2", "dataMax + 2"]} tickFormatter={fmtSpeed}
            />
            <Tooltip
              contentStyle={{ background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }}
              labelStyle={{ color: C.white }}
              formatter={(v, name) => [v ? `${fmtSpeed(v)} km/h` : "—", name === "trendline" ? "Tendência" : "Velocidade"]}
            />
            <Line type="monotone" dataKey="speed" stroke={type.color} strokeWidth={2.5} dot={{ fill: type.color, r: 3 }} connectNulls />
            <Line type="monotone" dataKey="trendline" stroke={C.gray} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
