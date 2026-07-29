import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { dominantType } from "../analytics";
import { TYPES } from "../constants";
import { EmptyState, Select } from "../../../components/ui";
import { RecordsCard } from "./analytics/RecordsCard";

/* Aba "Recordes" dedicada (fora de Analytics), no espírito do Strava:
   melhor velocidade por tipo/distância, maior distância, melhor semana e
   maior subida — sem o resto dos gráficos de Analytics no meio do caminho. */
export function RecordsTab({ workouts }) {
  const [selectedType, setSelectedType] = useState(null);
  const defaultType = useMemo(() => dominantType(workouts), [workouts]);
  const activeType = selectedType ?? defaultType;

  if (workouts.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="Ainda não há recordes"
        description="Registre alguns treinos para desbloquear seus recordes pessoais de velocidade e distância."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Select
          value={activeType}
          onChange={setSelectedType}
          options={TYPES.map((t) => ({ value: t.id, label: t.label }))}
        />
      </div>
      <RecordsCard workouts={workouts} typeId={activeType} />
    </div>
  );
}
