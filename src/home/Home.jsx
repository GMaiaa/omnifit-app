import { useMemo } from "react";
import { Lock, Target } from "lucide-react";
import { C, MODALITIES, modalityInfo } from "../lib/theme";
import { Card, CardHeader } from "../components/ui";
import {
  consistency,
  dominantType,
  paceTrendByType,
  volumeByType,
  weeklyVolume,
} from "../modules/running/analytics";
import { typeInfo } from "../modules/running/constants";
import { InsightsPanel } from "../modules/running/components/analytics/InsightsPanel";
import { ConsistencyCard } from "../modules/running/components/analytics/ConsistencyCard";
import { PaceEvolutionCard } from "../modules/running/components/analytics/PaceEvolutionCard";
import {
  consistency as strengthConsistency,
  mostFrequentExerciseKey,
  loadProgression,
  weeklyVolume as strengthWeeklyVolume,
} from "../modules/strength/analytics";
import { ScoreGauge } from "./ScoreGauge";

const corrida = modalityInfo("corrida");

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function qualify(value) {
  if (value >= 80) return "Ótima";
  if (value >= 55) return "Boa";
  if (value >= 30) return "Regular";
  return "Baixa";
}

/* Each modality contributes its own 3-factor read (consistência / carga /
   progressão); the gauge itself still only ever shows 3 sub-scores, blended
   across whichever modalities already have data. Deeper cross-modality
   signals (interference, recovery) are out of scope until Ciclismo/Natação/
   HYROX exist — this is just the foundation those would plug into later. */
function runningSubScores(workouts) {
  if (workouts.length === 0) return null;
  const consistency4 = consistency(workouts, 4).activeWeeksPct;

  const vol = weeklyVolume(workouts, 8);
  const currentWeekKm = vol.weeks[vol.weeks.length - 1]?.km ?? 0;
  const deviation = vol.avgKm > 0 ? Math.abs(currentWeekKm / vol.avgKm - 1) : 0;
  const loadScore = vol.avgKm > 0 ? clamp(100 - Math.max(0, deviation - 0.33) * 150, 0, 100) : 60;

  const dom = dominantType(workouts);
  const trend = paceTrendByType(workouts, dom, 8);
  const progressionScore = trend.paceChangePct === null ? 70 : clamp(70 - trend.paceChangePct * 3, 0, 100);

  return {
    consistency: consistency4, load: loadScore, progression: progressionScore,
    dominantTypeId: dom,
    hints: {
      consistency: `${qualify(consistency4)} (${Math.round(consistency4)}% das últimas 4 sem. em Corrida)`,
      load: vol.avgKm > 0 ? `${currentWeekKm.toFixed(1)} km vs. média de ${vol.avgKm.toFixed(1)} km` : "sem histórico ainda",
      progression: trend.paceChangePct === null
        ? "sem dado suficiente em Corrida"
        : `${trend.paceChangePct < 0 ? "melhorando" : "piorando"} ${Math.abs(trend.paceChangePct).toFixed(1)}% em ${typeInfo(dom).label}`,
    },
  };
}

function strengthSubScores(sessions) {
  if (sessions.length === 0) return null;
  const consistency4 = strengthConsistency(sessions, 4).activeWeeksPct;

  const vol = strengthWeeklyVolume(sessions, 8);
  const currentWeekVolume = vol.weeks[vol.weeks.length - 1]?.volume ?? 0;
  const deviation = vol.avgVolume > 0 ? Math.abs(currentWeekVolume / vol.avgVolume - 1) : 0;
  const loadScore = vol.avgVolume > 0 ? clamp(100 - Math.max(0, deviation - 0.33) * 150, 0, 100) : 60;

  const domKey = mostFrequentExerciseKey(sessions);
  const trend = domKey ? loadProgression(sessions, domKey, 8) : { loadChangePct: null };
  const progressionScore = trend.loadChangePct === null ? 70 : clamp(70 + trend.loadChangePct * 3, 0, 100);

  return {
    consistency: consistency4, load: loadScore, progression: progressionScore,
    hints: {
      consistency: `${qualify(consistency4)} (${Math.round(consistency4)}% das últimas 4 sem. em Musculação)`,
      load: vol.avgVolume > 0 ? `${Math.round(currentWeekVolume).toLocaleString("pt-BR")} kg vs. média de ${Math.round(vol.avgVolume).toLocaleString("pt-BR")} kg` : "sem histórico ainda",
      progression: trend.loadChangePct === null
        ? "sem dado suficiente em Musculação"
        : `${trend.loadChangePct > 0 ? "subindo" : "caindo"} ${Math.abs(trend.loadChangePct).toFixed(1)}% de carga`,
    },
  };
}

