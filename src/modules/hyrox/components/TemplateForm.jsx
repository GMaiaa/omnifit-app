import { useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";
import { C, modalityInfo } from "../../../lib/theme";
import { uid } from "../../../lib/format";
import { useLockBodyScroll } from "../../../lib/useLockBodyScroll";
import { DEFAULT_ROUNDS, FOCUS, categoryInfo, targetTypeInfo, targetTypesFor } from "../constants";
import { ExercisePicker } from "./ExercisePicker";

const hyrox = modalityInfo("hyrox");

function newBlock() {
  return { id: uid(), rounds: DEFAULT_ROUNDS, exercises: [] };
}

function newExerciseRow(entry) {
  return {
    id: uid(),
    catalogId: entry.catalogId,
    name: entry.name,
    category: entry.category,
    metricType: entry.metricType,
    notes: "",
    target: { type: targetTypesFor(entry)[0], value: null },
  };
}

/* Meta ("target") planejada para o exercício — separada do que será
   registrado na execução. Só mostra o seletor de tipo quando o exercício
   aceita mais de uma opção (ex: ergômetro = distância ou calorias). */
function TargetEditor({ exercise, onChange }) {
  const options = targetTypesFor(exercise);
  const target = exercise.target?.type && options.includes(exercise.target.type)
    ? exercise.target
    : { type: options[0], value: exercise.target?.value ?? null };
  const unit = targetTypeInfo(target.type).unit;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[10px] font-semibold" style={{ color: C.gray }}>Meta</span>
      {options.length > 1 && (
        <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => onChange({ target: { type: opt, value: target.value } })}
              className="px-2 py-1 text-[10px] font-semibold"
              style={{
                background: target.type === opt ? `${hyrox.color}26` : "transparent",
                color: target.type === opt ? hyrox.color : C.gray,
              }}
            >
              {targetTypeInfo(opt).label}
            </button>
          ))}
        </div>
      )}
      <input
        type="number" inputMode="decimal" placeholder={unit}
        value={target.value ?? ""}
        onChange={(e) => onChange({ target: { type: target.type, value: e.target.value === "" ? null : parseFloat(e.target.value) } })}
        className="w-16 rounded-lg px-2 py-1 text-xs text-center outline-none"
        style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.white }}
      />
      <span className="text-[10px]" style={{ color: C.gray }}>{unit}</span>
    </div>
  );
}

