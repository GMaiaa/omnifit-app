import { useMemo, useState } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { C, modalityInfo } from "../../../../lib/theme";
import { fmtDuration } from "../../../../lib/format";
import { monthlyVolume, weeklyVolume } from "../../analytics";
import { Card, CardHeader, SegmentedControl } from "../../../../components/ui";

const hyrox = modalityInfo("hyrox");

const MODE_OPTIONS = [
  { value: "semana", label: "Semanal" },
  { value: "mes", label: "Mensal" },
];

export function VolumeCard({ sessions, windowWeeks }) {
  const [mode, setMode] = useState("semana");

  const weekly = useMemo(() => weeklyVolume(sessions, windowWeeks), [sessions, windowWeeks]);
  const monthly = useMemo(() => monthlyVolume(sessions, 6), [sessions]);

  const data = useMemo(
    () => (mode === "semana"
      ? weekly.weeks.map((w, i) => ({ label: w.label, durationMin: Math.round(w.durationSec / 60), variacao: weekly.weekOverWeek[i] }))
      : monthly.map((m) => ({ label: m.label, durationMin: Math.round(m.durationSec / 60), variacao: null }))),
    [mode, weekly, monthly]
  );

  return (
    <Card>
      <CardHeader
        title="Volume de treino"
        description={mode === "semana"
          ? `Últimas ${windowWeeks} semanas · média ${fmtDuration(weekly.avgDurationSec)}`
          : "Últimos 6 meses, tempo total treinado"}
        right={<SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />}
      />
      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: -10, right: 8 }}>
            <CartesianGrid stroke={C.borderSoft} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: C.gray, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false} />
            <YAxis yAxisId="min" tick={{ fill: C.gray, fontSize: 11 }} axisLine={false} tickLine={false} />
            {mode === "semana" && (
              <YAxis
                yAxisId="pct" orientation="right" tick={{ fill: C.gray, fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
            )}
            <Tooltip
              contentStyle={{ background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }}
              labelStyle={{ color: C.white }}
              formatter={(v, name) => (name === "durationMin" ? [`${v} min`, "Tempo treinado"] : [v !== null ? `${v.toFixed(0)}%` : "—", "Variação"])}
            />
            <Bar yAxisId="min" dataKey="durationMin" radius={[6, 6, 0, 0]} fill={hyrox.color} />
            {mode === "semana" && (
              <Line yAxisId="pct" type="monotone" dataKey="variacao" stroke={C.amber} strokeWidth={2} dot={{ fill: C.amber, r: 3 }} connectNulls />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
