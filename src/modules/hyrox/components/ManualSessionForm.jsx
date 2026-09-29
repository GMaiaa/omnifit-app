import { useState } from "react";
import { ChevronDown, ChevronUp, Copy, Plus, Trash2, X } from "lucide-react";
import { C, modalityInfo } from "../../../lib/theme";
import { todayStr, uid } from "../../../lib/format";
import { useLockBodyScroll } from "../../../lib/useLockBodyScroll";
import { DEFAULT_ROUNDS, FOCUS, categoryInfo } from "../constants";
import { ExercisePicker } from "./ExercisePicker";
import { GoalPicker } from "./GoalPicker";
import { RoundFields } from "./RoundFields";

const hyrox = modalityInfo("hyrox");
const inputStyle = { background: C.surface2, border: `1px solid ${C.border}`, color: C.white };

function emptyResultRound() {
  return { id: uid(), reps: null, weight: null, distanceM: null, durationSec: null, restSec: null, status: "pending", notes: "" };
}

function resizeSets(sets, rounds) {
  const n = Math.max(1, rounds || 1);
  if (sets.length === n) return sets;
  if (sets.length < n) return [...sets, ...Array.from({ length: n - sets.length }, () => emptyResultRound())];
  return sets.slice(0, n);
}

function newStation(entry, rounds) {
  return {
    id: uid(),
    catalogId: entry.catalogId,
    name: entry.name,
    category: entry.category,
    metricType: entry.metricType,
    goalType: null,
    goalValue: null,
    goalLoadValue: null,
    sets: resizeSets([emptyResultRound()], rounds),
  };
}

function newBlockGroup(entry, index) {
  return {
    id: uid(),
    label: `Bloco ${index + 1}`,
    rounds: DEFAULT_ROUNDS,
    stations: [newStation(entry, DEFAULT_ROUNDS)],
  };
}

