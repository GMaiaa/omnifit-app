/* ---------------------------------------------------------
   VO2 MÁX — estimativa a partir dos treinos de corrida já salvos

   Não há sensor de VO2 máx real no app (isso exigiria um teste
   ergoespirométrico em laboratório ou um relógio com esse recurso). O que
   este módulo faz é uma ESTIMATIVA matemática a partir de pace/duração de
   esforços "de referência" (longão, tempo run, prova) — usando a fórmula
   de Daniels & Gilbert (1979), a mesma base usada por calculadoras de VDOT
   amplamente conhecidas no meio de corrida. É uma aproximação, não uma
   medição clínica — o app deixa isso explícito na interface.
--------------------------------------------------------- */

// Antes, só entravam aqui longão/tempo run/prova (esforço "de referência").
// Isso deixava a aba vazia pra quem importa o histórico do Strava, porque
// a maioria dos treinos sincronizados cai como "rodagem" (tipo padrão
// quando o Strava não informa workout_type). Agora todos os tipos contam;
// os filtros de duração/distância abaixo continuam existindo só pra evitar
// contas sem sentido (ex: um sprint de 200m não entra na fórmula).
// Ressalva: treinos fáceis/regenerativos tendem a subestimar o VO2 máx
// real, já que a fórmula assume esforço perto do máximo sustentável —
// mas como "atual" usa o melhor valor da janela recente (ver
// currentVo2Max), um treino forte isolado ainda corrige isso na prática.
const MIN_DURATION_MIN = 8;
const MAX_DURATION_MIN = 150;
const MIN_DISTANCE_KM = 1.5;

function velocityMetersPerMin(distanceKm, durationSec) {
  return (distanceKm * 1000) / (durationSec / 60);
}

/* Fórmula de Daniels & Gilbert: estima o VO2 exigido por uma velocidade
   (ml/kg/min), depois ajusta pelo %VO2max sustentável naquela duração —
   quanto mais longo o esforço, menor a fração do VO2max que dá pra manter. */
export function estimateVO2Max(distanceKm, durationSec) {
  const durationMin = durationSec / 60;
  if (durationMin < MIN_DURATION_MIN || durationMin > MAX_DURATION_MIN) return null;
  if (distanceKm < MIN_DISTANCE_KM) return null;

  const v = velocityMetersPerMin(distanceKm, durationSec);
  const vo2 = -4.6 + 0.182258 * v + 0.000104 * v * v;
  const pctMax =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * durationMin) +
    0.2989558 * Math.exp(-0.1932605 * durationMin);

  const vo2max = vo2 / pctMax;
  return Number.isFinite(vo2max) && vo2max > 0 ? Math.round(vo2max * 10) / 10 : null;
}

/* Devolve o histórico de estimativas (uma por treino elegível), ordenado
   por data crescente — pronto pro gráfico de evolução. */
export function buildVo2History(workouts) {
  return workouts
    .filter((w) => w.distanceKm > 0 && w.durationSec > 0)
    .map((w) => ({ date: w.date, vo2max: estimateVO2Max(w.distanceKm, w.durationSec), type: w.type }))
    .filter((p) => p.vo2max !== null)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/* "Atual" = maior estimativa dentro da janela recente (últimos 45 dias) —
   evita que um treino fraco isolado puxe o número pra baixo à toa, igual
   relógios esportivos costumam fazer (rolling best, não última amostra). */
export function currentVo2Max(history, referenceDate = new Date()) {
  if (history.length === 0) return null;
  const cutoff = new Date(referenceDate);
  cutoff.setDate(cutoff.getDate() - 45);
  const recent = history.filter((p) => new Date(p.date) >= cutoff);
  const pool = recent.length > 0 ? recent : history.slice(-3);
  return Math.max(...pool.map((p) => p.vo2max));
}

/* Delta contra a estimativa "atual" de ~30 dias atrás, pra badge tipo
   "▲ +0.4 últimos 30 dias". */
export function deltaVsDaysAgo(history, days, referenceDate = new Date()) {
  if (history.length === 0) return null;
  const cutoff = new Date(referenceDate);
  cutoff.setDate(cutoff.getDate() - days);
  const past = history.filter((p) => new Date(p.date) <= cutoff);
  if (past.length === 0) return null;
  const pastValue = Math.max(...past.slice(-3).map((p) => p.vo2max));
  const nowValue = currentVo2Max(history, referenceDate);
  if (nowValue === null) return null;
  return Math.round((nowValue - pastValue) * 10) / 10;
}

/* Regressão linear simples (mínimos quadrados) sobre os pontos do
   histórico, usando dias desde o primeiro registro como eixo X. Serve de
   base pra linha de tendência e pra projeção futura — é uma extrapolação
   estatística do seu próprio histórico, não uma previsão de IA. */
export function linearTrend(history) {
  if (history.length < 2) return null;
  const t0 = new Date(history[0].date).getTime();
  const points = history.map((p) => ({
    x: (new Date(p.date).getTime() - t0) / 86400000, // dias desde o primeiro ponto
    y: p.vo2max,
  }));

  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom; // ml/kg/min por dia
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept, t0, lastX: points[points.length - 1].x };
}

