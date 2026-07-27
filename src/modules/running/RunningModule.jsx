import { useState } from "react";
import { AlertTriangle, LayoutDashboard, ListChecks, BarChart3, PlusCircle } from "lucide-react";
import { C, modalityInfo } from "../../lib/theme";
import { Card, EmptyState } from "../../components/ui";
import { WorkoutForm } from "./components/WorkoutForm";
import { WorkoutRow } from "./components/WorkoutRow";
import { Dashboard } from "./components/Dashboard";
import { AnalyticsTab } from "./components/analytics/AnalyticsTab";
import { deleteRunningWorkout, mapRunningWorkoutError } from "./runningService";

const corrida = modalityInfo("corrida");

const SUB_NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "treinos", label: "Treinos", icon: ListChecks },
];

export function RunningModule({ workouts, loading, error, addWorkout, updateWorkout, removeWorkout, refetch, startWithFormOpen }) {
  const [tab, setTab] = useState("dashboard");
  const [formTarget, setFormTarget] = useState(startWithFormOpen ? true : null); // null | true (novo) | workout (edição)
  const [actionError, setActionError] = useState("");

  const hasBlockingError = !!error && workouts.length === 0;

  function handleFormSave(workout) {
    if (formTarget && formTarget !== true) updateWorkout(workout);
    else addWorkout(workout);
    setFormTarget(null);
  }

  async function handleDelete(id) {
    if (!window.confirm("Excluir este treino? Essa ação não pode ser desfeita.")) return;
    setActionError("");
    try {
      await deleteRunningWorkout(id);
      removeWorkout(id);
    } catch (err) {
      setActionError(mapRunningWorkoutError(err, "Não foi possível excluir o treino. Tente novamente."));
    }
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
                  color: active ? corrida.color : C.gray,
                  borderBottom: active ? `2px solid ${corrida.color}` : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                <n.icon size={16} /> {n.label}
              </button>
            );
          })}
        </nav>
        <button
          onClick={() => setFormTarget(true)}
          className="flex items-center gap-1.5 rounded-full px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold"
          style={{ background: `linear-gradient(135deg, ${corrida.color}, #00AEEF)`, color: C.bg }}
        >
          <PlusCircle size={16} /> <span className="hidden sm:inline">Novo treino</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20" style={{ color: C.gray }}>Carregando…</div>
      ) : hasBlockingError ? (
        <Card className="flex flex-col items-center justify-center text-center py-16 gap-3">
          <div className="rounded-full p-4" style={{ background: `color-mix(in srgb, ${C.danger} 8%, transparent)` }}>
            <AlertTriangle size={26} style={{ color: C.danger }} />
          </div>
          <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: C.white, fontSize: 17 }}>
            Não foi possível carregar seus treinos
          </h3>
          <p style={{ color: C.gray, fontSize: 14, maxWidth: 320 }}>{error}</p>
          <button
            onClick={refetch}
            className="rounded-full px-4 py-2 text-xs font-semibold"
            style={{ background: `linear-gradient(135deg, ${corrida.color}, #00AEEF)`, color: C.bg }}
          >
            Tentar novamente
          </button>
        </Card>
      ) : tab === "dashboard" ? (
        <Dashboard workouts={workouts} />
      ) : tab === "analytics" ? (
        <AnalyticsTab workouts={workouts} />
      ) : workouts.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Você ainda não registrou nenhum treino de corrida."
          description='Toque em "Novo treino" para registrar sua primeira corrida.'
        />
      ) : (
        <div className="flex flex-col gap-3">
          {workouts.map((w) => (
            <WorkoutRow key={w.id} w={w} onEdit={setFormTarget} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {!hasBlockingError && (error || actionError) && workouts.length > 0 && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm z-50"
          style={{ background: `color-mix(in srgb, ${C.danger} 13%, transparent)`, color: C.danger, border: `1px solid color-mix(in srgb, ${C.danger} 33%, transparent)` }}
        >
          {error || actionError}
        </div>
      )}

      {formTarget && (
        <WorkoutForm
          initial={formTarget === true ? null : formTarget}
          onSave={handleFormSave}
          onClose={() => setFormTarget(null)}
        />
      )}
    </div>
  );
}
