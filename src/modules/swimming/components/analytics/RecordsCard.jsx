import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Trophy } from "lucide-react";
import { C } from "../../../../lib/theme";
import { fmtDateShort, fmtDistanceM, fmtPace } from "../../../../lib/format";
import { DISTANCE_BUCKETS, STROKES, strokeInfo } from "../../constants";
import { distanceMilestoneSeries, personalRecords } from "../../analytics";
import { Card, CardHeader, SegmentedControl } from "../../../../components/ui";

export function RecordsCard({ workouts, strokeId }) {
  const [bucketId, setBucketId] = useState(DISTANCE_BUCKETS[0].id);
  const records = useMemo(() => personalRecords(workouts), [workouts]);

  const stroke = strokeInfo(strokeId);
  const series = useMemo(
    () => distanceMilestoneSeries(workouts, strokeId, bucketId),
    [workouts, strokeId, bucketId]
  );
  const data = useMemo(
    () => series.map((p) => ({ label: fmtDateShort(p.date), pace: p.pace, isPR: p.isPR })),
    [series]
  );

  return (
    <Card>
      <CardHeader
        title="Recordes pessoais"
        description="Melhor pace (por 100m) por estilo e distância"
      />

      <div className="overflow-x-auto -mx-1 mb-4">
        <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th className="text-left px-2 py-1.5" style={{ color: C.gray, fontWeight: 600 }}>Estilo</th>
              {DISTANCE_BUCKETS.map((b) => (
                <th key={b.id} className="text-right px-2 py-1.5" style={{ color: C.gray, fontWeight: 600 }}>{b.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STROKES.map((s) => (
              <tr key={s.id} style={{ borderTop: `1px solid ${C.borderSoft}` }}>
                <td className="px-2 py-1.5" style={{ color: s.color, fontWeight: 600 }}>{s.label}</td>
                {DISTANCE_BUCKETS.map((b) => {
                  const rec = records.byStroke[s.id]?.[b.id];
                  return (
                    <td key={b.id} className="text-right px-2 py-1.5" style={{ color: rec ? C.white : C.gray }}>
                      {rec ? `${fmtPace(rec.paceSec)}` : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold" style={{ color: C.gray }}>
          Evolução em {stroke.label}
        </span>
        <SegmentedControl
          options={DISTANCE_BUCKETS.map((b) => ({ value: b.id, label: b.label }))}
          value={bucketId}
          onChange={setBucketId}
        />
      </div>

      {data.length === 0 ? (
        <p className="text-xs py-6 text-center" style={{ color: C.gray }}>
          Nenhum treino de {DISTANCE_BUCKETS.find((b) => b.id === bucketId).label} em {stroke.label} registrado ainda.
        </p>
      ) : (
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ left: -20, right: 8 }}>
              <CartesianGrid stroke={C.borderSoft} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: C.gray, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false} />
              <YAxis
                tick={{ fill: C.gray, fontSize: 11 }} axisLine={false} tickLine={false}
                reversed domain={["dataMin - 5", "dataMax + 5"]} tickFormatter={fmtPace}
              />
              <Tooltip
                contentStyle={{ background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: C.white }}
                formatter={(v) => [`${fmtPace(v)} /100m`, "Pace"]}
              />
              <Line
                type="monotone" dataKey="pace" stroke={stroke.color} strokeWidth={2.5}
                dot={(props) => {
                  const { cx, cy, payload, key } = props;
                  return (
                    <circle key={key} cx={cx} cy={cy} r={payload.isPR ? 5 : 3} fill={payload.isPR ? C.amber : stroke.color} stroke="none" />
                  );
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {(records.longestSwim || records.bestWeek) && (
        <div className="flex gap-4 mt-3 pt-3 flex-wrap" style={{ borderTop: `1px solid ${C.borderSoft}` }}>
          {records.longestSwim && (
            <div className="flex items-center gap-2 text-xs" style={{ color: C.gray }}>
              <Trophy size={13} style={{ color: C.amber }} />
              Maior distância: <span style={{ color: C.white, fontWeight: 600 }}>{fmtDistanceM(records.longestSwim.distanceM)}</span>
            </div>
          )}
          {records.bestWeek && records.bestWeek.distanceM > 0 && (
            <div className="flex items-center gap-2 text-xs" style={{ color: C.gray }}>
              <Trophy size={13} style={{ color: C.amber }} />
              Melhor semana: <span style={{ color: C.white, fontWeight: 600 }}>{fmtDistanceM(records.bestWeek.distanceM)}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
