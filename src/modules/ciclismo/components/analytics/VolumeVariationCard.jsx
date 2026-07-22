import { useMemo } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { C, modalityInfo } from "../../../../lib/theme";
import { weeklyVolume } from "../../analytics";
import { Card, CardHeader } from "../../../../components/ui";

const ciclismo = modalityInfo("ciclismo");

export function VolumeVariationCard({ workouts, windowWeeks }) {
  const vol = useMemo(() => weeklyVolume(workouts, windowWeeks), [workouts, windowWeeks]);

  const data = useMemo(
    () => vol.weeks.map((w, i) => ({ label: w.label, km: w.km, variacao: vol.weekOverWeek[i] })),
    [vol]
  );

  return (
    <Card>
      <CardHeader
        title="Volume semanal e variação"
        description={`Últimas ${windowWeeks} semanas · média ${vol.avgKm.toFixed(1)} km · variação (CV) ${
          vol.cv !== null ? vol.cv.toFixed(0) : "—"
        }%`}
      />
      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ left: -20, right: 8 }}>
            <CartesianGrid stroke={C.borderSoft} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: C.gray, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false} />
            <YAxis yAxisId="km" tick={{ fill: C.gray, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              yAxisId="pct" orientation="right" tick={{ fill: C.gray, fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{ background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }}
              labelStyle={{ color: C.white }}
              formatter={(v, name) => (name === "km" ? [`${v} km`, "Volume"] : [v !== null ? `${v.toFixed(0)}%` : "—", "Variação"])}
            />
            <Bar yAxisId="km" dataKey="km" radius={[6, 6, 0, 0]} fill={ciclismo.color} />
            <Line yAxisId="pct" type="monotone" dataKey="variacao" stroke={C.amber} strokeWidth={2} dot={{ fill: C.amber, r: 3 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
