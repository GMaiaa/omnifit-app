import { useMemo } from "react";
import { Lock, Target } from "lucide-react";
import { C, MODALITIES, modalityInfo } from "../lib/theme";
import { Card, CardHeader } from "../components/ui";
import {
  consistency,
  dominantType,
  paceTrendByType,
  volumeByType,
  weeklyVolume,
} from "../modules/running/analytics";
import { typeInfo } from "../modules/running/constants";
import { InsightsPanel } from "../modules/running/components/analytics/InsightsPanel";
import { ConsistencyCard } from "../modules/running/components/analytics/ConsistencyCard";
import { PaceEvolutionCard } from "../modules/running/components/analytics/PaceEvolutionCard";
import { ScoreGauge } from "./ScoreGauge";

const corrida = modalityInfo("corrida");

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function qualify(value) {
  if (value >= 80) return "Ótima";
  if (value >= 55) return "Boa";
  if (value >= 30) return "Regular";
  return "Baixa";
}

/* Home's global score today is Corrida-only — see the 3 sub-scores below.
   Each is intentionally simple and explainable; recovery and the other
   modalities join once they have real data behind them. */
function useGlobalScore(workouts) {
  return useMemo(() => {
    const consistency4 = consistency(workouts, 4).activeWeeksPct;

    const vol = weeklyVolume(workouts, 8);
    const currentWeekKm = vol.weeks[vol.weeks.length - 1]?.km ?? 0;
    const deviation = vol.avgKm > 0 ? Math.abs(currentWeekKm / vol.avgKm - 1) : 0;
    const loadScore = vol.avgKm > 0 ? clamp(100 - Math.max(0, deviation - 0.33) * 150, 0, 100) : 60;

    const dom = dominantType(workouts);
    const trend = paceTrendByType(workouts, dom, 8);
    const paceScore = trend.paceChangePct === null ? 70 : clamp(70 - trend.paceChangePct * 3, 0, 100);

    const score = Math.round((consistency4 + loadScore + paceScore) / 3);

    return {
      score,
      dominantTypeId: dom,
      subScores: [
        { label: "Consistência", value: consistency4, hint: `${qualify(consistency4)} (${Math.round(consistency4)}% das últimas 4 sem.)` },
        { label: "Carga semanal", value: loadScore, hint: vol.avgKm > 0 ? `${currentWeekKm.toFixed(1)} km vs. média de ${vol.avgKm.toFixed(1)} km` : "sem histórico ainda" },
        {
          label: "Tendência de pace",
          value: paceScore,
          hint: trend.paceChangePct === null
            ? "sem dado suficiente"
            : `${trend.paceChangePct < 0 ? "melhorando" : "piorando"} ${Math.abs(trend.paceChangePct).toFixed(1)}% em ${typeInfo(dom).label}`,
        },
      ],
    };
  }, [workouts]);
}

export function Home({ workouts, onOpenModule }) {
  const { score, dominantTypeId, subScores } = useGlobalScore(workouts);

  const vol8 = useMemo(() => weeklyVolume(workouts, 8), [workouts]);
  const totalKm8 = useMemo(() => vol8.weeks.reduce((a, w) => a + w.km, 0), [vol8]);
  const totalHours8 = useMemo(
    () => workouts
      .filter((w) => vol8.weeks.length && w.date >= vol8.weeks[0].start)
      .reduce((a, w) => a + w.durationSec, 0) / 3600,
    [workouts, vol8]
  );

  const effortSplit = useMemo(() => volumeByType(workouts), [workouts]);
  const effortTotal = effortSplit.reduce((a, d) => a + d.value, 0);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader
          title="Performance geral"
          description="Score calculado a partir dos seus treinos de Corrida — hoje a única modalidade com dados."
        />
        <ScoreGauge score={score} subScores={subScores} />
        {workouts.length === 0 && (
          <div className="mt-4 pt-4 flex items-center justify-between flex-wrap gap-3" style={{ borderTop: `1px solid ${C.borderSoft}` }}>
            <p className="text-sm" style={{ color: C.gray }}>
              Ainda não há treinos registrados — o score começa a fazer sentido depois do primeiro.
            </p>
            <button
              onClick={() => onOpenModule?.("corrida")}
              className="rounded-full px-4 py-2 text-xs font-semibold"
              style={{ background: `linear-gradient(135deg, ${corrida.color}, #00AEEF)`, color: C.bg }}
            >
              Registrar meu primeiro treino
            </button>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="text-xs uppercase tracking-wider" style={{ color: C.gray, fontWeight: 600 }}>Volume (8 sem)</div>
          <div className="mt-2" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 24, color: C.white }}>
            {totalKm8.toFixed(1)} <span style={{ fontSize: 12, color: C.gray, fontWeight: 500 }}>km</span>
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wider" style={{ color: C.gray, fontWeight: 600 }}>Horas treinadas (8 sem)</div>
          <div className="mt-2" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 24, color: C.white }}>
            {totalHours8.toFixed(1)} <span style={{ fontSize: 12, color: C.gray, fontWeight: 500 }}>h</span>
          </div>
        </Card>
        <Card className="col-span-2 lg:col-span-2">
          <CardHeader title="Distribuição por modalidade" description="% do volume total registrado" />
          <div className="flex h-3 rounded-full overflow-hidden" style={{ background: C.surface2 }}>
            <div style={{ width: workouts.length ? "100%" : "0%", background: corrida.color }} />
          </div>
          <div className="flex flex-col gap-1.5 mt-3">
            {MODALITIES.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5" style={{ color: m.status === "active" ? C.white : C.gray }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: m.status === "active" ? m.color : C.surface2, display: "inline-block" }} />
                  {m.label}
                </span>
                {m.status === "active" ? (
                  <span style={{ color: C.gray }}>{workouts.length ? "100%" : "0%"}</span>
                ) : (
                  <span className="flex items-center gap-1" style={{ color: C.gray }}>
                    <Lock size={11} /> em breve
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <InsightsPanel workouts={workouts} paceWindowWeeks={8} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <PaceEvolutionCard workouts={workouts} typeId={dominantTypeId} windowWeeks={8} />
        </div>
        <ConsistencyCard workouts={workouts} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Distribuição por tipo de esforço" description="Km acumulados em Corrida, histórico completo" />
          {effortSplit.length === 0 ? (
            <p className="text-sm py-4" style={{ color: C.gray }}>Sem treinos registrados ainda.</p>
          ) : (
            <>
              <div className="flex h-3 rounded-full overflow-hidden">
                {effortSplit.map((d) => (
                  <div key={d.id} style={{ width: `${(d.value / effortTotal) * 100}%`, background: d.color }} />
                ))}
              </div>
              <div className="flex flex-col gap-1.5 mt-3">
                {effortSplit.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5" style={{ color: C.white }}>
                      <span style={{ width: 8, height: 8, borderRadius: 4, background: d.color, display: "inline-block" }} />
                      {d.name}
                    </span>
                    <span style={{ color: C.gray }}>{d.value} km</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card className="flex flex-col items-center justify-center text-center gap-3 py-8">
          <div className="rounded-full p-3" style={{ background: `${C.gray}1A` }}>
            <Target size={22} style={{ color: C.gray }} />
          </div>
          <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: C.white, fontSize: 15 }}>Metas — em breve</h3>
          <p className="text-xs" style={{ color: C.gray, maxWidth: 240 }}>
            Defina metas de volume, pace ou frequência para acompanhar seu progresso aqui.
          </p>
        </Card>
      </div>
    </div>
  );
}
