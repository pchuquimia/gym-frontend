import { motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  ChartNoAxesColumnIncreasing,
  Check,
  ChevronRight,
  Clock3,
} from "lucide-react";
import ProfileAvatar from "../profile/ProfileAvatar";

const WEEKDAY_LABELS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const DAILY_CARD_IMAGES = Object.freeze({
  checkIn: "/images/daily-checkin-card.webp",
  completed: "/images/daily-plan-ready-card.webp",
  finalAssessment: "/images/daily-final-assessment-card.webp",
  hydration: "/images/daily-hydration-card.webp",
  measurements: "/images/daily-measurements-card.webp",
  photos: "/images/daily-progress-photos-card.webp",
  plan: "/images/daily-planning-card.webp",
  ready: "/images/daily-plan-ready-card.webp",
  recovery: "/images/daily-recovery-card.webp",
  weight: "/images/daily-weight-card.webp",
});

function CardThumbnail({ src }) {
  return (
    <img
      src={src}
      alt=""
      width="512"
      height="512"
      loading="lazy"
      decoding="async"
    />
  );
}

const formatHeaderDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Hoy";
  const formatted = new Intl.DateTimeFormat("es-BO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const formatSubmittedAt = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "Evaluación recibida";
  return `Enviada el ${date.toLocaleDateString("es-BO", {
    day: "numeric",
    month: "short",
  })}`;
};

function MissionStatus({ completed, tone = "default" }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.span
      initial={
        completed && !reduceMotion ? { scale: 0.72, opacity: 0.35 } : false
      }
      animate={{ scale: 1, opacity: 1 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 480, damping: 24, mass: 0.5 }
      }
      className={`mobile-daily-plan__status ${completed ? "is-complete" : ""} ${tone === "rest" ? "is-rest" : ""}`}
      aria-hidden="true"
    >
      {completed ? <Check /> : null}
    </motion.span>
  );
}

function WeekDay({ day }) {
  const date = new Date(`${day.key}T12:00:00`);
  const isValid = !Number.isNaN(date.getTime());
  return (
    <div
      className={`mobile-daily-plan__day ${day.isToday ? "is-today" : ""} ${day.trained ? "is-trained" : ""}`}
      aria-current={day.isToday ? "date" : undefined}
    >
      <span>{isValid ? WEEKDAY_LABELS[date.getDay()] : day.label}</span>
      <strong>{isValid ? date.getDate() : ""}</strong>
      <i aria-hidden="true">{day.trained ? <Check /> : null}</i>
    </div>
  );
}

function DashboardHeader({
  date,
  profile,
  user,
  adminControl,
  onOpenProfile,
  notificationUnread = 0,
  onOpenNotifications,
}) {
  return (
    <header className="mobile-daily-plan__header">
      <div>
        <h1>Tu día</h1>
        <p>{formatHeaderDate(date)}</p>
      </div>
      <div className="mobile-daily-plan__header-actions">
        {adminControl}
        <button
          type="button"
          className="mobile-daily-plan__notification"
          onClick={onOpenNotifications}
          aria-label={`Notificaciones${notificationUnread ? `, ${notificationUnread} sin leer` : ""}`}
        >
          <Bell />
          {notificationUnread ? <i>{notificationUnread}</i> : null}
        </button>
        <button
          type="button"
          onClick={onOpenProfile}
          className="mobile-daily-plan__avatar"
          aria-label="Abrir perfil"
        >
          <ProfileAvatar
            photoId={profile?.avatarPhotoId || user?.profile?.avatarPhotoId}
            name={profile?.name || user?.name}
            className="h-full w-full"
            fallbackClassName="bg-[#e8e1d8] text-sm font-semibold text-[#252525]"
          />
        </button>
      </div>
    </header>
  );
}

function CoachContext({ coach, onOpen }) {
  const coachName = coach?.name || "Tu coach";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mobile-daily-plan__coach-card"
    >
      <span className="mobile-daily-plan__coach-avatar">
        {coach?.avatarPhotoId ? (
          <ProfileAvatar
            photoId={coach.avatarPhotoId}
            name={coachName}
            className="h-full w-full"
          />
        ) : (
          <ProfileAvatar name={coachName} className="h-full w-full" />
        )}
      </span>
      <span className="mobile-daily-plan__coach-copy">
        <strong>{coachName}</strong>
        <small className="is-connected">Vinculado como tu coach</small>
      </span>
      <ChevronRight aria-hidden="true" />
    </button>
  );
}

