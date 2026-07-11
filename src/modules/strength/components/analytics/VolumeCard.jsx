import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { C, modalityInfo } from "../../../../lib/theme";
import { weeklyVolume } from "../../analytics";
import { Card, CardHeader } from "../../../../components/ui";

const musculacao = modalityInfo("musculacao");

export function VolumeCard({ sessions, windowWeeks }) {
  const data = useMemo(() => weeklyVolume(sessions, windowWeeks).weeks, [sessions, windowWeeks]);

  return (
    <Card>
      <CardHeader title="Volume semanal" description={`Carga total movimentada (kg), últimas ${windowWeeks} semanas`} />
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -10, right: 8 }}>
            <CartesianGrid stroke={C.borderSoft} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: C.gray, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false} />
            <YAxis tick={{ fill: C.gray, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }}
              labelStyle={{ color: C.white }} itemStyle={{ color: musculacao.color }}
              formatter={(v) => [`${v.toLocaleString("pt-BR")} kg`, "Volume"]}
            />
            <Bar dataKey="volume" radius={[6, 6, 0, 0]} fill={musculacao.color} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