/* ---------------------------------------------------------
   CREATE / EDIT TEMPLATE ("ficha") — organizada em blocos (circuitos): cada
   bloco tem um número de voltas compartilhado entre todos os exercícios que
   ele contém (ex: Bloco 1 = Corrida + SkiErg × 3 voltas, alternando os dois
   a cada volta). Mesmo shell de bottom-sheet do strength/TemplateForm.jsx.
--------------------------------------------------------- */
export function TemplateForm({ initial, onSave, onClose }) {
  useLockBodyScroll();
  const [name, setName] = useState(initial?.name ?? "");
  const [focus, setFocus] = useState(initial?.focus ?? FOCUS[0].id);
  const [blocks, setBlocks] = useState(initial?.blocks?.length ? initial.blocks : [newBlock()]);
  const [pickerBlockId, setPickerBlockId] = useState(null);
  const [error, setError] = useState("");

  function addBlock() {
    setBlocks((prev) => [...prev, newBlock()]);
  }
  function removeBlock(blockId) {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  }
  function updateBlock(blockId, patch) {
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, ...patch } : b)));
  }
  function moveBlock(blockId, dir) {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === blockId);
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function addExercise(entry) {
    setBlocks((prev) => prev.map((b) => (b.id !== pickerBlockId ? b : { ...b, exercises: [...b.exercises, newExerciseRow(entry)] })));
    setPickerBlockId(null);
  }
  function removeExercise(blockId, exerciseId) {
    setBlocks((prev) => prev.map((b) => (b.id !== blockId ? b : { ...b, exercises: b.exercises.filter((e) => e.id !== exerciseId) })));
  }
  function updateExercise(blockId, exerciseId, patch) {
    setBlocks((prev) => prev.map((b) => (b.id !== blockId ? b : {
      ...b, exercises: b.exercises.map((e) => (e.id === exerciseId ? { ...e, ...patch } : e)),
    })));
  }
  function moveExercise(blockId, exerciseId, dir) {
    setBlocks((prev) => prev.map((b) => {
      if (b.id !== blockId) return b;
      const idx = b.exercises.findIndex((e) => e.id === exerciseId);
      const target = idx + dir;
      if (target < 0 || target >= b.exercises.length) return b;
      const next = [...b.exercises];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...b, exercises: next };
    }));
  }

  function handleSubmit() {
    if (!name.trim()) return setError("Dê um nome para o treino.");
    const nonEmptyBlocks = blocks.filter((b) => b.exercises.length > 0);
    if (nonEmptyBlocks.length === 0) return setError("Adicione pelo menos um bloco com um exercício.");
    setError("");
    const now = new Date().toISOString();
    onSave({
      id: initial?.id ?? uid(),
      name: name.trim(),
      focus,
      blocks: nonEmptyBlocks.map((b, i) => ({
        id: b.id,
        order: i,
        rounds: Math.max(1, b.rounds || DEFAULT_ROUNDS),
        exercises: b.exercises.map((e, j) => ({ ...e, order: j })),
      })),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(3,7,18,0.7)" }}>
      <div
        className="w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-6"
        style={{ background: C.bgSoft, border: `1px solid ${C.border}` }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 20, color: C.white }}>
            {initial ? "Editar treino" : "Novo treino"}
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5" style={{ color: C.gray }}>
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Nome do treino</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="ex: HYROX Base"
              className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Objetivo</label>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {FOCUS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFocus(f.id)}
                  className="rounded-lg px-2 py-1.5 text-xs font-semibold transition"
                  style={{
                    background: focus === f.id ? `${f.color}26` : C.surface2,
                    color: focus === f.id ? f.color : C.gray,
                    border: `1px solid ${focus === f.id ? f.color : C.border}`,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Blocos</label>

            <div className="mt-1.5 flex flex-col gap-3">
              {blocks.map((b, i) => (
                <div key={b.id} className="rounded-xl p-3" style={{ background: C.surface2, border: `1px solid ${C.borderSoft}` }}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="flex flex-col">
                      <button onClick={() => moveBlock(b.id, -1)} disabled={i === 0} className="p-0.5 disabled:opacity-20" style={{ color: C.gray }}>
                        <ChevronUp size={13} />
                      </button>
                      <button onClick={() => moveBlock(b.id, 1)} disabled={i === blocks.length - 1} className="p-0.5 disabled:opacity-20" style={{ color: C.gray }}>
                        <ChevronDown size={13} />
                      </button>
                    </div>
                    <div className="text-sm font-semibold flex-1" style={{ color: C.white, fontFamily: "'Poppins', sans-serif" }}>
                      Bloco {i + 1}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs" style={{ color: C.gray }}>voltas</span>
                      <input
                        type="number" min="1" max="20" value={b.rounds}
                        onChange={(e) => updateBlock(b.id, { rounds: Math.max(1, parseInt(e.target.value || 1, 10)) })}
                        className="w-12 rounded-lg px-1.5 py-1 text-xs text-center outline-none"
                        style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.white }}
                      />
                    </div>
                    {blocks.length > 1 && (
                      <button onClick={() => removeBlock(b.id)} className="p-1 rounded-lg flex-shrink-0" style={{ color: C.gray }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {b.exercises.map((e, j) => {
                      const category = categoryInfo(e.category);
                      return (
                        <div key={e.id} className="rounded-lg px-2.5 py-2" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col">
                              <button onClick={() => moveExercise(b.id, e.id, -1)} disabled={j === 0} className="p-0.5 disabled:opacity-20" style={{ color: C.gray }}>
                                <ChevronUp size={11} />
                              </button>
                              <button onClick={() => moveExercise(b.id, e.id, 1)} disabled={j === b.exercises.length - 1} className="p-0.5 disabled:opacity-20" style={{ color: C.gray }}>
                                <ChevronDown size={11} />
                              </button>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold truncate" style={{ color: C.white }}>{e.name}</div>
                              <div className="text-[10px] mt-0.5" style={{ color: category.color }}>{category.label}</div>
                            </div>
                            <button onClick={() => removeExercise(b.id, e.id)} className="p-1 rounded-lg flex-shrink-0" style={{ color: C.gray }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <div className="mt-2 pl-5">
                            <TargetEditor exercise={e} onChange={(patch) => updateExercise(b.id, e.id, patch)} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setPickerBlockId(b.id)}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold"
                    style={{ background: `${hyrox.color}14`, color: hyrox.color, border: `1px dashed ${hyrox.color}55` }}
                  >
                    <Plus size={13} /> Exercício
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addBlock}
              className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold"
              style={{ background: `${hyrox.color}14`, color: hyrox.color, border: `1px dashed ${hyrox.color}55` }}
            >
              <Plus size={15} /> Adicionar bloco
            </button>
          </div>

          {error && <div className="text-sm" style={{ color: C.danger }}>{error}</div>}

          <button
            onClick={handleSubmit}
            className="mt-1 w-full rounded-xl py-3 text-sm font-semibold"
            style={{ background: `linear-gradient(135deg, ${hyrox.color}, #4D7C0F)`, color: C.bg }}
          >
            {initial ? "Salvar alterações" : "Criar treino"}
          </button>
        </div>
      </div>

      {pickerBlockId && <ExercisePicker onSelect={addExercise} onClose={() => setPickerBlockId(null)} />}
    </div>
  );
}
