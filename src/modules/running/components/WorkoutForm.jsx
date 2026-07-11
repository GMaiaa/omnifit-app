import { useState } from "react";
import { Gauge, X } from "lucide-react";
import { C, modalityInfo } from "../../../lib/theme";
import { fmtPace, todayStr, uid } from "../../../lib/format";
import { TYPES } from "../constants";

const corrida = modalityInfo("corrida");

/* ---------------------------------------------------------
   NEW WORKOUT FORM
--------------------------------------------------------- */
export function WorkoutForm({ onSave, onClose }) {
  const [date, setDate] = useState(todayStr());
  const [type, setType] = useState("rodagem");
  const [distance, setDistance] = useState("");
  const [durMin, setDurMin] = useState("");
  const [durSec, setDurSec] = useState("");
  const [hr, setHr] = useState("");
  const [rpe, setRpe] = useState(5);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const distNum = parseFloat(distance.replace(",", "."));
  const totalSec = (parseInt(durMin || 0, 10) * 60) + parseInt(durSec || 0, 10);
  const paceLive = distNum > 0 && totalSec > 0 ? totalSec / distNum : null;

  function handleSubmit() {
    if (!distNum || distNum <= 0) return setError("Informe uma distância válida.");
    if (!totalSec || totalSec <= 0) return setError("Informe o tempo do treino.");
    setError("");
    onSave({
      id: uid(),
      date,
      type,
      distanceKm: distNum,
      durationSec: totalSec,
      avgHr: hr ? parseInt(hr, 10) : null,
      rpe,
      notes: notes.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(3,7,18,0.7)" }}>
      <div
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-6"
        style={{ background: C.bgSoft, border: `1px solid ${C.border}` }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 20, color: C.white }}>
            Novo treino
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5" style={{ color: C.gray }}>
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Data</label>
            <input
              type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Tipo de treino</label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className="rounded-xl px-2 py-2 text-xs font-semibold transition"
                  style={{
                    background: type === t.id ? `${t.color}26` : C.surface2,
                    color: type === t.id ? t.color : C.gray,
                    border: `1px solid ${type === t.id ? t.color : C.border}`,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Distância (km)</label>
              <input
                type="text" inputMode="decimal" placeholder="ex: 10,25" value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Tempo</label>
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="number" min="0" placeholder="min" value={durMin}
                  onChange={(e) => setDurMin(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
                />
                <span style={{ color: C.gray }}>:</span>
                <input
                  type="number" min="0" max="59" placeholder="seg" value={durSec}
                  onChange={(e) => setDurSec(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
                />
              </div>
            </div>
          </div>

          {paceLive && (
            <div className="rounded-xl px-3 py-2 text-sm flex items-center gap-2" style={{ background: `${corrida.color}14`, color: corrida.color }}>
              <Gauge size={15} /> Ritmo médio: {fmtPace(paceLive)} /km
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>FC média (bpm)</label>
              <input
                type="number" placeholder="opcional" value={hr}
                onChange={(e) => setHr(e.target.value)}
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Esforço percebido (RPE): {rpe}</label>
              <input
                type="range" min="1" max="10" value={rpe}
                onChange={(e) => setRpe(parseInt(e.target.value, 10))}
                className="mt-3 w-full accent-teal-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Notas (opcional)</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Como foi o treino?"
              className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
              style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
            />
          </div>

          {error && <div className="text-sm" style={{ color: C.danger }}>{error}</div>}

          <button
            onClick={handleSubmit}
            className="mt-1 w-full rounded-xl py-3 text-sm font-semibold"
            style={{ background: `linear-gradient(135deg, ${corrida.color}, #00AEEF)`, color: C.bg }}
          >
            Salvar treino
          </button>
        </div>
      </div>
    </div>
  );
}
