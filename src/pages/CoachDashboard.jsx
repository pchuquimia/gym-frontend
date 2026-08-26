import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  AlertTriangle,
  BarChart3,
  CalendarPlus,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Copy,
  FileText,
  Link2,
  PauseCircle,
  Pencil,
  Play,
  MoreVertical,
  Search,
  Sparkles,
  Target,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import Badge from "../components/ui/badge";
import Button from "../components/ui/button";
import OperationLoader from "../components/system/OperationLoader";
import PremiumGate from "../components/shared/PremiumGate";
import CoachPlanModal from "../components/coach/CoachPlanModal";
import { SessionHistory } from "./TrainingAdmin";
import { useAuth } from "../context/AuthContext";
import { useRoutines } from "../context/RoutineContext";
import { api } from "../services/api";
import {
  canAccessActiveTraining,
  readActiveTrainingSnapshot,
} from "../utils/activeTraining";
import { hasPremiumFeature, PREMIUM_FEATURES } from "../utils/premium";

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

const getPlanEndDate = (plan) => {
  if (plan?.endDate) return plan.endDate;
  if (!plan?.startDate) return "";
  const end = new Date(plan.startDate);
  end.setUTCDate(end.getUTCDate() + Number(plan.durationWeeks || 1) * 7 - 1);
  return end;
};
const getPlanTimeProgress = (plan, now = new Date()) => {
  if (!plan?.startDate) {
    return { percentage: 0, message: "Sin fecha de inicio" };
  }
  const start = new Date(plan.startDate);
  const end = new Date(getPlanEndDate(plan));
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);
  const endExclusive = new Date(end);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  const totalMs = Math.max(1, endExclusive.getTime() - start.getTime());
  const elapsedMs = Math.min(
    totalMs,
    Math.max(0, now.getTime() - start.getTime()),
  );
  const percentage = Math.round((elapsedMs / totalMs) * 100);

  if (now < start) {
    const days = Math.max(
      1,
      Math.ceil((start.getTime() - now.getTime()) / 86400000),
    );
    return {
      percentage,
      message: `Comienza en ${days} ${days === 1 ? "dia" : "dias"}`,
    };
  }
  if (now >= endExclusive) {
    return { percentage: 100, message: "Periodo finalizado" };
  }
  const days = Math.max(
    1,
    Math.ceil((endExclusive.getTime() - now.getTime()) / 86400000),
  );
  return {
    percentage,
    message: `${days} ${days === 1 ? "dia restante" : "dias restantes"}`,
  };
};
const DAY_NAMES = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const PLAN_STATUS_LABELS = {
  active: "En curso",
  scheduled: "Programado",
  draft: "Inactiva",
  paused: "Desactivada",
  completed: "Finalizado",
  cancelled: "Archivado",
};

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A";

function AthleteRow({ athlete, selected, blocked = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={blocked}
      className={`flex min-h-[72px] w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition dark:rounded-[3px] ${
        selected
          ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--accent-contrast)]"
          : blocked
            ? "cursor-not-allowed border-transparent opacity-45"
            : "border-transparent hover:border-[color:var(--border)] hover:bg-[color:var(--bg)]"
      }`}
    >
      <span
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-md text-sm font-black dark:rounded-[3px] ${
          selected
            ? "border border-current bg-transparent text-current"
            : "bg-[#ff5722] text-white dark:bg-[#e2ff00] dark:text-black"
        }`}
      >
        {initials(athlete.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={`block min-w-0 flex-1 truncate text-sm font-black ${
              selected ? "text-current" : "text-[color:var(--text)]"
            }`}
          >
            {athlete.name}
          </span>
          {athlete.priority === "high" ? (
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-red-500"
              title="Requiere atencion"
            />
          ) : athlete.priority === "medium" ? (
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-amber-400"
              title="Revisar seguimiento"
            />
          ) : null}
        </span>
        <span
          className={`mt-0.5 block truncate text-xs font-semibold ${
            selected ? "text-current/80" : "text-[color:var(--text-muted)]"
          }`}
        >
          {athlete.trainingCount
            ? `Ultima sesion ${formatDate(athlete.lastTraining?.date)}`
            : "Sin sesiones registradas"}
        </span>
      </span>
      <ChevronRight
        className={`h-4 w-4 shrink-0 ${
          selected ? "text-current" : "text-[color:var(--text-muted)]"
        }`}
      />
    </button>
  );
}

function PortfolioOverview({ portfolio, onSelectAthlete }) {
  const summary = portfolio?.summary || {};
  const alerts = portfolio?.alerts || [];
  const metrics = [
    ["Atletas", summary.athletes || 0, Users],
    ["Requieren atencion", summary.attention || 0, AlertTriangle],
    ["Sesiones esta semana", summary.sessionsThisWeek || 0, BarChart3],
    ["Adherencia global", `${summary.adherence || 0}%`, Target],
  ];
  return (
    <section className="min-w-0 space-y-5">
      <div>
        <p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
          Coach Pro
        </p>
        <h2 className="mt-1 text-2xl font-black uppercase">
          Centro de control
        </h2>
        <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">
          Prioridades calculadas con actividad, planificacion y recuperacion
          reciente.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        {metrics.map(([label, value, Icon]) => (
          <article
            key={label}
            className="border border-[color:var(--border)] bg-[color:var(--card)] p-4"
          >
            <Icon className="h-4 w-4 text-[#ff5722] dark:text-[#e2ff00]" />
            <p className="mt-4 text-2xl font-black">{value}</p>
            <p className="mt-1 text-[10px] font-black uppercase text-[color:var(--text-muted)]">
              {label}
            </p>
          </article>
        ))}
      </div>
      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="text-sm font-black uppercase">Alertas prioritarias</h3>
          <span className="text-xs font-black text-[color:var(--text-muted)]">
            {alerts.length}
          </span>
        </div>
        <div className="divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
          {alerts.length ? (
            alerts.slice(0, 8).map((alert, index) => (
              <button
                key={`${alert.athleteId}-${alert.code}-${index}`}
                type="button"
                onClick={() => onSelectAthlete(alert.athleteId)}
                className="grid min-h-16 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-2 py-3 text-left hover:bg-[color:var(--card)] sm:px-3"
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${alert.severity === "high" ? "bg-red-500" : "bg-amber-400"}`}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">
                    {alert.athleteName}
                  </span>
                  <span className="mt-0.5 block truncate text-xs font-semibold text-[color:var(--text-muted)]">
                    {alert.title}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-[color:var(--text-muted)]" />
              </button>
            ))
          ) : (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500" />
              <p className="mt-2 text-sm font-black">Todo bajo control</p>
              <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                No hay alertas que requieran intervencion.
              </p>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}

