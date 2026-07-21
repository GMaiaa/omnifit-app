import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2, ChevronDown, ChevronUp, Circle, MessageSquare,
  MinusCircle, Play, Plus, Repeat, Square, Timer, Trash2, X,
} from "lucide-react";
import { C, modalityInfo } from "../../../lib/theme";
import { fmtDuration, todayStr, uid } from "../../../lib/format";
import { DEFAULT_ROUNDS, FOCUS, categoryInfo } from "../constants";
import { hyroxExerciseKeyOf } from "../analytics";
import { Select } from "../../../components/ui";
import { ExercisePicker } from "./ExercisePicker";
import { SaveChoiceModal } from "./SaveChoiceModal";

const hyrox = modalityInfo("hyrox");
const inputStyle = { background: C.surface2, border: `1px solid ${C.border}`, color: C.white };

function cloneRoundForPrefill(set) {
  return {
    id: uid(), reps: set.reps ?? null, weight: set.weight ?? null,
    distanceM: set.distanceM ?? null, durationSec: set.durationSec ?? null,
    restSec: set.restSec ?? null, status: "pending", notes: "",
  };
}
function emptyRound(prev) {
  return {
    id: uid(), reps: prev?.reps ?? null, weight: prev?.weight ?? null,
    distanceM: prev?.distanceM ?? null, durationSec: prev?.durationSec ?? null,
    restSec: prev?.restSec ?? null, status: "pending", notes: "",
  };
}

/* "Caso um exercício já tenha histórico, mesmo em outro treino, o sistema
   deve utilizar sua última execução como referência" — busca cross-ficha,
   não só na mesma ficha (sessions já vem ordenado por data desc). */
function lastExecutionOfExercise(sessions, key) {
  for (const s of sessions) {
    const b = s.blocks.find((bl) => hyroxExerciseKeyOf(bl) === key);
    if (b) return b;
  }
  return null;
}

function blockFromTemplateEntry(tb, sessions) {
  const key = tb.catalogId || tb.name;
  const lastBlock = lastExecutionOfExercise(sessions, key);
  const sets = lastBlock?.sets.length
    ? lastBlock.sets.filter((s) => s.status !== "skipped").map(cloneRoundForPrefill)
    : Array.from({ length: tb.rounds || DEFAULT_ROUNDS }, () => emptyRound());

  return {
    id: uid(),
    sourceExerciseId: tb.catalogId || null,
    name: tb.name,
    category: tb.category,
    metricType: tb.metricType,
    notes: tb.notes || "",
    startedAt: null, finishedAt: null, durationSec: 0, transitionSec: 0,
    sets: sets.length ? sets : [emptyRound()],
  };
}

function blockFromPicked(entry) {
  return {
    id: uid(),
    sourceExerciseId: entry.catalogId || null,
    name: entry.name,
    category: entry.category,
    metricType: entry.metricType,
    notes: "",
    startedAt: null, finishedAt: null, durationSec: 0, transitionSec: 0,
    sets: [emptyRound()],
  };
}

