import FitParser from "fit-file-parser";

/* Sub-esportes de ciclismo que o Garmin FIT SDK usa. MyWhoosh, Zwift, Rouvy
   etc. exportam como sport "cycling" + sub_sport "virtual_activity" — os
   demais valores cobrem bike de estrada/mountain/indoor de outros apps. */
const CYCLING_SPORTS = new Set(["cycling", "e_biking", "handcycling"]);

function round(value, decimals = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/* Lê um File (input type="file") como ArrayBuffer, formato que o
   fit-file-parser espera receber. */
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("FILE_READ_FAILED"));
    reader.readAsArrayBuffer(file);
  });
}

/* Faz o parse de um único arquivo .fit e devolve os dados já no formato
   esperado por createCyclingWorkout (camelCase, prontos pra inserir).
   Lança erro com uma dessas mensagens em caso de falha:
   - FILE_READ_FAILED: o navegador não conseguiu ler o arquivo
   - FIT_PARSE_FAILED: o arquivo não é um .fit válido / está corrompido
   - NOT_A_CYCLING_ACTIVITY: o .fit é de outro esporte (corrida, natação…) */
export async function parseFitFile(file) {
  const buffer = await readFileAsArrayBuffer(file);

  // Unidades deliberadamente deixadas no padrão da lib (metros, m/s): pedir
  // "km"/"km/h" faz a lib converter TAMBÉM altitude e ganho de elevação pra
  // km, o que zera esses valores ao arredondar. É mais seguro converter
  // manualmente abaixo do que confiar nessas opções.
  const fitParser = new FitParser({
    force: true,
    elapsedRecordField: true,
    mode: "list",
  });

  const data = await new Promise((resolve, reject) => {
    fitParser.parse(buffer, (error, result) => {
      if (error) reject(new Error("FIT_PARSE_FAILED"));
      else resolve(result);
    });
  });

  const session = data.sessions?.[0];
  if (!session) throw new Error("FIT_PARSE_FAILED");

  if (session.sport && !CYCLING_SPORTS.has(session.sport)) {
    throw new Error("NOT_A_CYCLING_ACTIVITY");
  }

  const records = Array.isArray(data.records) ? data.records : [];

  // Monta a série temporal só com os campos que o gráfico precisa, e só se
  // o arquivo realmente tiver esses dados (nem todo .fit tem potência).
  // distance/altitude chegam em metros (unidade padrão da lib, ver acima).
  const streamData = records.length
    ? {
        t: records.map((r) => (r.elapsed_time ?? 0)),
        distance: records.map((r) => round(r.distance ?? 0, 0)),
        power: records.some((r) => r.power != null) ? records.map((r) => r.power ?? null) : undefined,
        heartRate: records.some((r) => r.heart_rate != null) ? records.map((r) => r.heart_rate ?? null) : undefined,
        cadence: records.some((r) => r.cadence != null) ? records.map((r) => r.cadence ?? null) : undefined,
        // speed vem em m/s -> km/h
        speed: records.some((r) => r.speed != null) ? records.map((r) => round((r.speed ?? 0) * 3.6, 1)) : undefined,
        altitude: records.some((r) => r.altitude != null) ? records.map((r) => round(r.altitude, 0)) : undefined,
      }
    : null;

  const startDate = session.start_time instanceof Date ? session.start_time : new Date(session.start_time);

  return {
    date: startDate.toISOString().slice(0, 10),
    type: "endurance",
    title: null,
    source: "fit_upload",
    distanceKm: round((session.total_distance ?? 0) / 1000, 2), // m -> km
    durationSec: Math.round(session.total_elapsed_time ?? session.total_timer_time ?? 0),
    elevationGainM: session.total_ascent != null ? Math.round(session.total_ascent) : null,
    avgHr: session.avg_heart_rate != null ? Math.round(session.avg_heart_rate) : null,
    maxHr: session.max_heart_rate != null ? Math.round(session.max_heart_rate) : null,
    avgPower: session.avg_power != null ? Math.round(session.avg_power) : null,
    maxPower: session.max_power != null ? Math.round(session.max_power) : null,
    avgCadence: session.avg_cadence != null ? Math.round(session.avg_cadence) : null,
    maxCadence: session.max_cadence != null ? Math.round(session.max_cadence) : null,
    calories: session.total_calories != null ? Math.round(session.total_calories) : null,
    rpe: null,
    notes: null,
    streamData,
  };
}

/* Traduz os erros de parseFitFile pra mensagens amigáveis em português. */
export function mapFitParseError(error) {
  const message = error?.message;
  if (message === "FILE_READ_FAILED") return "Não foi possível ler o arquivo. Tente novamente.";
  if (message === "FIT_PARSE_FAILED") return "Esse arquivo não parece ser um .fit válido.";
  if (message === "NOT_A_CYCLING_ACTIVITY") return "Esse arquivo .fit não é de uma atividade de ciclismo.";
  return "Não foi possível processar esse arquivo. Tente novamente.";
}
