import { useState } from "react";
import { X, Loader2, CheckCircle2, AlertCircle, CalendarClock } from "lucide-react";
import { C } from "../../lib/theme";
import { useLockBodyScroll } from "../../lib/useLockBodyScroll";
import { syncStravaActivities, mapStravaError } from "./stravaService";

const PERIOD_OPTIONS = [
  { id: "30", label: "Últimos 30 dias", days: 30 },
  { id: "60", label: "Últimos 60 dias", days: 60 },
  { id: "90", label: "Últimos 90 dias", days: 90 },
  { id: "custom", label: "Data específica", days: null },
  { id: "all", label: "Histórico completo", days: "all" },
];

function unixFromDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

function unixFromDateStr(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  return Math.floor(d.getTime() / 1000);
}

/* Sincronização com o Strava guiada em 2 etapas:
   1. Escolher o período (30/60/90 dias, data específica, ou tudo)
   2. Rodar a sincronização e mostrar o resultado (com diagnóstico se
      alguma coisa vier zerada — evita o usuário ficar sem saber por quê). */
export function StravaSyncModal({ onClose, onSynced }) {
  useLockBodyScroll();
  const [step, setStep] = useState("choose"); // choose | running | done
  const [selected, setSelected] = useState("30");
  const [customDate, setCustomDate] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const canConfirm = selected !== "custom" || customDate;

  async function handleConfirm() {
    setStep("running");
    setError("");
    try {
      const option = PERIOD_OPTIONS.find((o) => o.id === selected);
      let afterUnix;
      if (option.days === "all") afterUnix = undefined;
      else if (option.id === "custom") afterUnix = unixFromDateStr(customDate);
      else afterUnix = unixFromDaysAgo(option.days);

      const res = await syncStravaActivities(afterUnix);
      setResult(res);
      setStep("done");
      onSynced?.();
    } catch (err) {
      setError(mapStravaError(err));
      setStep("done");
    }
  }

  const totalImported = result ? (result.cyclingImported ?? 0) + (result.runningImported ?? 0) : 0;
  const totalFailed = result ? (result.cyclingFailed ?? 0) + (result.runningFailed ?? 0) : 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" style={{ background: "rgba(3,7,18,0.75)" }}>
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6" style={{ background: C.bgSoft, border: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between mb-1">
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 18, color: C.white }}>
            Sincronizar com o Strava
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5" style={{ color: C.gray }}>
            <X size={20} />
          </button>
        </div>

        {step === "choose" && (
          <>
            <p className="text-xs mb-4" style={{ color: C.gray }}>
              Escolha o período que você quer importar.
            </p>
            <div className="flex flex-col gap-2 mb-5">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelected(opt.id)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-left"
                  style={{
                    background: selected === opt.id ? "#FC520022" : C.surface2,
                    border: `1px solid ${selected === opt.id ? "#FC5200" : C.borderSoft}`,
                  }}
                >
                  <CalendarClock size={16} style={{ color: selected === opt.id ? "#FC5200" : C.gray }} />
                  <span style={{ color: C.white, fontSize: 13, fontWeight: 600 }}>{opt.label}</span>
                </button>
              ))}
              {selected === "custom" && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="rounded-xl px-3 py-2.5 text-sm outline-none mt-1"
                  style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
                />
              )}
            </div>
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
              style={{ background: "#FC5200", color: "#fff" }}
            >
              Sincronizar
            </button>
          </>
        )}

        {step === "running" && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 size={28} className="animate-spin" style={{ color: "#FC5200" }} />
            <span style={{ color: C.gray, fontSize: 13 }}>Importando do Strava, pode levar alguns segundos…</span>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col gap-3 py-2">
            {error ? (
              <div className="flex items-start gap-2">
                <AlertCircle size={18} style={{ color: C.danger }} className="flex-shrink-0 mt-0.5" />
                <span style={{ color: C.danger, fontSize: 13 }}>{error}</span>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={18} style={{ color: C.positive }} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <div style={{ color: C.white, fontSize: 13, fontWeight: 600 }}>
                      {totalImported > 0 ? `${totalImported} treino(s) importado(s)/atualizado(s)` : "Nenhum treino novo encontrado"}
                    </div>
                    <div style={{ color: C.gray, fontSize: 12 }} className="mt-0.5">
                      {result.cyclingImported ?? 0} ciclismo · {result.runningImported ?? 0} corrida · {result.totalFetched ?? 0} atividades encontradas no Strava nesse período
                    </div>
                  </div>
                </div>

                {result.totalFetched === 0 && (
                  <div className="text-xs rounded-lg px-3 py-2" style={{ background: C.surface2, color: C.gray }}>
                    O Strava não devolveu nenhuma atividade nesse período. Confira se você tem treinos registrados lá nessas datas, ou tente "Histórico completo".
                  </div>
                )}
                {totalFailed > 0 && (
                  <div className="text-xs rounded-lg px-3 py-2" style={{ background: `${C.danger}1A`, color: C.danger }}>
                    {totalFailed} atividade(s) não puderam ser salvas. {result.lastError && `Detalhe: ${result.lastError}`}
                  </div>
                )}
              </>
            )}
            <button
              onClick={onClose}
              className="w-full rounded-xl py-3 text-sm font-semibold mt-2"
              style={{ background: C.surface2, color: C.white, border: `1px solid ${C.border}` }}
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
