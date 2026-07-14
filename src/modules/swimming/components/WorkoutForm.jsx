import { useState } from "react";
import { ChevronDown, ChevronUp, Gauge, X } from "lucide-react";
import { C, modalityInfo } from "../../../lib/theme";
import { fmtPace, todayStr, uid } from "../../../lib/format";
import { ENVIRONMENTS, POOL_TYPES, STROKES, TYPES } from "../constants";
import { BlockEditor } from "./BlockEditor";
import { DrillPicker } from "./DrillPicker";

const natacao = modalityInfo("natacao");
const inputStyle = { background: C.surface2, border: `1px solid ${C.border}`, color: C.white };

/* ---------------------------------------------------------
   NEW WORKOUT FORM
--------------------------------------------------------- */
export function WorkoutForm({ onSave, onClose }) {
  const [date, setDate] = useState(todayStr());
  const [environment, setEnvironment] = useState("piscina");
  const [poolType, setPoolType] = useState("25");
  const [customPoolLengthM, setCustomPoolLengthM] = useState("");
  const [type, setType] = useState("continuo");
  const [stroke, setStroke] = useState("livre");
  const [distance, setDistance] = useState("");
  const [durMin, setDurMin] = useState("");
  const [durSec, setDurSec] = useState("");
  const [swolf, setSwolf] = useState("");
  const [rpe, setRpe] = useState(5);
  const [notes, setNotes] = useState("");
  const [blocks, setBlocks] = useState([]);
  const [drills, setDrills] = useState([]);
  const [showStructure, setShowStructure] = useState(false);
  const [error, setError] = useState("");

  const distNum = parseFloat(distance.replace(",", "."));
  const totalSec = (parseInt(durMin || 0, 10) * 60) + parseInt(durSec || 0, 10);
  const paceLive = distNum > 0 && totalSec > 0 ? totalSec / (distNum / 100) : null;

  function handleSubmit() {
    if (!distNum || distNum <= 0) return setError("Informe uma distância válida.");
    if (!totalSec || totalSec <= 0) return setError("Informe o tempo do treino.");
    if (environment === "piscina" && poolType === "personalizada" && !(parseFloat(customPoolLengthM.replace(",", ".")) > 0)) {
      return setError("Informe o comprimento da piscina personalizada.");
    }
    setError("");
    onSave({
      id: uid(),
      date,
      environment,
      poolType: environment === "piscina" ? poolType : null,
      poolLengthM: environment === "piscina"
        ? (poolType === "personalizada" ? parseFloat(customPoolLengthM.replace(",", ".")) : parseInt(poolType, 10))
        : null,
      type,
      stroke,
      distanceM: distNum,
      durationSec: totalSec,
      avgSwolf: swolf ? parseFloat(swolf.replace(",", ".")) : null,
      rpe,
      notes: notes.trim(),
      blocks: blocks.map((b) => ({
        ...b,
        distanceM: b.distanceM ? parseFloat(b.distanceM) : null,
        reps: b.reps ? parseInt(b.reps, 10) : null,
      })),
      drills: type === "educativo"
        ? drills.map((d) => ({ ...d, distanceM: d.distanceM ? parseFloat(d.distanceM) : null, reps: d.reps ? parseInt(d.reps, 10) : null }))
        : [],
    });
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
          <button onClick={onClose} className="rounded-full p-1.5" style={{ color: C.gray }}>
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Data</label>
            <input
              type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={inputStyle}
            />
          </div>

          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Local</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {ENVIRONMENTS.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEnvironment(e.id)}
                  className="rounded-xl px-2 py-2 text-xs font-semibold transition"
                  style={{
                    background: environment === e.id ? `${natacao.color}26` : C.surface2,
                    color: environment === e.id ? natacao.color : C.gray,
                    border: `1px solid ${environment === e.id ? natacao.color : C.border}`,
                  }}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {environment === "piscina" && (
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Piscina</label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {POOL_TYPES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPoolType(p.id)}
                    className="rounded-xl px-2 py-2 text-xs font-semibold transition"
                    style={{
                      background: poolType === p.id ? `${natacao.color}26` : C.surface2,
                      color: poolType === p.id ? natacao.color : C.gray,
                      border: `1px solid ${poolType === p.id ? natacao.color : C.border}`,
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {poolType === "personalizada" && (
                <input
                  type="text" inputMode="decimal" placeholder="Comprimento da piscina (m)" value={customPoolLengthM}
                  onChange={(e) => setCustomPoolLengthM(e.target.value)}
                  className="mt-2 w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={inputStyle}
                />
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Tipo de treino</label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className="rounded-xl px-2 py-2 text-xs font-semibold transition"
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

          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Estilo predominante</label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {STROKES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStroke(s.id)}
                  className="rounded-xl px-2 py-2 text-xs font-semibold transition"
                  style={{
                    background: stroke === s.id ? `${s.color}26` : C.surface2,
                    color: stroke === s.id ? s.color : C.gray,
                    border: `1px solid ${stroke === s.id ? s.color : C.border}`,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Distância total (m)</label>
              <input
                type="text" inputMode="decimal" placeholder="ex: 3200" value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Tempo</label>
              <div className="mt-1 flex items-center gap-1">
                <input
                  type="number" min="0" placeholder="min" value={durMin}
                  onChange={(e) => setDurMin(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={inputStyle}
                />
                <span style={{ color: C.gray }}>:</span>
                <input
                  type="number" min="0" max="59" placeholder="seg" value={durSec}
                  onChange={(e) => setDurSec(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {paceLive && (
            <div className="rounded-xl px-3 py-2 text-sm flex items-center gap-2" style={{ background: `${natacao.color}14`, color: natacao.color }}>
              <Gauge size={15} /> Ritmo médio: {fmtPace(paceLive)} /100m
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>SWOLF médio</label>
              <input
                type="number" placeholder="opcional" value={swolf}
                onChange={(e) => setSwolf(e.target.value)}
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Esforço percebido (RPE): {rpe}</label>
              <input
                type="range" min="1" max="10" value={rpe}
                onChange={(e) => setRpe(parseInt(e.target.value, 10))}
                className="mt-3 w-full"
              />
            </div>
          </div>

          {type === "educativo" && (
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Exercícios educativos realizados</label>
              <div className="mt-1.5">
                <DrillPicker entries={drills} onChange={setDrills} />
              </div>
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={() => setShowStructure((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: natacao.color }}
            >
              {showStructure ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Estrutura do treino em blocos (opcional)
            </button>
            {showStructure && (
              <div className="mt-2">
                <BlockEditor blocks={blocks} onChange={setBlocks} />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold" style={{ color: C.gray }}>Notas (opcional)</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Como foi o treino?"
              className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
              style={inputStyle}
            />
          </div>

          {error && <div className="text-sm" style={{ color: C.danger }}>{error}</div>}

          <button
            onClick={handleSubmit}
            className="mt-1 w-full rounded-xl py-3 text-sm font-semibold"
            style={{ background: `linear-gradient(135deg, ${natacao.color}, #1E5FCC)`, color: C.bg }}
          >
            Salvar treino
          </button>
        </div>
      </div>
    </div>
  );
}
