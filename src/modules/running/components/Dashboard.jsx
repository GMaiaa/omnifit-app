import { useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Calendar, Flag, Gauge, ListChecks, Zap } from "lucide-react";
import { C, modalityInfo } from "../../../lib/theme";
import { addDays, fmtPace, mondayOf, todayStr } from "../../../lib/format";
import { inRange, volumeByType, weeklyVolume } from "../analytics";
import { typeInfo } from "../constants";
import { Card, EmptyState, StatCard } from "../../../components/ui";

const corrida = modalityInfo("corrida");

export function Dashboard({ workouts }) {
  const stats = useMemo(() => {
    if (workouts.length === 0) return null;
    const today = todayStr();
    const weekStart = mondayOf(today);
    const lastWeekStart = addDays(weekStart, -7);
    const monthStart = today.slice(0, 7) + "-01";

    const thisWeek = workouts.filter((w) => inRange(w, weekStart));
    const lastWeek = workouts.filter((w) => inRange(w, lastWeekStart, weekStart));
    const thisMonth = workouts.filter((w) => inRange(w, monthStart));

    const sumDist = (arr) => arr.reduce((a, w) => a + w.distanceKm, 0);
    const sumTime = (arr) => arr.reduce((a, w) => a + w.durationSec, 0);

    const weekDist = sumDist(thisWeek);
    const lastWeekDist = sumDist(lastWeek);
    const deltaDist = lastWeekDist > 0 ? ((weekDist - lastWeekDist) / lastWeekDist) * 100 : null;

    const totalDist = sumDist(workouts);
    const totalTime = sumTime(workouts);
    const avgPace = totalDist > 0 ? totalTime / totalDist : null;

    const { weeks } = weeklyVolume(workouts, 8);

    return {
      weekDist, deltaDist, monthDist: sumDist(thisMonth), totalDist, avgPace,
      weekCount: thisWeek.length, totalCount: workouts.length, weeks,
      distByType: volumeByType(workouts),
    };
  }, [workouts]);

  if (!stats) {
    return (
      <EmptyState
        icon={Zap}
        title="Nenhum treino registrado ainda"
        description="Registre seu primeiro treino para ver o seu volume, pace e evolução aparecerem aqui."
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Volume da semana" value={stats.weekDist.toFixed(1)} unit="km" icon={Calendar} accent={corrida.color} delta={stats.deltaDist} />
        <StatCard label="Volume do mês" value={stats.monthDist.toFixed(1)} unit="km" icon={Flag} accent={typeInfo("longo").color} />
        <StatCard label="Treinos na semana" value={stats.weekCount} unit={`de ${stats.totalCount} no total`} icon={ListChecks} accent={typeInfo("intervalado").color} />
        <StatCard label="Pace médio geral" value={fmtPace(stats.avgPace)} unit="/km" icon={Gauge} accent={typeInfo("tempo_run").color} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <h3 className="mb-1" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: C.white, fontSize: 15 }}>
            Evolução do volume semanal
          </h3>
          <p className="mb-3 text-xs" style={{ color: C.gray }}>Últimas 8 semanas, em km</p>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weeks} margin={{ left: -20, right: 8 }}>
                <CartesianGrid stroke={C.borderSoft} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: C.gray, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false} />
                <YAxis tick={{ fill: C.gray, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: C.white }} itemStyle={{ color: corrida.color }}
                  formatter={(v) => [`${v} km`, "Volume"]}
                />
                <Bar dataKey="km" radius={[6, 6, 0, 0]} fill={corrida.color} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="mb-1" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: C.white, fontSize: 15 }}>
            Distribuição por tipo
          </h3>
          <p className="mb-3 text-xs" style={{ color: C.gray }}>Km acumulados, histórico completo</p>
          <div style={{ height: 190 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.distByType} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={2}>
                  {stats.distByType.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }}
                  formatter={(v, n) => [`${v} km`, n]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-1.5 mt-2">
            {stats.distByType.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5" style={{ color: C.white }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: d.color, display: "inline-block" }} />
                  {d.name}
                </span>
                <span style={{ color: C.gray }}>{d.value} km</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="mb-1" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: C.white, fontSize: 15 }}>
          Evolução do pace
        </h3>
        <p className="mb-3 text-xs" style={{ color: C.gray }}>Pace médio semanal, min/km (últimas 8 semanas)</p>
        <div style={{ height: 190 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.weeks} margin={{ left: -20, right: 8 }}>
              <CartesianGrid stroke={C.borderSoft} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: C.gray, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false} />
              <YAxis tick={{ fill: C.gray, fontSize: 11 }} axisLine={false} tickLine={false} reversed domain={["dataMin - 0.3", "dataMax + 0.3"]} />
              <Tooltip
                contentStyle={{ background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }}
                formatter={(v) => [v ? `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, "0")} /km` : "—", "Pace"]}
              />
              <Line type="monotone" dataKey="pace" stroke={typeInfo("intervalado").color} strokeWidth={2.5} dot={{ fill: typeInfo("intervalado").color, r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
