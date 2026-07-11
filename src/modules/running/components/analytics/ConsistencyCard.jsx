import { useMemo } from "react";
import { Flame, ListChecks, Percent } from "lucide-react";
import { C, modalityInfo } from "../../../../lib/theme";
import { consistency } from "../../analytics";
import { Card, CardHeader } from "../../../../components/ui";

const corrida = modalityInfo("corrida");

function heatColor(count) {
  if (count <= 0) return C.surface2;
  if (count === 1) return `${corrida.color}55`;
  if (count === 2) return `${corrida.color}99`;
  return corrida.color;
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: C.surface2, border: `1px solid ${C.borderSoft}` }}>
      <div className="rounded-lg p-1.5" style={{ background: `${corrida.color}1A`, color: corrida.color }}>
        <Icon size={14} />
      </div>
      <div>
        <div style={{ color: C.white, fontWeight: 700, fontSize: 15, fontFamily: "'Poppins', sans-serif" }}>{value}</div>
        <div style={{ color: C.gray, fontSize: 11 }}>{label}</div>
      </div>
    </div>
  );
}

export function ConsistencyCard({ workouts }) {
  const c = useMemo(() => consistency(workouts, 8), [workouts]);

  const weeksOfDays = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < c.heatmap.length; i += 7) chunks.push(c.heatmap.slice(i, i + 7));
    return chunks;
  }, [c.heatmap]);

  return (
    <Card>
      <CardHeader title="Consistência" description="Regularidade dos treinos nas últimas semanas" />
      <div className="grid grid-cols-3 gap-2 mb-4">
        <MiniStat icon={Flame} label="Semanas seguidas" value={c.currentStreak} />
        <MiniStat icon={Percent} label="Semanas ativas (8 sem)" value={`${Math.round(c.activeWeeksPct)}%`} />
        <MiniStat icon={ListChecks} label="Treinos/semana" value={c.avgPerWeek.toFixed(1)} />
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeksOfDays.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {Array.from({ length: 7 }).map((_, di) => {
              const day = week[di];
              return (
                <div
                  key={di}
                  title={day ? `${day.date}: ${day.count} treino(s)` : ""}
                  style={{
                    width: 11, height: 11, borderRadius: 3,
                    background: day ? heatColor(day.count) : "transparent",
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs" style={{ color: C.gray }}>Últimas 12 semanas, um quadrado por dia</p>
    </Card>
  );
}
