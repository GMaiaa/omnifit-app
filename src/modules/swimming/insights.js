import { DISTANCE_BUCKETS, STROKES, TYPES, typeInfo } from "./constants";
import { addDays, fmtDistanceM, todayStr } from "../../lib/format";
import {
  compareCycles,
  consistency,
  distanceMilestoneSeries,
  paceTrendByStroke,
  swolfTrend,
  weeksSinceLastType,
} from "./analytics";

const PACE_CHANGE_THRESHOLD = 2; // % — below this we consider pace "unchanged"
const SWOLF_CHANGE_THRESHOLD = 2; // %
const MIN_STROKE_SAMPLES = 4;
const MIN_STROKE_WEEK_SPAN = 2;
const EDUCATIVO_GAP_WEEKS = 2;
const MIN_BALANCE_SAMPLES = 6;

function pct(v) {
  return Math.abs(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

/* ---------------------------------------------------------
   RULES
--------------------------------------------------------- */
function paceByStrokeInsights(workouts, paceWindowWeeks) {
  const out = [];
  for (const s of STROKES) {
    const trend = paceTrendByStroke(workouts, s.id, paceWindowWeeks);
    if (trend.count < MIN_STROKE_SAMPLES || trend.weeksSpan < MIN_STROKE_WEEK_SPAN) continue;
    if (trend.paceChangePct === null || Math.abs(trend.paceChangePct) < PACE_CHANGE_THRESHOLD) continue;

    const improved = trend.paceChangePct < 0;
    out.push({
      id: `pace-${s.id}`,
      tone: improved ? "positive" : "warning",
      priority: 2,
      text: `Nas últimas ${paceWindowWeeks} semanas, seu pace médio nos 100m em ${s.label} ${
        improved ? "melhorou" : "piorou"
      } ${pct(trend.paceChangePct)}%.`,
    });
  }
  return out;
}

function swolfInsights(workouts, windowWeeks) {
  const trend = swolfTrend(workouts, windowWeeks);
  if (trend.count < 4 || trend.swolfChangePct === null || Math.abs(trend.swolfChangePct) < SWOLF_CHANGE_THRESHOLD) {
    return null;
  }
  const improved = trend.swolfChangePct < 0; // menor SWOLF = mais eficiência
  return {
    id: "swolf-trend",
    tone: improved ? "positive" : "warning",
    priority: 2,
    text: `Seu SWOLF ${improved ? "apresentou melhora consistente" : "piorou"} (${pct(trend.swolfChangePct)}%) nas últimas ${windowWeeks} semanas${
      improved ? " — sinal de que sua eficiência na água está evoluindo." : "."
    }`,
  };
}

function volumeInsight(workouts) {
  const { deltas, current, previous } = compareCycles(workouts, 4);
  if (deltas.distancePct === null || previous.totalM === 0) return null;
  if (Math.abs(deltas.distancePct) < 5) return null;
  const up = deltas.distancePct > 0;
  return {
    id: "volume-trend",
    tone: up ? "positive" : "warning",
    priority: 3,
    text: `Você ${up ? "aumentou" : "reduziu"} seu volume semanal em ${pct(deltas.distancePct)}% nas últimas 4 semanas (${fmtDistanceM(
      current.totalM
    )}) em relação às 4 semanas anteriores (${fmtDistanceM(previous.totalM)}).`,
  };
}

function consistencyInsights(workouts) {
  const out = [];
  const recent = consistency(workouts, 8);
  const prior = consistency(
    workouts.filter((w) => w.date < addDays(todayStr(), -7 * 8)),
    8
  );

  if (recent.currentStreak >= 6) {
    out.push({
      id: "streak",
      tone: "positive",
      priority: 1,
      text: `Você mantém excelente consistência de treinos nas últimas ${recent.currentStreak} semanas.`,
    });
  } else if (recent.currentStreak >= 4) {
    out.push({
      id: "streak",
      tone: "positive",
      priority: 1,
      text: `Você mantém uma sequência de ${recent.currentStreak} semanas consecutivas treinando. Consistência é o que mais sustenta evolução técnica na água.`,
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

function newRecordInsights(workouts) {
  const out = [];
  const cutoff = addDays(todayStr(), -14);
  for (const s of STROKES) {
    for (const bucket of DISTANCE_BUCKETS) {
      const series = distanceMilestoneSeries(workouts, s.id, bucket.id);
      if (series.length < 2) continue;
      const last = series[series.length - 1];
      if (last.isPR && last.date >= cutoff) {
        out.push({
          id: `pr-${s.id}-${bucket.id}`,
          tone: "positive",
          priority: 0,
          text: `Novo recorde pessoal! Seu ${bucket.label} mais rápido em ${s.label} agora é de ${
            Math.floor(last.pace / 60)
          }:${String(Math.round(last.pace % 60)).padStart(2, "0")} /100m.`,
        });
      }
    }
  }
  return out;
}

function educativoGapInsight(workouts) {
  const hasEverDone = workouts.some((w) => w.type === "educativo");
  if (!hasEverDone) return null;
  const weeksSince = weeksSinceLastType(workouts, "educativo");
  if (weeksSince === null || weeksSince < EDUCATIVO_GAP_WEEKS) return null;
  return {
    id: "educativo-gap",
    tone: "warning",
    priority: 2,
    text: `Há ${weeksSince} semanas você não realiza treinos educativos — eles são fundamentais para manter a técnica em dia.`,
  };
}

function typeBalanceInsight(workouts, windowWeeks) {
  const since = addDays(todayStr(), -7 * windowWeeks);
  const recent = workouts.filter((w) => w.date >= since);
  if (recent.length < MIN_BALANCE_SAMPLES) return null;

  const counts = {};
  for (const t of TYPES) counts[t.id] = 0;
  for (const w of recent) counts[w.type] = (counts[w.type] || 0) + 1;

  let dominant = null, dominantCount = 0;
  for (const t of TYPES) {
    if (counts[t.id] > dominantCount) { dominant = t.id; dominantCount = counts[t.id]; }
  }
  if (!dominant) return null;

  const total = recent.length;
  const dominantShare = dominantCount / total;
  if (dominantShare < 0.5) return null;

  const speedShare = ((counts.velocidade || 0) + (counts.sprint || 0)) / total;
  if (speedShare >= 0.15) return null;

  return {
    id: "type-balance",
    tone: "warning",
    priority: 3,
    text: `Seus treinos estão concentrados em ${typeInfo(dominant).label.toLowerCase()} (${Math.round(
      dominantShare * 100
    )}% das sessões nas últimas ${windowWeeks} semanas), com pouca ênfase em velocidade.`,
  };
}

/* ---------------------------------------------------------
   ENTRY POINT
--------------------------------------------------------- */
export function generateInsights(workouts, { paceWindowWeeks = 8 } = {}) {
  const volume = volumeInsight(workouts);
  const swolf = swolfInsights(workouts, paceWindowWeeks);
  const educativoGap = educativoGapInsight(workouts);
  const balance = typeBalanceInsight(workouts, paceWindowWeeks);

  const all = [
    ...newRecordInsights(workouts),
    ...consistencyInsights(workouts),
    ...paceByStrokeInsights(workouts, paceWindowWeeks),
    ...(swolf ? [swolf] : []),
    ...(educativoGap ? [educativoGap] : []),
    ...(balance ? [balance] : []),
    ...(volume ? [volume] : []),
  ];

  return all.sort((a, b) => a.priority - b.priority).slice(0, 5);
}
