import { Bike, Dumbbell, Flame, Footprints, Layers, MoreHorizontal, Waves } from "lucide-react";

/* Mapeia o nome de ícone (string, guardado em WORKOUT_MODALITIES) pro
   componente lucide-react real — mesmo padrão do MODALITY_ICONS de
   App.jsx, só que estendido com as duas categorias extras do calendário
   (multiesporte / outro). */
export const MODALITY_ICON_COMPONENTS = { Footprints, Dumbbell, Bike, Waves, Flame, Layers, MoreHorizontal };
