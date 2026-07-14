import { DISTANCE_BUCKETS, STROKES, TYPES } from "./constants";
import { addDays, fmtDateShort, mondayOf, todayStr } from "../../lib/format";

/* ---------------------------------------------------------
   LOW-LEVEL HELPERS
--------------------------------------------------------- */
export const paceOf = (w) => w.durationSec / (w.distanceM / 100); // sec per 100m

export function inRange(w, start, end) {
  return w.date >= start && (!end || w.date < end);
}

export function distanceBucketOf(distanceM) {
  const bucket = DISTANCE_BUCKETS.find((b) => distanceM >= b.min && distanceM <= b.max);
  return bucket ? bucket.id : null;
}

export function groupByStroke(workouts) {
  const map = new Map();
  for (const w of workouts) {
    if (!map.has(w.stroke)) map.set(w.stroke, []);
    map.get(w.stroke).push(w);
  }
  return map;
}

export function groupByType(workouts) {
  const map = new Map();
  for (const w of workouts) {
    if (!map.has(w.type)) map.set(w.type, []);
    map.get(w.type).push(w);
  }
  return map;
}

/* Which stroke has the most sessions — the default lens for pace evolution,
   PR evolution and other "similar effort" analyses. */
export function dominantStroke(workouts) {
  const groups = groupByStroke(workouts);
  let best = STROKES[0].id, bestCount = -1;
  for (const s of STROKES) {
    const count = (groups.get(s.id) || []).length;
    if (count > bestCount) { best = s.id; bestCount = count; }
  }
  return best;
}

export function dominantType(workouts) {
  const groups = groupByType(workouts);
  let best = TYPES[0].id, bestCount = -1;
  for (const t of TYPES) {
    const count = (groups.get(t.id) || []).length;
    if (count > bestCount) { best = t.id; bestCount = count; }
  }
  return best;
}

/* Total metros acumulados por estilo/tipo — usado nos gráficos de distribuição. */
export function volumeByStroke(workouts) {
  return STROKES.map((s) => ({
    id: s.id,
    name: s.label,
    color: s.color,
    value: Math.round(sum(workouts.filter((w) => w.stroke === s.id).map((w) => w.distanceM))),
  })).filter((d) => d.value > 0);
}

export function volumeByType(workouts) {
  return TYPES.map((t) => ({
    id: t.id,
    name: t.label,
    color: t.color,
    value: Math.round(sum(workouts.filter((w) => w.type === t.id).map((w) => w.distanceM))),
  })).filter((d) => d.value > 0);
}

const sum = (arr) => arr.reduce((a, v) => a + v, 0);
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
   WEEKLY / MONTHLY / YEARLY VOLUME
--------------------------------------------------------- */
export function weeklyVolume(workouts, numWeeks) {
  const weekStart = mondayOf(todayStr());
  const weeksArr = [];
  for (let i = numWeeks - 1; i >= 0; i--) {
    const start = addDays(weekStart, -7 * i);
    const end = addDays(start, 7);
    const arr = workouts.filter((w) => inRange(w, start, end));
    const dist = sum(arr.map((w) => w.distanceM));
    const time = sum(arr.map((w) => w.durationSec));
    weeksArr.push({
      start,
      label: fmtDateShort(start),
      distanceM: Math.round(dist),
      pace: dist > 0 ? Math.round((time / (dist / 100)) * 100) / 100 : null,
      count: arr.length,
    });
  }
  const dists = weeksArr.map((w) => w.distanceM);
  const avgDistanceM = mean(dists);
  const sd = stdDev(dists);
  const cv = avgDistanceM > 0 ? (sd / avgDistanceM) * 100 : null;
  const weekOverWeek = weeksArr.map((w, i) => {
    if (i === 0) return null;
    const prev = weeksArr[i - 1].distanceM;
    return prev > 0 ? pctChange(prev, w.distanceM) : null;
  });
  return { weeks: weeksArr, avgDistanceM, stdDev: sd, cv, weekOverWeek };
}

export function monthlyVolume(workouts, numMonths) {
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
    const arr = workouts.filter((w) => inRange(w, start, end));
    months.push({
      start,
      label: d.toLocaleDateString("pt-BR", { month: "short" }),
      distanceM: Math.round(sum(arr.map((w) => w.distanceM))),
      count: arr.length,
    });
  }
  return months;
}

export function yearlyVolume(workouts, numYears) {
  const currentYear = parseInt(todayStr().slice(0, 4), 10);
  const years = [];
  for (let i = numYears - 1; i >= 0; i--) {
    const year = currentYear - i;
    const start = `${year}-01-01`;
    const end = `${year + 1}-01-01`;
    const arr = workouts.filter((w) => inRange(w, start, end));
    years.push({
      year,
      label: String(year),
      distanceM: Math.round(sum(arr.map((w) => w.distanceM))),
      count: arr.length,
    });
  }
  return years;
}

