import { useMemo } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import { C, modalityInfo } from "../../../../lib/theme";
import { generateInsights } from "../../insights";
import { Card } from "../../../../components/ui";

const hyrox = modalityInfo("hyrox");

export function InsightsPanel({ sessions, windowWeeks }) {
  const insights = useMemo(
    () => generateInsights(sessions, { windowWeeks }),
    [sessions, windowWeeks]
  );

  if (insights.length === 0) {
    return (
      <Card>
        <p className="text-sm" style={{ color: C.gray }}>
          Continue registrando treinos — assim que houver dados suficientes, insights automáticos
          sobre seus pontos fortes e gargalos aparecem aqui.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {insights.map((insight) => {
        const isWarning = insight.tone === "warning";
        const Icon = isWarning ? AlertTriangle : Sparkles;
        const accent = isWarning ? C.amber : hyrox.color;
        return (
          <div
            key={insight.id}
            className="flex items-start gap-3 rounded-2xl px-4 py-3.5"
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${accent}` }}
          >
            <Icon size={16} style={{ color: accent, flexShrink: 0, marginTop: 2 }} />
            <p className="text-sm" style={{ color: C.white, lineHeight: 1.5 }}>{insight.text}</p>
          </div>
        );
      })}
    </div>
  );
}
