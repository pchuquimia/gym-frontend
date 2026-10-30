import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  Check,
  ChevronRight,
  ClipboardList,
  Clock3,
  Dumbbell,
  Plus,
  Ruler,
  Weight,
} from "lucide-react";
import WorkoutSeriesCard from "./WorkoutMuscleChart";
import DashboardPlanTrend from "./DashboardPlanTrend";
import ProfileAvatar from "../profile/ProfileAvatar";
import AthleteNotifications from "./AthleteNotifications";
import "./starter-experience.css";
import "./daily-workspace.css";

const WEEKDAY_LABELS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const DAILY_CARD_IMAGES = Object.freeze({
  checkIn: "/images/daily-checkin-card.webp",
  completed: "/images/dashboard-workout-completed-color.jpg",
  finalAssessment: "/images/daily-final-assessment-card.webp",
  hydration: "/images/daily-hydration-card.webp",
  measurements: "/images/daily-measurements-card.webp",
  check_in: "/images/daily-checkin-card.webp",
  final_evaluation: "/images/daily-final-assessment-card.webp",
  photos: "/images/daily-progress-photos-card.webp",
  plan: "/images/daily-planning-card.webp",
  ready: "/images/daily-plan-ready-card.webp",
  recovery: "/images/dashboard-rest-recovery.webp",
  weight: "/images/daily-weight-card.webp",
});

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
  notifications,
  onReadNotifications,
  onOpenNotification,
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
        <AthleteNotifications
          notifications={notifications}
          unread={notificationUnread}
          onRead={onReadNotifications}
          onOpen={onOpenNotification}
        />
        <button
          type="button"
          onClick={onOpenProfile}
          className="mobile-daily-plan__avatar"
          aria-label="Abrir perfil"
        >
          <ProfileAvatar
            photoId={profile?.avatarPhotoId || user?.profile?.avatarPhotoId}
            avatarId={profile?.avatarId || user?.profile?.avatarId}
            gender={profile?.gender || user?.profile?.gender}
            name={profile?.name || user?.name}
            className="h-full w-full"
            fallbackClassName="bg-[#e8e1d8] text-sm font-semibold text-[#252525]"
          />
        </button>
      </div>
    </header>
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
    ? "Tu evaluación inicial"
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
      <section
        className={`managed-start ${pending ? "managed-start--pending" : ""}`}
        aria-label={pending ? "Tu punto de partida" : "Estado de tu plan"}
      >
        <img
          className="managed-start__photo"
          src={thumbnail}
          alt=""
          width={512}
          height={512}
          decoding="async"
        />
        <div className="managed-start__shade" />
        <div className="managed-start__content">
          <span className="managed-start__badge">
            {pending ? "Tu punto de partida" : "Evaluación enviada"}
          </span>
          <h2>{title}</h2>
          <p>
            {pending ? "Unas preguntas para preparar tu plan." : description}
          </p>
          <div className="managed-start__footer">
            <small>
              <Clock3 size={13} />
              {pending ? "5–7 min" : formatSubmittedAt(submittedAt)}
            </small>
            {pending && (
              <button
                type="button"
                onClick={onStartEvaluation}
                className="managed-start__action"
              >
                Comenzar evaluación <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </section>
    </>
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
          width={isRest ? 768 : 1024}
          height={isRest ? 1024 : 512}
          decoding="async"
          fetchPriority="high"
        />
        {!isRest && (
          <span className="daily-workout__badge">
            {isCompleted && <Check aria-hidden="true" />}
            {label}
          </span>
        )}
      </span>
      <span className="daily-workout__body">
        <span className="daily-workout__copy">
          {isRest && <span className="daily-workout__rest-label">{label}</span>}
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

const TRACKING_ACTIONS = {
  weight: { create: "Registrar peso", saved: "Editar peso" },
  photos: { create: "Subir fotos", saved: "Ver fotos" },
  measurements: { create: "Registrar medidas", saved: "Editar medidas" },
  check_in: { create: "Responder check-in", saved: "Ver mis respuestas" },
  final_evaluation: {
    create: "Responder evaluación",
    saved: "Ver mi evaluación",
  },
};

function QuickRegistration({ task, onOpen, readOnly, assigned = false }) {
  const image = DAILY_CARD_IMAGES[task.type] || DAILY_CARD_IMAGES.measurements;
  const state = task.completed
    ? "completed"
    : task.dueToday === false
      ? "scheduled"
      : "pending";
  const stateLabel = {
    completed: "Completado",
    scheduled: "Programado",
    pending: "Pendiente",
  }[state];
  const action =
    TRACKING_ACTIONS[task.type]?.[task.completed ? "saved" : "create"] ||
    "Abrir formulario";
  const scheduledDate =
    task.dueToday === false && task.nextDueDate
      ? new Intl.DateTimeFormat("es-BO", {
          day: "numeric",
          month: "short",
          timeZone: "UTC",
        }).format(new Date(`${task.nextDueDate}T12:00:00Z`))
      : "";

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={readOnly}
      className={`daily-quick-action ${assigned ? `is-assigned is-${state}` : ""} ${task.completed ? "is-complete" : ""}`}
      aria-label={`${assigned ? `${stateLabel}: ` : ""}${task.title}${task.subtitle ? `: ${task.subtitle}` : ""}${assigned ? `. ${action}` : ""}`}
      title={assigned ? action : task.subtitle}
    >
      <img
        className="daily-quick-action__photo"
        src={image}
        alt=""
        width={512}
        height={512}
        loading="eager"
      />
      {assigned && task.completed ? (
        <span className="daily-quick-action__receipt" aria-hidden="true">
          <Check size={18} strokeWidth={1.8} />
        </span>
      ) : null}
      <span className="daily-quick-action__copy">
        {!assigned ? (
          <span className="daily-quick-action__add" aria-hidden="true">
            {task.completed ? <Check size={16} /> : <Plus size={16} />}
          </span>
        ) : null}
        <span>
          {task.type === "hydration" ? "Agua" : task.title}
          {assigned ? (
            <small>
              {task.completed
                ? task.subtitle
                : scheduledDate
                  ? `Próximo registro: ${scheduledDate}`
                  : task.subtitle}
            </small>
          ) : null}
          {assigned && !task.required ? <small>A tu elección</small> : null}
        </span>
      </span>
      {assigned ? (
        <span className="daily-quick-action__footer">
          <span>{action}</span>
          <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
        </span>
      ) : null}
    </button>
  );
}

function TrackingMission({ task, onOpen, readOnly, visual = false }) {
  if (visual)
    return (
      <QuickRegistration
        task={task}
        onOpen={() => onOpen?.(task.type)}
        readOnly={readOnly}
        assigned
      />
    );
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

function ActivePlanContext({ plan, onOpen, summary, chart }) {
  if (!plan) return null;
  return (
    <section
      className="daily-plan-overview"
      aria-labelledby="daily-plan-overview-title"
    >
      <div className="daily-workspace__section-heading">
        <h2 id="daily-plan-overview-title">Tu planificación</h2>
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Ver progreso de ${plan.name}`}
        >
          Ver plan <ChevronRight aria-hidden="true" />
        </button>
      </div>
      <div className="daily-plan-overview__summary">
        <div>
          <h3>{plan.name}</h3>
          <p>
            Semana {plan.currentWeek} de {plan.durationWeeks}
          </p>
        </div>
        {summary?.change !== null && summary?.change !== undefined && (
          <div
            className={`daily-plan-overview__change${summary.changeValue < 0 ? " is-negative" : summary.changeValue > 0 ? " is-positive" : ""}`}
          >
            <strong>{summary.change}</strong>
            <span>desde el inicio</span>
          </div>
        )}
      </div>
      {chart}
    </section>
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
  planTrend = null,
  workoutTask,
  hydrationTask = null,
  hydrationTrackingEnabled = false,
  savingOptionalRecords = false,
  onSetHydrationTracking,
  trackingMissions = [],
  workoutSeries = [],
  readOnly = false,
  onOpenProfile,
  onStartEvaluation,
  onOpenPlan,
  onCreateRoutine,
  onOpenLibrary,
  onOpenWorkout,
  onOpenHydration,
  onOpenWeighIn,
  onOpenTrackingMission,
  onOpenMuscleDetails,
  notifications = [],
  notificationUnread = 0,
  onReadNotifications,
  onOpenNotification,
  nutritionContent = null,
}) {
  const isManagedAthlete = Boolean(
    journeyStage || (user?.role === "Cliente" && user?.assignedTrainerId),
  );
  const dailyTracking = isManagedAthlete
    ? trackingMissions
    : trackingMissions.filter((task) => task.required);
  const dailyTrackingTypes = new Set(dailyTracking.map((task) => task.type));
  const completedTracking = dailyTracking.filter(
    (task) => task.completed,
  ).length;
  const trackingByType = new Map(
    trackingMissions.map((task) => [task.type, task]),
  );
  const quickRegistrations = [
    ...(isManagedAthlete ? [] : QUICK_REGISTRATION_DEFAULTS).map(
      (fallback) => ({
        ...fallback,
        ...trackingByType.get(fallback.type),
        required: false,
      }),
    ),
    hydrationTask && hydrationTrackingEnabled
      ? { ...hydrationTask, id: "quick-hydration", type: "hydration" }
      : null,
  ].filter(
    (task) => task && !task.completed && !dailyTrackingTypes.has(task.type),
  );
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
      className={`mobile-daily-plan daily-workspace ${journeyStage && journeyStage !== "plan_assigned" ? "daily-workspace--managed-start" : ""} ${journeyStage === "plan_assigned" && nutritionContent ? "daily-workspace--managed-meals" : ""}`}
      aria-label="Tu plan del día"
    >
      <DashboardHeader
        date={date}
        profile={profile}
        user={user}
        adminControl={adminControl}
        onOpenProfile={onOpenProfile}
        notificationUnread={notificationUnread}
        notifications={notifications}
        onReadNotifications={onReadNotifications}
        onOpenNotification={onOpenNotification}
      />
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
        <div
          className={`managed-dashboard ${nutritionContent ? "has-meals" : ""}`}
        >
          <div>
            <ManagedOnboarding
              stage={journeyStage}
              coach={coach}
              submittedAt={user?.coachIntake?.submittedAt}
              planning={planningContext}
              onStartEvaluation={onStartEvaluation}
            />
          </div>
          {nutritionContent}
        </div>
      ) : (
        <div className="daily-workspace__content">
          <div className="daily-workspace__today">
            <WorkoutMission
              task={workoutTask}
              onOpen={onOpenWorkout}
              readOnly={readOnly}
            />
            {nutritionContent}
            {dailyTracking.length > 0 && (
              <section className="daily-tasks" aria-label="Seguimiento de hoy">
                {isManagedAthlete ? (
                  <div className="daily-tasks__heading">
                    <h2 className="daily-workspace__tracking-title">
                      Registros asignados
                    </h2>
                    <span
                      role="status"
                      aria-label="Estado de los registros asignados"
                      className="daily-tasks__summary"
                    >
                      {completedTracking} de {dailyTracking.length} registros
                      guardados
                    </span>
                  </div>
                ) : null}
                <div
                  className={
                    isManagedAthlete ? "daily-tasks__cards" : "daily-tasks"
                  }
                >
                  {dailyTracking.map((task) => (
                    <TrackingMission
                      key={task.id || task.type}
                      task={task}
                      onOpen={openTracking}
                      readOnly={readOnly}
                      visual={isManagedAthlete}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
          <div className="daily-workspace__insights">
            <WorkoutSeriesCard
              rows={workoutSeries}
              date={date}
              onOpenDetails={onOpenMuscleDetails}
            />
            {activePlanContext && (
              <DashboardPlanTrend
                ownerId={planTrend?.ownerId || ""}
                plan={planTrend?.plan || null}
                recentTrainings={planTrend?.trainings || []}
                variant="sparkline"
                renderPlanCard={(summary, chart) => (
                  <ActivePlanContext
                    plan={activePlanContext}
                    onOpen={onOpenPlan}
                    summary={summary}
                    chart={chart}
                  />
                )}
              />
            )}
            {quickRegistrations.length || onSetHydrationTracking ? (
              <section
                className="daily-registrations"
                aria-labelledby="mobile-daily-plan-progress-title"
              >
                <h2 id="mobile-daily-plan-progress-title">
                  Registros opcionales
                </h2>
                {onSetHydrationTracking ? (
                  <details className="daily-registrations__preferences">
                    <summary>Elegir registros opcionales</summary>
                    <label>
                      <span>
                        Agua{" "}
                        <small>
                          Actívalo si quieres registrar tu hidratación.
                        </small>
                      </span>
                      <input
                        type="checkbox"
                        aria-label="Mostrar registro de agua"
                        checked={hydrationTrackingEnabled}
                        disabled={readOnly || savingOptionalRecords}
                        onChange={(event) =>
                          onSetHydrationTracking(event.target.checked)
                        }
                      />
                    </label>
                  </details>
                ) : null}
                <div className="daily-registrations__actions">
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
        </div>
      )}
    </section>
  );
}
