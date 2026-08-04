import { useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, PlusCircle } from "lucide-react";
import { C } from "../lib/theme";
import { todayStr } from "../lib/format";
import { Card, SegmentedControl } from "../components/ui";
import { useCalendar } from "./useCalendar";
import { rangeFor, periodLabel, shiftAnchor } from "./dateUtils";
import { VIEW_MODES } from "./constants";
import { deleteWorkout, mapCalendarError, updateWorkoutStatus } from "./calendarService";
import { DayView } from "./components/DayView";
import { WeekView } from "./components/WeekView";
import { MonthView } from "./components/MonthView";
import { WorkoutForm } from "./components/WorkoutForm";

export function CalendarModule() {
  const [viewMode, setViewMode] = useState("week");
  const [anchorDate, setAnchorDate] = useState(todayStr());
  const [formTarget, setFormTarget] = useState(null); // null | true (novo) | workout (edição)
  const [formDefaultDate, setFormDefaultDate] = useState(todayStr());
  const [actionError, setActionError] = useState("");

  const range = useMemo(() => rangeFor(viewMode, anchorDate), [viewMode, anchorDate]);
  const { calendar, workouts, loading, error, addWorkout, replaceWorkout, removeWorkout } = useCalendar(range);

  function openCreateForm(date) {
    setFormDefaultDate(date || anchorDate);
    setFormTarget(true);
  }
  function openEditForm(workout) {
    setFormTarget(workout);
  }
  function handleSaveWorkout(saved) {
    if (formTarget && formTarget !== true) replaceWorkout(saved);
    else addWorkout(saved);
    setFormTarget(null);
  }
  function handleSelectDay(date) {
    setAnchorDate(date);
    setViewMode("day");
  }

  async function handleDeleteWorkout(id) {
    if (!window.confirm("Excluir este treino planejado? Essa ação não pode ser desfeita.")) return;
    setActionError("");
    try {
      await deleteWorkout(id);
      removeWorkout(id);
    } catch (err) {
      setActionError(mapCalendarError(err, "Não foi possível excluir o treino. Tente novamente."));
    }
  }

  async function handleToggleComplete(workout) {
    setActionError("");
    try {
      const updated = await updateWorkoutStatus(workout, workout.status === "completed" ? "planned" : "completed");
      replaceWorkout(updated);
    } catch (err) {
      setActionError(mapCalendarError(err, "Não foi possível atualizar o status do treino. Tente novamente."));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <SegmentedControl options={VIEW_MODES} value={viewMode} onChange={setViewMode} />
        <button
          onClick={() => openCreateForm(anchorDate)}
          className="flex items-center gap-1.5 rounded-full px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold"
          style={{ background: `linear-gradient(135deg, ${C.positive}, #00AEEF)`, color: C.bg }}
        >
          <PlusCircle size={16} /> <span className="hidden sm:inline">Novo treino</span>
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => setAnchorDate(shiftAnchor(viewMode, anchorDate, -1))} className="p-1.5 rounded-lg" style={{ color: C.gray }}>
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => setAnchorDate(shiftAnchor(viewMode, anchorDate, 1))} className="p-1.5 rounded-lg" style={{ color: C.gray }}>
            <ChevronRight size={18} />
          </button>
          <button onClick={() => setAnchorDate(todayStr())} className="ml-1 text-xs font-semibold rounded-full px-2.5 py-1" style={{ color: C.gray, border: `1px solid ${C.border}` }}>
            Hoje
          </button>
        </div>
        <div className="text-sm font-semibold" style={{ color: C.white, fontFamily: "'Poppins', sans-serif" }}>
          {periodLabel(viewMode, anchorDate)}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20" style={{ color: C.gray }}>Carregando…</div>
      ) : error ? (
        <Card className="flex flex-col items-center justify-center text-center py-16 gap-3">
          <div className="rounded-full p-4" style={{ background: `color-mix(in srgb, ${C.danger} 8%, transparent)` }}>
            <AlertTriangle size={26} style={{ color: C.danger }} />
          </div>
          <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: C.white, fontSize: 17 }}>
            Não foi possível carregar o calendário
          </h3>
          <p style={{ color: C.gray, fontSize: 14, maxWidth: 320 }}>{error}</p>
        </Card>
      ) : viewMode === "day" ? (
        <DayView date={anchorDate} workouts={workouts} onEdit={openEditForm} onDelete={handleDeleteWorkout} onToggleComplete={handleToggleComplete} />
      ) : viewMode === "week" ? (
        <WeekView range={range} workouts={workouts} onEdit={openEditForm} onDelete={handleDeleteWorkout} onToggleComplete={handleToggleComplete} onAddOnDate={openCreateForm} />
      ) : (
        <MonthView range={range} anchorDate={anchorDate} workouts={workouts} onSelectDay={handleSelectDay} onEdit={openEditForm} />
      )}

      {actionError && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm z-50"
          style={{ background: `color-mix(in srgb, ${C.danger} 13%, transparent)`, color: C.danger, border: `1px solid color-mix(in srgb, ${C.danger} 33%, transparent)` }}
        >
          {actionError}
        </div>
      )}

      {formTarget && calendar && (
        <WorkoutForm
          initial={formTarget === true ? null : formTarget}
          defaultDate={formDefaultDate}
          calendarId={calendar.id}
          onSave={handleSaveWorkout}
          onClose={() => setFormTarget(null)}
        />
      )}
    </div>
  );
}
