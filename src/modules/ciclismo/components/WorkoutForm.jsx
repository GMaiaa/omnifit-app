import { useState } from "react";
import { Gauge, X } from "lucide-react";
import { C, modalityInfo } from "../../../lib/theme";
import { fmtSpeed, todayStr } from "../../../lib/format";
import { useLockBodyScroll } from "../../../lib/useLockBodyScroll";
import { TYPES } from "../constants";
import { createCyclingWorkout, updateCyclingWorkout, mapCyclingWorkoutError } from "../cyclingService";

const ciclismo = modalityInfo("ciclismo");

/* ---------------------------------------------------------
   NEW / EDIT WORKOUT FORM
   Salva de fato em public.cycling_workouts (Supabase) e só chama onSave
   com o registro já retornado pelo insert/update (id e created_at reais) —
   mesmo padrão do WorkoutForm de corrida.
--------------------------------------------------------- */
export function WorkoutForm({ initial, onSave, onClose }) {
  useLockBodyScroll();
  const [date, setDate] = useState(initial?.date ?? todayStr());
  const [type, setType] = useState(initial?.type ?? "endurance");
  const [distance, setDistance] = useState(initial ? String(initial.distanceKm).replace(".", ",") : "");
  const [durMin, setDurMin] = useState(initial ? String(Math.floor(initial.durationSec / 60)) : "");
  const [durSec, setDurSec] = useState(initial ? String(initial.durationSec % 60) : "");
  const [elevation, setElevation] = useState(initial?.elevationGainM ? String(initial.elevationGainM) : "");
  const [hr, setHr] = useState(initial?.avgHr ? String(initial.avgHr) : "");
  const [rpe, setRpe] = useState(initial?.rpe ?? 5);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const distNum = parseFloat(distance.replace(",", "."));
  const totalSec = (parseInt(durMin || 0, 10) * 60) + parseInt(durSec || 0, 10);
  const speedLive = distNum > 0 && totalSec > 0 ? distNum / (totalSec / 3600) : null;

  async function handleSubmit() {
    if (!distNum || distNum <= 0) return setError("Informe uma distância válida.");
    if (!totalSec || totalSec <= 0) return setError("Informe o tempo do treino.");
    setError("");
    setSaving(true);

    const payload = {
      date,
      type,
      distanceKm: distNum,
      durationSec: totalSec,
      elevationGainM: elevation ? parseInt(elevation, 10) : null,
      avgHr: hr ? parseInt(hr, 10) : null,
      rpe,
      notes: notes.trim() || null,
    };

    try {
      const saved = initial
        ? await updateCyclingWorkout(initial.id, payload)
        : await createCyclingWorkout(payload);
      onSave(saved);
    } catch (err) {
      setError(mapCyclingWorkoutError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(3,7,18,0.7)" }}>
      <div
        className="w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-6"
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
                type="text" inputMode="decimal" placeholder="ex: 42,50" value={distance}
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

          {speedLive && (
            <div className="rounded-xl px-3 py-2 text-sm flex items-center gap-2" style={{ background: `${ciclismo.color}14`, color: ciclismo.color }}>
              <Gauge size={15} /> Velocidade média: {fmtSpeed(speedLive)} km/h
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Ganho de elevação (m)</label>
              <input
                type="number" min="0" placeholder="opcional" value={elevation}
                onChange={(e) => setElevation(e.target.value)}
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>FC média (bpm)</label>
              <input
                type="number" placeholder="opcional" value={hr}
                onChange={(e) => setHr(e.target.value)}
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Esforço percebido (RPE): {rpe}</label>
            <input
              type="range" min="1" max="10" value={rpe}
              onChange={(e) => setRpe(parseInt(e.target.value, 10))}
              className="mt-3 w-full accent-teal-400"
            />
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
            disabled={saving}
            className="mt-1 w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${ciclismo.color}, #FBBF24)`, color: C.bg }}
          >
            {saving ? "Salvando…" : "Salvar treino"}
          </button>
        </div>
      </div>
    </div>
  );
}
