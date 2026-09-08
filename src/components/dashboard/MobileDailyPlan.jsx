import { motion, useReducedMotion } from "framer-motion";
import {
  Check,
  ChevronRight,
  Dumbbell,
  Flame,
  MoonStar,
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

function BodyScaleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M8 9.5a4.2 4.2 0 0 1 8 0" />
      <path d="m12 9.5 2-2" />
    </svg>
  );
}

function WeekDay({ day }) {
  const date = new Date(`${day.key}T12:00:00`);
  const isValid = !Number.isNaN(date.getTime());
  const label = isValid ? WEEKDAY_LABELS[date.getDay()] : day.label;
  const number = isValid ? date.getDate() : "";

  return (
    <div
      className={`mobile-daily-plan__day ${day.isToday ? "is-today" : ""} ${day.trained ? "is-trained" : ""}`}
      aria-current={day.isToday ? "date" : undefined}
    >
      <span>{label}</span>
      <strong>{number}</strong>
      <i aria-hidden="true">{day.trained ? <Check /> : null}</i>
    </div>
  );
}

function CheckInMission({ task, onOpen, readOnly }) {
  if (!task) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={readOnly}
      className="mobile-daily-plan__mission"
    >
      <MissionStatus completed={task.completed} />
      <span className="mobile-daily-plan__visual mobile-daily-plan__visual--wellness">
        <img src="/images/daily-checkin-wellness.webp" alt="" />
      </span>
      <span className="mobile-daily-plan__mission-copy">
        <strong>{task.title}</strong>
        <small>{task.subtitle}</small>
      </span>
      {task.completed ? (
        <span className="mobile-daily-plan__ready">Listo</span>
      ) : (
        <ChevronRight
          className="mobile-daily-plan__chevron"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

function WorkoutMission({ task, onOpen, readOnly }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={readOnly}
      className="mobile-daily-plan__mission mobile-daily-plan__mission--workout"
    >
      <MissionStatus
        completed={task.completed}
        tone={task.type === "rest" ? "rest" : "default"}
      />
      <span className="mobile-daily-plan__visual mobile-daily-plan__visual--workout">
        {task.image ? (
          <img src={task.image} alt="" />
        ) : task.type === "rest" ? (
          <MoonStar aria-hidden="true" />
        ) : (
          <Dumbbell aria-hidden="true" />
        )}
      </span>
      <span className="mobile-daily-plan__mission-copy">
        <strong>{task.title}</strong>
        <small>{task.subtitle}</small>
        {task.type === "completed" ? (
          <span className="mobile-daily-plan__mission-action">
            Ver resumen
            <ChevronRight aria-hidden="true" />
          </span>
        ) : null}
      </span>
      {task.type === "completed" ? (
        <span className="mobile-daily-plan__ready">Completado</span>
      ) : (
        <ChevronRight
          className="mobile-daily-plan__chevron"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

function HydrationMission({ task, onOpen, readOnly }) {
  if (!task) return null;

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={readOnly}
      className="mobile-daily-plan__mission mobile-daily-plan__mission--hydration"
    >
      <MissionStatus completed={task.completed} />
      <span className="mobile-daily-plan__visual mobile-daily-plan__visual--hydration">
        <img src="/images/daily-hydration.webp" alt="" />
      </span>
      <span className="mobile-daily-plan__mission-copy">
        <strong>{task.title}</strong>
        <small>{task.subtitle}</small>
      </span>
      {task.completed ? (
        <span className="mobile-daily-plan__ready">Completado</span>
      ) : task.hasData ? (
        <span className="mobile-daily-plan__hydration-progress">
          {task.progress}%
          <ChevronRight aria-hidden="true" />
        </span>
      ) : (
        <ChevronRight
          className="mobile-daily-plan__chevron"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

export default function MobileDailyPlan({
  date,
  profile,
  user,
  adminControl = null,
  weekDays = [],
  currentStreak = 0,
  bestStreak = 0,
  checkInTask = null,
  workoutTask,
  hydrationTask = null,
  weighInTask,
  weeklySessions = 0,
  weeklyGoal = 0,
  readOnly = false,
  onOpenMenu,
  onOpenCheckIn,
  onOpenWorkout,
  onOpenHydration,
  onOpenWeighIn,
}) {
  const taskCount = 1 + (checkInTask ? 1 : 0) + (hydrationTask ? 1 : 0);
  const completedCount =
    Number(Boolean(workoutTask.completed)) +
    Number(Boolean(checkInTask?.completed)) +
    Number(Boolean(hydrationTask?.completed));
  const progress = taskCount ? (completedCount / taskCount) * 100 : 0;
  const goal = Math.min(7, Math.max(weeklyGoal, weeklySessions, 1));
  const weeklyProgress = Math.min(weeklySessions, goal);

  return (
    <section
      className="mobile-daily-plan md:hidden"
      aria-label="Tu plan del día"
    >
      <header className="mobile-daily-plan__header">
        <div>
          <h1>Tu día</h1>
          <p>{formatHeaderDate(date)}</p>
        </div>
        <div className="mobile-daily-plan__header-actions">
          {adminControl}
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

      <div className="mobile-daily-plan__streak">
        <span className="mobile-daily-plan__flame" aria-hidden="true">
          <Flame />
        </span>
        <div>
          <strong>{currentStreak} días</strong>
          <p>
            {bestStreak
              ? `Mejor racha: ${bestStreak}`
              : "Tu primera racha empieza aquí"}
          </p>
        </div>
        <span className="mobile-daily-plan__streak-note">
          {currentStreak ? "Sigue así" : "Empieza hoy"}
        </span>
      </div>

      <div className="mobile-daily-plan__week" aria-label="Actividad semanal">
        {weekDays.map((day) => (
          <WeekDay key={day.key} day={day} />
        ))}
      </div>

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
            transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
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
          <HydrationMission
            task={hydrationTask}
            onOpen={onOpenHydration}
            readOnly={readOnly}
          />
        </div>
      </section>

      <section className="mobile-daily-plan__follow-up">
        <h2>Seguimiento</h2>
        <button
          type="button"
          onClick={onOpenWeighIn}
          disabled={readOnly}
          className="mobile-daily-plan__follow-up-row"
        >
          <span className="mobile-daily-plan__scale" aria-hidden="true">
            <BodyScaleIcon />
          </span>
          <span>
            <strong>{weighInTask.title}</strong>
            <small>{weighInTask.subtitle}</small>
          </span>
          {weighInTask.completed ? (
            <Check
              className="mobile-daily-plan__follow-up-check"
              aria-hidden="true"
            />
          ) : (
            <ChevronRight aria-hidden="true" />
          )}
        </button>
      </section>

      <section className="mobile-daily-plan__weekly-summary">
        <div>
          <h2>Esta semana</h2>
          <p>
            {weeklySessions} de {goal} entrenamientos
          </p>
        </div>
        <div
          className="mobile-daily-plan__weekly-marks"
          style={{ "--weekly-goal": goal }}
          aria-hidden="true"
        >
          {Array.from({ length: goal }, (_, index) => (
            <span
              key={index}
              className={index < weeklyProgress ? "is-done" : ""}
            />
          ))}
        </div>
      </section>
    </section>
  );
}
