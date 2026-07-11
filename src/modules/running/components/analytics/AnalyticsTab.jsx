import { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { C } from "../../../../lib/theme";
import { TYPES } from "../../constants";
import { dominantType } from "../../analytics";
import { EmptyState, Select, SegmentedControl } from "../../../../components/ui";
import { InsightsPanel } from "./InsightsPanel";
import { PaceEvolutionCard } from "./PaceEvolutionCard";
import { PaceHrCard } from "./PaceHrCard";
import { VolumeVariationCard } from "./VolumeVariationCard";
import { ConsistencyCard } from "./ConsistencyCard";
import { RecordsCard } from "./RecordsCard";
import { CycleComparisonCard } from "./CycleComparisonCard";

const WINDOW_OPTIONS = [
  { value: 8, label: "8 sem" },
  { value: 12, label: "12 sem" },
  { value: 26, label: "26 sem" },
];

export function AnalyticsTab({ workouts }) {
  const [selectedType, setSelectedType] = useState(null);
  const [windowWeeks, setWindowWeeks] = useState(8);

  const defaultType = useMemo(() => dominantType(workouts), [workouts]);
  const activeType = selectedType ?? defaultType;

  if (workouts.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Ainda não há dados para analisar"
        description="Registre alguns treinos para desbloquear evolução de pace, consistência, recordes pessoais e comparação entre ciclos."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <InsightsPanel workouts={workouts} paceWindowWeeks={windowWeeks} />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs font-semibold" style={{ color: C.gray }}>Filtros</span>
        <div className="flex items-center gap-2">
          <Select
            value={activeType}
            onChange={setSelectedType}
            options={TYPES.map((t) => ({ value: t.id, label: t.label }))}
          />
          <SegmentedControl options={WINDOW_OPTIONS} value={windowWeeks} onChange={setWindowWeeks} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PaceEvolutionCard workouts={workouts} typeId={activeType} windowWeeks={windowWeeks} />
        </div>
        <PaceHrCard workouts={workouts} typeId={activeType} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <VolumeVariationCard workouts={workouts} windowWeeks={windowWeeks} />
        </div>
        <ConsistencyCard workouts={workouts} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RecordsCard workouts={workouts} typeId={activeType} />
        </div>
        <CycleComparisonCard workouts={workouts} />
      </div>
    </div>
  );
}
