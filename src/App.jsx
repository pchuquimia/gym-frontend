import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./App.css";
import MainLayout from "./components/layout/MainLayout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import LegalPage from "./pages/LegalPage";
import RoleBasedRoute from "./components/auth/RoleBasedRoute";
import PageErrorBoundary from "./components/system/PageErrorBoundary";
import OperationLoader from "./components/system/OperationLoader";
import { toast } from "sonner";
import { useAuth } from "./context/AuthContext";
import { api } from "./services/api";
import { TrainingProvider } from "./context/TrainingContext";
import { RoutineProvider } from "./context/RoutineContext";
import { UserProvider } from "./context/UserContext";
import { DashboardBootstrapProvider } from "./context/DashboardBootstrapContext";
import {
  canAccessActiveTraining,
  clearActiveTrainingSnapshot,
  isActiveTrainingSnapshot,
  readActiveTrainingSnapshot,
} from "./utils/activeTraining";
import { getUserHome, needsOnboarding } from "./utils/userFlow";
import {
  clearCoachInvitation,
  invitationTokenFromPath,
  readCoachInvitation,
  storeCoachInvitation,
} from "./utils/coachInvitation";
import {
  canReturnWithinApp,
  createAppHistoryState,
  getAppHistoryIndex,
  getAppHistoryPage,
  getAppHistoryScroll,
  isAppHistoryState,
} from "./utils/appNavigation";

