import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Flag, Medal, Trophy } from "lucide-react";
import { C, modalityInfo } from "../../../../lib/theme";
import { fmtDateShort, fmtDuration, fmtPace } from "../../../../lib/format";
import { raceAnalytics } from "../../analytics";
import { Card, CardHeader, DeltaBadge, EmptyState } from "../../../../components/ui";

const hyrox = modalityInfo("hyrox");

export function RaceAnalyticsCard({ sessions }) {
  const { races, ranking, trendline, deltaVsPrevious } = useMemo(() => raceAnalytics(sessions), [sessions]);

  if (races.length === 0) {
    return (
      <EmptyState
        icon={Flag}
        title="Nenhuma prova ou simulação registrada"
        description='Marque o objetivo de uma execução como "Simulado" ou "Prova" para desbloquear tempos por estação, transições e ranking pessoal.'
      />
    );
  }

  const last = races[races.length - 1];
  const chartData = races.map((r, i) => ({
    label: fmtDateShort(r.date),
    totalMin: Math.round((r.totalDurationSec / 60) * 10) / 10,
    trendline: trendline[i] ? Math.round((trendline[i].value / 60) * 10) / 10 : null,
  }));

  return (
    <Card>
      <CardHeader
        title="Simulação de prova"
        description={`${races.length} prova(s)/simulação(ões) registrada(s)`}
        right={deltaVsPrevious !== null && <DeltaBadge value={deltaVsPrevious} positiveIsGood={false} />}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div>
          <div className="text-xs" style={{ color: C.gray }}>Tempo total</div>
          <div style={{ color: C.white, fontWeight: 700, fontSize: 18, fontFamily: "'Poppins', sans-serif" }}>{fmtDuration(last.totalDurationSec)}</div>
        </div>
        <div>
          <div className="text-xs" style={{ color: C.gray }}>Tempo de corrida</div>
          <div style={{ color: C.white, fontWeight: 700, fontSize: 18, fontFamily: "'Poppins', sans-serif" }}>{fmtDuration(last.runDurationSec)}</div>
        </div>
        <div>
          <div className="text-xs" style={{ color: C.gray }}>Pace médio das corridas</div>
          <div style={{ color: C.white, fontWeight: 700, fontSize: 18, fontFamily: "'Poppins', sans-serif" }}>
            {last.pace ? `${fmtPace(last.pace)} /km` : "—"}
          </div>
        </div>
        <div>
          <div className="text-xs" style={{ color: C.gray }}>Tempo de transição</div>
          <div style={{ color: C.white, fontWeight: 700, fontSize: 18, fontFamily: "'Poppins', sans-serif" }}>{fmtDuration(last.transitionSec)}</div>
        </div>
      </div>

      {chartData.length >= 2 && (
        <div style={{ height: 180 }} className="mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: -10, right: 8 }}>
              <CartesianGrid stroke={C.borderSoft} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: C.gray, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false} />
              <YAxis tick={{ fill: C.gray, fontSize: 11 }} axisLine={false} tickLine={false} reversed domain={["dataMin - 2", "dataMax + 2"]} />
              <Tooltip
                contentStyle={{ background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: C.white }}
                formatter={(v, name) => [v !== null ? `${v} min` : "—", name === "trendline" ? "Tendência" : "Tempo total"]}
              />
              <Line type="monotone" dataKey="totalMin" stroke={hyrox.color} strokeWidth={2.5} dot={{ fill: hyrox.color, r: 3 }} connectNulls />
              <Line type="monotone" dataKey="trendline" stroke={C.gray} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mb-4">
        <p className="text-xs font-semibold mb-2" style={{ color: C.gray }}>Tempo por estação (última prova)</p>
        <div className="flex flex-col gap-1.5">
          {last.stations.length === 0 && <p className="text-xs" style={{ color: C.gray }}>Nenhuma estação registrada.</p>}
          {last.stations.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span style={{ color: C.white }}>{s.name}</span>
              <span style={{ color: C.gray }}>{fmtDuration(s.durationSec)}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: C.gray }}>
          <Trophy size={13} style={{ color: C.amber }} /> Ranking pessoal
        </p>
        <div className="flex flex-col gap-1.5">
          {ranking.slice(0, 5).map((r, i) => (
            <div key={r.id} className="flex items-center gap-2 text-xs">
              <Medal size={13} style={{ color: i === 0 ? C.amber : C.gray, flexShrink: 0 }} />
              <span style={{ color: C.white, flex: 1 }}>{fmtDateShort(r.date)} — {r.templateName}</span>
              <span style={{ color: C.white, fontWeight: 600 }}>{fmtDuration(r.totalDurationSec)}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
