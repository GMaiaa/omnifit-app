import { MUSCLE_GROUPS, exerciseMetricType } from "./constants";
import { addDays, mondayOf, todayStr } from "../../lib/format";

/* All functions here assume finished Sessions: SessionRunner normalizes
   every set's status to either "done" (has a valid value for the
   exercise's metricType) or "skipped" before persisting, so analytics only
   ever needs to filter on "done".

   Três tipos de série, mutuamente exclusivos (ver METRIC_TYPES em
   constants.js):
   - load_reps: carga x repetições (padrão).
   - reps_only: só repetições, sem carga (peso corporal).
   - time: só duração, sem carga nem reps (isometria).
   Misturar os três num único número (ex: somar segundos de prancha dentro
   do "volume em kg") seria impreciso — por isso volume/1RM só existem pra
   load_reps, e séries sem carga contam pra frequência/contagem de séries
   mas não entram no volume em kg. */

/* ---------------------------------------------------------
   LOW-LEVEL HELPERS
--------------------------------------------------------- */
export const exerciseKeyOf = (ex) => ex.sourceExerciseId || ex.name;

function isCountedSet(set, metricType) {
  if (set.status !== "done") return false;
  if (metricType === "time") return set.durationSec > 0;
  if (metricType === "reps_only") return set.reps > 0;
  return set.weight > 0 && set.reps > 0; // load_reps
}

/* Só faz sentido em kg — séries sem carga contribuem 0 (contam pra
   frequência/nº de séries via exerciseSetsCount, não pro volume). */
export function setVolume(set, metricType) {
  return metricType === "load_reps" ? (set.weight || 0) * (set.reps || 0) : 0;
}

export function exerciseVolume(ex) {
  const metricType = exerciseMetricType(ex);
  return sum(ex.sets.filter((s) => isCountedSet(s, metricType)).map((s) => setVolume(s, metricType)));
}

export function exerciseSetsCount(ex) {
  const metricType = exerciseMetricType(ex);
  return ex.sets.filter((s) => isCountedSet(s, metricType)).length;
}

export function sessionVolume(session) {
  return sum(session.exercises.map(exerciseVolume));
}

export function sessionSetsCount(session) {
  return sum(session.exercises.map(exerciseSetsCount));
}

export function epley1RM(weight, reps) {
  if (!weight || !reps) return 0;
  return weight * (1 + reps / 30);
}

/* Melhor série de uma instância do exercício — o que "melhor" significa
   depende do metricType: maior carga (via 1RM estimado) pra load_reps,
   mais repetições pra reps_only, hold mais longo pra time. */
export function bestSetOf(ex) {
  const metricType = exerciseMetricType(ex);
  const counted = ex.sets.filter((s) => isCountedSet(s, metricType));
  if (counted.length === 0) return null;

  if (metricType === "time") {
    return counted.reduce((best, s) => (!best || s.durationSec > best.durationSec ? s : best), null);
  }
  if (metricType === "reps_only") {
    return counted.reduce((best, s) => (!best || s.reps > best.reps ? s : best), null);
  }
  return counted.reduce((best, s) => {
    const e1rm = epley1RM(s.weight, s.reps);
    if (!best || e1rm > epley1RM(best.weight, best.reps)) return s;
    return best;
  }, null);
}

export function inRange(s, start, end) {
  return s.date >= start && (!end || s.date < end);
}

export function groupByMuscleGroup(exercises) {
  const map = new Map();
  for (const ex of exercises) {
    if (!map.has(ex.muscleGroup)) map.set(ex.muscleGroup, []);
    map.get(ex.muscleGroup).push(ex);
  }
  return map;
}

function allExercises(sessions) {
  return sessions.flatMap((s) => s.exercises);
}

