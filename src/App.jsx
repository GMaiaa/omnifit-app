import { useEffect, useRef, useState } from "react";
import {
  Bell, ChevronDown, Dumbbell, Bike, Waves, Flame, Footprints, Lock, LogOut, Moon, Plus, Settings, Sun, User as UserIcon,
} from "lucide-react";
import { BRAND_GRADIENT, C, MODALITIES } from "./lib/theme";
import { applyTheme, getInitialTheme } from "./lib/themeMode";
import { useAuth } from "./auth/AuthContext";
import { LogoMark } from "./components/ui";
import { ModuleComingSoon } from "./components/ModuleComingSoon";
import { Home } from "./home/Home";
import { RunningModule } from "./modules/running/RunningModule";
import { useWorkouts } from "./modules/running/useWorkouts";
import { StrengthModule } from "./modules/strength/StrengthModule";
import { useTemplates } from "./modules/strength/useTemplates";
import { useSessions } from "./modules/strength/useSessions";
import { SwimmingModule } from "./modules/swimming/SwimmingModule";
import { useSwimWorkouts } from "./modules/swimming/useSwimWorkouts";
import { HyroxModule } from "./modules/hyrox/HyroxModule";
import { useHyroxTemplates } from "./modules/hyrox/useHyroxTemplates";
import { useHyroxSessions } from "./modules/hyrox/useHyroxSessions";
import { CiclismoModule } from "./modules/ciclismo/CiclismoModule";
import { useCyclingWorkouts } from "./modules/ciclismo/useCyclingWorkouts";
import { ProfilePage } from "./profile/ProfilePage";
import { useUserProfile } from "./profile/useUserProfile";
import { UploadPage } from "./upload/UploadPage";
import { Vo2MaxPage } from "./modules/vo2max/Vo2MaxPage";

const MODALITY_ICONS = { Footprints, Dumbbell, Bike, Waves, Flame };

