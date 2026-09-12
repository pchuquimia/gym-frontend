import { motion, useReducedMotion } from "framer-motion";
import { Bell, Check, ChevronRight, Clock3 } from "lucide-react";
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
  onOpenMenu,
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
          onClick={onOpenMenu}
          className="mobile-daily-plan__avatar"
          aria-label="Abrir menú principal"
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

function CoachContext({ coach, activePlan, onOpen }) {
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
        <strong>{activePlan ? `Plan de ${coachName}` : coachName}</strong>
        <small className={activePlan ? "" : "is-connected"}>
          {activePlan ? activePlan.name : "Vinculado"}
        </small>
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
      <span className="mobile-daily-plan__mission-copy">
        <strong>{task.title}</strong>
        <small>{task.subtitle}</small>
      </span>
      <button
        type="button"
        onClick={onOpen}
        disabled={readOnly}
        className="mobile-daily-plan__workout-action"
      >
        {task.actionLabel ||
          (task.completed ? "Ver resumen" : "Comenzar entrenamiento")}
      </button>
    </div>
  );
}

function HydrationMission({ task, onOpen, readOnly }) {
  if (!task) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={readOnly}
      className="mobile-daily-plan__mission is-optional"
    >
      <MissionStatus completed={task.completed} />
      <span className="mobile-daily-plan__visual mobile-daily-plan__visual--hydration">
        <CardThumbnail src={DAILY_CARD_IMAGES.hydration} />
      </span>
      <span className="mobile-daily-plan__mission-copy">
        <strong>{task.title}</strong>
        <small>{task.subtitle}</small>
        <em>Opcional</em>
      </span>
      <ChevronRight className="mobile-daily-plan__chevron" />
    </button>
  );
}

const TRACKING_IMAGES = Object.freeze({
  final_evaluation: DAILY_CARD_IMAGES.finalAssessment,
  measurements: DAILY_CARD_IMAGES.measurements,
  photos: DAILY_CARD_IMAGES.photos,
  weight: DAILY_CARD_IMAGES.weight,
});

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
  readOnly = false,
  onOpenMenu,
  onStartEvaluation,
  onOpenCoach,
  onOpenPlan,
  onOpenCheckIn,
  onOpenWorkout,
  onOpenHydration,
  onOpenTrackingMission,
  notifications = [],
  notificationUnread = 0,
  onReadNotifications,
}) {
  const requiredTracking = trackingMissions.filter((task) => task.required);
  const optionalTracking = trackingMissions.filter((task) => !task.required);
  const taskCount =
    (workoutTask ? 1 : 0) + (checkInTask ? 1 : 0) + requiredTracking.length;
  const completedCount =
    Number(Boolean(workoutTask?.completed)) +
    Number(Boolean(checkInTask?.completed)) +
    requiredTracking.filter((task) => task.completed).length;
  const progress = taskCount ? (completedCount / taskCount) * 100 : 0;

  return (
    <section
      className="mobile-daily-plan md:hidden"
      aria-label="Tu plan del día"
    >
      <DashboardHeader
        date={date}
        profile={profile}
        user={user}
        adminControl={adminControl}
        onOpenMenu={onOpenMenu}
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
      {coach ? (
        <CoachContext
          coach={coach}
          activePlan={activePlanContext}
          onOpen={onOpenCoach}
        />
      ) : null}
      {!journeyStage || journeyStage === "plan_assigned" ? (
        <div className="mobile-daily-plan__week" aria-label="Actividad semanal">
          {weekDays.map((day) => (
            <WeekDay key={day.key} day={day} />
          ))}
        </div>
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
                  key={task.id}
                  task={task}
                  onOpen={onOpenTrackingMission}
                  readOnly={readOnly}
                />
              ))}
              {optionalTracking.length || hydrationTask ? (
                <details className="mobile-daily-plan__optional-tasks">
                  <summary>Otros registros</summary>
                  {optionalTracking.map((task) => (
                    <TrackingMission
                      key={task.id}
                      task={task}
                      onOpen={onOpenTrackingMission}
                      readOnly={readOnly}
                    />
                  ))}
                  <HydrationMission
                    task={hydrationTask}
                    onOpen={onOpenHydration}
                    readOnly={readOnly}
                  />
                </details>
              ) : null}
            </div>
          </section>
          <ActivePlanContext plan={activePlanContext} onOpen={onOpenPlan} />
        </>
      )}
    </section>
  );
}
