import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { C, modalityInfo } from "../../../lib/theme";
import { CATEGORIES, EXERCISE_CATALOG, METRIC_TYPES } from "../constants";

const hyrox = modalityInfo("hyrox");

/* Search-and-pick sheet over the built-in HYROX catalog, with a fallback to
   a custom entry (name + categoria + tipo de métrica) when nothing fits —
   shared by TemplateForm (montando uma ficha) and HyroxRunner (add/substitute
   mid-workout, inclusive no Treino Livre). */
export function ExercisePicker({ onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState(CATEGORIES[0].id);
  const [customMetricType, setCustomMetricType] = useState(METRIC_TYPES[0].id);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? EXERCISE_CATALOG.filter((e) => e.name.toLowerCase().includes(q))
      : EXERCISE_CATALOG;
    const byCategory = new Map();
    for (const e of list) {
      if (!byCategory.has(e.category)) byCategory.set(e.category, []);
      byCategory.get(e.category).push(e);
    }
    return CATEGORIES
      .map((c) => ({ category: c, items: byCategory.get(c.id) || [] }))
      .filter((c) => c.items.length > 0);
  }, [query]);

  function pick(entry) {
    onSelect({ catalogId: entry.id, name: entry.name, category: entry.category, metricType: entry.metricType });
  }

  function saveCustom() {
    if (!customName.trim()) return;
    onSelect({ catalogId: null, name: customName.trim(), category: customCategory, metricType: customMetricType });
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
                placeholder="ex: Prowler Sprint"
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.white }}
              />
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Categoria</label>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCustomCategory(c.id)}
                    className="rounded-lg px-2 py-1.5 text-xs font-semibold transition"
                    style={{
                      background: customCategory === c.id ? `${c.color}26` : C.surface2,
                      color: customCategory === c.id ? c.color : C.gray,
                      border: `1px solid ${customCategory === c.id ? c.color : C.border}`,
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold" style={{ color: C.gray }}>Tipo de registro</label>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {METRIC_TYPES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setCustomMetricType(m.id)}
                    className="rounded-lg px-2 py-1.5 text-xs font-semibold transition"
                    style={{
                      background: customMetricType === m.id ? `${hyrox.color}26` : C.surface2,
                      color: customMetricType === m.id ? hyrox.color : C.gray,
                      border: `1px solid ${customMetricType === m.id ? hyrox.color : C.border}`,
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={saveCustom}
              disabled={!customName.trim()}
              className="mt-1 w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${hyrox.color}, #4D7C0F)`, color: C.bg }}
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
              {results.map(({ category, items }) => (
                <div key={category.id} className="mb-2">
                  <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: category.color }}>
                    {category.label}
                  </div>
                  {items.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => pick(e)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm"
                      style={{ color: C.white }}
                    >
                      <span>{e.name}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>

            <div className="px-6 py-4" style={{ borderTop: `1px solid ${C.borderSoft}` }}>
              <button
                onClick={() => { setCustomName(query); setCustomMode(true); }}
                className="w-full rounded-xl py-2.5 text-sm font-semibold"
                style={{ background: C.surface2, color: hyrox.color, border: `1px solid ${C.border}` }}
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
