import { useState } from "react";
import { AlertTriangle, BarChart3, ClipboardList, History, ListChecks, PlusCircle, Zap, Trophy } from "lucide-react";
import { C, modalityInfo } from "../../lib/theme";
import { fmtDateShort, fmtDuration, uid } from "../../lib/format";
import { DEFAULT_ROUNDS } from "./constants";
import {
  createHyroxSession, createHyroxTemplate, deleteHyroxSession, deleteHyroxTemplate,
  mapHyroxError, updateHyroxTemplate,
} from "./hyroxService";
import { Card, EmptyState } from "../../components/ui";
import { ShareModal } from "../../components/ShareModal";
import { TemplateCard } from "./components/TemplateCard";
import { TemplateForm } from "./components/TemplateForm";
import { TemplateDetail } from "./components/TemplateDetail";
import { HyroxRunner } from "./components/HyroxRunner";
import { ManualSessionForm } from "./components/ManualSessionForm";
import { SessionDetail } from "./components/SessionDetail";
import { AnalyticsTab } from "./components/analytics/AnalyticsTab";
import { RecordsTab } from "./components/RecordsTab";

const hyrox = modalityInfo("hyrox");

const SUB_NAV = [
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "recordes", label: "Recordes", icon: Trophy },
  { id: "treinos", label: "Treinos", icon: ListChecks },
  { id: "historico", label: "Histórico", icon: History },
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
  const [manualFormOpen, setManualFormOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [summary, setSummary] = useState(null);
  const [actionError, setActionError] = useState("");
  const [shareTarget, setShareTarget] = useState(null);

  function handleShareTemplate(t) {
    setShareTarget({
      modality: "hyrox",
      sourceType: "template",
      sourceId: t.id,
      title: t.name,
      payload: { name: t.name, focus: t.focus, blocks: t.blocks },
    });
  }

  function handleSaveTemplate(template) {
    const isEdit = formTarget && formTarget !== true;
    if (isEdit) templates.updateTemplate(template.id, template);
    else templates.addTemplate(template);
    setFormTarget(null);
  }

  async function handleDeleteTemplate(id) {
    if (!window.confirm("Excluir este treino? O histórico de execuções continua salvo.")) return;
    setActionError("");
    try {
      await deleteHyroxTemplate(id);
      templates.deleteTemplate(id);
      if (detailTemplate?.id === id) setDetailTemplate(null);
    } catch (err) {
      setActionError(mapHyroxError(err, "Não foi possível excluir o treino. Tente novamente."));
    }
  }

  /* Grava a execução em public.hyrox_sessions. Se o insert falhar, joga o
     erro de volta pro HyroxRunner (que mantém a tela aberta e os dados
     intactos) em vez de fingir que salvou. A cópia/atualização de ficha
     (quando a estrutura mudou) só roda depois que a sessão em si já está
     garantida no banco. */
  async function handleSessionComplete(session, action) {
    let createdSession;
    try {
      createdSession = await createHyroxSession({
        templateId: session.templateId,
        templateName: session.templateName,
        focus: session.focus,
        date: session.date,
        startedAt: session.startedAt,
        finishedAt: session.finishedAt,
        durationSec: session.durationSec,
        notes: session.notes,
        blocks: session.blocks,
      });
    } catch (err) {
      throw new Error(mapHyroxError(err, "Não foi possível salvar o treino. Tente novamente."));
    }

    sessions.addSession(createdSession);

    if (action.type === "update") {
      try {
        const updatedTemplate = await updateHyroxTemplate(createdSession.templateId, {
          name: createdSession.templateName,
          focus: createdSession.focus,
          blocks: buildTemplateBlocksFromSession(createdSession.blocks),
        });
        templates.updateTemplate(updatedTemplate.id, updatedTemplate);
      } catch (err) {
        // O treino já foi salvo — só a atualização da ficha falhou. Avisa
        // sem desfazer o que já deu certo.
        setActionError(mapHyroxError(err, "Treino salvo, mas não foi possível atualizar a ficha."));
      }
    } else if (action.type === "new") {
      try {
        const newTemplate = await createHyroxTemplate({
          name: action.newTemplateName || createdSession.templateName || "Treino HYROX",
          focus: createdSession.focus,
          blocks: buildTemplateBlocksFromSession(createdSession.blocks),
        });
        templates.addTemplate(newTemplate);
      } catch (err) {
        setActionError(mapHyroxError(err, "Treino salvo, mas não foi possível criar a nova ficha."));
      }
    }

    setSummary({ durationSec: createdSession.durationSec, blocks: createdSession.blocks.length });
    setActiveSession(null);
    setTimeout(() => setSummary(null), 6000);
  }

  /* Registro pós-treino (ManualSessionForm) — sem ficha, sem timer ao vivo.
     Mesmo insert de handleSessionComplete, mas sem a lógica de
     atualizar/criar ficha (não existe SaveChoiceModal aqui: é sempre um
     registro avulso). */
  async function handleManualSessionComplete(session) {
    let createdSession;
    try {
      createdSession = await createHyroxSession({
        templateId: null,
        templateName: session.templateName,
        focus: session.focus,
        date: session.date,
        startedAt: session.startedAt,
        finishedAt: session.finishedAt,
        durationSec: session.durationSec,
        notes: session.notes,
        calories: session.calories,
        avgHeartRate: session.avgHeartRate,
        blocks: session.blocks,
      });
    } catch (err) {
      throw new Error(mapHyroxError(err, "Não foi possível salvar o treino. Tente novamente."));
    }

    sessions.addSession(createdSession);
    setManualFormOpen(false);
    setSummary({ durationSec: createdSession.durationSec, blocks: createdSession.blocks.length });
    setTimeout(() => setSummary(null), 6000);
  }

  async function handleDeleteSession(id) {
    if (!window.confirm("Excluir esta execução? Essa ação não pode ser desfeita.")) return;
    setActionError("");
    try {
      await deleteHyroxSession(id);
      sessions.deleteSession(id);
      if (selectedSession?.id === id) setSelectedSession(null);
    } catch (err) {
      setActionError(mapHyroxError(err, "Não foi possível excluir o treino. Tente novamente."));
    }
  }

  function lastSessionDateFor(templateId) {
    return sessions.sessions.find((s) => s.templateId === templateId)?.date ?? null;
  }

  const hasBlockingTemplatesError = !!templates.error && templates.templates.length === 0;

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
        {(tab === "treinos" || tab === "historico") && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setManualFormOpen(true)}
              className="flex items-center gap-1.5 rounded-full px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold"
              style={{ background: C.surface2, color: C.gray, border: `1px solid ${C.border}` }}
            >
              <ClipboardList size={16} /> <span className="hidden sm:inline">Registrar treino</span>
            </button>
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
      ) : tab === "recordes" ? (
        <RecordsTab sessions={sessions.sessions} />
      ) : tab === "historico" ? (
        sessions.sessions.length === 0 ? (
          <EmptyState
            icon={History}
            title="Nenhuma execução registrada ainda"
            description='Toque em "Registrar treino" pra cadastrar um treino que você já fez, ou finalize uma ficha/Treino Livre pra ele aparecer aqui.'
          />
        ) : (
          <div className="flex flex-col gap-2">
            {sessions.sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSession(s)}
                className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-left"
                style={{ background: C.surface, border: `1px solid ${C.border}` }}
              >
                <div className="flex flex-col items-center justify-center rounded-lg px-2.5 py-1.5 flex-shrink-0" style={{ background: C.surface2, minWidth: 56 }}>
                  <span style={{ color: C.gray, fontSize: 10 }}>{fmtDateShort(s.date)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate" style={{ color: C.white }}>{s.templateName}</div>
                  <div className="flex items-center gap-2 text-xs flex-wrap" style={{ color: C.gray }}>
                    <span>{fmtDuration(s.durationSec)}</span>
                    <span>•</span>
                    <span>{s.blocks.length} estações</span>
                    {s.calories != null && <><span>•</span><span>{s.calories} cal</span></>}
                    {s.avgHeartRate != null && <><span>•</span><span>{s.avgHeartRate} bpm</span></>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )
      ) : hasBlockingTemplatesError ? (
        <Card className="flex flex-col items-center justify-center text-center py-16 gap-3">
          <div className="rounded-full p-4" style={{ background: `color-mix(in srgb, ${C.danger} 8%, transparent)` }}>
            <AlertTriangle size={26} style={{ color: C.danger }} />
          </div>
          <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: C.white, fontSize: 17 }}>
            Não foi possível carregar seus treinos
          </h3>
          <p style={{ color: C.gray, fontSize: 14, maxWidth: 320 }}>{templates.error}</p>
          <button
            onClick={templates.refetch}
            className="rounded-full px-4 py-2 text-xs font-semibold"
            style={{ background: `linear-gradient(135deg, ${hyrox.color}, #4D7C0F)`, color: C.bg }}
          >
            Tentar novamente
          </button>
        </Card>
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
              onShare={() => handleShareTemplate(t)}
              onOpenDetail={() => setDetailTemplate(t)}
            />
          ))}
        </div>
      )}

      {((templates.error && templates.templates.length > 0) || sessions.error || actionError) && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm z-50"
          style={{ background: `color-mix(in srgb, ${C.danger} 13%, transparent)`, color: C.danger, border: `1px solid color-mix(in srgb, ${C.danger} 33%, transparent)` }}
        >
          {templates.error || sessions.error || actionError}
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
          onShare={() => handleShareTemplate(detailTemplate)}
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

      {manualFormOpen && (
        <ManualSessionForm
          onComplete={handleManualSessionComplete}
          onClose={() => setManualFormOpen(false)}
        />
      )}

      {selectedSession && (
        <SessionDetail
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onDelete={() => handleDeleteSession(selectedSession.id)}
        />
      )}

      {shareTarget && (
        <ShareModal
          {...shareTarget}
          accentColor={hyrox.color}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
}
