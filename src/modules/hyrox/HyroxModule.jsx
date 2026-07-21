import { useState } from "react";
import { BarChart3, ListChecks, PlusCircle, Zap } from "lucide-react";
import { C, modalityInfo } from "../../lib/theme";
import { uid } from "../../lib/format";
import { DEFAULT_ROUNDS } from "./constants";
import { EmptyState } from "../../components/ui";
import { TemplateCard } from "./components/TemplateCard";
import { TemplateForm } from "./components/TemplateForm";
import { TemplateDetail } from "./components/TemplateDetail";
import { HyroxRunner } from "./components/HyroxRunner";
import { AnalyticsTab } from "./components/analytics/AnalyticsTab";

const hyrox = modalityInfo("hyrox");

const SUB_NAV = [
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "treinos", label: "Treinos", icon: ListChecks },
];

const FREE_TEMPLATE = { id: null, name: "Treino Livre", focus: "metcon", blocks: [] };

function buildTemplateBlocksFromSession(blocks) {
  return blocks.map((b, i) => ({
    id: uid(),
    catalogId: b.sourceExerciseId,
    name: b.name,
    category: b.category,
    metricType: b.metricType,
    notes: b.notes || "",
    order: i,
    rounds: b.sets.filter((s) => s.status !== "skipped").length || DEFAULT_ROUNDS,
  }));
}

export function HyroxModule({ templates, sessions }) {
  const [tab, setTab] = useState("treinos");
  const [formTarget, setFormTarget] = useState(null); // null | true (new) | template (edit)
  const [detailTemplate, setDetailTemplate] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [summary, setSummary] = useState(null);

  function handleSaveTemplate(template) {
    const isEdit = formTarget && formTarget !== true;
    if (isEdit) templates.updateTemplate(template.id, template);
    else templates.addTemplate(template);
    setFormTarget(null);
  }

  function handleDeleteTemplate(id) {
    if (!window.confirm("Excluir este treino? O histórico de execuções continua salvo.")) return;
    templates.deleteTemplate(id);
    if (detailTemplate?.id === id) setDetailTemplate(null);
  }

  function handleSessionComplete(session, action) {
    sessions.addSession(session);
    if (action.type === "update") {
      templates.updateTemplate(session.templateId, {
        focus: session.focus,
        blocks: buildTemplateBlocksFromSession(session.blocks),
      });
    } else if (action.type === "new") {
      templates.addTemplate({
        id: uid(),
        name: action.newTemplateName || session.templateName || "Treino HYROX",
        focus: session.focus,
        blocks: buildTemplateBlocksFromSession(session.blocks),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    setSummary({ durationSec: session.durationSec, blocks: session.blocks.length });
    setActiveSession(null);
    setTimeout(() => setSummary(null), 6000);
  }

  function lastSessionDateFor(templateId) {
    return sessions.sessions.find((s) => s.templateId === templateId)?.date ?? null;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <nav className="flex gap-1 overflow-x-auto">
          {SUB_NAV.map((n) => {
            const active = tab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold rounded-t-lg whitespace-nowrap"
                style={{
                  color: active ? hyrox.color : C.gray,
                  borderBottom: active ? `2px solid ${hyrox.color}` : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                <n.icon size={16} /> {n.label}
              </button>
            );
          })}
        </nav>
        {tab === "treinos" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSession(FREE_TEMPLATE)}
              className="flex items-center gap-1.5 rounded-full px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold"
              style={{ background: C.surface2, color: hyrox.color, border: `1px solid ${hyrox.color}55` }}
            >
              <Zap size={16} /> <span className="hidden sm:inline">Treino Livre</span>
            </button>
            <button
              onClick={() => setFormTarget(true)}
              className="flex items-center gap-1.5 rounded-full px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold"
              style={{ background: `linear-gradient(135deg, ${hyrox.color}, #4D7C0F)`, color: C.bg }}
            >
              <PlusCircle size={16} /> <span className="hidden sm:inline">Novo treino</span>
            </button>
          </div>
        )}
      </div>

      {(templates.loading || sessions.loading) ? (
        <div className="flex justify-center py-20" style={{ color: C.gray }}>Carregando…</div>
      ) : tab === "analytics" ? (
        <AnalyticsTab sessions={sessions.sessions} />
      ) : templates.templates.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Sua lista de treinos está vazia"
          description='Toque em "Novo treino" para criar sua primeira ficha, ou em "Treino Livre" para registrar uma aula sem planejamento prévio.'
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              lastSessionDate={lastSessionDateFor(t.id)}
              onStart={() => setActiveSession(t)}
              onEdit={() => setFormTarget(t)}
              onDelete={() => handleDeleteTemplate(t.id)}
              onOpenDetail={() => setDetailTemplate(t)}
            />
          ))}
        </div>
      )}

      {(templates.saveError || sessions.saveError) && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm z-50"
          style={{ background: `${C.danger}22`, color: C.danger, border: `1px solid ${C.danger}55` }}
        >
          {templates.saveError || sessions.saveError}
        </div>
      )}

      {summary && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm z-50 flex items-center gap-3"
          style={{ background: C.bgSoft, border: `1px solid ${hyrox.color}55`, color: C.white }}
        >
          <span style={{ color: hyrox.color, fontWeight: 700 }}>Treino concluído!</span>
          <span style={{ color: C.gray }}>
            {summary.blocks} blocos • {Math.floor(summary.durationSec / 60)} min
          </span>
        </div>
      )}

      {formTarget && (
        <TemplateForm
          initial={formTarget === true ? null : formTarget}
          onSave={handleSaveTemplate}
          onClose={() => setFormTarget(null)}
        />
      )}

      {detailTemplate && (
        <TemplateDetail
          template={detailTemplate}
          sessions={sessions.sessions}
          onClose={() => setDetailTemplate(null)}
          onEdit={() => { setFormTarget(detailTemplate); setDetailTemplate(null); }}
          onDelete={() => handleDeleteTemplate(detailTemplate.id)}
          onStart={() => { setActiveSession(detailTemplate); setDetailTemplate(null); }}
        />
      )}

      {activeSession && (
        <HyroxRunner
          template={activeSession}
          sessions={sessions.sessions}
          onComplete={handleSessionComplete}
          onClose={() => setActiveSession(null)}
        />
      )}
    </div>
  );
}
