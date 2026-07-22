import { useState } from "react";
import { CheckCircle2, Gauge, X } from "lucide-react";
import { C, modalityInfo } from "../../../lib/theme";
import { fmtPace, todayStr, uid } from "../../../lib/format";
import { TYPES } from "../constants";
import { computePaceSecKm, createRunningWorkout, mapRunningWorkoutError } from "../runningService";

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
  const [calories, setCalories] = useState("");
  const [rpe, setRpe] = useState(5);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const distNum = parseFloat(distance.replace(",", "."));
  const minNum = durMin === "" ? 0 : parseInt(durMin, 10);
  const secNum = durSec === "" ? 0 : parseInt(durSec, 10);
  const totalSec = minNum * 60 + secNum;
  const paceLive = computePaceSecKm(totalSec, distNum);
  const busy = submitting || success;

  async function handleSubmit() {
    if (busy) return; // evita envio duplicado

    if (!date) return setError("Informe a data do treino.");
    if (!type) return setError("Selecione o tipo de treino.");
    if (!distNum || distNum <= 0) return setError("Informe uma distância válida.");
    if (minNum < 0) return setError("Os minutos não podem ser negativos.");
    if (secNum < 0 || secNum > 59) return setError("Os segundos devem estar entre 0 e 59.");
    if (!totalSec || totalSec <= 0) return setError("Informe o tempo do treino.");
    if (hr && parseInt(hr, 10) <= 0) return setError("Informe uma frequência cardíaca válida.");
    if (calories && parseInt(calories, 10) < 0) return setError("As calorias não podem ser negativas.");

    setError("");
    setSubmitting(true);
    try {
      await createRunningWorkout({
        date,
        type,
        distanceKm: distNum,
        durationSec: totalSec,
        avgHr: hr ? parseInt(hr, 10) : null,
        calories: calories ? parseInt(calories, 10) : null,
        rpe,
        notes: notes.trim() || null,
      });

      setSubmitting(false);
      setSuccess(true);

      // mantém o comportamento já existente (lista mockada local) só depois
      // que o cadastro real no Supabase foi confirmado
      const localWorkout = {
        id: uid(),
        date,
        type,
        distanceKm: distNum,
        durationSec: totalSec,
        avgHr: hr ? parseInt(hr, 10) : null,
        rpe,
        notes: notes.trim(),
      };
      setTimeout(() => onSave(localWorkout), 900);
    } catch (err) {
      setSubmitting(false);
      setError(mapRunningWorkoutError(err));
    }
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
          <button onClick={onClose} disabled={busy} className="rounded-full p-1.5 disabled:opacity-40" style={{ color: C.gray }}>
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Data do treino</label>
            <input
              type="date" value={date} onChange={(e) => setDate(e.target.value)}
              disabled={busy}
              className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none disabled:opacity-60"
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
                  disabled={busy}
                  className="rounded-xl px-2 py-2 text-xs font-semibold transition disabled:opacity-60"
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
                type="text" inputMode="decimal" placeholder="5,00" value={distance}
                onChange={(e) => setDistance(e.target.value)}
                disabled={busy}
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none disabled:opacity-60"
                style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Duração</label>
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="number" min="0" placeholder="min" value={durMin}
                  onChange={(e) => setDurMin(e.target.value)}
                  disabled={busy}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none disabled:opacity-60"
                  style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
                />
                <span style={{ color: C.gray }}>:</span>
                <input
                  type="number" min="0" max="59" placeholder="seg" value={durSec}
                  onChange={(e) => setDurSec(e.target.value)}
                  disabled={busy}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none disabled:opacity-60"
                  style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
                />
              </div>
            </div>
          </div>

          {paceLive !== null && (
            <div className="rounded-xl px-3 py-2 text-sm flex items-center gap-2" style={{ background: `${corrida.color}14`, color: corrida.color }}>
              <Gauge size={15} /> Ritmo médio: {fmtPace(paceLive)} /km
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Frequência cardíaca média</label>
              <input
                type="number" placeholder="145" value={hr}
                onChange={(e) => setHr(e.target.value)}
                disabled={busy}
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none disabled:opacity-60"
                style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Calorias</label>
              <input
                type="number" min="0" placeholder="420" value={calories}
                onChange={(e) => setCalories(e.target.value)}
                disabled={busy}
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none disabled:opacity-60"
                style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Percepção de esforço (RPE): {rpe}</label>
            <input
              type="range" min="1" max="10" value={rpe}
              onChange={(e) => setRpe(parseInt(e.target.value, 10))}
              disabled={busy}
              className="mt-3 w-full accent-teal-400 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Observações (opcional)</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Como foi o treino?"
              disabled={busy}
              className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none disabled:opacity-60"
              style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
            />
          </div>

          {error && <div className="text-sm" style={{ color: C.danger }}>{error}</div>}

          {success && (
            <div className="flex items-center gap-2 text-sm" style={{ color: C.positive }}>
              <CheckCircle2 size={16} /> Treino cadastrado com sucesso!
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={busy}
            className="mt-1 w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${corrida.color}, #00AEEF)`, color: C.bg }}
          >
            {submitting ? "Salvando…" : success ? "Treino cadastrado!" : "Salvar treino"}
          </button>
        </div>
      </div>
    </div>
  );
}
