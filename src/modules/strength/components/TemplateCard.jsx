import { Pencil, Play, Trash2 } from "lucide-react";
import { C, modalityInfo } from "../../../lib/theme";
import { fmtDateShort } from "../../../lib/format";
import { muscleGroupInfo } from "../constants";
import { Card, Pill } from "../../../components/ui";

const musculacao = modalityInfo("musculacao");

export function TemplateCard({ template, lastSessionDate, onStart, onEdit, onDelete, onOpenDetail }) {
  const groups = [...new Set(template.exercises.map((e) => e.muscleGroup))].map(muscleGroupInfo);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <button onClick={onOpenDetail} className="text-left min-w-0">
          <div className="text-sm font-semibold truncate" style={{ color: C.white, fontFamily: "'Poppins', sans-serif" }}>
            {template.name}
          </div>
          <div className="mt-0.5 text-xs" style={{ color: C.gray }}>
            {template.exercises.length} exercícios
            {lastSessionDate && ` • último treino em ${fmtDateShort(lastSessionDate)}`}
          </div>
        </button>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg" style={{ color: C.gray }}>
            <Pencil size={14} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg" style={{ color: C.gray }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {groups.map((g) => <Pill key={g.id} color={g.color}>{g.label}</Pill>)}
      </div>

      <button
        onClick={onStart}
        className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold"
        style={{ background: `linear-gradient(135deg, ${musculacao.color}, #5B21B6)`, color: C.white }}
      >
        <Play size={14} /> Iniciar treino
      </button>
    </Card>
  );
}
