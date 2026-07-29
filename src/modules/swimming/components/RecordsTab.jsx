import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { dominantStroke } from "../analytics";
import { STROKES } from "../constants";
import { EmptyState, Select } from "../../../components/ui";
import { RecordsCard } from "./analytics/RecordsCard";

export function RecordsTab({ workouts }) {
  const [selectedStroke, setSelectedStroke] = useState(null);
  const defaultStroke = useMemo(() => dominantStroke(workouts), [workouts]);
  const activeStroke = selectedStroke ?? defaultStroke;

  if (workouts.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="Ainda não há recordes"
        description="Registre alguns treinos para desbloquear seus recordes pessoais de pace e distância."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Select
          value={activeStroke}
          onChange={setSelectedStroke}
          options={STROKES.map((s) => ({ value: s.id, label: s.label }))}
        />
      </div>
      <RecordsCard workouts={workouts} strokeId={activeStroke} />
    </div>
  );
}