export const sum = (arr) => arr.reduce((a, v) => a + v, 0);
const mean = (arr) => (arr.length ? sum(arr) / arr.length : null);
function stdDev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(sum(arr.map((v) => (v - m) ** 2)) / arr.length);
}
function linearRegression(points) {
  const n = points.length;
  if (n < 2) return null;
  const sumX = sum(points.map((p) => p.x));
  const sumY = sum(points.map((p) => p.y));
  const sumXY = sum(points.map((p) => p.x * p.y));
  const sumXX = sum(points.map((p) => p.x * p.x));
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}
function pctChange(from, to) {
  if (from === null || from === undefined || from === 0) return null;
  return ((to - from) / from) * 100;
}
function halves(arr) {
  const mid = Math.ceil(arr.length / 2);
  return [arr.slice(0, mid), arr.slice(mid)];
}
function daysBetween(a, b) {
  return (new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000;
}

/* ---------------------------------------------------------
   WEEKLY VOLUME
--------------------------------------------------------- */
export function weeklyVolume(sessions, numWeeks) {
  const weekStart = mondayOf(todayStr());
  const weeksArr = [];
  for (let i = numWeeks - 1; i >= 0; i--) {
    const start = addDays(weekStart, -7 * i);
    const end = addDays(start, 7);
    const arr = sessions.filter((s) => inRange(s, start, end));
    const volume = sum(arr.map(sessionVolume));
    const setsCount = sum(arr.map(sessionSetsCount));
    weeksArr.push({
      start,
      label: start.slice(5).split("-").reverse().join("/"),
      volume: Math.round(volume),
      sets: setsCount,
      sessions: arr.length,
      avgLoad: setsCount > 0 ? Math.round((volume / setsCount) * 10) / 10 : null,
    });
  }
  const volumes = weeksArr.map((w) => w.volume);
  const avgVolume = mean(volumes);
  const sd = stdDev(volumes);
  const cv = avgVolume > 0 ? (sd / avgVolume) * 100 : null;
  const weekOverWeek = weeksArr.map((w, i) => {
    if (i === 0) return null;
    const prev = weeksArr[i - 1].volume;
    return prev > 0 ? pctChange(prev, w.volume) : null;
  });
  return { weeks: weeksArr, avgVolume, stdDev: sd, cv, weekOverWeek };
}

/* ---------------------------------------------------------
   VOLUME / FREQUENCY BY MUSCLE GROUP
--------------------------------------------------------- */
export function volumeByMuscleGroup(sessions, { start, end } = {}) {
  const scoped = start ? sessions.filter((s) => inRange(s, start, end)) : sessions;
  const exercises = allExercises(scoped);
  const byGroup = groupByMuscleGroup(exercises);
  return MUSCLE_GROUPS.map((g) => ({
    id: g.id,
    name: g.label,
    color: g.color,
    value: Math.round(sum((byGroup.get(g.id) || []).map(exerciseVolume))),
  })).filter((d) => d.value > 0);
}

export function frequencyByMuscleGroup(sessions, weeks) {
  const since = addDays(todayStr(), -7 * weeks);
  const scoped = sessions.filter((s) => s.date >= since);
  const counts = {};
  for (const g of MUSCLE_GROUPS) counts[g.id] = new Set();
  for (const s of scoped) {
    const groups = new Set(s.exercises.filter((ex) => exerciseSetsCount(ex) > 0).map((ex) => ex.muscleGroup));
    for (const g of groups) counts[g]?.add(s.date);
  }
  return MUSCLE_GROUPS.map((g) => ({
    id: g.id,
    name: g.label,
    color: g.color,
    value: counts[g.id].size,
  })).filter((d) => d.value > 0);
}

/* ---------------------------------------------------------
   PER-EXERCISE HISTORY / EVOLUTION
--------------------------------------------------------- */
export function exerciseOptions(sessions) {
  const seen = new Map();
  for (const s of sessions) {
    for (const ex of s.exercises) {
      if (exerciseSetsCount(ex) === 0) continue;
      const key = exerciseKeyOf(ex);
      if (!seen.has(key)) seen.set(key, { key, name: ex.name, count: 0 });
      seen.get(key).count++;
    }
  }
  return [...seen.values()].sort((a, b) => b.count - a.count);
}

export function mostFrequentExerciseKey(sessions) {
  const opts = exerciseOptions(sessions);
  return opts.length ? opts[0].key : null;
}

/* Um ponto por sessão — o número "principal" (primaryValue) depende do
   metricType do exercício: 1RM estimado pra load_reps, melhor repetição
   pra reps_only, hold mais longo pra time. Mantém bestWeight/bestReps/e1rm
   pra quem já consumia esses campos especificamente (gráfico de carga). */
export function exerciseHistory(sessions, exerciseKey) {
  const points = sessions
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .flatMap((s) =>
      s.exercises
        .filter((ex) => exerciseKeyOf(ex) === exerciseKey && exerciseSetsCount(ex) > 0)
        .map((ex) => {
          const metricType = exerciseMetricType(ex);
          const best = bestSetOf(ex);
          const primaryValue = metricType === "time"
            ? best.durationSec
            : metricType === "reps_only"
              ? best.reps
              : best.weight;
          return {
            date: s.date,
            metricType,
            primaryValue,
            bestWeight: metricType === "load_reps" ? best.weight : null,
            bestReps: metricType !== "time" ? best.reps : null,
            bestDurationSec: metricType === "time" ? best.durationSec : null,
            e1rm: metricType === "load_reps" ? Math.round(epley1RM(best.weight, best.reps) * 10) / 10 : null,
            volume: Math.round(exerciseVolume(ex)),
          };
        })
    );

  let bestSoFar = -Infinity;
  for (const p of points) {
    p.isPR = p.primaryValue > bestSoFar;
    if (p.isPR) bestSoFar = p.primaryValue;
  }
  return points;
}

/* ---------------------------------------------------------
   LOAD PROGRESSION FOR A GIVEN EXERCISE ("evolução de força")
--------------------------------------------------------- */
export function loadProgression(sessions, exerciseKey, weeks) {
  const since = addDays(todayStr(), -7 * weeks);
  const points = exerciseHistory(sessions, exerciseKey).filter((p) => p.date >= since);

  if (points.length === 0) {
    return { points: [], count: 0, weeksSpan: 0, loadChangePct: null, trendline: [], metricType: null };
  }

  const metricType = points[0].metricType;
  const weeksSpan = new Set(points.map((p) => mondayOf(p.date))).size;

  const [firstHalf, secondHalf] = halves(points);
  const firstHalfAvg = mean(firstHalf.map((p) => p.primaryValue));
  const secondHalfAvg = mean(secondHalf.map((p) => p.primaryValue));
  const loadChangePct = pctChange(firstHalfAvg, secondHalfAvg);

  const first = points[0].date;
  const reg = linearRegression(points.map((p) => ({ x: daysBetween(first, p.date), y: p.primaryValue })));
  const trendline = reg
    ? points.map((p) => ({ date: p.date, value: reg.intercept + reg.slope * daysBetween(first, p.date) }))
    : [];

  return { points, count: points.length, weeksSpan, firstHalfAvg, secondHalfAvg, loadChangePct, trendline, metricType };
}

/* ---------------------------------------------------------
   CONSISTENCY (heatmap + streak + weekday distribution)
--------------------------------------------------------- */
export function consistency(sessions, weeks) {
  const { weeks: weeksArr } = weeklyVolume(sessions, weeks);
  const activeWeeks = weeksArr.filter((w) => w.sessions > 0).length;
  const activeWeeksPct = (activeWeeks / weeksArr.length) * 100;
  const totalCount = sum(weeksArr.map((w) => w.sessions));
  const avgPerWeek = totalCount / weeksArr.length;

  let currentStreak = 0;
  for (let i = weeksArr.length - 1; i >= 0; i--) {
    if (weeksArr[i].sessions > 0) currentStreak++;
    else break;
  }

  const today = todayStr();
  const heatmapStart = addDays(mondayOf(today), -7 * 11);
  const heatmap = [];
  for (let i = 0; i < 12 * 7; i++) {
    const date = addDays(heatmapStart, i);
    if (date > today) break;
    const count = sessions.filter((s) => s.date === date).length;
    heatmap.push({ date, count });
  }

  const weekdayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const since = addDays(today, -7 * weeks);
  const weekdayCounts = weekdayLabels.map((label) => ({ label, count: 0 }));
  for (const s of sessions) {
    if (s.date < since) continue;
    const day = new Date(s.date + "T00:00:00").getDay();
    const idx = day === 0 ? 6 : day - 1;
    weekdayCounts[idx].count++;
  }

  return { activeWeeksPct, avgPerWeek, currentStreak, heatmap, weeksUsed: weeksArr.length, weekdayCounts };
}

/* ---------------------------------------------------------
   PERSONAL RECORDS
--------------------------------------------------------- */
/* Recorde por exercício — o que conta de "melhor" depende do metricType
   (ver bestSetOf/exerciseHistory): 1RM estimado, mais repetições, ou hold
   mais longo. bestWeight/best1RM continuam disponíveis só pra load_reps,
   pra quem já lia esses campos especificamente. */
export function personalRecords(sessions) {
  const byExercise = {};
  for (const s of sessions) {
    for (const ex of s.exercises) {
      const best = bestSetOf(ex);
      if (!best) continue;
      const key = exerciseKeyOf(ex);
      const metricType = exerciseMetricType(ex);
      const primaryValue = metricType === "time" ? best.durationSec : metricType === "reps_only" ? best.reps : epley1RM(best.weight, best.reps);

      if (!byExercise[key]) {
        byExercise[key] = { name: ex.name, muscleGroup: ex.muscleGroup, metricType, bestValue: 0, bestWeight: 0, best1RM: 0 };
      }
      const rec = byExercise[key];
      if (primaryValue > rec.bestValue) {
        rec.bestValue = Math.round(primaryValue * 10) / 10;
        rec.bestValueDate = s.date;
      }
      if (metricType === "load_reps") {
        if (best.weight > rec.bestWeight) {
          rec.bestWeight = best.weight;
          rec.bestWeightDate = s.date;
        }
        const e1rm = epley1RM(best.weight, best.reps);
        if (e1rm > rec.best1RM) {
          rec.best1RM = Math.round(e1rm * 10) / 10;
          rec.best1RMDate = s.date;
        }
      }
    }
  }

  const bestSessionVolume = sessions.reduce(
    (best, s) => {
      const v = sessionVolume(s);
      return !best || v > best.volume ? { volume: v, date: s.date } : best;
    },
    null
  );

  const { weeks } = weeklyVolume(sessions, 260); // ~5 years, effectively "all time"
  const bestWeek = weeks.reduce((best, w) => (!best || w.volume > best.volume ? w : best), null);

  return { byExercise, bestSessionVolume, bestWeek };
}

/* ---------------------------------------------------------
   LIVE PR DETECTION (durante uma sessão em andamento)
--------------------------------------------------------- */
/* Todos os sets "contados" (done, com valor válido pro metricType daquele
   exercício) de cada exercício já registrados em sessões anteriores,
   agrupados por chave — usado para destacar ao vivo quando uma série da
   sessão atual bate recorde, sem precisar rodar uma consulta separada por
   exercício a cada tecla digitada. */
export function setHistoryByExercise(sessions) {
  const map = new Map();
  for (const s of sessions) {
    for (const ex of s.exercises) {
      const metricType = exerciseMetricType(ex);
      const counted = ex.sets.filter((set) => isCountedSet(set, metricType));
      if (counted.length === 0) continue;
      const key = exerciseKeyOf(ex);
      if (!map.has(key)) map.set(key, []);
      const bucket = map.get(key);
      for (const set of counted) bucket.push({ weight: set.weight, reps: set.reps, durationSec: set.durationSec });
    }
  }
  return map;
}

/* Recorde de peso (mais pesado já levantado, em qualquer repetição) e de
   repetições (mais reps já feitas nesse peso ou mais) são independentes —
   uma série pode bater os dois, um só, ou nenhum. Pra reps_only, "recorde
   de reps" passa a ser simplesmente a maior contagem já feita (não há
   carga pra comparar "nesse peso ou mais"). Pra time, é o hold mais longo.
   Precisa de pelo menos um registro anterior: a primeira vez que um
   exercício é feito não conta como "recorde" (não há nada ainda para
   bater). */
export function detectSetPR(history, metricType, set) {
  const none = { weightPR: false, repsPR: false, timePR: false };
  if (!history || history.length === 0) return none;

  if (metricType === "time") {
    if (!(set.durationSec > 0)) return none;
    const bestDuration = history.reduce((max, h) => Math.max(max, h.durationSec || 0), 0);
    return { ...none, timePR: set.durationSec > bestDuration };
  }
  if (metricType === "reps_only") {
    if (!(set.reps > 0)) return none;
    const bestReps = history.reduce((max, h) => Math.max(max, h.reps || 0), 0);
    return { ...none, repsPR: set.reps > bestReps };
  }

  if (!(set.weight > 0) || !(set.reps > 0)) return none;
  let bestWeight = 0;
  let bestRepsAtWeight = 0;
  for (const h of history) {
    if (h.weight > bestWeight) bestWeight = h.weight;
    if (h.weight >= set.weight && h.reps > bestRepsAtWeight) bestRepsAtWeight = h.reps;
  }
  return {
    weightPR: set.weight > bestWeight,
    repsPR: set.reps > bestRepsAtWeight,
    timePR: false,
  };
}

/* ---------------------------------------------------------
   TRAINING CYCLE COMPARISON (fixed N-week blocks)
--------------------------------------------------------- */
function summarizeCycle(sessions, start, end) {
  const arr = sessions.filter((s) => inRange(s, start, end));
  const totalVolume = sum(arr.map(sessionVolume));
  const totalSets = sum(arr.map(sessionSetsCount));
  const avgLoad = totalSets > 0 ? totalVolume / totalSets : null;

  const activeWeeks = new Set(arr.map((s) => mondayOf(s.date))).size;
  const totalWeeks = Math.max(1, Math.round(daysBetween(start, end) / 7));

  return {
    totalVolume, totalSets, count: arr.length, avgLoad,
    consistencyPct: (activeWeeks / totalWeeks) * 100,
  };
}

export function compareCycles(sessions, weeksPerCycle) {
  const weekStart = mondayOf(todayStr());
  const currentStart = addDays(weekStart, -7 * (weeksPerCycle - 1));
  const currentEnd = addDays(weekStart, 7);
  const previousStart = addDays(currentStart, -7 * weeksPerCycle);
  const previousEnd = currentStart;

  const current = summarizeCycle(sessions, currentStart, currentEnd);
  const previous = summarizeCycle(sessions, previousStart, previousEnd);

  return {
    current, previous,
    deltas: {
      volumePct: pctChange(previous.totalVolume, current.totalVolume),
      setsPct: pctChange(previous.totalSets, current.totalSets),
      loadPct: pctChange(previous.avgLoad, current.avgLoad),
      countPct: pctChange(previous.count, current.count),
    },
  };
}
