import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  useRef,
} from "react";
import { ShieldCheck } from "lucide-react";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import MobileMenuButton from "./MobileMenuButton";
import ActiveTrainingTopbar from "./ActiveTrainingTopbar";
import ThemeToggle from "../ThemeToggle";
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
  const useOnboardingChrome = activePage === "onboarding";

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

  useEffect(() => {
    if (!showDrawer) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setShowDrawer(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [showDrawer]);

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
      className={`app-shell flex min-h-dvh flex-col bg-[color:var(--bg)] text-[color:var(--text)] transition-colors ${
        useDashboardBackground ? "dashboard-app-shell" : ""
      }`}
    >
      {user?.isDemo ? (
        <div
          data-demo-banner
          className="flex min-h-9 w-full items-center justify-center gap-2 border-b border-[color:var(--accent)] bg-[color:var(--accent)] px-3 py-2 text-center font-sans text-[11px] font-bold uppercase text-[color:var(--accent-contrast)]"
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
        <ActiveTrainingTopbar
          training={activeTraining}
          onReturn={handleReturnTraining}
        />
      ) : null}
      <div
        className={
          useOnboardingChrome
            ? "flex flex-1"
            : "grid flex-1 grid-cols-[280px_1fr] max-md:grid-cols-1"
        }
      >
        {!useOnboardingChrome ? (
          <div className="hidden md:block">
            <Sidebar activePage={activePage} onNavigate={handleNavigate} />
          </div>
        ) : null}
        <div
          className={`w-full px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:px-4 md:px-8 md:py-8 ${
            useDashboardChrome ? "max-md:pb-28 max-md:pt-0" : "max-md:pb-28"
          }`}
        >
          <div
            className={`items-center justify-between mb-4 gap-3 ${
              useDashboardChrome || useOnboardingChrome
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
              className={`mb-5 flex min-h-14 items-center justify-between gap-3 rounded-card border border-[color:var(--accent)] bg-[color:var(--accent)] px-3 py-2 text-[color:var(--accent-contrast)] ${
                useTrainingChrome ? "max-md:mt-12" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-current">
                  Sesión supervisada
                </p>
                <p className="truncate text-sm font-black text-current">
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
                className="h-10 shrink-0 rounded-control border border-current px-3 font-sans text-xs font-bold text-current transition-colors hover:bg-black/10 dark:hover:bg-white/10"
              >
                {activeTraining ? "Mis atletas" : "Salir"}
              </button>
            </div>
          ) : null}
          <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
            {children}
          </main>
        </div>
      </div>

      {/* Off-canvas Drawer for mobile */}
      {showDrawer && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu principal"
        >
          <div
            className="mobile-drawer-overlay absolute inset-0 bg-[color:var(--overlay)] backdrop-blur-[3px]"
            onClick={() => setShowDrawer(false)}
            aria-hidden="true"
          />
          <div className="premium-drawer mobile-drawer-panel absolute inset-y-0 left-0 h-dvh w-[min(86vw,320px)] border-r border-[color:var(--drawer-border)] shadow-drawer">
            <Sidebar
              forceVisible
              onClose={() => setShowDrawer(false)}
              activePage={activePage}
              onNavigate={(id) => {
                setShowDrawer(false);
                handleNavigate(id);
              }}
            />
          </div>
        </div>
      )}

      {!useOnboardingChrome ? (
        <div className="fixed inset-x-0 bottom-0 z-40 md:hidden">
          <MobileNav activePage={activePage} onNavigate={handleNavigate} />
        </div>
      ) : null}
    </div>
  );
}

export default MainLayout;
