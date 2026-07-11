import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { C, modalityInfo } from "../../../lib/theme";
import { EQUIPMENT, EXERCISE_CATALOG, MUSCLE_GROUPS } from "../constants";

const musculacao = modalityInfo("musculacao");

/* Search-and-pick sheet over the built-in exercise catalog, with a fallback
   to a custom entry (name + muscle group + equipment) when nothing fits —
   shared by TemplateForm (building a ficha) and SessionRunner (add/substitute
   mid-workout). */
export function ExercisePicker({ onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customGroup, setCustomGroup] = useState(MUSCLE_GROUPS[0].id);
  const [customEquipment, setCustomEquipment] = useState(EQUIPMENT[0]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? EXERCISE_CATALOG.filter((e) => e.name.toLowerCase().includes(q))
      : EXERCISE_CATALOG;
    const byGroup = new Map();
    for (const e of list) {
      if (!byGroup.has(e.muscleGroup)) byGroup.set(e.muscleGroup, []);
      byGroup.get(e.muscleGroup).push(e);
    }
    return MUSCLE_GROUPS
      .map((g) => ({ group: g, items: byGroup.get(g.id) || [] }))
      .filter((g) => g.items.length > 0);
  }, [query]);

  function pick(entry) {
    onSelect({ catalogId: entry.id, name: entry.name, muscleGroup: entry.muscleGroup, equipment: entry.equipment });
  }

  function saveCustom() {
    if (!customName.trim()) return;
    onSelect({ catalogId: null, name: customName.trim(), muscleGroup: customGroup, equipment: customEquipment });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" style={{ background: "rgba(3,7,18,0.7)" }}>
      <div
        className="w-full sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl"
        style={{ background: C.bgSoft, border: `1px solid ${C.border}` }}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-3">
          <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 18, color: C.white }}>
            {customMode ? "Exercício customizado" : "Escolher exercício"}
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5" style={{ color: C.gray }}>
            <X size={20} />
          </button>
        </div>

        {customMode ? (
          <div className="flex flex-col gap-4 px-6 pb-6 overflow-y-auto">
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Nome do exercício</label>
              <input
                autoFocus type="text" value={customName} onChange={(e) => setCustomName(e.target.value)}
                placeholder="ex: Remada Cavalinho"
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Grupo muscular</label>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {MUSCLE_GROUPS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setCustomGroup(g.id)}
                    className="rounded-lg px-2 py-1.5 text-xs font-semibold transition"
                    style={{
                      background: customGroup === g.id ? `${g.color}26` : C.surface2,
                      color: customGroup === g.id ? g.color : C.gray,
                      border: `1px solid ${customGroup === g.id ? g.color : C.border}`,
                    }}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Equipamento</label>
              <select
                value={customEquipment} onChange={(e) => setCustomEquipment(e.target.value)}
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
              >
                {EQUIPMENT.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
              </select>
            </div>
            <button
              onClick={saveCustom}
              disabled={!customName.trim()}
              className="mt-1 w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${musculacao.color}, #5B21B6)`, color: C.white }}
            >
              Adicionar exercício
            </button>
          </div>
        ) : (
          <>
            <div className="px-6 pb-3">
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: C.surface2, border: `1px solid ${C.border}` }}>
                <Search size={15} style={{ color: C.gray }} />
                <input
                  autoFocus type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar exercício…"
                  className="w-full bg-transparent text-sm outline-none"
                  style={{ color: C.white }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {results.length === 0 && (
                <p className="px-3 py-4 text-sm" style={{ color: C.gray }}>Nenhum exercício encontrado.</p>
              )}
              {results.map(({ group, items }) => (
                <div key={group.id} className="mb-2">
                  <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: group.color }}>
                    {group.label}
                  </div>
                  {items.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => pick(e)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm"
                      style={{ color: C.white }}
                    >
                      <span>{e.name}</span>
                      <span style={{ color: C.gray, fontSize: 11 }}>{e.equipment}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <div className="px-6 py-4" style={{ borderTop: `1px solid ${C.borderSoft}` }}>
              <button
                onClick={() => { setCustomName(query); setCustomMode(true); }}
                className="w-full rounded-xl py-2.5 text-sm font-semibold"
                style={{ background: C.surface2, color: musculacao.color, border: `1px solid ${C.border}` }}
              >
                + Exercício customizado
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
