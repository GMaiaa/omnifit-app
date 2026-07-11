import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2, ChevronDown, ChevronUp, Circle, MessageSquare,
  MinusCircle, Plus, Repeat, Timer, Trash2, X,
} from "lucide-react";
import { C, modalityInfo } from "../../../lib/theme";
import { fmtDuration, todayStr, uid } from "../../../lib/format";
import { DEFAULT_SETS, muscleGroupInfo } from "../constants";
import { exerciseKeyOf } from "../analytics";
import { ExercisePicker } from "./ExercisePicker";
import { SaveChoiceModal } from "./SaveChoiceModal";

const musculacao = modalityInfo("musculacao");

function cloneSetForPrefill(set) {
  return { id: uid(), weight: set.weight, reps: set.reps, status: "pending", notes: "" };
}

function emptySet(prevSet) {
  return { id: uid(), weight: prevSet?.weight ?? null, reps: prevSet?.reps ?? null, status: "pending", notes: "" };
}

function exerciseFromTemplateEntry(te, lastSession) {
  const key = te.catalogId || te.name;
  const lastExercise = lastSession?.exercises.find((ex) => exerciseKeyOf(ex) === key);
  const sets = lastExercise?.sets.length
    ? lastExercise.sets.filter((s) => s.status !== "skipped").map(cloneSetForPrefill)
    : Array.from({ length: te.defaultSets || DEFAULT_SETS }, () => emptySet());

  return {
    id: uid(),
    sourceExerciseId: te.catalogId || null,
    name: te.name,
    muscleGroup: te.muscleGroup,
    equipment: te.equipment,
    notes: te.notes || "",
    sets: sets.length ? sets : [emptySet()],
  };
}

function exerciseFromPicked(entry) {
  return {
    id: uid(),
    sourceExerciseId: entry.catalogId || null,
    name: entry.name,
    muscleGroup: entry.muscleGroup,
    equipment: entry.equipment,
    notes: "",
    sets: Array.from({ length: DEFAULT_SETS }, () => emptySet()),
  };
}

function mostRecentSessionFor(sessions, templateId) {
  return sessions.find((s) => s.templateId === templateId) || null;
}