/* Projeta o VO2max daqui a N dias, seguindo a tendência linear atual.
   Retorna null se não houver histórico suficiente pra uma tendência
   minimamente confiável (menos de 3 esforços de referência). */
export function projectVo2Max(history, daysAhead) {
  if (history.length < 3) return null;
  const trend = linearTrend(history);
  if (!trend) return null;
  const projected = trend.intercept + trend.slope * (trend.lastX + daysAhead);
  return Math.round(projected * 10) / 10;
}

/* Resumo da semana corrente (segunda a domingo) com base nos treinos de
   corrida — só métricas que o app realmente rastreia. */
export function weeklySummary(workouts, referenceDate = new Date()) {
  const day = referenceDate.getDay(); // 0 = domingo
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(referenceDate);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() + diffToMonday);

  const weekWorkouts = workouts.filter((w) => new Date(w.date) >= monday);

  const volumeKm = weekWorkouts.reduce((s, w) => s + (w.distanceKm || 0), 0);
  const totalTimeSec = weekWorkouts.reduce((s, w) => s + (w.durationSec || 0), 0);
  const rpeValues = weekWorkouts.map((w) => w.rpe).filter((v) => v != null);
  const avgRpe = rpeValues.length > 0 ? rpeValues.reduce((s, v) => s + v, 0) / rpeValues.length : null;
  const calories = weekWorkouts.reduce((s, w) => s + (w.calories || 0), 0);

  return {
    sessions: weekWorkouts.length,
    volumeKm: Math.round(volumeKm * 10) / 10,
    totalTimeSec,
    avgRpe: avgRpe !== null ? Math.round(avgRpe * 10) / 10 : null,
    calories: calories > 0 ? Math.round(calories) : null,
  };
}

/* Três fatores que o app consegue medir de verdade a partir dos treinos
   (nada de sono/HRV/estresse — isso exigiria integração com wearables que
   o app ainda não tem). Cada um vira uma nota 0-100 heurística, só pra
   apontar direção, não um diagnóstico clínico. */
export function limitingFactors(workouts, referenceDate = new Date()) {
  const cutoff8w = new Date(referenceDate);
  cutoff8w.setDate(cutoff8w.getDate() - 56);
  const recent = workouts.filter((w) => new Date(w.date) >= cutoff8w);

  // Volume: km/semana médio das últimas 8 semanas, normalizado numa escala
  // simples (30km/semana ~ referência de bom volume recreativo = 100).
  const weeksSpan = 8;
  const totalKm = recent.reduce((s, w) => s + (w.distanceKm || 0), 0);
  const avgWeeklyKm = totalKm / weeksSpan;
  const volumeScore = Math.max(0, Math.min(100, Math.round((avgWeeklyKm / 30) * 100)));

  // Intensidade: % dos treinos que são intervalado/tempo_run/prova.
  const intenseCount = recent.filter((w) => ["intervalado", "tempo_run", "prova"].includes(w.type)).length;
  const intensityScore = recent.length > 0 ? Math.round((intenseCount / recent.length) * 100) : 0;

  // Consistência: quantas das últimas 8 semanas tiveram pelo menos 1 treino.
  const weeksWithWorkout = new Set(
    recent.map((w) => {
      const d = new Date(w.date);
      const weekIndex = Math.floor((referenceDate.getTime() - d.getTime()) / (7 * 86400000));
      return weekIndex;
    })
  ).size;
  const consistencyScore = Math.max(0, Math.min(100, Math.round((weeksWithWorkout / weeksSpan) * 100)));

  return [
    { id: "volume", label: "Volume semanal", score: volumeScore, hint: `${Math.round(avgWeeklyKm)} km/semana em média (últimas 8 semanas)` },
    { id: "intensidade", label: "Treinos de intensidade", score: intensityScore, hint: `${intenseCount} de ${recent.length} treinos foram tempo run, intervalado ou prova` },
    { id: "consistencia", label: "Consistência", score: consistencyScore, hint: `${weeksWithWorkout} de ${weeksSpan} semanas com pelo menos 1 treino` },
  ];
}

/* Classificação em faixas gerais de VO2max pra corredores adultos, só como
   referência de contexto — não é um percentil calculado contra uma base de
   comparáveis reais (o app não tem essa base de dados), por isso não usa
   idade/sexo pra fingir uma precisão que não existe. */
const VO2_BANDS = [
  { max: 35, label: "Iniciante" },
  { max: 45, label: "Intermediário" },
  { max: 55, label: "Avançado" },
  { max: Infinity, label: "Elite" },
];
export function classifyVo2Max(vo2max) {
  if (vo2max === null || vo2max === undefined) return null;
  return VO2_BANDS.find((b) => vo2max < b.max)?.label ?? "Elite";
}
