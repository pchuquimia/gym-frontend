import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  AlertTriangle,
  BarChart3,
  Bell,
  CalendarPlus,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Copy,
  Dumbbell,
  FileText,
  Link2,
  ListFilter,
  PauseCircle,
  Pencil,
  Play,
  Plus,
  MoreHorizontal,
  MoreVertical,
  MessageCircle,
  Search,
  SlidersHorizontal,
  Sparkles,
  SquareCheckBig,
  Target,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Badge from "../components/ui/badge";
import Button from "../components/ui/button";
import OperationLoader from "../components/system/OperationLoader";
import PremiumGate from "../components/shared/PremiumGate";
import ProfileAvatar from "../components/profile/ProfileAvatar";
import CoachPlanModal from "../components/coach/CoachPlanModal";
import { SessionHistory } from "./TrainingAdmin";
import { useAuth } from "../context/AuthContext";
import { useUserProfile } from "../context/UserContext";
import { useRoutines } from "../context/RoutineContext";
import { api } from "../services/api";
import {
  canAccessActiveTraining,
  readActiveTrainingSnapshot,
} from "../utils/activeTraining";
import { hasPremiumFeature, PREMIUM_FEATURES } from "../utils/premium";

const COACH_PLAN_ASSIGNMENT_KEY = "rirfit_coach_plan_assignment";
const COACH_REQUESTED_VIEW_KEY = "rirfit_coach_requested_view";
const COACH_REQUESTED_PLAN_KEY = "rirfit_coach_requested_plan";
const COACH_PLAN_TEMPLATE_ASSIGNMENT_KEY =
  "rirfit_coach_plan_template_assignment";

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

