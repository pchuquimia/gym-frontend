import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "./App.css";
import Dashboard from "./pages/Dashboard";
import ExerciseLibrary from "./pages/ExerciseLibrary";
import MainLayout from "./components/layout/MainLayout";
import RegisterTraining from "./pages/RegisterTraining";
import ExerciseAnalyticsPage from "./pages/ExerciseAnalyticsPage";
import SessionSummaryPage from "./pages/SessionSummaryPage";
import DataIntelligencePage from "./pages/DataIntelligencePage";
import Routines from "./pages/Routines";
import ProfileSettings from "./pages/ProfileSettings";
import PhotosLibrary from "./pages/PhotosLibrary";
import TrainingAdmin from "./pages/TrainingAdmin";
import CoachDashboard from "./pages/CoachDashboard";
import CoachManagement from "./pages/CoachManagement";
import WeightTracking from "./pages/WeightTracking";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RoleBasedRoute from "./components/auth/RoleBasedRoute";
import { useAuth } from "./context/AuthContext";
import { TrainingProvider } from "./context/TrainingContext";
import { RoutineProvider } from "./context/RoutineContext";
import { UserProvider } from "./context/UserContext";
import {
  canAccessActiveTraining,
  clearActiveTrainingSnapshot,
  isActiveTrainingSnapshot,
  readActiveTrainingSnapshot,
} from "./utils/activeTraining";

const PAGES = {
  dashboard: { label: "Dashboard", component: Dashboard },
  library: { label: "Biblioteca de Ejercicios", component: ExerciseLibrary },
  registrar: { label: "Registrar Entrenamiento", component: RegisterTraining },
  ejercicio_analitica: {
    label: "Analitica por ejercicio",
    component: ExerciseAnalyticsPage,
  },
  resumen_sesion: { label: "Resumen de Sesion", component: SessionSummaryPage },
  data_intelligence: {
    label: "Inteligencia de datos",
    component: DataIntelligencePage,
  },
  rutinas: { label: "Rutinas y Planificacion", component: Routines },
  trainer: { label: "Mis atletas", component: CoachDashboard },
  coach_admin: { label: "Coaches y atletas", component: CoachManagement },
  admin_sesiones: { label: "Historial de sesiones", component: TrainingAdmin },
  perfil: { label: "Perfil y Ajustes", component: ProfileSettings },
  fotos: { label: "Biblioteca de Fotos", component: PhotosLibrary },
  pesajes: { label: "Seguimiento de peso", component: WeightTracking },
};

const PAGE_ROLES = {
  admin_sesiones: ["Admin", "Entrenador", "Cliente"],
  trainer: ["Admin", "Entrenador"],
  coach_admin: ["Admin"],
};

