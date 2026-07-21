import { useState } from "react";
import { Copy, History, RefreshCw, X, Zap } from "lucide-react";
import { C, modalityInfo } from "../../../lib/theme";

const hyrox = modalityInfo("hyrox");

const TEMPLATE_OPTIONS = [
  { id: "today", icon: Zap, title: "Somente nesta execução", description: "Mantém o treino salvo original inalterado." },
  { id: "update", icon: RefreshCw, title: "Atualizar treino salvo", description: "Substitui a ficha original com essas mudanças." },
  { id: "new", icon: Copy, title: "Salvar como novo treino", description: "Cria uma nova ficha com esta versão." },
];

const FREE_OPTIONS = [
  { id: "today", icon: History, title: "Não, manter apenas no histórico", description: "O treino fica registrado, mas não vira uma ficha reutilizável." },
  { id: "new", icon: Copy, title: "Salvar como novo treino", description: "Cria uma ficha reutilizável a partir deste Treino Livre." },
];

/* Shown when finishing a session. Two flows, same shell:
   - hasTemplate: sessão veio de uma ficha cuja estrutura mudou (3 opções).
   - !hasTemplate: Treino Livre sem origem — pergunta simples de reutilização. */
export function SaveChoiceModal({ hasTemplate, originalName, onChoose, onCancel }) {
  const [newName, setNewName] = useState(hasTemplate ? `${originalName} (nova versão)` : "");
  const [pendingNew, setPendingNew] = useState(false);
  const options = hasTemplate ? TEMPLATE_OPTIONS : FREE_OPTIONS;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" style={{ background: "rgba(3,7,18,0.75)" }}>
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6"
        style={{ background: C.bgSoft, border: `1px solid ${C.border}` }}
      >
        <div className="flex items-center justify-between mb-1">
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 18, color: C.white }}>
            {hasTemplate ? "Deseja salvar essas alterações?" : "Deseja salvar este treino para reutilização?"}
          </h2>
          <button onClick={onCancel} className="rounded-full p-1.5" style={{ color: C.gray }}>
            <X size={20} />
          </button>
        </div>
        {hasTemplate && (
          <p className="text-xs mb-4" style={{ color: C.gray }}>
            Você alterou a estrutura do treino em relação à ficha "{originalName}".
          </p>
        )}

        {pendingNew ? (
          <div className="flex flex-col gap-3 mt-3">
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Nome do treino</label>
              <input
                autoFocus type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="ex: Treino de Potência"
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
              />
            </div>
            <button
              onClick={() => onChoose("new", newName.trim() || originalName || "Treino HYROX")}
              disabled={!newName.trim() && !originalName}
              className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${hyrox.color}, #4D7C0F)`, color: C.bg }}
            >
              Salvar treino
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mt-3">
            {options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => (opt.id === "new" ? setPendingNew(true) : onChoose(opt.id))}
                className="flex items-start gap-3 rounded-xl px-4 py-3 text-left"
                style={{ background: C.surface2, border: `1px solid ${C.border}` }}
              >
                <opt.icon size={16} style={{ color: hyrox.color, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div className="text-sm font-semibold" style={{ color: C.white }}>{opt.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: C.gray }}>{opt.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
