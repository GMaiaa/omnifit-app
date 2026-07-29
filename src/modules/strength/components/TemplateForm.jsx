import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";
import { C, modalityInfo } from "../../../lib/theme";
import { uid } from "../../../lib/format";
import { useLockBodyScroll } from "../../../lib/useLockBodyScroll";
import { DEFAULT_SETS, muscleGroupInfo } from "../constants";
import { createStrengthTemplate, mapStrengthError, updateStrengthTemplate } from "../strengthService";
import { ExercisePicker } from "./ExercisePicker";

const musculacao = modalityInfo("musculacao");

function newExerciseRow(entry) {
  return {
    id: uid(),
    catalogId: entry.catalogId,
    name: entry.name,
    muscleGroup: entry.muscleGroup,
    equipment: entry.equipment,
    notes: "",
    defaultSets: DEFAULT_SETS,
  };
}

/* ---------------------------------------------------------
   CREATE / EDIT TEMPLATE ("ficha") — bottom-sheet, same shell as
   running/WorkoutForm.jsx. Criação e edição batem direto em
   public.strength_templates — ver strengthService.js.
--------------------------------------------------------- */
export function TemplateForm({ initial, onSave, onClose }) {
  useLockBodyScroll();
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [exercises, setExercises] = useState(initial?.exercises ?? []);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const busy = submitting || success;

  function addExercise(entry) {
    setExercises((prev) => [...prev, newExerciseRow(entry)]);
    setShowPicker(false);
  }

  function removeExercise(id) {
    setExercises((prev) => prev.filter((e) => e.id !== id));
  }

  function updateExercise(id, patch) {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function move(id, dir) {
    setExercises((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  async function handleSubmit() {
    if (busy) return; // evita envio duplicado
    if (!name.trim()) return setError("Dê um nome para o treino.");
    if (exercises.length === 0) return setError("Adicione pelo menos um exercício.");
    setError("");

    const orderedExercises = exercises.map((e, i) => ({ ...e, order: i }));

    setSubmitting(true);
    try {
      const savedTemplate = isEdit
        ? await updateStrengthTemplate(initial.id, { name: name.trim(), exercises: orderedExercises })
        : await createStrengthTemplate({ name: name.trim(), exercises: orderedExercises });
      setSubmitting(false);
      setSuccess(true);

      // usa o registro retornado pelo Supabase (id/created_at/updated_at
      // reais) para incluir no estado compartilhado — nada de reconsultar
      // a lista inteira.
      setTimeout(() => onSave(savedTemplate), 900);
    } catch (err) {
      setSubmitting(false);
      setError(mapStrengthError(err, isEdit ? "Não foi possível salvar as alterações. Tente novamente." : "Não foi possível cadastrar o treino. Tente novamente."));
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
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Nome do treino</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="ex: Treino A — Costas e Bíceps"
              disabled={busy}
              className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none disabled:opacity-60"
              style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Exercícios</label>
              <span className="text-xs" style={{ color: C.gray }}>{exercises.length}</span>
            </div>

            <div className="flex flex-col gap-2">
              {exercises.map((ex, i) => {
                const group = muscleGroupInfo(ex.muscleGroup);
                return (
                  <div key={ex.id} className="rounded-xl px-3 py-2.5" style={{ background: C.surface2, border: `1px solid ${C.borderSoft}` }}>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <button onClick={() => move(ex.id, -1)} disabled={busy || i === 0} className="p-0.5 disabled:opacity-20" style={{ color: C.gray }}>
                          <ChevronUp size={13} />
                        </button>
                        <button onClick={() => move(ex.id, 1)} disabled={busy || i === exercises.length - 1} className="p-0.5 disabled:opacity-20" style={{ color: C.gray }}>
                          <ChevronDown size={13} />
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: C.white }}>{ex.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs" style={{ color: group.color }}>
                          {group.label}
                          <span style={{ color: C.gray }}>• {ex.equipment}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs" style={{ color: C.gray }}>séries</span>
                        <input
                          type="number" min="1" max="10" value={ex.defaultSets}
                          onChange={(e) => {
                            const raw = e.target.value;
                            updateExercise(ex.id, { defaultSets: raw === "" ? "" : Math.max(1, parseInt(raw, 10) || 1) });
                          }}
                          onBlur={(e) => {
                            if (e.target.value === "") updateExercise(ex.id, { defaultSets: DEFAULT_SETS });
                          }}
                          disabled={busy}
                          className="w-12 rounded-lg px-1.5 py-1 text-xs text-center outline-none disabled:opacity-60"
                          style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.white }}
                        />
                      </div>
                      <button onClick={() => removeExercise(ex.id)} disabled={busy} className="p-1 rounded-lg flex-shrink-0 disabled:opacity-40" style={{ color: C.gray }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowPicker(true)}
              disabled={busy}
              className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"
              style={{ background: `${musculacao.color}14`, color: musculacao.color, border: `1px dashed ${musculacao.color}55` }}
            >
              <Plus size={15} /> Adicionar exercício
            </button>
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
            style={{ background: `linear-gradient(135deg, ${musculacao.color}, #5B21B6)`, color: C.white }}
          >
            {submitting
              ? "Salvando…"
              : success
                ? (isEdit ? "Treino atualizado!" : "Treino criado!")
                : (isEdit ? "Salvar alterações" : "Criar treino")}
          </button>
        </div>
      </div>

      {showPicker && <ExercisePicker onSelect={addExercise} onClose={() => setShowPicker(false)} />}
    </div>
  );
}
