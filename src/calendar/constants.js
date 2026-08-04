import { MODALITIES } from "../lib/theme";

/* Modalidades que aparecem no seletor do calendário: as 5 do app (com ícone/
   cor já definidos em lib/theme.js) mais duas categorias que só existem
   aqui — "multiesporte" (ex: bloco de triatlo, cada etapa com sua própria
   modalidade) e "outro" (qualquer coisa fora do catálogo). */
export const WORKOUT_MODALITIES = [
  ...MODALITIES.map((m) => ({ id: m.id, label: m.label, color: m.color, icon: m.icon })),
  { id: "multiesporte", label: "Multiesporte", color: "#EAB308", icon: "Layers" },
  { id: "outro", label: "Outro", color: "#94A3B8", icon: "MoreHorizontal" },
];
export const workoutModalityInfo = (id) => WORKOUT_MODALITIES.find((m) => m.id === id) || WORKOUT_MODALITIES[WORKOUT_MODALITIES.length - 1];

export const WORKOUT_STATUS = [
  { id: "planned", label: "Planejado", color: "#94A3B8" },
  { id: "completed", label: "Concluído", color: "#00E0B2" },
  { id: "skipped", label: "Pulado", color: "#F59E0B" },
  { id: "canceled", label: "Cancelado", color: "#EF4444" },
];
export const workoutStatusInfo = (id) => WORKOUT_STATUS.find((s) => s.id === id) || WORKOUT_STATUS[0];

export const VIEW_MODES = [
  { value: "day", label: "Dia" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
];

export const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
