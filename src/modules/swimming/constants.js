import { modalityInfo } from "../../lib/theme";

const natacaoColor = modalityInfo("natacao").color;

/* Estilo predominante do treino — a blue-family spread, the same way Corrida's
   TYPES lean on teal and Musculação's MUSCLE_GROUPS lean on purple. */
export const STROKES = [
  { id: "livre", label: "Livre", color: natacaoColor },
  { id: "costas", label: "Costas", color: "#5EA8FF" },
  { id: "peito", label: "Peito", color: "#60A5FA" },
  { id: "borboleta", label: "Borboleta", color: "#1E5FCC" },
  { id: "medley", label: "Medley", color: "#8B5CF6" },
];
export const strokeInfo = (id) => STROKES.find((s) => s.id === id) || STROKES[0];

/* Objetivo principal da sessão. Distinct hues per intensity/purpose so pie
   and bar breakdowns stay legible across 13 categories. */
export const TYPES = [
  { id: "continuo", label: "Contínuo", color: natacaoColor },
  { id: "endurance", label: "Endurance", color: "#2563EB" },
  { id: "regenerativo", label: "Regenerativo", color: "#6B7280" },
  { id: "ritmo", label: "Ritmo", color: "#38BDF8" },
  { id: "intervalado", label: "Intervalado", color: "#00AEEF" },
  { id: "sprint", label: "Sprint", color: "#F97316" },
  { id: "tecnica", label: "Técnica", color: "#A78BFA" },
  { id: "educativo", label: "Educativo", color: "#8A5CFF" },
  { id: "velocidade", label: "Velocidade", color: "#F87171" },
  { id: "resistencia", label: "Resistência", color: "#0EA5E9" },
  { id: "prova", label: "Prova", color: "#FBBF24" },
  { id: "simulado", label: "Simulado", color: "#FCD34D" },
  { id: "recuperacao", label: "Recuperação", color: "#94A3B8" },
];
export const typeInfo = (id) => TYPES.find((t) => t.id === id) || TYPES[0];

export const ENVIRONMENTS = [
  { id: "piscina", label: "Piscina" },
  { id: "aguas_abertas", label: "Águas abertas" },
];

export const POOL_TYPES = [
  { id: "25", label: "25 m" },
  { id: "50", label: "50 m" },
  { id: "personalizada", label: "Personalizada" },
];

export const BLOCK_TYPES = [
  { id: "aquecimento", label: "Aquecimento" },
  { id: "educativo", label: "Educativos" },
  { id: "serie_principal", label: "Série principal" },
  { id: "soltura", label: "Soltura" },
  { id: "outro", label: "Outro" },
];
export const blockTypeInfo = (id) => BLOCK_TYPES.find((b) => b.id === id) || BLOCK_TYPES[0];

export const STORAGE_KEY = "omnifit:natacao:workouts:v1";

/* Distance-milestone buckets used across Analytics/Records, with a tolerance
   band so real-world touch-pad variance still counts as "the same" swim. */
export const DISTANCE_BUCKETS = [
  { id: "50m", label: "50 m", min: 45, max: 55 },
  { id: "100m", label: "100 m", min: 90, max: 110 },
  { id: "200m", label: "200 m", min: 180, max: 220 },
  { id: "400m", label: "400 m", min: 380, max: 420 },
  { id: "800m", label: "800 m", min: 760, max: 840 },
  { id: "1500m", label: "1.500 m", min: 1450, max: 1550 },
];

/* Biblioteca de exercícios educativos por estilo, usada tanto no registro de
   treinos educativos quanto como referência de técnica. */
export const DRILL_LIBRARY = [
  {
    strokeId: "livre",
    drills: [
      { id: "livre-polegar-axila", label: "Polegar na axila" },
      { id: "livre-catch-up", label: "Catch-up" },
      { id: "livre-braco-unico", label: "Braço único" },
      { id: "livre-punhos-fechados", label: "Punhos fechados" },
      { id: "livre-6-pernadas-1-bracada", label: "6 pernadas + 1 braçada" },
      { id: "livre-sculling", label: "Sculling" },
    ],
  },
  {
    strokeId: "costas",
    drills: [
      { id: "costas-braco-unico", label: "Braço único" },
      { id: "costas-rotacao-tronco", label: "Rotação de tronco" },
      { id: "costas-6-pernadas", label: "6 pernadas" },
    ],
  },
  {
    strokeId: "peito",
    drills: [
      { id: "peito-deslizamento", label: "Deslizamento" },
      { id: "peito-pernada-isolada", label: "Pernada isolada" },
      { id: "peito-bracada-isolada", label: "Braçada isolada" },
    ],
  },
  {
    strokeId: "borboleta",
    drills: [
      { id: "borboleta-ondulacao", label: "Ondulação" },
      { id: "borboleta-braco-unico", label: "Braço único" },
      { id: "borboleta-pernada-golfinho", label: "Pernada de golfinho" },
    ],
  },
];
export function drillLabel(id) {
  for (const g of DRILL_LIBRARY) {
    const d = g.drills.find((x) => x.id === id);
    if (d) return d.label;
  }
  return id;
}
