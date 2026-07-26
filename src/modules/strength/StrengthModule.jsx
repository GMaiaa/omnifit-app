import { useState } from "react";
import { AlertTriangle, BarChart3, ListChecks, PlusCircle } from "lucide-react";
import { C, modalityInfo } from "../../lib/theme";
import { uid } from "../../lib/format";
import { DEFAULT_SETS } from "./constants";
import { createStrengthSession, createStrengthTemplate, mapStrengthError } from "./strengthService";
import { Card, EmptyState } from "../../components/ui";
import { TemplateCard } from "./components/TemplateCard";
import { TemplateForm } from "./components/TemplateForm";
import { TemplateDetail } from "./components/TemplateDetail";
import { SessionRunner } from "./components/SessionRunner";
import { AnalyticsTab } from "./components/analytics/AnalyticsTab";

const musculacao = modalityInfo("musculacao");

const SUB_NAV = [
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "treinos", label: "Treinos", icon: ListChecks },
];

function buildTemplateExercisesFromSession(sessionExercises) {
  return sessionExercises.map((ex, i) => ({
    id: uid(),
    catalogId: ex.sourceExerciseId,
    name: ex.name,
    muscleGroup: ex.muscleGroup,
    equipment: ex.equipment,
    notes: ex.notes || "",
    order: i,
    defaultSets: ex.sets.filter((s) => s.status !== "skipped").length || DEFAULT_SETS,
  }));
}

export function StrengthModule({ templates, sessions }) {
  const [tab, setTab] = useState("treinos");
  const [formTarget, setFormTarget] = useState(null); // null | true (new) | template (edit)
  const [detailTemplate, setDetailTemplate] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [summary, setSummary] = useState(null);
  const [actionError, setActionError] = useState("");

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

  /* Grava a execução em public.strength_sessions. Se o insert falhar, joga o
     erro de volta pro SessionRunner (que mantém a tela aberta e os dados
     intactos) em vez de fingir que salvou. A cópia/atualização de ficha
     (quando a estrutura mudou) só roda depois que a sessão em si já está
     garantida no banco. */
  async function handleSessionComplete(session, action) {
    let createdSession;
    try {
      createdSession = await createStrengthSession({
        templateId: session.templateId,
        templateName: session.templateName,
        date: session.date,
        startedAt: session.startedAt,
        finishedAt: session.finishedAt,
        durationSec: session.durationSec,
        notes: session.notes,
        exercises: session.exercises,
      });
    } catch (err) {
      throw new Error(mapStrengthError(err, "Não foi possível salvar o treino. Tente novamente."));
    }

    sessions.addSession(createdSession);

    if (action.type === "update") {
      // Ainda não há update real de ficha — atualiza só o estado local
      // desta sessão (mesma limitação de handleSaveTemplate).
      templates.updateTemplate(createdSession.templateId, {
        exercises: buildTemplateExercisesFromSession(createdSession.exercises),
      });
    } else if (action.type === "new") {
      try {
        const newTemplate = await createStrengthTemplate({
          name: action.newTemplateName || `${createdSession.templateName} (nova versão)`,
          exercises: buildTemplateExercisesFromSession(createdSession.exercises),
        });
        templates.addTemplate(newTemplate);
      } catch (err) {
        // O treino já foi salvo — só a cópia da ficha falhou. Avisa sem
        // desfazer o que já deu certo.
        setActionError(mapStrengthError(err, "Treino salvo, mas não foi possível criar a nova ficha."));
      }
    }

    setSummary({
      volume: createdSession.exercises.reduce((a, ex) => a + ex.sets.filter((s) => s.status === "done").reduce((b, s) => b + s.weight * s.reps, 0), 0),
      sets: createdSession.exercises.reduce((a, ex) => a + ex.sets.filter((s) => s.status === "done").length, 0),
      durationSec: createdSession.durationSec,
    });
    setActiveSession(null);
    setTimeout(() => setSummary(null), 6000);
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
                  color: active ? musculacao.color : C.gray,
                  borderBottom: active ? `2px solid ${musculacao.color}` : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                <n.icon size={16} /> {n.label}
              </button>
            );
          })}
        </nav>
        {tab === "treinos" && (
          <button
            onClick={() => setFormTarget(true)}
            className="flex items-center gap-1.5 rounded-full px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold"
            style={{ background: `linear-gradient(135deg, ${musculacao.color}, #5B21B6)`, color: C.white }}
          >
            <PlusCircle size={16} /> <span className="hidden sm:inline">Novo treino</span>
          </button>
        )}
      </div>

      {(templates.loading || sessions.loading) ? (
        <div className="flex justify-center py-20" style={{ color: C.gray }}>Carregando…</div>
      ) : tab === "analytics" ? (
        <AnalyticsTab sessions={sessions.sessions} />
      ) : hasBlockingTemplatesError ? (
        <Card className="flex flex-col items-center justify-center text-center py-16 gap-3">
          <div className="rounded-full p-4" style={{ background: `${C.danger}14` }}>
            <AlertTriangle size={26} style={{ color: C.danger }} />
          </div>
          <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: C.white, fontSize: 17 }}>
            Não foi possível carregar seus treinos
          </h3>
          <p style={{ color: C.gray, fontSize: 14, maxWidth: 320 }}>{templates.error}</p>
          <button
            onClick={templates.refetch}
            className="rounded-full px-4 py-2 text-xs font-semibold"
            style={{ background: `linear-gradient(135deg, ${musculacao.color}, #5B21B6)`, color: C.white }}
          >
            Tentar novamente
          </button>
        </Card>
      ) : templates.templates.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Sua lista de treinos está vazia"
          description='Toque em "Novo treino" para criar sua primeira ficha de musculação.'
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

      {((templates.error && templates.templates.length > 0) || sessions.error || actionError) && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm z-50"
          style={{ background: `${C.danger}22`, color: C.danger, border: `1px solid ${C.danger}55` }}
        >
          {templates.error || sessions.error || actionError}
        </div>
      )}

      {summary && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm z-50 flex items-center gap-3"
          style={{ background: C.bgSoft, border: `1px solid ${musculacao.color}55`, color: C.white }}
        >
          <span style={{ color: musculacao.color, fontWeight: 700 }}>Treino concluído!</span>
          <span style={{ color: C.gray }}>
            {Math.round(summary.volume).toLocaleString("pt-BR")} kg • {summary.sets} séries • {Math.floor(summary.durationSec / 60)} min
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
        <SessionRunner
          template={activeSession}
          sessions={sessions.sessions}
          onComplete={handleSessionComplete}
          onClose={() => setActiveSession(null)}
        />
      )}
    </div>
  );
}
