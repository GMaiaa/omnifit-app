import { DISTANCE_BUCKETS, TYPES } from "./constants";
import { addDays, fmtDateShort, mondayOf, todayStr } from "../../lib/format";

/* ---------------------------------------------------------
   LOW-LEVEL HELPERS
--------------------------------------------------------- */
export const paceOf = (w) => w.durationSec / w.distanceKm;

export function inRange(w, start, end) {
  return w.date >= start && (!end || w.date < end);
}

export function distanceBucketOf(distanceKm) {
  const bucket = DISTANCE_BUCKETS.find((b) => distanceKm >= b.min && distanceKm <= b.max);
  return bucket ? bucket.id : null;
}

export function groupByType(workouts) {
  const map = new Map();
  for (const w of workouts) {
    if (!map.has(w.type)) map.set(w.type, []);
    map.get(w.type).push(w);
  }
  return map;
}

/* Which training type has the most sessions — the default lens for any
   "similar effort" analysis (pace trend, PR evolution, etc). */
export function dominantType(workouts) {
  const groups = groupByType(workouts);
  let best = TYPES[0].id, bestCount = -1;
  for (const t of TYPES) {
    const count = (groups.get(t.id) || []).length;
    if (count > bestCount) { best = t.id; bestCount = count; }
  }
  return best;
}

/* Total km accumulated per training type — the same breakdown used by the
   Dashboard's distribution pie and by the Home's "effort type" card. */
export function volumeByType(workouts) {
  return TYPES.map((t) => ({
    id: t.id,
    name: t.label,
    color: t.color,
    value: Math.round(sum(workouts.filter((w) => w.type === t.id).map((w) => w.distanceKm)) * 10) / 10,
  })).filter((d) => d.value > 0);
}

const sum = (arr) => arr.reduce((a, v) => a + v, 0);
const mean = (arr) => (arr.length ? sum(arr) / arr.length : null);
function stdDev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(sum(arr.map((v) => (v - m) ** 2)) / arr.length);
}
function pearson(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  const mx = mean(xs), my = mean(ys);
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
  }
  if (dx2 === 0 || dy2 === 0) return null;
  return num / Math.sqrt(dx2 * dy2);
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
export function weeklyVolume(workouts, numWeeks) {
  const weekStart = mondayOf(todayStr());
  const weeksArr = [];
  for (let i = numWeeks - 1; i >= 0; i--) {
    const start = addDays(weekStart, -7 * i);
    const end = addDays(start, 7);
    const arr = workouts.filter((w) => inRange(w, start, end));
    const dist = sum(arr.map((w) => w.distanceKm));
    const time = sum(arr.map((w) => w.durationSec));
    weeksArr.push({
      start,
      label: fmtDateShort(start),
      km: Math.round(dist * 10) / 10,
      pace: dist > 0 ? Math.round((time / dist / 60) * 100) / 100 : null,
      count: arr.length,
    });
  }
  const kms = weeksArr.map((w) => w.km);
  const avgKm = mean(kms);
  const sd = stdDev(kms);
  const cv = avgKm > 0 ? (sd / avgKm) * 100 : null;
  const weekOverWeek = weeksArr.map((w, i) => {
    if (i === 0) return null;
    const prev = weeksArr[i - 1].km;
    return prev > 0 ? pctChange(prev, w.km) : null;
  });
  return { weeks: weeksArr, avgKm, stdDev: sd, cv, weekOverWeek };
}

/* ---------------------------------------------------------
   PACE EVOLUTION FOR A GIVEN TYPE ("similar effort")
--------------------------------------------------------- */
export function paceTrendByType(workouts, typeId, weeks) {
  const since = addDays(todayStr(), -7 * weeks);
  const points = workouts
    .filter((w) => w.type === typeId && w.date >= since)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((w) => ({ date: w.date, pace: paceOf(w), hr: w.avgHr ?? null }));

  if (points.length === 0) {
    return { points: [], count: 0, weeksSpan: 0, paceChangePct: null, hrChangePct: null, trendline: [] };
  }

  const weeksSpan = new Set(points.map((p) => mondayOf(p.date))).size;

  const [firstHalf, secondHalf] = halves(points);
  const firstHalfAvgPace = mean(firstHalf.map((p) => p.pace));
  const secondHalfAvgPace = mean(secondHalf.map((p) => p.pace));
  const paceChangePct = pctChange(firstHalfAvgPace, secondHalfAvgPace);

  const withHr = points.filter((p) => p.hr != null);
  const [firstHrHalf, secondHrHalf] = halves(withHr);
  const firstHalfAvgHr = withHr.length ? mean(firstHrHalf.map((p) => p.hr)) : null;
  const secondHalfAvgHr = withHr.length ? mean(secondHrHalf.map((p) => p.hr)) : null;
  const hrChangePct = withHr.length >= 2 ? pctChange(firstHalfAvgHr, secondHalfAvgHr) : null;

  const first = points[0].date;
  const reg = linearRegression(points.map((p) => ({ x: daysBetween(first, p.date), y: p.pace })));
  const trendline = reg
    ? points.map((p) => ({ date: p.date, value: reg.intercept + reg.slope * daysBetween(first, p.date) }))
    : [];

  return {
    points, count: points.length, weeksSpan,
    firstHalfAvgPace, secondHalfAvgPace, paceChangePct,
    firstHalfAvgHr, secondHalfAvgHr, hrChangePct,
    trendline,
  };
}