const compactName = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Alumno";
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[1][0]}.`;
};

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
            : "bg-[#181918] text-white dark:bg-[#e2ff00] dark:text-black"
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

const athleteListDetail = (athlete) => {
  const alertTitle = athlete.alerts?.[0]?.title;
  if (alertTitle) return alertTitle;

  const lastTraining = relativeTrainingDate(athlete.lastTraining?.date);
  const adherence = Number(athlete.adherence?.percentage || 0);
  if (lastTraining === "Hoy") {
    return adherence ? `Entrenó hoy · ${adherence}% adherencia` : "Entrenó hoy";
  }
  if (lastTraining) {
    return `Último entrenamiento ${lastTraining.toLowerCase()}`;
  }
  if (!Number(athlete.routineCount || 0)) return "Sin plan asignado";
  return "Sin entrenamientos registrados";
};

function MobileAthleteCard({ athlete, blocked = false, onClick }) {
  const priority = athlete.priority || "normal";
  const isAttention = priority === "high" || priority === "medium";
  const trainedToday =
    relativeTrainingDate(athlete.lastTraining?.date) === "Hoy";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={blocked}
      className={`grid min-h-[94px] w-full grid-cols-[64px_minmax(0,1fr)_24px] items-center gap-4 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 text-left shadow-[0_8px_28px_rgba(28,25,20,0.035)] transition-transform active:scale-[0.99] ${blocked ? "cursor-not-allowed opacity-45" : ""}`}
    >
      <ProfileAvatar
        photoId={athlete.profile?.avatarPhotoId}
        name={athlete.name}
        className="h-16 w-16 rounded-full bg-[color:var(--surface-subtle)] text-[17px] font-semibold"
      />
      <span className="min-w-0">
        <span className="flex items-center gap-2.5">
          <strong className="truncate text-[21px] font-bold leading-tight tracking-[-0.035em]">
            {compactName(athlete.name)}
          </strong>
          {isAttention ? (
            <span
              className={`h-3.5 w-3.5 shrink-0 rounded-full ${priority === "high" ? "bg-[#ef5862]" : "bg-amber-400"}`}
              title={
                priority === "high"
                  ? "Requiere atención"
                  : "Revisar seguimiento"
              }
            />
          ) : trainedToday ? (
            <CheckCircle2
              className="h-[18px] w-[18px] shrink-0 fill-[#747875] text-white"
              strokeWidth={2.8}
              aria-label="Entrenamiento completado hoy"
            />
          ) : null}
        </span>
        <span className="mt-1 block truncate text-[15px] font-normal leading-snug text-[color:var(--text-muted)]">
          {athleteListDetail(athlete)}
        </span>
      </span>
      <ChevronRight
        className="h-6 w-6 text-[color:var(--text-muted)]"
        strokeWidth={1.8}
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
        <p className="text-[10px] font-black uppercase text-[#181918] dark:text-[#e2ff00]">
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
            <Icon className="h-4 w-4 text-[#181918] dark:text-[#e2ff00]" />
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

const daysSince = (value) => {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
};

const relativeTrainingDate = (value) => {
  const elapsed = daysSince(value);
  if (elapsed === null) return "";
  if (elapsed === 0) return "Hoy";
  if (elapsed === 1) return "Ayer";
  return `Hace ${elapsed} días`;
};

const localDateKey = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const compactDuration = (seconds = 0) => {
  const totalMinutes = Math.max(0, Math.round(Number(seconds || 0) / 60));
  if (!totalMinutes) return "Sin tiempo";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours
    ? `${hours} h ${minutes ? `${minutes} min` : ""}`.trim()
    : `${minutes} min`;
};

const goalLabel = (value = "") => {
  const normalized = String(value || "").trim();
  if (!normalized) return "Objetivo sin definir";
  const labels = {
    strength: "Ganar fuerza",
    muscle_gain: "Ganar masa muscular",
    hypertrophy: "Ganar masa muscular",
    fat_loss: "Reducir grasa",
    endurance: "Mejorar resistencia",
    general_fitness: "Mejorar su condición",
    maintenance: "Mantenimiento",
    mantenimiento: "Mantenimiento",
  };
  return labels[normalized.toLowerCase()] || normalized;
};

const activityImageFor = (routineName = "") => {
  const name = String(routineName).toLowerCase();
  if (name.includes("upper")) return "/images/routine-upper.webp";
  if (name.includes("push") || name.includes("empuje")) {
    return "/images/routine-push.webp";
  }
  if (name.includes("pull") || name.includes("tir")) {
    return "/images/routine-pull.webp";
  }
  return "/images/routine-lower-a.webp";
};

function MobileAthleteProfileHeader({
  athlete,
  activeSession,
  title = "Perfil del alumno",
  planDetail = false,
  onBack,
  onMessage,
  onEditPlan,
  onRelease,
}) {
  return (
    <div className="lg:hidden">
      <header className="grid h-14 grid-cols-[44px_minmax(0,1fr)_44px] items-center">
        <button
          type="button"
          onClick={onBack}
          className="grid h-11 w-11 place-items-center rounded-full transition-colors hover:bg-[color:var(--surface-subtle)]"
          aria-label="Volver a alumnos"
        >
          <ArrowLeft className="h-7 w-7" strokeWidth={1.8} />
        </button>
        <h1 className="text-center text-[20px] font-semibold tracking-[-0.025em]">
          {title}
        </h1>
        <details className="overflow-menu relative justify-self-end">
          <summary
            className="overflow-menu-trigger grid h-11 w-11 cursor-pointer list-none place-items-center rounded-full [&::-webkit-details-marker]:hidden"
            aria-label="Opciones del alumno"
            title="Opciones del alumno"
          >
            <MoreHorizontal className="h-7 w-7" strokeWidth={2.2} />
          </summary>
          <div className="overflow-menu-panel absolute right-0 top-12 z-30 w-56">
            <button
              type="button"
              onClick={(event) => {
                event.currentTarget.closest("details")?.removeAttribute("open");
                onRelease();
              }}
              disabled={Boolean(activeSession)}
              className="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-300 dark:hover:bg-red-500/10"
              title={
                activeSession
                  ? "Finaliza la sesión supervisada antes de desvincular"
                  : "Quitar alumno de mi cartera"
              }
            >
              <UserMinus className="h-4 w-4" />
              Desvincular alumno
            </button>
          </div>
        </details>
      </header>

      <section
        className={`mt-1 grid items-center gap-x-3 gap-y-3 px-1 ${
          planDetail
            ? "grid-cols-[76px_minmax(0,1fr)_112px]"
            : "grid-cols-[76px_minmax(0,1fr)] min-[440px]:grid-cols-[76px_minmax(90px,1fr)_102px_102px] min-[440px]:gap-x-2.5"
        }`}
      >
        <ProfileAvatar
          photoId={athlete.profile?.avatarPhotoId}
          name={athlete.name}
          className="h-[76px] w-[76px] rounded-full bg-[color:var(--surface-subtle)] text-lg font-semibold"
        />
        <div className="min-w-0">
          <h2 className="truncate text-[22px] font-bold leading-none tracking-[-0.045em]">
            {compactName(athlete.name)}
          </h2>
          <p className="mt-1.5 flex items-center gap-2 text-[13px] text-[color:var(--text-muted)]">
            <span className="h-3 w-3 rounded-full bg-[#42ad64]" />
            Activa hoy
          </p>
          {!planDetail ? (
            <p className="mt-1.5 whitespace-nowrap text-[11px] leading-tight tracking-[-0.01em] text-[color:var(--text-muted)]">
              Objetivo · {goalLabel(athlete.profile?.goal)}
            </p>
          ) : null}
        </div>
        <div
          className={
            planDetail
              ? ""
              : "col-span-2 grid grid-cols-2 gap-2.5 min-[440px]:contents"
          }
        >
          <button
            type="button"
            onClick={onMessage}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[color:var(--border-strong)] bg-[color:var(--card)] px-3 text-[14px] font-semibold transition-transform active:scale-[0.98]"
          >
            <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
            Mensaje
          </button>
          {!planDetail ? (
            <button
              type="button"
              onClick={onEditPlan}
              className="h-11 rounded-[12px] bg-[#181918] px-3 text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(20,20,20,0.12)] transition-transform active:scale-[0.98] dark:bg-[#f2f1ec] dark:text-[#151515]"
            >
              Editar plan
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function AthleteSummaryView({
  overview,
  activePlan,
  activePlanTimeProgress,
  recommendedPlanDay,
  routineNameById,
  latestCheckIn,
  onOpenPlan,
  onOpenHistory,
}) {
  const todayKey = localDateKey();
  const recentTrainings = overview?.recentTrainings || [];
  const todayTraining = recentTrainings.find(
    (training) => String(training.date || "").slice(0, 10) === todayKey,
  );
  const checkInDate = String(
    latestCheckIn?.dateKey || latestCheckIn?.date || "",
  ).slice(0, 10);
  const checkedInToday = checkInDate === todayKey;
  const plannedRoutineName = routineNameById.get(
    String(recommendedPlanDay?.routineId || ""),
  );
  const todayRoutineName =
    todayTraining?.routineName || plannedRoutineName || "Entrenamiento";

  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const weekKeys = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return localDateKey(date);
  });
  const weeklyTrainings = recentTrainings.filter((training) =>
    weekKeys.includes(String(training.date || "").slice(0, 10)),
  );
  const completedDays = new Set(
    weeklyTrainings.map((training) => String(training.date || "").slice(0, 10)),
  );
  const durationByDay = new Map();
  weeklyTrainings.forEach((training) => {
    const key = String(training.date || "").slice(0, 10);
    durationByDay.set(
      key,
      (durationByDay.get(key) || 0) + Number(training.durationSeconds || 0),
    );
  });
  const longestDaySeconds = Math.max(1, ...durationByDay.values());
  const weeklyTarget = Math.max(
    1,
    (activePlan?.weeklySchedule || []).filter((day) => day.type === "training")
      .length ||
      weeklyTrainings.length ||
      1,
  );
  const adherence = Math.min(
    100,
    Math.round((completedDays.size / weeklyTarget) * 100),
  );
  const averageSeconds = weeklyTrainings.length
    ? weeklyTrainings.reduce(
        (total, training) => total + Number(training.durationSeconds || 0),
        0,
      ) / weeklyTrainings.length
    : 0;
  const startDate = activePlan?.startDate
    ? new Date(`${String(activePlan.startDate).slice(0, 10)}T12:00:00`)
    : null;
  const currentWeek = startDate
    ? Math.max(
        1,
        Math.min(
          Number(activePlan?.durationWeeks || 1),
          Math.floor(
            (new Date(`${todayKey}T12:00:00`).getTime() - startDate.getTime()) /
              604800000,
          ) + 1,
        ),
      )
    : 1;
  const latestTraining = recentTrainings[0];

  return (
    <div className="space-y-7 pb-4 pt-5">
      <section>
        <h3 className="text-[25px] font-semibold tracking-[-0.045em]">Hoy</h3>
        <div className="mt-3 overflow-hidden rounded-[20px] bg-[#1d1e1d] px-5 text-white shadow-[0_16px_38px_rgba(0,0,0,0.12)] dark:bg-[#111]">
          <button
            type="button"
            onClick={onOpenHistory}
            className="flex min-h-[82px] w-full items-center gap-4 border-b border-white/20 text-left"
          >
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${todayTraining ? "bg-[#9ae6aa] text-[#102916]" : "bg-white/10 text-white"}`}
            >
              {todayTraining ? (
                <Check className="h-6 w-6" strokeWidth={2.4} />
              ) : (
                <CalendarDays className="h-5 w-5" />
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-[17px] font-semibold uppercase tracking-[-0.025em]">
              {todayRoutineName}
            </span>
            <span
              className={`shrink-0 text-sm font-semibold ${todayTraining ? "text-[#91e5a6]" : "text-white/65"}`}
            >
              {todayTraining
                ? "Completado"
                : plannedRoutineName
                  ? "Programado"
                  : "Sin sesión"}
            </span>
          </button>
          <div className="flex min-h-[82px] items-center gap-4">
            <span
              className={`h-4 w-4 shrink-0 rounded-full ${checkedInToday ? "bg-[#9ae6aa]" : "bg-[#ff806f]"}`}
            />
            <span className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-[-0.025em]">
              Check-in diario
            </span>
            <span
              className={`shrink-0 text-sm font-semibold ${checkedInToday ? "text-[#91e5a6]" : "text-[#ff8b7c]"}`}
            >
              {checkedInToday ? "Registrado" : "Pendiente"}
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-white/65" />
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <h3 className="text-[25px] font-semibold tracking-[-0.045em]">
            Plan actual
          </h3>
          <button
            type="button"
            onClick={onOpenPlan}
            className="flex h-10 items-center gap-1 text-sm font-medium"
          >
            Ver plan <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {activePlan ? (
          <button
            type="button"
            onClick={onOpenPlan}
            className="mt-3 flex min-h-[116px] w-full items-center gap-4 rounded-[18px] border border-[color:var(--border)] bg-[color:var(--card)] px-4 text-left"
          >
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[14px] bg-[color:var(--bg)]">
              <Dumbbell className="h-7 w-7" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-[17px] font-semibold tracking-[-0.025em]">
                {activePlan.name}
              </strong>
              <span className="mt-1 block text-sm text-[color:var(--text-muted)]">
                Semana {currentWeek} de {activePlan.durationWeeks || 1}
              </span>
              <span className="mt-3 flex items-center gap-3">
                <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[color:var(--border)]">
                  <span
                    className="block h-full rounded-full bg-[#43a65f]"
                    style={{
                      width: `${activePlanTimeProgress?.percentage || 0}%`,
                    }}
                  />
                </span>
                <span className="text-xs font-medium text-[color:var(--text-muted)]">
                  {activePlanTimeProgress?.percentage || 0}%
                </span>
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-[color:var(--text-muted)]" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenPlan}
            className="mt-3 flex min-h-[92px] w-full items-center justify-between rounded-[18px] border border-[color:var(--border)] px-5 text-left"
          >
            <span>
              <strong className="block text-base font-semibold">
                Sin plan activo
              </strong>
              <span className="mt-1 block text-sm text-[color:var(--text-muted)]">
                Crea su primera planificación.
              </span>
            </span>
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </section>

      <section>
        <h3 className="text-[25px] font-semibold tracking-[-0.045em]">
          Esta semana
        </h3>
        <div className="mt-4 grid grid-cols-3 divide-x divide-[color:var(--border)] text-center">
          <div className="px-2">
            <strong className="block text-[22px] font-semibold tracking-[-0.04em]">
              {completedDays.size}/{weeklyTarget}
            </strong>
            <span className="mt-1 block text-xs text-[color:var(--text-muted)]">
              Entrenos
            </span>
          </div>
          <div className="px-2">
            <strong className="block text-[22px] font-semibold tracking-[-0.04em]">
              {adherence}%
            </strong>
            <span className="mt-1 block text-xs text-[color:var(--text-muted)]">
              Adherencia
            </span>
          </div>
          <div className="px-2">
            <strong className="block text-[22px] font-semibold tracking-[-0.04em]">
              {compactDuration(averageSeconds)}
            </strong>
            <span className="mt-1 block text-xs text-[color:var(--text-muted)]">
              Promedio
            </span>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-7 gap-3 px-2">
          {weekKeys.map((key, index) => (
            <div key={key} className="flex flex-col items-center gap-2">
              <span className="flex h-14 items-end">
                <span
                  className={`block w-7 rounded-[7px] ${completedDays.has(key) ? "bg-[#43a65f]" : "bg-[color:var(--border)] opacity-55"}`}
                  style={{
                    height: completedDays.has(key)
                      ? `${Math.max(
                          28,
                          Math.round(
                            (Number(durationByDay.get(key) || 0) /
                              longestDaySeconds) *
                              56,
                          ),
                        )}px`
                      : "52px",
                  }}
                />
              </span>
              <span className="text-[11px] font-medium text-[color:var(--text-muted)]">
                {["L", "M", "M", "J", "V", "S", "D"][index]}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-[25px] font-semibold tracking-[-0.045em]">
          Actividad reciente
        </h3>
        <div className="mt-3 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
          {latestTraining ? (
            <button
              type="button"
              onClick={onOpenHistory}
              className="flex min-h-[82px] w-full items-center gap-4 py-3 text-left"
            >
              <img
                src={activityImageFor(latestTraining.routineName)}
                alt=""
                className="h-16 w-20 shrink-0 rounded-[12px] object-cover"
              />
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-[16px] font-semibold">
                  Completó {latestTraining.routineName || "entrenamiento"}
                </strong>
                <span className="mt-1 block text-sm text-[color:var(--text-muted)]">
                  {relativeTrainingDate(latestTraining.date)} ·{" "}
                  {compactDuration(latestTraining.durationSeconds)}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0" />
            </button>
          ) : null}
          {latestCheckIn ? (
            <button
              type="button"
              onClick={onOpenHistory}
              className="flex min-h-[82px] w-full items-center gap-4 py-3 text-left"
            >
              <span className="grid h-16 w-20 shrink-0 place-items-center rounded-[12px] bg-[color:var(--card)]">
                <SquareCheckBig className="h-8 w-8" strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-[16px] font-semibold">
                  Registró su estado
                </strong>
                <span className="mt-1 block text-sm text-[color:var(--text-muted)]">
                  {checkedInToday ? "Hoy" : formatDate(checkInDate)}
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0" />
            </button>
          ) : null}
          {!latestTraining && !latestCheckIn ? (
            <p className="py-8 text-center text-sm text-[color:var(--text-muted)]">
              Todavía no hay actividad registrada.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

const shortPlanDate = (value) => {
  if (!value) return "Sin fecha";
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date
    .toLocaleDateString("es-ES", { day: "numeric", month: "short" })
    .replace(".", "");
};

function MobileAthletePlanView({
  overview,
  activePlan,
  activePlanTimeProgress,
  detailMode = false,
  onEditPlan,
  onOpenRoutine,
}) {
  const todayKey = localDateKey();
  const today = new Date(`${todayKey}T12:00:00`);
  const planStart = activePlan?.startDate
    ? new Date(`${String(activePlan.startDate).slice(0, 10)}T12:00:00`)
    : null;
  const currentWeek = planStart
    ? Math.max(
        1,
        Math.min(
          Number(activePlan?.durationWeeks || 1),
          Math.floor((today.getTime() - planStart.getTime()) / 604800000) + 1,
        ),
      )
    : 1;
  const endDate = activePlan ? getPlanEndDate(activePlan) : "";
  const reviewDate = endDate
    ? (() => {
        const date = new Date(`${String(endDate).slice(0, 10)}T12:00:00`);
        date.setDate(date.getDate() - 1);
        return localDateKey(date);
      })()
    : "";
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const routineById = new Map(
    (overview?.routines || []).map((routine) => [
      String(routine._id || routine.id),
      routine,
    ]),
  );
  const trainings = overview?.recentTrainings || [];
  const trainingDays = (activePlan?.weeklySchedule || []).filter(
    (day) => day.type === "training",
  );
  const scheduleRows = trainingDays.map((day, index) => {
    const date = new Date(monday);
    const fixedDayIndex = Math.min(
      7,
      Math.max(1, Number(day.dayIndex || index + 1)),
    );
    date.setDate(monday.getDate() + fixedDayIndex - 1);
    const dateKey = localDateKey(date);
    const routine = routineById.get(String(day.routineId || ""));
    const routineName = routine?.name || day.focus || "Rutina sin asignar";
    const completed = trainings.some(
      (training) =>
        String(training.date || "").slice(0, 10) === dateKey &&
        (!day.routineId ||
          String(training.routineId || "") === String(day.routineId) ||
          String(training.routineName || "").toLowerCase() ===
            routineName.toLowerCase()),
    );
    return { day, date, dateKey, routine, routineName, completed };
  });
  const weekCount = Math.max(1, Number(activePlan?.durationWeeks || 1));

  if (!activePlan) {
    return (
      <section className="pb-5 pt-5 lg:hidden">
        <h2 className="text-[25px] font-bold tracking-[-0.05em]">
          Plan actual
        </h2>
        <div className="mt-4 rounded-[20px] bg-[#1b1c1b] px-5 py-6 text-white shadow-[0_16px_38px_rgba(0,0,0,0.12)]">
          <p className="text-xl font-semibold">Sin plan activo</p>
          <p className="mt-2 text-sm text-white/65">
            Crea una planificación para organizar sus entrenamientos.
          </p>
          <button
            type="button"
            onClick={onEditPlan}
            className="mt-5 h-11 rounded-[12px] bg-white px-5 text-sm font-semibold text-black"
          >
            Crear plan
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className={`pb-5 lg:hidden ${detailMode ? "pt-3" : "pt-5"}`}>
      <section>
        {!detailMode ? (
          <h2 className="text-[25px] font-bold tracking-[-0.05em]">
            Plan actual
          </h2>
        ) : null}
        <button
          type="button"
          onClick={onEditPlan}
          className={`${detailMode ? "mt-0" : "mt-3"} grid min-h-[126px] w-full grid-cols-[minmax(0,1fr)_132px] items-center overflow-hidden rounded-[18px] bg-[#1b1c1b] px-5 py-3 text-left text-white shadow-[0_16px_38px_rgba(0,0,0,0.13)]`}
        >
          <span className="min-w-0 pr-4">
            <strong className="block truncate text-[21px] font-semibold tracking-[-0.035em]">
              {activePlan.name}
            </strong>
            <span className="mt-1 block text-[14px] text-white/70">
              Semana {currentWeek} de {weekCount}
            </span>
            <span className="mt-3 flex items-center gap-3">
              <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/20">
                <span
                  className="block h-full rounded-full bg-[#54c577]"
                  style={{
                    width: `${activePlanTimeProgress?.percentage || 0}%`,
                  }}
                />
              </span>
              <span className="text-[15px] font-medium">
                {activePlanTimeProgress?.percentage || 0}%
              </span>
            </span>
          </span>
          <span className="flex h-full flex-col items-center justify-center border-l border-white/15 pl-5 text-center">
            <CalendarDays className="h-6 w-6" strokeWidth={1.7} />
            <span className="mt-2 text-[14px] text-white/80">
              Finaliza el {shortPlanDate(endDate)}
            </span>
          </span>
        </button>
      </section>

      <section className="mt-4">
        <h3 className="text-[22px] font-semibold tracking-[-0.04em]">
          Semanas
        </h3>
        <div className="mt-4 flex items-center overflow-x-auto px-2 pb-1">
          {Array.from({ length: weekCount }, (_, index) => index + 1).map(
            (week, index) => {
              const completed = week < currentWeek;
              const current = week === currentWeek;
              return (
                <div key={week} className="flex min-w-0 flex-1 items-center">
                  <span className="relative shrink-0">
                    <span
                      className={`grid h-11 w-11 place-items-center rounded-full text-[18px] ${
                        current
                          ? "bg-[#1b1c1b] font-semibold text-white"
                          : completed
                            ? "bg-[#dcefe1] text-[#152019]"
                            : "bg-[color:var(--surface-subtle)] text-[color:var(--text)]"
                      }`}
                    >
                      {week}
                    </span>
                    {completed ? (
                      <span className="absolute -bottom-2 left-1/2 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full border-2 border-[color:var(--bg)] bg-[#43ae67] text-white">
                        <Check className="h-3.5 w-3.5" strokeWidth={2.8} />
                      </span>
                    ) : null}
                  </span>
                  {index < weekCount - 1 ? (
                    <span className="mx-2 h-px min-w-5 flex-1 bg-[color:var(--border-strong)]" />
                  ) : null}
                </div>
              );
            },
          )}
        </div>
      </section>

      <section className="mt-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-[24px] font-bold tracking-[-0.045em]">
            {detailMode ? `Semana ${currentWeek}` : "Esta semana"}
          </h3>
          <button
            type="button"
            onClick={onEditPlan}
            className="inline-flex h-10 items-center gap-2 text-[16px] font-medium"
          >
            Organizar{" "}
            <SlidersHorizontal className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>
        <div
          className={
            detailMode
              ? "mt-1 grid gap-2"
              : "divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]"
          }
        >
          {scheduleRows.map(
            ({ day, date, routine, routineName, completed }) => (
              <button
                key={day.slotId || day.dayIndex}
                type="button"
                onClick={() => day.routineId && onOpenRoutine(day)}
                className={`grid min-h-[74px] w-full grid-cols-[64px_54px_minmax(0,1fr)_32px] items-center gap-3 text-left ${
                  detailMode
                    ? "rounded-[14px] border border-[color:var(--border)] bg-[color:var(--card)] px-2 py-1"
                    : "py-1"
                }`}
              >
                <img
                  src={activityImageFor(routineName)}
                  alt=""
                  className="h-16 w-16 rounded-[12px] object-cover"
                />
                <span className="border-r border-[color:var(--border)] pr-3 text-center">
                  <span className="block text-[11px] font-medium uppercase text-[color:var(--text-muted)]">
                    {date
                      .toLocaleDateString("es-ES", { weekday: "short" })
                      .replace(".", "")}
                  </span>
                  <strong className="mt-0.5 block text-[19px] font-semibold">
                    {date.getDate()}
                  </strong>
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-[18px] font-semibold uppercase tracking-[-0.02em]">
                    {routineName}
                  </strong>
                  <span
                    className={`mt-1 block truncate text-[14px] ${completed ? "text-[#43ae67]" : "text-[color:var(--text-muted)]"}`}
                  >
                    {completed
                      ? "Completado"
                      : routine
                        ? `${routine.exercises?.length || 0} ejercicios`
                        : "Rutina pendiente"}
                  </span>
                </span>
                {completed ? (
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-[#43ae67] text-white">
                    <Check className="h-5 w-5" strokeWidth={2.6} />
                  </span>
                ) : (
                  <ChevronRight
                    className="h-6 w-6 text-[color:var(--text)]"
                    strokeWidth={1.8}
                  />
                )}
              </button>
            ),
          )}
          {!scheduleRows.length ? (
            <div className="py-8 text-center text-sm text-[color:var(--text-muted)]">
              Este plan no tiene entrenamientos configurados.
            </div>
          ) : null}
        </div>
      </section>

      <div
        className={`mt-3 flex min-h-[56px] items-center gap-4 ${
          detailMode
            ? "rounded-[14px] border border-[color:var(--border)] bg-[color:var(--card)] px-4"
            : "border-b border-[color:var(--border)]"
        }`}
      >
        <CalendarDays
          className="h-6 w-6 text-[color:var(--text-muted)]"
          strokeWidth={1.7}
        />
        <span className="flex-1 text-[16px] font-medium">Próxima revisión</span>
        <strong className="text-[16px] font-medium">
          {shortPlanDate(reviewDate)}
        </strong>
        {detailMode ? (
          <ChevronRight className="h-5 w-5" strokeWidth={1.8} />
        ) : null}
      </div>
    </div>
  );
}

const historyDateLabel = (value) => {
  const key = String(value || "").slice(0, 10);
  if (!key) return "Sin fecha";
  if (key === localDateKey()) return "Hoy";
  const date = new Date(`${key}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date
    .toLocaleDateString("es-ES", { day: "numeric", month: "short" })
    .replace(".", "");
};

function MobileAthleteHistoryView({
  trainings,
  checkIns,
  activePlan,
  loading,
  onOpenTraining,
}) {
  const [showAllSessions, setShowAllSessions] = useState(false);
  const sortedTrainings = useMemo(
    () =>
      [...(trainings || [])].sort((left, right) =>
        String(right.date || right.createdAt || "").localeCompare(
          String(left.date || left.createdAt || ""),
        ),
      ),
    [trainings],
  );
  const totalSeconds = sortedTrainings.reduce(
    (total, training) =>
      total +
      Number(training.durationOverrideSeconds ?? training.durationSeconds ?? 0),
    0,
  );
  const weeklyTarget = (activePlan?.weeklySchedule || []).filter(
    (day) => day.type === "training",
  ).length;
  const planStart = activePlan?.startDate
    ? new Date(`${String(activePlan.startDate).slice(0, 10)}T12:00:00`)
    : null;
  const today = new Date(`${localDateKey()}T12:00:00`);
  const periodStart = new Date(today);
  periodStart.setDate(today.getDate() - 29);
  const effectiveStart =
    planStart && planStart > periodStart && planStart <= today
      ? planStart
      : periodStart;
  const elapsedPlanDays = Math.max(
    1,
    Math.floor((today.getTime() - effectiveStart.getTime()) / 86400000) + 1,
  );
  const expectedTrainings = weeklyTarget
    ? Math.max(1, Math.round((weeklyTarget * elapsedPlanDays) / 7))
    : sortedTrainings.length;
  const adherence = expectedTrainings
    ? Math.min(
        100,
        Math.round((sortedTrainings.length / expectedTrainings) * 100),
      )
    : 0;
  const weeklyCounts = [0, 0, 0, 0];
  sortedTrainings.forEach((training) => {
    const date = new Date(
      `${String(training.date || training.createdAt || "").slice(0, 10)}T12:00:00`,
    );
    if (Number.isNaN(date.getTime())) return;
    const elapsedDays = Math.floor(
      (date.getTime() - periodStart.getTime()) / 86400000,
    );
    if (elapsedDays >= 0 && elapsedDays < 30) {
      weeklyCounts[Math.min(3, Math.floor(elapsedDays / 7))] += 1;
    }
  });
  const chartMax = Math.max(6, Math.ceil(Math.max(...weeklyCounts, 0) / 2) * 2);
  const chartTicks = [
    chartMax,
    Math.round((chartMax * 2) / 3),
    Math.round(chartMax / 3),
    0,
  ];
  const visibleSessions = showAllSessions
    ? sortedTrainings
    : sortedTrainings.slice(0, 3);

  return (
    <div className="pb-5 pt-4 lg:hidden">
      <section>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[25px] font-bold tracking-[-0.05em]">
            Últimos 30 días
          </h2>
          <span className="grid h-11 w-11 place-items-center rounded-[12px] border border-[color:var(--border-strong)]">
            <CalendarDays className="h-6 w-6" strokeWidth={1.8} />
          </span>
        </div>

        {loading ? (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[0, 1, 2].map((item) => (
              <span
                key={item}
                className="h-14 animate-pulse rounded-[12px] bg-[color:var(--surface-subtle)]"
              />
            ))}
          </div>
        ) : (
          <div className="mt-3 grid min-h-[58px] grid-cols-3 divide-x divide-[color:var(--border)] text-center">
            <div className="px-2">
              <strong className="block text-[23px] font-bold tracking-[-0.04em]">
                {sortedTrainings.length}
              </strong>
              <span className="mt-1 block text-[13px] text-[color:var(--text-muted)]">
                Entrenos
              </span>
            </div>
            <div className="px-2">
              <strong className="block text-[23px] font-bold tracking-[-0.04em]">
                {adherence}%
              </strong>
              <span className="mt-1 block text-[13px] text-[color:var(--text-muted)]">
                Adherencia
              </span>
            </div>
            <div className="px-2">
              <strong className="block whitespace-nowrap text-[20px] font-bold tracking-[-0.04em]">
                {compactDuration(totalSeconds)}
              </strong>
              <span className="mt-1 block text-[13px] text-[color:var(--text-muted)]">
                Tiempo
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="mt-4 border-t border-[color:var(--border)] pt-4">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-[23px] font-bold tracking-[-0.045em]">
            Actividad semanal
          </h3>
          <span className="inline-flex items-center gap-2 text-[14px] text-[color:var(--text-muted)]">
            <span className="h-3 w-3 rounded-full bg-[#459f62]" /> Realizados
          </span>
        </div>
        <div className="mt-2 grid grid-cols-[24px_minmax(0,1fr)] gap-2">
          <div className="flex h-[88px] flex-col justify-between text-[11px] text-[color:var(--text-muted)]">
            {chartTicks.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </div>
          <div className="relative h-[88px] border-b border-l border-[color:var(--border-strong)]">
            {[0, 1, 2].map((line) => (
              <span
                key={line}
                className="absolute left-0 right-0 h-px bg-[color:var(--border)]"
                style={{ top: `${line * 33.333}%` }}
              />
            ))}
            <div className="absolute inset-x-0 bottom-0 top-0 flex items-end justify-around px-3">
              {weeklyCounts.map((count, index) => (
                <div
                  key={index}
                  className="relative flex h-full w-12 items-end justify-center"
                  title={`Semana ${index + 1}: ${count} entrenamientos`}
                >
                  <span
                    className="w-9 rounded-t-[4px] bg-[#459f62]"
                    style={{
                      height: `${count ? Math.max(8, (count / chartMax) * 68) : 0}px`,
                    }}
                  />
                  <span className="absolute -bottom-5 text-[12px] text-[color:var(--text-muted)]">
                    S{index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 border-t border-[color:var(--border)] pt-3">
        <div className="flex h-10 items-center justify-between gap-4">
          <h3 className="text-[24px] font-bold tracking-[-0.045em]">
            Sesiones
          </h3>
          <button
            type="button"
            onClick={() => {
              if (sortedTrainings.length > 3) {
                setShowAllSessions((current) => !current);
              }
            }}
            aria-disabled={sortedTrainings.length <= 3}
            className="inline-flex h-10 items-center gap-1 text-[16px] font-medium"
          >
            {showAllSessions ? "Ver menos" : "Ver todas"}
            <ChevronRight className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>
        <div className="divide-y divide-[color:var(--border)] border-b border-[color:var(--border)]">
          {visibleSessions.map((training) => (
            <button
              key={training._id || training.id}
              type="button"
              onClick={() => onOpenTraining(training)}
              className="grid min-h-[64px] w-full grid-cols-[80px_minmax(0,1fr)_auto_22px] items-center gap-3 py-1 text-left"
            >
              <img
                src={activityImageFor(training.routineName)}
                alt=""
                className="h-14 w-20 rounded-[10px] object-cover"
              />
              <span className="min-w-0">
                <strong className="block truncate text-[17px] font-semibold uppercase tracking-[-0.02em]">
                  {training.routineName || "Entrenamiento"}
                </strong>
                <span className="mt-1 block truncate text-[13px] text-[color:var(--text-muted)]">
                  {historyDateLabel(training.date || training.createdAt)} ·{" "}
                  {compactDuration(
                    training.durationOverrideSeconds ??
                      training.durationSeconds ??
                      0,
                  )}
                </span>
              </span>
              <span className="inline-flex items-center gap-2 text-[14px] font-medium text-[#409d5e]">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#43ae67] text-white">
                  <Check className="h-4 w-4" strokeWidth={2.7} />
                </span>
                <span className="hidden min-[430px]:inline">Completado</span>
              </span>
              <ChevronRight className="h-5 w-5" strokeWidth={1.8} />
            </button>
          ))}
          {!loading && !visibleSessions.length ? (
            <p className="py-7 text-center text-sm text-[color:var(--text-muted)]">
              No hay sesiones registradas en los últimos 30 días.
            </p>
          ) : null}
        </div>
      </section>

      <div className="flex min-h-[48px] items-center gap-4 border-b border-[color:var(--border)]">
        <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-[color:var(--text-muted)] text-[color:var(--text-muted)]">
          <Check className="h-4 w-4" strokeWidth={2} />
        </span>
        <span className="flex-1 text-[15px] font-medium">
          {checkIns?.length || 0} check-ins registrados
        </span>
        <ChevronRight className="h-5 w-5" strokeWidth={1.8} />
      </div>
    </div>
  );
}

const getBasicCoachAlert = (athlete) => {
  if (!Number(athlete.routineCount || 0)) {
    return "Necesita una rutina asignada";
  }
  if (!Number(athlete.trainingCount || 0)) {
    return "Aún no registra entrenamientos";
  }
  const inactiveDays = daysSince(athlete.lastTraining?.date);
  if (inactiveDays !== null && inactiveDays >= 7) {
    return `Sin entrenar hace ${inactiveDays} días`;
  }
  return "";
};

function CoachHome({
  athletes,
  portfolio,
  loading,
  user,
  inviteOpen,
  setInviteOpen,
  invitation,
  invitationLoading,
  onCopyInvitation,
  onWhatsAppInvitation,
  onRevokeInvitation,
  onRetryInvitation,
  onOpenAthlete,
  onNavigate,
  onDismissWelcome,
}) {
  const { profile } = useUserProfile();
  const athleteById = useMemo(
    () =>
      new Map(
        athletes.map((athlete) => [
          String(athlete.id || athlete._id || ""),
          athlete,
        ]),
      ),
    [athletes],
  );
  const alerts = useMemo(() => {
    if (Array.isArray(portfolio?.alerts) && portfolio.alerts.length) {
      return portfolio.alerts.slice(0, 3).map((alert) => {
        const athleteId = String(alert.athleteId || "");
        return {
          athleteId,
          athleteName: alert.athleteName,
          avatarPhotoId: athleteById.get(athleteId)?.profile?.avatarPhotoId,
          detail: alert.title,
          severity: alert.severity,
        };
      });
    }
    return athletes
      .map((athlete) => ({
        athleteId: String(athlete.id || athlete._id || ""),
        athleteName: athlete.name,
        avatarPhotoId: athlete.profile?.avatarPhotoId,
        detail: getBasicCoachAlert(athlete),
        severity: Number(athlete.routineCount || 0) ? "medium" : "high",
      }))
      .filter((item) => item.detail)
      .slice(0, 3);
  }, [athleteById, athletes, portfolio]);
  const recentActivity = useMemo(
    () =>
      [...athletes]
        .filter((athlete) => athlete.lastTraining?.date)
        .sort((left, right) =>
          String(right.lastTraining.date).localeCompare(
            String(left.lastTraining.date),
          ),
        )
        .slice(0, 3),
    [athletes],
  );
  const summary = portfolio?.summary || {};
  const attentionCount = Number(summary.attention ?? alerts.length);
  const withoutRoutine = athletes.filter(
    (athlete) => !Number(athlete.routineCount || 0),
  ).length;
  const firstName = String(user?.name || "Coach")
    .trim()
    .split(/\s+/)[0];
  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Buenos días"
      : currentHour < 20
        ? "Buenas tardes"
        : "Buenas noches";
  return (
    <main className="mx-auto w-full max-w-[920px] pb-28 text-[color:var(--text)] sm:pb-12">
      <header className="flex min-h-[72px] items-center justify-between gap-3 px-1 sm:px-0">
        <h1 className="text-[36px] font-bold leading-none tracking-[-0.055em] sm:text-[42px]">
          Mis alumnos
        </h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              toast.info("Sin notificaciones nuevas", {
                description:
                  "Te avisaremos cuando un alumno requiera atención.",
              })
            }
            className="relative grid h-14 w-14 place-items-center rounded-full border border-[color:var(--border)] bg-[color:var(--card)] transition-transform active:scale-95"
            aria-label="Notificaciones"
          >
            <Bell className="h-6 w-6" strokeWidth={1.8} />
            {attentionCount > 0 ? (
              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-rose-600 ring-2 ring-[color:var(--card)]" />
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => onNavigate("perfil")}
            className="shrink-0 rounded-full ring-offset-2 ring-offset-[color:var(--bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--text)]"
            aria-label="Abrir perfil"
          >
            <ProfileAvatar
              photoId={profile?.avatarPhotoId || user?.profile?.avatarPhotoId}
              name={user?.name}
              className="h-14 w-14 rounded-full border border-[color:var(--border)] bg-[color:var(--card)] text-sm font-semibold"
            />
          </button>
        </div>
      </header>

      <section className="mt-7 flex items-center justify-between gap-4 px-1">
        <div className="min-w-0">
          <h2 className="truncate text-[26px] font-bold leading-none tracking-[-0.04em] sm:text-[30px]">
            {greeting}, {firstName}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => {
            setInviteOpen((current) => !current);
            onDismissWelcome();
          }}
          className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full border border-[color:var(--border-strong)] bg-transparent px-4 text-sm font-semibold transition-colors hover:bg-[color:var(--card)] active:scale-[0.98]"
        >
          <UserPlus className="h-5 w-5" />
          Invitar alumno
        </button>
      </section>

      {inviteOpen ? (
        <section className="mt-4 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-[0_14px_35px_rgba(20,20,20,0.05)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold tracking-[-0.03em]">
                Invitar alumno
              </h3>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                Envíale este enlace para unirse a tu equipo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInviteOpen(false)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[color:var(--text-muted)] transition hover:bg-[color:var(--bg)]"
              aria-label="Cerrar invitación"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {invitationLoading ? (
            <div className="mt-4 space-y-2.5">
              <div className="h-11 animate-pulse rounded-xl bg-[color:var(--bg)]" />
              <div className="grid grid-cols-2 gap-2.5">
                <div className="h-11 animate-pulse rounded-full bg-[color:var(--bg)]" />
                <div className="h-11 animate-pulse rounded-full bg-[color:var(--bg)]" />
              </div>
            </div>
          ) : invitation?.invitationUrl ? (
            <div className="mt-4">
              <div className="flex h-11 items-center gap-2.5 rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3">
                <Link2 className="h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
                <input
                  type="text"
                  readOnly
                  value={invitation.invitationUrl}
                  onFocus={(event) => event.currentTarget.select()}
                  aria-label="Enlace de invitación"
                  className="min-w-0 flex-1 truncate bg-transparent text-xs font-medium outline-none"
                />
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={onWhatsAppInvitation}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#25d366] px-3 text-xs font-bold text-[#071a0e] transition-transform active:scale-[0.98]"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </button>
                <button
                  type="button"
                  onClick={onCopyInvitation}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[color:var(--text)] px-3 text-xs font-semibold text-[color:var(--bg)] transition-transform active:scale-[0.98]"
                >
                  <Copy className="h-4 w-4" /> Copiar enlace
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 px-1 text-[11px] text-[color:var(--text-muted)]">
                <span>Vence en 7 días · Un solo uso</span>
                <button
                  type="button"
                  onClick={onRevokeInvitation}
                  className="font-semibold underline decoration-current/30 underline-offset-2"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600">
              <span>No pudimos generar el enlace.</span>
              <button
                type="button"
                onClick={onRetryInvitation}
                className="shrink-0 font-bold underline underline-offset-2"
              >
                Reintentar
              </button>
            </div>
          )}
        </section>
      ) : null}

      <section className="mt-4 overflow-hidden rounded-[28px] bg-[#191a19] px-5 py-6 text-white shadow-[0_22px_55px_rgba(15,15,15,0.12)] dark:bg-[#f2f1ec] dark:text-[#121312] sm:px-7 sm:py-7">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-current/75">
          Hoy
        </p>
        <div className="mt-5 grid grid-cols-2">
          <button
            type="button"
            onClick={() => alerts[0] && onOpenAthlete(alerts[0].athleteId)}
            className="flex min-w-0 items-center gap-3 border-r border-current/15 pr-4 text-left"
          >
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/10 dark:bg-black/10">
              <Users className="h-6 w-6" strokeWidth={1.7} />
            </span>
            <span className="min-w-0">
              <strong className="block text-[34px] font-bold leading-none tracking-[-0.04em]">
                {loading ? "—" : attentionCount}
              </strong>
              <span className="mt-1.5 block text-[13px] leading-tight text-current/70">
                requieren atención
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("coach_athletes")}
            className="flex min-w-0 items-center gap-3 pl-4 text-left"
          >
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/10 dark:bg-black/10">
              <ClipboardList className="h-6 w-6" strokeWidth={1.7} />
            </span>
            <span className="min-w-0">
              <strong className="block text-[34px] font-bold leading-none tracking-[-0.04em]">
                {loading ? "—" : withoutRoutine}
              </strong>
              <span className="mt-1.5 block text-[13px] leading-tight text-current/70">
                planes por revisar
              </span>
            </span>
          </button>
        </div>
      </section>

      <div className="mt-7 flex items-center justify-between gap-3 px-1">
        <h2 className="text-[27px] font-bold tracking-[-0.045em]">
          Prioridades
        </h2>
        <button
          type="button"
          onClick={() => onNavigate("coach_athletes")}
          className="inline-flex h-10 items-center gap-1 px-1 text-sm font-medium text-[color:var(--text-muted)]"
        >
          Ver todos <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <section className="mt-3 space-y-2.5">
        {loading ? (
          <div className="space-y-2.5" aria-label="Cargando prioridades">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="grid min-h-[96px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 sm:px-5"
              >
                <span className="h-14 w-14 animate-pulse rounded-full bg-[color:var(--surface-subtle)]" />
                <span>
                  <span className="block h-4 w-24 animate-pulse rounded-full bg-[color:var(--surface-subtle)]" />
                  <span className="mt-2 block h-3 w-36 max-w-full animate-pulse rounded-full bg-[color:var(--surface-subtle)]" />
                </span>
                <span className="h-5 w-3 animate-pulse rounded-full bg-[color:var(--surface-subtle)]" />
              </div>
            ))}
          </div>
        ) : alerts.length ? (
          <div className="space-y-2.5">
            {alerts.map((alert) => (
              <button
                key={`${alert.athleteId}-${alert.detail}`}
                type="button"
                onClick={() => onOpenAthlete(alert.athleteId)}
                className="grid min-h-[96px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 text-left shadow-[0_8px_24px_rgba(20,20,20,0.035)] transition-transform active:scale-[0.99] sm:px-5"
              >
                <ProfileAvatar
                  photoId={alert.avatarPhotoId}
                  name={alert.athleteName}
                  className="h-14 w-14 rounded-full bg-[color:var(--bg)] text-sm font-semibold"
                />
                <span className="min-w-0">
                  <span className="block truncate text-[18px] font-bold tracking-[-0.025em]">
                    {compactName(alert.athleteName)}
                  </span>
                  <span className="mt-1 block truncate text-[15px] font-normal text-[color:var(--text-muted)]">
                    {alert.detail}
                  </span>
                </span>
                <ChevronRight className="h-6 w-6 text-[color:var(--text-muted)]" />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[96px] items-center gap-4 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--card)] px-5 py-5">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-[color:var(--bg)]">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[17px] font-bold">Sin prioridades hoy</p>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                Tus alumnos están al día.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3 px-1">
          <h2 className="text-[27px] font-bold tracking-[-0.045em]">
            Actividad reciente
          </h2>
          <button
            type="button"
            onClick={() => onNavigate("admin_sesiones")}
            className="inline-flex h-10 items-center gap-1 px-1 text-sm font-medium text-[color:var(--text-muted)]"
          >
            Ver todas <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 space-y-2.5">
          {recentActivity.length ? (
            recentActivity.map((athlete) => (
              <button
                key={athlete.id || athlete._id}
                type="button"
                onClick={() =>
                  onOpenAthlete(String(athlete.id || athlete._id || ""))
                }
                className="grid min-h-[94px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-[20px] border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 text-left shadow-[0_8px_24px_rgba(20,20,20,0.035)] sm:px-5"
              >
                <ProfileAvatar
                  photoId={athlete.profile?.avatarPhotoId}
                  name={athlete.name}
                  className="h-14 w-14 rounded-full bg-[color:var(--bg)] text-sm font-semibold"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[18px] font-bold tracking-[-0.025em]">
                    {compactName(athlete.name)}
                  </span>
                  <span className="mt-1 block truncate text-[15px] text-[color:var(--text-muted)]">
                    Completó{" "}
                    {athlete.lastTraining?.routineName || "su entrenamiento"}
                  </span>
                </span>
                <span className="text-sm text-[color:var(--text-muted)]">
                  {relativeTrainingDate(athlete.lastTraining?.date)}
                </span>
              </button>
            ))
          ) : (
            <div className="flex min-h-[94px] items-center rounded-[20px] border border-[color:var(--border)] bg-[color:var(--card)] px-5 text-sm text-[color:var(--text-muted)]">
              Todavía no hay actividad reciente.
            </div>
          )}
        </div>
      </section>
    </main>
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
          <p className="text-[10px] font-black uppercase text-[#181918] dark:text-[#e2ff00]">
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
  pageId = "trainer",
}) {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const onSelectCoachAthleteRef = useRef(onSelectCoachAthlete);
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
  const [selectedId, setSelectedId] = useState(() => {
    if (activeSession) return activeAthleteId;
    if (pageId !== "coach_athletes" || typeof window === "undefined") {
      return "";
    }
    return window.sessionStorage.getItem("rirfit_coach_selected_athlete") || "";
  });
  const [overview, setOverview] = useState(null);
  const [search, setSearch] = useState("");
  const [athleteFilter, setAthleteFilter] = useState("all");
  const [athleteSort, setAthleteSort] = useState("priority");
  const [loading, setLoading] = useState(true);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [initialPlanTemplateId, setInitialPlanTemplateId] = useState("");
  const [editingPlan, setEditingPlan] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [planActionId, setPlanActionId] = useState("");
  const [athleteView, setAthleteView] = useState("summary");
  const [planDetailMode, setPlanDetailMode] = useState(false);
  const [latestCheckIn, setLatestCheckIn] = useState(null);
  const [historyTrainings, setHistoryTrainings] = useState([]);
  const [historyCheckIns, setHistoryCheckIns] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [coachWelcome, setCoachWelcome] = useState(() =>
    typeof window !== "undefined"
      ? window.sessionStorage.getItem("rirfit_coach_welcome") === "1"
      : false,
  );
  const [linkInfo, setLinkInfo] = useState({ coachCode: "", athleteCount: 0 });
  const [linkCodeLoading, setLinkCodeLoading] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [invitationLoading, setInvitationLoading] = useState(false);
  const [invitationRetry, setInvitationRetry] = useState(0);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [planDraft, setPlanDraft] = useState(null);

  useEffect(() => {
    onSelectCoachAthleteRef.current = onSelectCoachAthlete;
  }, [onSelectCoachAthlete]);

  useEffect(() => {
    if (!coachWelcome || typeof window === "undefined") return;
    window.sessionStorage.removeItem("rirfit_coach_welcome");
  }, [coachWelcome]);

  useEffect(() => {
    if (pageId !== "coach_athletes" || typeof window === "undefined") return;
    window.sessionStorage.removeItem("rirfit_coach_selected_athlete");
  }, [pageId]);

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
    } else if (user?.role === "Entrenador") {
      api
        .getPlanTemplates()
        .then((plans) =>
          setPlanCatalog({
            plans: Array.isArray(plans) ? plans : [],
            routines: [],
          }),
        )
        .catch((err) =>
          toast.error(
            err.message || "No se pudieron cargar tus plantillas de planes",
          ),
        );
    } else {
      setPlanCatalog({ plans: [], routines: [] });
    }
  }, [loadAthletes, user?.role]);

  useEffect(() => {
    if (!inviteOpen || invitation) return;
    let active = true;
    setInvitationLoading(true);
    api
      .createCoachInvitation()
      .then((created) => {
        if (!active) return;
        setInvitation(created);
      })
      .catch((error) => {
        if (active) {
          toast.error("No pudimos crear la invitación", {
            description: error.message || "Inténtalo nuevamente.",
          });
        }
      })
      .finally(() => {
        if (active) setInvitationLoading(false);
      });
    return () => {
      active = false;
    };
  }, [invitation, invitationRetry, inviteOpen]);

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

  const copyInvitation = async () => {
    if (!invitation?.invitationUrl) return;
    try {
      await navigator.clipboard.writeText(invitation.invitationUrl);
      toast.success("Enlace copiado", {
        description: "Ya puedes enviárselo a tu alumno.",
      });
    } catch {
      toast.error("No pudimos copiar el enlace");
    }
  };

  const openWhatsAppInvitation = () => {
    if (!invitation?.invitationUrl) return;
    const message = encodeURIComponent(
      `${user?.name || "Tu coach"} te invitó a entrenar en Rirfit. Crea tu cuenta desde aquí: ${invitation.invitationUrl}`,
    );
    window.open(
      `https://wa.me/?text=${message}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const revokeInvitation = async () => {
    if (!invitation?.id) return;
    try {
      await api.revokeCoachInvitation(invitation.id);
      setInvitation(null);
      setInviteOpen(false);
      toast.success("Invitación cancelada");
    } catch (error) {
      toast.error("No pudimos cancelar la invitación", {
        description: error.message || "Inténtalo nuevamente.",
      });
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
      setPlanDetailMode(false);
      setInitialPlanTemplateId("");
      setWeeklyReport(null);
      setLatestCheckIn(null);
      setHistoryTrainings([]);
      setHistoryCheckIns([]);
      return;
    }
    setAthleteView("summary");
    setSelectedPlanId("");
    setWeeklyReport(null);
    let active = true;
    setLoadingOverview(true);
    Promise.all([
      api.getCoachAthleteOverview(selectedId),
      api.getLatestCheckIn(selectedId).catch(() => null),
    ])
      .then(([data, checkInResponse]) => {
        if (!active) return;
        setOverview(data);
        setLatestCheckIn(checkInResponse?.checkIn || null);
      })
      .catch((err) => {
        if (!active) return;
        setOverview(null);
        setSelectedId("");
        onSelectCoachAthleteRef.current(null);
        loadAthletes({ silent: true });
        toast.error(err.message || "El atleta ya no está disponible");
      })
      .finally(() => active && setLoadingOverview(false));
    return () => {
      active = false;
    };
  }, [loadAthletes, selectedId]);

  useEffect(() => {
    if (
      !selectedId ||
      !overview ||
      user?.role !== "Entrenador" ||
      typeof window === "undefined"
    )
      return;
    const wantsAssignment =
      window.sessionStorage.getItem(COACH_PLAN_ASSIGNMENT_KEY) === "1";
    const requestedView = window.sessionStorage.getItem(
      COACH_REQUESTED_VIEW_KEY,
    );
    if (!wantsAssignment && requestedView !== "plan") return;

    window.sessionStorage.removeItem(COACH_PLAN_ASSIGNMENT_KEY);
    window.sessionStorage.removeItem(COACH_REQUESTED_VIEW_KEY);
    setAthleteView("plan");
    setPlanDetailMode(
      window.sessionStorage.getItem("rirfit_coach_plan_detail_active") === "1",
    );
    window.sessionStorage.removeItem("rirfit_coach_plan_detail_active");
    const requestedPlanId = window.sessionStorage.getItem(
      COACH_REQUESTED_PLAN_KEY,
    );
    window.sessionStorage.removeItem(COACH_REQUESTED_PLAN_KEY);
    if (requestedPlanId) setSelectedPlanId(requestedPlanId);
    if (!wantsAssignment) return;
    setInitialPlanTemplateId(
      window.sessionStorage.getItem(COACH_PLAN_TEMPLATE_ASSIGNMENT_KEY) || "",
    );
    window.sessionStorage.removeItem(COACH_PLAN_TEMPLATE_ASSIGNMENT_KEY);
    setEditingPlan(null);
    setPlanDraft(null);
    setCreatingPlan(true);
  }, [overview, selectedId, user?.role]);

  useEffect(() => {
    if (athleteView !== "activity" || !selectedId) return undefined;
    let active = true;
    const to = localDateKey();
    const fromDate = new Date(`${to}T12:00:00`);
    fromDate.setDate(fromDate.getDate() - 29);
    setHistoryLoading(true);
    Promise.all([
      api.getTrainings({
        athleteId: selectedId,
        from: localDateKey(fromDate),
        to,
        page: 1,
        limit: 90,
      }),
      api.getCheckIns(selectedId).catch(() => ({ checkIns: [] })),
    ])
      .then(([trainingResponse, checkInResponse]) => {
        if (!active) return;
        setHistoryTrainings(
          Array.isArray(trainingResponse)
            ? trainingResponse
            : trainingResponse?.items || [],
        );
        setHistoryCheckIns(checkInResponse?.checkIns || []);
      })
      .catch((err) => {
        if (!active) return;
        setHistoryTrainings([]);
        setHistoryCheckIns([]);
        toast.error(err.message || "No se pudo cargar el historial");
      })
      .finally(() => active && setHistoryLoading(false));
    return () => {
      active = false;
    };
  }, [athleteView, selectedId]);

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
    const priorityWeight = { high: 0, medium: 1, normal: 2 };
    return athletes
      .filter((athlete) => {
        if (athleteFilter === "attention") {
          return ["high", "medium"].includes(athlete.priority);
        }
        if (athleteFilter === "active") {
          return !athlete.priority || athlete.priority === "normal";
        }
        return true;
      })
      .filter(
        (athlete) =>
          !query ||
          `${athlete.name} ${athlete.email}`.toLowerCase().includes(query),
      )
      .sort((left, right) => {
        if (athleteSort === "name") {
          return String(left.name || "").localeCompare(
            String(right.name || ""),
          );
        }
        return (
          (priorityWeight[left.priority] ?? 3) -
            (priorityWeight[right.priority] ?? 3) ||
          String(right.lastTraining?.date || "").localeCompare(
            String(left.lastTraining?.date || ""),
          ) ||
          String(left.name || "").localeCompare(String(right.name || ""))
        );
      });
  }, [athleteFilter, athleteSort, athletes, search]);
  const attentionAthletes = athletes.filter((athlete) =>
    ["high", "medium"].includes(athlete.priority),
  ).length;
  const activeAthletes = athletes.filter(
    (athlete) => !athlete.priority || athlete.priority === "normal",
  ).length;

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

  const startTraining = (requestedPlanDay = null) => {
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
    const intendedPlanDay = requestedPlanDay
      ? (activeTrainingPlan?.weeklySchedule || []).find(
          (day) =>
            (requestedPlanDay.slotId &&
              String(day.slotId || "") ===
                String(requestedPlanDay.slotId || "")) ||
            (!requestedPlanDay.slotId &&
              Number(day.dayIndex) === Number(requestedPlanDay.dayIndex) &&
              String(day.routineId || "") ===
                String(requestedPlanDay.routineId || "")),
        )
      : recommendedPlanDay;
    if (intendedPlanDay?.routineId && typeof localStorage !== "undefined") {
      localStorage.setItem(
        "training_plan_routine_intent",
        JSON.stringify({
          routineId: intendedPlanDay.routineId,
          planId: activeTrainingPlan._id || activeTrainingPlan.id,
          slotId: intendedPlanDay.slotId,
          createdAt: Date.now(),
        }),
      );
    }
    toast.success("Sesión preparada", {
      description: `Registrarás el entrenamiento de ${selectedAthlete.name}.`,
    });
    onNavigate("registrar");
  };

  const openHistoryTraining = (training) => {
    const trainingId = training?._id || training?.id;
    if (!selectedAthlete || !trainingId) return;
    const selected = onSelectCoachAthlete({
      id: selectedId,
      name: selectedAthlete.name,
      email: selectedAthlete.email,
    });
    if (selected === false) {
      toast.info("Ya existe una sesión supervisada en curso", {
        description: "Finalízala o cancélala antes de cambiar de alumno.",
      });
      return;
    }
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("edit_training_id");
      localStorage.removeItem("edit_training_date");
      localStorage.setItem("view_training_id", trainingId);
      if (training.date) {
        localStorage.setItem("view_training_date", training.date);
      }
    }
    onNavigate("registrar", { trainingView: true });
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

  if (pageId === "trainer" && user?.role === "Entrenador") {
    return (
      <CoachHome
        athletes={athletes}
        portfolio={portfolio}
        loading={loading}
        user={user}
        inviteOpen={inviteOpen}
        setInviteOpen={setInviteOpen}
        invitation={invitation}
        invitationLoading={invitationLoading}
        onCopyInvitation={copyInvitation}
        onWhatsAppInvitation={openWhatsAppInvitation}
        onRevokeInvitation={revokeInvitation}
        onRetryInvitation={() => {
          setInvitation(null);
          setInvitationRetry((current) => current + 1);
        }}
        onDismissWelcome={() => setCoachWelcome(false)}
        onNavigate={onNavigate}
        onOpenAthlete={(athleteId) => {
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(
              "rirfit_coach_selected_athlete",
              String(athleteId),
            );
          }
          onNavigate("coach_athletes");
        }}
      />
    );
  }

  return (
    <main className="dashboard-shell routines-shell mx-auto w-full max-w-[1440px] pb-24 text-[color:var(--text)] sm:pb-12">
      {!selectedId ? (
        <header className="flex items-center justify-between gap-4 px-1 pb-2 pt-5 lg:hidden">
          <h1 className="text-[39px] font-bold leading-none tracking-[-0.06em]">
            Alumnos
          </h1>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() =>
                toast.info("Sin notificaciones nuevas", {
                  description:
                    "Te avisaremos cuando un alumno requiera atención.",
                })
              }
              className="relative grid h-11 w-11 place-items-center rounded-full transition-transform active:scale-95"
              aria-label="Notificaciones"
            >
              <Bell className="h-7 w-7" strokeWidth={1.8} />
              {attentionAthletes > 0 ? (
                <span className="absolute right-1 top-0.5 h-2.5 w-2.5 rounded-full bg-[#ef5862] ring-[3px] ring-[color:var(--bg)]" />
              ) : null}
            </button>
            <button
              type="button"
              onClick={() => onNavigate("perfil")}
              className="rounded-full ring-offset-2 ring-offset-[color:var(--bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--text)]"
              aria-label="Abrir perfil"
            >
              <ProfileAvatar
                photoId={profile?.avatarPhotoId || user?.profile?.avatarPhotoId}
                name={user?.name}
                className="h-12 w-12 rounded-full border border-[color:var(--border)] bg-[color:var(--card)] text-sm font-semibold"
              />
            </button>
          </div>
        </header>
      ) : null}

      <header className="hidden items-end justify-between gap-4 border-b border-[color:var(--border)] pb-4 lg:flex">
        <div>
          <p className="text-[10px] font-black uppercase text-[#181918] dark:text-[#e2ff00]">
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

      {!selectedId ? (
        <section className="mt-7 px-1 lg:hidden">
          <div className="grid grid-cols-[minmax(0,1fr)_60px] gap-3">
            <label className="relative block">
              <Search
                className="pointer-events-none absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-[color:var(--text-muted)]"
                strokeWidth={1.7}
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar alumno"
                aria-label="Buscar alumno"
                className="h-[60px] w-full rounded-[20px] border border-[color:var(--border)] bg-[color:var(--card)] pl-14 pr-4 text-[17px] font-normal outline-none placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--border-strong)]"
              />
            </label>
            <button
              type="button"
              onClick={() => setInviteOpen((current) => !current)}
              className="grid h-[60px] w-[60px] place-items-center rounded-full bg-[#181918] text-white shadow-[0_12px_28px_rgba(20,20,20,0.15)] transition-transform active:scale-95 dark:bg-[#f2f1ec] dark:text-[#151515]"
              aria-label="Invitar alumno"
            >
              <Plus className="h-8 w-8" strokeWidth={1.7} />
            </button>
          </div>

          <div
            className="mt-4 grid grid-cols-3 gap-2"
            role="group"
            aria-label="Filtrar alumnos"
          >
            {[
              { id: "all", label: "Todos", count: athletes.length },
              { id: "attention", label: "Atención", count: attentionAthletes },
              { id: "active", label: "Activos", count: activeAthletes },
            ].map((filter) => {
              const selected = athleteFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setAthleteFilter(filter.id)}
                  className={`flex h-[52px] min-w-0 items-center justify-center gap-2 rounded-full px-2 text-[16px] transition-all active:scale-[0.98] ${
                    selected
                      ? "bg-[#181918] font-semibold text-white shadow-[0_8px_20px_rgba(20,20,20,0.12)] dark:bg-[#f2f1ec] dark:text-[#151515]"
                      : "bg-[color:var(--surface-subtle)] font-medium text-[color:var(--text-muted)]"
                  }`}
                >
                  <span className="truncate">{filter.label}</span>
                  <span
                    className={
                      selected
                        ? "text-white/70 dark:text-black/55"
                        : "text-[color:var(--text-muted)]"
                    }
                  >
                    {filter.count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {coachWelcome ? (
        <section className="mt-4 overflow-hidden rounded-[22px] bg-[#181918] px-5 py-5 text-white shadow-[0_22px_55px_rgba(0,0,0,0.16)] dark:bg-[#e2ff00] dark:text-black sm:px-6 sm:py-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <span className="grid h-10 w-10 place-items-center rounded-full border border-current/20 bg-white/10 dark:bg-black/5">
                <Sparkles className="h-4 w-4" />
              </span>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-current/60">
                Tu espacio profesional está listo
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
                Empieza con tu primer alumno.
              </h2>
              <p className="mt-2 text-sm font-normal leading-6 text-current/70">
                Comparte tu código privado. El alumno conservará el control y
                deberá aceptar la vinculación desde su perfil.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:min-w-48">
              <div className="rounded-full border border-current/20 px-4 py-2 text-center font-mono text-xs font-bold tracking-[0.08em]">
                {linkCodeLoading ? "PREPARANDO CÓDIGO" : linkInfo.coachCode}
              </div>
              <button
                type="button"
                onClick={() => {
                  setInviteOpen(true);
                  setCoachWelcome(false);
                }}
                className="h-11 rounded-full bg-white px-5 text-xs font-bold text-black dark:bg-black dark:text-white"
              >
                Invitar alumno
              </button>
              <button
                type="button"
                onClick={() => setCoachWelcome(false)}
                className="h-11 rounded-full border border-current/25 px-5 text-xs font-bold"
              >
                Explorar mi panel
              </button>
            </div>
          </div>
        </section>
      ) : null}

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
        <div className="mt-7 grid gap-5 lg:mt-4 lg:grid-cols-[320px_minmax(0,1fr)] xl:gap-7">
          <aside
            className={`${selectedId ? "hidden lg:block" : "block"} lg:sticky lg:top-4 lg:h-[calc(100dvh-7rem)] lg:border-r lg:border-[color:var(--border)] lg:pr-4`}
          >
            <div className="lg:hidden">
              <div className="mb-4 flex items-center justify-between gap-4 px-1">
                <h2 className="min-w-0 truncate text-[27px] font-bold tracking-[-0.045em]">
                  {athleteFilter === "attention"
                    ? "Requieren atención"
                    : athleteFilter === "active"
                      ? "Alumnos activos"
                      : "Todos los alumnos"}
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setAthleteSort((current) =>
                      current === "priority" ? "name" : "priority",
                    )
                  }
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[color:var(--surface-subtle)]"
                  aria-label={
                    athleteSort === "priority"
                      ? "Ordenar alfabéticamente"
                      : "Ordenar por prioridad"
                  }
                  title={
                    athleteSort === "priority"
                      ? "Ordenar alfabéticamente"
                      : "Ordenar por prioridad"
                  }
                >
                  <ListFilter className="h-6 w-6" strokeWidth={1.7} />
                  <ArrowDown className="-ml-1 h-5 w-5" strokeWidth={1.8} />
                </button>
              </div>
              <div className="space-y-2.5">
                {filteredAthletes.map((athlete) => {
                  const id = athlete.id || athlete._id;
                  return (
                    <MobileAthleteCard
                      key={id}
                      athlete={athlete}
                      blocked={
                        Boolean(activeAthleteId) &&
                        String(id) !== activeAthleteId
                      }
                      onClick={() => {
                        if (activeAthleteId && String(id) !== activeAthleteId) {
                          toast.info("Hay una sesión supervisada en curso", {
                            description:
                              "Finalízala o cancélala antes de abrir otro alumno.",
                          });
                          return;
                        }
                        setSelectedId(id);
                      }}
                    />
                  );
                })}
                {!filteredAthletes.length ? (
                  <div className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--card)] px-5 py-10 text-center">
                    <p className="text-base font-semibold">Sin coincidencias</p>
                    <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                      Prueba otro nombre o cambia el filtro.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="hidden lg:block">
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
                        Boolean(activeAthleteId) &&
                        String(id) !== activeAthleteId
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
            </div>
          </aside>

          {!selectedId ? (
            <div className="hidden lg:block">
              {canUsePortfolio ? (
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
              )}
            </div>
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
              <MobileAthleteProfileHeader
                athlete={overview.athlete}
                activeSession={activeSession}
                title={planDetailMode ? "Plan del alumno" : "Perfil del alumno"}
                planDetail={planDetailMode}
                onBack={() => {
                  if (planDetailMode) {
                    setPlanDetailMode(false);
                    onNavigate("rutinas");
                  } else {
                    setSelectedId("");
                    if (!activeSession) onSelectCoachAthlete(null);
                  }
                }}
                onMessage={() => onNavigate("coach_messages")}
                onEditPlan={() => {
                  if (activePlan) setEditingPlan(activePlan);
                  else setCreatingPlan(true);
                }}
                onRelease={releaseAthlete}
              />

              <div className="hidden lg:block">
                <div className="border-b border-[color:var(--border)] pb-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-md bg-[#181918] text-lg font-black text-white dark:rounded-[3px] dark:bg-[#e2ff00] dark:text-black">
                      {initials(overview.athlete.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase text-[#181918] dark:text-[#e2ff00]">
                        {goalLabel(overview.athlete.profile?.goal)}
                      </p>
                      <h2 className="mt-1 line-clamp-2 break-words text-[22px] font-black uppercase leading-none sm:text-[28px]">
                        {overview.athlete.name}
                      </h2>
                      <p className="mt-1 truncate text-xs font-semibold text-[color:var(--text-muted)]">
                        {overview.athlete.email}
                      </p>
                    </div>
                    <details className="overflow-menu relative shrink-0 self-center">
                      <summary
                        className="overflow-menu-trigger cursor-pointer list-none [&::-webkit-details-marker]:hidden"
                        aria-label="Opciones del atleta"
                        title="Opciones del atleta"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </summary>
                      <div className="overflow-menu-panel absolute right-0 top-12 z-30 w-56">
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
              </div>

              <div
                className={`mt-2 grid grid-cols-3 border-b border-[color:var(--border)] lg:hidden ${planDetailMode ? "hidden" : ""}`}
                role="tablist"
                aria-label="Informacion del alumno"
              >
                {[
                  { id: "summary", label: "Resumen" },
                  { id: "plan", label: "Plan" },
                  { id: "activity", label: "Historial" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={athleteView === item.id}
                    onClick={() => setAthleteView(item.id)}
                    className={`relative flex h-11 items-center justify-center border-b-[3px] text-[17px] transition-colors ${
                      athleteView === item.id
                        ? "border-[color:var(--text)] font-semibold text-[color:var(--text)]"
                        : "border-transparent font-normal text-[color:var(--text-muted)]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div
                className="mt-4 hidden grid-cols-4 border-b border-[color:var(--border)] lg:grid"
                role="tablist"
                aria-label="Informacion del atleta"
              >
                {[
                  { id: "summary", label: "Resumen", icon: Activity },
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
                          ? "border-[#181918] text-[#181918] dark:border-[#e2ff00] dark:text-[#e2ff00]"
                          : "border-transparent text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
                      }`}
                    >
                      <Icon className="h-4 w-4" /> {item.label}
                    </button>
                  );
                })}
              </div>

              {athleteView === "summary" ? (
                <AthleteSummaryView
                  overview={overview}
                  activePlan={activePlan}
                  activePlanTimeProgress={activePlanTimeProgress}
                  recommendedPlanDay={recommendedPlanDay}
                  routineNameById={routineNameById}
                  latestCheckIn={latestCheckIn}
                  onOpenPlan={() => setAthleteView("plan")}
                  onOpenHistory={() => setAthleteView("activity")}
                />
              ) : null}

              {athleteView === "plan" ? (
                <>
                  <MobileAthletePlanView
                    overview={overview}
                    activePlan={activePlan}
                    activePlanTimeProgress={activePlanTimeProgress}
                    detailMode={planDetailMode}
                    onEditPlan={() => {
                      if (activePlan) setEditingPlan(activePlan);
                      else setCreatingPlan(true);
                    }}
                    onOpenRoutine={(day) => startTraining(day)}
                  />
                  <div className="hidden lg:block">
                    <section className="mt-5 flex items-center justify-between gap-3 border-b border-[color:var(--border)] pb-3">
                      <div className="min-w-0">
                        <p className="theme-accent-text text-[11px] font-black uppercase">
                          {selectedPlanId
                            ? "Detalle de planificación"
                            : "Programas del atleta"}
                        </p>
                        <h3 className="mt-1 truncate text-xl font-black">
                          {selectedPlanId
                            ? activePlan?.name
                            : "Planificaciones"}
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
                          const trainingDays = (
                            plan.weeklySchedule || []
                          ).filter((day) => day.type === "training");
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
                                  ? "border-[#181918] dark:border-[#e2ff00]"
                                  : "border-[color:var(--border)]"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <Badge
                                  variant={isCurrent ? "active" : plan.status}
                                >
                                  {PLAN_STATUS_LABELS[plan.status] ||
                                    plan.status}
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
                            <details className="overflow-menu relative shrink-0">
                              <summary
                                className="overflow-menu-trigger touch-manipulation cursor-pointer list-none [&::-webkit-details-marker]:hidden"
                                aria-label="Opciones del plan"
                                title="Opciones del plan"
                              >
                                <MoreVertical className="h-5 w-5" />
                              </summary>
                              <div className="overflow-menu-panel absolute right-0 top-12 z-50 w-52 max-w-[calc(100vw-2rem)]">
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
                                    <CheckCircle2 className="h-4 w-4" />{" "}
                                    Finalizar plan
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
                                className="h-full bg-[#181918] transition-all dark:bg-[#e2ff00]"
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
                          {(activePlan.weeklySchedule || []).map(
                            (day, index) => (
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
                            ),
                          )}
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
                  </div>
                </>
              ) : null}

              <div className={athleteView === "activity" ? "" : "mt-6"}>
                {athleteView === "activity" ? (
                  <>
                    <MobileAthleteHistoryView
                      trainings={historyTrainings}
                      checkIns={historyCheckIns}
                      activePlan={activePlan}
                      loading={historyLoading}
                      onOpenTraining={openHistoryTraining}
                    />
                    <div className="hidden lg:block">
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
                    </div>
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
          initialPlanTemplateId={initialPlanTemplateId}
          initialData={editingPlan || planDraft?.plan}
          replacingPlan={editingPlan ? null : activePlan}
          onSave={savePlan}
          onClose={() => {
            setCreatingPlan(false);
            setInitialPlanTemplateId("");
            setEditingPlan(null);
            setPlanDraft(null);
          }}
        />
      ) : null}
    </main>
  );
}
