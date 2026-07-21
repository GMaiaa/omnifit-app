import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity } from "lucide-react";
import { C, modalityInfo } from "../../../../lib/theme";
import { fmtDateShort, fmtDuration, fmtPace } from "../../../../lib/format";
import { exerciseProgression } from "../../analytics";
import { Card, CardHeader, DeltaBadge, EmptyState } from "../../../../components/ui";

const hyrox = modalityInfo("hyrox");

function formatMetricValue(metricType, value) {
  if (value === null || value === undefined) return "—";
  if (metricType === "reps") return `${Math.round(value)} reps`;
  if (metricType === "load") return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
  if (metricType === "time") return fmtDuration(value);
  return `${fmtPace(value)} /km`;
}

const METRIC_LABEL = { reps: "Repetições", load: "Carga (kg)", time: "Tempo sustentado", distance: "Pace (/km)" };

export function ExerciseEvolutionCard({ sessions, exerciseKey, exerciseName, windowWeeks }) {
  const trend = useMemo(
    () => (exerciseKey ? exerciseProgression(sessions, exerciseKey, windowWeeks) : { points: [], count: 0 }),
    [sessions, exerciseKey, windowWeeks]
  );

  const data = useMemo(
    () => trend.points.map((p, i) => ({
      label: fmtDateShort(p.date),
      value: p.primaryValue,
      trendline: trend.trendline[i]?.value ?? null,
    })),
    [trend]
  );

  if (trend.count < 2) {
    return (
      <EmptyState
        icon={Activity}
        title={exerciseName ? `Sem dados suficientes de ${exerciseName}` : "Sem dados suficientes"}
        description="Registre mais execuções desse exercício para ver a evolução de performance."
      />
    );
  }

  return (
    <Card>
      <CardHeader
        title={`Evolução de performance — ${exerciseName}`}
        description={`${METRIC_LABEL[trend.metricType]}, últimas ${windowWeeks} semanas (${trend.count} execuções)`}
        right={<DeltaBadge value={trend.changePct} positiveIsGood={trend.metricType !== "distance"} />}
      />
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -10, right: 8 }}>
            <CartesianGrid stroke={C.borderSoft} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: C.gray, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false} />
            <YAxis
              tick={{ fill: C.gray, fontSize: 11 }} axisLine={false} tickLine={false}
              reversed={trend.metricType === "distance"} domain={["dataMin - 5", "dataMax + 5"]}
            />
            <Tooltip
              contentStyle={{ background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }}
              labelStyle={{ color: C.white }}
              formatter={(v, name) => [v !== null ? formatMetricValue(trend.metricType, v) : "—", name === "trendline" ? "Tendência" : "Resultado"]}
            />
            <Line type="monotone" dataKey="value" stroke={hyrox.color} strokeWidth={2.5} dot={{ fill: hyrox.color, r: 3 }} connectNulls />
            <Line type="monotone" dataKey="trendline" stroke={C.gray} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