/* ---------------------------------------------------------
   PACE x HEART RATE RELATIONSHIP
--------------------------------------------------------- */
export function paceHrRelation(workouts, typeId) {
  const points = workouts
    .filter((w) => w.type === typeId && w.avgHr)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((w) => ({
      date: w.date,
      pace: paceOf(w),
      hr: w.avgHr,
      efficiency: (w.distanceKm * 1000) / (w.durationSec / 60) / w.avgHr,
    }));

  if (points.length === 0) {
    return { points: [], correlation: null, efficiencyChangePct: null };
  }

  const correlation = pearson(points.map((p) => p.pace), points.map((p) => p.hr));
  const [firstHalf, secondHalf] = halves(points);
  const efficiencyChangePct = pctChange(
    mean(firstHalf.map((p) => p.efficiency)),
    mean(secondHalf.map((p) => p.efficiency))
  );

  return { points, correlation, efficiencyChangePct };
}

/* ---------------------------------------------------------
   CONSISTENCY
--------------------------------------------------------- */
export function consistency(workouts, weeks) {
  const { weeks: weeksArr } = weeklyVolume(workouts, weeks);
  const activeWeeks = weeksArr.filter((w) => w.count > 0).length;
  const activeWeeksPct = (activeWeeks / weeksArr.length) * 100;
  const totalCount = sum(weeksArr.map((w) => w.count));
  const avgPerWeek = totalCount / weeksArr.length;

  let currentStreak = 0;
  for (let i = weeksArr.length - 1; i >= 0; i--) {
    if (weeksArr[i].count > 0) currentStreak++;
    else break;
  }

  const today = todayStr();
  const heatmapStart = addDays(mondayOf(today), -7 * 11);
  const heatmap = [];
  for (let i = 0; i < 12 * 7; i++) {
    const date = addDays(heatmapStart, i);
    if (date > today) break;
    const count = workouts.filter((w) => w.date === date).length;
    heatmap.push({ date, count });
  }

  return { activeWeeksPct, avgPerWeek, currentStreak, heatmap, weeksUsed: weeksArr.length };
}

/* ---------------------------------------------------------
   PERSONAL RECORDS (always scoped by workout type)
--------------------------------------------------------- */
export function personalRecords(workouts) {
  const byType = {};
  for (const t of TYPES) byType[t.id] = {};

  for (const w of workouts) {
    const bucket = distanceBucketOf(w.distanceKm);
    if (!bucket) continue;
    const pace = paceOf(w);
    const current = byType[w.type][bucket];
    if (!current || pace < current.paceSec) {
      byType[w.type][bucket] = { paceSec: pace, date: w.date, distanceKm: w.distanceKm, durationSec: w.durationSec, workoutId: w.id };
    }
  }

  const longestRun = workouts.reduce(
    (best, w) => (!best || w.distanceKm > best.distanceKm ? { distanceKm: w.distanceKm, date: w.date } : best),
    null
  );

  const { weeks } = weeklyVolume(workouts, 260); // ~5 years of history, effectively "all time"
  const bestWeek = weeks.reduce((best, w) => (!best || w.km > best.km ? w : best), null);

  return { byType, longestRun, bestWeek };
}

/* ---------------------------------------------------------
   DISTANCE-MILESTONE EVOLUTION (5K / 10K / 21K, per type)
--------------------------------------------------------- */
export function distanceMilestoneSeries(workouts, typeId, bucketId) {
  const points = workouts
    .filter((w) => w.type === typeId && distanceBucketOf(w.distanceKm) === bucketId)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((w) => ({ date: w.date, pace: paceOf(w), durationSec: w.durationSec, distanceKm: w.distanceKm }));

  let best = Infinity;
  for (const p of points) {
    p.isPR = p.pace < best;
    if (p.isPR) best = p.pace;
  }
  return points;
}

/* ---------------------------------------------------------
   TRAINING CYCLE COMPARISON (fixed N-week blocks)
--------------------------------------------------------- */
function summarizeCycle(workouts, start, end) {
  const arr = workouts.filter((w) => inRange(w, start, end));
  const totalKm = sum(arr.map((w) => w.distanceKm));
  const totalTime = sum(arr.map((w) => w.durationSec));
  const avgPace = totalKm > 0 ? totalTime / totalKm : null;
  const hrValues = arr.filter((w) => w.avgHr).map((w) => w.avgHr);
  const avgHr = hrValues.length ? mean(hrValues) : null;

  const byType = groupByType(arr);
  let dominant = null, dominantCount = 0;
  for (const [type, list] of byType) {
    if (list.length > dominantCount) { dominant = type; dominantCount = list.length; }
  }
  const dominantAvgPace = dominant
    ? sum(byType.get(dominant).map((w) => w.durationSec)) / sum(byType.get(dominant).map((w) => w.distanceKm))
    : null;

  const activeWeeks = new Set(arr.map((w) => mondayOf(w.date))).size;
  const totalWeeks = Math.max(1, Math.round(daysBetween(start, end) / 7));

  return {
    totalKm, count: arr.length, avgPace, avgHr,
    dominantType: dominant, dominantAvgPace,
    consistencyPct: (activeWeeks / totalWeeks) * 100,
  };
}

export function compareCycles(workouts, weeksPerCycle) {
  const weekStart = mondayOf(todayStr());
  const currentStart = addDays(weekStart, -7 * (weeksPerCycle - 1));
  const currentEnd = addDays(weekStart, 7);
  const previousStart = addDays(currentStart, -7 * weeksPerCycle);
  const previousEnd = currentStart;

  const current = summarizeCycle(workouts, currentStart, currentEnd);
  const previous = summarizeCycle(workouts, previousStart, previousEnd);

  return {
    current, previous,
    deltas: {
      kmPct: pctChange(previous.totalKm, current.totalKm),
      pacePct: pctChange(previous.avgPace, current.avgPace),
      hrPct: pctChange(previous.avgHr, current.avgHr),
      countPct: pctChange(previous.count, current.count),
    },
  };
}
