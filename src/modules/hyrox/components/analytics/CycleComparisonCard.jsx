import { useMemo, useState } from "react";
import { C } from "../../../../lib/theme";
import { fmtDistanceM, fmtDuration } from "../../../../lib/format";
import { compareCycles } from "../../analytics";
import { Card, CardHeader, DeltaBadge, SegmentedControl } from "../../../../components/ui";

const CYCLE_OPTIONS = [2, 4, 6, 8].map((n) => ({ value: n, label: `${n} sem` }));

function Column({ title, cycle }) {
  return (
    <div className="flex-1 flex flex-col gap-2.5">
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.gray }}>{title}</span>
      <div>
        <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 20, color: C.white }}>
          {fmtDuration(cycle.totalDurationSec)}
        </div>
      </div>
      <div className="flex flex-col gap-1 text-xs" style={{ color: C.gray }}>
        <div>{cycle.count} treinos</div>
        <div>Volume funcional: {Math.round(cycle.functionalReps).toLocaleString("pt-BR")} reps</div>
        <div>Carga movimentada: {Math.round(cycle.loadVolume).toLocaleString("pt-BR")} kg</div>
        <div>Distância: {fmtDistanceM(cycle.distanceM)}</div>
        <div>Consistência: {Math.round(cycle.consistencyPct)}%</div>
      </div>
    </div>
  );
}

export function CycleComparisonCard({ sessions }) {
  const [weeksPerCycle, setWeeksPerCycle] = useState(4);
  const cmp = useMemo(() => compareCycles(sessions, weeksPerCycle), [sessions, weeksPerCycle]);

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
          Tempo <DeltaBadge value={cmp.deltas.durationPct} />
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: C.gray }}>
          Volume funcional <DeltaBadge value={cmp.deltas.functionalRepsPct} />
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: C.gray }}>
          Carga <DeltaBadge value={cmp.deltas.loadPct} />
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: C.gray }}>
          Distância <DeltaBadge value={cmp.deltas.distancePct} />
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: C.gray }}>
          Treinos <DeltaBadge value={cmp.deltas.countPct} />
        </div>
      </div>
    </Card>
  );
}
