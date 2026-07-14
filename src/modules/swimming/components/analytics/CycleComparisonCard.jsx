import { useMemo, useState } from "react";
import { C } from "../../../../lib/theme";
import { fmtDistanceM, fmtPace } from "../../../../lib/format";
import { strokeInfo } from "../../constants";
import { compareCycles } from "../../analytics";
import { Card, CardHeader, DeltaBadge, SegmentedControl } from "../../../../components/ui";

const CYCLE_OPTIONS = [2, 4, 6, 8].map((n) => ({ value: n, label: `${n} sem` }));

function Column({ title, cycle }) {
  return (
    <div className="flex-1 flex flex-col gap-2.5">
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.gray }}>{title}</span>
      <div>
        <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 20, color: C.white }}>
          {fmtDistanceM(cycle.totalM)}
        </div>
      </div>
      <div className="flex flex-col gap-1 text-xs" style={{ color: C.gray }}>
        <div>{cycle.count} treinos</div>
        <div>Pace médio: {cycle.avgPace ? `${fmtPace(cycle.avgPace)} /100m` : "—"}</div>
        <div>SWOLF médio: {cycle.avgSwolf ? Math.round(cycle.avgSwolf) : "—"}</div>
        <div>Consistência: {Math.round(cycle.consistencyPct)}%</div>
        <div>Estilo dominante: {cycle.dominantStroke ? strokeInfo(cycle.dominantStroke).label : "—"}</div>
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
          Volume <DeltaBadge value={cmp.deltas.distancePct} />
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: C.gray }}>
          Pace <DeltaBadge value={cmp.deltas.pacePct} positiveIsGood={false} />
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: C.gray }}>
          SWOLF <DeltaBadge value={cmp.deltas.swolfPct} positiveIsGood={false} />
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: C.gray }}>
          Treinos <DeltaBadge value={cmp.deltas.countPct} />
        </div>
      </div>
    </Card>
  );
}
