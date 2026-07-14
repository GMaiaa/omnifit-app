import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Waves } from "lucide-react";
import { C, modalityInfo } from "../../../../lib/theme";
import { fmtDateShort } from "../../../../lib/format";
import { swolfTrend } from "../../analytics";
import { Card, CardHeader, DeltaBadge, EmptyState } from "../../../../components/ui";

const natacao = modalityInfo("natacao");

export function SwolfEvolutionCard({ workouts, windowWeeks }) {
  const trend = useMemo(() => swolfTrend(workouts, windowWeeks), [workouts, windowWeeks]);
  const data = useMemo(() => trend.points.map((p) => ({ label: fmtDateShort(p.date), swolf: p.swolf })), [trend]);

  if (trend.count < 2) {
    return (
      <EmptyState
        icon={Waves}
        title="Sem dados de SWOLF"
        description="Registre o SWOLF médio dos treinos (disponível em relógios/apps de natação) para ver a evolução da sua eficiência aqui."
      />
    );
  }

  return (
    <Card>
      <CardHeader
        title="Evolução do SWOLF"
        description={`Últimas ${windowWeeks} semanas (${trend.count} treinos)`}
        right={<DeltaBadge value={trend.swolfChangePct} positiveIsGood={false} />}
      />
      <div style={{ height: 190 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: -20, right: 8 }}>
            <CartesianGrid stroke={C.borderSoft} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: C.gray, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false} />
            <YAxis tick={{ fill: C.gray, fontSize: 11 }} axisLine={false} tickLine={false} domain={["dataMin - 2", "dataMax + 2"]} />
            <Tooltip
              contentStyle={{ background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }}
              labelStyle={{ color: C.white }}
              formatter={(v) => [v, "SWOLF"]}
            />
            <Line type="monotone" dataKey="swolf" stroke={natacao.color} strokeWidth={2.5} dot={{ fill: natacao.color, r: 3 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