function WeeklyReportPanel({
  report,
  loading,
  onRefresh,
  onCopy,
  onGenerateDraft,
  draftLoading,
}) {
  if (loading)
    return (
      <OperationLoader
        active
        delayMs={0}
        mode="inline"
        title="Generando informe"
        description="Comparando adherencia, carga y recuperacion."
      />
    );
  if (!report)
    return (
      <section className="border-y border-[color:var(--border)] py-10 text-center">
        <FileText className="mx-auto h-8 w-8 text-[color:var(--text-muted)]" />
        <p className="mt-3 text-sm font-black">Informe aun no generado</p>
        <Button onClick={onRefresh} className="mt-4">
          Generar informe
        </Button>
      </section>
    );
  const metrics = [
    [
      "Adherencia",
      `${report.adherence.percentage}%`,
      `${report.adherence.completed}/${report.adherence.target} sesiones`,
    ],
    [
      "Volumen",
      `${Math.round(report.current.volume).toLocaleString("es-BO")} kg`,
      `${report.comparison.volumePercent >= 0 ? "+" : ""}${report.comparison.volumePercent}% vs anterior`,
    ],
    [
      "Series",
      report.current.sets,
      `${report.comparison.setsPercent >= 0 ? "+" : ""}${report.comparison.setsPercent}% vs anterior`,
    ],
    [
      "Recuperacion",
      report.readiness?.score ?? "--",
      report.readiness ? "ultimo check-in" : "sin check-in",
    ],
  ];
  return (
    <section className="mt-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
            Informe semanal
          </p>
          <h3 className="mt-1 text-xl font-black uppercase">
            {report.period.from} al {report.period.to}
          </h3>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCopy}>
            <Copy className="mr-2 h-3.5 w-3.5" />
            Copiar
          </Button>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Actualizar
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {metrics.map(([label, value, detail]) => (
          <article
            key={label}
            className="border border-[color:var(--border)] bg-[color:var(--card)] p-3"
          >
            <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
              {label}
            </p>
            <p className="mt-2 text-xl font-black">{value}</p>
            <p className="mt-1 text-[10px] font-semibold text-[color:var(--text-muted)]">
              {detail}
            </p>
          </article>
        ))}
      </div>
      <article className="border-l-4 border-[color:var(--accent)] bg-[color:var(--accent)] p-4 text-[color:var(--accent-contrast)]">
        <p className="text-[10px] font-black uppercase text-current/75">
          Recomendacion
        </p>
        <p className="mt-2 text-sm font-bold">{report.recommendation}</p>
      </article>
      {report.alerts.length ? (
        <div className="divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
          {report.alerts.map((alert) => (
            <div key={alert.code} className="flex gap-3 py-3">
              <AlertTriangle
                className={`mt-0.5 h-4 w-4 shrink-0 ${alert.severity === "high" ? "text-red-500" : "text-amber-500"}`}
              />
              <div>
                <p className="text-sm font-black">{alert.title}</p>
                <p className="mt-0.5 text-xs font-semibold text-[color:var(--text-muted)]">
                  {alert.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <Button
        onClick={onGenerateDraft}
        disabled={draftLoading}
        className="h-12 w-full gap-2 text-xs font-black uppercase sm:w-auto"
      >
        <Sparkles className="h-4 w-4" />
        {draftLoading ? "Preparando borrador..." : "Crear borrador asistido"}
      </Button>
    </section>
  );
}

export default function CoachDashboard({
  onNavigate = () => {},
  onSelectCoachAthlete = () => {},
  coachAthlete = null,
}) {
  const { user } = useAuth();
  const canUsePortfolio = hasPremiumFeature(
    user,
    PREMIUM_FEATURES.COACH_PORTFOLIO,
  );
  const canUseReports = hasPremiumFeature(
    user,
    PREMIUM_FEATURES.WEEKLY_REPORTS,
  );
  const canUseAssistedPlans = hasPremiumFeature(
    user,
    PREMIUM_FEATURES.ASSISTED_PLANS,
  );
  const { routines: availableRoutines } = useRoutines();
  const [planCatalog, setPlanCatalog] = useState({ plans: [], routines: [] });
  const templates = useMemo(() => {
    const userId = String(user?.id || user?._id || "");
    const candidates = [
      ...availableRoutines.filter((routine) => {
        if (user?.role === "Admin") {
          return String(routine.ownerId || userId) === userId;
        }
        return (
          routine.kind === "template" ||
          (!routine.kind &&
            !routine.trainingPlanId &&
            !routine.assignedByCoachId)
        );
      }),
      ...(planCatalog.routines || []),
    ];
    return [
      ...new Map(
        candidates.map((routine) => [
          String(routine.id || routine._id),
          routine,
        ]),
      ).values(),
    ];
  }, [availableRoutines, planCatalog.routines, user]);
  const [athletes, setAthletes] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const activeSession = useMemo(() => {
    const snapshot = readActiveTrainingSnapshot();
    return canAccessActiveTraining(snapshot, user, coachAthlete)
      ? snapshot
      : null;
  }, [coachAthlete, user]);
  const activeAthleteId = String(activeSession?.ownerId || "");
  const [selectedId, setSelectedId] = useState(
    activeSession ? activeAthleteId : "",
  );
  const [overview, setOverview] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [planActionId, setPlanActionId] = useState("");
  const [athleteView, setAthleteView] = useState("plan");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [linkInfo, setLinkInfo] = useState({ coachCode: "", athleteCount: 0 });
  const [linkCodeLoading, setLinkCodeLoading] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [planDraft, setPlanDraft] = useState(null);

  const loadAthletes = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) setLoading(true);
        if (canUsePortfolio) {
          const data = await api.getCoachPortfolio();
          setPortfolio(data);
          setAthletes(Array.isArray(data?.athletes) ? data.athletes : []);
        } else {
          setPortfolio(null);
          setAthletes(await api.getCoachAthletes());
        }
      } catch (err) {
        toast.error(err.message || "No se pudieron cargar los atletas");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [canUsePortfolio],
  );

  useEffect(() => {
    loadAthletes();
    api
      .getCoachLinkCode()
      .then(setLinkInfo)
      .catch((err) =>
        toast.error(err.message || "No se pudo cargar tu código de coach"),
      )
      .finally(() => setLinkCodeLoading(false));
    if (user?.role === "Admin") {
      api
        .getCoachPlanCatalog()
        .then((catalog) =>
          setPlanCatalog({
            plans: Array.isArray(catalog?.plans) ? catalog.plans : [],
            routines: Array.isArray(catalog?.routines) ? catalog.routines : [],
          }),
        )
        .catch((err) =>
          toast.error(
            err.message || "No se pudo cargar tu catálogo de planificaciones",
          ),
        );
    } else {
      setPlanCatalog({ plans: [], routines: [] });
    }
  }, [loadAthletes, user?.role]);

  const copyCoachCode = async () => {
    if (!linkInfo.coachCode) return;
    try {
      await navigator.clipboard.writeText(linkInfo.coachCode);
      toast.success("Código copiado", {
        description:
          "Compártelo con el atleta para que se vincule desde Perfil.",
      });
    } catch {
      toast.error("No se pudo copiar el código");
    }
  };

  const regenerateCoachCode = async () => {
    if (
      !window.confirm(
        "El código anterior dejará de funcionar. Los atletas ya vinculados no se verán afectados.",
      )
    ) {
      return;
    }
    try {
      setLinkCodeLoading(true);
      const data = await api.regenerateCoachLinkCode();
      setLinkInfo((current) => ({ ...current, coachCode: data.coachCode }));
      toast.success("Código renovado");
    } catch (err) {
      toast.error(err.message || "No se pudo renovar el código");
    } finally {
      setLinkCodeLoading(false);
    }
  };

  const releaseAthlete = async () => {
    if (!selectedAthlete || activeSession) return;
    if (
      !window.confirm(
        `${selectedAthlete.name} volverá al modo independiente. Sus datos y rutinas se conservarán.`,
      )
    ) {
      return;
    }
    try {
      await api.releaseCoachAthlete(selectedId);
      setSelectedId("");
      setOverview(null);
      onSelectCoachAthlete(null);
      await loadAthletes({ silent: true });
      setLinkInfo((current) => ({
        ...current,
        athleteCount: Math.max(0, Number(current.athleteCount || 0) - 1),
      }));
      toast.success("Atleta desvinculado");
    } catch (err) {
      toast.error(err.message || "No se pudo desvincular al atleta");
    }
  };

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
      setWeeklyReport(null);
      return;
    }
    setAthleteView("plan");
    setSelectedPlanId("");
    setWeeklyReport(null);
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
  }, [loadAthletes, onSelectCoachAthlete, selectedId]);

  useEffect(() => {
    if (
      !canUseReports ||
      athleteView !== "insights" ||
      !selectedId ||
      weeklyReport
    )
      return;
    let active = true;
    setReportLoading(true);
    api
      .getCoachWeeklyReport(selectedId)
      .then((data) => active && setWeeklyReport(data))
      .catch(
        (err) =>
          active && toast.error(err.message || "No se pudo generar el informe"),
      )
      .finally(() => active && setReportLoading(false));
    return () => {
      active = false;
    };
  }, [athleteView, canUseReports, selectedId, weeklyReport]);

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
  const selectedPlan = overview?.plans?.find(
    (plan) => String(plan._id || plan.id) === String(selectedPlanId),
  );
  const orderedPlans = [...(overview?.plans || [])].sort((a, b) => {
    const statusOrder = {
      active: 0,
      scheduled: 1,
      draft: 2,
      paused: 3,
      completed: 4,
      cancelled: 5,
    };
    return (
      (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99) ||
      new Date(b.startDate || 0).getTime() -
        new Date(a.startDate || 0).getTime()
    );
  });
  const activePlan =
    selectedPlan ||
    overview?.plans?.find((plan) => plan.status === "active") ||
    overview?.plans?.find((plan) => plan.status === "scheduled") ||
    overview?.plans?.find((plan) => plan.status === "draft") ||
    overview?.plans?.[0];
  const activePlanTimeProgress = activePlan
    ? getPlanTimeProgress(activePlan)
    : null;
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
      : (activeTrainingPlan.weeklySchedule || [])[
          Number(activeTrainingPlan.cycleProgress?.currentIndex || 0)
        ]
    : null;
  const routineNameById = new Map(
    (overview?.routines || []).map((routine) => [
      String(routine._id || routine.id),
      routine.name,
    ]),
  );
  const trainableRoutines = (overview?.routines || []).filter(
    (routine) =>
      routine.isAvailableForTraining !== false && routine.isArchived !== true,
  );

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
      setPlanDraft(null);
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
            : "Plan activado"
          : status === "completed"
            ? "Plan finalizado"
            : "Plan desactivado",
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
      ? `¿Eliminar definitivamente ${plan.name}? Sus rutinas sin historial también se eliminarán.`
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
          ? "Planificación eliminada"
          : "Plan archivado",
        {
          description:
            result.disposition === "deleted"
              ? "La planificación inactiva y sus rutinas asociadas fueron eliminadas."
              : "El historial registrado se mantiene disponible.",
        },
      );
    } catch (err) {
      toast.error(err.message || "No se pudo retirar el plan");
    } finally {
      setPlanActionId("");
    }
  };

  const startTraining = () => {
    if (!selectedAthlete || !trainableRoutines.length) return;
    const selected = onSelectCoachAthlete({
      id: selectedId,
      name: selectedAthlete.name,
      email: selectedAthlete.email,
    });
    if (selected === false) {
      toast.info("Ya existe una sesión supervisada en curso", {
        description: "Finalízala o cancélala antes de cambiar de atleta.",
      });
      return;
    }
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

  const refreshWeeklyReport = async () => {
    if (!selectedId) return;
    try {
      setReportLoading(true);
      setWeeklyReport(await api.getCoachWeeklyReport(selectedId));
    } catch (err) {
      toast.error(err.message || "No se pudo generar el informe");
    } finally {
      setReportLoading(false);
    }
  };

  const copyWeeklyReport = async () => {
    if (!weeklyReport) return;
    const text = [
      `Informe semanal - ${weeklyReport.athlete.name}`,
      `${weeklyReport.period.from} al ${weeklyReport.period.to}`,
      `Adherencia: ${weeklyReport.adherence.percentage}% (${weeklyReport.adherence.completed}/${weeklyReport.adherence.target})`,
      `Volumen: ${Math.round(weeklyReport.current.volume).toLocaleString("es-BO")} kg (${weeklyReport.comparison.volumePercent >= 0 ? "+" : ""}${weeklyReport.comparison.volumePercent}%)`,
      `Series: ${weeklyReport.current.sets}`,
      `Recomendacion: ${weeklyReport.recommendation}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Informe copiado");
    } catch {
      toast.error("No se pudo copiar el informe");
    }
  };

  const generatePlanDraft = async () => {
    if (!canUseAssistedPlans || !selectedId || draftLoading) return;
    try {
      setDraftLoading(true);
      const result = await api.generateCoachPlanDraft(
        selectedId,
        activeTrainingPlan?.frequencyTarget || 3,
      );
      setPlanDraft(result);
      setCreatingPlan(true);
      toast.success("Borrador preparado", {
        description:
          result.rationale?.[0] ||
          "Revisa y ajusta la propuesta antes de guardarla.",
      });
    } catch (err) {
      toast.error(err.message || "No se pudo preparar el borrador");
    } finally {
      setDraftLoading(false);
    }
  };

  return (
    <main className="dashboard-shell routines-shell mx-auto w-full max-w-[1440px] pb-24 text-[color:var(--text)] sm:pb-12">
      <header className="flex items-end justify-between gap-4 border-b border-[color:var(--border)] pb-4">
        <div>
          <p className="text-[10px] font-black uppercase text-[#ae3512] dark:text-[#e2ff00]">
            Coach · {athletes.length}{" "}
            {athletes.length === 1 ? "atleta" : "atletas"}
          </p>
          <h1 className="mt-1 text-[28px] font-black uppercase leading-none sm:text-[32px]">
            Mis atletas
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-11 gap-2 rounded-md px-3 text-xs font-black uppercase dark:rounded-[3px]"
            onClick={() => setInviteOpen((current) => !current)}
          >
            <Link2 className="h-4 w-4" />
            <span className="sm:hidden">Invitar</span>
            <span className="hidden sm:inline">Invitar atleta</span>
          </Button>
        </div>
      </header>

      {inviteOpen ? (
        <section className="mt-4 border border-[color:var(--accent)] bg-[color:var(--accent)] p-4 text-[color:var(--accent-contrast)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-current">
                Código de vinculación
              </p>
              <p className="mt-1 text-[13px] font-semibold text-current/80">
                El atleta crea su cuenta básica y luego introduce este código
                desde Perfil.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <code className="min-w-36 border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-center text-sm font-black tracking-[0.08em]">
                {linkCodeLoading ? "CARGANDO" : linkInfo.coachCode}
              </code>
              <button
                type="button"
                onClick={copyCoachCode}
                disabled={linkCodeLoading || !linkInfo.coachCode}
                className="grid h-10 w-10 place-items-center border border-[color:var(--border)] bg-[color:var(--card)] disabled:opacity-50"
                aria-label="Copiar código"
                title="Copiar código"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={regenerateCoachCode}
                disabled={linkCodeLoading}
                className="h-10 border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-xs font-black uppercase disabled:opacity-50"
              >
                Renovar
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {loading ? (
        <div className="min-h-72 border-y border-[color:var(--border)]">
          <OperationLoader
            active
            delayMs={0}
            mode="inline"
            title="Cargando atletas"
            description="Sincronizando atletas vinculados y asignaciones."
          />
        </div>
      ) : !athletes.length ? (
        <section className="grid min-h-96 place-items-center text-center">
          <div className="max-w-sm">
            <Users className="theme-accent-text mx-auto h-10 w-10" />
            <h2 className="mt-4 text-xl font-black">Aún no tienes atletas</h2>
            <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">
              Comparte tu código. El atleta decide vincularse desde su perfil y
              aparecerá aquí automáticamente.
            </p>
            <Button className="mt-5 gap-2" onClick={() => setInviteOpen(true)}>
              <Link2 className="h-4 w-4" /> Ver código
            </Button>
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
              <span className="text-xs font-black">
                {filteredAthletes.length}
              </span>
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
                    blocked={
                      Boolean(activeAthleteId) && String(id) !== activeAthleteId
                    }
                    onClick={() => {
                      if (activeAthleteId && String(id) !== activeAthleteId) {
                        toast.info("Hay una sesión supervisada en curso", {
                          description:
                            "Finalízala o cancélala antes de abrir otro atleta.",
                        });
                        return;
                      }
                      setSelectedId(id);
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
            canUsePortfolio ? (
              <PortfolioOverview
                portfolio={portfolio}
                onSelectAthlete={setSelectedId}
              />
            ) : (
              <PremiumGate
                plan="Coach Pro"
                title="Centro de control premium"
                description="Prioriza atletas, revisa adherencia y recibe alertas automaticas desde una sola vista."
                onNavigate={onNavigate}
              />
            )
          ) : loadingOverview || !overview ? (
            <div className="min-h-96 border-y border-[color:var(--border)]">
              <OperationLoader
                active
                delayMs={0}
                mode="inline"
                title="Cargando progreso"
                description="Consultando planificacion, actividad y metricas del atleta."
              />
            </div>
          ) : (
            <section className="min-w-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedId("");
                  if (!activeSession) onSelectCoachAthlete(null);
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
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase text-[#ae3512] dark:text-[#e2ff00]">
                      {overview.athlete.profile?.goal || "Objetivo sin definir"}
                    </p>
                    <h2 className="mt-1 line-clamp-2 break-words text-[22px] font-black uppercase leading-none sm:text-[28px]">
                      {overview.athlete.name}
                    </h2>
                    <p className="mt-1 truncate text-xs font-semibold text-[color:var(--text-muted)]">
                      {overview.athlete.email}
                    </p>
                  </div>
                  <details className="relative shrink-0 self-center">
                    <summary
                      className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-md border border-[color:var(--border)] text-[color:var(--text-muted)] [&::-webkit-details-marker]:hidden dark:rounded-[3px]"
                      aria-label="Opciones del atleta"
                      title="Opciones del atleta"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </summary>
                    <div className="absolute right-0 top-12 z-30 w-56 border border-[color:var(--border)] bg-[color:var(--card)] p-1 shadow-xl">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.currentTarget
                            .closest("details")
                            ?.removeAttribute("open");
                          releaseAthlete();
                        }}
                        disabled={Boolean(activeSession)}
                        className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-300 dark:hover:bg-red-500/10"
                        title={
                          activeSession
                            ? "Finaliza la sesión supervisada antes de desvincular"
                            : "Quitar atleta de mi cartera"
                        }
                      >
                        <UserMinus className="h-4 w-4" />
                        Desvincular atleta
                      </button>
                    </div>
                  </details>
                </div>
                {trainableRoutines.length || missingPlanRoutineCount ? (
                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      className="h-12 min-w-0 flex-1 gap-2 rounded-md px-4 text-xs font-black uppercase dark:rounded-[3px] sm:max-w-sm"
                      onClick={() => {
                        if (
                          !trainableRoutines.length &&
                          missingPlanRoutineCount
                        ) {
                          setEditingPlan(activePlan);
                          return;
                        }
                        startTraining();
                      }}
                      title={
                        trainableRoutines.length
                          ? "Iniciar entrenamiento supervisado"
                          : "Completar las rutinas pendientes del plan"
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
                        : `Completar plan · ${missingPlanRoutineCount} pendientes`}
                    </Button>
                  </div>
                ) : null}
              </div>

              <div
                className="mt-4 grid grid-cols-3 border-b border-[color:var(--border)]"
                role="tablist"
                aria-label="Informacion del atleta"
              >
                {[
                  { id: "plan", label: "Planificación", icon: CalendarDays },
                  { id: "activity", label: "Actividad", icon: BarChart3 },
                  { id: "insights", label: "Seguimiento", icon: FileText },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={athleteView === item.id}
                      onClick={() => setAthleteView(item.id)}
                      className={`relative flex h-12 items-center justify-center gap-2 border-b-2 text-[11px] font-black uppercase transition ${
                        athleteView === item.id
                          ? "border-[#ff5722] text-[#b53612] dark:border-[#e2ff00] dark:text-[#e2ff00]"
                          : "border-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
                      }`}
                    >
                      <Icon className="h-4 w-4" /> {item.label}
                    </button>
                  );
                })}
              </div>

              {athleteView === "plan" ? (
                <>
                  <section className="mt-5 flex items-center justify-between gap-3 border-b border-[color:var(--border)] pb-3">
                    <div className="min-w-0">
                      <p className="theme-accent-text text-[11px] font-black uppercase">
                        {selectedPlanId
                          ? "Detalle de planificación"
                          : "Programas del atleta"}
                      </p>
                      <h3 className="mt-1 truncate text-xl font-black">
                        {selectedPlanId ? activePlan?.name : "Planificaciones"}
                      </h3>
                      {!selectedPlanId && orderedPlans.length ? (
                        <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                          {orderedPlans.length}{" "}
                          {orderedPlans.length === 1
                            ? "planificación"
                            : "planificaciones"}
                        </p>
                      ) : null}
                    </div>
                    {selectedPlanId ? (
                      <button
                        type="button"
                        onClick={() => setSelectedPlanId("")}
                        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-xs font-black uppercase dark:rounded-[3px]"
                      >
                        <ArrowLeft className="h-4 w-4" /> Todas
                      </button>
                    ) : (
                      <Button
                        className="h-11 shrink-0 gap-2 rounded-md px-3 text-xs font-black uppercase dark:rounded-[3px]"
                        onClick={() => setCreatingPlan(true)}
                      >
                        <CalendarPlus className="h-4 w-4" /> Nueva
                      </Button>
                    )}
                  </section>

                  {!selectedPlanId && orderedPlans.length ? (
                    <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {orderedPlans.map((plan) => {
                        const id = String(plan._id || plan.id);
                        const trainingDays = (plan.weeklySchedule || []).filter(
                          (day) => day.type === "training",
                        );
                        const configured = trainingDays.filter(
                          (day) => day.routineId,
                        ).length;
                        const isCurrent = plan.status === "active";
                        const progress = getPlanTimeProgress(plan);
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setSelectedPlanId(id)}
                            className={`routines-surface min-h-40 border bg-[color:var(--card)] p-4 text-left transition hover:border-[color:var(--text-muted)] ${
                              isCurrent
                                ? "border-[#ff5722] dark:border-[#e2ff00]"
                                : "border-[color:var(--border)]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <Badge
                                variant={isCurrent ? "active" : plan.status}
                              >
                                {PLAN_STATUS_LABELS[plan.status] || plan.status}
                              </Badge>
                              <ChevronRight className="h-5 w-5 text-[color:var(--text-muted)]" />
                            </div>
                            <h4 className="mt-4 line-clamp-2 text-lg font-black leading-tight">
                              {plan.name}
                            </h4>
                            <p className="mt-2 text-xs font-semibold text-[color:var(--text-muted)]">
                              {plan.scheduleMode === "fixed"
                                ? "Rutina semanal fija"
                                : `Ciclo libre · ${plan.weeklySchedule?.length || 0} días`}
                            </p>
                            <div className="mt-4">
                              <div className="flex items-center justify-between text-[11px] font-black uppercase">
                                <span className="text-[color:var(--text-muted)]">
                                  Progreso
                                </span>
                                <span
                                  className={
                                    isCurrent ? "theme-accent-text" : ""
                                  }
                                >
                                  {progress.percentage}%
                                </span>
                              </div>
                              <div className="mt-1.5 h-1.5 overflow-hidden bg-[color:var(--border)]">
                                <div
                                  className={
                                    isCurrent
                                      ? "theme-accent-solid h-full border-0"
                                      : "h-full bg-[color:var(--text-muted)]"
                                  }
                                  style={{ width: `${progress.percentage}%` }}
                                />
                              </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between border-t border-[color:var(--border)] pt-3 text-xs font-black">
                              <span>{plan.durationWeeks} semanas</span>
                              <span
                                className={
                                  configured === trainingDays.length
                                    ? "theme-accent-text"
                                    : "text-[color:var(--text-muted)]"
                                }
                              >
                                {configured}/{trainingDays.length} rutinas
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </section>
                  ) : null}

                  {activePlan && selectedPlanId ? (
                    <section className="mt-4 border-y border-[color:var(--border)] py-5">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <Badge variant={activePlan.status}>
                            {PLAN_STATUS_LABELS[activePlan.status] ||
                              activePlan.status}
                          </Badge>
                          <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                            {activePlan.goal} · {activePlan.durationWeeks}{" "}
                            semanas ·{" "}
                            {activePlan.scheduleMode === "fixed"
                              ? "Semana recurrente"
                              : "Ciclo libre"}
                          </p>
                        </div>
                        <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start">
                          <span className="theme-accent-text text-xs font-black">
                            {activePlanTrainingDays.length -
                              missingPlanRoutineCount}
                            /{activePlanTrainingDays.length} rutinas
                          </span>
                          <details className="relative shrink-0">
                            <summary
                              className="grid h-10 w-10 touch-manipulation cursor-pointer list-none place-items-center rounded-md border border-[color:var(--border)] text-[color:var(--text-muted)] [&::-webkit-details-marker]:hidden dark:rounded-[3px]"
                              aria-label="Opciones del plan"
                              title="Opciones del plan"
                            >
                              <MoreVertical className="h-5 w-5" />
                            </summary>
                            <div className="absolute right-0 top-12 z-50 w-52 max-w-[calc(100vw-2rem)] overflow-hidden border border-[color:var(--border)] bg-[color:var(--card)] p-1 shadow-xl">
                              {!["completed", "cancelled"].includes(
                                activePlan.status,
                              ) ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.currentTarget
                                      .closest("details")
                                      ?.removeAttribute("open");
                                    setEditingPlan(activePlan);
                                  }}
                                  className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm font-bold hover:bg-[color:var(--bg)]"
                                >
                                  <Pencil className="h-4 w-4" /> Editar plan
                                </button>
                              ) : null}
                              {["draft", "paused"].includes(
                                activePlan.status,
                              ) ? (
                                <button
                                  type="button"
                                  disabled={missingPlanRoutineCount > 0}
                                  onClick={(event) => {
                                    event.currentTarget
                                      .closest("details")
                                      ?.removeAttribute("open");
                                    updatePlanStatus(activePlan, "active");
                                  }}
                                  className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm font-bold hover:bg-[color:var(--bg)] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Play className="h-4 w-4" />
                                  {missingPlanRoutineCount
                                    ? "Completa las rutinas"
                                    : "Activar planificación"}
                                </button>
                              ) : null}
                              {["active", "scheduled"].includes(
                                activePlan.status,
                              ) ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.currentTarget
                                      .closest("details")
                                      ?.removeAttribute("open");
                                    updatePlanStatus(activePlan, "paused");
                                  }}
                                  className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm font-bold hover:bg-[color:var(--bg)]"
                                >
                                  <PauseCircle className="h-4 w-4" />
                                  Desactivar planificación
                                </button>
                              ) : null}
                              {activePlan.status === "active" ? (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.currentTarget
                                      .closest("details")
                                      ?.removeAttribute("open");
                                    updatePlanStatus(activePlan, "completed");
                                  }}
                                  className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                                >
                                  <CheckCircle2 className="h-4 w-4" /> Finalizar
                                  plan
                                </button>
                              ) : null}
                              {["draft", "scheduled", "paused"].includes(
                                activePlan.status,
                              ) ? (
                                <button
                                  type="button"
                                  disabled={Boolean(planActionId)}
                                  onClick={(event) => {
                                    event.currentTarget
                                      .closest("details")
                                      ?.removeAttribute("open");
                                    removeCoachPlan(activePlan);
                                  }}
                                  className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  {activePlan.status === "draft"
                                    ? "Eliminar planificación"
                                    : "Archivar plan"}
                                </button>
                              ) : null}
                            </div>
                          </details>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center justify-between gap-3 text-[11px] font-bold">
                          <span className="truncate text-[color:var(--text-muted)]">
                            {formatDate(activePlan.startDate)} -{" "}
                            {formatDate(getPlanEndDate(activePlan))}
                          </span>
                          <span className="shrink-0">
                            {activePlanTimeProgress.message} ·{" "}
                            <strong className="theme-accent-text">
                              {activePlanTimeProgress.percentage}%
                            </strong>
                          </span>
                        </div>
                        <div
                          className="mt-2 h-1.5 overflow-hidden bg-[color:var(--border)]"
                          role="progressbar"
                          aria-label="Progreso temporal de la planificación"
                          aria-valuemin="0"
                          aria-valuemax="100"
                          aria-valuenow={activePlanTimeProgress.percentage}
                        >
                          <div
                            className="theme-accent-solid h-full border-0 transition-all"
                            style={{
                              width: `${activePlanTimeProgress.percentage}%`,
                            }}
                          />
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
                      <div className="mt-4 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
                        {(activePlan.weeklySchedule || []).map((day, index) => (
                          <article
                            key={day.slotId || day.dayIndex || index}
                            className="flex min-h-[72px] items-center gap-3 bg-[color:var(--card)] px-2 py-3 sm:px-3"
                          >
                            <div className="w-14 shrink-0 border-r border-[color:var(--border)] pr-3 text-center">
                              <p className="text-xs font-black uppercase text-[color:var(--text-muted)]">
                                {activePlan.scheduleMode !== "fixed"
                                  ? `Día ${index + 1}`
                                  : DAY_NAMES[index]}
                              </p>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p
                                className={`truncate text-sm font-black ${day.type === "training" ? "text-[color:var(--text)]" : "text-[color:var(--text-muted)]"}`}
                              >
                                {day.type === "rest"
                                  ? "Descanso completo"
                                  : day.type === "recovery"
                                    ? "Recuperación activa"
                                    : routineNameById.get(
                                        String(day.routineId),
                                      ) ||
                                      day.focus ||
                                      "Rutina sin asignar"}
                              </p>
                              <p className="mt-1 truncate text-[11px] font-semibold text-[color:var(--text-muted)]">
                                {day.type === "rest"
                                  ? "Recuperación"
                                  : day.type === "recovery"
                                    ? "Movilidad y actividad ligera"
                                    : day.routineId
                                      ? day.focus || "Entrenamiento"
                                      : "Edita la planificación para asignar una rutina"}
                              </p>
                            </div>
                            {day.type === "training" && !day.routineId ? (
                              <Badge variant="pending">Pendiente</Badge>
                            ) : null}
                          </article>
                        ))}
                      </div>
                      {activePlan.notes ? (
                        <p className="mt-3 text-xs font-semibold text-[color:var(--text-muted)]">
                          {activePlan.notes}
                        </p>
                      ) : null}
                    </section>
                  ) : !orderedPlans.length ? (
                    <section className="mt-4 border-y border-[color:var(--border)] py-8 text-center">
                      <div>
                        <h3 className="text-sm font-black">
                          Aún no tiene una planificación
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                          Crea una planificación para organizar sus días y
                          rutinas.
                        </p>
                      </div>
                    </section>
                  ) : null}
                </>
              ) : null}

              <div className="mt-6">
                {athleteView === "activity" ? (
                  <>
                    <SessionHistory
                      key={selectedId}
                      embedded
                      ownerId={selectedId}
                      ownerName={selectedAthlete.name}
                      onNavigate={onNavigate}
                      prepareTrainingContext={() =>
                        onSelectCoachAthlete({
                          id: selectedId,
                          name: selectedAthlete.name,
                          email: selectedAthlete.email,
                        })
                      }
                    />
                  </>
                ) : null}
                {athleteView === "insights" ? (
                  canUseReports ? (
                    <WeeklyReportPanel
                      report={weeklyReport}
                      loading={reportLoading}
                      onRefresh={refreshWeeklyReport}
                      onCopy={copyWeeklyReport}
                      onGenerateDraft={generatePlanDraft}
                      draftLoading={draftLoading}
                    />
                  ) : (
                    <PremiumGate
                      plan="Coach Pro"
                      title="Informes y planificacion asistida"
                      description="Compara semanas, detecta riesgos y prepara borradores editables para cada atleta."
                      onNavigate={onNavigate}
                    />
                  )
                ) : null}
              </div>
            </section>
          )}
        </div>
      )}

      {(creatingPlan || editingPlan || planDraft) && selectedAthlete ? (
        <CoachPlanModal
          athlete={selectedAthlete}
          templates={templates}
          planTemplates={planCatalog.plans}
          initialData={editingPlan || planDraft?.plan}
          replacingPlan={editingPlan ? null : activePlan}
          onSave={savePlan}
          onClose={() => {
            setCreatingPlan(false);
            setEditingPlan(null);
            setPlanDraft(null);
          }}
        />
      ) : null}
    </main>
  );
}