/* ---------------------------------------------------------
   PACE EVOLUTION FOR A GIVEN STROKE ("similar effort")
--------------------------------------------------------- */
export function paceTrendByStroke(workouts, strokeId, weeks) {
  const since = addDays(todayStr(), -7 * weeks);
  const points = workouts
    .filter((w) => w.stroke === strokeId && w.date >= since)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((w) => ({ date: w.date, pace: paceOf(w), swolf: w.avgSwolf ?? null }));

  if (points.length === 0) {
    return { points: [], count: 0, weeksSpan: 0, paceChangePct: null, trendline: [] };
  }

  const weeksSpan = new Set(points.map((p) => mondayOf(p.date))).size;

  const [firstHalf, secondHalf] = halves(points);
  const firstHalfAvgPace = mean(firstHalf.map((p) => p.pace));
  const secondHalfAvgPace = mean(secondHalf.map((p) => p.pace));
  const paceChangePct = pctChange(firstHalfAvgPace, secondHalfAvgPace);

  const first = points[0].date;
  const reg = linearRegression(points.map((p) => ({ x: daysBetween(first, p.date), y: p.pace })));
  const trendline = reg
    ? points.map((p) => ({ date: p.date, value: reg.intercept + reg.slope * daysBetween(first, p.date) }))
    : [];

  return {
    points, count: points.length, weeksSpan,
    firstHalfAvgPace, secondHalfAvgPace, paceChangePct,
    trendline,
  };
}

/* ---------------------------------------------------------
   SWOLF EVOLUTION
--------------------------------------------------------- */
export function swolfTrend(workouts, weeks) {
  const since = addDays(todayStr(), -7 * weeks);
  const points = workouts
    .filter((w) => w.avgSwolf != null && w.date >= since)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((w) => ({ date: w.date, swolf: w.avgSwolf }));

  if (points.length === 0) {
    return { points: [], count: 0, swolfChangePct: null };
  }

  const [firstHalf, secondHalf] = halves(points);
  const swolfChangePct = pctChange(mean(firstHalf.map((p) => p.swolf)), mean(secondHalf.map((p) => p.swolf)));

  return { points, count: points.length, swolfChangePct };
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
   PERSONAL RECORDS (scoped by stroke + distance milestone)
--------------------------------------------------------- */
export function personalRecords(workouts) {
  const byStroke = {};
  for (const s of STROKES) byStroke[s.id] = {};

  for (const w of workouts) {
    const bucket = distanceBucketOf(w.distanceM);
    if (!bucket) continue;
    const pace = paceOf(w);
    const current = byStroke[w.stroke]?.[bucket];
    if (!current || pace < current.paceSec) {
      byStroke[w.stroke][bucket] = { paceSec: pace, date: w.date, distanceM: w.distanceM, durationSec: w.durationSec, workoutId: w.id };
    }
  }

  const longestSwim = workouts.reduce(
    (best, w) => (!best || w.distanceM > best.distanceM ? { distanceM: w.distanceM, date: w.date } : best),
    null
  );

  const { weeks } = weeklyVolume(workouts, 260); // ~5 years of history, effectively "all time"
  const bestWeek = weeks.reduce((best, w) => (!best || w.distanceM > best.distanceM ? w : best), null);

  return { byStroke, longestSwim, bestWeek };
}

/* ---------------------------------------------------------
   DISTANCE-MILESTONE EVOLUTION (per stroke)
--------------------------------------------------------- */
export function distanceMilestoneSeries(workouts, strokeId, bucketId) {
  const points = workouts
    .filter((w) => w.stroke === strokeId && distanceBucketOf(w.distanceM) === bucketId)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((w) => ({ date: w.date, pace: paceOf(w), durationSec: w.durationSec, distanceM: w.distanceM }));

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
  const totalM = sum(arr.map((w) => w.distanceM));
  const totalTime = sum(arr.map((w) => w.durationSec));
  const avgPace = totalM > 0 ? totalTime / (totalM / 100) : null;
  const swolfValues = arr.filter((w) => w.avgSwolf != null).map((w) => w.avgSwolf);
  const avgSwolf = swolfValues.length ? mean(swolfValues) : null;

  const byStroke = groupByStroke(arr);
  let dominant = null, dominantCount = 0;
  for (const [stroke, list] of byStroke) {
    if (list.length > dominantCount) { dominant = stroke; dominantCount = list.length; }
  }

  const activeWeeks = new Set(arr.map((w) => mondayOf(w.date))).size;
  const totalWeeks = Math.max(1, Math.round(daysBetween(start, end) / 7));

  return {
    totalM, count: arr.length, avgPace, avgSwolf,
    dominantStroke: dominant,
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
      distancePct: pctChange(previous.totalM, current.totalM),
      pacePct: pctChange(previous.avgPace, current.avgPace),
      swolfPct: pctChange(previous.avgSwolf, current.avgSwolf),
      countPct: pctChange(previous.count, current.count),
    },
  };
}

/* ---------------------------------------------------------
   EDUCATIONAL-DRILL GAP (weeks since the last "educativo" session)
--------------------------------------------------------- */
export function weeksSinceLastType(workouts, typeId) {
  const list = workouts.filter((w) => w.type === typeId).sort((a, b) => (a.date < b.date ? 1 : -1));
  if (list.length === 0) return null;
  return Math.floor(daysBetween(list[0].date, todayStr()) / 7);
}
