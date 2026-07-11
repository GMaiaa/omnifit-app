/* ---------------------------------------------------------
   DESIGN TOKENS — Omnifit brand system
--------------------------------------------------------- */
export const C = {
  bg: "#0B1220",
  bgSoft: "#0F172A",
  surface: "#131D30",
  surface2: "#182238",
  border: "#22304A",
  borderSoft: "#1C2A42",
  gray: "#6B7280",
  white: "#F8FAFC",
  danger: "#F87171",
  amber: "#FBBF24",
  /* Sport-agnostic "improvement" semantic (deltas, positive trends) — not to
     be confused with a modality color, even though it visually matches
     Corrida's teal today. */
  positive: "#00E0B2",
};

/* Gradient of the Omnifit infinity mark (teal -> purple -> orange). Reserved
   for brand identity, the global score, and anything that represents the
   athlete across modalities — never for a single-sport metric. */
export const BRAND_GRADIENT = "linear-gradient(135deg, #00E0B2, #8A5CFF 55%, #FF9A3C)";
export const BRAND_GRADIENT_STOPS = [
  { offset: "0%", color: "#00E0B2" },
  { offset: "55%", color: "#8A5CFF" },
  { offset: "100%", color: "#FF9A3C" },
];

/* Registry of sport modalities. `color` is each modality's functional
   identifier used across the app; `status` gates whether the module has a
   real implementation ("active") or is a placeholder ("soon"). */
export const MODALITIES = [
  { id: "corrida", label: "Corrida", color: "#00E0B2", icon: "Footprints", status: "active" },
  { id: "musculacao", label: "Musculação", color: "#8A5CFF", icon: "Dumbbell", status: "active" },
  { id: "ciclismo", label: "Ciclismo", color: "#FF9A3C", icon: "Bike", status: "soon" },
  { id: "natacao", label: "Natação", color: "#3A8DFF", icon: "Waves", status: "soon" },
  { id: "hyrox", label: "HYROX", color: "#A3E635", icon: "Flame", status: "soon" },
];
export const modalityInfo = (id) => MODALITIES.find((m) => m.id === id) || MODALITIES[0];
