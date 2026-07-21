import { FOCUS, HIGHER_IS_BETTER, isRaceFocus } from "./constants";
import { addDays, fmtDateShort, mondayOf, todayStr } from "../../lib/format";

/* All functions here assume finished Sessions: HyroxRunner normalizes every
   round's status to either "done" (has some meaningful value) or "skipped"
   before persisting, so analytics only ever needs to filter on "done". */

/* ---------------------------------------------------------
   LOW-LEVEL HELPERS
--------------------------------------------------------- */
export const hyroxExerciseKeyOf = (block) => block.sourceExerciseId || block.name;

function isCountedSet(set) {
  return set.status === "done" && (set.reps > 0 || set.weight > 0 || set.distanceM > 0 || set.durationSec > 0);
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

export function inRange(s, start, end) {
  return s.date >= start && (!end || s.date < end);
}

/* ---------------------------------------------------------
   PER-BLOCK / PER-SESSION AGGREGATES
--------------------------------------------------------- */
export function blockCountedSets(block) {
  return block.sets.filter(isCountedSet);
}

export function blockFunctionalReps(block) {
  if (block.metricType !== "reps") return 0;
  return sum(blockCountedSets(block).map((s) => s.reps || 0));
}
export function blockLoadVolume(block) {
  if (block.metricType !== "load") return 0;
  return sum(blockCountedSets(block).map((s) => (s.weight || 0) * (s.reps || 1)));
}
export function blockDistance(block) {
  if (block.metricType !== "distance") return 0;
  return sum(blockCountedSets(block).map((s) => s.distanceM || 0));
}
/* Prefer the block's own live-tracked duration (Iniciar/Finalizar bloco);
   fall back to the sum of manually entered round durations when the timer
   wasn't used (e.g. logging a class after the fact). */
export function blockDurationSec(block) {
  return block.durationSec || sum(blockCountedSets(block).map((s) => s.durationSec || 0));
}

export function sessionFunctionalReps(session) {
  return sum(session.blocks.map(blockFunctionalReps));
}
export function sessionLoadVolume(session) {
  return sum(session.blocks.map(blockLoadVolume));
}
export function sessionDistance(session) {
  return sum(session.blocks.map(blockDistance));
}
export function sessionSetsCount(session) {
  return sum(session.blocks.map((b) => blockCountedSets(b).length));
}

/* ---------------------------------------------------------
   WEEKLY / MONTHLY VOLUME
--------------------------------------------------------- */
export function weeklyVolume(sessions, numWeeks) {
  const weekStart = mondayOf(todayStr());
  const weeksArr = [];
  for (let i = numWeeks - 1; i >= 0; i--) {
    const start = addDays(weekStart, -7 * i);
    const end = addDays(start, 7);
    const arr = sessions.filter((s) => inRange(s, start, end));
    weeksArr.push({
      start,
      label: fmtDateShort(start),
      durationSec: sum(arr.map((s) => s.durationSec)),
      sessions: arr.length,
      functionalReps: sum(arr.map(sessionFunctionalReps)),
      loadVolume: Math.round(sum(arr.map(sessionLoadVolume))),
      distanceM: Math.round(sum(arr.map(sessionDistance))),
    });
  }
  const durations = weeksArr.map((w) => w.durationSec);
  const avgDurationSec = mean(durations);
  const sd = stdDev(durations);
  const cv = avgDurationSec > 0 ? (sd / avgDurationSec) * 100 : null;
  const weekOverWeek = weeksArr.map((w, i) => {
    if (i === 0) return null;
    const prev = weeksArr[i - 1].durationSec;
    return prev > 0 ? pctChange(prev, w.durationSec) : null;
  });
  return { weeks: weeksArr, avgDurationSec, stdDev: sd, cv, weekOverWeek };
}

export function monthlyVolume(sessions, numMonths) {
  const today = todayStr();
  const months = [];
  for (let i = numMonths - 1; i >= 0; i--) {
    const d = new Date(today + "T00:00:00");
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const start = d.toISOString().slice(0, 10);
    const endD = new Date(d);
    endD.setMonth(endD.getMonth() + 1);
    const end = endD.toISOString().slice(0, 10);
    const arr = sessions.filter((s) => inRange(s, start, end));
    months.push({
      start,
      label: d.toLocaleDateString("pt-BR", { month: "short" }),
      durationSec: sum(arr.map((s) => s.durationSec)),
      sessions: arr.length,
    });
  }
  return months;
}

/* ---------------------------------------------------------
   DISTRIBUTION BY FOCUS ("objetivo")
--------------------------------------------------------- */
export function focusDistribution(sessions) {
  return FOCUS.map((f) => ({
    id: f.id,
    name: f.label,
    color: f.color,
    value: Math.round(sum(sessions.filter((s) => s.focus === f.id).map((s) => s.durationSec))),
  })).filter((d) => d.value > 0);
}

/* ---------------------------------------------------------
   PER-EXERCISE HISTORY / EVOLUTION (metricType-aware)
--------------------------------------------------------- */
export function exerciseOptions(sessions) {
  const seen = new Map();
  for (const s of sessions) {
    for (const b of s.blocks) {
      if (blockCountedSets(b).length === 0) continue;
      const key = hyroxExerciseKeyOf(b);
      if (!seen.has(key)) seen.set(key, { key, name: b.name, category: b.category, metricType: b.metricType, count: 0 });
      seen.get(key).count++;
    }
  }
  return [...seen.values()].sort((a, b) => b.count - a.count);
}

export function mostFrequentExerciseKey(sessions) {
  const opts = exerciseOptions(sessions);
  return opts.length ? opts[0].key : null;
}

/* One data point per session: the "headline" number depends on the
   exercise's metric type (max reps, best weight, best hold time, or pace
   for distance-based stations). */
export function exerciseHistory(sessions, exerciseKey) {
  const points = sessions
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .flatMap((s) => {
      const matching = s.blocks.filter((b) => hyroxExerciseKeyOf(b) === exerciseKey);
      const counted = matching.flatMap(blockCountedSets);
      if (counted.length === 0) return [];
      const metricType = matching[0].metricType;

      let primaryValue = null, totalReps = null, bestWeight = null, bestDurationSec = null, totalDistanceM = null, paceSecPerKm = null;
      if (metricType === "reps") {
        totalReps = sum(counted.map((c) => c.reps || 0));
        primaryValue = Math.max(...counted.map((c) => c.reps || 0));
      } else if (metricType === "load") {
        bestWeight = Math.max(...counted.map((c) => c.weight || 0));
        primaryValue = bestWeight;
      } else if (metricType === "time") {
        bestDurationSec = Math.max(...counted.map((c) => c.durationSec || 0));
        primaryValue = bestDurationSec;
      } else {
        totalDistanceM = sum(counted.map((c) => c.distanceM || 0));
        const totalTimeSec = sum(matching.map(blockDurationSec));
        paceSecPerKm = totalDistanceM > 0 && totalTimeSec > 0 ? totalTimeSec / (totalDistanceM / 1000) : null;
        primaryValue = paceSecPerKm;
      }

      if (primaryValue === null || !isFinite(primaryValue)) return [];
      return [{ date: s.date, metricType, primaryValue, totalReps, bestWeight, bestDurationSec, totalDistanceM, paceSecPerKm }];
    });

  if (points.length === 0) return points;
  const higherIsBetter = HIGHER_IS_BETTER[points[0].metricType];
  let bestSoFar = higherIsBetter ? -Infinity : Infinity;
  for (const p of points) {
    p.isPR = higherIsBetter ? p.primaryValue > bestSoFar : p.primaryValue < bestSoFar;
    if (p.isPR) bestSoFar = p.primaryValue;
  }
  return points;
}

/* ---------------------------------------------------------
   PROGRESSION FOR A GIVEN EXERCISE ("evolução de performance")
--------------------------------------------------------- */
export function exerciseProgression(sessions, exerciseKey, weeks) {
  const since = addDays(todayStr(), -7 * weeks);
  const points = exerciseHistory(sessions, exerciseKey).filter((p) => p.date >= since);

  if (points.length === 0) {
    return { points: [], count: 0, weeksSpan: 0, changePct: null, improved: null, trendline: [], metricType: null };
  }

  const metricType = points[0].metricType;
  const higherIsBetter = HIGHER_IS_BETTER[metricType];
  const weeksSpan = new Set(points.map((p) => mondayOf(p.date))).size;

  const [firstHalf, secondHalf] = halves(points);
  const firstHalfAvg = mean(firstHalf.map((p) => p.primaryValue));
  const secondHalfAvg = mean(secondHalf.map((p) => p.primaryValue));
  const changePct = pctChange(firstHalfAvg, secondHalfAvg);
  const improved = changePct === null ? null : (higherIsBetter ? changePct > 0 : changePct < 0);

  const first = points[0].date;
  const reg = linearRegression(points.map((p) => ({ x: daysBetween(first, p.date), y: p.primaryValue })));
  const trendline = reg
    ? points.map((p) => ({ date: p.date, value: reg.intercept + reg.slope * daysBetween(first, p.date) }))
    : [];

  return { points, count: points.length, weeksSpan, firstHalfAvg, secondHalfAvg, changePct, improved, trendline, metricType };
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

  return { activeWeeksPct, avgPerWeek, currentStreak, heatmap, weeksUsed: weeksArr.length };
}

/* ---------------------------------------------------------
   PERSONAL RECORDS
--------------------------------------------------------- */
export function personalRecords(sessions) {
  const byExercise = {};
  for (const opt of exerciseOptions(sessions)) {
    const history = exerciseHistory(sessions, opt.key);
    if (history.length === 0) continue;
    const higherIsBetter = HIGHER_IS_BETTER[opt.metricType];
    const best = history.reduce((b, p) => {
      if (!b) return p;
      return (higherIsBetter ? p.primaryValue > b.primaryValue : p.primaryValue < b.primaryValue) ? p : b;
    }, null);
    byExercise[opt.key] = { name: opt.name, category: opt.category, metricType: opt.metricType, bestValue: best.primaryValue, bestDate: best.date };
  }

  const { weeks } = weeklyVolume(sessions, 260); // ~5 years, effectively "all time"
  const bestWeek = weeks.reduce((best, w) => (!best || w.durationSec > best.durationSec ? w : best), null);

  return { byExercise, bestWeek };
}

/* ---------------------------------------------------------
   TRAINING CYCLE COMPARISON (fixed N-week blocks)
--------------------------------------------------------- */
function summarizeCycle(sessions, start, end) {
  const arr = sessions.filter((s) => inRange(s, start, end));
  const totalDurationSec = sum(arr.map((s) => s.durationSec));
  const functionalReps = sum(arr.map(sessionFunctionalReps));
  const loadVolume = sum(arr.map(sessionLoadVolume));
  const distanceM = sum(arr.map(sessionDistance));

  const activeWeeks = new Set(arr.map((s) => mondayOf(s.date))).size;
  const totalWeeks = Math.max(1, Math.round(daysBetween(start, end) / 7));

  return {
    totalDurationSec, count: arr.length, functionalReps, loadVolume, distanceM,
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
      durationPct: pctChange(previous.totalDurationSec, current.totalDurationSec),
      functionalRepsPct: pctChange(previous.functionalReps, current.functionalReps),
      loadPct: pctChange(previous.loadVolume, current.loadVolume),
      distancePct: pctChange(previous.distanceM, current.distanceM),
      countPct: pctChange(previous.count, current.count),
    },
  };
}

