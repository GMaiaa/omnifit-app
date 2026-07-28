import { Trophy } from "lucide-react";
import { EmptyState } from "../../../components/ui";
import { RecordsCard } from "./analytics/RecordsCard";

export function RecordsTab({ sessions }) {
  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="Ainda não há recordes"
        description="Registre algumas sessões para desbloquear seus recordes pessoais de carga e 1RM estimado."
      />
    );
  }

  return <RecordsCard sessions={sessions} />;
}
