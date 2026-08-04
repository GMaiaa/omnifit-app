import { useState } from "react";
import { CheckCircle2, ChevronDown, Plus, Trash2, X } from "lucide-react";
import { C } from "../../lib/theme";
import { uid } from "../../lib/format";
import { useLockBodyScroll } from "../../lib/useLockBodyScroll";
import { WORKOUT_MODALITIES, WORKOUT_STATUS } from "../constants";
import { createWorkout, mapCalendarError, updateWorkout } from "../calendarService";

const inputStyle = { background: C.surface2, border: `1px solid ${C.border}`, color: C.white };

function durationParts(durationSec) {
  return {
    m: durationSec ? String(Math.floor(durationSec / 60)) : "",
    s: durationSec ? String(Math.floor(durationSec % 60)) : "",
  };
}

function newBlock() {
  return { id: uid(), title: "", modality: null, durationMin: "", distanceKm: "", notes: "" };
}

function blockFromExisting(b) {
  return {
    id: b.id,
    title: b.title,
    modality: b.modality,
    durationMin: b.durationSec ? String(Math.round(b.durationSec / 60)) : "",
    distanceKm: b.distanceM ? String(b.distanceM / 1000).replace(".", ",") : "",
    notes: b.notes || "",
  };
}

/* ---------------------------------------------------------
   WORKOUT FORM — cria ou edita um treino planejado no calendário
   (initial = null cria, initial = treino existente edita). Reagendar é só
   editar a data por aqui: a trigger do banco já registra isso como
   "rescheduled" no histórico sozinha, sem precisar de uma tela separada.
--------------------------------------------------------- */
export function WorkoutForm({ initial, defaultDate, calendarId, onSave, onClose }) {
  useLockBodyScroll();
  const isEdit = !!initial;
  const initialDuration = durationParts(initial?.durationSec);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [modality, setModality] = useState(initial?.modality ?? null);
  const [date, setDate] = useState(initial?.scheduledDate ?? defaultDate);
  const [time, setTime] = useState(initial?.scheduledTime ?? "");
  const [durMin, setDurMin] = useState(initialDuration.m);
  const [durSec, setDurSec] = useState(initialDuration.s);
  const [status, setStatus] = useState(initial?.status ?? "planned");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [blocks, setBlocks] = useState(() => (initial?.blocks ?? []).map(blockFromExisting));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const busy = submitting || success;

  function addBlock() {
    setBlocks((prev) => [...prev, newBlock()]);
  }
  function updateBlock(id, patch) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }
  function removeBlock(id) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  async function handleSubmit() {
    if (busy) return;
    if (!title.trim()) return setError("Dê um título para o treino.");
    if (!date) return setError("Escolha uma data para o treino.");
    setError("");

    const minNum = durMin === "" ? 0 : parseInt(durMin, 10);
    const secNum = durSec === "" ? 0 : parseInt(durSec, 10);
    const totalSec = minNum * 60 + secNum;

    const payload = {
      calendarId,
      title: title.trim(),
      description: description.trim() || null,
      modality,
      scheduledDate: date,
      scheduledTime: time || null,
      durationSec: totalSec > 0 ? totalSec : null,
      status,
      notes: notes.trim() || null,
      blocks: blocks
        .filter((b) => b.title.trim())
        .map((b) => ({
          title: b.title.trim(),
          modality: b.modality,
          durationSec: b.durationMin ? parseInt(b.durationMin, 10) * 60 : null,
          distanceM: b.distanceKm ? parseFloat(b.distanceKm.replace(",", ".")) * 1000 : null,
          notes: b.notes.trim() || null,
        })),
    };

    setSubmitting(true);
    try {
      const saved = isEdit ? await updateWorkout(initial.id, payload) : await createWorkout(payload);
      setSubmitting(false);
      setSuccess(true);
      setTimeout(() => onSave(saved), 700);
    } catch (err) {
      setSubmitting(false);
      setError(mapCalendarError(err, isEdit ? "Não foi possível salvar as alterações. Tente novamente." : "Não foi possível criar o treino. Tente novamente."));
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
            {isEdit ? "Editar treino" : "Novo treino"}
          </h2>
          <button onClick={onClose} disabled={busy} className="rounded-full p-1.5 disabled:opacity-40" style={{ color: C.gray }}>
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Título</label>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Treino de pernas, Corrida longa…"
              disabled={busy}
              className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none disabled:opacity-60"
              style={inputStyle}
            />
          </div>

          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Modalidade</label>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {WORKOUT_MODALITIES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModality(modality === m.id ? null : m.id)}
                  disabled={busy}
                  className="rounded-lg px-2 py-1.5 text-xs font-semibold transition disabled:opacity-60"
                  style={{
                    background: modality === m.id ? `${m.color}26` : C.surface2,
                    color: modality === m.id ? m.color : C.gray,
                    border: `1px solid ${modality === m.id ? m.color : C.border}`,
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Data</label>
              <input
                type="date" value={date} onChange={(e) => setDate(e.target.value)}
                disabled={busy}
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none disabled:opacity-60"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Horário (opcional)</label>
              <input
                type="time" value={time} onChange={(e) => setTime(e.target.value)}
                disabled={busy}
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none disabled:opacity-60"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Duração prevista (opcional)</label>
            <div className="mt-1 flex items-center gap-1 w-1/2">
              <input
                type="number" min="0" placeholder="min" value={durMin}
                onChange={(e) => setDurMin(e.target.value)}
                disabled={busy}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-center outline-none disabled:opacity-60"
                style={inputStyle}
              />
              <span style={{ color: C.gray }}>:</span>
              <input
                type="number" min="0" max="59" placeholder="seg" value={durSec}
                onChange={(e) => setDurSec(e.target.value)}
                disabled={busy}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-center outline-none disabled:opacity-60"
                style={inputStyle}
              />
            </div>
          </div>

          {isEdit && (
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Status</label>
              <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                {WORKOUT_STATUS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStatus(s.id)}
                    disabled={busy}
                    className="rounded-lg px-2 py-1.5 text-xs font-semibold transition disabled:opacity-60"
                    style={{
                      background: status === s.id ? `${s.color}26` : C.surface2,
                      color: status === s.id ? s.color : C.gray,
                      border: `1px solid ${status === s.id ? s.color : C.border}`,
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Descrição (opcional)</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              placeholder="O que fazer nesse treino"
              disabled={busy}
              className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none disabled:opacity-60"
              style={inputStyle}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold" style={{ color: C.gray }}>
                Etapas / exercícios (opcional)
              </label>
              <span className="text-xs" style={{ color: C.gray }}>{blocks.length}</span>
            </div>

            <div className="flex flex-col gap-2">
              {blocks.map((b) => (
                <div key={b.id} className="rounded-xl px-3 py-2.5 flex flex-col gap-2" style={{ background: C.surface2, border: `1px solid ${C.borderSoft}` }}>
                  <div className="flex items-center gap-2">
                    <input
                      type="text" value={b.title} onChange={(e) => updateBlock(b.id, { title: e.target.value })}
                      placeholder="ex: Natação 1500m"
                      disabled={busy}
                      className="flex-1 min-w-0 rounded-lg px-2.5 py-1.5 text-sm outline-none disabled:opacity-60"
                      style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.white }}
                    />
                    <button onClick={() => removeBlock(b.id)} disabled={busy} className="p-1 rounded-lg flex-shrink-0 disabled:opacity-40" style={{ color: C.gray }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 min-w-0">
                      <select
                        value={b.modality ?? ""} onChange={(e) => updateBlock(b.id, { modality: e.target.value || null })}
                        disabled={busy}
                        className="w-full appearance-none rounded-lg pl-2.5 pr-7 py-1.5 text-xs outline-none disabled:opacity-60"
                        style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.white }}
                      >
                        <option value="">Modalidade</option>
                        {WORKOUT_MODALITIES.map((m) => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: C.gray }} />
                    </div>
                    <input
                      type="number" min="0" placeholder="min" value={b.durationMin}
                      onChange={(e) => updateBlock(b.id, { durationMin: e.target.value })}
                      disabled={busy}
                      className="w-16 rounded-lg px-2 py-1.5 text-xs text-center outline-none disabled:opacity-60"
                      style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.white }}
                    />
                    <input
                      type="text" inputMode="decimal" placeholder="km" value={b.distanceKm}
                      onChange={(e) => {
                        const raw = e.target.value.replace(",", ".");
                        if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
                        updateBlock(b.id, { distanceKm: raw });
                      }}
                      disabled={busy}
                      className="w-16 rounded-lg px-2 py-1.5 text-xs text-center outline-none disabled:opacity-60"
                      style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.white }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addBlock}
              disabled={busy}
              className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold disabled:opacity-60"
              style={{ background: `color-mix(in srgb, ${C.positive} 10%, transparent)`, color: C.positive, border: `1px dashed color-mix(in srgb, ${C.positive} 40%, transparent)` }}
            >
              <Plus size={14} /> Adicionar etapa
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Observações (opcional)</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Alguma anotação sobre esse treino"
              disabled={busy}
              className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none disabled:opacity-60"
              style={inputStyle}
            />
          </div>

          {error && <div className="text-sm" style={{ color: C.danger }}>{error}</div>}

          {success && (
            <div className="flex items-center gap-2 text-sm" style={{ color: C.positive }}>
              <CheckCircle2 size={16} /> {isEdit ? "Treino atualizado com sucesso!" : "Treino criado com sucesso!"}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={busy}
            className="mt-1 w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${C.positive}, #00AEEF)`, color: C.bg }}
          >
            {submitting
              ? "Salvando…"
              : success
                ? (isEdit ? "Treino atualizado!" : "Treino criado!")
                : (isEdit ? "Salvar alterações" : "Criar treino")}
          </button>
        </div>
      </div>
    </div>
  );
}