/* ---------------------------------------------------------
   TRANSITIONS BETWEEN STATIONS
--------------------------------------------------------- */
export function averageTransitionShare(sessions, weeks) {
  const since = addDays(todayStr(), -7 * weeks);
  const scoped = sessions.filter((s) => s.date >= since && s.blocks.length >= 2);
  if (scoped.length === 0) return null;
  const totalTransition = sum(scoped.map((s) => sum(s.blocks.map((b) => b.transitionSec || 0))));
  const totalDuration = sum(scoped.map((s) => s.durationSec));
  if (totalDuration === 0) return null;
  return (totalTransition / totalDuration) * 100;
}

/* ---------------------------------------------------------
   RUN-PACE CONSISTENCY ACROSS BLOCKS (most recent multi-run session)
--------------------------------------------------------- */
export function runPaceConsistencyInMostRecentSession(sessions) {
  const candidates = sessions.filter(
    (s) => s.blocks.filter((b) => b.category === "corrida" && blockDistance(b) > 0).length >= 2
  );
  if (candidates.length === 0) return null;
  const latest = candidates.slice().sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  const runBlocks = latest.blocks.filter((b) => b.category === "corrida" && blockDistance(b) > 0);
  const paces = runBlocks
    .map((b) => {
      const dist = blockDistance(b);
      const dur = blockDurationSec(b);
      return dist > 0 && dur > 0 ? dur / (dist / 1000) : null;
    })
    .filter((p) => p !== null);
  if (paces.length < 2) return null;
  const avg = mean(paces);
  const sd = stdDev(paces);
  const cv = avg > 0 ? (sd / avg) * 100 : null;
  return { date: latest.date, cv, count: paces.length };
}

