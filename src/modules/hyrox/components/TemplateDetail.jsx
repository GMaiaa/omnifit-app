import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowLeft, Pencil, Play, Trash2 } from "lucide-react";
import { C, modalityInfo } from "../../../lib/theme";
import { fmtDateShort, fmtDuration, fmtPace } from "../../../lib/format";
import { categoryInfo, focusInfo } from "../constants";
import { exerciseHistory } from "../analytics";
import { Card, CardHeader, Pill, Select } from "../../../components/ui";

const hyrox = modalityInfo("hyrox");

function formatMetricValue(metricType, value) {
  if (value === null || value === undefined) return "—";
  if (metricType === "reps") return `${Math.round(value)} reps`;
  if (metricType === "load") return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
  if (metricType === "time") return fmtDuration(value);
  return `${fmtPace(value)} /km`;
}

export function TemplateDetail({ template, sessions, onClose, onEdit, onDelete, onStart }) {
  const templateSessions = useMemo(
    () => sessions.filter((s) => s.templateId === template.id),
    [sessions, template.id]
  );

  const [exerciseKey, setExerciseKey] = useState(
    template.blocks[0]?.catalogId || template.blocks[0]?.name || null
  );
  const activeBlock = template.blocks.find((b) => (b.catalogId || b.name) === exerciseKey);
  const history = useMemo(
    () => (exerciseKey ? exerciseHistory(sessions, exerciseKey) : []),
    [sessions, exerciseKey]
  );
  const chartData = useMemo(
    () => history.map((p) => ({ label: fmtDateShort(p.date), value: p.primaryValue, isPR: p.isPR })),
    [history]
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: C.bg }}>
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3.5" style={{ background: `${C.bg}F2`, borderBottom: `1px solid ${C.border}`, backdropFilter: "blur(8px)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="p-1.5 rounded-full flex-shrink-0" style={{ color: C.gray }}>
            <ArrowLeft size={20} />
          </button>
          <div className="text-sm font-semibold truncate" style={{ color: C.white, fontFamily: "'Poppins', sans-serif" }}>{template.name}</div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg" style={{ color: C.gray }}><Pencil size={16} /></button>
          <button onClick={onDelete} className="p-1.5 rounded-lg" style={{ color: C.gray }}><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-5 max-w-2xl mx-auto flex flex-col gap-5">
        <button
          onClick={onStart}
          className="flex items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-semibold"
          style={{ background: `linear-gradient(135deg, ${hyrox.color}, #4D7C0F)`, color: C.bg }}
        >
          <Play size={15} /> Iniciar treino
        </button>

        <Card>
          <CardHeader title="Blocos" description={`${template.blocks.length} blocos nesta ficha · ${focusInfo(template.focus).label}`} />
          <div className="flex flex-col gap-2">
            {template.blocks.slice().sort((a, b) => a.order - b.order).map((b, i) => {
              const category = categoryInfo(b.category);
              return (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <span style={{ color: C.white }}>Bloco {i + 1} — {b.name}{b.rounds > 1 ? ` (${b.rounds}x)` : ""}</span>
                  <Pill color={category.color}>{category.label}</Pill>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Evolução por exercício"
            description={activeBlock ? `Melhor resultado por execução — ${categoryInfo(activeBlock.category).label}` : "Melhor resultado por execução"}
            right={
              <Select
                value={exerciseKey}
                onChange={setExerciseKey}
                options={template.blocks.map((b) => ({ value: b.catalogId || b.name, label: b.name }))}
              />
            }
          />
          {chartData.length === 0 ? (
            <p className="text-xs py-6 text-center" style={{ color: C.gray }}>Nenhuma execução registrada ainda para este exercício.</p>
          ) : (
            <div style={{ height: 190 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ left: -10, right: 8 }}>
                  <CartesianGrid stroke={C.borderSoft} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: C.gray, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false} />
                  <YAxis
                    tick={{ fill: C.gray, fontSize: 11 }} axisLine={false} tickLine={false}
                    reversed={activeBlock?.metricType === "distance"}
                    domain={["dataMin - 5", "dataMax + 5"]}
                  />
                  <Tooltip
                    contentStyle={{ background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: C.white }}
                    formatter={(v) => [formatMetricValue(activeBlock?.metricType, v), "Resultado"]}
                  />
                  <Line type="monotone" dataKey="value" stroke={hyrox.color} strokeWidth={2.5}
                    dot={(props) => {
                      const { cx, cy, payload, key } = props;
                      return <circle key={key} cx={cx} cy={cy} r={payload.isPR ? 5 : 3} fill={payload.isPR ? C.amber : hyrox.color} stroke="none" />;
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Histórico de execuções" description={`${templateSessions.length} treinos realizados`} />
          {templateSessions.length === 0 ? (
            <p className="text-sm py-4" style={{ color: C.gray }}>Nenhuma execução registrada ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {templateSessions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: C.surface2, border: `1px solid ${C.borderSoft}` }}>
                  <div className="flex flex-col items-center justify-center rounded-lg px-2 py-1.5" style={{ background: C.surface, minWidth: 52 }}>
                    <span style={{ color: C.gray, fontSize: 10 }}>{fmtDateShort(s.date)}</span>
                  </div>
                  <div className="flex-1 flex items-center gap-3 text-sm flex-wrap" style={{ color: C.white }}>
                    <span>{fmtDuration(s.durationSec)}</span>
                    <span style={{ color: C.gray }}>•</span>
                    <span>{s.blocks.length} blocos</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
