import { useMemo, useState } from "react";
import { BarChart3, Calendar, Clock, Flag, Waves } from "lucide-react";
import { C, modalityInfo } from "../../../../lib/theme";
import { addDays, fmtDistanceM, fmtDuration, fmtPace, mondayOf, todayStr } from "../../../../lib/format";
import { dominantStroke, inRange, monthlyVolume, yearlyVolume } from "../../analytics";
import { STROKES } from "../../constants";
import { EmptyState, Select, SegmentedControl, StatCard } from "../../../../components/ui";
import { InsightsPanel } from "./InsightsPanel";
import { PaceEvolutionCard } from "./PaceEvolutionCard";
import { SwolfEvolutionCard } from "./SwolfEvolutionCard";
import { VolumeVariationCard } from "./VolumeVariationCard";
import { ConsistencyCard } from "./ConsistencyCard";
import { StrokeDistributionCard } from "./StrokeDistributionCard";
import { TypeDistributionCard } from "./TypeDistributionCard";
import { RecordsCard } from "./RecordsCard";
import { CycleComparisonCard } from "./CycleComparisonCard";

const natacao = modalityInfo("natacao");

const WINDOW_OPTIONS = [
  { value: 8, label: "8 sem" },
  { value: 12, label: "12 sem" },
  { value: 26, label: "26 sem" },
];

export function AnalyticsTab({ workouts }) {
  const [selectedStroke, setSelectedStroke] = useState(null);
  const [windowWeeks, setWindowWeeks] = useState(8);

  const defaultStroke = useMemo(() => dominantStroke(workouts), [workouts]);
  const activeStroke = selectedStroke ?? defaultStroke;

  const stats = useMemo(() => {
    if (workouts.length === 0) return null;
    const today = todayStr();
    const weekStart = mondayOf(today);
    const lastWeekStart = addDays(weekStart, -7);

    const thisWeek = workouts.filter((w) => inRange(w, weekStart));
    const lastWeek = workouts.filter((w) => inRange(w, lastWeekStart, weekStart));

    const sumDist = (arr) => arr.reduce((a, w) => a + w.distanceM, 0);

    const weekDist = sumDist(thisWeek);
    const lastWeekDist = sumDist(lastWeek);
    const deltaDist = lastWeekDist > 0 ? ((weekDist - lastWeekDist) / lastWeekDist) * 100 : null;

    const monthDist = monthlyVolume(workouts, 1)[0].distanceM;
    const yearDist = yearlyVolume(workouts, 1)[0].distanceM;

    const totalDist = sumDist(workouts);
    const totalTime = workouts.reduce((a, w) => a + w.durationSec, 0);
    const avgPace = totalDist > 0 ? totalTime / (totalDist / 100) : null;

    return { weekDist, deltaDist, monthDist, yearDist, totalTime, avgPace };
  }, [workouts]);

  if (workouts.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Ainda não há dados para analisar"
        description="Registre alguns treinos de natação para desbloquear volume, evolução de pace, SWOLF, consistência e recordes pessoais."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Volume da semana" value={fmtDistanceM(stats.weekDist)} icon={Calendar} accent={natacao.color} delta={stats.deltaDist} />
        <StatCard label="Volume do mês" value={fmtDistanceM(stats.monthDist)} icon={Flag} accent="#5EA8FF" />
        <StatCard label="Volume do ano" value={fmtDistanceM(stats.yearDist)} icon={Waves} accent="#60A5FA" />
        <StatCard label="Tempo total nadado" value={fmtDuration(stats.totalTime)} icon={Clock} accent="#1E5FCC" />
      </div>

      <InsightsPanel workouts={workouts} paceWindowWeeks={windowWeeks} />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs font-semibold" style={{ color: C.gray }}>
          Filtros · pace médio geral {fmtPace(stats.avgPace)} /100m
        </span>
        <div className="flex items-center gap-2">
          <Select
            value={activeStroke}
            onChange={setSelectedStroke}
            options={STROKES.map((s) => ({ value: s.id, label: s.label }))}
          />
          <SegmentedControl options={WINDOW_OPTIONS} value={windowWeeks} onChange={setWindowWeeks} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PaceEvolutionCard workouts={workouts} strokeId={activeStroke} windowWeeks={windowWeeks} />
        </div>
        <SwolfEvolutionCard workouts={workouts} windowWeeks={windowWeeks} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <VolumeVariationCard workouts={workouts} windowWeeks={windowWeeks} />
        </div>
        <ConsistencyCard workouts={workouts} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StrokeDistributionCard workouts={workouts} />
        <TypeDistributionCard workouts={workouts} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RecordsCard workouts={workouts} strokeId={activeStroke} />
        </div>
        <CycleComparisonCard workouts={workouts} />
      </div>
    </div>
  );
}
