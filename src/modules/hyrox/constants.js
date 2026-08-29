import { modalityInfo } from "../../lib/theme";
import { fmtDuration } from "../../lib/format";

const hyroxColor = modalityInfo("hyrox").color;

/* Biblioteca de exercícios organizada por categoria (para navegação) —
   cada exercício também carrega um `metricType` que determina quais campos
   aparecem no registro (ver METRIC_TYPES). Categoria e tipo de métrica são
   dimensões independentes: "Corrida" e "Ergômetros" são ambos `distance`. */
export const CATEGORIES = [
  { id: "corrida", label: "Corrida", color: hyroxColor },
  { id: "ergometros", label: "Ergômetros", color: "#84CC16" },
  { id: "carga", label: "Carga", color: "#65A30D" },
  { id: "peso_corporal", label: "Peso corporal", color: "#BEF264" },
];
export const categoryInfo = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];

export const METRIC_TYPES = [
  { id: "reps", label: "Repetições" },
  { id: "load", label: "Carga" },
  { id: "time", label: "Tempo" },
  { id: "distance", label: "Distância" },
];
export const metricTypeInfo = (id) => METRIC_TYPES.find((m) => m.id === id) || METRIC_TYPES[0];

/* Para cada tipo de métrica, se um valor MAIOR representa evolução (força,
   repetições, tempo sustentado) ou se um valor MENOR é melhor (pace). Usado
   por toda a camada de analytics/insights para julgar "melhorou" vs "piorou". */
export const HIGHER_IS_BETTER = { reps: true, load: true, time: true, distance: false };

/* Objetivo principal da sessão — alimenta a distribuição por objetivo nos
   Analytics e identifica sessões de prova/simulação para as análises
   específicas de corrida completa. */
export const FOCUS = [
  { id: "forca", label: "Força", color: "#65A30D" },
  { id: "resistencia", label: "Resistência", color: hyroxColor },
  { id: "potencia", label: "Potência", color: "#22C55E" },
  { id: "tecnica", label: "Técnica", color: "#4ADE80" },
  { id: "metcon", label: "Metcon", color: "#84CC16" },
  { id: "simulado", label: "Simulado", color: "#EAB308" },
  { id: "prova", label: "Prova", color: "#F59E0B" },
  { id: "recuperacao", label: "Recuperação", color: "#94A3B8" },
];
export const focusInfo = (id) => FOCUS.find((f) => f.id === id) || FOCUS[0];
export const isRaceFocus = (id) => id === "simulado" || id === "prova";

export const DEFAULT_ROUNDS = 1;

/* Tipos de meta ("target") planejável por exercício dentro de uma ficha —
   dimensão independente de METRIC_TYPES: a meta é só uma referência definida
   ao montar o treino (ex: "SkiErg — meta 500m"), exibida durante a execução;
   o que de fato foi feito continua sendo registrado pelos campos de
   METRIC_TYPES em cada volta. */
export const TARGET_TYPES = [
  { id: "reps", label: "Repetições", unit: "reps" },
  { id: "distance", label: "Distância", unit: "m" },
  { id: "calories", label: "Calorias", unit: "cal" },
  { id: "time", label: "Tempo", unit: "s" },
];
export const targetTypeInfo = (id) => TARGET_TYPES.find((t) => t.id === id) || TARGET_TYPES[0];

/* Exercícios de peso corporal que fazem sentido tanto por distância quanto
   por repetições (deslocamento), diferente dos demais (contagem pura). */
const BODYWEIGHT_DISTANCE_OR_REPS = new Set(["burpees", "burpee-broad-jump", "walking-lunges"]);

/* Quais tipos de meta fazem sentido para um exercício — usado pelo
   TemplateForm para oferecer só as opções relevantes (ergômetros: distância
   ou calorias; carga/corrida: distância; isométricos: tempo; alguns de peso
   corporal: distância ou reps; os demais: reps). Aceita tanto entradas do
   catálogo quanto customizadas (ambas têm category/metricType/catalogId). */
export function targetTypesFor({ catalogId, category, metricType } = {}) {
  if (metricType === "time") return ["time"];
  if (category === "ergometros") return ["distance", "calories"];
  if (category === "carga" || category === "corrida") return ["distance"];
  if (BODYWEIGHT_DISTANCE_OR_REPS.has(catalogId)) return ["distance", "reps"];
  return ["reps"];
}

export function formatTargetValue(target) {
  if (!target || target.value === null || target.value === undefined) return null;
  if (target.type === "time") return fmtDuration(target.value);
  const unit = targetTypeInfo(target.type).unit;
  return `${target.value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${unit}`;
}

/* Catálogo embutido — mesma ideia do EXERCISE_CATALOG da Musculação: mantém
   nomes consistentes entre sessões (histórico/PRs por exercício dependem
   disso), com opção de exercício customizado via ExercisePicker. */
export const EXERCISE_CATALOG = [
  { id: "corrida", name: "Corrida", category: "corrida", metricType: "distance" },

  { id: "skierg", name: "SkiErg", category: "ergometros", metricType: "distance" },
  { id: "rowerg", name: "RowErg (Remo)", category: "ergometros", metricType: "distance" },
  { id: "bikeerg", name: "BikeErg", category: "ergometros", metricType: "distance" },
  { id: "assault-bike", name: "Assault Bike", category: "ergometros", metricType: "distance" },

  { id: "sled-push", name: "Sled Push", category: "carga", metricType: "load" },
  { id: "sled-pull", name: "Sled Pull", category: "carga", metricType: "load" },
  { id: "farmers-carry", name: "Farmer's Carry", category: "carga", metricType: "load" },
  { id: "sandbag-lunges", name: "Sandbag Lunges", category: "carga", metricType: "load" },
  { id: "kettlebell-carry", name: "Kettlebell Carry", category: "carga", metricType: "load" },
  { id: "kettlebell-lunges", name: "Kettlebell Lunges", category: "carga", metricType: "load" },

  { id: "wall-balls", name: "Wall Balls", category: "peso_corporal", metricType: "reps" },
  { id: "burpees", name: "Burpees", category: "peso_corporal", metricType: "reps" },
  { id: "burpee-broad-jump", name: "Burpee Broad Jump", category: "peso_corporal", metricType: "reps" },
  { id: "box-jump", name: "Box Jump", category: "peso_corporal", metricType: "reps" },
  { id: "push-ups", name: "Push-ups", category: "peso_corporal", metricType: "reps" },
  { id: "sit-ups", name: "Sit-ups", category: "peso_corporal", metricType: "reps" },
  { id: "air-squats", name: "Air Squats", category: "peso_corporal", metricType: "reps" },
  { id: "walking-lunges", name: "Walking Lunges", category: "peso_corporal", metricType: "reps" },

  { id: "plank", name: "Prancha", category: "peso_corporal", metricType: "time" },
  { id: "dead-hang", name: "Dead Hang", category: "peso_corporal", metricType: "time" },
  { id: "hollow-hold", name: "Hollow Hold", category: "peso_corporal", metricType: "time" },
];
export const exerciseCatalogInfo = (id) => EXERCISE_CATALOG.find((e) => e.id === id) || null;
