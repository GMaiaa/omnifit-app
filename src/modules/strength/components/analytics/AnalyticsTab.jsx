import { useMemo, useState } from "react";
import { BarChart3, Calendar, Dumbbell, Flag, ListChecks } from "lucide-react";
import { C, modalityInfo } from "../../../../lib/theme";
import { addDays, fmtVolume, mondayOf, todayStr } from "../../../../lib/format";
import {
  exerciseOptions,
  inRange,
  mostFrequentExerciseKey,
  sessionSetsCount,
  sessionVolume,
  sum,
} from "../../analytics";
import { EmptyState, Select, SegmentedControl, StatCard } from "../../../../components/ui";
import { InsightsPanel } from "./InsightsPanel";
import { VolumeCard } from "./VolumeCard";
import { MuscleGroupCard } from "./MuscleGroupCard";
import { StrengthEvolutionCard } from "./StrengthEvolutionCard";
import { ConsistencyCard } from "./ConsistencyCard";
import { RecordsCard } from "./RecordsCard";
import { CycleComparisonCard } from "./CycleComparisonCard";

const musculacao = modalityInfo("musculacao");

const WINDOW_OPTIONS = [
  { value: 8, label: "8 sem" },
  { value: 12, label: "12 sem" },
  { value: 26, label: "26 sem" },
];

export function AnalyticsTab({ sessions }) {
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [windowWeeks, setWindowWeeks] = useState(8);

  const exercises = useMemo(() => exerciseOptions(sessions), [sessions]);
  const defaultExercise = useMemo(() => mostFrequentExerciseKey(sessions), [sessions]);
  const activeExercise = selectedExercise ?? defaultExercise;
  const activeExerciseName = exercises.find((e) => e.key === activeExercise)?.name ?? "";

  const stats = useMemo(() => {
    const today = todayStr();
    const weekStart = mondayOf(today);
    const lastWeekStart = addDays(weekStart, -7);
    const monthStart = today.slice(0, 7) + "-01";

    const thisWeek = sessions.filter((s) => inRange(s, weekStart));
    const lastWeek = sessions.filter((s) => inRange(s, lastWeekStart, weekStart));
    const thisMonth = sessions.filter((s) => inRange(s, monthStart));

    const weekVolume = sum(thisWeek.map(sessionVolume));
    const lastWeekVolume = sum(lastWeek.map(sessionVolume));
    const deltaVolume = lastWeekVolume > 0 ? ((weekVolume - lastWeekVolume) / lastWeekVolume) * 100 : null;

    return {
      weekVolume,
      deltaVolume,
      monthVolume: sum(thisMonth.map(sessionVolume)),
      weekSets: sum(thisWeek.map(sessionSetsCount)),
      totalVolume: sum(sessions.map(sessionVolume)),
    };
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Ainda não há dados para analisar"
        description="Registre algumas execuções para desbloquear volume, evolução de força, consistência e recordes pessoais."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Volume da semana" value={fmtVolume(stats.weekVolume)} icon={Calendar} accent={musculacao.color} delta={stats.deltaVolume} />
        <StatCard label="Volume do mês" value={fmtVolume(stats.monthVolume)} icon={Flag} accent="#A78BFA" />
        <StatCard label="Séries na semana" value={stats.weekSets} icon={ListChecks} accent="#7C3AED" />
        <StatCard label="Carga total movimentada" value={fmtVolume(stats.totalVolume)} icon={Dumbbell} accent="#C084FC" />
      </div>

      <InsightsPanel sessions={sessions} windowWeeks={windowWeeks} />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs font-semibold" style={{ color: C.gray }}>Filtros</span>
        <div className="flex items-center gap-2">
          <Select
            value={activeExercise}
            onChange={setSelectedExercise}
            options={exercises.map((e) => ({ value: e.key, label: e.name }))}
          />
          <SegmentedControl options={WINDOW_OPTIONS} value={windowWeeks} onChange={setWindowWeeks} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <VolumeCard sessions={sessions} windowWeeks={windowWeeks} />
        </div>
        <MuscleGroupCard sessions={sessions} windowWeeks={windowWeeks} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <StrengthEvolutionCard sessions={sessions} exerciseKey={activeExercise} exerciseName={activeExerciseName} windowWeeks={windowWeeks} />
        </div>
        <ConsistencyCard sessions={sessions} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RecordsCard sessions={sessions} />
        </div>
        <CycleComparisonCard sessions={sessions} />
      </div>
    </div>
  );
}
