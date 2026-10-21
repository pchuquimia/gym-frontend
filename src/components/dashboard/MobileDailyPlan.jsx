import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Camera,
  Check,
  ChevronRight,
  ClipboardList,
  Clock3,
  Droplets,
  Dumbbell,
  Heart,
  Ruler,
  Weight,
} from "lucide-react";
import WorkoutSeriesCard from "./WorkoutMuscleChart";
import ProfileAvatar from "../profile/ProfileAvatar";
import "./starter-experience.css";
import "./daily-workspace.css";

const WEEKDAY_LABELS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const DAILY_CARD_IMAGES = Object.freeze({
  checkIn: "/images/daily-checkin-card.webp",
  completed: "/images/dashboard-workout-completed-color.jpg",
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
        <span className="daily-workspace__brand" aria-hidden="true">
          RIRFIT
        </span>
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

function CheckInMission({ task, onOpen, readOnly, primary }) {
  if (!task) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={readOnly}
      className={`daily-check-in ${primary ? "is-primary" : ""} ${task.completed ? "is-complete" : ""}`}
      aria-label={
        task.completed ? `Completado: ${task.title}` : `Completar ${task.title}`
      }
    >
      <span className="daily-check-in__icon" aria-hidden="true">
        {task.completed ? <Check /> : <Heart />}
      </span>
      <span className="daily-check-in__copy">
        <strong>
          {task.completed ? "Check-in completado" : "Check-in pendiente"}
        </strong>
        <small>{task.subtitle}</small>
      </span>
      {primary ? (
        <span className="daily-check-in__action">
          Completar check-in <ArrowRight aria-hidden="true" />
        </span>
      ) : (
        <ChevronRight className="daily-check-in__chevron" aria-hidden="true" />
      )}
    </button>
  );
}

function WorkoutMission({ task, onOpen, readOnly }) {
  if (!task) return null;
  const actionLabel =
    task.actionLabel ||
    (task.completed ? "Ver resumen" : "Comenzar entrenamiento");
  const isRest = task.type === "rest";
  const isCompleted = task.type === "completed" || (task.completed && !isRest);
  const label = isRest
    ? "Recuperación"
    : isCompleted
      ? "Completado"
      : task.type === "active"
        ? "En curso"
        : "Tu entrenamiento";
  const image = isRest
    ? DAILY_CARD_IMAGES.recovery
    : isCompleted
      ? DAILY_CARD_IMAGES.completed
      : task.image || "/images/workout-hero-model.webp";

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={readOnly}
      aria-label={actionLabel}
      className={`daily-workout ${isCompleted ? "is-complete" : ""} ${isRest ? "is-rest" : ""}`}
    >
      <span className="daily-workout__photo">
        <img
          src={image}
          alt=""
          width="1024"
          height="512"
          decoding="async"
          fetchPriority="high"
        />
        <span className="daily-workout__badge">
          {isCompleted && <Check aria-hidden="true" />}
          {label}
        </span>
      </span>
      <span className="daily-workout__body">
        <span className="daily-workout__copy">
          <strong>{task.title}</strong>
          <small>{task.subtitle}</small>
        </span>
        <span
          className={`daily-workout__action ${!isCompleted && !isRest ? "is-primary" : ""}`}
        >
          {actionLabel}
          {isCompleted ? (
            <ArrowUpRight aria-hidden="true" />
          ) : (
            <ArrowRight aria-hidden="true" />
          )}
        </span>
      </span>
    </button>
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

function QuickRegistration({ task, onOpen, readOnly }) {
  const Icon =
    {
      weight: Weight,
      photos: Camera,
      measurements: Ruler,
      hydration: Droplets,
    }[task.type] || ClipboardList;

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={readOnly}
      className="daily-quick-action"
      aria-label={`${task.title}${task.subtitle ? `: ${task.subtitle}` : ""}`}
      title={task.subtitle}
    >
      <Icon aria-hidden="true" />
      <span>{task.type === "hydration" ? "Agua" : task.title}</span>
    </button>
  );
}

function TrackingMission({ task, onOpen, readOnly }) {
  const Icon =
    { weight: Weight, photos: Camera, measurements: Ruler }[task.type] ||
    ClipboardList;
  return (
    <button
      type="button"
      onClick={() => onOpen?.(task.type)}
      disabled={readOnly}
      className={`daily-tracking ${task.completed ? "is-complete" : ""}`}
      aria-label={
        task.completed
          ? `Completado: ${task.title}${task.subtitle ? `. ${task.subtitle}` : ""}`
          : undefined
      }
    >
      <span className="daily-tracking__icon" aria-hidden="true">
        {task.completed ? <Check /> : <Icon />}
      </span>
      <span className="daily-tracking__copy">
        <strong>{task.title}</strong>
        <small>{task.subtitle}</small>
        {!task.required ? <em>Opcional</em> : null}
      </span>
      <ChevronRight aria-hidden="true" />
    </button>
  );
}

function ActivePlanContext({ plan, onOpen }) {
  if (!plan) return null;
  return (
    <button type="button" onClick={onOpen} className="daily-plan-row">
      <ClipboardList aria-hidden="true" />
      <span className="daily-plan-row__copy">
        <strong>{plan.name}</strong>
        <small>
          Semana {plan.currentWeek} de {plan.durationWeeks}
        </small>
      </span>
      <em>Ver progreso</em>
      <ChevronRight aria-hidden="true" />
    </button>
  );
}

function StarterExperience({
  stage,
  readOnly,
  onCreateRoutine,
  onStartWorkout,
  onOpenLibrary,
}) {
  const hasRoutine = stage === "ready_to_train";
  const primaryAction = hasRoutine ? onStartWorkout : onCreateRoutine;
  const steps = [
    {
      title: hasRoutine ? "Rutina creada" : "Crea tu rutina",
      detail: "Organiza lo que vas a entrenar",
      complete: hasRoutine,
      current: !hasRoutine,
    },
    {
      title: "Completa una sesión",
      detail: "Registra tus series y pesos",
      complete: false,
      current: hasRoutine,
    },
    {
      title: "Descubre tu progreso",
      detail: "Tus métricas aparecerán aquí",
      complete: false,
      current: false,
    },
  ];

  return (
    <div className="mobile-daily-plan__starter">
      <div className="mobile-daily-plan__starter-intro">
        <p>BIENVENIDO A RIRFIT</p>
        <h2>
          {hasRoutine
            ? "Tu primer entrenamiento te espera."
            : "Tu progreso empieza hoy."}
        </h2>
        <span>
          {hasRoutine
            ? "Ya tienes una rutina. Empieza una sesión para registrar tus avances."
            : "Prepara tu entrenamiento y empieza a registrar tus avances."}
        </span>
      </div>

      <section
        className={`mobile-daily-plan__starter-hero ${hasRoutine ? "mobile-daily-plan__starter-hero--ready" : ""}`}
      >
        {hasRoutine ? (
          <img
            className="mobile-daily-plan__starter-hero-image"
            src="/images/routine-upper.webp"
            alt=""
            aria-hidden="true"
          />
        ) : (
          <span className="mobile-daily-plan__starter-icon" aria-hidden="true">
            <Dumbbell />
          </span>
        )}
        <h3>
          {hasRoutine ? "Empieza tu primera sesión" : "Crea tu primera rutina"}
        </h3>
        <p>
          {hasRoutine
            ? "Elige tu rutina, registra cada serie y guarda tu entrenamiento."
            : "Elige tus ejercicios y prepara tu primera sesión. Podrás cambiarla cuando quieras."}
        </p>
        <button type="button" onClick={primaryAction} disabled={readOnly}>
          {hasRoutine ? "Iniciar entrenamiento" : "Crear rutina"}
          <ArrowRight aria-hidden="true" />
        </button>
      </section>

      <section
        className="mobile-daily-plan__starter-journey"
        aria-labelledby="starter-journey-title"
      >
        <div className="mobile-daily-plan__starter-heading">
          <h3 id="starter-journey-title">Tu camino</h3>
          <span>3 pasos sencillos</span>
        </div>
        <ol>
          {steps.map((step, index) => {
            const content = (
              <>
                <span
                  className={`mobile-daily-plan__starter-number ${step.complete ? "is-complete" : ""} ${step.current ? "is-current" : ""}`}
                >
                  {step.complete ? <Check aria-hidden="true" /> : index + 1}
                </span>
                <span className="mobile-daily-plan__starter-step-copy">
                  <strong>{step.title}</strong>
                  <small>{step.detail}</small>
                </span>
                {step.current ? <ChevronRight aria-hidden="true" /> : null}
              </>
            );
            return (
              <li key={step.title}>
                {step.current ? (
                  <button
                    type="button"
                    onClick={primaryAction}
                    disabled={readOnly}
                    aria-current="step"
                  >
                    {content}
                  </button>
                ) : (
                  <div>{content}</div>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <button
        type="button"
        className="mobile-daily-plan__starter-explore"
        onClick={onOpenLibrary}
        disabled={readOnly}
      >
        <img src="/images/workout-hero-model.webp" alt="" loading="lazy" />
        <span>
          <strong>¿Quieres explorar primero?</strong>
          <small>Conoce la biblioteca de ejercicios</small>
        </span>
        <ChevronRight aria-hidden="true" />
      </button>
    </div>
  );
}

export default function MobileDailyPlan({
  date,
  profile,
  user,
  adminControl = null,
  weekDays = [],
  starterStage = null,
  journeyStage = null,
  planningContext = null,
  coach = null,
  activePlanContext = null,
  activitySummary = null,
  checkInTask = null,
  workoutTask,
  hydrationTask = null,
  trackingMissions = [],
  workoutSeries = [],
  readOnly = false,
  onOpenProfile,
  onStartEvaluation,
  onOpenCoach,
  onOpenPlan,
  onCreateRoutine,
  onOpenLibrary,
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
  const primaryCheckIn =
    !checkInTask?.completed &&
    (!workoutTask || workoutTask.completed || workoutTask.type === "rest");
  const isDailyWorkspace =
    !starterStage && (!journeyStage || journeyStage === "plan_assigned");
  const openTracking = (type) => {
    if (type === "weight") {
      onOpenWeighIn?.();
      return;
    }
    onOpenTrackingMission?.(type);
  };

  return (
    <section
      className="mobile-daily-plan daily-workspace"
      aria-label="Tu plan del día"
    >
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
      {coach && !isDailyWorkspace ? (
        <CoachContext coach={coach} onOpen={onOpenCoach} />
      ) : null}
      {isDailyWorkspace && weekDays.length ? (
        <div className="mobile-daily-plan__week" aria-label="Actividad semanal">
          {weekDays.map((day) => (
            <WeekDay key={day.key} day={day} />
          ))}
        </div>
      ) : null}

      {starterStage ? (
        <StarterExperience
          stage={starterStage}
          readOnly={readOnly}
          onCreateRoutine={onCreateRoutine}
          onStartWorkout={onOpenWorkout}
          onOpenLibrary={onOpenLibrary}
        />
      ) : journeyStage && journeyStage !== "plan_assigned" ? (
        <>
          <ManagedOnboarding
            stage={journeyStage}
            coach={coach}
            submittedAt={user?.coachIntake?.submittedAt}
            planning={planningContext}
            onStartEvaluation={onStartEvaluation}
          />
        </>
      ) : (
        <div className="daily-workspace__content">
          <div className="daily-workspace__today">
            <WorkoutMission
              task={workoutTask}
              onOpen={onOpenWorkout}
              readOnly={readOnly}
            />
            {(checkInTask || requiredTracking.length > 0) && (
              <section className="daily-tasks" aria-label="Seguimiento de hoy">
                <CheckInMission
                  task={checkInTask}
                  onOpen={onOpenCheckIn}
                  readOnly={readOnly}
                  primary={primaryCheckIn}
                />
                {requiredTracking.map((task) => (
                  <TrackingMission
                    key={task.id || task.type}
                    task={task}
                    onOpen={openTracking}
                    readOnly={readOnly}
                  />
                ))}
              </section>
            )}
          </div>
          <div className="daily-workspace__insights">
            {activitySummary && (
              <section
                className="daily-activity"
                aria-labelledby="daily-activity-title"
              >
                <div className="daily-workspace__section-heading">
                  <h2 id="daily-activity-title">Tu actividad</h2>
                  <span>{activitySummary.monthLabel}</span>
                </div>
                <dl>
                  <div>
                    <dt>sesiones</dt>
                    <dd>
                      {Number(
                        activitySummary.totalSessions || 0,
                      ).toLocaleString("es-BO")}
                    </dd>
                  </div>
                  <div>
                    <dt>series completadas</dt>
                    <dd>
                      {Number(activitySummary.totalSets || 0).toLocaleString(
                        "es-BO",
                      )}
                    </dd>
                  </div>
                </dl>
              </section>
            )}
            <WorkoutSeriesCard
              rows={workoutSeries}
              onOpenDetails={onOpenMuscleDetails}
            />
            <ActivePlanContext plan={activePlanContext} onOpen={onOpenPlan} />
            {quickRegistrations.length ? (
              <section
                className="daily-registrations"
                aria-labelledby="mobile-daily-plan-progress-title"
              >
                <h2 id="mobile-daily-plan-progress-title">
                  Registros opcionales
                </h2>
                <div
                  className="daily-registrations__actions"
                  style={{ "--registration-count": quickRegistrations.length }}
                >
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
            {coach ? <CoachContext coach={coach} onOpen={onOpenCoach} /> : null}
          </div>
        </div>
      )}
    </section>
  );
}