/* ---------------------------------------------------------
   STRONGEST / WEAKEST EXERCISE (biggest recent improvement vs. decline)
--------------------------------------------------------- */
export function strongestAndWeakestExercise(sessions, weeks) {
  const opts = exerciseOptions(sessions).filter((o) => o.count >= 4);
  let strongest = null, weakest = null;
  for (const opt of opts) {
    const trend = exerciseProgression(sessions, opt.key, weeks);
    if (trend.count < 4 || trend.changePct === null) continue;
    const magnitude = Math.abs(trend.changePct);
    if (trend.improved) {
      if (!strongest || magnitude > strongest.magnitude) strongest = { ...opt, magnitude, changePct: trend.changePct };
    } else {
      if (!weakest || magnitude > weakest.magnitude) weakest = { ...opt, magnitude, changePct: trend.changePct };
    }
  }
  return { strongest, weakest };
}

/* ---------------------------------------------------------
   RACE / SIMULATION ANALYTICS
--------------------------------------------------------- */
export function raceSessions(sessions) {
  return sessions.filter((s) => isRaceFocus(s.focus)).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
}

function summarizeRace(session) {
  const runBlocks = session.blocks.filter((b) => b.category === "corrida");
  const runDurationSec = sum(runBlocks.map(blockDurationSec));
  const runDistanceM = sum(runBlocks.map(blockDistance));
  const transitionSec = sum(session.blocks.map((b) => b.transitionSec || 0));
  const stations = session.blocks
    .filter((b) => b.category !== "corrida")
    .map((b) => ({ name: b.name, durationSec: blockDurationSec(b) }));
  const pace = runDistanceM > 0 && runDurationSec > 0 ? runDurationSec / (runDistanceM / 1000) : null;

  return {
    id: session.id, date: session.date, templateName: session.templateName,
    totalDurationSec: session.durationSec,
    runDurationSec, runDistanceM, pace, transitionSec, stations,
  };
}

export function raceAnalytics(sessions) {
  const races = raceSessions(sessions).map(summarizeRace);
  const ranking = races.slice().sort((a, b) => a.totalDurationSec - b.totalDurationSec);

  let trendline = [];
  if (races.length >= 2) {
    const first = races[0].date;
    const reg = linearRegression(races.map((r) => ({ x: daysBetween(first, r.date), y: r.totalDurationSec })));
    trendline = reg
      ? races.map((r) => ({ date: r.date, value: reg.intercept + reg.slope * daysBetween(first, r.date) }))
      : [];
  }

  const last = races[races.length - 1] || null;
  const prev = races[races.length - 2] || null;
  const deltaVsPrevious = last && prev ? pctChange(prev.totalDurationSec, last.totalDurationSec) : null;

  return { races, ranking, trendline, deltaVsPrevious };
}
