import { useMemo, useState } from "react";
import { Bike, Dumbbell, Flame, Footprints, LayoutGrid, ListChecks, Lock, Target, Waves } from "lucide-react";
import { C, MODALITIES, modalityInfo } from "../lib/theme";
import { addDays, fmtDateShort, fmtDistanceM, fmtDuration, mondayOf, todayStr } from "../lib/format";
import { Card, CardHeader, EmptyState, Pill } from "../components/ui";
import {
  consistency,
  dominantType,
  paceTrendByType,
  volumeByType,
  weeklyVolume,
} from "../modules/running/analytics";
import { typeInfo as runningTypeInfo } from "../modules/running/constants";
import { InsightsPanel } from "../modules/running/components/analytics/InsightsPanel";
import { ConsistencyCard } from "../modules/running/components/analytics/ConsistencyCard";
import { PaceEvolutionCard } from "../modules/running/components/analytics/PaceEvolutionCard";
import {
  consistency as strengthConsistency,
  mostFrequentExerciseKey,
  loadProgression,
  weeklyVolume as strengthWeeklyVolume,
} from "../modules/strength/analytics";
import {
  consistency as swimConsistency,
  dominantStroke,
  paceTrendByStroke,
  weeklyVolume as swimWeeklyVolume,
} from "../modules/swimming/analytics";
import { strokeInfo, typeInfo as swimTypeInfo } from "../modules/swimming/constants";
import {
  consistency as hyroxConsistency,
  exerciseOptions as hyroxExerciseOptions,
  exerciseProgression as hyroxExerciseProgression,
  mostFrequentExerciseKey as hyroxMostFrequentExerciseKey,
  weeklyVolume as hyroxWeeklyVolume,
} from "../modules/hyrox/analytics";
import {
  consistency as cyclingConsistency,
  dominantType as cyclingDominantType,
  speedTrendByType as cyclingSpeedTrendByType,
  weeklyVolume as cyclingWeeklyVolume,
} from "../modules/ciclismo/analytics";
import { typeInfo as cyclingTypeInfo } from "../modules/ciclismo/constants";
import { ScoreGauge } from "./ScoreGauge";

const corrida = modalityInfo("corrida");
const MODALITY_ICONS = { Footprints, Dumbbell, Bike, Waves, Flame };

const HOME_SUB_NAV = [
  { id: "geral", label: "Geral", icon: LayoutGrid },
  { id: "atividades", label: "Últimas atividades", icon: ListChecks },
];

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
        : `${trend.paceChangePct < 0 ? "melhorando" : "piorando"} ${Math.abs(trend.paceChangePct).toFixed(1)}% em ${runningTypeInfo(dom).label}`,
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

/* Same 3-factor read as runningSubScores/strengthSubScores, scoped to
   Natação's own units (metros, pace por 100m). */
function swimmingSubScores(workouts) {
  if (workouts.length === 0) return null;
  const consistency4 = swimConsistency(workouts, 4).activeWeeksPct;

  const vol = swimWeeklyVolume(workouts, 8);
  const currentWeekM = vol.weeks[vol.weeks.length - 1]?.distanceM ?? 0;
  const deviation = vol.avgDistanceM > 0 ? Math.abs(currentWeekM / vol.avgDistanceM - 1) : 0;
  const loadScore = vol.avgDistanceM > 0 ? clamp(100 - Math.max(0, deviation - 0.33) * 150, 0, 100) : 60;

  const dom = dominantStroke(workouts);
  const trend = paceTrendByStroke(workouts, dom, 8);
  const progressionScore = trend.paceChangePct === null ? 70 : clamp(70 - trend.paceChangePct * 3, 0, 100);

  return {
    consistency: consistency4, load: loadScore, progression: progressionScore,
    hints: {
      consistency: `${qualify(consistency4)} (${Math.round(consistency4)}% das últimas 4 sem. em Natação)`,
      load: vol.avgDistanceM > 0
        ? `${Math.round(currentWeekM).toLocaleString("pt-BR")} m vs. média de ${Math.round(vol.avgDistanceM).toLocaleString("pt-BR")} m`
        : "sem histórico ainda",
      progression: trend.paceChangePct === null
        ? "sem dado suficiente em Natação"
        : `${trend.paceChangePct < 0 ? "melhorando" : "piorando"} ${Math.abs(trend.paceChangePct).toFixed(1)}% em ${strokeInfo(dom).label}`,
    },
  };
}

