import { useMemo, useState } from "react";
import { C } from "../../../../lib/theme";
import { compareCycles } from "../../analytics";
import { Card, CardHeader, DeltaBadge, SegmentedControl } from "../../../../components/ui";

const CYCLE_OPTIONS = [2, 4, 6, 8].map((n) => ({ value: n, label: `${n} sem` }));

function Column({ title, cycle }) {
  return (
    <div className="flex-1 flex flex-col gap-2.5">
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.gray }}>{title}</span>
      <div>
        <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 22, color: C.white }}>
          {cycle.totalVolume.toLocaleString("pt-BR")} <span style={{ fontSize: 12, color: C.gray, fontWeight: 500 }}>kg</span>
        </div>
      </div>
      <div className="flex flex-col gap-1 text-xs" style={{ color: C.gray }}>
        <div>{cycle.count} treinos</div>
        <div>{cycle.totalSets} séries</div>
        <div>Carga média/série: {cycle.avgLoad ? `${cycle.avgLoad.toFixed(1)} kg` : "—"}</div>
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
          Volume <DeltaBadge value={cmp.deltas.volumePct} />
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: C.gray }}>
          Séries <DeltaBadge value={cmp.deltas.setsPct} />
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: C.gray }}>
          Carga média <DeltaBadge value={cmp.deltas.loadPct} />
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: C.gray }}>
          Treinos <DeltaBadge value={cmp.deltas.countPct} />
        </div>
      </div>
    </Card>
  );
}