const SNAPSHOT_KEY = "active_training_snapshot";
const LEGACY_TRAINING_KEY = "active_training";
const COACH_ATHLETE_KEY = "coach_athlete_context";
const COACH_ALLOWED_PAGES = new Set([
  "trainer",
  "rutinas",
  "library",
  "ejercicio_analitica",
  "resumen_sesion",
  "data_intelligence",
  "admin_sesiones",
  "pesajes",
  "perfil",
]);
const COACH_ATHLETE_CONTEXT_PAGES = new Set([
  "ejercicio_analitica",
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
  "admin_sesiones",
  "fotos",
  "perfil",
]);
const EXERCISE_CONTEXT_PAGES = new Set([
  "dashboard",
  "registrar",
  "ejercicio_analitica",
  "resumen_sesion",
  "data_intelligence",
  "rutinas",
  "admin_sesiones",
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

const authPageFromPath = () => {
  if (typeof window === "undefined") return null;
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  return (
    Object.entries(AUTH_PATHS).find(([, value]) => value === path)?.[0] || null
  );
};

const roleHome = (role) => {
  if (role === "Admin") return "dashboard";
  if (role === "Entrenador") return "trainer";
  return "perfil";
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
  const { user, isAuthenticated, loading } = useAuth();
  const [activePage, setActivePage] = useState(() => {
    if (typeof localStorage === "undefined") return "login";
    const authPage = authPageFromPath();
    if (authPage && authPage !== "login") return authPage;
    if (hasActiveTrainingSnapshot()) return "registrar";
    const stored = localStorage.getItem("active_page");
    return stored || authPage || "login";
  });
  const [coachAthlete, setCoachAthlete] = useState(readCoachAthlete);

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
    const snapshot =
      page === "registrar" ? readActiveTrainingSnapshot() : null;
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
    setActivePage(page);
    if (typeof localStorage !== "undefined") {
      if (AUTH_PATHS[page]) {
        localStorage.removeItem("active_page");
        const target = `${AUTH_PATHS[page]}${page === "reset" ? window.location.search : ""}`;
        if (`${window.location.pathname}${window.location.search}` !== target) {
          window.history.pushState({ page }, "", target);
        }
      } else {
        localStorage.setItem("active_page", page);
        if (window.location.pathname !== "/" || window.location.search) {
          window.history.replaceState({ page }, "", "/");
        }
      }
    }
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
    const handlePopState = () => {
      const authPage = authPageFromPath();
      const storedPage = localStorage.getItem("active_page");
      if (isAuthenticated && authPage === "login") {
        setActivePage(storedPage || roleHome(user?.role));
        return;
      }
      setActivePage(authPage || storedPage || "login");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "Entrenador") return;
    if (COACH_ATHLETE_CONTEXT_PAGES.has(activePage) && !coachAthlete?.id) {
      handleNavigate("trainer");
      return;
    }
    const isSupervisedTraining = activePage === "registrar" && coachAthlete;
    if (!COACH_ALLOWED_PAGES.has(activePage) && !isSupervisedTraining) {
      handleNavigate("trainer");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, coachAthlete, isAuthenticated, user?.role]);

  useEffect(() => {
    const isManagedClient =
      user?.role === "Cliente" && user?.trainingMode === "coach_managed";
    if (
      isAuthenticated &&
      isManagedClient &&
      !MANAGED_CLIENT_ALLOWED_PAGES.has(activePage)
    ) {
      handleNavigate("dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, isAuthenticated, user?.role, user?.trainingMode]);

  useEffect(() => {
    if (
      isAuthenticated &&
      ["login", "register", "recover", "reset", "verify"].includes(activePage)
    ) {
      handleNavigate(roleHome(user?.role));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.role]);

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
      "resumen_sesion",
      "data_intelligence",
      "pesajes",
    ].includes(activePage)
      ? coachAthlete?.id || ""
      : "";

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[color:var(--bg)] text-[color:var(--text)]">
        <div className="text-sm text-[color:var(--text-muted)]">
          Cargando sesion...
        </div>
      </div>
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

  return (
    <TrainingProvider
      ownerId={supervisedOwnerId}
      loadExercises={EXERCISE_CONTEXT_PAGES.has(activePage)}
      loadPhotos={activePage !== "fotos"}
    >
      <RoutineProvider ownerId={supervisedOwnerId}>
        <UserProvider>
          <MainLayout
            activePage={activePage}
            onNavigate={handleNavigate}
            coachAthlete={supervisedOwnerId ? coachAthlete : null}
            onCoachContextExit={() => {
              if (hasAccessibleTrainingSnapshot(user, coachAthlete)) {
                handleNavigate("trainer");
                return;
              }
              selectCoachAthlete(null);
              handleNavigate("trainer");
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activePage}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{
                  duration: 0.28,
                  ease: [0.2, 0.8, 0.2, 1],
                  exit: { duration: 0.2, ease: [0.4, 0, 1, 1] },
                }}
                className="h-full"
              >
                <RoleBasedRoute roles={allowedRoles}>
                  <PageComponent
                    pageKey={pageEntry.label}
                    onNavigate={handleNavigate}
                    coachAthlete={coachAthlete}
                    onSelectCoachAthlete={selectCoachAthlete}
                  />
                </RoleBasedRoute>
              </motion.div>
            </AnimatePresence>
          </MainLayout>
        </UserProvider>
      </RoutineProvider>
    </TrainingProvider>
  );
}

export default App;