/* ---------------------------------------------------------
   REGISTRO PÓS-TREINO — pra quando não deu pra usar o HyroxRunner durante a
   execução (sem timer ao vivo, sem exigir ficha por trás): reconstrói o
   treino a partir da memória, com blocos que agrupam uma ou mais estações
   repetidas juntas N vezes, cada estação com sua própria meta planejada e
   resultado real. Grava na mesma tabela/formato de blocks do HyroxRunner —
   analytics/histórico tratam essas sessões como qualquer outra.
--------------------------------------------------------- */
export function ManualSessionForm({ onComplete, onClose }) {
  useLockBodyScroll();
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayStr());
  const [durationMin, setDurationMin] = useState("");
  const [durationSecInput, setDurationSecInput] = useState("");
  const [calories, setCalories] = useState("");
  const [avgHeartRate, setAvgHeartRate] = useState("");
  const [focus, setFocus] = useState(FOCUS[0].id);
  const [notes, setNotes] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [pickerMode, setPickerMode] = useState(null); // null | "new-block" | blockId (add station into)
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateBlock(id, patch) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }
  function updateBlockRounds(id, rounds) {
    setBlocks((prev) => prev.map((b) => (b.id !== id ? b : {
      ...b, rounds, stations: b.stations.map((st) => ({ ...st, sets: resizeSets(st.sets, rounds) })),
    })));
  }
  function removeBlock(id) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }
  function moveBlock(id, dir) {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }
  function updateStation(blockId, stationId, patch) {
    setBlocks((prev) => prev.map((b) => (b.id !== blockId ? b : {
      ...b, stations: b.stations.map((st) => (st.id === stationId ? { ...st, ...patch } : st)),
    })));
  }
  function removeStation(blockId, stationId) {
    setBlocks((prev) => prev.map((b) => (b.id !== blockId ? b : { ...b, stations: b.stations.filter((st) => st.id !== stationId) })));
  }
  function updateRound(blockId, stationId, roundId, patch) {
    setBlocks((prev) => prev.map((b) => (b.id !== blockId ? b : {
      ...b, stations: b.stations.map((st) => (st.id !== stationId ? st : {
        ...st, sets: st.sets.map((s) => (s.id === roundId ? { ...s, ...patch } : s)),
      })),
    })));
  }
  function replicateFirstRound(blockId, stationId) {
    setBlocks((prev) => prev.map((b) => (b.id !== blockId ? b : {
      ...b, stations: b.stations.map((st) => {
        if (st.id !== stationId || st.sets.length < 2) return st;
        const first = st.sets[0];
        return { ...st, sets: st.sets.map((s, i) => (i === 0 ? s : { ...s, reps: first.reps, weight: first.weight, distanceM: first.distanceM, durationSec: first.durationSec, restSec: first.restSec })) };
      }),
    })));
  }

  function handlePicked(entry) {
    if (pickerMode === "new-block") {
      setBlocks((prev) => [...prev, newBlockGroup(entry, prev.length)]);
    } else if (pickerMode) {
      const block = blocks.find((b) => b.id === pickerMode);
      setBlocks((prev) => prev.map((b) => (b.id !== pickerMode ? b : {
        ...b, stations: [...b.stations, newStation(entry, block?.rounds)],
      })));
    }
    setPickerMode(null);
  }

  async function handleSubmit() {
    if (saving) return;
    setError("");

    const finalBlocks = [];
    let order = 0;
    for (const block of blocks) {
      for (const station of block.stations) {
        const sets = station.sets
          .map((s) => {
            const weight = s.weight === null || s.weight === "" ? null : parseFloat(s.weight);
            const reps = s.reps === null || s.reps === "" ? null : parseInt(s.reps, 10);
            const distanceM = s.distanceM === null || s.distanceM === "" ? null : parseFloat(s.distanceM);
            const durationSec = s.durationSec === null || s.durationSec === "" ? null : parseInt(s.durationSec, 10);
            const restSec = s.restSec === null || s.restSec === "" ? null : parseInt(s.restSec, 10);
            const hasValue = reps > 0 || weight > 0 || distanceM > 0 || durationSec > 0;
            if (!hasValue) return null;
            return { ...s, weight, reps, distanceM, durationSec, restSec, status: "done" };
          })
          .filter(Boolean);
        if (sets.length === 0) continue;
        finalBlocks.push({
          id: station.id,
          sourceExerciseId: station.catalogId,
          name: station.name,
          category: station.category,
          metricType: station.metricType,
          notes: "",
          goalType: station.goalType ?? null,
          goalValue: station.goalValue ?? null,
          goalLoadValue: station.goalLoadValue ?? null,
          groupLabel: block.label || null,
          groupRounds: block.rounds || null,
          order: order++,
          startedAt: null, finishedAt: null, durationSec: 0, transitionSec: 0,
          sets,
        });
      }
    }

    if (finalBlocks.length === 0) {
      setError("Registre o resultado de pelo menos uma estação.");
      return;
    }

    const totalDurationSec = (Math.max(0, parseInt(durationMin, 10) || 0) * 60) + Math.max(0, parseInt(durationSecInput, 10) || 0);

    const session = {
      id: uid(),
      templateId: null,
      templateName: name.trim() || "Registro manual",
      focus,
      date,
      startedAt: null,
      finishedAt: null,
      durationSec: totalDurationSec,
      notes: notes.trim() || null,
      calories: calories === "" ? null : Math.max(0, parseInt(calories, 10) || 0),
      avgHeartRate: avgHeartRate === "" ? null : Math.max(0, parseInt(avgHeartRate, 10) || 0),
      blocks: finalBlocks,
    };

    setSaving(true);
    try {
      await onComplete(session);
    } catch (err) {
      setSaving(false);
      setError(err?.message || "Não foi possível salvar o treino. Tente novamente.");
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
            Registrar treino
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col gap-4 max-w-2xl w-full mx-auto">
        <div>
          <label className="text-xs font-semibold" style={{ color: C.gray }}>Nome (opcional)</label>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="ex: HYROX simulado na academia"
            disabled={saving}
            className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none disabled:opacity-60"
            style={inputStyle}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Data</label>
            <input
              type="date" value={date} onChange={(e) => setDate(e.target.value)}
              disabled={saving}
              className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none disabled:opacity-60"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Tempo total</label>
            <div className="mt-1 flex items-center gap-1.5">
              <input
                type="number" inputMode="numeric" min="0" placeholder="min" value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                disabled={saving}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-center outline-none disabled:opacity-60"
                style={inputStyle}
              />
              <span style={{ color: C.gray }}>:</span>
              <input
                type="number" inputMode="numeric" min="0" max="59" placeholder="seg" value={durationSecInput}
                onChange={(e) => setDurationSecInput(e.target.value)}
                disabled={saving}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-center outline-none disabled:opacity-60"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Calorias (opcional)</label>
            <input
              type="number" inputMode="numeric" min="0" placeholder="cal" value={calories}
              onChange={(e) => setCalories(e.target.value)}
              disabled={saving}
              className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none disabled:opacity-60"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>FC média (opcional)</label>
            <input
              type="number" inputMode="numeric" min="0" placeholder="bpm" value={avgHeartRate}
              onChange={(e) => setAvgHeartRate(e.target.value)}
              disabled={saving}
              className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none disabled:opacity-60"
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold" style={{ color: C.gray }}>Objetivo</label>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5">
            {FOCUS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFocus(f.id)}
                disabled={saving}
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

          <div className="flex flex-col gap-3">
            {blocks.map((b, bi) => (
              <div key={b.id} className="rounded-2xl p-3.5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex flex-col">
                    <button onClick={() => moveBlock(b.id, -1)} disabled={saving || bi === 0} className="p-0.5 disabled:opacity-20" style={{ color: C.gray }}><ChevronUp size={13} /></button>
                    <button onClick={() => moveBlock(b.id, 1)} disabled={saving || bi === blocks.length - 1} className="p-0.5 disabled:opacity-20" style={{ color: C.gray }}><ChevronDown size={13} /></button>
                  </div>
                  <input
                    type="text" value={b.label} onChange={(e) => updateBlock(b.id, { label: e.target.value })}
                    disabled={saving}
                    className="flex-1 min-w-0 rounded-lg px-2.5 py-1.5 text-sm font-semibold outline-none disabled:opacity-60"
                    style={{ background: C.surface2, border: `1px solid ${C.borderSoft}`, color: C.white }}
                  />
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-xs" style={{ color: C.gray }}>rounds</span>
                    <input
                      type="number" min="1" max="20" value={b.rounds}
                      onChange={(e) => {
                        const raw = e.target.value;
                        updateBlockRounds(b.id, raw === "" ? "" : Math.max(1, parseInt(raw, 10) || 1));
                      }}
                      onBlur={(e) => { if (e.target.value === "") updateBlockRounds(b.id, DEFAULT_ROUNDS); }}
                      disabled={saving}
                      className="w-12 rounded-lg px-1.5 py-1 text-xs text-center outline-none disabled:opacity-60"
                      style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
                    />
                  </div>
                  <button onClick={() => removeBlock(b.id)} disabled={saving} className="p-1 rounded-lg flex-shrink-0 disabled:opacity-40" style={{ color: C.gray }}>
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  {b.stations.map((st) => {
                    const category = categoryInfo(st.category);
                    return (
                      <div key={st.id} className="rounded-xl p-2.5" style={{ background: C.surface2, border: `1px solid ${C.borderSoft}` }}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 min-w-0 text-xs font-semibold truncate" style={{ color: category.color }}>
                            {st.name}
                          </div>
                          {b.rounds > 1 && (
                            <button onClick={() => replicateFirstRound(b.id, st.id)} disabled={saving} className="p-1 rounded-lg flex-shrink-0 disabled:opacity-40" title="Copiar 1ª volta para as demais" style={{ color: C.gray }}>
                              <Copy size={13} />
                            </button>
                          )}
                          <button onClick={() => removeStation(b.id, st.id)} disabled={saving} className="p-1 rounded-lg flex-shrink-0 disabled:opacity-40" style={{ color: C.gray }}>
                            <Trash2 size={13} />
                          </button>
                        </div>

                        <div className="mb-2">
                          <GoalPicker
                            goalType={st.goalType}
                            goalValue={st.goalValue}
                            goalLoadValue={st.goalLoadValue}
                            onChange={(patch) => updateStation(b.id, st.id, patch)}
                            disabled={saving}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          {st.sets.map((s, si) => (
                            <div key={s.id} className="flex items-center gap-2 flex-wrap">
                              {b.rounds > 1 && <span className="text-xs w-4 flex-shrink-0" style={{ color: C.gray }}>{si + 1}</span>}
                              <RoundFields metricType={st.metricType} round={s} onChange={(patch) => updateRound(b.id, st.id, s.id, patch)} />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPickerMode(b.id)}
                  disabled={saving}
                  className="mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold disabled:opacity-60"
                  style={{ background: `${hyrox.color}14`, color: hyrox.color, border: `1px dashed ${hyrox.color}55` }}
                >
                  <Plus size={13} /> Adicionar estação
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => setPickerMode("new-block")}
            disabled={saving}
            className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60"
            style={{ background: `${hyrox.color}14`, color: hyrox.color, border: `1px dashed ${hyrox.color}55` }}
          >
            <Plus size={15} /> Adicionar bloco
          </button>
        </div>

        <div>
          <label className="text-xs font-semibold" style={{ color: C.gray }}>Observações gerais (opcional)</label>
          <textarea
            value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="Como foi a sessão?"
            disabled={saving}
            className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none disabled:opacity-60"
            style={inputStyle}
          />
        </div>

        {error && <div className="text-sm text-center" style={{ color: C.danger }}>{error}</div>}
      </div>

      <div className="sticky bottom-0 px-4 sm:px-6 py-4" style={{ background: `color-mix(in srgb, ${C.bg} 95%, transparent)`, borderTop: `1px solid ${C.border}`, backdropFilter: "blur(8px)" }}>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full max-w-2xl mx-auto flex items-center justify-center rounded-xl py-3.5 text-sm font-semibold disabled:opacity-60"
          style={{ background: `linear-gradient(135deg, ${hyrox.color}, #4D7C0F)`, color: C.bg }}
        >
          {saving ? "Salvando…" : "Salvar treino"}
        </button>
      </div>

      {pickerMode && <ExercisePicker onSelect={handlePicked} onClose={() => setPickerMode(null)} />}
    </div>
  );
}
