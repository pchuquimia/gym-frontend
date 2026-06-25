import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "./App.css";
import Dashboard from "./pages/Dashboard";
import ExerciseLibrary from "./pages/ExerciseLibrary";
import MainLayout from "./components/layout/MainLayout";
import RegisterTraining from "./pages/RegisterTraining";
import ExerciseAnalyticsPage from "./pages/ExerciseAnalyticsPage";
import SessionSummaryPage from "./pages/SessionSummaryPage";
import Routines from "./pages/Routines";
import ProfileSettings from "./pages/ProfileSettings";
import PhotosLibrary from "./pages/PhotosLibrary";
import TrainingAdmin from "./pages/TrainingAdmin";
import Goals from "./pages/Goals";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RoleBasedRoute from "./components/auth/RoleBasedRoute";
import { useAuth } from "./context/AuthContext";
import { TrainingProvider } from "./context/TrainingContext";
import { RoutineProvider } from "./context/RoutineContext";
import { UserProvider } from "./context/UserContext";

const PAGES = {
  dashboard: { label: "Dashboard", component: Dashboard },
  library: { label: "Biblioteca de Ejercicios", component: ExerciseLibrary },
  registrar: { label: "Registrar Entrenamiento", component: RegisterTraining },
  ejercicio_analitica: {
    label: "Analitica por ejercicio",
    component: ExerciseAnalyticsPage,
  },
  resumen_sesion: { label: "Resumen de Sesion", component: SessionSummaryPage },
  rutinas: { label: "Rutinas y Planificacion", component: Routines },
  trainer: { label: "Panel Entrenador", component: Routines },
  admin_sesiones: { label: "Administrar sesiones", component: TrainingAdmin },
  perfil: { label: "Perfil y Ajustes", component: ProfileSettings },
  fotos: { label: "Biblioteca de Fotos", component: PhotosLibrary },
  objetivos: { label: "Objetivos", component: Goals },
};

const PAGE_ROLES = {
  admin_sesiones: ["Admin", "Entrenador"],
};

const SNAPSHOT_KEY = "active_training_snapshot";
const LEGACY_TRAINING_KEY = "active_training";

const roleHome = (role) => {
  if (role === "Admin") return "dashboard";
  if (role === "Entrenador") return "trainer";
  return "perfil";
};

const hasActiveTrainingSnapshot = () => {
  if (typeof localStorage === "undefined") return false;
  const raw =
    localStorage.getItem(SNAPSHOT_KEY) ||
    localStorage.getItem(LEGACY_TRAINING_KEY);
  if (!raw) return false;
  try {
    const snap = JSON.parse(raw);
    const elapsed = Number(snap?.elapsed ?? snap?.durationSeconds ?? 0) || 0;
    return Boolean(
      snap?.selectedRoutineId &&
      (snap?.hasStarted ||
        snap?.isRunning ||
        elapsed > 0 ||
        (Array.isArray(snap?.exercises) && snap.exercises.length > 0)),
    );
  } catch {
    return false;
  }
};

function App() {
  const { user, isAuthenticated, loading } = useAuth();
  const [activePage, setActivePage] = useState(() => {
    if (typeof localStorage === "undefined") return "login";
    if (hasActiveTrainingSnapshot()) return "registrar";
    const stored = localStorage.getItem("active_page");
    return stored || "login";
  });

  const handleNavigate = (page) => {
    setActivePage(page);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("active_page", page);
    }
  };

  useEffect(() => {
    if (
      isAuthenticated &&
      (activePage === "login" || activePage === "register")
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
    return activePage === "register" ? (
      <Register onNavigate={handleNavigate} />
    ) : (
      <Login onNavigate={handleNavigate} />
    );
  }

  return (
    <TrainingProvider>
      <RoutineProvider>
        <UserProvider>
          <MainLayout activePage={activePage} onNavigate={handleNavigate}>
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
