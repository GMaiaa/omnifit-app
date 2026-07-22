import { modalityInfo } from "../../lib/theme";

const ciclismoColor = modalityInfo("ciclismo").color;

export const TYPES = [
  { id: "recuperacao", label: "Recuperação", color: "#6B7280" },
  { id: "endurance", label: "Endurance", color: ciclismoColor },
  { id: "intervalado", label: "Intervalado", color: "#00AEEF" },
  { id: "subida", label: "Subida", color: "#22C55E" },
  { id: "prova", label: "Prova", color: "#FBBF24" },
];
export const typeInfo = (id) => TYPES.find((t) => t.id === id) || TYPES[0];

export const STORAGE_KEY = "omnifit:ciclismo:workouts:v1";

/* Distance-milestone buckets used across Analytics (20K/50K/100K), with a
   tolerance band so real-world GPS variance still counts as "the same" ride. */
export const DISTANCE_BUCKETS = [
  { id: "20k", label: "20 km", min: 19, max: 21 },
  { id: "50k", label: "50 km", min: 48, max: 52 },
  { id: "100k", label: "100 km", min: 97, max: 103 },
];