function ManagedOnboarding({
  stage,
  coach,
  submittedAt,
  planning,
  onStartEvaluation,
}) {
  const pending = stage === "evaluation_pending";
  const scheduled = stage === "plan_scheduled";
  const title = pending
    ? "Completa tu evaluación inicial"
    : scheduled
      ? "Tu plan está listo"
      : "Tu coach está preparando tu plan";
  const description = pending
    ? "Responde unas preguntas para que tu planificación parta de tu situación real."
    : scheduled
      ? `${planning?.name || "Tu nueva planificación"} comenzará${planning?.startDate ? ` el ${new Date(planning.startDate).toLocaleDateString("es-BO", { day: "numeric", month: "long", timeZone: "UTC" })}` : " pronto"}.`
      : `${coach?.name || "Tu coach"} ya recibió tu evaluación y está definiendo tus entrenamientos.`;
  const thumbnail = pending
    ? DAILY_CARD_IMAGES.checkIn
    : scheduled
      ? DAILY_CARD_IMAGES.ready
      : DAILY_CARD_IMAGES.plan;
  return (
    <>
      <section className="mobile-daily-plan__onboarding">
        <div className="mobile-daily-plan__section-heading">
          <h2>{pending ? "Tu punto de partida" : "Estado de tu plan"}</h2>
          {!pending ? <span>Evaluación enviada</span> : null}
        </div>
        <div className="mobile-daily-plan__onboarding-card">
          <span className="mobile-daily-plan__onboarding-icon is-image">
            <CardThumbnail src={thumbnail} />
          </span>
          <div>
            <h3>{title}</h3>
            <p>{description}</p>
            <small>
              <Clock3 /> {pending ? "5–7 min" : formatSubmittedAt(submittedAt)}
            </small>
          </div>
          {pending ? (
            <button
              type="button"
              onClick={onStartEvaluation}
              className="mobile-daily-plan__primary-action"
            >
              Comenzar evaluación
            </button>
          ) : null}
        </div>
      </section>
    </>
  );
}

function CheckInMission({ task, onOpen, readOnly }) {
  if (!task) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={readOnly}
      className="mobile-daily-plan__mission is-tracking"
    >
      <MissionStatus completed={task.completed} />
      <span className="mobile-daily-plan__visual mobile-daily-plan__visual--wellness">
        <CardThumbnail src={DAILY_CARD_IMAGES.checkIn} />
      </span>
      <span className="mobile-daily-plan__mission-copy">
        <strong>{task.title}</strong>
        <small>{task.subtitle}</small>
      </span>
      {task.completed ? (
        <span className="mobile-daily-plan__ready">Completado</span>
      ) : (
        <ChevronRight className="mobile-daily-plan__chevron" />
      )}
    </button>
  );
}

function WorkoutMission({ task, onOpen, readOnly }) {
  if (!task) return null;
  const actionLabel =
    task.actionLabel ||
    (task.completed ? "Ver resumen" : "Comenzar entrenamiento");
  const compactActionLabel = actionLabel.replace(/\s+entrenamiento$/i, "");

  return (
    <div
      className={`mobile-daily-plan__workout-card ${task.completed ? "is-complete" : ""}`}
    >
      <MissionStatus
        completed={task.completed}
        tone={task.type === "rest" ? "rest" : "default"}
      />
      <span className="mobile-daily-plan__visual mobile-daily-plan__visual--workout">
        <CardThumbnail
          src={
            task.type === "rest"
              ? DAILY_CARD_IMAGES.recovery
              : task.type === "completed"
                ? DAILY_CARD_IMAGES.completed
                : task.image || "/images/workout-hero-model.webp"
          }
        />
      </span>
      <div className="mobile-daily-plan__workout-content">
        <span className="mobile-daily-plan__mission-copy">
          <strong>{task.title}</strong>
          <small>{task.subtitle}</small>
        </span>
        <button
          type="button"
          onClick={onOpen}
          disabled={readOnly}
          className="mobile-daily-plan__workout-action"
          aria-label={actionLabel}
        >
          <span>{compactActionLabel}</span>
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

const QUICK_REGISTRATION_DEFAULTS = Object.freeze([
  {
    id: "quick-weight",
    type: "weight",
    title: "Peso",
    subtitle: "Registrar peso",
  },
  {
    id: "quick-photos",
    type: "photos",
    title: "Fotos",
    subtitle: "Añadir progreso",
  },
  {
    id: "quick-measurements",
    type: "measurements",
    title: "Medidas",
    subtitle: "Actualizar medidas",
  },
]);

const TRACKING_IMAGES = Object.freeze({
  final_evaluation: DAILY_CARD_IMAGES.finalAssessment,
  measurements: DAILY_CARD_IMAGES.measurements,
  photos: DAILY_CARD_IMAGES.photos,
  weight: DAILY_CARD_IMAGES.weight,
});

function QuickRegistration({ task, onOpen, readOnly }) {
  const thumbnail =
    task.type === "hydration"
      ? DAILY_CARD_IMAGES.hydration
      : TRACKING_IMAGES[task.type] || DAILY_CARD_IMAGES.checkIn;

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={readOnly}
      className="mobile-daily-plan__quick-action"
    >
      <span className="mobile-daily-plan__quick-visual">
        <CardThumbnail src={thumbnail} />
      </span>
      <span>
        <strong>{task.title}</strong>
        <small>{task.subtitle}</small>
      </span>
      <ChevronRight className="mobile-daily-plan__chevron" />
    </button>
  );
}

function TrackingMission({ task, onOpen, readOnly }) {
  const thumbnail = TRACKING_IMAGES[task.type] || DAILY_CARD_IMAGES.checkIn;
  return (
    <button
      type="button"
      onClick={() => onOpen?.(task.type)}
      disabled={readOnly}
      className={`mobile-daily-plan__mission ${task.required ? "is-tracking" : "is-optional"}`}
    >
      <MissionStatus completed={task.completed} />
      <span className="mobile-daily-plan__visual">
        <CardThumbnail src={thumbnail} />
      </span>
      <span className="mobile-daily-plan__mission-copy">
        <strong>{task.title}</strong>
        <small>{task.subtitle}</small>
        {!task.required ? <em>Opcional</em> : null}
      </span>
      {task.completed ? (
        <span className="mobile-daily-plan__ready">Completado</span>
      ) : (
        <ChevronRight className="mobile-daily-plan__chevron" />
      )}
    </button>
  );
}

function ActivePlanContext({ plan, onOpen }) {
  if (!plan) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mobile-daily-plan__plan-card"
    >
      <span>
        <CardThumbnail src={DAILY_CARD_IMAGES.plan} />
      </span>
      <div>
        <strong>{plan.name}</strong>
        <small>
          Semana {plan.currentWeek} de {plan.durationWeeks}
        </small>
        <i>
          <b style={{ width: `${plan.progress}%` }} />
        </i>
      </div>
      <em>Ver plan</em>
      <ChevronRight />
    </button>
  );
}

