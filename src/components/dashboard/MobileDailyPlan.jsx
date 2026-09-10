import { motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Dumbbell,
  MessageCircle,
  MoonStar,
  Camera,
  Ruler,
  Scale,
  UserRound,
} from "lucide-react";
import ProfileAvatar from "../profile/ProfileAvatar";

const WEEKDAY_LABELS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

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

function DashboardHeader({ date, profile, user, adminControl, onOpenMenu }) {
  return (
    <header className="mobile-daily-plan__header">
      <div>
        <h1>Tu día</h1>
        <p>{formatHeaderDate(date)}</p>
      </div>
      <div className="mobile-daily-plan__header-actions">
        {adminControl}
        <span className="mobile-daily-plan__notification" aria-hidden="true">
          <Bell />
        </span>
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
        ) : activePlan ? (
          <Dumbbell aria-hidden="true" />
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

function JourneySteps({ submitted }) {
  return (
    <section className="mobile-daily-plan__journey">
      <h2>{submitted ? "Siguiente paso" : "Qué sucede después"}</h2>
      <div className="mobile-daily-plan__journey-track">
        <span
          className={`mobile-daily-plan__journey-step ${submitted ? "is-complete" : "is-active"}`}
        >
          <i>{submitted ? <Check /> : "1"}</i>
          <strong>
            {submitted ? "Evaluación enviada" : "Envías tu evaluación"}
          </strong>
        </span>
        <b aria-hidden="true" />
        <span
          className={`mobile-daily-plan__journey-step ${submitted ? "is-current" : ""}`}
        >
          <i>2</i>
          <strong>Tu coach prepara tu plan</strong>
        </span>
      </div>
    </section>
  );
}

function ManagedOnboarding({
  stage,
  coach,
  submittedAt,
  onStartEvaluation,
  onOpenCoach,
}) {
  const submitted = stage === "evaluation_submitted";
  return (
    <>
      <section className="mobile-daily-plan__onboarding">
        <div className="mobile-daily-plan__section-heading">
          <h2>{submitted ? "Todo listo" : "Empecemos"}</h2>
          <span>Paso {submitted ? "2" : "1"} de 2</span>
        </div>

        {submitted ? (
          <div className="mobile-daily-plan__onboarding-card is-submitted">
            <span className="mobile-daily-plan__onboarding-icon is-complete">
              <Check />
            </span>
            <div>
              <h3>Evaluación enviada</h3>
              <p>{coach?.name || "Tu coach"} ya recibió tus respuestas.</p>
              <small>
                <Clock3 /> {formatSubmittedAt(submittedAt)}
              </small>
            </div>
            <div className="mobile-daily-plan__preparing">
              <ClipboardCheck />
              <span>
                <strong>Tu plan está en preparación</strong>
                <small>Te avisaremos cuando esté disponible.</small>
              </span>
            </div>
          </div>
        ) : (
          <div className="mobile-daily-plan__onboarding-card">
            <span className="mobile-daily-plan__onboarding-icon">
              <ClipboardCheck />
            </span>
            <div>
              <h3>Completa tu evaluación inicial</h3>
              <p>
                Cuéntale a tu coach tus objetivos, experiencia y estado de
                salud.
              </p>
              <small>
                <Clock3 /> 5–7 min
              </small>
            </div>
            <button
              type="button"
              onClick={onStartEvaluation}
              className="mobile-daily-plan__primary-action"
            >
              Comenzar evaluación
            </button>
          </div>
        )}
      </section>

      <JourneySteps submitted={submitted} />

      {submitted ? (
        <section className="mobile-daily-plan__waiting-card">
          <h2>Mientras esperas</h2>
          <div>
            <UserRound />
            <span>
              <strong>Completa tu perfil</strong>
              <small>Tu información básica está lista.</small>
            </span>
            <em>
              <Check /> Listo
            </em>
          </div>
          <button type="button" onClick={onOpenCoach}>
            <MessageCircle />
            <span>
              <strong>Habla con tu coach</strong>
              <small>Puedes hacerle cualquier consulta.</small>
            </span>
            <b>Ver vínculo</b>
          </button>
        </section>
      ) : null}

      <button
        type="button"
        onClick={onOpenCoach}
        className="mobile-daily-plan__coach-message"
      >
        <MessageCircle />
        <span>
          <strong>
            {submitted
              ? "Tu evaluación está en revisión"
              : "Mensaje de bienvenida"}
          </strong>
          <small>
            {submitted
              ? "Pronto tendrás novedades."
              : "Revisaremos juntos tu punto de partida."}
          </small>
          <em>{coach?.name || "Tu coach"}</em>
        </span>
        <ChevronRight />
      </button>
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
      className="mobile-daily-plan__mission is-compact"
    >
      <MissionStatus completed={task.completed} />
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
        {task.image ? (
          <img src={task.image} alt="" />
        ) : task.type === "rest" ? (
          <MoonStar />
        ) : (
          <Dumbbell />
        )}
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
        <img src="/images/daily-hydration.webp" alt="" />
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

const TRACKING_ICONS = { weight: Scale, photos: Camera, measurements: Ruler };

function TrackingMission({ task, onOpen, readOnly }) {
  const Icon = TRACKING_ICONS[task.type] || ClipboardCheck;
  return (
    <button
      type="button"
      onClick={() => onOpen?.(task.type)}
      disabled={readOnly}
      className={`mobile-daily-plan__mission ${task.required ? "is-compact" : "is-optional"}`}
    >
      <MissionStatus completed={task.completed} />
      <span className="mobile-daily-plan__visual">
        <Icon />
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
        <Dumbbell />
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
}) {
  const requiredTracking = trackingMissions.filter((task) => task.required);
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
      />
      {coach ? (
        <CoachContext
          coach={coach}
          activePlan={activePlanContext}
          onOpen={onOpenCoach}
        />
      ) : null}
      <div className="mobile-daily-plan__week" aria-label="Actividad semanal">
        {weekDays.map((day) => (
          <WeekDay key={day.key} day={day} />
        ))}
      </div>

      {journeyStage && journeyStage !== "plan_assigned" ? (
        <ManagedOnboarding
          stage={journeyStage}
          coach={coach}
          submittedAt={user?.coachIntake?.submittedAt}
          onStartEvaluation={onStartEvaluation}
          onOpenCoach={onOpenCoach}
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
              <CheckInMission
                task={checkInTask}
                onOpen={onOpenCheckIn}
                readOnly={readOnly}
              />
              <WorkoutMission
                task={workoutTask}
                onOpen={onOpenWorkout}
                readOnly={readOnly}
              />
              {trackingMissions.map((task) => (
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
            </div>
          </section>
          <ActivePlanContext plan={activePlanContext} onOpen={onOpenPlan} />
          {coach ? (
            <button
              type="button"
              onClick={onOpenCoach}
              className="mobile-daily-plan__coach-message"
            >
              <MessageCircle />
              <span>
                <strong>Tu coach está acompañando tu plan</strong>
                <small>Consulta cualquier ajuste antes de entrenar.</small>
                <em>{coach.name}</em>
              </span>
              <ChevronRight />
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
