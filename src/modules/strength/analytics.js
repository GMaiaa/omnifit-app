import { MUSCLE_GROUPS } from "./constants";
import { addDays, mondayOf, todayStr } from "../../lib/format";

/* All functions here assume finished Sessions: SessionRunner normalizes
   every set's status to either "done" (has valid weight+reps) or "skipped"
   before persisting, so analytics only ever needs to filter on "done". */

/* ---------------------------------------------------------
   LOW-LEVEL HELPERS
--------------------------------------------------------- */
export const exerciseKeyOf = (ex) => ex.sourceExerciseId || ex.name;

function isCountedSet(set) {
  return set.status === "done" && set.weight > 0 && set.reps > 0;
}

export const setVolume = (set) => set.weight * set.reps;

export function exerciseVolume(ex) {
  return sum(ex.sets.filter(isCountedSet).map(setVolume));
}

export function exerciseSetsCount(ex) {
  return ex.sets.filter(isCountedSet).length;
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

/* Best set of an exercise instance, ranked by estimated 1RM (accounts for
   both weight and reps) — used as the "força" signal everywhere. */
export function bestSetOf(ex) {
  const counted = ex.sets.filter(isCountedSet);
  if (counted.length === 0) return null;
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

export function exerciseHistory(sessions, exerciseKey) {
  const points = sessions
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .flatMap((s) =>
      s.exercises
        .filter((ex) => exerciseKeyOf(ex) === exerciseKey && exerciseSetsCount(ex) > 0)
        .map((ex) => {
          const best = bestSetOf(ex);
          return {
            date: s.date,
            bestWeight: best.weight,
            bestReps: best.reps,
            e1rm: Math.round(epley1RM(best.weight, best.reps) * 10) / 10,
            volume: Math.round(exerciseVolume(ex)),
          };
        })
    );

  let bestSoFar = -Infinity;
  for (const p of points) {
    p.isPR = p.e1rm > bestSoFar;
    if (p.isPR) bestSoFar = p.e1rm;
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
    return { points: [], count: 0, weeksSpan: 0, loadChangePct: null, trendline: [] };
  }

  const weeksSpan = new Set(points.map((p) => mondayOf(p.date))).size;

  const [firstHalf, secondHalf] = halves(points);
  const firstHalfAvg = mean(firstHalf.map((p) => p.e1rm));
  const secondHalfAvg = mean(secondHalf.map((p) => p.e1rm));
  const loadChangePct = pctChange(firstHalfAvg, secondHalfAvg);

  const first = points[0].date;
  const reg = linearRegression(points.map((p) => ({ x: daysBetween(first, p.date), y: p.e1rm })));
  const trendline = reg
    ? points.map((p) => ({ date: p.date, value: reg.intercept + reg.slope * daysBetween(first, p.date) }))
    : [];

  return { points, count: points.length, weeksSpan, firstHalfAvg, secondHalfAvg, loadChangePct, trendline };
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
export function personalRecords(sessions) {
  const byExercise = {};
  for (const s of sessions) {
    for (const ex of s.exercises) {
      const best = bestSetOf(ex);
      if (!best) continue;
      const key = exerciseKeyOf(ex);
      const e1rm = epley1RM(best.weight, best.reps);
      if (!byExercise[key]) {
        byExercise[key] = { name: ex.name, muscleGroup: ex.muscleGroup, bestWeight: 0, best1RM: 0 };
      }
      const rec = byExercise[key];
      if (best.weight > rec.bestWeight) {
        rec.bestWeight = best.weight;
        rec.bestWeightDate = s.date;
      }
      if (e1rm > rec.best1RM) {
        rec.best1RM = Math.round(e1rm * 10) / 10;
        rec.best1RMDate = s.date;
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
