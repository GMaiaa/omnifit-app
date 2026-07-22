import { useMemo, useState } from "react";
import { C } from "../../../../lib/theme";
import { fmtElevation, fmtSpeed } from "../../../../lib/format";
import { typeInfo } from "../../constants";
import { compareCycles } from "../../analytics";
import { Card, CardHeader, DeltaBadge, SegmentedControl } from "../../../../components/ui";

const CYCLE_OPTIONS = [2, 4, 6, 8].map((n) => ({ value: n, label: `${n} sem` }));

function Column({ title, cycle }) {
  return (
    <div className="flex-1 flex flex-col gap-2.5">
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.gray }}>{title}</span>
      <div>
        <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 22, color: C.white }}>
          {cycle.totalKm.toFixed(1)} <span style={{ fontSize: 12, color: C.gray, fontWeight: 500 }}>km</span>
        </div>
      </div>
      <div className="flex flex-col gap-1 text-xs" style={{ color: C.gray }}>
        <div>{cycle.count} treinos</div>
        <div>Velocidade média: {cycle.avgSpeed ? `${fmtSpeed(cycle.avgSpeed)} km/h` : "—"}</div>
        <div>Elevação: {fmtElevation(cycle.totalElevationM)}</div>
        <div>FC média: {cycle.avgHr ? `${Math.round(cycle.avgHr)} bpm` : "—"}</div>
        <div>Consistência: {Math.round(cycle.consistencyPct)}%</div>
        <div>Tipo dominante: {cycle.dominantType ? typeInfo(cycle.dominantType).label : "—"}</div>
      </div>
    </div>
  );
}

export function CycleComparisonCard({ workouts }) {
  const [weeksPerCycle, setWeeksPerCycle] = useState(4);
  const cmp = useMemo(() => compareCycles(workouts, weeksPerCycle), [workouts, weeksPerCycle]);

  return (
    <Card>
      <CardHeader
        title="Comparação entre ciclos"
        description="Bloco atual vs. bloco anterior de treinamento"
        right={<SegmentedControl options={CYCLE_OPTIONS} value={weeksPerCycle} onChange={setWeeksPerCycle} />}
      />

      <div className="flex gap-4">
        <Column title={`Últimas ${weeksPerCycle} sem`} cycle={cmp.current} />
        <div style={{ width: 1, background: C.borderSoft }} />
        <Column title={`${weeksPerCycle} sem anteriores`} cycle={cmp.previous} />
      </div>

      <div className="flex flex-wrap gap-3 mt-4 pt-3" style={{ borderTop: `1px solid ${C.borderSoft}` }}>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: C.gray }}>
          Volume <DeltaBadge value={cmp.deltas.kmPct} />
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: C.gray }}>
          Velocidade <DeltaBadge value={cmp.deltas.speedPct} />
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: C.gray }}>
          Elevação <DeltaBadge value={cmp.deltas.elevationPct} />
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: C.gray }}>
          FC <DeltaBadge value={cmp.deltas.hrPct} positiveIsGood={false} />
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: C.gray }}>
          Treinos <DeltaBadge value={cmp.deltas.countPct} />
        </div>
      </div>
    </Card>
  );
}
