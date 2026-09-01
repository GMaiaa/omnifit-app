import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity } from "lucide-react";
import { C, modalityInfo } from "../../../../lib/theme";
import { fmtDateShort, fmtDuration } from "../../../../lib/format";
import { loadProgression } from "../../analytics";
import { Card, CardHeader, DeltaBadge, EmptyState } from "../../../../components/ui";

const musculacao = modalityInfo("musculacao");

function formatValue(metricType, v) {
  if (v === null || v === undefined) return "—";
  if (metricType === "time") return fmtDuration(v);
  if (metricType === "reps_only") return `${Math.round(v)} reps`;
  return `${v} kg`;
}

export function StrengthEvolutionCard({ sessions, exerciseKey, exerciseName, windowWeeks }) {
  const trend = useMemo(
    () => (exerciseKey ? loadProgression(sessions, exerciseKey, windowWeeks) : { points: [], count: 0 }),
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
        description="Registre mais execuções desse exercício para ver a evolução de força."
      />
    );
  }

  const metricLabel = trend.metricType === "time" ? "Hold mais longo" : trend.metricType === "reps_only" ? "Melhor repetição" : "1RM estimado";

  return (
    <Card>
      <CardHeader
        title={`Evolução de força — ${exerciseName}`}
        description={`${metricLabel}, últimas ${windowWeeks} semanas (${trend.count} execuções)`}
        right={<DeltaBadge value={trend.loadChangePct} />}
      />
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -10, right: 8 }}>
            <CartesianGrid stroke={C.borderSoft} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: C.gray, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false} />
            <YAxis tick={{ fill: C.gray, fontSize: 11 }} axisLine={false} tickLine={false} domain={["dataMin - 5", "dataMax + 5"]} />
            <Tooltip
              contentStyle={{ background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }}
              labelStyle={{ color: C.white }}
              formatter={(v, name) => [formatValue(trend.metricType, v), name === "trendline" ? "Tendência" : metricLabel]}
            />
            <Line type="monotone" dataKey="value" stroke={musculacao.color} strokeWidth={2.5} dot={{ fill: musculacao.color, r: 3 }} connectNulls />
            <Line type="monotone" dataKey="trendline" stroke={C.gray} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
