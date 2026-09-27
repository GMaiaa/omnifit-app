import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2, ChevronDown, ChevronUp, Circle, MessageSquare,
  MinusCircle, Plus, Repeat, Timer, Trash2, Trophy, X,
} from "lucide-react";
import { C, modalityInfo } from "../../../lib/theme";
import { fmtDuration, todayStr, uid } from "../../../lib/format";
import { useLockBodyScroll } from "../../../lib/useLockBodyScroll";
import { saveDraft, clearDraft } from "../../../lib/sessionDraft";
import { DEFAULT_SETS, exerciseMetricType, muscleGroupInfo } from "../constants";
import { detectSetPR, exerciseKeyOf, setHistoryByExercise } from "../analytics";
import { ExercisePicker } from "./ExercisePicker";
import { SaveChoiceModal } from "./SaveChoiceModal";

const musculacao = modalityInfo("musculacao");
const DRAFT_NAMESPACE = "strength";

function cloneSetForPrefill(set) {
  return { id: uid(), weight: set.weight, reps: set.reps, durationSec: set.durationSec, status: "pending", notes: "" };
}

function emptySet(prevSet) {
  return {
    id: uid(), weight: prevSet?.weight ?? null, reps: prevSet?.reps ?? null,
    durationSec: prevSet?.durationSec ?? null, status: "pending", notes: "",
  };
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
    metricType: te.metricType || "load_reps",
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
    metricType: entry.metricType || "load_reps",
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
export function SessionRunner({ template, sessions, initialDraft, onComplete, onClose }) {
  useLockBodyScroll();
  const lastSession = useMemo(() => mostRecentSessionFor(sessions, template.id), [sessions, template.id]);
  const historyByExercise = useMemo(() => setHistoryByExercise(sessions), [sessions]);

  const [exercises, setExercises] = useState(() =>
    initialDraft?.exercises?.length
      ? initialDraft.exercises
      : template.exercises
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((te) => exerciseFromTemplateEntry(te, lastSession))
  );
  const [notesOpenIds, setNotesOpenIds] = useState(() => new Set(initialDraft?.notesOpenIds || []));
  const [pickerMode, setPickerMode] = useState(null); // null | "add" | exerciseId (substitute target)
  const [saveChoiceOpen, setSaveChoiceOpen] = useState(false);
  const [pendingSession, setPendingSession] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const startedAtRef = useRef(initialDraft?.startedAt || new Date().toISOString());
  const startMsRef = useRef(initialDraft?.startedAt ? new Date(initialDraft.startedAt).getTime() : Date.now());
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsedSec(Math.floor((Date.now() - startMsRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  /* Timer de descanso: reinicia toda vez que uma série é marcada como
     concluída (em qualquer exercício), independente de qual vai começar
     em seguida. */
  const restStartMsRef = useRef(initialDraft?.restStartMs ?? null);
  const [resting, setResting] = useState(!!initialDraft?.resting);
  const [restSec, setRestSec] = useState(() =>
    initialDraft?.resting && initialDraft?.restStartMs
      ? Math.max(0, Math.floor((Date.now() - initialDraft.restStartMs) / 1000))
      : 0
  );

  /* Autosave: salva o estado da sessão em andamento no localStorage a cada
     mudança (com debounce pra não gravar a cada tecla digitada), pra sobreviver
     a fechar/recarregar o app. Limpo ao finalizar ou sair da sessão. */
  useEffect(() => {
    const timeout = setTimeout(() => {
      saveDraft(DRAFT_NAMESPACE, {
        templateId: template.id,
        templateName: template.name,
        startedAt: startedAtRef.current,
        exercises,
        notesOpenIds: [...notesOpenIds],
        resting,
        restStartMs: restStartMsRef.current,
      });
    }, 400);
    return () => clearTimeout(timeout);
  }, [exercises, notesOpenIds, resting, template.id, template.name]);

  useEffect(() => {
    if (!resting) return;
    const id = setInterval(() => setRestSec(Math.floor((Date.now() - restStartMsRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [resting]);

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
    const ex = exercises.find((e) => e.id === exId);
    const set = ex?.sets.find((s) => s.id === setId);
    const willBeDone = !!set && set.status !== "done";

    setExercises((prev) => prev.map((e) => (e.id !== exId ? e : {
      ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, status: s.status === "done" ? "pending" : "done" } : s)),
    })));

    if (willBeDone) {
      restStartMsRef.current = Date.now();
      setRestSec(0);
      setResting(true);
    }
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
        metricType: entry.metricType || "load_reps",
        sets: Array.from({ length: DEFAULT_SETS }, () => emptySet()),
      });
    }
    setPickerMode(null);
  }

  function normalizeForSave() {
    return exercises
      .map((ex, i) => {
        const metricType = exerciseMetricType(ex);
        return {
          id: ex.id,
          sourceExerciseId: ex.sourceExerciseId,
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          equipment: ex.equipment,
          metricType,
          notes: ex.notes,
          order: i,
          sets: ex.sets
            .map((s) => {
              const weight = s.weight === null || s.weight === "" ? null : parseFloat(s.weight);
              const durationSec = s.durationSec === null || s.durationSec === "" ? null : parseInt(s.durationSec, 10);
              if (s.status === "skipped") return { ...s, weight, reps: s.reps ?? null, durationSec };
              const hasValue = metricType === "time"
                ? durationSec > 0
                : metricType === "reps_only"
                  ? s.reps > 0
                  : weight > 0 && s.reps > 0;
              if (hasValue) return { ...s, weight, durationSec, status: "done" };
              return null; // empty, never touched — drop it
            })
            .filter(Boolean),
        };
      })
      .filter((ex) => ex.sets.length > 0);
  }

  function structurallyChanged(finalExercises) {
    const originalKeys = template.exercises.slice().sort((a, b) => a.order - b.order).map((te) => te.catalogId || te.name);
    const finalKeys = finalExercises.map((ex) => ex.sourceExerciseId || ex.name);
    if (originalKeys.length !== finalKeys.length) return true;
    return originalKeys.some((k, i) => k !== finalKeys[i]);
  }

  /* onComplete faz a inserção real no Supabase (ver StrengthModule.jsx). Se
     falhar (rede, RLS etc.), o erro sobe até aqui — a sessão continua aberta
     com os dados intactos para o usuário tentar de novo, em vez de perder o
     treino que acabou de registrar. */
  async function submitSession(session, action) {
    setSaving(true);
    setError("");
    try {
      await onComplete(session, action);
      clearDraft(DRAFT_NAMESPACE);
    } catch (err) {
      setSaving(false);
      setError(err?.message || "Não foi possível salvar o treino. Tente novamente.");
    }
  }

  async function handleFinish() {
    if (saving) return;
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
      return;
    }

    await submitSession(session, { type: "none" });
  }

  async function handleSaveChoice(type, newTemplateName) {
    setSaveChoiceOpen(false);
    await submitSession(pendingSession, { type, newTemplateName });
  }

  function handleClose() {
    if (saving) return;
    if (doneSets > 0 && !window.confirm("Sair sem salvar o treino? O progresso desta sessão será perdido.")) return;
    clearDraft(DRAFT_NAMESPACE);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: C.bg }}>
      <div className="sticky top-0 z-10" style={{ background: `color-mix(in srgb, ${C.bg} 95%, transparent)`, borderBottom: `1px solid ${C.border}`, backdropFilter: "blur(8px)" }}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={handleClose} disabled={saving} className="p-1.5 rounded-full flex-shrink-0 disabled:opacity-40" style={{ color: C.gray }}>
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

        {resting && (
          <div
            className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2"
            style={{ borderTop: `1px solid ${C.borderSoft}`, background: `color-mix(in srgb, ${musculacao.color} 10%, transparent)` }}
          >
            <Timer size={13} style={{ color: musculacao.color }} />
            <span className="text-sm font-semibold" style={{ color: C.white }}>Descanso: {fmtDuration(restSec)}</span>
            <button onClick={() => setResting(false)} className="ml-1 text-xs font-semibold" style={{ color: C.gray }}>
              ocultar
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col gap-3 max-w-2xl w-full mx-auto">
        {exercises.map((ex, i) => {
          const group = muscleGroupInfo(ex.muscleGroup);
          const metricType = exerciseMetricType(ex);
          const exerciseHistory = historyByExercise.get(exerciseKeyOf(ex)) || [];
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
                    {group.label}
                    <span style={{ color: C.gray }}>
                      • {ex.equipment}
                      {metricType === "time" && " • por tempo"}
                      {metricType === "reps_only" && " • só reps"}
                    </span>
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
                  const { weightPR, repsPR, timePR } = done ? detectSetPR(exerciseHistory, metricType, s) : { weightPR: false, repsPR: false, timePR: false };
                  const isPR = weightPR || repsPR || timePR;
                  const prLabel = weightPR && repsPR
                    ? "Novo recorde de peso e repetições!"
                    : weightPR
                      ? "Novo recorde de peso!"
                      : timePR
                        ? "Novo recorde de tempo!"
                        : "Novo recorde de repetições!";
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 rounded-lg"
                      style={{
                        opacity: skipped ? 0.45 : 1,
                        background: isPR ? `color-mix(in srgb, ${C.amber} 12%, transparent)` : "transparent",
                        border: `1px solid ${isPR ? `color-mix(in srgb, ${C.amber} 35%, transparent)` : "transparent"}`,
                        padding: isPR ? "4px 6px" : "0",
                      }}
                    >
                      <span className="text-xs w-4 flex-shrink-0" style={{ color: C.gray }}>{si + 1}</span>
                      {metricType === "time" ? (
                        <input
                          type="number" inputMode="numeric" placeholder="segundos" value={s.durationSec ?? ""}
                          disabled={skipped}
                          onChange={(e) => updateSet(ex.id, s.id, { durationSec: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
                          className="w-20 rounded-lg px-2 py-2 text-sm text-center outline-none"
                          style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
                        />
                      ) : metricType === "reps_only" ? (
                        <input
                          type="number" inputMode="numeric" placeholder="reps" value={s.reps ?? ""}
                          disabled={skipped}
                          onChange={(e) => updateSet(ex.id, s.id, { reps: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
                          className="w-20 rounded-lg px-2 py-2 text-sm text-center outline-none"
                          style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
                        />
                      ) : (
                        <>
                          <input
                            type="text" inputMode="decimal" placeholder="kg" value={s.weight ?? ""}
                            disabled={skipped}
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
                            disabled={skipped}
                            onChange={(e) => updateSet(ex.id, s.id, { reps: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
                            className="w-16 rounded-lg px-2 py-2 text-sm text-center outline-none"
                            style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
                          />
                        </>
                      )}
                      {isPR && (
                        <span title={prLabel} className="flex-shrink-0">
                          <Trophy size={15} style={{ color: C.amber }} />
                        </span>
                      )}
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

      <div className="sticky bottom-0 px-4 sm:px-6 py-4" style={{ background: `color-mix(in srgb, ${C.bg} 95%, transparent)`, borderTop: `1px solid ${C.border}`, backdropFilter: "blur(8px)" }}>
        <button
          onClick={handleFinish}
          disabled={saving}
          className="w-full max-w-2xl mx-auto flex items-center justify-center rounded-xl py-3.5 text-sm font-semibold disabled:opacity-60"
          style={{ background: `linear-gradient(135deg, ${musculacao.color}, #5B21B6)`, color: C.white }}
        >
          {saving ? "Salvando…" : "Finalizar treino"}
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
