import { useState } from "react";
import { CheckCircle2, Circle, MinusCircle, Plus, Trash2, X } from "lucide-react";
import { C, modalityInfo } from "../../../lib/theme";
import { uid } from "../../../lib/format";
import { useLockBodyScroll } from "../../../lib/useLockBodyScroll";
import { muscleGroupInfo } from "../constants";

const musculacao = modalityInfo("musculacao");

function durationParts(durationSec) {
  return {
    h: String(Math.floor((durationSec || 0) / 3600)),
    m: String(Math.floor(((durationSec || 0) % 3600) / 60)),
    s: String(Math.floor((durationSec || 0) % 60)),
  };
}

function emptySet() {
  return { id: uid(), weight: null, reps: null, status: "pending", notes: "" };
}

/* ---------------------------------------------------------
   SESSION EDITOR — corrige uma execução já registrada (data, duração,
   notas, cargas/reps de cada série). Diferente do SessionRunner: sem
   cronômetro, sem timer de descanso e sem troca de ficha — é só a correção
   pontual de um treino que já aconteceu.
--------------------------------------------------------- */
export function SessionEditor({ session, onSave, onClose }) {
  useLockBodyScroll();
  const initialDuration = durationParts(session.durationSec);

  const [date, setDate] = useState(session.date);
  const [durHour, setDurHour] = useState(initialDuration.h);
  const [durMin, setDurMin] = useState(initialDuration.m);
  const [durSec, setDurSec] = useState(initialDuration.s);
  const [notes, setNotes] = useState(session.notes || "");
  const [exercises, setExercises] = useState(() =>
    session.exercises.map((ex) => ({ ...ex, sets: ex.sets.map((s) => ({ ...s })) }))
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateSet(exId, setId, patch) {
    setExercises((prev) => prev.map((ex) => (ex.id !== exId ? ex : {
      ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
    })));
  }
  function addSet(exId) {
    setExercises((prev) => prev.map((ex) => (ex.id !== exId ? ex : { ...ex, sets: [...ex.sets, emptySet()] })));
  }
  function removeSet(exId, setId) {
    setExercises((prev) => prev.map((ex) => (ex.id !== exId ? ex : { ...ex, sets: ex.sets.filter((s) => s.id !== setId) })));
  }
  function toggleDone(exId, setId) {
    setExercises((prev) => prev.map((ex) => (ex.id !== exId ? ex : {
      ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, status: s.status === "done" ? "pending" : "done" } : s)),
    })));
  }
  function toggleSkip(exId, setId) {
    setExercises((prev) => prev.map((ex) => (ex.id !== exId ? ex : {
      ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, status: s.status === "skipped" ? "pending" : "skipped" } : s)),
    })));
  }
  function removeExercise(exId) {
    setExercises((prev) => prev.filter((ex) => ex.id !== exId));
  }

  function normalizeForSave() {
    return exercises
      .map((ex) => ({
        ...ex,
        sets: ex.sets
          .map((s) => {
            const weight = s.weight === null || s.weight === "" ? null : parseFloat(s.weight);
            if (s.status === "skipped") return { ...s, weight, reps: s.reps ?? null };
            if (weight > 0 && s.reps > 0) return { ...s, weight, status: "done" };
            return null; // vazio, nunca preenchido — descarta
          })
          .filter(Boolean),
      }))
      .filter((ex) => ex.sets.length > 0);
  }

  async function handleSubmit() {
    if (saving) return;
    const finalExercises = normalizeForSave();
    if (finalExercises.length === 0) return setError("Mantenha pelo menos uma série registrada.");

    const hourNum = durHour === "" ? 0 : parseInt(durHour, 10);
    const minNum = durMin === "" ? 0 : parseInt(durMin, 10);
    const secNum = durSec === "" ? 0 : parseInt(durSec, 10);
    const durationSec = hourNum * 3600 + minNum * 60 + secNum;

    setError("");
    setSaving(true);
    try {
      await onSave({
        id: session.id,
        templateId: session.templateId,
        templateName: session.templateName,
        date,
        startedAt: session.startedAt,
        finishedAt: session.finishedAt,
        durationSec,
        notes: notes.trim() || null,
        exercises: finalExercises,
      });
    } catch (err) {
      setSaving(false);
      setError(err?.message || "Não foi possível salvar as alterações. Tente novamente.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: C.bg }}>
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3.5" style={{ background: `color-mix(in srgb, ${C.bg} 95%, transparent)`, borderBottom: `1px solid ${C.border}`, backdropFilter: "blur(8px)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} disabled={saving} className="p-1.5 rounded-full flex-shrink-0 disabled:opacity-40" style={{ color: C.gray }}>
            <X size={20} />
          </button>
          <div className="text-sm font-semibold truncate" style={{ color: C.white, fontFamily: "'Poppins', sans-serif" }}>
            Editar treino
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col gap-3 max-w-2xl w-full mx-auto">
        <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Data</label>
              <input
                type="date" value={date} onChange={(e) => setDate(e.target.value)}
                disabled={saving}
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none disabled:opacity-60"
                style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Duração (h:min:seg)</label>
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="number" min="0" placeholder="h" value={durHour}
                  onChange={(e) => setDurHour(e.target.value)}
                  disabled={saving}
                  className="w-full rounded-xl px-2 py-2.5 text-sm text-center outline-none disabled:opacity-60"
                  style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
                />
                <span style={{ color: C.gray }}>:</span>
                <input
                  type="number" min="0" max="59" placeholder="min" value={durMin}
                  onChange={(e) => setDurMin(e.target.value)}
                  disabled={saving}
                  className="w-full rounded-xl px-2 py-2.5 text-sm text-center outline-none disabled:opacity-60"
                  style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
                />
                <span style={{ color: C.gray }}>:</span>
                <input
                  type="number" min="0" max="59" placeholder="seg" value={durSec}
                  onChange={(e) => setDurSec(e.target.value)}
                  disabled={saving}
                  className="w-full rounded-xl px-2 py-2.5 text-sm text-center outline-none disabled:opacity-60"
                  style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
                />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Observações (opcional)</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              disabled={saving}
              placeholder="Como foi o treino?"
              className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none disabled:opacity-60"
              style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
            />
          </div>
        </div>

        {exercises.map((ex) => {
          const group = muscleGroupInfo(ex.muscleGroup);
          return (
            <div key={ex.id} className="rounded-2xl p-4" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <div className="flex items-start gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold" style={{ color: C.white, fontFamily: "'Poppins', sans-serif" }}>{ex.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs" style={{ color: group.color }}>
                    {group.label}<span style={{ color: C.gray }}>• {ex.equipment}</span>
                  </div>
                </div>
                <button onClick={() => removeExercise(ex.id)} disabled={saving} className="p-1.5 rounded-lg disabled:opacity-40" style={{ color: C.gray }}>
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                {ex.sets.map((s, si) => {
                  const skipped = s.status === "skipped";
                  const done = s.status === "done";
                  return (
                    <div key={s.id} className="flex items-center gap-2 rounded-lg" style={{ opacity: skipped ? 0.45 : 1 }}>
                      <span className="text-xs w-4 flex-shrink-0" style={{ color: C.gray }}>{si + 1}</span>
                      <input
                        type="text" inputMode="decimal" placeholder="kg" value={s.weight ?? ""}
                        disabled={skipped || saving}
                        onChange={(e) => {
                          const raw = e.target.value.replace(",", ".");
                          if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
                          updateSet(ex.id, s.id, { weight: raw === "" ? null : raw });
                        }}
                        className="w-16 rounded-lg px-2 py-2 text-sm text-center outline-none"
                        style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
                      />
                      <span style={{ color: C.gray, fontSize: 12 }}>×</span>
                      <input
                        type="number" inputMode="numeric" placeholder="reps" value={s.reps ?? ""}
                        disabled={skipped || saving}
                        onChange={(e) => updateSet(ex.id, s.id, { reps: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
                        className="w-16 rounded-lg px-2 py-2 text-sm text-center outline-none"
                        style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
                      />
                      <button onClick={() => toggleDone(ex.id, s.id)} disabled={saving} className="p-1 flex-shrink-0">
                        {done ? <CheckCircle2 size={20} style={{ color: musculacao.color }} /> : <Circle size={20} style={{ color: C.gray }} />}
                      </button>
                      <button onClick={() => toggleSkip(ex.id, s.id)} disabled={saving} className="p-1 flex-shrink-0">
                        <MinusCircle size={16} style={{ color: skipped ? C.amber : C.gray }} />
                      </button>
                      <button onClick={() => removeSet(ex.id, s.id)} disabled={saving} className="p-1 flex-shrink-0 ml-auto">
                        <Trash2 size={13} style={{ color: C.gray }} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => addSet(ex.id)}
                disabled={saving}
                className="mt-2 flex items-center gap-1 text-xs font-semibold disabled:opacity-40"
                style={{ color: musculacao.color }}
              >
                <Plus size={13} /> Série
              </button>
            </div>
          );
        })}

        {error && <div className="text-sm text-center" style={{ color: C.danger }}>{error}</div>}
      </div>

      <div className="sticky bottom-0 px-4 sm:px-6 py-4" style={{ background: `color-mix(in srgb, ${C.bg} 95%, transparent)`, borderTop: `1px solid ${C.border}`, backdropFilter: "blur(8px)" }}>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full max-w-2xl mx-auto flex items-center justify-center rounded-xl py-3.5 text-sm font-semibold disabled:opacity-60"
          style={{ background: `linear-gradient(135deg, ${musculacao.color}, #5B21B6)`, color: C.white }}
        >
          {saving ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}
