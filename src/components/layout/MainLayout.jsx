import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
} from "react";
import { ArrowRight, ShieldCheck, Timer } from "lucide-react";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import MobileMenuButton from "./MobileMenuButton";
import ThemeToggle from "../ThemeToggle";
import { useThemeMode } from "../../hooks/useThemeMode";
import { useAuth } from "../../context/AuthContext";
import {
  canAccessActiveTraining,
  readActiveTrainingSnapshot,
} from "../../utils/activeTraining";

function MainLayout({
  children,
  activePage,
  onNavigate,
  coachAthlete = null,
  onCoachContextExit,
}) {
  const [activeTraining, setActiveTraining] = useState(null);
  const pollRef = useRef(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const { isDark } = useThemeMode();
  const { user } = useAuth();
  const useDashboardChrome = activePage === "dashboard";
  const useDashboardBackground =
    useDashboardChrome ||
    activePage === "perfil" ||
    activePage === "fotos" ||
    activePage === "admin_sesiones" ||
    activePage === "ejercicio_analitica" ||
    activePage === "resumen_sesion" ||
    activePage === "data_intelligence" ||
    activePage === "pesajes";
  const useTrainingChrome = activePage === "registrar";

  useLayoutEffect(() => {
    let secondFrame = 0;
    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    resetScroll();
    const firstFrame = window.requestAnimationFrame(() => {
      resetScroll();
      secondFrame = window.requestAnimationFrame(resetScroll);
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [activePage]);

  const formatDuration = (sec) => {
    const total = Math.max(0, Math.floor(sec || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    return [hours, minutes, seconds]
      .map((n) => String(n).padStart(2, "0"))
      .join(":");
  };

  const readSnapshot = useCallback(() => {
    const snap = readActiveTrainingSnapshot();
    if (!canAccessActiveTraining(snap, user, coachAthlete)) return null;
    try {
      let elapsed = Number(snap?.elapsed ?? snap?.durationSeconds ?? 0);
      if (snap?.isRunning && snap?.lastUpdate) {
        elapsed += Math.max(0, (Date.now() - snap.lastUpdate) / 1000);
      }
      const total = Math.max(0, Math.floor(elapsed));
      return { ...snap, elapsed: total };
    } catch {
      return null;
    }
  }, [coachAthlete, user]);

  useEffect(() => {
    const loadSnapshot = () => setActiveTraining(readSnapshot());
    loadSnapshot();
    window.addEventListener("storage", loadSnapshot);
    window.addEventListener("active-training-updated", loadSnapshot);
    pollRef.current = setInterval(loadSnapshot, 1500);
    return () => {
      window.removeEventListener("storage", loadSnapshot);
      window.removeEventListener("active-training-updated", loadSnapshot);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [readSnapshot]);

  useEffect(() => {
    const openMainMenu = () => setShowDrawer(true);
    window.addEventListener("open-main-menu", openMainMenu);
    return () => window.removeEventListener("open-main-menu", openMainMenu);
  }, []);

  const handleReturnTraining = () => {
    if (typeof onNavigate === "function") onNavigate("registrar");
  };

  const handleNavigate = (page) => {
    if (activePage === "registrar" && page !== "registrar") {
      window.dispatchEvent(new Event("persist-active-training"));
    }
    onNavigate?.(page, { source: "navigation" });
  };

  const showReturnTraining = activePage !== "registrar" && activeTraining;

  return (
    <div
      data-active-page={activePage}
      className={`app-shell min-h-dvh bg-[color:var(--bg)] text-[color:var(--text)] dark:!bg-[#050505] dark:!text-[#f8f8f4] flex flex-col transition-colors ${
        useDashboardBackground ? "dashboard-app-shell" : ""
      }`}
      style={{
        backgroundColor: isDark ? "#050505" : "var(--bg)",
        color: isDark ? "#f8f8f4" : "var(--text)",
      }}
    >
      {user?.isDemo ? (
        <div
          data-demo-banner
          className="flex min-h-9 w-full items-center justify-center gap-2 border-b border-[#ff5722]/35 bg-[#fff0eb] px-3 py-2 text-center text-[10px] font-black uppercase text-[#9f2c09] dark:border-[#e2ff00]/25 dark:bg-[#161900] dark:text-[#e2ff00]"
        >
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          <span>
            Demo{" "}
            {user.role === "Entrenador"
              ? "coach"
              : user.role === "Cliente"
                ? "atleta"
                : "admin"}
            <span className="mx-2 text-current/40">|</span>
            Datos temporales, cuentas e imagenes protegidas
          </span>
        </div>
      ) : null}
      {showReturnTraining ? (
        <>
          <button
            data-active-training-banner
            type="button"
            onClick={handleReturnTraining}
            className="sticky top-0 z-50 flex h-12 w-full items-center gap-3 border-b border-[#ff5722] bg-[#fff0eb] px-3 text-left text-[#852300] shadow-sm md:hidden dark:border-[#e2ff00] dark:bg-[#1d2100] dark:text-[#e2ff00]"
            aria-label="Volver al entrenamiento en curso"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#ff5722] text-white dark:bg-[#e2ff00] dark:text-black">
              <Timer className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-black uppercase leading-none">
                {activeTraining.athleteName
                  ? `Entrenando a ${activeTraining.athleteName}`
                  : "Entrenamiento en curso"}
              </span>
              <span className="mt-1 block font-mono text-xs font-bold leading-none">
                {formatDuration(activeTraining.elapsed || 0)}
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-black uppercase">
              Volver
              <ArrowRight className="h-4 w-4" />
            </span>
          </button>

          <div className="sticky top-0 z-30 hidden w-full border-b border-[color:var(--border)] bg-[color:var(--card)] shadow-sm md:block">
            <div className="flex items-center justify-between px-3 py-2 sm:px-4 md:px-8">
              <div className="flex items-center gap-1 text-sm text-[color:var(--text-muted)]">
                <span>
                  {activeTraining.athleteName
                    ? `Sesión de ${activeTraining.athleteName}`
                    : "Sesión en curso"}
                </span>
                <span className="ml-1 font-mono font-semibold text-[color:var(--text)]">
                  {formatDuration(activeTraining.elapsed || 0)}
                </span>
              </div>
              <button
                onClick={handleReturnTraining}
                className="inline-flex items-center gap-2 rounded-full bg-[#ff5722] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#df3f0d] dark:bg-[#e2ff00] dark:text-black dark:hover:bg-[#cbe600]"
              >
                Volver al entrenamiento
              </button>
            </div>
          </div>
        </>
      ) : null}
      <div className="grid grid-cols-[280px_1fr] max-md:grid-cols-1 flex-1">
        <div className="hidden md:block">
          <Sidebar activePage={activePage} onNavigate={handleNavigate} />
        </div>
        <div
          className={`px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:px-4 md:px-8 md:py-8 ${
            useDashboardChrome ? "max-md:pb-24 max-md:pt-0" : "max-md:pb-24"
          }`}
        >
          <div
            className={`items-center justify-between mb-4 gap-3 ${
              useDashboardChrome
                ? "hidden"
                : useTrainingChrome
                  ? "hidden"
                  : "flex md:hidden"
            }`}
          >
            <MobileMenuButton onClick={() => setShowDrawer(true)} />

            <div className="flex-1" />
            <ThemeToggle />
          </div>
          {coachAthlete ? (
            <div
              className={`mb-5 flex min-h-14 items-center justify-between gap-3 border-y border-[#ffb199] bg-[#fff0eb] px-3 py-2 dark:border-[#e2ff00]/25 dark:bg-[#e2ff00]/10 ${
                useTrainingChrome ? "max-md:mt-12" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#b82f05] dark:text-[#e2ff00]">
                  Sesión supervisada
                </p>
                <p className="truncate text-sm font-black text-[color:var(--text)]">
                  Entrenando a {coachAthlete.name}
                </p>
              </div>
              <button
                type="button"
                onClick={onCoachContextExit}
                aria-label={
                  activeTraining
                    ? "Volver a Mis atletas sin cerrar la sesión"
                    : "Salir de la sesión supervisada"
                }
                className="h-10 shrink-0 rounded-lg border border-[#ff8a66] px-3 text-xs font-black text-[#b82f05] dark:border-[#e2ff00]/30 dark:text-[#e2ff00]"
              >
                {activeTraining ? "Mis atletas" : "Salir"}
              </button>
            </div>
          ) : null}
          <main className="flex flex-col gap-6">{children}</main>
        </div>
      </div>

      {/* Off-canvas Drawer for mobile */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowDrawer(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 h-dvh w-[280px] bg-[color:var(--card)] border-r border-[color:var(--border)] shadow-2xl">
            <Sidebar
              forceVisible
              activePage={activePage}
              onNavigate={(id) => {
                setShowDrawer(false);
                handleNavigate(id);
              }}
            />
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 md:hidden">
        <MobileNav activePage={activePage} onNavigate={handleNavigate} />
      </div>
    </div>
  );
}

export default MainLayout;