const ExerciseLibrary = lazy(() => import("./pages/ExerciseLibrary"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const RegisterTraining = lazy(() => import("./pages/RegisterTraining"));
const ExerciseAnalyticsPage = lazy(
  () => import("./pages/ExerciseAnalyticsPage"),
);
const ExerciseHistoryEditor = lazy(
  () => import("./pages/ExerciseHistoryEditor"),
);
const ExerciseImageStudio = lazy(() => import("./pages/ExerciseImageStudio"));
const SessionSummaryPage = lazy(() => import("./pages/SessionSummaryPage"));
const DataIntelligencePage = lazy(() => import("./pages/DataIntelligencePage"));
const Routines = lazy(() => import("./pages/Routines"));
const PhotosLibrary = lazy(() => import("./pages/PhotosLibrary"));
const TrainingAdmin = lazy(() => import("./pages/TrainingAdmin"));
const CoachDashboard = lazy(() => import("./pages/CoachDashboard"));
const CoachMessages = lazy(() => import("./pages/CoachMessages"));
const CoachManagement = lazy(() => import("./pages/CoachManagement"));
const WeightTracking = lazy(() => import("./pages/WeightTracking"));
const DailyCheckIn = lazy(() => import("./pages/DailyCheckIn"));
const HydrationTracker = lazy(() => import("./pages/HydrationTracker"));
const BillingCenter = lazy(() => import("./pages/BillingCenter"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const CoachInvitation = lazy(() => import("./pages/CoachInvitation"));

const PAGES = {
  dashboard: { label: "Dashboard", component: Dashboard },
  library: { label: "Biblioteca de Ejercicios", component: ExerciseLibrary },
  registrar: { label: "Registrar Entrenamiento", component: RegisterTraining },
  ejercicio_analitica: {
    label: "Analitica por ejercicio",
    component: ExerciseAnalyticsPage,
  },
  editor_historial: {
    label: "Editor de historial",
    component: ExerciseHistoryEditor,
  },
  imagenes_ejercicios: {
    label: "Imágenes de ejercicios",
    component: ExerciseImageStudio,
  },
  resumen_sesion: { label: "Resumen diario", component: SessionSummaryPage },
  data_intelligence: {
    label: "Inteligencia de datos",
    component: DataIntelligencePage,
  },
  rutinas: { label: "Rutinas y Planificacion", component: Routines },
  trainer: { label: "Mis atletas", component: CoachDashboard },
  coach_athletes: { label: "Alumnos", component: CoachDashboard },
  coach_messages: { label: "Mensajes", component: CoachMessages },
  coach_admin: { label: "Coaches y atletas", component: CoachManagement },
  admin_sesiones: { label: "Historial de sesiones", component: TrainingAdmin },
  perfil: { label: "Perfil y Ajustes", component: ProfileSettings },
  fotos: { label: "Biblioteca de Fotos", component: PhotosLibrary },
  pesajes: { label: "Seguimiento de peso", component: WeightTracking },
  check_in: { label: "Estado diario", component: DailyCheckIn },
  hidratacion: { label: "Reto de hidratación", component: HydrationTracker },
  planes: { label: "Planes y Premium", component: BillingCenter },
  onboarding: { label: "Configuracion inicial", component: Onboarding },
};

const PAGE_ROLES = {
  editor_historial: ["Admin"],
  imagenes_ejercicios: ["Admin"],
  admin_sesiones: ["Admin", "Entrenador", "Cliente"],
  trainer: ["Admin", "Entrenador"],
  coach_athletes: ["Entrenador"],
  coach_messages: ["Entrenador"],
  coach_admin: ["Admin"],
  onboarding: ["Cliente", "Entrenador"],
};

const SNAPSHOT_KEY = "active_training_snapshot";
const LEGACY_TRAINING_KEY = "active_training";
const COACH_ATHLETE_KEY = "coach_athlete_context";
const COACH_ALLOWED_PAGES = new Set([
  "trainer",
  "coach_athletes",
  "coach_messages",
  "rutinas",
  "library",
  "ejercicio_analitica",
  "editor_historial",
  "resumen_sesion",
  "data_intelligence",
  "admin_sesiones",
  "pesajes",
  "check_in",
  "hidratacion",
  "perfil",
  "planes",
  "onboarding",
]);
const COACH_ATHLETE_CONTEXT_PAGES = new Set([
  "ejercicio_analitica",
  "editor_historial",
  "resumen_sesion",
  "data_intelligence",
]);
const MANAGED_CLIENT_ALLOWED_PAGES = new Set([
  "dashboard",
  "registrar",
  "ejercicio_analitica",
  "resumen_sesion",
  "rutinas",
  "pesajes",
  "check_in",
  "hidratacion",
  "admin_sesiones",
  "fotos",
  "perfil",
  "planes",
]);
const EXERCISE_CONTEXT_PAGES = new Set([
  "registrar",
  "ejercicio_analitica",
  "editor_historial",
  "resumen_sesion",
  "data_intelligence",
  "rutinas",
  "admin_sesiones",
]);
const SESSION_CONTEXT_PAGES = new Set(["ejercicio_analitica"]);
const PHOTO_CONTEXT_PAGES = new Set(["perfil"]);
const AUTH_ONLY_PAGES = new Set([
  "login",
  "register",
  "recover",
  "reset",
  "verify",
]);

const readCoachAthlete = () => {
  if (typeof localStorage === "undefined") return null;
  try {
    const value = JSON.parse(localStorage.getItem(COACH_ATHLETE_KEY));
    return value?.id && value?.name ? value : null;
  } catch {
    return null;
  }
};

const AUTH_PATHS = {
  login: "/",
  register: "/registro",
  recover: "/recuperar-contrasena",
  reset: "/restablecer-contrasena",
  verify: "/verificar-correo",
};

const PUBLIC_PATHS = {
  privacidad: "/privacidad",
  terminos: "/terminos",
  eliminar_cuenta: "/eliminar-cuenta",
};
const PUBLIC_PAGES = new Set(Object.keys(PUBLIC_PATHS));
const ROUTE_PATHS = { ...AUTH_PATHS, ...PUBLIC_PATHS };
const ROUTED_PAGES = new Set([...Object.keys(ROUTE_PATHS), "invitation"]);

const pageFromPath = () => {
  if (typeof window === "undefined") return null;
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  if (invitationTokenFromPath(path)) return "invitation";
  return (
    Object.entries(ROUTE_PATHS).find(([, value]) => value === path)?.[0] || null
  );
};

const hasActiveTrainingSnapshot = () => {
  return isActiveTrainingSnapshot(readActiveTrainingSnapshot());
};

const hasAccessibleTrainingSnapshot = (user, coachAthlete) =>
  canAccessActiveTraining(readActiveTrainingSnapshot(), user, coachAthlete);

const getActiveTrainingOwnerId = () => {
  if (!hasActiveTrainingSnapshot() || typeof localStorage === "undefined") {
    return "";
  }
  try {
    const snapshot = JSON.parse(
      localStorage.getItem(SNAPSHOT_KEY) ||
        localStorage.getItem(LEGACY_TRAINING_KEY) ||
        "null",
    );
    return String(snapshot?.ownerId || "");
  } catch {
    return "";
  }
};

function App() {
  const { user, isAuthenticated, loading, refreshUser } = useAuth();
  const [activePage, setActivePage] = useState(() => {
    if (typeof localStorage === "undefined") return "login";
    const routePage = pageFromPath();
    if (routePage && routePage !== "login") return routePage;
    if (hasActiveTrainingSnapshot()) return "registrar";
    const stored = localStorage.getItem("active_page");
    return stored || routePage || "login";
  });
  const [coachAthlete, setCoachAthlete] = useState(readCoachAthlete);
  const navigationIndexRef = useRef(
    typeof window !== "undefined"
      ? getAppHistoryIndex(window.history.state)
      : 0,
  );
  const [restoreScrollY, setRestoreScrollY] = useState(null);
  const [pageHidesMobileNavigation, setPageHidesMobileNavigation] =
    useState(false);
  const acceptingInvitationRef = useRef(false);
  const handleMobileNavVisibilityChange = useCallback((hidden) => {
    setPageHidesMobileNavigation(Boolean(hidden));
  }, []);

  useEffect(() => {
    setPageHidesMobileNavigation(false);
  }, [activePage]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const inviteToken = new URLSearchParams(window.location.search).get(
      "invite",
    );
    if (inviteToken) storeCoachInvitation(inviteToken);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentState = window.history.state;
    const navigationIndex = isAppHistoryState(currentState)
      ? getAppHistoryIndex(currentState)
      : 0;
    navigationIndexRef.current = navigationIndex;
    window.history.replaceState(
      createAppHistoryState({
        currentState,
        page: activePage,
        index: navigationIndex,
        scrollY: window.scrollY,
      }),
      "",
      `${window.location.pathname}${window.location.search}`,
    );
    // La entrada inicial se normaliza una sola vez; las siguientes pasan por
    // handleNavigate o popstate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (restoreScrollY === null || typeof window === "undefined") return;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        window.scrollTo({ top: restoreScrollY, left: 0, behavior: "auto" });
        setRestoreScrollY(null);
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [activePage, restoreScrollY]);

  const selectCoachAthlete = (athlete) => {
    const next = athlete?.id ? athlete : null;
    if (hasAccessibleTrainingSnapshot(user, coachAthlete)) {
      const activeOwnerId = getActiveTrainingOwnerId() || coachAthlete?.id;
      if (!next || String(next.id) !== String(activeOwnerId || "")) {
        return false;
      }
    }
    setCoachAthlete(next);
    if (typeof localStorage !== "undefined") {
      if (next) localStorage.setItem(COACH_ATHLETE_KEY, JSON.stringify(next));
      else localStorage.removeItem(COACH_ATHLETE_KEY);
    }
    return true;
  };

  const handleNavigate = (page, options = {}) => {
    const snapshot = page === "registrar" ? readActiveTrainingSnapshot() : null;
    const hasInaccessibleTraining = Boolean(
      isActiveTrainingSnapshot(snapshot) &&
      !canAccessActiveTraining(snapshot, user, coachAthlete),
    );
    if (hasInaccessibleTraining) {
      clearActiveTrainingSnapshot();
      window.dispatchEvent(new Event("active-training-updated"));
    }
    if (
      page === "registrar" &&
      !options.trainingView &&
      (!isActiveTrainingSnapshot(snapshot) || hasInaccessibleTraining)
    ) {
      if (typeof localStorage !== "undefined") {
        localStorage.removeItem("view_training_id");
        localStorage.removeItem("view_training_date");
        localStorage.removeItem("edit_training_id");
        localStorage.removeItem("edit_training_date");
      }
      window.dispatchEvent(new Event("open-default-training-page"));
    }
    if (
      page === "trainer" &&
      coachAthlete &&
      !hasAccessibleTrainingSnapshot(user, coachAthlete)
    ) {
      selectCoachAthlete(null);
    }

    if (typeof window !== "undefined") {
      const currentState = createAppHistoryState({
        currentState: window.history.state,
        page: activePage,
        index: navigationIndexRef.current,
        scrollY: window.scrollY,
      });
      window.history.replaceState(
        currentState,
        "",
        `${window.location.pathname}${window.location.search}`,
      );

      const samePage = page === activePage;
      const replace = options.replace === true || samePage;
      const nextIndex = replace
        ? navigationIndexRef.current
        : navigationIndexRef.current + 1;
      const target =
        page === "invitation"
          ? `/invitacion/${readCoachInvitation()}`
          : ROUTE_PATHS[page]
            ? `${ROUTE_PATHS[page]}${page === "reset" ? window.location.search : ""}`
            : "/";
      const nextState = createAppHistoryState({
        currentState: replace ? currentState : null,
        page,
        index: nextIndex,
        scrollY: 0,
      });
      window.history[replace ? "replaceState" : "pushState"](
        nextState,
        "",
        target,
      );
      navigationIndexRef.current = nextIndex;
    }

    setRestoreScrollY(null);
    setActivePage(page);
    if (typeof localStorage !== "undefined") {
      if (ROUTED_PAGES.has(page)) {
        localStorage.removeItem("active_page");
      } else {
        localStorage.setItem("active_page", page);
      }
    }
  };

  const handleBack = (fallbackPage = getUserHome(user)) => {
    if (
      typeof window !== "undefined" &&
      canReturnWithinApp(window.history.state)
    ) {
      window.history.back();
      return;
    }
    handleNavigate(fallbackPage, {
      replace: true,
      source: "fallback-return",
    });
  };

  useEffect(() => {
    if (!isAuthenticated || activePage !== "registrar") return;
    const snapshot = readActiveTrainingSnapshot();
    if (!isActiveTrainingSnapshot(snapshot)) return;
    if (canAccessActiveTraining(snapshot, user, coachAthlete)) return;
    clearActiveTrainingSnapshot();
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("view_training_id");
      localStorage.removeItem("view_training_date");
      localStorage.removeItem("edit_training_id");
      localStorage.removeItem("edit_training_date");
    }
    window.dispatchEvent(new Event("active-training-updated"));
    window.dispatchEvent(new Event("open-default-training-page"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activePage,
    coachAthlete?.id,
    isAuthenticated,
    user?.id,
    user?._id,
    user?.role,
  ]);

  useEffect(() => {
    const handlePopState = (event) => {
      const routePage = pageFromPath();
      const storedPage = localStorage.getItem("active_page");
      const historyPage = getAppHistoryPage(event.state);
      const nextPage =
        isAuthenticated && routePage === "login"
          ? historyPage || storedPage || getUserHome(user)
          : historyPage || routePage || storedPage || "login";
      const nextIndex = getAppHistoryIndex(event.state);
      navigationIndexRef.current = nextIndex;
      setRestoreScrollY(getAppHistoryScroll(event.state));
      setActivePage(nextPage);
      if (ROUTED_PAGES.has(nextPage)) localStorage.removeItem("active_page");
      else localStorage.setItem("active_page", nextPage);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (PUBLIC_PAGES.has(activePage) || activePage === "invitation") return;
    if (!isAuthenticated || user?.role !== "Entrenador") return;
    if (COACH_ATHLETE_CONTEXT_PAGES.has(activePage) && !coachAthlete?.id) {
      handleNavigate("trainer", { replace: true });
      return;
    }
    const isSupervisedTraining = activePage === "registrar" && coachAthlete;
    if (!COACH_ALLOWED_PAGES.has(activePage) && !isSupervisedTraining) {
      handleNavigate("trainer", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, coachAthlete, isAuthenticated, user?.role]);

  useEffect(() => {
    if (PUBLIC_PAGES.has(activePage) || activePage === "invitation") return;
    const isManagedClient =
      user?.role === "Cliente" && user?.trainingMode === "coach_managed";
    if (
      isAuthenticated &&
      isManagedClient &&
      !MANAGED_CLIENT_ALLOWED_PAGES.has(activePage)
    ) {
      handleNavigate("dashboard", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, isAuthenticated, user?.role, user?.trainingMode]);

  useEffect(() => {
    if (PUBLIC_PAGES.has(activePage) || activePage === "invitation") return;
    if (!isAuthenticated) return;
    if (needsOnboarding(user) && activePage !== "onboarding") {
      handleNavigate("onboarding", { replace: true });
      return;
    }
    if (!needsOnboarding(user) && activePage === "onboarding") {
      handleNavigate(getUserHome(user), { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, isAuthenticated, user?.onboarding?.status, user?.role]);

  useEffect(() => {
    if (
      isAuthenticated &&
      ["login", "register", "recover", "reset", "verify"].includes(activePage)
    ) {
      handleNavigate(getUserHome(user), { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.onboarding?.status, user?.role]);

  useEffect(() => {
    if (
      !isAuthenticated ||
      user?.role !== "Cliente" ||
      activePage === "invitation" ||
      acceptingInvitationRef.current
    ) {
      return;
    }
    const invitationToken = readCoachInvitation();
    if (!invitationToken) return;
    acceptingInvitationRef.current = true;
    api
      .acceptCoachInvitation(invitationToken)
      .then(async (result) => {
        clearCoachInvitation();
        const refreshedUser = await refreshUser({ force: true });
        toast.success("Ya estás conectado con tu coach", {
          description: `${result.coach?.name || "Tu coach"} ya puede preparar tu seguimiento.`,
        });
        handleNavigate(
          needsOnboarding(refreshedUser) ? "onboarding" : "dashboard",
          { replace: true },
        );
      })
      .catch((error) => {
        if (error.code === "COACH_TRANSFER_CONFIRMATION_REQUIRED") {
          handleNavigate("invitation", { replace: true });
          return;
        }
        if ([404, 410].includes(error.status)) clearCoachInvitation();
        toast.error("No pudimos completar la invitación", {
          description: error.message || "Abre nuevamente el enlace del coach.",
        });
      })
      .finally(() => {
        acceptingInvitationRef.current = false;
      });
    // La aceptación debe ejecutarse una sola vez al completar el acceso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, isAuthenticated, user?.id, user?.role]);

  const pageEntry = useMemo(
    () => PAGES[activePage] || PAGES.dashboard,
    [activePage],
  );
  const PageComponent = pageEntry.component;
  const allowedRoles = PAGE_ROLES[activePage] || [];
  const supervisedOwnerId =
    ["Admin", "Entrenador"].includes(user?.role) &&
    [
      "registrar",
      "ejercicio_analitica",
      "editor_historial",
      "resumen_sesion",
      "data_intelligence",
      "pesajes",
      "hidratacion",
    ].includes(activePage)
      ? coachAthlete?.id || ""
      : "";
  const authenticatedUserId = String(user?.id || user?._id || "anonymous");
  const providerScopeKey = `${authenticatedUserId}:${supervisedOwnerId || "self"}`;

  if (PUBLIC_PAGES.has(activePage)) {
    return <LegalPage kind={activePage} />;
  }

  if (activePage === "invitation") {
    const token =
      invitationTokenFromPath(window.location.pathname) ||
      readCoachInvitation();
    return <CoachInvitation token={token} onNavigate={handleNavigate} />;
  }

  if (loading) {
    return (
      <OperationLoader
        active
        delayMs={250}
        title="Conectando con el servidor"
        description="Estamos verificando tu sesion y preparando la aplicacion."
      />
    );
  }

  if (!isAuthenticated) {
    if (activePage === "register") {
      return <Register onNavigate={handleNavigate} />;
    }
    return (
      <Login
        initialMode={
          activePage === "reset"
            ? "reset"
            : activePage === "verify"
              ? "verify"
              : activePage === "recover"
                ? "recover"
                : "login"
        }
        onNavigate={handleNavigate}
      />
    );
  }

  if (AUTH_ONLY_PAGES.has(activePage)) {
    return (
      <OperationLoader active mode="screen" title="Preparando tu espacio" />
    );
  }

  return (
    <DashboardBootstrapProvider
      enabled={activePage === "dashboard"}
      ownerId={supervisedOwnerId}
    >
      <TrainingProvider
        key={providerScopeKey}
        ownerId={supervisedOwnerId}
        enabled={activePage !== "onboarding"}
        loadExercises={EXERCISE_CONTEXT_PAGES.has(activePage)}
        loadPhotos={PHOTO_CONTEXT_PAGES.has(activePage)}
        loadSessions={SESSION_CONTEXT_PAGES.has(activePage)}
      >
        <RoutineProvider
          key={providerScopeKey}
          ownerId={supervisedOwnerId}
          enabled={activePage !== "onboarding"}
        >
          <UserProvider enabled={activePage !== "onboarding"}>
            <MainLayout
              activePage={activePage}
              onNavigate={handleNavigate}
              coachAthlete={supervisedOwnerId ? coachAthlete : null}
              hideMobileNavigation={pageHidesMobileNavigation}
              onCoachContextExit={() => {
                if (hasAccessibleTrainingSnapshot(user, coachAthlete)) {
                  handleNavigate("trainer");
                  return;
                }
                selectCoachAthlete(null);
                handleNavigate("trainer");
              }}
            >
              <div
                key={activePage}
                data-page-view={activePage}
                className="h-full"
              >
                <PageErrorBoundary
                  resetKey={activePage}
                  onGoHome={() =>
                    handleNavigate(
                      user?.role === "Entrenador" ? "trainer" : "dashboard",
                    )
                  }
                >
                  <Suspense
                    fallback={
                      <OperationLoader
                        active
                        delayMs={120}
                        mode="inline"
                        title={`Abriendo ${pageEntry.label}`}
                      />
                    }
                  >
                    <RoleBasedRoute roles={allowedRoles}>
                      <PageComponent
                        pageKey={pageEntry.label}
                        pageId={activePage}
                        onNavigate={handleNavigate}
                        onBack={handleBack}
                        coachAthlete={coachAthlete}
                        onSelectCoachAthlete={selectCoachAthlete}
                        onMobileNavVisibilityChange={
                          handleMobileNavVisibilityChange
                        }
                      />
                    </RoleBasedRoute>
                  </Suspense>
                </PageErrorBoundary>
              </div>
            </MainLayout>
          </UserProvider>
        </RoutineProvider>
      </TrainingProvider>
    </DashboardBootstrapProvider>
  );
}

export default App;
