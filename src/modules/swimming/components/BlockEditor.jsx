import { Plus, Trash2 } from "lucide-react";
import { C } from "../../../lib/theme";
import { BLOCK_TYPES } from "../constants";
import { uid } from "../../../lib/format";

const inputStyle = { background: C.surface, border: `1px solid ${C.border}`, color: C.white };

/* Editor livre de blocos (aquecimento / educativos / série principal /
   soltura), aproximando o registro manual da estrutura que um treinador
   normalmente escreve num plano de treino. Totalmente opcional. */
export function BlockEditor({ blocks, onChange }) {
  function addBlock() {
    onChange([...blocks, { id: uid(), blockType: "aquecimento", label: "", distanceM: "", reps: "", restSec: "", targetPace: "", notes: "" }]);
  }
  function updateBlock(id, patch) {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }
  function removeBlock(id) {
    onChange(blocks.filter((b) => b.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((b) => (
        <div key={b.id} className="rounded-xl p-3 flex flex-col gap-2" style={{ background: C.surface2, border: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2">
            <select
              value={b.blockType}
              onChange={(e) => updateBlock(b.id, { blockType: e.target.value })}
              className="rounded-lg px-2 py-1.5 text-xs font-semibold outline-none flex-1"
              style={inputStyle}
            >
              {BLOCK_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <button type="button" onClick={() => removeBlock(b.id)} className="p-1.5 rounded-lg flex-shrink-0" style={{ color: C.gray }}>
              <Trash2 size={14} />
            </button>
          </div>
          <input
            type="text" placeholder="Descrição (ex: 10 x 100m ritmo moderado)" value={b.label}
            onChange={(e) => updateBlock(b.id, { label: e.target.value })}
            className="w-full rounded-lg px-2.5 py-2 text-xs outline-none"
            style={inputStyle}
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <input
              type="number" min="0" placeholder="Dist. (m)" value={b.distanceM}
              onChange={(e) => updateBlock(b.id, { distanceM: e.target.value })}
              className="rounded-lg px-2 py-1.5 text-xs outline-none" style={inputStyle}
            />
            <input
              type="number" min="0" placeholder="Repetições" value={b.reps}
              onChange={(e) => updateBlock(b.id, { reps: e.target.value })}
              className="rounded-lg px-2 py-1.5 text-xs outline-none" style={inputStyle}
            />
            <input
              type="text" placeholder="Descanso (ex: 20s)" value={b.restSec}
              onChange={(e) => updateBlock(b.id, { restSec: e.target.value })}
              className="rounded-lg px-2 py-1.5 text-xs outline-none" style={inputStyle}
            />
            <input
              type="text" placeholder="Ritmo alvo (ex: 1:45)" value={b.targetPace}
              onChange={(e) => updateBlock(b.id, { targetPace: e.target.value })}
              className="rounded-lg px-2 py-1.5 text-xs outline-none" style={inputStyle}
            />
          </div>
          <input
            type="text" placeholder="Observações (opcional)" value={b.notes}
            onChange={(e) => updateBlock(b.id, { notes: e.target.value })}
            className="w-full rounded-lg px-2.5 py-2 text-xs outline-none"
            style={inputStyle}
          />
        </div>
      ))}
      <button
        type="button" onClick={addBlock}
        className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold"
        style={{ border: `1px dashed ${C.border}`, color: C.gray }}
      >
        <Plus size={14} /> Adicionar bloco
      </button>
    </div>
  );
}
