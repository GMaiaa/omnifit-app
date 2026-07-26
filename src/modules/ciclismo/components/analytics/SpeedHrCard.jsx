import { useMemo } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { HeartPulse } from "lucide-react";
import { C } from "../../../../lib/theme";
import { fmtSpeed } from "../../../../lib/format";
import { typeInfo } from "../../constants";
import { speedHrRelation } from "../../analytics";
import { Card, CardHeader, DeltaBadge, EmptyState } from "../../../../components/ui";

function correlationLabel(r) {
  if (r === null) return "—";
  const abs = Math.abs(r);
  if (abs < 0.2) return "fraca";
  if (abs < 0.5) return "moderada";
  return "forte";
}

export function SpeedHrCard({ workouts, typeId }) {
  const type = typeInfo(typeId);
  const relation = useMemo(() => speedHrRelation(workouts, typeId), [workouts, typeId]);

  if (relation.points.length < 3) {
    return (
      <EmptyState
        icon={HeartPulse}
        title={`Sem dados de FC suficientes`}
        description={`Registre a frequência cardíaca média em treinos de ${type.label} para ver a relação com a velocidade.`}
      />
    );
  }

  return (
    <Card>
      <CardHeader
        title={`Velocidade x Frequência cardíaca — ${type.label}`}
        description={`Correlação ${correlationLabel(relation.correlation)}${
          relation.correlation !== null ? ` (r = ${relation.correlation.toFixed(2)})` : ""
        }`}
        right={<DeltaBadge value={relation.efficiencyChangePct} suffix="% eficiência" />}
      />
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ left: -10, right: 12, top: 8, bottom: 0 }}>
            <CartesianGrid stroke={C.borderSoft} />
            <XAxis
              dataKey="speed" type="number" name="Velocidade" tickFormatter={fmtSpeed}
              tick={{ fill: C.gray, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false}
              domain={["dataMin - 2", "dataMax + 2"]}
            />
            <YAxis
              dataKey="hr" type="number" name="FC"
              tick={{ fill: C.gray, fontSize: 11 }} axisLine={false} tickLine={false}
              domain={["dataMin - 5", "dataMax + 5"]}
            />
            <Tooltip
              contentStyle={{ background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }}
              labelStyle={{ color: C.white }}
              formatter={(v, name) => (name === "Velocidade" ? [`${fmtSpeed(v)} km/h`, "Velocidade"] : [`${v} bpm`, "FC"])}
              cursor={{ strokeDasharray: "3 3" }}
            />
            <Scatter data={relation.points} fill={type.color} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