/* Same 3-factor read, scoped a HYROX's own units (tempo de sessão, e o
   exercício mais frequente como proxy de "esforço dominante" — pode ser de
   qualquer um dos 4 tipos de métrica). */
function hyroxSubScores(sessions) {
  if (sessions.length === 0) return null;
  const consistency4 = hyroxConsistency(sessions, 4).activeWeeksPct;

  const vol = hyroxWeeklyVolume(sessions, 8);
  const currentWeekDuration = vol.weeks[vol.weeks.length - 1]?.durationSec ?? 0;
  const deviation = vol.avgDurationSec > 0 ? Math.abs(currentWeekDuration / vol.avgDurationSec - 1) : 0;
  const loadScore = vol.avgDurationSec > 0 ? clamp(100 - Math.max(0, deviation - 0.33) * 150, 0, 100) : 60;

  const domKey = hyroxMostFrequentExerciseKey(sessions);
  const domName = hyroxExerciseOptions(sessions).find((o) => o.key === domKey)?.name ?? "";
  const trend = domKey ? hyroxExerciseProgression(sessions, domKey, 8) : { changePct: null, improved: null };
  const progressionScore = trend.changePct === null
    ? 70
    : clamp(70 + (trend.improved ? Math.abs(trend.changePct) : -Math.abs(trend.changePct)) * 3, 0, 100);

  return {
    consistency: consistency4, load: loadScore, progression: progressionScore,
    hints: {
      consistency: `${qualify(consistency4)} (${Math.round(consistency4)}% das últimas 4 sem. em HYROX)`,
      load: vol.avgDurationSec > 0
        ? `${fmtDuration(currentWeekDuration)} vs. média de ${fmtDuration(vol.avgDurationSec)}`
        : "sem histórico ainda",
      progression: trend.changePct === null
        ? "sem dado suficiente em HYROX"
        : `${trend.improved ? "melhorando" : "piorando"} ${Math.abs(trend.changePct).toFixed(1)}% em ${domName}`,
    },
  };
}

/* Same 3-factor read, scoped to Ciclismo's own units (km/h de velocidade
   média — maior é melhor, ao contrário do pace de Corrida/Natação). */
function cyclingSubScores(workouts) {
  if (workouts.length === 0) return null;
  const consistency4 = cyclingConsistency(workouts, 4).activeWeeksPct;

  const vol = cyclingWeeklyVolume(workouts, 8);
  const currentWeekKm = vol.weeks[vol.weeks.length - 1]?.km ?? 0;
  const deviation = vol.avgKm > 0 ? Math.abs(currentWeekKm / vol.avgKm - 1) : 0;
  const loadScore = vol.avgKm > 0 ? clamp(100 - Math.max(0, deviation - 0.33) * 150, 0, 100) : 60;

  const dom = cyclingDominantType(workouts);
  const trend = cyclingSpeedTrendByType(workouts, dom, 8);
  const progressionScore = trend.speedChangePct === null ? 70 : clamp(70 + trend.speedChangePct * 3, 0, 100);

  return {
    consistency: consistency4, load: loadScore, progression: progressionScore,
    hints: {
      consistency: `${qualify(consistency4)} (${Math.round(consistency4)}% das últimas 4 sem. em Ciclismo)`,
      load: vol.avgKm > 0 ? `${currentWeekKm.toFixed(1)} km vs. média de ${vol.avgKm.toFixed(1)} km` : "sem histórico ainda",
      progression: trend.speedChangePct === null
        ? "sem dado suficiente em Ciclismo"
        : `${trend.speedChangePct > 0 ? "melhorando" : "piorando"} ${Math.abs(trend.speedChangePct).toFixed(1)}% em ${cyclingTypeInfo(dom).label}`,
    },
  };
}

