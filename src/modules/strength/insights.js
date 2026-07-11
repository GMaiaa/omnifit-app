import { addDays, todayStr } from "../../lib/format";
import {
  consistency,
  exerciseHistory,
  exerciseOptions,
  frequencyByMuscleGroup,
  loadProgression,
  volumeByMuscleGroup,
} from "./analytics";

const LOAD_CHANGE_THRESHOLD = 3; // % — below this we consider load "unchanged"
const STAGNATION_MIN_WEEKS = 4;
const MIN_EXERCISE_SAMPLES = 4;
const MIN_EXERCISE_WEEK_SPAN = 2;
const GROUP_TARGET_FREQ_PER_WEEK = 2;

function pct(v) {
  return Math.abs(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
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
        text: `Novo recorde pessoal! Sua melhor carga em ${opt.name} agora é de ${last.bestWeight.toLocaleString("pt-BR")} kg × ${last.bestReps} reps.`,
      });
    }
  }
  return out;
}

function loadProgressionInsights(sessions, windowWeeks) {
  const out = [];
  for (const opt of exerciseOptions(sessions)) {
    const trend = loadProgression(sessions, opt.key, windowWeeks);
    if (trend.count < MIN_EXERCISE_SAMPLES || trend.weeksSpan < MIN_EXERCISE_WEEK_SPAN) continue;

    if (trend.loadChangePct === null) continue;

    if (Math.abs(trend.loadChangePct) >= LOAD_CHANGE_THRESHOLD) {
      const improved = trend.loadChangePct > 0;
      out.push({
        id: `load-${opt.key}`,
        tone: improved ? "positive" : "warning",
        priority: 2,
        text: `Você ${improved ? "aumentou" : "reduziu"} a carga de ${opt.name} em ${pct(trend.loadChangePct)}% nas últimas ${windowWeeks} semanas.`,
      });
    } else if (trend.weeksSpan >= STAGNATION_MIN_WEEKS) {
      out.push({
        id: `stagnation-${opt.key}`,
        tone: "warning",
        priority: 3,
        text: `${opt.name} está estagnado há ${trend.weeksSpan} semanas — considere variar a carga, o volume ou o exercício.`,
      });
    }
  }
  return out;
}

function repsAtSameLoadInsights(sessions) {
  const out = [];
  for (const opt of exerciseOptions(sessions)) {
    const history = exerciseHistory(sessions, opt.key);
    if (history.length < 2) continue;
    const [prev, last] = history.slice(-2);
    if (prev.bestWeight === last.bestWeight && last.bestReps > prev.bestReps) {
      out.push({
        id: `reps-${opt.key}`,
        tone: "positive",
        priority: 2,
        text: `Você executou mais repetições mantendo a mesma carga em ${opt.name} (${prev.bestReps} → ${last.bestReps} reps a ${last.bestWeight.toLocaleString("pt-BR")} kg).`,
      });
    }
  }
  return out;
}

function volumeByGroupInsight(sessions) {
  const weekStart = todayStr();
  const currentStart = addDays(weekStart, -28);
  const previousStart = addDays(weekStart, -56);

  const current = volumeByMuscleGroup(sessions, { start: currentStart, end: weekStart });
  const previous = volumeByMuscleGroup(sessions, { start: previousStart, end: currentStart });
  if (current.length === 0) return null;

  let biggest = null;
  for (const c of current) {
    const p = previous.find((d) => d.id === c.id);
    if (!p || p.value === 0) continue;
    const changePct = ((c.value - p.value) / p.value) * 100;
    if (Math.abs(changePct) < 10) continue;
    if (!biggest || Math.abs(changePct) > Math.abs(biggest.changePct)) biggest = { ...c, changePct };
  }
  if (!biggest) return null;

  const up = biggest.changePct > 0;
  return {
    id: `volume-group-${biggest.id}`,
    tone: up ? "positive" : "warning",
    priority: 3,
    text: `Seu volume para ${biggest.name.toLowerCase()} ${up ? "aumentou" : "caiu"} ${pct(biggest.changePct)}% este mês.`,
  };
}

function frequencyInsights(sessions) {
  const out = [];
  const thisWeek = frequencyByMuscleGroup(sessions, 1);
  for (const g of thisWeek) {
    if (g.value >= GROUP_TARGET_FREQ_PER_WEEK) {
      out.push({
        id: `freq-${g.id}`,
        tone: "positive",
        priority: 4,
        text: `Frequência ideal para ${g.name.toLowerCase()} atingida esta semana (${g.value}x).`,
      });
    }
  }
  return out.slice(0, 2);
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
      text: `Você mantém uma sequência de ${recent.currentStreak} semanas consecutivas treinando musculação.`,
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
  const volume = volumeByGroupInsight(sessions);
  const all = [
    ...newRecordInsights(sessions),
    ...consistencyInsights(sessions),
    ...loadProgressionInsights(sessions, windowWeeks),
    ...repsAtSameLoadInsights(sessions),
    ...frequencyInsights(sessions),
    ...(volume ? [volume] : []),
  ];

  return all.sort((a, b) => a.priority - b.priority).slice(0, 5);
}