function useGlobalScore(workouts, strengthSessions) {
  return useMemo(() => {
    const running = runningSubScores(workouts);
    const strength = strengthSubScores(strengthSessions);
    const active = [running, strength].filter(Boolean);

    if (active.length === 0) {
      return {
        score: 0,
        dominantTypeId: null,
        subScores: [
          { label: "Consistência", value: 0, hint: "sem histórico ainda" },
          { label: "Carga semanal", value: 0, hint: "sem histórico ainda" },
          { label: "Progressão", value: 0, hint: "sem histórico ainda" },
        ],
      };
    }

    const avg = (key) => active.reduce((a, s) => a + s[key], 0) / active.length;
    const hintFor = (key) => active.map((s) => s.hints[key]).join(" · ");

    return {
      score: Math.round((avg("consistency") + avg("load") + avg("progression")) / 3),
      dominantTypeId: running?.dominantTypeId ?? null,
      subScores: [
        { label: "Consistência", value: avg("consistency"), hint: hintFor("consistency") },
        { label: "Carga semanal", value: avg("load"), hint: hintFor("load") },
        { label: "Progressão", value: avg("progression"), hint: hintFor("progression") },
      ],
    };
  }, [workouts, strengthSessions]);
}

export function Home({ workouts, strengthSessions = [], onOpenModule }) {
  const { score, dominantTypeId, subScores } = useGlobalScore(workouts, strengthSessions);

  const vol8 = useMemo(() => weeklyVolume(workouts, 8), [workouts]);
  const totalKm8 = useMemo(() => vol8.weeks.reduce((a, w) => a + w.km, 0), [vol8]);
  const runningHours8 = useMemo(
    () => workouts
      .filter((w) => vol8.weeks.length && w.date >= vol8.weeks[0].start)
      .reduce((a, w) => a + w.durationSec, 0) / 3600,
    [workouts, vol8]
  );
  const strengthHours8 = useMemo(
    () => strengthSessions
      .filter((s) => vol8.weeks.length && s.date >= vol8.weeks[0].start)
      .reduce((a, s) => a + s.durationSec, 0) / 3600,
    [strengthSessions, vol8]
  );
  const totalHours8 = runningHours8 + strengthHours8;

  const modalityHours = { corrida: runningHours8, musculacao: strengthHours8 };
  const hasAnyData = workouts.length > 0 || strengthSessions.length > 0;

  const scoreDescription = workouts.length > 0 && strengthSessions.length > 0
    ? "Score calculado a partir dos seus treinos de Corrida e Musculação."
    : strengthSessions.length > 0
      ? "Score calculado a partir dos seus treinos de Musculação — as demais modalidades entram assim que tiverem dados."
      : "Score calculado a partir dos seus treinos de Corrida — as demais modalidades entram assim que tiverem dados.";

  const effortSplit = useMemo(() => volumeByType(workouts), [workouts]);
  const effortTotal = effortSplit.reduce((a, d) => a + d.value, 0);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader title="Performance geral" description={scoreDescription} />
        <ScoreGauge score={score} subScores={subScores} />
        {!hasAnyData && (
          <div className="mt-4 pt-4 flex items-center justify-between flex-wrap gap-3" style={{ borderTop: `1px solid ${C.borderSoft}` }}>
            <p className="text-sm" style={{ color: C.gray }}>
              Ainda não há treinos registrados — o score começa a fazer sentido depois do primeiro.
            </p>
            <button
              onClick={() => onOpenModule?.("corrida")}
              className="rounded-full px-4 py-2 text-xs font-semibold"
              style={{ background: `linear-gradient(135deg, ${corrida.color}, #00AEEF)`, color: C.bg }}
            >
              Registrar meu primeiro treino
            </button>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="text-xs uppercase tracking-wider" style={{ color: C.gray, fontWeight: 600 }}>Volume Corrida (8 sem)</div>
          <div className="mt-2" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 24, color: C.white }}>
            {totalKm8.toFixed(1)} <span style={{ fontSize: 12, color: C.gray, fontWeight: 500 }}>km</span>
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wider" style={{ color: C.gray, fontWeight: 600 }}>Horas treinadas (8 sem)</div>
          <div className="mt-2" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 24, color: C.white }}>
            {totalHours8.toFixed(1)} <span style={{ fontSize: 12, color: C.gray, fontWeight: 500 }}>h</span>
          </div>
        </Card>
        <Card className="col-span-2 lg:col-span-2">
          <CardHeader title="Distribuição por modalidade" description="% das horas treinadas nas últimas 8 semanas" />
          <div className="flex h-3 rounded-full overflow-hidden" style={{ background: C.surface2 }}>
            {MODALITIES.filter((m) => m.status === "active" && modalityHours[m.id] > 0).map((m) => (
              <div key={m.id} style={{ width: `${(modalityHours[m.id] / totalHours8) * 100}%`, background: m.color }} />
            ))}
          </div>
          <div className="flex flex-col gap-1.5 mt-3">
            {MODALITIES.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5" style={{ color: m.status === "active" ? C.white : C.gray }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: m.status === "active" ? m.color : C.surface2, display: "inline-block" }} />
                  {m.label}
                </span>
                {m.status === "active" ? (
                  <span style={{ color: C.gray }}>
                    {totalHours8 > 0 ? `${Math.round((modalityHours[m.id] / totalHours8) * 100)}%` : "0%"}
                  </span>
                ) : (
                  <span className="flex items-center gap-1" style={{ color: C.gray }}>
                    <Lock size={11} /> em breve
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <InsightsPanel workouts={workouts} paceWindowWeeks={8} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PaceEvolutionCard workouts={workouts} typeId={dominantTypeId} windowWeeks={8} />
        </div>
        <ConsistencyCard workouts={workouts} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Distribuição por tipo de esforço" description="Km acumulados em Corrida, histórico completo" />
          {effortSplit.length === 0 ? (
            <p className="text-sm py-4" style={{ color: C.gray }}>Sem treinos registrados ainda.</p>
          ) : (
            <>
              <div className="flex h-3 rounded-full overflow-hidden">
                {effortSplit.map((d) => (
                  <div key={d.id} style={{ width: `${(d.value / effortTotal) * 100}%`, background: d.color }} />
                ))}
              </div>
              <div className="flex flex-col gap-1.5 mt-3">
                {effortSplit.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5" style={{ color: C.white }}>
                      <span style={{ width: 8, height: 8, borderRadius: 4, background: d.color, display: "inline-block" }} />
                      {d.name}
                    </span>
                    <span style={{ color: C.gray }}>{d.value} km</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card className="flex flex-col items-center justify-center text-center gap-3 py-8">
          <div className="rounded-full p-3" style={{ background: `${C.gray}1A` }}>
            <Target size={22} style={{ color: C.gray }} />
          </div>
          <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: C.white, fontSize: 15 }}>Metas — em breve</h3>
          <p className="text-xs" style={{ color: C.gray, maxWidth: 240 }}>
            Defina metas de volume, pace ou frequência para acompanhar seu progresso aqui.
          </p>
        </Card>
      </div>
    </div>
  );
}