function useGlobalScore(workouts, strengthSessions, swimWorkouts, hyroxSessions, cyclingWorkouts) {
  return useMemo(() => {
    const running = runningSubScores(workouts);
    const strength = strengthSubScores(strengthSessions);
    const swimming = swimmingSubScores(swimWorkouts);
    const hyrox = hyroxSubScores(hyroxSessions);
    const cycling = cyclingSubScores(cyclingWorkouts);
    const active = [running, strength, swimming, hyrox, cycling].filter(Boolean);

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
  }, [workouts, strengthSessions, swimWorkouts, hyroxSessions, cyclingWorkouts]);
}

export function Home({ workouts, strengthSessions = [], swimWorkouts = [], hyroxSessions = [], cyclingWorkouts = [], onOpenModule }) {
  const [homeTab, setHomeTab] = useState("geral");
  const { score, dominantTypeId, subScores } = useGlobalScore(workouts, strengthSessions, swimWorkouts, hyroxSessions, cyclingWorkouts);

  const vol8 = useMemo(() => weeklyVolume(workouts, 8), [workouts]);
  const totalKm8 = useMemo(() => vol8.weeks.reduce((a, w) => a + w.km, 0), [vol8]);
  const windowStart8 = addDays(mondayOf(todayStr()), -7 * 7);
  const runningHours8 = useMemo(
    () => workouts
      .filter((w) => w.date >= windowStart8)
      .reduce((a, w) => a + w.durationSec, 0) / 3600,
    [workouts, windowStart8]
  );
  const strengthHours8 = useMemo(
    () => strengthSessions
      .filter((s) => s.date >= windowStart8)
      .reduce((a, s) => a + s.durationSec, 0) / 3600,
    [strengthSessions, windowStart8]
  );
  const swimHours8 = useMemo(
    () => swimWorkouts
      .filter((w) => w.date >= windowStart8)
      .reduce((a, w) => a + w.durationSec, 0) / 3600,
    [swimWorkouts, windowStart8]
  );
  const hyroxHours8 = useMemo(
    () => hyroxSessions
      .filter((s) => s.date >= windowStart8)
      .reduce((a, s) => a + s.durationSec, 0) / 3600,
    [hyroxSessions, windowStart8]
  );
  const cyclingHours8 = useMemo(
    () => cyclingWorkouts
      .filter((w) => w.date >= windowStart8)
      .reduce((a, w) => a + w.durationSec, 0) / 3600,
    [cyclingWorkouts, windowStart8]
  );
  const totalHours8 = runningHours8 + strengthHours8 + swimHours8 + hyroxHours8 + cyclingHours8;

  const modalityHours = { corrida: runningHours8, musculacao: strengthHours8, ciclismo: cyclingHours8, natacao: swimHours8, hyrox: hyroxHours8 };
  const hasAnyData = workouts.length > 0 || strengthSessions.length > 0 || swimWorkouts.length > 0 || hyroxSessions.length > 0 || cyclingWorkouts.length > 0;

  const activeLabels = [
    workouts.length > 0 && "Corrida",
    strengthSessions.length > 0 && "Musculação",
    cyclingWorkouts.length > 0 && "Ciclismo",
    swimWorkouts.length > 0 && "Natação",
    hyroxSessions.length > 0 && "HYROX",
  ].filter(Boolean);
  const scoreDescription = activeLabels.length === 0
    ? "Registre seu primeiro treino para o score de performance começar a fazer sentido."
    : activeLabels.length >= 3
      ? `Score calculado a partir dos seus treinos de ${activeLabels.slice(0, -1).join(", ")} e ${activeLabels[activeLabels.length - 1]}.`
      : `Score calculado a partir dos seus treinos de ${activeLabels.join(" e ")} — as demais modalidades entram assim que tiverem dados.`;

  const effortSplit = useMemo(() => volumeByType(workouts), [workouts]);
  const effortTotal = effortSplit.reduce((a, d) => a + d.value, 0);

  /* Feed unificado pra aba "Últimas atividades" — cada modalidade entra com
     seu próprio título (tipo/estilo quando existe, nome do template quando
     não) e o detalhe que fizer sentido pra unidade dela (km, metros...). */
  const activities = useMemo(() => {
    const items = [
      ...workouts.map((w) => ({
        id: `corrida-${w.id}`, date: w.date, modalityId: "corrida", durationSec: w.durationSec,
        title: runningTypeInfo(w.type).label, detail: `${w.distanceKm.toLocaleString("pt-BR")} km`,
      })),
      ...strengthSessions.map((s) => ({
        id: `musculacao-${s.id}`, date: s.date, modalityId: "musculacao", durationSec: s.durationSec,
        title: s.templateName || "Treino de musculação", detail: null,
      })),
      ...swimWorkouts.map((w) => ({
        id: `natacao-${w.id}`, date: w.date, modalityId: "natacao", durationSec: w.durationSec,
        title: swimTypeInfo(w.type).label, detail: fmtDistanceM(w.distanceM),
      })),
      ...hyroxSessions.map((s) => ({
        id: `hyrox-${s.id}`, date: s.date, modalityId: "hyrox", durationSec: s.durationSec,
        title: s.templateName || "Treino HYROX", detail: null,
      })),
      ...cyclingWorkouts.map((w) => ({
        id: `ciclismo-${w.id}`, date: w.date, modalityId: "ciclismo", durationSec: w.durationSec,
        title: cyclingTypeInfo(w.type).label, detail: `${w.distanceKm.toLocaleString("pt-BR")} km`,
      })),
    ];
    return items.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 20);
  }, [workouts, strengthSessions, swimWorkouts, hyroxSessions, cyclingWorkouts]);

  return (
    <div className="flex flex-col gap-5">
      <nav className="flex items-center gap-1" style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
        {HOME_SUB_NAV.map((n) => {
          const active = homeTab === n.id;
          return (
            <button
              key={n.id}
              onClick={() => setHomeTab(n.id)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold rounded-t-lg whitespace-nowrap"
              style={{
                color: active ? C.positive : C.gray,
                borderBottom: active ? `2px solid ${C.positive}` : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              <n.icon size={16} /> {n.label}
            </button>
          );
        })}
      </nav>

      {homeTab === "atividades" ? (
        activities.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="Nenhuma atividade registrada ainda"
            description="Assim que você registrar treinos em qualquer modalidade, eles aparecem aqui juntos, do mais recente pro mais antigo."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {activities.map((a) => {
              const modality = modalityInfo(a.modalityId);
              const Icon = MODALITY_ICONS[modality.icon];
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-3"
                  style={{ background: C.surface2, border: `1px solid ${C.borderSoft}` }}
                >
                  <div className="flex flex-col items-center justify-center rounded-lg px-2 py-1.5" style={{ background: C.surface, minWidth: 52 }}>
                    <span style={{ color: C.gray, fontSize: 10 }}>{fmtDateShort(a.date)}</span>
                  </div>
                  <div className="rounded-lg p-1.5 flex-shrink-0" style={{ background: `${modality.color}1A`, color: modality.color }}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Pill color={modality.color}>{modality.label}</Pill>
                      <span style={{ color: C.white, fontSize: 13, fontWeight: 600 }}>{a.title}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm flex-wrap" style={{ color: C.gray }}>
                      <span>{fmtDuration(a.durationSec)}</span>
                      {a.detail && (
                        <>
                          <span>•</span>
                          <span>{a.detail}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
      <>
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
          <div className="rounded-full p-3" style={{ background: `color-mix(in srgb, ${C.gray} 10%, transparent)` }}>
            <Target size={22} style={{ color: C.gray }} />
          </div>
          <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: C.white, fontSize: 15 }}>Metas — em breve</h3>
          <p className="text-xs" style={{ color: C.gray, maxWidth: 240 }}>
            Defina metas de volume, pace ou frequência para acompanhar seu progresso aqui.
          </p>
        </Card>
      </div>
      </>
      )}
    </div>
  );
}
