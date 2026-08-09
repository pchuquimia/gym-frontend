import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CalendarPlus,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Copy,
  Dumbbell,
  PauseCircle,
  Pencil,
  Play,
  MoreVertical,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Button from "../components/ui/button";
import CoachPlanModal from "../components/coach/CoachPlanModal";
import { useAuth } from "../context/AuthContext";
import { useRoutines } from "../context/RoutineContext";
import { api } from "../services/api";

const formatDate = (value) => {
  if (!value) return "Sin entrenamientos";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? "Sin entrenamientos"
    : date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
      });
};

const formatVolume = (value) =>
  `${Math.round(Number(value) || 0).toLocaleString("es-ES")} kg`;
const formatMetricVolume = (value) => {
  const amount = Math.round(Number(value) || 0);
  if (amount < 10_000) return `${amount.toLocaleString("es-ES")} kg`;
  return `${(amount / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })}k kg`;
};
const formatDuration = (seconds) => {
  const minutes = Math.round((Number(seconds) || 0) / 60);
  return minutes ? `${minutes} min` : "Sin tiempo";
};

const DAY_NAMES = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const LEVEL_LABELS = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};
const PLAN_STATUS_LABELS = {
  active: "Plan activo",
  scheduled: "Plan programado",
  draft: "Borrador en preparacion",
  paused: "Plan pausado",
  completed: "Plan finalizado",
  cancelled: "Plan archivado",
};

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A";