function RoundFields({ metricType, round, onChange }) {
  if (metricType === "reps") {
    return (
      <>
        <input
          type="number" inputMode="numeric" placeholder="reps" value={round.reps ?? ""}
          onChange={(e) => onChange({ reps: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
          className="w-16 rounded-lg px-2 py-2 text-sm text-center outline-none" style={inputStyle}
        />
        <input
          type="number" inputMode="numeric" placeholder="desc. s" value={round.restSec ?? ""}
          onChange={(e) => onChange({ restSec: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
          className="w-20 rounded-lg px-2 py-2 text-sm text-center outline-none" style={inputStyle}
        />
      </>
    );
  }
  if (metricType === "load") {
    return (
      <>
        <input
          type="number" inputMode="decimal" placeholder="kg" value={round.weight ?? ""}
          onChange={(e) => onChange({ weight: e.target.value === "" ? null : parseFloat(e.target.value) })}
          className="w-16 rounded-lg px-2 py-2 text-sm text-center outline-none" style={inputStyle}
        />
        <input
          type="number" inputMode="numeric" placeholder="reps" value={round.reps ?? ""}
          onChange={(e) => onChange({ reps: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
          className="w-16 rounded-lg px-2 py-2 text-sm text-center outline-none" style={inputStyle}
        />
        <input
          type="number" inputMode="decimal" placeholder="m" value={round.distanceM ?? ""}
          onChange={(e) => onChange({ distanceM: e.target.value === "" ? null : parseFloat(e.target.value) })}
          className="w-16 rounded-lg px-2 py-2 text-sm text-center outline-none" style={inputStyle}
        />
      </>
    );
  }
  if (metricType === "time") {
    return (
      <>
        <input
          type="number" inputMode="numeric" placeholder="duração s" value={round.durationSec ?? ""}
          onChange={(e) => onChange({ durationSec: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
          className="w-24 rounded-lg px-2 py-2 text-sm text-center outline-none" style={inputStyle}
        />
        <input
          type="number" inputMode="numeric" placeholder="desc. s" value={round.restSec ?? ""}
          onChange={(e) => onChange({ restSec: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
          className="w-20 rounded-lg px-2 py-2 text-sm text-center outline-none" style={inputStyle}
        />
      </>
    );
  }
  // distance
  return (
    <>
      <input
        type="number" inputMode="decimal" placeholder="m" value={round.distanceM ?? ""}
        onChange={(e) => onChange({ distanceM: e.target.value === "" ? null : parseFloat(e.target.value) })}
        className="w-20 rounded-lg px-2 py-2 text-sm text-center outline-none" style={inputStyle}
      />
      <input
        type="number" inputMode="numeric" placeholder="tempo s" value={round.durationSec ?? ""}
        onChange={(e) => onChange({ durationSec: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
        className="w-24 rounded-lg px-2 py-2 text-sm text-center outline-none" style={inputStyle}
      />
    </>
  );
}

/* ---------------------------------------------------------
   EXECUTION MODE — full-screen. Suporta tanto fichas salvas quanto
   Treino Livre (template.id === null): mesmo runner, mesma flexibilidade.
--------------------------------------------------------- */
export function HyroxRunner({ template, sessions, onComplete, onClose }) {
  const hasTemplate = !!template.id;

  const [blocks, setBlocks] = useState(() =>
    template.blocks
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((tb) => blockFromTemplateEntry(tb, sessions))
  );
  const [focus, setFocus] = useState(template.focus || FOCUS[0].id);
  const [sessionNotes, setSessionNotes] = useState("");
  const [notesOpenIds, setNotesOpenIds] = useState(() => new Set());
  const [pickerMode, setPickerMode] = useState(null); // null | "add" | blockId (substituir)
  const [saveChoiceOpen, setSaveChoiceOpen] = useState(false);
  const [pendingSession, setPendingSession] = useState(null);
  const [error, setError] = useState("");

  const startedAtRef = useRef(new Date().toISOString());
  const startMsRef = useRef(Date.now());
  const blockTimersRef = useRef({});
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsedSec(Math.floor((Date.now() - startMsRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const totalRounds = blocks.reduce((a, b) => a + b.sets.length, 0);
  const doneRounds = blocks.reduce((a, b) => a + b.sets.filter((s) => s.status === "done").length, 0);

  function updateBlock(id, patch) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }
  function updateRound(blockId, roundId, patch) {
    setBlocks((prev) => prev.map((b) => (b.id !== blockId ? b : {
      ...b, sets: b.sets.map((s) => (s.id === roundId ? { ...s, ...patch } : s)),
    })));
  }
  function addRound(blockId) {
    setBlocks((prev) => prev.map((b) => (b.id !== blockId ? b : {
      ...b, sets: [...b.sets, emptyRound(b.sets[b.sets.length - 1])],
    })));
  }
  function removeRound(blockId, roundId) {
    setBlocks((prev) => prev.map((b) => (b.id !== blockId ? b : { ...b, sets: b.sets.filter((s) => s.id !== roundId) })));
  }
  function toggleDone(blockId, roundId) {
    setBlocks((prev) => prev.map((b) => (b.id !== blockId ? b : {
      ...b, sets: b.sets.map((s) => (s.id === roundId ? { ...s, status: s.status === "done" ? "pending" : "done" } : s)),
    })));
  }
  function toggleSkip(blockId, roundId) {
    setBlocks((prev) => prev.map((b) => (b.id !== blockId ? b : {
      ...b, sets: b.sets.map((s) => (s.id === roundId ? { ...s, status: s.status === "skipped" ? "pending" : "skipped" } : s)),
    })));
  }
  function removeBlock(blockId) {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  }
  function move(blockId, dir) {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === blockId);
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }
  function toggleNotes(blockId) {
    setNotesOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId); else next.add(blockId);
      return next;
    });
  }

  function startBlock(blockId) {
    blockTimersRef.current[blockId] = { ...(blockTimersRef.current[blockId] || {}), startMs: Date.now() };
    updateBlock(blockId, { startedAt: new Date().toISOString() });
  }
  function finishBlock(blockId) {
    const timer = blockTimersRef.current[blockId];
    if (!timer?.startMs) return;
    const nowMs = Date.now();
    const durationSec = Math.max(0, Math.round((nowMs - timer.startMs) / 1000));
    const idx = blocks.findIndex((b) => b.id === blockId);
    let transitionSec = 0;
    for (let i = idx - 1; i >= 0; i--) {
      const prevTimer = blockTimersRef.current[blocks[i].id];
      if (prevTimer?.finishMs) {
        transitionSec = Math.max(0, Math.round((timer.startMs - prevTimer.finishMs) / 1000));
        break;
      }
    }
    blockTimersRef.current[blockId] = { ...timer, finishMs: nowMs };
    updateBlock(blockId, { finishedAt: new Date().toISOString(), durationSec, transitionSec });
  }

  function handlePicked(entry) {
    if (pickerMode === "add") {
      setBlocks((prev) => [...prev, blockFromPicked(entry)]);
    } else if (pickerMode) {
      updateBlock(pickerMode, {
        sourceExerciseId: entry.catalogId || null,
        name: entry.name,
        category: entry.category,
        metricType: entry.metricType,
        sets: [emptyRound()],
      });
    }
    setPickerMode(null);
  }

  function normalizeForSave() {
    return blocks
      .map((b, i) => ({
        id: b.id,
        sourceExerciseId: b.sourceExerciseId,
        name: b.name,
        category: b.category,
        metricType: b.metricType,
        notes: b.notes,
        order: i,
        startedAt: b.startedAt,
        finishedAt: b.finishedAt,
        durationSec: b.durationSec || 0,
        transitionSec: b.transitionSec || 0,
        sets: b.sets
          .map((s) => {
            if (s.status === "skipped") return { ...s };
            const hasValue = (s.reps > 0) || (s.weight > 0) || (s.distanceM > 0) || (s.durationSec > 0);
            if (hasValue) return { ...s, status: "done" };
            return null; // vazio, nunca preenchido — descarta
          })
          .filter(Boolean),
      }))
      .filter((b) => b.sets.length > 0 || b.durationSec > 0);
  }

  function structurallyChanged(finalBlocks) {
    if (!hasTemplate) return false;
    const originalKeys = template.blocks.slice().sort((a, b) => a.order - b.order).map((tb) => tb.catalogId || tb.name);
    const finalKeys = finalBlocks.map((b) => b.sourceExerciseId || b.name);
    if (originalKeys.length !== finalKeys.length) return true;
    return originalKeys.some((k, i) => k !== finalKeys[i]);
  }

  function handleFinish() {
    const finalBlocks = normalizeForSave();
    if (finalBlocks.length === 0) return setError("Registre pelo menos um bloco para finalizar o treino.");
    setError("");

    const session = {
      id: uid(),
      templateId: template.id || null,
      templateName: template.name,
      focus,
      date: todayStr(),
      startedAt: startedAtRef.current,
      finishedAt: new Date().toISOString(),
      durationSec: elapsedSec,
      notes: sessionNotes.trim(),
      blocks: finalBlocks,
    };

    if (!hasTemplate || structurallyChanged(finalBlocks)) {
      setPendingSession(session);
      setSaveChoiceOpen(true);
    } else {
      onComplete(session, { type: "none" });
    }
  }

  function handleSaveChoice(type, newTemplateName) {
    setSaveChoiceOpen(false);
    onComplete(pendingSession, { type, newTemplateName });
  }

  function handleClose() {
    if (doneRounds > 0 && !window.confirm("Sair sem salvar o treino? O progresso desta sessão será perdido.")) return;
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: C.bg }}>
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3.5" style={{ background: `${C.bg}F2`, borderBottom: `1px solid ${C.border}`, backdropFilter: "blur(8px)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={handleClose} className="p-1.5 rounded-full flex-shrink-0" style={{ color: C.gray }}>
            <X size={20} />
          </button>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: C.white, fontFamily: "'Poppins', sans-serif" }}>{template.name}</div>
            <div className="flex items-center gap-1 text-xs" style={{ color: hyrox.color }}>
              <Timer size={11} /> {fmtDuration(elapsedSec)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Select value={focus} onChange={setFocus} options={FOCUS.map((f) => ({ value: f.id, label: f.label }))} />
          <div className="text-xs font-semibold" style={{ color: C.gray }}>{doneRounds}/{totalRounds}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col gap-3 max-w-2xl w-full mx-auto">
        {blocks.map((b, i) => {
          const category = categoryInfo(b.category);
          const inProgress = !!b.startedAt && !b.finishedAt;
          return (
            <div key={b.id} className="rounded-2xl p-4" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <div className="flex items-start gap-2 mb-3">
                <div className="flex flex-col mt-0.5">
                  <button onClick={() => move(b.id, -1)} disabled={i === 0} className="p-0.5 disabled:opacity-20" style={{ color: C.gray }}><ChevronUp size={13} /></button>
                  <button onClick={() => move(b.id, 1)} disabled={i === blocks.length - 1} className="p-0.5 disabled:opacity-20" style={{ color: C.gray }}><ChevronDown size={13} /></button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold" style={{ color: C.white, fontFamily: "'Poppins', sans-serif" }}>
                    Bloco {i + 1} — {b.name}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs" style={{ color: category.color }}>
                    {category.label}
                    {b.finishedAt && <span style={{ color: C.gray }}>• {fmtDuration(b.durationSec)}</span>}
                    {b.transitionSec > 0 && <span style={{ color: C.amber }}>• transição {fmtDuration(b.transitionSec)}</span>}
                  </div>
                </div>
                <button onClick={() => toggleNotes(b.id)} className="p-1.5 rounded-lg" style={{ color: notesOpenIds.has(b.id) ? hyrox.color : C.gray }}>
                  <MessageSquare size={14} />
                </button>
                <button onClick={() => setPickerMode(b.id)} className="p-1.5 rounded-lg" style={{ color: C.gray }}>
                  <Repeat size={14} />
                </button>
                <button onClick={() => removeBlock(b.id)} className="p-1.5 rounded-lg" style={{ color: C.gray }}>
                  <Trash2 size={14} />
                </button>
              </div>

              {notesOpenIds.has(b.id) && (
                <input
                  type="text" value={b.notes} onChange={(e) => updateBlock(b.id, { notes: e.target.value })}
                  placeholder="Observações (opcional)"
                  className="w-full mb-3 rounded-lg px-3 py-2 text-xs outline-none"
                  style={inputStyle}
                />
              )}

              <button
                onClick={() => (b.finishedAt ? null : inProgress ? finishBlock(b.id) : startBlock(b.id))}
                disabled={!!b.finishedAt}
                className="mb-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
                style={{
                  background: inProgress ? `${C.danger}22` : `${hyrox.color}22`,
                  color: inProgress ? C.danger : hyrox.color,
                }}
              >
                {b.finishedAt ? <CheckCircle2 size={13} /> : inProgress ? <Square size={13} /> : <Play size={13} />}
                {b.finishedAt ? "Bloco concluído" : inProgress ? "Finalizar bloco" : "Iniciar bloco"}
              </button>

              <div className="flex flex-col gap-1.5">
                {b.sets.map((s, si) => {
                  const skipped = s.status === "skipped";
                  const done = s.status === "done";
                  return (
                    <div key={s.id} className="flex items-center gap-2 flex-wrap" style={{ opacity: skipped ? 0.45 : 1 }}>
                      <span className="text-xs w-4 flex-shrink-0" style={{ color: C.gray }}>{si + 1}</span>
                      <RoundFields
                        metricType={b.metricType}
                        round={s}
                        onChange={(patch) => updateRound(b.id, s.id, patch)}
                      />
                      <button onClick={() => toggleDone(b.id, s.id)} className="p-1 flex-shrink-0">
                        {done ? <CheckCircle2 size={20} style={{ color: hyrox.color }} /> : <Circle size={20} style={{ color: C.gray }} />}
                      </button>
                      <button onClick={() => toggleSkip(b.id, s.id)} className="p-1 flex-shrink-0">
                        <MinusCircle size={16} style={{ color: skipped ? C.amber : C.gray }} />
                      </button>
                      <button onClick={() => removeRound(b.id, s.id)} className="p-1 flex-shrink-0 ml-auto">
                        <Trash2 size={13} style={{ color: C.gray }} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => addRound(b.id)}
                className="mt-2 flex items-center gap-1 text-xs font-semibold"
                style={{ color: hyrox.color }}
              >
                <Plus size={13} /> Volta
              </button>
            </div>
          );
        })}

        <button
          onClick={() => setPickerMode("add")}
          className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold"
          style={{ background: `${hyrox.color}14`, color: hyrox.color, border: `1px dashed ${hyrox.color}55` }}
        >
          <Plus size={15} /> Adicionar bloco
        </button>

        <div>
          <label className="text-xs font-semibold" style={{ color: C.gray }}>Observações do treino (opcional)</label>
          <textarea
            value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} rows={2}
            placeholder="Como foi a sessão?"
            className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
            style={inputStyle}
          />
        </div>

        {error && <div className="text-sm text-center" style={{ color: C.danger }}>{error}</div>}
      </div>

      <div className="sticky bottom-0 px-4 sm:px-6 py-4" style={{ background: `${C.bg}F2`, borderTop: `1px solid ${C.border}`, backdropFilter: "blur(8px)" }}>
        <button
          onClick={handleFinish}
          className="w-full max-w-2xl mx-auto flex items-center justify-center rounded-xl py-3.5 text-sm font-semibold"
          style={{ background: `linear-gradient(135deg, ${hyrox.color}, #4D7C0F)`, color: C.bg }}
        >
          Finalizar treino
        </button>
      </div>

      {pickerMode && <ExercisePicker onSelect={handlePicked} onClose={() => setPickerMode(null)} />}
      {saveChoiceOpen && (
        <SaveChoiceModal
          hasTemplate={hasTemplate}
          originalName={template.name}
          onChoose={handleSaveChoice}
          onCancel={() => setSaveChoiceOpen(false)}
        />
      )}
    </div>
  );
}
