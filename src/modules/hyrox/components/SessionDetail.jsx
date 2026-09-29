import { ArrowLeft, Target, Trash2 } from "lucide-react";
import { C, modalityInfo } from "../../../lib/theme";
import { fmtDateShort, fmtDistanceM, fmtDuration } from "../../../lib/format";
import { useLockBodyScroll } from "../../../lib/useLockBodyScroll";
import { categoryInfo, focusInfo, formatGoalValue } from "../constants";
import { Card, CardHeader, Pill } from "../../../components/ui";

const hyrox = modalityInfo("hyrox");

/* Sessões podem ter blocos "agrupados" (groupLabel/groupRounds, produzidos
   pelo registro pós-treino — várias estações repetidas juntas N vezes) ou
   blocos soltos (produzidos pelo HyroxRunner — uma estação por bloco, sem
   grupo). Reagrupa aqui só pra exibição; o formato salvo continua sempre a
   mesma lista plana, então analytics/histórico não precisam saber disso. */
function groupBlocks(blocks) {
  const sorted = blocks.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const groups = [];
  for (const b of sorted) {
    const last = groups[groups.length - 1];
    if (b.groupLabel && last?.label === b.groupLabel) {
      last.stations.push(b);
    } else {
      groups.push({ label: b.groupLabel || null, rounds: b.groupRounds || null, stations: [b] });
    }
  }
  return groups;
}

function formatRoundResult(metricType, set) {
  if (metricType === "reps") return `${set.reps ?? "—"} reps`;
  if (metricType === "load") {
    const parts = [];
    if (set.weight) parts.push(`${set.weight} kg`);
    if (set.reps) parts.push(`${set.reps} reps`);
    if (set.distanceM) parts.push(fmtDistanceM(set.distanceM));
    return parts.join(" • ") || "—";
  }
  if (metricType === "time") return fmtDuration(set.durationSec || 0);
  return fmtDistanceM(set.distanceM || 0);
}

/* ---------------------------------------------------------
   DETALHE DE UMA EXECUÇÃO — somente leitura. Cobre qualquer sessão
   (ficha, Treino Livre ou registro pós-treino), já que todas compartilham o
   mesmo formato de blocks.
--------------------------------------------------------- */
export function SessionDetail({ session, onClose, onDelete }) {
  useLockBodyScroll();
  const groups = groupBlocks(session.blocks);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: C.bg }}>
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3.5" style={{ background: `color-mix(in srgb, ${C.bg} 95%, transparent)`, borderBottom: `1px solid ${C.border}`, backdropFilter: "blur(8px)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="p-1.5 rounded-full flex-shrink-0" style={{ color: C.gray }}>
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: C.white, fontFamily: "'Poppins', sans-serif" }}>{session.templateName}</div>
            <div className="text-xs" style={{ color: C.gray }}>{fmtDateShort(session.date)}</div>
          </div>
        </div>
        {onDelete && (
          <button onClick={onDelete} className="p-1.5 rounded-lg flex-shrink-0" style={{ color: C.gray }}>
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="px-4 sm:px-6 py-5 max-w-2xl mx-auto flex flex-col gap-5">
        <Card>
          <CardHeader title="Métricas gerais" description={focusInfo(session.focus).label} />
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div style={{ color: C.gray, fontSize: 11 }}>Duração</div>
              <div style={{ color: C.white, fontWeight: 600 }}>{fmtDuration(session.durationSec)}</div>
            </div>
            <div>
              <div style={{ color: C.gray, fontSize: 11 }}>Calorias</div>
              <div style={{ color: C.white, fontWeight: 600 }}>{session.calories != null ? `${session.calories} cal` : "—"}</div>
            </div>
            <div>
              <div style={{ color: C.gray, fontSize: 11 }}>FC média</div>
              <div style={{ color: C.white, fontWeight: 600 }}>{session.avgHeartRate != null ? `${session.avgHeartRate} bpm` : "—"}</div>
            </div>
          </div>
          {session.notes && <p className="mt-3 text-sm" style={{ color: C.gray }}>{session.notes}</p>}
        </Card>

        <Card>
          <CardHeader title="Blocos" description={`${groups.length} blocos · ${session.blocks.length} estações`} />
          <div className="flex flex-col gap-3">
            {groups.map((g, gi) => (
              <div key={gi} className="rounded-xl p-3" style={{ background: C.surface2, border: `1px solid ${C.borderSoft}` }}>
                <div className="text-sm font-semibold mb-2" style={{ color: C.white }}>
                  {g.label ? `${g.label}${g.rounds > 1 ? ` — ${g.rounds}x` : ""}` : `Bloco ${gi + 1} — ${g.stations[0].name}`}
                </div>
                <div className="flex flex-col gap-3">
                  {g.stations.map((st) => {
                    const category = categoryInfo(st.category);
                    const goalLabel = formatGoalValue(st.goalType, st.goalValue, st.goalLoadValue);
                    return (
                      <div key={st.id}>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span style={{ color: category.color, fontWeight: 600 }}>{st.name}</span>
                          <Pill color={category.color}>{category.label}</Pill>
                        </div>
                        {goalLabel && (
                          <div className="flex items-center gap-1 mt-0.5 text-xs font-semibold" style={{ color: hyrox.color }}>
                            <Target size={11} /> Meta: {goalLabel}
                          </div>
                        )}
                        <div className="mt-1.5 flex flex-col gap-1">
                          {st.sets.map((s, si) => (
                            <div key={s.id} className="text-xs flex items-center gap-2">
                              <span className="w-4 flex-shrink-0" style={{ color: C.gray }}>{si + 1}</span>
                              <span style={{ color: C.white }}>{formatRoundResult(st.metricType, s)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