export default function OmnifitApp() {
  const [tab, setTab] = useState(() => {
    // Se o usuário acabou de voltar do fluxo de autorização do Strava
    // (redirect_uri = raiz do app), abre direto em Perfil, que é quem
    // processa o ?code= da URL — senão o retorno nunca seria lido.
    const params = new URLSearchParams(window.location.search);
    return params.has("code") || params.has("error") ? "perfil" : "home";
  });
  const [theme, setTheme] = useState(getInitialTheme);
  const [activityOpen, setActivityOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const [recordMenuOpen, setRecordMenuOpen] = useState(false);
  const recordMenuRef = useRef(null);
  const [pendingRecordTarget, setPendingRecordTarget] = useState(null);
  const running = useWorkouts();
  const strengthTemplates = useTemplates();
  const strengthSessions = useSessions();
  const swimming = useSwimWorkouts();
  const hyroxTemplates = useHyroxTemplates();
  const hyroxSessions = useHyroxSessions();
  const cycling = useCyclingWorkouts();
  const userProfile = useUserProfile();

  const { user, signOut } = useAuth();
  const initials = (user?.email?.[0] ?? "U").toUpperCase();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  async function handleSignOut() {
    setSignOutError("");
    setSigningOut(true);
    try {
      await signOut();
      // sucesso: o AuthGate detecta a sessão nula e volta para o login sozinho
    } catch {
      setSignOutError("Não foi possível sair. Tente novamente.");
      setSigningOut(false);
    }
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  const activeModality = MODALITIES.find((m) => m.id === tab);
  const isActivityActive = Boolean(activeModality);

  useEffect(() => {
    function onClickOutside(e) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) setProfileMenuOpen(false);
      if (recordMenuRef.current && !recordMenuRef.current.contains(e.target)) setRecordMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  /* O alvo só precisa "sobreviver" até o próximo mount do módulo escolhido
     (que lê startWithFormOpen uma única vez, no useState inicial dele) —
     limpa logo em seguida pra não reabrir o formulário sozinho se o usuário
     sair da aba e voltar por fora do botão de gravar. */
  useEffect(() => {
    if (pendingRecordTarget) setPendingRecordTarget(null);
  }, [tab, pendingRecordTarget]);

  function handleRecordSelect(modalityId) {
    setTab(modalityId);
    setPendingRecordTarget(modalityId);
    setRecordMenuOpen(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh", background: C.bg, fontFamily: "'Poppins', sans-serif",
        color: C.white,
      }}
    >
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-3.5"
        style={{ background: `color-mix(in srgb, ${C.bg} 95%, transparent)`, borderBottom: `1px solid ${C.border}`, backdropFilter: "blur(8px)" }}
      >
        <button
          onClick={() => setTab("home")}
          className="flex items-center gap-0.5 text-left"
          aria-label="Ir para a tela inicial"
        >
          <LogoMark size={72} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 24, letterSpacing: -0.3 }}>OMNIFIT</div>
            <div className="hidden sm:block" style={{ fontSize: 9, color: C.gray, letterSpacing: 1, textTransform: "uppercase" }}>
              Visão completa da sua performance
            </div>
          </div>
        </button>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
            title={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
            className="flex items-center justify-center rounded-full p-2"
            style={{ color: C.gray, border: `1px solid ${C.border}` }}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            aria-label="Notificações"
            title="Notificações"
            className="flex items-center justify-center rounded-full p-2"
            style={{ color: C.gray, border: `1px solid ${C.border}` }}
          >
            <Bell size={16} />
          </button>

          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setProfileMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full pl-1 pr-2 py-1"
              style={{ border: `1px solid ${C.border}` }}
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 28, height: 28, background: BRAND_GRADIENT, color: C.bg, fontSize: 12, fontWeight: 700 }}
              >
                {initials}
              </div>
              <ChevronDown
                size={14}
                style={{ color: C.gray, transform: profileMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
              />
            </button>

            {profileMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-52 rounded-2xl p-1.5 z-40"
                style={{ background: C.bgSoft, border: `1px solid ${C.border}`, boxShadow: "0 12px 32px rgba(0,0,0,0.4)" }}
              >
                <button
                  onClick={() => { setTab("perfil"); setProfileMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold rounded-xl"
                  style={{ color: C.white }}
                >
                  <UserIcon size={16} /> Meu perfil
                </button>

                <div
                  className="w-full flex items-center justify-between gap-2.5 px-3 py-2.5 text-sm font-semibold rounded-xl"
                  style={{ color: C.gray }}
                >
                  <span className="flex items-center gap-2.5"><Settings size={16} /> Configurações</span>
                  <span className="flex items-center gap-1" style={{ fontSize: 10 }}>
                    <Lock size={11} /> em breve
                  </span>
                </div>

                <div style={{ height: 1, background: C.borderSoft, margin: "4px 2px" }} />

                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: C.danger }}
                >
                  <LogOut size={16} /> {signingOut ? "Saindo…" : "Sair"}
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setTab("upload")}
            aria-label="Novo"
            title="Novo"
            className="flex items-center justify-center rounded-full p-2"
            style={{ color: C.gray, border: `1px solid ${C.border}` }}
          >
            <Plus size={18} />
          </button>
        </div>
      </header>

      <nav className="flex items-center gap-1 px-4 sm:px-8 pt-4 pb-3" style={{ borderBottom: `1px solid ${C.borderSoft}` }}>
        <button
          onClick={() => { setTab("home"); setActivityOpen(false); }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-full"
          style={{
            color: tab === "home" ? C.positive : C.gray,
            background: tab === "home" ? `color-mix(in srgb, ${C.positive} 10%, transparent)` : "transparent",
          }}
        >
          Início
        </button>

        <button
          onClick={() => { setTab("vo2max"); setActivityOpen(false); }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-full"
          style={{
            color: tab === "vo2max" ? "#00AEEF" : C.gray,
            background: tab === "vo2max" ? "#00AEEF1A" : "transparent",
          }}
        >
          VO2 Máx
        </button>

        <button
          onClick={() => setActivityOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-full"
          style={{
            color: isActivityActive ? activeModality.color : C.gray,
            background: isActivityActive ? `${activeModality.color}1A` : "transparent",
          }}
        >
          Atividade
          <ChevronDown size={14} style={{ transform: activityOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
        </button>
      </nav>

      {activityOpen && (
        <div
          className="flex items-center gap-2 px-4 sm:px-8 py-3 overflow-x-auto"
          style={{ background: C.surface, borderBottom: `1px solid ${C.borderSoft}` }}
        >
          {MODALITIES.map((m) => {
            const Icon = MODALITY_ICONS[m.icon];
            const active = tab === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setTab(m.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-full whitespace-nowrap"
                style={{ color: active ? m.color : C.white, background: active ? `${m.color}1A` : "transparent" }}
              >
                <Icon size={16} /> {m.label}
              </button>
            );
          })}
        </div>
      )}

      <main className="px-4 sm:px-8 py-6 max-w-6xl mx-auto">
        {tab === "home" ? (
          <Home
            workouts={running.workouts}
            strengthSessions={strengthSessions.sessions}
            swimWorkouts={swimming.workouts}
            hyroxSessions={hyroxSessions.sessions}
            cyclingWorkouts={cycling.workouts}
            onOpenModule={setTab}
          />
        ) : tab === "vo2max" ? (
          <Vo2MaxPage workouts={running.workouts} />
        ) : tab === "corrida" ? (
          <RunningModule {...running} startWithFormOpen={pendingRecordTarget === "corrida"} />
        ) : tab === "musculacao" ? (
          <StrengthModule templates={strengthTemplates} sessions={strengthSessions} />
        ) : tab === "ciclismo" ? (
          <CiclismoModule {...cycling} startWithFormOpen={pendingRecordTarget === "ciclismo"} />
        ) : tab === "natacao" ? (
          <SwimmingModule {...swimming} startWithFormOpen={pendingRecordTarget === "natacao"} />
        ) : tab === "hyrox" ? (
          <HyroxModule templates={hyroxTemplates} sessions={hyroxSessions} />
        ) : tab === "perfil" ? (
          <ProfilePage
            profile={userProfile.profile}
            loading={userProfile.loading}
            saveError={userProfile.saveError}
            onSave={userProfile.updateProfile}
            onStravaSynced={() => { cycling.refetch(); running.refetch(); }}
          />
        ) : tab === "upload" ? (
          <UploadPage onCyclingWorkoutCreated={cycling.addWorkout} />
        ) : (
          <ModuleComingSoon modality={activeModality} />
        )}
      </main>

      {tab === "home" && (
        <div className="fixed bottom-8 right-6 sm:right-8 z-40 flex flex-col items-center gap-3" ref={recordMenuRef}>
          {MODALITIES.map((m, i) => {
            const Icon = MODALITY_ICONS[m.icon];
            const delayMs = (MODALITIES.length - 1 - i) * 45;
            return (
              <button
                key={m.id}
                onClick={() => handleRecordSelect(m.id)}
                title={m.label}
                aria-label={m.label}
                className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{
                  width: 44, height: 44, background: C.bgSoft, color: m.color,
                  boxShadow: "0 6px 16px rgba(0,0,0,0.3)",
                  opacity: recordMenuOpen ? 1 : 0,
                  transform: recordMenuOpen ? "translateY(0) scale(1)" : "translateY(16px) scale(0.6)",
                  transition: "opacity 0.2s ease, transform 0.25s ease",
                  transitionDelay: recordMenuOpen ? `${delayMs}ms` : "0ms",
                  pointerEvents: recordMenuOpen ? "auto" : "none",
                }}
              >
                <Icon size={18} />
              </button>
            );
          })}

          <button
            onClick={() => setRecordMenuOpen((v) => !v)}
            aria-label="Gravar atividade"
            title="Gravar atividade"
            className="flex items-center justify-center rounded-full"
            style={{ width: 56, height: 56, background: BRAND_GRADIENT, boxShadow: "0 10px 28px color-mix(in srgb, #00E0B2 35%, transparent)" }}
          >
            <Plus size={24} style={{ color: C.bg, transform: recordMenuOpen ? "rotate(45deg)" : "none", transition: "transform 0.2s ease" }} />
          </button>
        </div>
      )}

      {signOutError && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-xl px-4 py-2.5 text-sm z-50"
          style={{ background: `color-mix(in srgb, ${C.danger} 13%, transparent)`, color: C.danger, border: `1px solid color-mix(in srgb, ${C.danger} 33%, transparent)` }}
        >
          {signOutError}
        </div>
      )}
    </div>
  );
}
