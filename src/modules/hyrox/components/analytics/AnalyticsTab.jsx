import { useMemo, useState } from "react";
import { BarChart3, Calendar, Dumbbell, Hash, Route, Timer, Weight } from "lucide-react";
import { C, modalityInfo } from "../../../../lib/theme";
import { fmtDistanceM, fmtDuration } from "../../../../lib/format";
import {
  exerciseOptions,
  mostFrequentExerciseKey,
  sessionDistance,
  sessionFunctionalReps,
  sessionLoadVolume,
  sum,
} from "../../analytics";
import { EmptyState, Select, SegmentedControl, StatCard } from "../../../../components/ui";
import { InsightsPanel } from "./InsightsPanel";
import { ExerciseEvolutionCard } from "./ExerciseEvolutionCard";
import { ConsistencyCard } from "./ConsistencyCard";
import { VolumeCard } from "./VolumeCard";
import { FocusDistributionCard } from "./FocusDistributionCard";
import { RecordsCard } from "./RecordsCard";
import { CycleComparisonCard } from "./CycleComparisonCard";
import { RaceAnalyticsCard } from "./RaceAnalyticsCard";

const hyrox = modalityInfo("hyrox");

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
    const totalDurationSec = sum(sessions.map((s) => s.durationSec));
    return {
      totalDurationSec,
      count: sessions.length,
      avgDurationSec: sessions.length ? totalDurationSec / sessions.length : null,
      distanceM: sum(sessions.map(sessionDistance)),
      functionalReps: sum(sessions.map(sessionFunctionalReps)),
      loadVolume: sum(sessions.map(sessionLoadVolume)),
    };
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Ainda não há dados para analisar"
        description="Registre alguns treinos de HYROX para desbloquear volume, evolução por exercício, consistência, recordes e análise de provas."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Tempo total treinado" value={fmtDuration(stats.totalDurationSec)} icon={Timer} accent={hyrox.color} />
        <StatCard label="Sessões" value={stats.count} icon={Hash} accent="#84CC16" />
        <StatCard label="Tempo médio/sessão" value={fmtDuration(stats.avgDurationSec)} icon={Calendar} accent="#65A30D" />
        <StatCard label="Distância total" value={fmtDistanceM(stats.distanceM)} icon={Route} accent="#4ADE80" />
        <StatCard label="Volume funcional" value={`${Math.round(stats.functionalReps).toLocaleString("pt-BR")}`} unit="reps" icon={Dumbbell} accent="#22C55E" />
        <StatCard label="Carga movimentada" value={`${Math.round(stats.loadVolume).toLocaleString("pt-BR")}`} unit="kg" icon={Weight} accent="#BEF264" />
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
          <ExerciseEvolutionCard sessions={sessions} exerciseKey={activeExercise} exerciseName={activeExerciseName} windowWeeks={windowWeeks} />
        </div>
        <ConsistencyCard sessions={sessions} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <VolumeCard sessions={sessions} windowWeeks={windowWeeks} />
        </div>
        <FocusDistributionCard sessions={sessions} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RecordsCard sessions={sessions} />
        </div>
        <CycleComparisonCard sessions={sessions} />
      </div>

      <RaceAnalyticsCard sessions={sessions} />
    </div>
  );
}
