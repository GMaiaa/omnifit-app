import { useState } from "react";
import { LayoutDashboard, ListChecks, BarChart3, PlusCircle } from "lucide-react";
import { C, modalityInfo } from "../../lib/theme";
import { EmptyState } from "../../components/ui";
import { WorkoutForm } from "./components/WorkoutForm";
import { WorkoutRow } from "./components/WorkoutRow";
import { Dashboard } from "./components/Dashboard";
import { AnalyticsTab } from "./components/analytics/AnalyticsTab";

const corrida = modalityInfo("corrida");

const SUB_NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "treinos", label: "Treinos", icon: ListChecks },
];

export function RunningModule({ workouts, loading, saveError, addWorkout, deleteWorkout }) {
  const [tab, setTab] = useState("dashboard");
  const [showForm, setShowForm] = useState(false);

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
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-full px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold"
          style={{ background: `linear-gradient(135deg, ${corrida.color}, #00AEEF)`, color: C.bg }}
        >
          <PlusCircle size={16} /> <span className="hidden sm:inline">Novo treino</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20" style={{ color: C.gray }}>Carregando…</div>
      ) : tab === "dashboard" ? (
        <Dashboard workouts={workouts} />
      ) : tab === "analytics" ? (
        <AnalyticsTab workouts={workouts} />
      ) : workouts.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Sua lista de treinos está vazia"
          description='Toque em "Novo treino" para registrar sua primeira corrida.'
        />
      ) : (
        <div className="flex flex-col gap-3">
          {workouts.map((w) => <WorkoutRow key={w.id} w={w} onDelete={deleteWorkout} />)}
        </div>
      )}

      {saveError && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm z-50"
          style={{ background: `${C.danger}22`, color: C.danger, border: `1px solid ${C.danger}55` }}
        >
          {saveError}
        </div>
      )}

      {showForm && (
        <WorkoutForm
          onSave={(w) => { addWorkout(w); setShowForm(false); }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