function WeeklyMuscleChart({ summary, onOpenDetails }) {
  const muscles = summary?.byPrimaryMuscle || [];
  const visibleMuscles = muscles.slice(0, 5);
  const maxSets = visibleMuscles[0]?.sets || 1;
  const sessions = summary?.sessions || 0;

  return (
    <section
      className="mobile-daily-plan__muscle-chart"
      aria-labelledby="mobile-daily-plan-muscle-title"
    >
      <div className="mobile-daily-plan__muscle-heading">
        <div>
          <h2 id="mobile-daily-plan-muscle-title">
            Series por grupo muscular
          </h2>
          <p>
            Esta semana · {sessions} {sessions === 1 ? "sesión" : "sesiones"}
          </p>
        </div>
        {muscles.length > visibleMuscles.length && onOpenDetails ? (
          <button type="button" onClick={onOpenDetails}>
            Ver todos
          </button>
        ) : null}
      </div>
      {visibleMuscles.length ? (
        <ul className="mobile-daily-plan__muscle-list">
          {visibleMuscles.map(({ name, sets }) => (
            <li key={name} className="mobile-daily-plan__muscle-row">
              <span>{name}</span>
              <strong>
                {sets} {sets === 1 ? "serie" : "series"}
              </strong>
              <div className="mobile-daily-plan__muscle-track" aria-hidden="true">
                <span style={{ width: `${(sets / maxSets) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mobile-daily-plan__muscle-empty">
          Completa una serie para ver qué grupos musculares trabajaste.
        </p>
      )}
    </section>
  );
}

export default function MobileDailyPlan({
  date,
  profile,
  user,
  adminControl = null,
  weekDays = [],
  journeyStage = null,
  planningContext = null,
  coach = null,
  activePlanContext = null,
  checkInTask = null,
  workoutTask,
  hydrationTask = null,
  trackingMissions = [],
  weeklyMuscleSummary = null,
  readOnly = false,
  onOpenProfile,
  onStartEvaluation,
  onOpenCoach,
  onOpenPlan,
  onOpenCheckIn,
  onOpenWorkout,
  onOpenHydration,
  onOpenWeighIn,
  onOpenTrackingMission,
  onOpenMuscleDetails,
  notifications = [],
  notificationUnread = 0,
  onReadNotifications,
}) {
  const requiredTracking = trackingMissions.filter((task) => task.required);
  const requiredTrackingTypes = new Set(
    requiredTracking.map((task) => task.type),
  );
  const trackingByType = new Map(
    trackingMissions.map((task) => [task.type, task]),
  );
  const quickRegistrations = [
    ...QUICK_REGISTRATION_DEFAULTS.map((fallback) => ({
      ...fallback,
      ...trackingByType.get(fallback.type),
      required: false,
    })),
    hydrationTask
      ? { ...hydrationTask, id: "quick-hydration", type: "hydration" }
      : null,
  ].filter(
    (task) => task && !task.completed && !requiredTrackingTypes.has(task.type),
  );
  const taskCount =
    (workoutTask ? 1 : 0) + (checkInTask ? 1 : 0) + requiredTracking.length;
  const completedCount =
    Number(Boolean(workoutTask?.completed)) +
    Number(Boolean(checkInTask?.completed)) +
    requiredTracking.filter((task) => task.completed).length;
  const progress = taskCount ? (completedCount / taskCount) * 100 : 0;
  const quickRegistrationSummary = new Intl.ListFormat("es", {
    style: "long",
    type: "conjunction",
  }).format(
    quickRegistrations.map((task) => task.title.toLocaleLowerCase("es")),
  );
  const openTracking = (type) => {
    if (type === "weight") {
      onOpenWeighIn?.();
      return;
    }
    onOpenTrackingMission?.(type);
  };

  return (
    <section className="mobile-daily-plan" aria-label="Tu plan del día">
      <DashboardHeader
        date={date}
        profile={profile}
        user={user}
        adminControl={adminControl}
        onOpenProfile={onOpenProfile}
        notificationUnread={notificationUnread}
        onOpenNotifications={() => {
          const panel = document.getElementById("athlete-notification-panel");
          if (panel) panel.open = !panel.open;
          onReadNotifications?.();
        }}
      />
      {notifications.length ? (
        <details
          id="athlete-notification-panel"
          className="mobile-daily-plan__notifications"
        >
          <summary>Últimas novedades</summary>
          {notifications.slice(0, 3).map((item) => (
            <div key={item._id || item.id}>
              <strong>{item.title}</strong>
              <small>{item.message}</small>
            </div>
          ))}
        </details>
      ) : null}
      {coach ? <CoachContext coach={coach} onOpen={onOpenCoach} /> : null}
      {!journeyStage || journeyStage === "plan_assigned" ? (
        <>
          <div
            className="mobile-daily-plan__week"
            aria-label="Actividad semanal"
          >
            {weekDays.map((day) => (
              <WeekDay key={day.key} day={day} />
            ))}
          </div>
          <ActivePlanContext plan={activePlanContext} onOpen={onOpenPlan} />
        </>
      ) : null}

      {journeyStage && journeyStage !== "plan_assigned" ? (
        <ManagedOnboarding
          stage={journeyStage}
          coach={coach}
          submittedAt={user?.coachIntake?.submittedAt}
          planning={planningContext}
          onStartEvaluation={onStartEvaluation}
        />
      ) : (
        <>
          <div className="mobile-daily-plan__workspace">
            <section className="mobile-daily-plan__missions">
              <div className="mobile-daily-plan__section-heading">
                <h2>Misión de hoy</h2>
                <span>
                  {completedCount} de {taskCount}
                </span>
              </div>
              <div
                className="mobile-daily-plan__progress"
                role="progressbar"
                aria-label="Progreso de la misión de hoy"
                aria-valuemin="0"
                aria-valuemax={taskCount}
                aria-valuenow={completedCount}
              >
                <motion.span
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.32 }}
                />
              </div>
              <div className="mobile-daily-plan__mission-list">
                <WorkoutMission
                  task={workoutTask}
                  onOpen={onOpenWorkout}
                  readOnly={readOnly}
                />
                <CheckInMission
                  task={checkInTask}
                  onOpen={onOpenCheckIn}
                  readOnly={readOnly}
                />
                {requiredTracking.map((task) => (
                  <TrackingMission
                    key={task.id || task.type}
                    task={task}
                    onOpen={openTracking}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            </section>
            <WeeklyMuscleChart
              summary={weeklyMuscleSummary}
              onOpenDetails={onOpenMuscleDetails}
            />
            {quickRegistrations.length ? (
              <section
                className="mobile-daily-plan__quick-registrations"
                aria-labelledby="mobile-daily-plan-progress-title"
              >
                <div className="mobile-daily-plan__quick-heading">
                  <span className="mobile-daily-plan__quick-heading-icon">
                    <ChartNoAxesColumnIncreasing aria-hidden="true" />
                  </span>
                  <div className="mobile-daily-plan__quick-heading-copy">
                    <h2 id="mobile-daily-plan-progress-title">
                      Registrar progreso
                    </h2>
                    <p>Opcional · {quickRegistrationSummary}</p>
                  </div>
                </div>
                <div className="mobile-daily-plan__quick-grid">
                  {quickRegistrations.map((task) => (
                    <QuickRegistration
                      key={task.id || task.type}
                      task={task}
                      readOnly={readOnly}
                      onOpen={() =>
                        task.type === "hydration"
                          ? onOpenHydration?.()
                          : openTracking(task.type)
                      }
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
