import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Mountain, Trophy } from "lucide-react";
import { C, modalityInfo } from "../../../../lib/theme";
import { fmtElevation } from "../../../../lib/format";
import { weeklyVolume, personalRecords } from "../../analytics";
import { Card, CardHeader } from "../../../../components/ui";

const ciclismo = modalityInfo("ciclismo");

export function ElevationCard({ workouts, windowWeeks }) {
  const vol = useMemo(() => weeklyVolume(workouts, windowWeeks), [workouts, windowWeeks]);
  const records = useMemo(() => personalRecords(workouts), [workouts]);

  const data = useMemo(
    () => vol.weeks.map((w) => ({ label: w.label, elevationM: w.elevationM })),
    [vol]
  );
  const totalElevation = useMemo(() => vol.weeks.reduce((a, w) => a + w.elevationM, 0), [vol]);

  return (
    <Card>
      <CardHeader
        title="Ganho de elevação"
        description={`Últimas ${windowWeeks} semanas · total ${fmtElevation(totalElevation)} · média ${fmtElevation(vol.avgElevationM)}/sem`}
      />
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -20, right: 8 }}>
            <CartesianGrid stroke={C.borderSoft} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: C.gray, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false} />
            <YAxis tick={{ fill: C.gray, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }}
              labelStyle={{ color: C.white }}
              formatter={(v) => [fmtElevation(v), "Elevação"]}
            />
            <Bar dataKey="elevationM" radius={[6, 6, 0, 0]} fill={ciclismo.color} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {records.bestClimb && (
        <div className="flex items-center gap-2 mt-3 pt-3 text-xs" style={{ borderTop: `1px solid ${C.borderSoft}`, color: C.gray }}>
          <Trophy size={13} style={{ color: C.amber }} />
          Maior subida: <span style={{ color: C.white, fontWeight: 600 }}>{fmtElevation(records.bestClimb.elevationGainM)}</span>
          <Mountain size={13} style={{ color: C.gray, marginLeft: 4 }} />
        </div>
      )}
    </Card>
  );
}
