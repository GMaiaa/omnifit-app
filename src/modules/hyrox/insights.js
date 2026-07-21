import { addDays, fmtDuration, fmtPace, todayStr } from "../../lib/format";
import {
  averageTransitionShare,
  compareCycles,
  consistency,
  exerciseHistory,
  exerciseOptions,
  exerciseProgression,
  runPaceConsistencyInMostRecentSession,
  strongestAndWeakestExercise,
} from "./analytics";

const CHANGE_THRESHOLD = { reps: 5, load: 3, time: 5, distance: 2 }; // %
const MIN_SAMPLES = 4;
const MIN_WEEK_SPAN = 2;
const MIN_TRANSITION_SHARE = 8; // %
const MAX_PACE_CV_FOR_CONSISTENCY = 8; // %

function pct(v) {
  return Math.abs(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function formatMetricValue(metricType, value) {
  if (metricType === "reps") return `${Math.round(value)} reps`;
  if (metricType === "load") return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
  if (metricType === "time") return fmtDuration(value);
  return `${fmtPace(value)} /km`;
}

function verbFor(metricType, improved) {
  if (metricType === "load") return improved ? "aumentou" : "reduziu";
  if (metricType === "reps") return improved ? "aumentou" : "caiu";
  if (metricType === "time") return improved ? "aumentou" : "caiu";
  return improved ? "caiu" : "aumentou"; // distance: pace menor é melhora
}

function labelFor(metricType) {
  if (metricType === "distance") return "pace médio";
  if (metricType === "load") return "carga";
  if (metricType === "reps") return "número de repetições";
  return "tempo sustentado";
}

/* ---------------------------------------------------------
   RULES
--------------------------------------------------------- */
function newRecordInsights(sessions) {
  const out = [];
  const cutoff = addDays(todayStr(), -14);
  for (const opt of exerciseOptions(sessions)) {
    const history = exerciseHistory(sessions, opt.key);
    if (history.length < 2) continue;
    const last = history[history.length - 1];
    if (last.isPR && last.date >= cutoff) {
      out.push({
        id: `pr-${opt.key}`,
        tone: "positive",
        priority: 0,
        text: `Novo recorde pessoal! Seu melhor resultado em ${opt.name} agora é de ${formatMetricValue(opt.metricType, last.primaryValue)}.`,
      });
    }
  }
  return out;
}

function progressionInsights(sessions, windowWeeks) {
  const out = [];
  for (const opt of exerciseOptions(sessions)) {
    const trend = exerciseProgression(sessions, opt.key, windowWeeks);
    if (trend.count < MIN_SAMPLES || trend.weeksSpan < MIN_WEEK_SPAN || trend.changePct === null) continue;
    const threshold = CHANGE_THRESHOLD[trend.metricType] ?? 3;
    if (Math.abs(trend.changePct) < threshold) continue;
    out.push({
      id: `progress-${opt.key}`,
      tone: trend.improved ? "positive" : "warning",
      priority: 2,
      text: `Seu ${labelFor(trend.metricType)} em ${opt.name} ${verbFor(trend.metricType, trend.improved)} ${pct(trend.changePct)}% nas últimas ${windowWeeks} semanas.`,
    });
  }
  return out;
}

function transitionInsight(sessions, windowWeeks) {
  const share = averageTransitionShare(sessions, windowWeeks);
  if (share === null || share < MIN_TRANSITION_SHARE) return null;
  return {
    id: "transition-share",
    tone: "warning",
    priority: 3,
    text: `As transições entre estações representam ${Math.round(share)}% do seu tempo total de treino nas últimas ${windowWeeks} semanas — esse é atualmente seu maior ponto de perda de tempo.`,
  };
}

function runPaceConsistencyInsight(sessions) {
  const result = runPaceConsistencyInMostRecentSession(sessions);
  if (!result || result.cv === null || result.cv > MAX_PACE_CV_FOR_CONSISTENCY) return null;
  return {
    id: "run-pace-consistency",
    tone: "positive",
    priority: 3,
    text: `Seu ritmo de corrida está consistente entre os blocos — variação de apenas ${result.cv.toFixed(1)}% entre as ${result.count} corridas do seu treino mais recente.`,
  };
}

function strongestWeakestInsights(sessions, windowWeeks) {
  const { strongest, weakest } = strongestAndWeakestExercise(sessions, windowWeeks);
  const out = [];
  if (strongest) {
    out.push({
      id: `strongest-${strongest.key}`,
      tone: "positive",
      priority: 2,
      text: `${strongest.name} é atualmente seu ponto mais forte, com evolução de ${pct(strongest.changePct)}% nas últimas ${windowWeeks} semanas.`,
    });
  }
  if (weakest) {
    out.push({
      id: `weakest-${weakest.key}`,
      tone: "warning",
      priority: 3,
      text: `${weakest.name} continua sendo um dos seus principais gargalos, com queda de desempenho de ${pct(weakest.changePct)}% nas últimas ${windowWeeks} semanas.`,
    });
  }
  return out;
}

function volumeInsight(sessions) {
  const { deltas, current, previous } = compareCycles(sessions, 4);
  if (deltas.durationPct === null || previous.totalDurationSec === 0) return null;
  if (Math.abs(deltas.durationPct) < 8) return null;
  const up = deltas.durationPct > 0;
  return {
    id: "volume-trend",
    tone: up ? "positive" : "warning",
    priority: 4,
    text: `Seu tempo total de treino ${up ? "aumentou" : "caiu"} ${pct(deltas.durationPct)}% nas últimas 4 semanas (${fmtDuration(
      current.totalDurationSec
    )}) em relação às 4 semanas anteriores (${fmtDuration(previous.totalDurationSec)}).`,
  };
}

function consistencyInsights(sessions) {
  const out = [];
  const recent = consistency(sessions, 8);
  const prior = consistency(
    sessions.filter((s) => s.date < addDays(todayStr(), -7 * 8)),
    8
  );

  if (recent.currentStreak >= 4) {
    out.push({
      id: "streak",
      tone: "positive",
      priority: 1,
      text: `Você mantém uma sequência de ${recent.currentStreak} semanas consecutivas treinando HYROX.`,
    });
  }

  if (prior.activeWeeksPct > 0 && recent.activeWeeksPct < prior.activeWeeksPct * 0.7) {
    out.push({
      id: "consistency-drop",
      tone: "warning",
      priority: 1,
      text: `Sua consistência caiu: você treinou em ${Math.round(
        recent.activeWeeksPct
      )}% das últimas 8 semanas, contra ${Math.round(prior.activeWeeksPct)}% nas 8 semanas anteriores.`,
    });
  }

  return out;
}

/* ---------------------------------------------------------
   ENTRY POINT
--------------------------------------------------------- */
export function generateInsights(sessions, { windowWeeks = 8 } = {}) {
  const volume = volumeInsight(sessions);
  const transition = transitionInsight(sessions, windowWeeks);
  const paceConsistency = runPaceConsistencyInsight(sessions);

  const all = [
    ...newRecordInsights(sessions),
    ...consistencyInsights(sessions),
    ...progressionInsights(sessions, windowWeeks),
    ...strongestWeakestInsights(sessions, windowWeeks),
    ...(paceConsistency ? [paceConsistency] : []),
    ...(transition ? [transition] : []),
    ...(volume ? [volume] : []),
  ];

  return all.sort((a, b) => a.priority - b.priority).slice(0, 5);
}
