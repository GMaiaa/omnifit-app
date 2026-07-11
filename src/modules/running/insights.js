import { DISTANCE_BUCKETS, TYPES } from "./constants";
import { addDays, todayStr } from "../../lib/format";
import {
  compareCycles,
  consistency,
  distanceMilestoneSeries,
  paceHrRelation,
  paceTrendByType,
} from "./analytics";

const PACE_CHANGE_THRESHOLD = 2; // % — below this we consider pace "unchanged"
const HR_STABLE_THRESHOLD = 1.5; // %
const EFFICIENCY_THRESHOLD = 3; // %
const MIN_TYPE_SAMPLES = 4;
const MIN_TYPE_WEEK_SPAN = 2;

function pct(v) {
  return Math.abs(v).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function hrClause(hrChangePct) {
  if (hrChangePct === null) return null;
  if (Math.abs(hrChangePct) <= HR_STABLE_THRESHOLD) return "sua FC média permaneceu estável";
  return `sua FC média ${hrChangePct > 0 ? "aumentou" : "caiu"} ${pct(hrChangePct)}%`;
}

/* ---------------------------------------------------------
   RULES
--------------------------------------------------------- */
function paceByTypeInsights(workouts, paceWindowWeeks) {
  const out = [];
  for (const t of TYPES) {
    const trend = paceTrendByType(workouts, t.id, paceWindowWeeks);
    if (trend.count < MIN_TYPE_SAMPLES || trend.weeksSpan < MIN_TYPE_WEEK_SPAN) continue;
    if (trend.paceChangePct === null || Math.abs(trend.paceChangePct) < PACE_CHANGE_THRESHOLD) continue;

    const improved = trend.paceChangePct < 0;
    const hr = hrClause(trend.hrChangePct);
    const text = `Nas últimas ${paceWindowWeeks} semanas, seu pace médio em treinos de ${t.label} ${
      improved ? "melhorou" : "piorou"
    } ${pct(trend.paceChangePct)}%${hr ? `, enquanto ${hr}` : ""}.`;

    out.push({
      id: `pace-${t.id}`,
      tone: improved ? "positive" : "warning",
      priority: 2,
      text,
    });
  }
  return out;
}

function efficiencyInsights(workouts, paceWindowWeeks) {
  const out = [];
  for (const t of TYPES) {
    const trend = paceTrendByType(workouts, t.id, paceWindowWeeks);
    if (trend.count < MIN_TYPE_SAMPLES || trend.weeksSpan < MIN_TYPE_WEEK_SPAN) continue;
    // Only surface efficiency when pace itself didn't already tell the story.
    if (trend.paceChangePct !== null && Math.abs(trend.paceChangePct) >= PACE_CHANGE_THRESHOLD) continue;

    const relation = paceHrRelation(workouts, t.id);
    if (relation.efficiencyChangePct === null || relation.efficiencyChangePct < EFFICIENCY_THRESHOLD) continue;

    out.push({
      id: `efficiency-${t.id}`,
      tone: "positive",
      priority: 2,
      text: `Seu pace em treinos de ${t.label} está estável, mas sua eficiência aeróbica (ritmo por batimento) melhorou ${pct(
        relation.efficiencyChangePct
      )}% — sinal de que seu condicionamento está evoluindo mesmo sem aparecer ainda no pace.`,
    });
  }
  return out;
}

function volumeInsight(workouts) {
  const { deltas, current, previous } = compareCycles(workouts, 4);
  if (deltas.kmPct === null || previous.totalKm === 0) return null;
  if (Math.abs(deltas.kmPct) < 5) return null;
  const up = deltas.kmPct > 0;
  return {
    id: "volume-trend",
    tone: up ? "positive" : "warning",
    priority: 3,
    text: `Seu volume semanal médio ${up ? "aumentou" : "caiu"} ${pct(deltas.kmPct)}% nas últimas 4 semanas (${current.totalKm.toFixed(
      1
    )} km) em relação às 4 semanas anteriores (${previous.totalKm.toFixed(1)} km).`,
  };
}

function consistencyInsights(workouts) {
  const out = [];
  const recent = consistency(workouts, 8);
  const prior = consistency(
    workouts.filter((w) => w.date < addDays(todayStr(), -7 * 8)),
    8
  );

  if (recent.currentStreak >= 4) {
    out.push({
      id: "streak",
      tone: "positive",
      priority: 1,
      text: `Você mantém uma sequência de ${recent.currentStreak} semanas consecutivas treinando. Consistência é o que mais sustenta evolução a longo prazo.`,
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
  for (const t of TYPES) {
    for (const bucket of DISTANCE_BUCKETS) {
      const series = distanceMilestoneSeries(workouts, t.id, bucket.id);
      if (series.length < 2) continue;
      const last = series[series.length - 1];
      if (last.isPR && last.date >= cutoff) {
        out.push({
          id: `pr-${t.id}-${bucket.id}`,
          tone: "positive",
          priority: 0,
          text: `Novo recorde pessoal! Seu ${bucket.label} mais rápido em treinos de ${t.label} agora é de ${
            Math.floor(last.pace / 60)
          }:${String(Math.round(last.pace % 60)).padStart(2, "0")} /km.`,
        });
      }
    }
  }
  return out;
}

/* ---------------------------------------------------------
   ENTRY POINT
--------------------------------------------------------- */
export function generateInsights(workouts, { paceWindowWeeks = 8 } = {}) {
  const volume = volumeInsight(workouts);
  const all = [
    ...newRecordInsights(workouts),
    ...consistencyInsights(workouts),
    ...paceByTypeInsights(workouts, paceWindowWeeks),
    ...efficiencyInsights(workouts, paceWindowWeeks),
    ...(volume ? [volume] : []),
  ];

  return all.sort((a, b) => a.priority - b.priority).slice(0, 5);
}
