import { modalityInfo } from "../../lib/theme";

const corridaColor = modalityInfo("corrida").color;

export const TYPES = [
  { id: "regenerativo", label: "Regenerativo", color: "#6B7280" },
  { id: "rodagem", label: "Rodagem", color: corridaColor },
  { id: "longo", label: "Longo", color: "#3B82F6" },
  { id: "intervalado", label: "Intervalado", color: "#00AEEF" },
  { id: "tempo_run", label: "Tempo Run", color: "#A78BFA" },
  { id: "prova", label: "Prova", color: "#FBBF24" },
];
export const typeInfo = (id) => TYPES.find((t) => t.id === id) || TYPES[0];

export const STORAGE_KEY = "omnifit:corrida:workouts:v1";

/* Distance-milestone buckets used across Analytics (5K/10K/21K), with a
   tolerance band so real-world GPS variance still counts as "the same" run. */
export const DISTANCE_BUCKETS = [
  { id: "5k", label: "5 km", min: 4.8, max: 5.2 },
  { id: "10k", label: "10 km", min: 9.5, max: 10.5 },
  { id: "21k", label: "21 km", min: 20.5, max: 21.5 },
];