function AthleteRow({ athlete, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[72px] w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition dark:rounded-[3px] ${
        selected
          ? "border-[#ff5722] bg-[#fff0eb] dark:border-[#e2ff00] dark:bg-[#e2ff00]/10"
          : "border-transparent hover:border-[color:var(--border)] hover:bg-[color:var(--bg)]"
      }`}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-[#ff5722] text-sm font-black text-white dark:rounded-[3px] dark:bg-[#e2ff00] dark:text-black">
        {initials(athlete.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-[color:var(--text)]">
          {athlete.name}
        </span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-[color:var(--text-muted)]">
          {athlete.trainingCount
            ? `Ultima sesion ${formatDate(athlete.lastTraining?.date)}`
            : "Sin sesiones registradas"}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
    </button>
  );
}

function AssignRoutineModal({ athlete, templates, onAssign, onClose }) {
  const [sourceRoutineId, setSourceRoutineId] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const filteredTemplates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return [...templates]
      .filter((routine) =>
        normalized
          ? `${routine.name} ${routine.goal || ""}`
              .toLowerCase()
              .includes(normalized)
          : true,
      )
      .sort(
        (a, b) =>
          Number(a.visibility === "system") -
            Number(b.visibility === "system") ||
          String(a.name).localeCompare(String(b.name)),
      );
  }, [query, templates]);

  const submit = async () => {
    if (!sourceRoutineId || saving) return;
    setSaving(true);
    try {
      await onAssign(sourceRoutineId);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="routines-shell fixed inset-0 z-[80] flex items-end bg-black/50 sm:items-center sm:justify-center sm:p-4">
      <div className="max-h-[88dvh] w-full overflow-hidden rounded-t-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-2xl sm:max-w-lg sm:rounded-md dark:sm:rounded-[3px]">
        <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] p-4">
          <div>
            <p className="text-[10px] font-black uppercase text-[#ae3512] dark:text-[#e2ff00]">
              {athlete.name}
            </p>
            <h2 className="mt-1 text-xl font-black uppercase">Asignar rutina extra</h2>
            <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
              Quedará disponible fuera del calendario y en cualquier sucursal.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[color:var(--border)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-[color:var(--border)] p-4">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar rutina base..."
              className="theme-accent-focus h-11 w-full border border-[color:var(--border)] bg-[color:var(--bg)] pl-10 pr-3 text-sm font-semibold outline-none"
            />
          </label>
        </div>
        <div className="max-h-[50dvh] space-y-2 overflow-y-auto p-4">
          {filteredTemplates.length ? (
            filteredTemplates.map((routine) => {
              const id = routine.id || routine._id;
              const selected = sourceRoutineId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSourceRoutineId(id)}
                  className={`flex min-h-16 w-full items-center gap-3 border p-3 text-left ${
                    selected
                      ? "border-[#ff5722] bg-[#fff0eb] dark:border-[#e2ff00] dark:bg-[#e2ff00]/10"
                      : "border-[color:var(--border)]"
                  }`}
                >
                  <Dumbbell className="theme-accent-text h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black">
                      {routine.name}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-[color:var(--text-muted)]">
                      {(routine.exercises || []).length} ejercicios ·{" "}
                      {routine.visibility === "system" ? "Base" : "Propia"}
                    </span>
                  </span>
                  <span
                    className={`h-5 w-5 rounded-full border-2 ${
                      selected
                        ? "border-[6px] border-[#ff5722] dark:border-[#e2ff00]"
                        : "border-[color:var(--border)]"
                    }`}
                  />
                </button>
              );
            })
          ) : (
            <div className="py-8 text-center">
              <ClipboardList className="mx-auto h-8 w-8 text-[color:var(--text-muted)]" />
              <p className="mt-3 text-sm font-black">
                {query ? "No hay coincidencias" : "No tienes plantillas"}
              </p>
              <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                {query
                  ? "Prueba con otro nombre u objetivo."
                  : "Crea una rutina propia antes de asignarla."}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-[color:var(--border)] p-4">
          <Button
            className="h-12 w-full rounded-lg"
            disabled={!sourceRoutineId || saving}
            onClick={submit}
          >
            {saving ? "Asignando..." : "Agregar rutina adicional"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CoachDashboard({
  onNavigate = () => {},
  onSelectCoachAthlete = () => {},
}) {
  const { user } = useAuth();
  const { routines: availableRoutines } = useRoutines();
  const templates = useMemo(
    () =>
      availableRoutines.filter(
        (routine) =>
          routine.kind === "template" ||
          (!routine.kind &&
            !routine.trainingPlanId &&
            !routine.assignedByCoachId),
      ),
    [availableRoutines],
  );
  const [athletes, setAthletes] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [overview, setOverview] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planTemplates, setPlanTemplates] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [planActionId, setPlanActionId] = useState("");
  const [routineActionId, setRoutineActionId] = useState("");
  const [athleteView, setAthleteView] = useState("plan");
  const [expandedRoutineId, setExpandedRoutineId] = useState("");

  const loadAthletes = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setAthletes(await api.getCoachAthletes());
    } catch (err) {
      toast.error(err.message || "No se pudieron cargar los atletas");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadAthletes();
    api
      .getPlanTemplates()
      .then(setPlanTemplates)
      .catch((err) =>
        toast.error(err.message || "No se pudieron cargar los planes base"),
      );
  }, []);

  useEffect(() => {
    if (loading || !selectedId) return;
    const stillAssigned = athletes.some(
      (athlete) => String(athlete.id || athlete._id) === String(selectedId),
    );
    if (stillAssigned) return;
    setSelectedId("");
    setOverview(null);
    onSelectCoachAthlete(null);
  }, [athletes, loading, onSelectCoachAthlete, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setOverview(null);
      setSelectedPlanId("");
      return;
    }
    setAthleteView("plan");
    setExpandedRoutineId("");
    setSelectedPlanId("");
    let active = true;
    setLoadingOverview(true);
    api
      .getCoachAthleteOverview(selectedId)
      .then((data) => active && setOverview(data))
      .catch((err) => {
        if (!active) return;
        setOverview(null);
        setSelectedId("");
        onSelectCoachAthlete(null);
        loadAthletes({ silent: true });
        toast.error(err.message || "El atleta ya no está disponible");
      })
      .finally(() => active && setLoadingOverview(false));
    return () => {
      active = false;
    };
  }, [selectedId]);

  const filteredAthletes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return athletes;
    return athletes.filter((athlete) =>
      `${athlete.name} ${athlete.email}`.toLowerCase().includes(query),
    );
  }, [athletes, search]);

  const selectedAthlete = athletes.find(
    (athlete) => (athlete.id || athlete._id) === selectedId,
  );
  const activePlan =
    overview?.plans?.find(
      (plan) => String(plan._id || plan.id) === String(selectedPlanId),
    ) ||
    overview?.plans?.find((plan) => plan.status === "active") ||
    overview?.plans?.find((plan) => plan.status === "scheduled") ||
    overview?.plans?.find((plan) => plan.status === "draft") ||
    overview?.plans?.[0];
  const activeTrainingPlan = overview?.plans?.find(
    (plan) => plan.status === "active",
  );
  const activePlanTrainingDays = (activePlan?.weeklySchedule || []).filter(
    (day) => day.type === "training",
  );
  const missingPlanRoutineCount = activePlanTrainingDays.filter(
    (day) => !day.routineId,
  ).length;
  const currentDayIndex = ((new Date().getDay() + 6) % 7) + 1;
  const recommendedPlanDay = activeTrainingPlan
    ? activeTrainingPlan.scheduleMode === "fixed"
      ? (activeTrainingPlan.weeklySchedule || []).find(
          (day) =>
            Number(day.dayIndex) === currentDayIndex &&
            day.type === "training" &&
            day.routineId,
        )
      : (activeTrainingPlan.weeklySchedule || [])[Number(
          activeTrainingPlan.cycleProgress?.currentIndex || 0,
        )]
    : null;
  const routineNameById = new Map(
    (overview?.routines || []).map((routine) => [
      String(routine._id || routine.id),
      routine.name,
    ]),
  );
  const planStatusById = new Map(
    (overview?.plans || []).map((plan) => [
      String(plan._id || plan.id),
      plan.status,
    ]),
  );
  const trainableRoutines = (overview?.routines || []).filter(
    (routine) =>
      routine.isAvailableForTraining !== false && routine.isArchived !== true,
  );
  const orderedAthleteRoutines = [...(overview?.routines || [])].sort(
    (a, b) =>
      Number(b.isAvailableForTraining !== false && b.isArchived !== true) -
        Number(a.isAvailableForTraining !== false && a.isArchived !== true) ||
      String(a.name || "").localeCompare(String(b.name || "")),
  );

  const assignRoutine = async (sourceRoutineId) => {
    try {
      const template = templates.find(
        (routine) => (routine.id || routine._id) === sourceRoutineId,
      );
      await api.assignCoachRoutine(selectedId, {
        sourceRoutineId,
        branch: "general",
      });
      const data = await api.getCoachAthleteOverview(selectedId);
      setOverview(data);
      await loadAthletes({ silent: true });
      setAssigning(false);
      toast.success("Rutina adicional asignada", {
        description: `${template?.name || "La rutina"} fue asignada a ${selectedAthlete?.name}.`,
      });
    } catch (err) {
      toast.error(err.message || "No se pudo asignar la rutina");
    }
  };

  const duplicateAssignedRoutine = async (routine) => {
    const routineId = String(routine._id || routine.id);
    if (routineActionId) return;
    setRoutineActionId(routineId);
    try {
      await api.duplicateCoachRoutine(selectedId, routineId);
      setOverview(await api.getCoachAthleteOverview(selectedId));
      toast.success("Rutina duplicada", {
        description: "La copia quedo disponible como rutina adicional.",
      });
    } catch (err) {
      toast.error(err.message || "No se pudo duplicar la rutina");
    } finally {
      setRoutineActionId("");
    }
  };

  const deleteAssignedRoutine = async (routine) => {
    const message = routine.trainingPlanId
      ? `Eliminar ${routine.name} liberara su bloque y devolvera el plan a borrador. ¿Continuar?`
      : `¿Eliminar ${routine.name} del atleta?`;
    if (!window.confirm(message)) return;
    const routineId = String(routine._id || routine.id);
    if (routineActionId) return;
    setRoutineActionId(routineId);
    try {
      await api.deleteRoutine(routineId);
      setOverview(await api.getCoachAthleteOverview(selectedId));
      toast.success("Rutina eliminada");
    } catch (err) {
      toast.error(err.message || "No se pudo eliminar la rutina");
    } finally {
      setRoutineActionId("");
    }
  };

  const savePlan = async (payload) => {
    try {
      const saved = editingPlan
        ? await api.updateCoachPlan(
          selectedId,
          editingPlan._id || editingPlan.id,
          { ...payload, branch: "general" },
        )
        : await api.createCoachPlan(selectedId, {
            ...payload,
            branch: "general",
          });
      const data = await api.getCoachAthleteOverview(selectedId);
      setOverview(data);
      setSelectedPlanId(String(saved._id || saved.id));
      await loadAthletes({ silent: true });
      setCreatingPlan(false);
      setEditingPlan(null);
      toast.success(editingPlan ? "Plan actualizado" : "Planificacion creada", {
        description: editingPlan
          ? `${payload.name} fue actualizado para ${selectedAthlete?.name}.`
          : `Revisa ${payload.name} y activalo cuando este completo.`,
      });
    } catch (err) {
      toast.error(err.message || "No se pudo crear el plan");
      throw err;
    }
  };

  const updatePlanStatus = async (plan, status) => {
    const currentActive = overview?.plans?.find(
      (item) => item.status === "active",
    );
    if (
      status === "active" &&
      currentActive &&
      String(currentActive._id || currentActive.id) !==
        String(plan._id || plan.id) &&
      !window.confirm(
        `Al activar este plan se pausara ${currentActive.name}. ¿Deseas continuar?`,
      )
    ) {
      return;
    }
    try {
      const saved = await api.updateCoachPlanStatus(
        selectedId,
        plan._id || plan.id,
        status,
      );
      const data = await api.getCoachAthleteOverview(selectedId);
      setOverview(data);
      await loadAthletes({ silent: true });
      toast.success(
        status === "active"
          ? saved.status === "scheduled"
            ? "Plan programado"
            : "Plan reactivado"
          : status === "completed"
            ? "Plan finalizado"
            : "Plan pausado",
      );
    } catch (err) {
      toast.error(err.message || "No se pudo actualizar el plan");
    }
  };

  const removeCoachPlan = async (plan) => {
    const planId = String(plan._id || plan.id);
    if (planActionId) return;
    const deletesPermanently = plan.status === "draft";
    const confirmation = deletesPermanently
      ? `Eliminar definitivamente el borrador ${plan.name}? Sus rutinas sin historial tambien se eliminaran.`
      : `Archivar ${plan.name}? Dejara de aparecer entre las planificaciones disponibles.`;
    if (!window.confirm(confirmation)) return;

    setPlanActionId(planId);
    try {
      const result = await api.deleteCoachPlan(selectedId, planId);
      setOverview(await api.getCoachAthleteOverview(selectedId));
      setSelectedPlanId("");
      await loadAthletes({ silent: true });
      toast.success(
        result.disposition === "deleted"
          ? "Borrador eliminado"
          : "Plan archivado",
        {
          description:
            result.disposition === "deleted"
              ? "El borrador vacio y sus rutinas asociadas fueron eliminados."
              : "El historial registrado se mantiene disponible.",
        },
      );
    } catch (err) {
      toast.error(err.message || "No se pudo retirar el plan");
    } finally {
      setPlanActionId("");
    }
  };

  const requireTemplates = (open) => {
    if (templates.length) {
      open();
      return;
    }
    toast.info("Primero crea una plantilla de rutina", {
      description:
        "El plan necesita ejercicios definidos para poder activarse.",
      action: {
        label: "Ir a plantillas",
        onClick: () => onNavigate("rutinas"),
      },
    });
  };

  const startTraining = () => {
    if (!selectedAthlete || !trainableRoutines.length) return;
    onSelectCoachAthlete({
      id: selectedId,
      name: selectedAthlete.name,
      email: selectedAthlete.email,
    });
    if (recommendedPlanDay?.routineId && typeof localStorage !== "undefined") {
      localStorage.setItem(
        "training_plan_routine_intent",
        JSON.stringify({
          routineId: recommendedPlanDay.routineId,
          planId: activeTrainingPlan._id || activeTrainingPlan.id,
          slotId: recommendedPlanDay.slotId,
          createdAt: Date.now(),
        }),
      );
    }
    toast.success("Sesión preparada", {
      description: `Registrarás el entrenamiento de ${selectedAthlete.name}.`,
    });
    onNavigate("registrar");
  };

  return (
    <main className="routines-shell mx-auto w-full max-w-[1440px] pb-24 text-[color:var(--text)] sm:pb-12">
      <header className="flex items-end justify-between gap-4 border-b border-[color:var(--border)] pb-4">
        <div>
          <p className="text-[10px] font-black uppercase text-[#ae3512] dark:text-[#e2ff00]">
            Coach · {athletes.length} {athletes.length === 1 ? "atleta" : "atletas"}
          </p>
          <h1 className="mt-1 text-[28px] font-black uppercase leading-none sm:text-[32px]">
            Mis atletas
          </h1>
        </div>
        <Button
          variant="outline"
          className="h-11 gap-2 rounded-md px-3 text-xs font-black uppercase dark:rounded-[3px]"
          onClick={() => onNavigate("rutinas")}
          aria-label="Administrar plantillas"
        >
          <CalendarDays className="h-4 w-4" />
          <span>Plantillas</span>
        </Button>
      </header>

      {loading ? (
        <div className="grid min-h-72 place-items-center text-sm font-semibold text-[color:var(--text-muted)]">
          Cargando atletas...
        </div>
      ) : !athletes.length ? (
        <section className="grid min-h-96 place-items-center text-center">
          <div className="max-w-sm">
            <Users className="theme-accent-text mx-auto h-10 w-10" />
            <h2 className="mt-4 text-xl font-black">Aún no tienes atletas</h2>
            <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">
              Un administrador debe vincular clientes a tu cuenta antes de que
              puedas consultar o modificar su entrenamiento.
            </p>
          </div>
        </section>
      ) : (
        <div className="mt-4 grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] xl:gap-7">
          <aside
            className={`${selectedId ? "hidden lg:block" : "block"} lg:sticky lg:top-4 lg:h-[calc(100dvh-7rem)] lg:border-r lg:border-[color:var(--border)] lg:pr-4`}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-black uppercase text-[color:var(--text-muted)]">
                Seleccionar atleta
              </p>
              <span className="text-xs font-black">{filteredAthletes.length}</span>
            </div>
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar atleta"
                className="theme-accent-focus h-11 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--card)] pl-10 pr-3 text-sm font-semibold outline-none dark:rounded-[3px]"
              />
            </label>
            <div className="mt-2 max-h-[calc(100dvh-11rem)] space-y-1 overflow-y-auto pr-1">
              {filteredAthletes.map((athlete) => {
                const id = athlete.id || athlete._id;
                return (
                  <AthleteRow
                    key={id}
                    athlete={athlete}
                    selected={selectedId === id}
                    onClick={() => {
                      setSelectedId(id);
                      onSelectCoachAthlete({
                        id,
                        name: athlete.name,
                        email: athlete.email,
                      });
                    }}
                  />
                );
              })}
              {!filteredAthletes.length ? (
                <div className="border-y border-[color:var(--border)] py-8 text-center">
                  <p className="text-sm font-black">Sin coincidencias</p>
                  <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                    Busca por nombre o correo.
                  </p>
                </div>
              ) : null}
            </div>
          </aside>

          {!selectedId ? (
            <section className="grid min-h-96 place-items-center border-y border-[color:var(--border)] text-center lg:border-y-0">
              <div className="max-w-xs py-16">
                <UserRound className="mx-auto h-10 w-10 text-[color:var(--text-muted)]" />
                <h2 className="mt-4 text-lg font-black">
                  Selecciona un atleta
                </h2>
                <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">
                  Su planificación y progreso aparecerán aquí.
                </p>
              </div>
            </section>
          ) : loadingOverview || !overview ? (
            <div className="grid min-h-96 place-items-center text-sm font-semibold text-[color:var(--text-muted)]">
              Cargando progreso...
            </div>
          ) : (
            <section className="min-w-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedId("");
                  onSelectCoachAthlete(null);
                }}
                className="mb-3 inline-flex h-10 items-center gap-2 text-xs font-black uppercase text-[color:var(--text-muted)] lg:hidden"
              >
                <ArrowLeft className="h-4 w-4" /> Atletas
              </button>
              <div className="border-b border-[color:var(--border)] pb-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-[#ff5722] text-lg font-black text-white dark:rounded-[3px] dark:bg-[#e2ff00] dark:text-black">
                    {initials(overview.athlete.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase text-[#ae3512] dark:text-[#e2ff00]">
                      {overview.athlete.profile?.goal || "Objetivo sin definir"}
                    </p>
                    <h2 className="mt-1 truncate text-[24px] font-black uppercase leading-none sm:text-[28px]">
                      {overview.athlete.name}
                    </h2>
                    <p className="mt-1 truncate text-xs font-semibold text-[color:var(--text-muted)]">
                      {overview.athlete.email}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                  <Button
                    className="col-span-2 h-12 gap-2 rounded-md text-xs font-black uppercase dark:rounded-[3px] sm:col-span-1"
                    disabled={
                      !trainableRoutines.length && !missingPlanRoutineCount
                    }
                    onClick={() => {
                      if (!trainableRoutines.length && missingPlanRoutineCount) {
                        setEditingPlan(activePlan);
                        return;
                      }
                      startTraining();
                    }}
                    title={
                      trainableRoutines.length
                        ? "Iniciar entrenamiento supervisado"
                        : missingPlanRoutineCount
                          ? "Completar las rutinas pendientes del plan"
                          : "Activa un plan o asigna una rutina adicional"
                    }
                  >
                    {trainableRoutines.length ? (
                      <Play className="h-4 w-4" />
                    ) : (
                      <Pencil className="h-4 w-4" />
                    )}
                    {trainableRoutines.length
                      ? recommendedPlanDay?.routineId
                        ? "Entrenar sesión de hoy"
                        : "Elegir entrenamiento"
                      : missingPlanRoutineCount
                        ? `Completar plan · ${missingPlanRoutineCount} pendientes`
                        : "Sin rutina disponible"}
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 gap-2 rounded-md text-xs font-black uppercase dark:rounded-[3px]"
                    onClick={() => setCreatingPlan(true)}
                  >
                    <CalendarPlus className="h-4 w-4" />
                    Nuevo plan
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 gap-2 rounded-md text-xs font-black uppercase dark:rounded-[3px]"
                    onClick={() => requireTemplates(() => setAssigning(true))}
                  >
                    <ClipboardList className="h-4 w-4" />
                    Rutina extra
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 border-b border-[color:var(--border)] py-4">
                <div>
                  <p className="text-2xl font-black">
                    {trainableRoutines.length}
                  </p>
                  <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                    Disponibles
                  </p>
                </div>
                <div className="border-x border-[color:var(--border)] px-3">
                  <p className="text-2xl font-black">
                    {overview.metrics.sessions}
                  </p>
                  <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                    Últ. 12 sesiones
                  </p>
                </div>
                <div className="pl-3">
                  <p className="truncate text-xl font-black sm:text-2xl">
                    {formatMetricVolume(overview.metrics.recentVolume)}
                  </p>
                  <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                    Vol. últimas 12
                  </p>
                </div>
              </div>

              <div
                className="mt-4 grid grid-cols-3 border border-[color:var(--border)] bg-[color:var(--bg)] p-1"
                role="tablist"
                aria-label="Informacion del atleta"
              >
                {[
                  { id: "plan", label: "Plan", icon: CalendarDays },
                  { id: "routines", label: "Rutinas", icon: Dumbbell },
                  { id: "activity", label: "Actividad", icon: BarChart3 },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={athleteView === item.id}
                      onClick={() => setAthleteView(item.id)}
                      className={`flex h-10 items-center justify-center gap-2 text-[11px] font-black uppercase ${
                        athleteView === item.id
                          ? "bg-[#ff5722] text-white dark:bg-[#e2ff00] dark:text-black"
                          : "text-[color:var(--text-muted)]"
                      }`}
                    >
                      <Icon className="h-4 w-4" /> {item.label}
                    </button>
                  );
                })}
              </div>

              {athleteView === "plan" ? (
                <>
              {(overview.plans || []).length > 1 ? (
                <section className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                      Planificaciones del atleta
                    </p>
                    <span className="text-xs font-black">
                      {overview.plans.length}
                    </span>
                  </div>
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {overview.plans.map((plan) => {
                      const id = String(plan._id || plan.id);
                      const selected =
                        id === String(activePlan?._id || activePlan?.id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSelectedPlanId(id)}
                          className={`min-w-40 shrink-0 border px-3 py-2 text-left transition ${
                            selected
                              ? "border-[#ff5722] bg-[#fff0eb] dark:border-[#e2ff00] dark:bg-[#e2ff00]/10"
                              : "border-[color:var(--border)] bg-[color:var(--card)]"
                          }`}
                        >
                          <span className="block truncate text-xs font-black uppercase">
                            {plan.name}
                          </span>
                          <span className="mt-1 block text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                            {plan.status === "active"
                              ? "Activo"
                              : plan.status === "draft"
                                ? "Borrador"
                                : plan.status === "scheduled"
                                  ? "Programado"
                                  : plan.status === "completed"
                                    ? "Finalizado"
                                    : "Pausado"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}

              {activePlan ? (
                <section className="mt-7 border-y border-[color:var(--border)] py-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                          Detalle del plan seleccionado
                        </p>
                        <span className="border border-[#ff5722] px-1.5 py-0.5 text-[9px] font-black uppercase text-[#ae3512] dark:border-[#e2ff00] dark:text-[#e2ff00]">
                          {PLAN_STATUS_LABELS[activePlan.status] || activePlan.status}
                        </span>
                      </div>
                      <h3 className="mt-1 text-lg font-black">
                        {activePlan.name}
                      </h3>
                      <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
                        {formatDate(activePlan.startDate)} al{" "}
                        {formatDate(activePlan.endDate)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                        {activePlan.durationWeeks} semanas ·{" "}
                        {LEVEL_LABELS[activePlan.level] || activePlan.level} ·{" "}
                        {activePlan.goal}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="theme-accent-text text-xs font-black">
                        {activePlanTrainingDays.length - missingPlanRoutineCount}/
                        {activePlanTrainingDays.length} rutinas
                      </span>
                      {!["completed", "cancelled"].includes(activePlan.status) ? (
                        <button
                          type="button"
                          onClick={() => setEditingPlan(activePlan)}
                          title="Editar plan"
                          aria-label="Editar plan"
                          className="grid h-10 w-10 place-items-center rounded-md border border-[color:var(--border)] theme-accent-text dark:rounded-[3px]"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      ) : null}
                      {["draft", "paused"].includes(activePlan.status) ? (
                        <button
                          type="button"
                          disabled={missingPlanRoutineCount > 0}
                          onClick={() => updatePlanStatus(activePlan, "active")}
                          title={
                            missingPlanRoutineCount
                              ? "Completa las rutinas pendientes antes de activar"
                              : "Activar plan"
                          }
                          aria-label="Activar plan"
                          className="theme-accent-solid grid h-10 w-10 place-items-center border-0 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      ) : null}
                      {["active", "scheduled"].includes(activePlan.status) ? (
                        <button
                          type="button"
                          onClick={() => updatePlanStatus(activePlan, "paused")}
                          title="Pausar plan"
                          aria-label="Pausar plan"
                          className="grid h-10 w-10 place-items-center rounded-md border border-[color:var(--border)] text-[color:var(--text-muted)] dark:rounded-[3px]"
                        >
                          <PauseCircle className="h-4 w-4" />
                        </button>
                      ) : null}
                      {activePlan.status === "active" ? (
                        <button
                          type="button"
                          onClick={() =>
                            updatePlanStatus(activePlan, "completed")
                          }
                          title="Finalizar plan"
                          aria-label="Finalizar plan"
                          className="grid h-10 w-10 place-items-center rounded-md border border-[color:var(--border)] text-emerald-600 dark:rounded-[3px]"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      ) : null}
                      {["draft", "scheduled", "paused"].includes(
                        activePlan.status,
                      ) ? (
                        <button
                          type="button"
                          disabled={Boolean(planActionId)}
                          onClick={() => removeCoachPlan(activePlan)}
                          title={
                            activePlan.status === "draft"
                              ? "Eliminar borrador"
                              : "Archivar plan"
                          }
                          aria-label={
                            activePlan.status === "draft"
                              ? "Eliminar borrador"
                              : "Archivar plan"
                          }
                          className="grid h-10 w-10 place-items-center rounded-md border border-red-200 text-red-600 disabled:opacity-50 dark:rounded-[3px] dark:border-red-500/40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {activePlanTrainingDays.length ? (
                    <div className="mt-4">
                      <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                        <span>Configuración del plan</span>
                        <span>
                          {missingPlanRoutineCount
                            ? `${missingPlanRoutineCount} pendientes`
                            : "Completo"}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden bg-[color:var(--border)]">
                        <div
                          className="h-full bg-[#ff5722] transition-all dark:bg-[#e2ff00]"
                          style={{
                            width: `${Math.round(
                              ((activePlanTrainingDays.length -
                                missingPlanRoutineCount) /
                                activePlanTrainingDays.length) *
                                100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : null}
                  <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden border border-[color:var(--border)] bg-[color:var(--border)] sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                    {(activePlan.weeklySchedule || []).map((day, index) => (
                      <div
                        key={day.dayIndex}
                        className={`${day.type === "training" ? "min-h-20" : "min-h-16"} ${index === (activePlan.weeklySchedule || []).length - 1 && (activePlan.weeklySchedule || []).length % 2 ? "col-span-2 sm:col-span-1" : ""} bg-[color:var(--card)] p-3`}
                      >
                        <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                          {activePlan.scheduleMode !== "fixed"
                            ? `Bloque ${index + 1}`
                            : DAY_NAMES[index]}
                        </p>
                        <p
                          className={`mt-2 text-xs font-black ${day.type === "training" ? "text-[color:var(--text)]" : "text-[color:var(--text-muted)]"}`}
                        >
                          {day.type === "rest"
                            ? "Descanso"
                            : day.type === "recovery"
                              ? "Recuperacion"
                              : day.focus || "Entrenamiento"}
                        </p>
                        {day.routineId &&
                        routineNameById.get(String(day.routineId)) ? (
                          <p className="mt-1 line-clamp-2 text-[10px] font-semibold text-[color:var(--text-muted)]">
                            {routineNameById.get(String(day.routineId))}
                          </p>
                        ) : day.type === "training" ? (
                          <p className="mt-1 text-[10px] font-bold text-amber-600 dark:text-amber-300">
                            Rutina pendiente
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  {activePlan.notes ? (
                    <p className="mt-3 text-xs font-semibold text-[color:var(--text-muted)]">
                      {activePlan.notes}
                    </p>
                  ) : null}
                </section>
              ) : (
                <section className="mt-7 flex flex-col gap-3 border-y border-[color:var(--border)] py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-black">Sin plan activo</h3>
                    <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                      Organiza semanas, descansos y rutinas en una sola
                      planificacion.
                    </p>
                  </div>
                  <Button
                    className="h-11 rounded-md text-xs font-black uppercase dark:rounded-[3px]"
                    onClick={() => setCreatingPlan(true)}
                  >
                    <CalendarPlus className="h-4 w-4" /> Crear plan
                  </Button>
                </section>
              )}

                </>
              ) : null}

              <div className="mt-6">
                {athleteView === "routines" ? (
                <section>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-base font-black">
                      <Dumbbell className="theme-accent-text h-5 w-5" />
                      Rutinas asignadas
                    </h3>
                    <span className="text-xs font-bold text-[color:var(--text-muted)]">
                      {overview.routines.length}
                    </span>
                  </div>
                  <div className="mt-3 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
                    {orderedAthleteRoutines.length ? (
                      orderedAthleteRoutines.map((routine) => {
                        const id = String(routine._id || routine.id);
                        const expanded = expandedRoutineId === id;
                        const available =
                          routine.isAvailableForTraining !== false &&
                          routine.isArchived !== true;
                        const canManageRoutine =
                          String(routine.assignedByCoachId || "") ===
                          String(user?.id || user?._id || "");
                        return (
                          <article key={id} className="py-1">
                            <div className="flex items-center gap-2 py-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedRoutineId(expanded ? "" : id)
                                }
                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                aria-expanded={expanded}
                              >
                                <span className={`grid h-10 w-10 shrink-0 place-items-center border ${available ? "border-[#ff5722] text-[#b53612] dark:border-[#e2ff00] dark:text-[#e2ff00]" : "border-[color:var(--border)] text-[color:var(--text-muted)]"}`}>
                                  <Dumbbell className="h-4 w-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-black uppercase">
                                    {routine.name}
                                  </span>
                                  <span className="mt-1 block text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                                    {(routine.exercises || []).length} ejercicios ·{" "}
                                    {available
                                      ? routine.assignmentType === "extra"
                                        ? "Adicional"
                                        : "Disponible"
                                      : routine.trainingPlanId &&
                                          planStatusById.get(
                                            String(routine.trainingPlanId),
                                          ) === "completed"
                                        ? "Historial"
                                        : "En preparacion"}
                                  </span>
                                </span>
                                <ChevronRight
                                  className={`h-4 w-4 shrink-0 transition ${expanded ? "rotate-90" : ""}`}
                                />
                              </button>
                              {canManageRoutine ? (
                              <details className="relative shrink-0">
                                <summary
                                  className="grid h-11 w-11 cursor-pointer list-none place-items-center text-[color:var(--text-muted)] [&::-webkit-details-marker]:hidden"
                                  aria-label={`Opciones de ${routine.name}`}
                                >
                                  <MoreVertical className="h-5 w-5" />
                                </summary>
                                <div className="absolute right-0 top-11 z-30 w-44 overflow-hidden border border-[color:var(--border)] bg-[color:var(--card)] p-1 shadow-xl">
                                  <button
                                    type="button"
                                    disabled={Boolean(routineActionId)}
                                    onClick={(event) => {
                                      event.currentTarget
                                        .closest("details")
                                        ?.removeAttribute("open");
                                      duplicateAssignedRoutine(routine);
                                    }}
                                    className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm font-bold hover:bg-[color:var(--bg)] disabled:opacity-50"
                                  >
                                    <Copy className="h-4 w-4" />
                                    {routineActionId === id
                                      ? "Procesando..."
                                      : "Duplicar"}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={Boolean(routineActionId)}
                                    onClick={(event) => {
                                      event.currentTarget
                                        .closest("details")
                                        ?.removeAttribute("open");
                                      deleteAssignedRoutine(routine);
                                    }}
                                    className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
                                  >
                                    <Trash2 className="h-4 w-4" /> Eliminar
                                  </button>
                                </div>
                              </details>
                              ) : null}
                            </div>
                            {expanded ? (
                              <div className="mb-2 ml-12 border-l border-[color:var(--border)] pl-3">
                                {(routine.exercises || []).map((exercise, index) => (
                                  <div
                                    key={`${exercise.exerciseId || exercise.name}-${index}`}
                                    className="flex min-h-10 items-center justify-between gap-3 border-b border-[color:var(--border)] py-2 last:border-0"
                                  >
                                    <span className="min-w-0 truncate text-xs font-bold">
                                      {index + 1}. {exercise.name}
                                    </span>
                                    <span className="shrink-0 text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                                      {exercise.sets || 0} series
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </article>
                        );
                      })
                    ) : (
                      <p className="py-6 text-sm font-semibold text-[color:var(--text-muted)]">
                        Asigna una rutina antes de iniciar el entrenamiento.
                      </p>
                    )}
                  </div>
                </section>
                ) : null}

                {athleteView === "activity" ? (
                <section>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-base font-black">
                      <Activity className="theme-accent-text h-5 w-5" />
                      Actividad reciente
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCoachAthlete({
                          id: selectedId,
                          name: selectedAthlete.name,
                          email: selectedAthlete.email,
                        });
                        onNavigate("admin_sesiones");
                      }}
                      className="inline-flex h-10 items-center gap-2 border border-[color:var(--border)] px-3 text-xs font-black uppercase"
                    >
                      <CalendarDays className="h-4 w-4" /> Historial completo
                    </button>
                  </div>
                  <div className="mt-3 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
                    {overview.recentTrainings.length ? (
                      overview.recentTrainings.slice(0, 6).map((training) => (
                        <div
                          key={training._id || training.id}
                          className="flex items-center justify-between gap-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black">
                              {training.routineName || "Entrenamiento"}
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-[color:var(--text-muted)]">
                              {formatDate(training.date)}
                              {training.sessionType === "supervised"
                                ? " · Supervisada"
                                : ""}
                            </p>
                            <p className="mt-1 text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                              {(training.exercises || []).length} ejercicios ·{" "}
                              {formatDuration(training.durationSeconds)}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-black text-[color:var(--text-muted)]">
                            {formatVolume(training.totalVolume)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="py-6 text-sm font-semibold text-[color:var(--text-muted)]">
                        Todavía no hay sesiones registradas.
                      </p>
                    )}
                  </div>
                </section>
                ) : null}
              </div>
            </section>
          )}
        </div>
      )}

      {assigning && selectedAthlete ? (
        <AssignRoutineModal
          athlete={selectedAthlete}
          templates={templates}
          onAssign={assignRoutine}
          onClose={() => setAssigning(false)}
        />
      ) : null}
      {(creatingPlan || editingPlan) && selectedAthlete ? (
        <CoachPlanModal
          athlete={selectedAthlete}
          templates={templates}
          planTemplates={planTemplates}
          initialData={editingPlan}
          replacingPlan={editingPlan ? null : activePlan}
          onSave={savePlan}
          onClose={() => {
            setCreatingPlan(false);
            setEditingPlan(null);
          }}
        />
      ) : null}
    </main>
  );
}
