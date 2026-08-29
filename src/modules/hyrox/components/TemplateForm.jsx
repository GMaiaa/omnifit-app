import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";
import { C, modalityInfo } from "../../../lib/theme";
import { uid } from "../../../lib/format";
import { useLockBodyScroll } from "../../../lib/useLockBodyScroll";
import { DEFAULT_ROUNDS, FOCUS, categoryInfo } from "../constants";
import { createHyroxTemplate, mapHyroxError, updateHyroxTemplate } from "../hyroxService";
import { ExercisePicker } from "./ExercisePicker";

const hyrox = modalityInfo("hyrox");

function newBlockRow(entry) {
  return {
    id: uid(),
    catalogId: entry.catalogId,
    name: entry.name,
    category: entry.category,
    metricType: entry.metricType,
    notes: "",
    rounds: DEFAULT_ROUNDS,
  };
}

/* ---------------------------------------------------------
   CREATE / EDIT TEMPLATE ("ficha") — bottom-sheet, same shell as
   strength/TemplateForm.jsx, com blocos em vez de exercícios com séries.
--------------------------------------------------------- */
export function TemplateForm({ initial, onSave, onClose }) {
  useLockBodyScroll();
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [focus, setFocus] = useState(initial?.focus ?? FOCUS[0].id);
  const [blocks, setBlocks] = useState(initial?.blocks ?? []);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const busy = submitting || success;

  function addBlock(entry) {
    setBlocks((prev) => [...prev, newBlockRow(entry)]);
    setShowPicker(false);
  }

  function removeBlock(id) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  function updateBlock(id, patch) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function move(id, dir) {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
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
    if (blocks.length === 0) return setError("Adicione pelo menos um bloco.");
    setError("");

    const orderedBlocks = blocks.map((b, i) => ({ ...b, order: i }));

    setSubmitting(true);
    try {
      const savedTemplate = isEdit
        ? await updateHyroxTemplate(initial.id, { name: name.trim(), focus, blocks: orderedBlocks })
        : await createHyroxTemplate({ name: name.trim(), focus, blocks: orderedBlocks });
      setSubmitting(false);
      setSuccess(true);

      // usa o registro retornado pelo Supabase (id/created_at/updated_at
      // reais) para incluir no estado compartilhado — nada de reconsultar
      // a lista inteira.
      setTimeout(() => onSave(savedTemplate), 700);
    } catch (err) {
      setSubmitting(false);
      setError(mapHyroxError(err, isEdit ? "Não foi possível salvar as alterações. Tente novamente." : "Não foi possível criar o treino. Tente novamente."));
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
              placeholder="ex: HYROX Base"
              disabled={busy}
              className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none disabled:opacity-60"
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
                  disabled={busy}
                  className="rounded-lg px-2 py-1.5 text-xs font-semibold transition disabled:opacity-60"
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Blocos</label>
              <span className="text-xs" style={{ color: C.gray }}>{blocks.length}</span>
            </div>

            <div className="flex flex-col gap-2">
              {blocks.map((b, i) => {
                const category = categoryInfo(b.category);
                return (
                  <div key={b.id} className="rounded-xl px-3 py-2.5" style={{ background: C.surface2, border: `1px solid ${C.borderSoft}` }}>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <button onClick={() => move(b.id, -1)} disabled={busy || i === 0} className="p-0.5 disabled:opacity-20" style={{ color: C.gray }}>
                          <ChevronUp size={13} />
                        </button>
                        <button onClick={() => move(b.id, 1)} disabled={busy || i === blocks.length - 1} className="p-0.5 disabled:opacity-20" style={{ color: C.gray }}>
                          <ChevronDown size={13} />
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: C.white }}>
                          Bloco {i + 1} — {b.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs" style={{ color: category.color }}>
                          {category.label}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs" style={{ color: C.gray }}>voltas</span>
                        <input
                          type="number" min="1" max="20" value={b.rounds}
                          onChange={(e) => {
                            const raw = e.target.value;
                            updateBlock(b.id, { rounds: raw === "" ? "" : Math.max(1, parseInt(raw, 10) || 1) });
                          }}
                          onBlur={(e) => {
                            if (e.target.value === "") updateBlock(b.id, { rounds: DEFAULT_ROUNDS });
                          }}
                          disabled={busy}
                          className="w-12 rounded-lg px-1.5 py-1 text-xs text-center outline-none disabled:opacity-60"
                          style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.white }}
                        />
                      </div>
                      <button onClick={() => removeBlock(b.id)} disabled={busy} className="p-1 rounded-lg flex-shrink-0 disabled:opacity-40" style={{ color: C.gray }}>
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
              style={{ background: `${hyrox.color}14`, color: hyrox.color, border: `1px dashed ${hyrox.color}55` }}
            >
              <Plus size={15} /> Adicionar bloco
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
            style={{ background: `linear-gradient(135deg, ${hyrox.color}, #4D7C0F)`, color: C.bg }}
          >
            {submitting
              ? "Salvando…"
              : success
                ? (isEdit ? "Treino atualizado!" : "Treino criado!")
                : (isEdit ? "Salvar alterações" : "Criar treino")}
          </button>
        </div>
      </div>

      {showPicker && <ExercisePicker onSelect={addBlock} onClose={() => setShowPicker(false)} />}
    </div>
  );
}
