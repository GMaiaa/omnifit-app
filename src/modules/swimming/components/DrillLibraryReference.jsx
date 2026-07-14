import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { C } from "../../../lib/theme";
import { DRILL_LIBRARY, strokeInfo } from "../constants";
import { Card } from "../../../components/ui";

/* Biblioteca de referência dos exercícios educativos por estilo — consulta
   rápida, independente do registro de um treino específico. */
export function DrillLibraryReference() {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full"
      >
        <span className="flex items-center gap-2" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: C.white, fontSize: 15 }}>
          <BookOpen size={16} style={{ color: C.gray }} />
          Biblioteca de exercícios educativos
        </span>
        {open ? <ChevronUp size={16} style={{ color: C.gray }} /> : <ChevronDown size={16} style={{ color: C.gray }} />}
      </button>

      {open && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DRILL_LIBRARY.map((group) => {
            const stroke = strokeInfo(group.strokeId);
            return (
              <div key={group.strokeId}>
                <div className="text-xs font-semibold mb-1.5" style={{ color: stroke.color }}>{stroke.label}</div>
                <ul className="flex flex-col gap-1">
                  {group.drills.map((d) => (
                    <li key={d.id} className="text-xs" style={{ color: C.gray }}>
                      <span style={{ color: C.white }}>•</span> {d.label}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
