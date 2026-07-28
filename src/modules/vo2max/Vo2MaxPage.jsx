import { useMemo, useState } from "react";
import {
  Activity, Gauge, Info, Sparkles, Flame, CalendarClock,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { C } from "../../lib/theme";
import { Card, CardHeader, EmptyState, SegmentedControl, Pill, DeltaBadge } from "../../components/ui";
import { fmtDuration, fmtDateShort } from "../../lib/format";
import {
  buildVo2History, currentVo2Max, deltaVsDaysAgo, projectVo2Max,
  weeklySummary, limitingFactors, classifyVo2Max,
} from "./vo2maxEngine";

const PERIODS = [
  { value: 7, label: "7d" },
  { value: 30, label: "30d" },
  { value: 90, label: "3m" },
  { value: 180, label: "6m" },
  { value: 365, label: "1a" },
];

const COMING_SOON = [
  { icon: Sparkles, title: "IA explicando sua evolução", desc: "Texto automático sobre por que seu VO2 subiu ou caiu, gerado por um modelo de linguagem." },
  { icon: Activity, title: "Recomendação diária por IA", desc: "Sugestão de treino, sono e nutrição personalizada pro seu dia." },
  { icon: Gauge, title: "Simulador \"E se?\"", desc: "Sliders pra testar cenários (mais volume, mais sono) e ver o impacto estimado no VO2." },
  { icon: Flame, title: "Readiness (prontidão)", desc: "Precisa de dados de sono e HRV — ainda não coletados pelo app." },
];

function factorColor(score) {
  if (score >= 70) return C.positive;
  if (score >= 40) return "#FBBF24";
  return C.danger;
}

export function Vo2MaxPage({ workouts }) {
  const [period, setPeriod] = useState(90);

  const history = useMemo(() => buildVo2History(workouts), [workouts]);
  const current = useMemo(() => currentVo2Max(history), [history]);
  const delta30d = useMemo(() => deltaVsDaysAgo(history, 30), [history]);
  const classification = classifyVo2Max(current);
  const weekly = useMemo(() => weeklySummary(workouts), [workouts]);
  const factors = useMemo(() => limitingFactors(workouts), [workouts]);

  const chartData = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - period);
    return history
      .filter((p) => new Date(p.date) >= cutoff)
      .map((p) => ({ date: p.date, vo2max: p.vo2max, label: fmtDateShort(p.date) }));
  }, [history, period]);

  const projections = useMemo(
    () => [30, 90, 365].map((d) => ({ days: d, value: projectVo2Max(history, d) })),
    [history]
  );

  if (history.length === 0) {
    return (
      <EmptyState
        icon={Gauge}
        title="Ainda não há dados suficientes"
        description="O VO2 Máx é estimado a partir de treinos de longão, tempo run ou prova. Registre alguns treinos desses tipos com distância e duração pra desbloquear essa aba."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: C.gray }}>
              VO2 Máx estimado
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 40, color: C.white }}>
                {current}
              </span>
              <span style={{ color: C.gray, fontSize: 14 }}>ml/kg/min</span>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {delta30d !== null && <DeltaBadge value={delta30d} suffix=" nos últimos 30 dias" precision={1} />}
              {classification && <Pill color={C.positive}>{classification}</Pill>}
            </div>
          </div>
          <div className="flex items-start gap-1.5 max-w-xs text-right sm:text-left" style={{ color: C.gray }}>
            <Info size={13} className="mt-0.5 flex-shrink-0" />
            <p className="text-xs">
              Estimativa via fórmula de Daniels &amp; Gilbert, calculada a partir dos seus treinos de longão/tempo run/prova — não é uma medição laboratorial.
            </p>
          </div>
        </div>
      </Card>

      {/* Evolução */}
      <Card>
        <CardHeader
          title="Evolução"
          description="Estimativa de VO2 Máx por treino de referência."
          right={<SegmentedControl options={PERIODS} value={period} onChange={setPeriod} />}
        />
        {chartData.length < 2 ? (
          <div className="py-10 text-center text-sm" style={{ color: C.gray }}>
            Poucos treinos de referência nesse período — tenta uma janela maior.
          </div>
        ) : (
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.borderSoft} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.gray }} axisLine={{ stroke: C.border }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.gray }} axisLine={false} tickLine={false} domain={["dataMin - 2", "dataMax + 2"]} />
                <Tooltip
                  contentStyle={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${v} ml/kg/min`, "VO2 Máx"]}
                />
                {current !== null && <ReferenceLine y={current} stroke={C.positive} strokeDasharray="4 4" opacity={0.5} />}
                <Line type="monotone" dataKey="vo2max" stroke="#00AEEF" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Resumo semanal */}
        <Card>
          <CardHeader title="Resumo da semana" description="Corrida — segunda a hoje." />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div style={{ color: C.gray, fontSize: 12 }}>Volume</div>
              <div style={{ color: C.white, fontWeight: 700, fontSize: 20 }}>{weekly.volumeKm} km</div>
            </div>
            <div>
              <div style={{ color: C.gray, fontSize: 12 }}>Sessões</div>
              <div style={{ color: C.white, fontWeight: 700, fontSize: 20 }}>{weekly.sessions}</div>
            </div>
            <div>
              <div style={{ color: C.gray, fontSize: 12 }}>Tempo total</div>
              <div style={{ color: C.white, fontWeight: 700, fontSize: 20 }}>{fmtDuration(weekly.totalTimeSec)}</div>
            </div>
            <div>
              <div style={{ color: C.gray, fontSize: 12 }}>RPE médio</div>
              <div style={{ color: C.white, fontWeight: 700, fontSize: 20 }}>{weekly.avgRpe ?? "—"}</div>
            </div>
          </div>
        </Card>

        {/* Projeção */}
        <Card>
          <CardHeader title="Projeção" description="Extrapolação estatística da sua tendência atual (não é IA)." />
          <div className="flex flex-col gap-3">
            {projections.map((p) => (
              <div key={p.days} className="flex items-center justify-between">
                <div className="flex items-center gap-2" style={{ color: C.gray, fontSize: 13 }}>
                  <CalendarClock size={14} />
                  {p.days === 365 ? "em 1 ano" : `em ${p.days} dias`}
                </div>
                <div style={{ color: C.white, fontWeight: 700, fontSize: 16 }}>
                  {p.value !== null ? `${p.value} ml/kg/min` : "dados insuficientes"}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Fatores limitantes */}
      <Card>
        <CardHeader title="Fatores que mais influenciam você" description="Só o que o app consegue medir de verdade a partir dos seus treinos." />
        <div className="flex flex-col gap-4">
          {factors.map((f) => (
            <div key={f.id}>
              <div className="flex items-center justify-between mb-1">
                <span style={{ color: C.white, fontSize: 13, fontWeight: 600 }}>{f.label}</span>
                <span style={{ color: factorColor(f.score), fontSize: 13, fontWeight: 700 }}>{f.score}%</span>
              </div>
              <div className="w-full rounded-full h-2" style={{ background: C.surface2 }}>
                <div className="h-2 rounded-full" style={{ width: `${f.score}%`, background: factorColor(f.score) }} />
              </div>
              <div className="mt-1 text-xs" style={{ color: C.gray }}>{f.hint}</div>
            </div>
          ))}
          <div className="text-xs mt-1 flex items-start gap-1.5" style={{ color: C.gray }}>
            <Info size={12} className="mt-0.5 flex-shrink-0" />
            Sono, HRV e estresse ainda não entram aqui — o app não coleta esses dados hoje.
          </div>
        </div>
      </Card>

      {/* Em breve */}
      <Card>
        <CardHeader
          title="Em breve"
          description="Funcionalidades do roadmap que ainda precisamos discutir e construir."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {COMING_SOON.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-3 rounded-xl px-4 py-3"
              style={{ background: C.surface2, border: `1px solid ${C.borderSoft}` }}
            >
              <f.icon size={18} style={{ color: C.gray }} className="flex-shrink-0 mt-0.5" />
              <div>
                <div style={{ color: C.white, fontSize: 13, fontWeight: 600 }}>{f.title}</div>
                <div style={{ color: C.gray, fontSize: 12 }} className="mt-0.5">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
