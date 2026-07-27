/* ---------------------------------------------------------
   DESIGN TOKENS — Omnifit brand system

   Cada valor aponta pra uma CSS custom property (ver src/index.css) em vez
   de um hex fixo — o valor real muda com [data-theme] na raiz do documento,
   então todo componente que já usa C.bg/C.white/etc. ganha o tema claro/
   escuro de graça, sem precisar saber que o tema existe. `C.white` continua
   se chamando "white" por história (era literalmente branco no único tema
   que existia), mas hoje representa "cor de texto primário" — no tema claro
   essa variável vale um tom escuro, não branco.
--------------------------------------------------------- */
export const C = {
  bg: "var(--omni-bg)",
  bgSoft: "var(--omni-bg-soft)",
  surface: "var(--omni-surface)",
  surface2: "var(--omni-surface-2)",
  border: "var(--omni-border)",
  borderSoft: "var(--omni-border-soft)",
  gray: "var(--omni-gray)",
  white: "var(--omni-white)",
  danger: "var(--omni-danger)",
  amber: "var(--omni-amber)",
  /* Sport-agnostic "improvement" semantic (deltas, positive trends) — not to
     be confused with a modality color, even though it visually matches
     Corrida's teal today. */
  positive: "var(--omni-positive)",
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
  { id: "ciclismo", label: "Ciclismo", color: "#FF9A3C", icon: "Bike", status: "active" },
  { id: "natacao", label: "Natação", color: "#3A8DFF", icon: "Waves", status: "active" },
  { id: "hyrox", label: "HYROX", color: "#A3E635", icon: "Flame", status: "active" },
];
export const modalityInfo = (id) => MODALITIES.find((m) => m.id === id) || MODALITIES[0];