/* ---------------------------------------------------------
   EXECUTION MODE — full-screen, optimized for gym use.
--------------------------------------------------------- */
export function SessionRunner({ template, sessions, onComplete, onClose }) {
  const lastSession = useMemo(() => mostRecentSessionFor(sessions, template.id), [sessions, template.id]);

  const [exercises, setExercises] = useState(() =>
    template.exercises
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((te) => exerciseFromTemplateEntry(te, lastSession))
  );
  const [notesOpenIds, setNotesOpenIds] = useState(() => new Set());
  const [pickerMode, setPickerMode] = useState(null); // null | "add" | exerciseId (substitute target)
  const [saveChoiceOpen, setSaveChoiceOpen] = useState(false);
  const [pendingSession, setPendingSession] = useState(null);
  const [error, setError] = useState("");

  const startedAtRef = useRef(new Date().toISOString());
  const startMsRef = useRef(Date.now());
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsedSec(Math.floor((Date.now() - startMsRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const totalSets = exercises.reduce((a, ex) => a + ex.sets.length, 0);
  const doneSets = exercises.reduce((a, ex) => a + ex.sets.filter((s) => s.status === "done").length, 0);

  function updateExercise(id, patch) {
    setExercises((prev) => prev.map((ex) => (ex.id === id ? { ...ex, ...patch } : ex)));
  }
  function updateSet(exId, setId, patch) {
    setExercises((prev) => prev.map((ex) => (ex.id !== exId ? ex : {
      ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
    })));
  }
  function addSet(exId) {
    setExercises((prev) => prev.map((ex) => (ex.id !== exId ? ex : {
      ...ex, sets: [...ex.sets, emptySet(ex.sets[ex.sets.length - 1])],
    })));
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
  function move(exId, dir) {
    setExercises((prev) => {
      const idx = prev.findIndex((ex) => ex.id === exId);
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }
  function toggleNotes(exId) {
    setNotesOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(exId)) next.delete(exId); else next.add(exId);
      return next;
    });
  }

  function handlePicked(entry) {
    if (pickerMode === "add") {
      setExercises((prev) => [...prev, exerciseFromPicked(entry)]);
    } else if (pickerMode) {
      updateExercise(pickerMode, {
        sourceExerciseId: entry.catalogId || null,
        name: entry.name,
        muscleGroup: entry.muscleGroup,
        equipment: entry.equipment,
        sets: Array.from({ length: DEFAULT_SETS }, () => emptySet()),
      });
    }
    setPickerMode(null);
  }

  function normalizeForSave() {
    return exercises
      .map((ex, i) => ({
        id: ex.id,
        sourceExerciseId: ex.sourceExerciseId,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        equipment: ex.equipment,
        notes: ex.notes,
        order: i,
        sets: ex.sets
          .map((s) => {
            if (s.status === "skipped") return { ...s, weight: s.weight ?? null, reps: s.reps ?? null };
            if (s.weight > 0 && s.reps > 0) return { ...s, status: "done" };
            return null; // empty, never touched — drop it
          })
          .filter(Boolean),
      }))
      .filter((ex) => ex.sets.length > 0);
  }

  function structurallyChanged(finalExercises) {
    const originalKeys = template.exercises.slice().sort((a, b) => a.order - b.order).map((te) => te.catalogId || te.name);
    const finalKeys = finalExercises.map((ex) => ex.sourceExerciseId || ex.name);
    if (originalKeys.length !== finalKeys.length) return true;
    return originalKeys.some((k, i) => k !== finalKeys[i]);
  }

  function handleFinish() {
    const finalExercises = normalizeForSave();
    if (finalExercises.length === 0) return setError("Registre pelo menos uma série para finalizar o treino.");
    setError("");

    const session = {
      id: uid(),
      templateId: template.id,
      templateName: template.name,
      date: todayStr(),
      startedAt: startedAtRef.current,
      finishedAt: new Date().toISOString(),
      durationSec: elapsedSec,
      notes: "",
      exercises: finalExercises,
    };

    if (structurallyChanged(finalExercises)) {
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
    if (doneSets > 0 && !window.confirm("Sair sem salvar o treino? O progresso desta sessão será perdido.")) return;
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
            <div className="flex items-center gap-1 text-xs" style={{ color: musculacao.color }}>
              <Timer size={11} /> {fmtDuration(elapsedSec)}
            </div>
          </div>
        </div>
        <div className="text-xs font-semibold flex-shrink-0" style={{ color: C.gray }}>{doneSets}/{totalSets} séries</div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col gap-3 max-w-2xl w-full mx-auto">
        {exercises.map((ex, i) => {
          const group = muscleGroupInfo(ex.muscleGroup);
          return (
            <div key={ex.id} className="rounded-2xl p-4" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <div className="flex items-start gap-2 mb-3">
                <div className="flex flex-col mt-0.5">
                  <button onClick={() => move(ex.id, -1)} disabled={i === 0} className="p-0.5 disabled:opacity-20" style={{ color: C.gray }}><ChevronUp size={13} /></button>
                  <button onClick={() => move(ex.id, 1)} disabled={i === exercises.length - 1} className="p-0.5 disabled:opacity-20" style={{ color: C.gray }}><ChevronDown size={13} /></button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold" style={{ color: C.white, fontFamily: "'Poppins', sans-serif" }}>{ex.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs" style={{ color: group.color }}>
                    {group.label}<span style={{ color: C.gray }}>• {ex.equipment}</span>
                  </div>
                </div>
                <button onClick={() => toggleNotes(ex.id)} className="p-1.5 rounded-lg" style={{ color: notesOpenIds.has(ex.id) ? musculacao.color : C.gray }}>
                  <MessageSquare size={14} />
                </button>
                <button onClick={() => setPickerMode(ex.id)} className="p-1.5 rounded-lg" style={{ color: C.gray }}>
                  <Repeat size={14} />
                </button>
                <button onClick={() => removeExercise(ex.id)} className="p-1.5 rounded-lg" style={{ color: C.gray }}>
                  <Trash2 size={14} />
                </button>
              </div>

              {notesOpenIds.has(ex.id) && (
                <input
                  type="text" value={ex.notes} onChange={(e) => updateExercise(ex.id, { notes: e.target.value })}
                  placeholder="Observações (opcional)"
                  className="w-full mb-3 rounded-lg px-3 py-2 text-xs outline-none"
                  style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
                />
              )}

              <div className="flex flex-col gap-1.5">
                {ex.sets.map((s, si) => {
                  const skipped = s.status === "skipped";
                  const done = s.status === "done";
                  return (
                    <div key={s.id} className="flex items-center gap-2" style={{ opacity: skipped ? 0.45 : 1 }}>
                      <span className="text-xs w-4 flex-shrink-0" style={{ color: C.gray }}>{si + 1}</span>
                      <input
                        type="number" inputMode="decimal" placeholder="kg" value={s.weight ?? ""}
                        disabled={skipped}
                        onChange={(e) => updateSet(ex.id, s.id, { weight: e.target.value === "" ? null : parseFloat(e.target.value) })}
                        className="w-16 rounded-lg px-2 py-2 text-sm text-center outline-none"
                        style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
                      />
                      <span style={{ color: C.gray, fontSize: 12 }}>×</span>
                      <input
                        type="number" inputMode="numeric" placeholder="reps" value={s.reps ?? ""}
                        disabled={skipped}
                        onChange={(e) => updateSet(ex.id, s.id, { reps: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
                        className="w-16 rounded-lg px-2 py-2 text-sm text-center outline-none"
                        style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
                      />
                      <button onClick={() => toggleDone(ex.id, s.id)} className="p-1 flex-shrink-0">
                        {done ? <CheckCircle2 size={20} style={{ color: musculacao.color }} /> : <Circle size={20} style={{ color: C.gray }} />}
                      </button>
                      <button onClick={() => toggleSkip(ex.id, s.id)} className="p-1 flex-shrink-0">
                        <MinusCircle size={16} style={{ color: skipped ? C.amber : C.gray }} />
                      </button>
                      <button onClick={() => removeSet(ex.id, s.id)} className="p-1 flex-shrink-0 ml-auto">
                        <Trash2 size={13} style={{ color: C.gray }} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => addSet(ex.id)}
                className="mt-2 flex items-center gap-1 text-xs font-semibold"
                style={{ color: musculacao.color }}
              >
                <Plus size={13} /> Série
              </button>
            </div>
          );
        })}

        <button
          onClick={() => setPickerMode("add")}
          className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold"
          style={{ background: `${musculacao.color}14`, color: musculacao.color, border: `1px dashed ${musculacao.color}55` }}
        >
          <Plus size={15} /> Adicionar exercício
        </button>

        {error && <div className="text-sm text-center" style={{ color: C.danger }}>{error}</div>}
      </div>

      <div className="sticky bottom-0 px-4 sm:px-6 py-4" style={{ background: `${C.bg}F2`, borderTop: `1px solid ${C.border}`, backdropFilter: "blur(8px)" }}>
        <button
          onClick={handleFinish}
          className="w-full max-w-2xl mx-auto flex items-center justify-center rounded-xl py-3.5 text-sm font-semibold"
          style={{ background: `linear-gradient(135deg, ${musculacao.color}, #5B21B6)`, color: C.white }}
        >
          Finalizar treino
        </button>
      </div>

      {pickerMode && <ExercisePicker onSelect={handlePicked} onClose={() => setPickerMode(null)} />}
      {saveChoiceOpen && (
        <SaveChoiceModal
          originalName={template.name}
          onChoose={handleSaveChoice}
          onCancel={() => setSaveChoiceOpen(false)}
        />
      )}
    </div>
  );
}
