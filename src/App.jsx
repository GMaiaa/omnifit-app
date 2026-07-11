import { useState } from "react";
import { Home as HomeIcon, Dumbbell, Bike, Waves, Flame, Footprints } from "lucide-react";
import { C, MODALITIES } from "./lib/theme";
import { LogoMark } from "./components/ui";
import { ModuleComingSoon } from "./components/ModuleComingSoon";
import { Home } from "./home/Home";
import { RunningModule } from "./modules/running/RunningModule";
import { useWorkouts } from "./modules/running/useWorkouts";

const MODALITY_ICONS = { Footprints, Dumbbell, Bike, Waves, Flame };

const NAV = [
  { id: "home", label: "Início", icon: HomeIcon },
  ...MODALITIES.map((m) => ({ id: m.id, label: m.label, icon: MODALITY_ICONS[m.icon], color: m.color })),
];

export default function OmnifitApp() {
  const [tab, setTab] = useState("home");
  const running = useWorkouts();

  const activeModality = MODALITIES.find((m) => m.id === tab);

  return (
    <div
      style={{
        minHeight: "100vh", background: C.bg, fontFamily: "'Poppins', sans-serif",
        color: C.white,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;0,800;1,800&display=swap');
        * { font-family: 'Poppins', sans-serif; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.7); }
      `}</style>

      <header
        className="sticky top-0 z-30 flex items-center px-4 sm:px-8 py-3.5"
        style={{ background: `${C.bg}F2`, borderBottom: `1px solid ${C.border}`, backdropFilter: "blur(8px)" }}
      >
        <div className="flex items-center gap-2.5">
          <LogoMark size={34} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.3 }}>OMNIFIT</div>
            <div className="hidden sm:block" style={{ fontSize: 10, color: C.gray, letterSpacing: 1.2, textTransform: "uppercase" }}>
              Visão completa da sua performance
            </div>
          </div>
        </div>
      </header>

      <nav className="flex gap-1 px-4 sm:px-8 pt-4 overflow-x-auto" style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
        {NAV.map((n) => {
          const active = tab === n.id;
          const activeColor = n.color ?? C.positive;
          return (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-semibold rounded-t-lg whitespace-nowrap"
              style={{
                color: active ? activeColor : C.gray,
                borderBottom: active ? `2px solid ${activeColor}` : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              <n.icon size={16} /> {n.label}
            </button>
          );
        })}
      </nav>

      <main className="px-4 sm:px-8 py-6 max-w-6xl mx-auto">
        {tab === "home" ? (
          <Home workouts={running.workouts} onOpenModule={setTab} />
        ) : tab === "corrida" ? (
          <RunningModule {...running} />
        ) : (
          <ModuleComingSoon modality={activeModality} />
        )}
      </main>
    </div>
  );
}
