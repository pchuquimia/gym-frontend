import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  MessageCircle,
  MoreHorizontal,
  UserMinus,
} from "lucide-react";
import ProfileAvatar from "../profile/ProfileAvatar";
import CoachFollowUpDetail from "./CoachFollowUpDetail";
import "./coachAthleteProfile.css";

const dateKey = (value = new Date()) => {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value))
    return value.slice(0, 10);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const formatDate = (value) => {
  if (!value) return "Sin registro";
  const date =
    value instanceof Date
      ? value
      : new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? "Sin registro"
    : date.toLocaleDateString("es-BO", { day: "numeric", month: "short" });
};
const duration = (seconds) => {
  const minutes = Math.round(Number(seconds || 0) / 60);
  return minutes ? `${minutes} min` : "—";
};

export function AthletePhotoCard({
  image,
  eyebrow,
  title,
  description,
  onClick,
  children,
  className = "",
  actionLabel,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`athlete-photo-card ${className}`}
      aria-label={actionLabel}
    >
      <img src={image} alt="" width={512} height={512} loading="lazy" />
      <span className="athlete-photo-card__copy">
        {eyebrow && <small>{eyebrow}</small>}
        <strong>{title}</strong>
        {description && <span>{description}</span>}
        {children}
      </span>
      <ArrowRight size={18} aria-hidden="true" />
    </button>
  );
}

export function CoachAthleteHeader({
  athlete,
  goal,
  lastTraining,
  activeSession,
  title,
  planDetail,
  onBack,
  onMessage,
  onEditPlan,
  onRelease,
  planActionLabel,
}) {
  const activity = lastTraining
    ? dateKey(lastTraining) === dateKey()
      ? "Entrenó hoy"
      : `Última sesión · ${formatDate(lastTraining)}`
    : "Alumno vinculado";
  return (
    <div className="athlete-profile-header">
      <header className="athlete-profile-header__nav">
        <button type="button" onClick={onBack} aria-label="Volver a alumnos">
          <ArrowLeft size={22} />
        </button>
        <h1>{title}</h1>
        <details className="overflow-menu relative">
          <summary
            aria-label="Opciones del alumno"
            className="athlete-profile-header__more"
          >
            <MoreHorizontal size={23} />
          </summary>
          <div className="overflow-menu-panel absolute right-0 top-12 z-30 w-56">
            <button
              type="button"
              disabled={Boolean(activeSession)}
              onClick={(event) => {
                event.currentTarget.closest("details")?.removeAttribute("open");
                onRelease();
              }}
              className="athlete-profile-header__release"
            >
              <UserMinus size={16} /> Desvincular alumno
            </button>
          </div>
        </details>
      </header>
      <section
        className="athlete-profile-header__hero"
        aria-label="Ficha del alumno"
      >
        <img
          className="athlete-profile-header__background"
          src="/images/daily-planning-card.webp"
          alt=""
          width={512}
          height={512}
        />
        <div className="athlete-profile-header__identity">
          <ProfileAvatar
            photoId={athlete.profile?.avatarPhotoId}
            avatarId={athlete.profile?.avatarId}
            gender={athlete.profile?.gender}
            name={athlete.name}
            className="athlete-profile-header__avatar"
          />
          <div>
            <small>{goal}</small>
            <h2>{athlete.name}</h2>
            <p>{athlete.email}</p>
          </div>
        </div>
        <div className="athlete-profile-header__footer">
          <span>{activity}</span>
          <div>
            <button type="button" onClick={onMessage}>
              <MessageCircle size={16} /> Mensaje
            </button>
            {!planDetail && (
              <button type="button" onClick={onEditPlan} className="is-primary">
                {planActionLabel}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export function CoachAthleteSummary({
  overview,
  activePlan,
  activePlanTimeProgress,
  recommendedPlanDay,
  routineNameById,
  latestCheckIn,
  onOpenPlan,
  onOpenHistory,
  onReviewIntake,
  onCreatePlan,
  onOpenNutrition,
  activityImageFor,
}) {
  const today = dateKey();
  const trainings = [...(overview.recentTrainings || [])].sort((a, b) =>
    String(b.date || "").localeCompare(String(a.date || "")),
  );
  const monday = new Date(`${today}T12:00:00`);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + i);
    return dateKey(date);
  });
  const weekly = trainings.filter((training) =>
    week.includes(String(training.date).slice(0, 10)),
  );
  const doneDays = new Set(
    weekly.map((training) => String(training.date).slice(0, 10)),
  );
  const target = activePlan
    ? (activePlan.weeklySchedule || []).filter((day) => day.type === "training")
        .length || Number(activePlan.frequencyTarget || 0)
    : 0;
  const adherence = target
    ? Math.min(100, Math.round((doneDays.size / target) * 100))
    : null;
  const totalSeconds = weekly.reduce(
    (sum, training) =>
      sum +
      Number(training.durationOverrideSeconds ?? training.durationSeconds ?? 0),
    0,
  );
  const todayTraining = weekly.find(
    (training) => String(training.date).slice(0, 10) === today,
  );
  const plannedName = routineNameById.get(
    String(recommendedPlanDay?.routineId || ""),
  );
  const restDay =
    recommendedPlanDay?.type && recommendedPlanDay.type !== "training";
  const todayTitle =
    todayTraining?.routineName ||
    (restDay
      ? "Descanso y recuperación"
      : plannedName || "Sin sesión programada");
  const intakeSubmitted = overview.athlete.coachIntake?.status === "submitted";
  const live = activePlan?.status === "active";
  const planWeek = activePlan?.startDate
    ? Math.max(
        1,
        Math.min(
          Number(activePlan.durationWeeks || 1),
          Math.floor(
            (new Date(`${today}T12:00:00`) -
              new Date(
                `${String(activePlan.startDate).slice(0, 10)}T12:00:00`,
              )) /
              604800000,
          ) + 1,
        ),
      )
    : 1;
  const assessment = overview.followUpRecords?.latestAssessment;
  const statuses = {
    draft: "Borrador",
    scheduled: "Programado",
    paused: "Pausado",
    completed: "Finalizado",
    cancelled: "Archivado",
  };
  return (
    <div className="athlete-overview">
      <div className="athlete-overview__features">
        <AthletePhotoCard
          className="athlete-photo-card--plan"
          image="/images/daily-plan-ready-card.webp"
          eyebrow={
            activePlan
              ? live
                ? "PLAN ACTUAL"
                : statuses[activePlan.status] || "PLANIFICACIÓN"
              : "SU SIGUIENTE PASO"
          }
          title={activePlan?.name || "Su primer plan"}
          description={
            activePlan
              ? live
                ? `Semana ${planWeek} de ${activePlan.durationWeeks || 1}`
                : activePlan.startDate
                  ? `Inicio · ${formatDate(activePlan.startDate)}`
                  : "Revisa su planificación"
              : intakeSubmitted
                ? "Evaluación lista para planificar"
                : "Organiza sus entrenamientos"
          }
          actionLabel={
            activePlan ? "Ver plan del alumno" : "Crear plan del alumno"
          }
          onClick={activePlan ? onOpenPlan : onCreatePlan}
        >
          {live && (
            <span
              className="athlete-photo-card__progress"
              role="progressbar"
              aria-label="Progreso temporal del plan"
              aria-valuenow={activePlanTimeProgress?.percentage || 0}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <i
                style={{ width: `${activePlanTimeProgress?.percentage || 0}%` }}
              />
            </span>
          )}
        </AthletePhotoCard>
        <div className="athlete-overview__shortcuts">
          <AthletePhotoCard
            image="/images/daily-checkin-card.webp"
            title="Evaluación inicial"
            description={
              intakeSubmitted
                ? "Completada · Ver respuestas"
                : "Pendiente del alumno"
            }
            onClick={onReviewIntake}
            actionLabel="Ver evaluación del alumno"
          />
          <AthletePhotoCard
            image="/images/nutrition/lunch.webp"
            title="Alimentación"
            description="Plan y cumplimiento"
            onClick={onOpenNutrition}
            actionLabel="Ver alimentación del alumno"
          />
        </div>
      </div>
      <div className="athlete-overview__data">
        <section
          className="athlete-profile-panel"
          aria-label="Actividad de la semana"
        >
          <header>
            <h3>Esta semana</h3>
            <small>
              {formatDate(week[0])} – {formatDate(week[6])}
            </small>
          </header>
          <div className="athlete-overview__metrics">
            <div>
              <strong>
                {weekly.length}
                {target > 0 && <small>/{target}</small>}
              </strong>
              <span>Entrenos</span>
            </div>
            <div>
              <strong>{adherence === null ? "—" : `${adherence}%`}</strong>
              <span>Adherencia</span>
            </div>
            <div>
              <strong>
                {weekly.length ? duration(totalSeconds / weekly.length) : "—"}
              </strong>
              <span>Promedio</span>
            </div>
          </div>
          <div
            className="athlete-overview__week"
            role="img"
            aria-label={`${doneDays.size} días con entrenamiento esta semana`}
          >
            {week.map((key, i) => (
              <span
                key={key}
                className={doneDays.has(key) ? "is-complete" : ""}
                title={`${formatDate(key)}: ${doneDays.has(key) ? "entrenamiento registrado" : "sin entrenamiento"}`}
              >
                <small>{["L", "M", "X", "J", "V", "S", "D"][i]}</small>
                <i>{doneDays.has(key) ? <Check size={14} /> : key.slice(-2)}</i>
              </span>
            ))}
          </div>
        </section>
        <section
          className="athlete-profile-panel"
          aria-label="Última actividad del alumno"
        >
          <header>
            <h3>{live ? "Hoy" : "Actividad reciente"}</h3>
            <button type="button" onClick={onOpenHistory}>
              Historial <ChevronRight size={14} />
            </button>
          </header>
          <button
            className="athlete-activity-preview"
            type="button"
            onClick={onOpenHistory}
          >
            <img
              src={
                restDay && !todayTraining
                  ? "/images/dashboard-rest-recovery.webp"
                  : activityImageFor(
                      live ? todayTitle : trainings[0]?.routineName,
                    )
              }
              alt=""
              width={80}
              height={80}
            />
            <span>
              <strong>
                {live
                  ? todayTitle
                  : trainings[0]?.routineName || "Aún sin sesiones"}
              </strong>
              <small>
                {live
                  ? todayTraining
                    ? "Entrenamiento completado"
                    : restDay
                      ? "Recuperación programada"
                      : plannedName
                        ? "Programado"
                        : "Revisa su planificación"
                  : trainings[0]
                    ? formatDate(trainings[0].date)
                    : "El historial aparecerá aquí"}
              </small>
            </span>
            <ChevronRight size={16} />
          </button>
          <div className="athlete-activity-preview">
            <img
              src="/images/daily-checkin-wellness.webp"
              alt=""
              width={80}
              height={80}
            />
            <span>
              <strong>Check-in diario</strong>
              <small>
                {latestCheckIn
                  ? formatDate(latestCheckIn.dateKey || latestCheckIn.date)
                  : "Sin registros"}
              </small>
            </span>
            <small>
              {String(
                latestCheckIn?.dateKey || latestCheckIn?.date || "",
              ).slice(0, 10) === today
                ? "Registrado"
                : "Pendiente"}
            </small>
          </div>
        </section>
      </div>
      {assessment && (
        <section className="athlete-profile-panel athlete-overview__assessment">
          <img
            src="/images/daily-final-assessment-card.webp"
            alt=""
            width={56}
            height={56}
          />
          <div>
            <small>Evaluación final · {formatDate(assessment.dateKey)}</small>
            <h3>Progreso {assessment.answers?.progress ?? "—"}/5</h3>
            <p>
              {assessment.answers?.goalReached === "yes"
                ? "Objetivo alcanzado"
                : assessment.answers?.goalReached === "partly"
                  ? "Objetivo alcanzado en parte"
                  : "Objetivo pendiente"}
            </p>
            {(assessment.answers?.pain || assessment.answers?.feedback) && (
              <details>
                <summary>Ver respuestas</summary>
                {assessment.answers.pain && (
                  <p>Molestias: {assessment.answers.pain}</p>
                )}
                {assessment.answers.feedback && (
                  <p>{assessment.answers.feedback}</p>
                )}
              </details>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export function CoachAthleteFollowUp({ overview, latestCheckIn }) {
  const [detailType, setDetailType] = useState("");
  const records = overview.followUpRecords || {};
  const newestFirst = (items = []) =>
    [...items].sort((a, b) =>
      String(b.dateKey || b.date || "").localeCompare(
        String(a.dateKey || a.date || ""),
      ),
    );
  const checkIns = newestFirst(
    records.checkIns?.length
      ? records.checkIns
      : latestCheckIn
        ? [latestCheckIn]
        : [],
  );
  const measurements = newestFirst(
    records.measurements?.length
      ? records.measurements
      : records.latestMeasurement
        ? [records.latestMeasurement]
        : [],
  );
  const assessments = newestFirst(
    records.assessments?.length
      ? records.assessments
      : records.latestAssessment
        ? [records.latestAssessment]
        : [],
  );
  const photos = newestFirst(records.photos);
  const checkIn = checkIns[0];
  const weights = newestFirst(records.weights).filter(
    (item) =>
      item.weightKg != null &&
      item.weightKg !== "" &&
      Number.isFinite(Number(item.weightKg)),
  );
  const weight = weights[0];
  const measurement = measurements[0];
  const assessment = assessments[0];
  const items = [
    {
      label: "Check-in",
      type: "checkIns",
      image: "daily-checkin-wellness.webp",
      record: checkIn,
      value: checkIn ? `${checkIn.readinessScore ?? "—"}/100` : "—",
      count: records.counts?.checkIns ?? checkIns.length,
    },
    {
      label: "Peso",
      type: "weights",
      image: "daily-weight-card.webp",
      record: weight,
      value: weight ? `${weight.weightKg} kg` : "—",
      count: records.counts?.weights ?? weights.length,
    },
    {
      label: "Medidas",
      type: "measurements",
      image: "daily-measurements-card.webp",
      record: measurement,
      value: measurement
        ? `${Object.values(measurement.values || {}).filter((value) => value != null).length} medidas`
        : "—",
      count: records.counts?.measurements ?? measurements.length,
    },
    {
      label: "Fotos de progreso",
      type: "photos",
      image: "daily-progress-photos-card.webp",
      record: photos[0],
      value: photos[0]
        ? {
            front: "Frontal",
            side: "Lateral",
            back: "Posterior",
            other: "Otra vista",
          }[photos[0].view] || "Foto reciente"
        : "—",
      count: records.counts?.photos ?? photos.length,
    },
    {
      label: "Evaluación final",
      type: "assessments",
      image: "daily-final-assessment-card.webp",
      record: assessment,
      value: assessment ? `${assessment.answers?.progress ?? "—"}/5` : "—",
      count: records.counts?.assessments ?? assessments.length,
    },
  ];
  const trend = [...weights].sort((a, b) =>
    String(a.dateKey || a.date).localeCompare(String(b.dateKey || b.date)),
  );
  const values = trend.map((entry) => Number(entry.weightKg));
  const dates = trend.map((entry) =>
    new Date(
      `${String(entry.dateKey || entry.date).slice(0, 10)}T12:00:00`,
    ).getTime(),
  );
  const firstDate = dates[0];
  const timeRange = (dates.at(-1) || 0) - (firstDate || 0);
  const min = Math.min(...values) - 0.5;
  const range = Math.max(...values) + 0.5 - min;
  const points = trend
    .map(
      (entry, index) =>
        `${12 + (timeRange > 0 && Number.isFinite(dates[index]) ? (dates[index] - firstDate) / timeRange : index / Math.max(1, trend.length - 1)) * 276},${85 - ((Number(entry.weightKg) - min) / range) * 65}`,
    )
    .join(" ");
  return (
    <section className="athlete-followup" aria-label="Seguimiento del alumno">
      <header>
        <div>
          <small>REGISTROS DEL ALUMNO</small>
          <h2>Su evolución</h2>
        </div>
        <span>
          {items.reduce((total, item) => total + item.count, 0)} registros{" "}
          {records.counts ? "en total" : "disponibles"}
        </span>
      </header>
      <div className="athlete-followup__grid">
        {items.map((item) => (
          <button
            type="button"
            className="athlete-followup__card"
            key={item.type}
            onClick={() => setDetailType(item.type)}
            aria-label={`Ver historial de ${item.label.toLowerCase()}`}
            aria-haspopup="dialog"
          >
            <img
              src={`/images/${item.image}`}
              alt=""
              width={512}
              height={512}
              loading="lazy"
            />
            <div className="athlete-followup__card-copy">
              <small>{item.label}</small>
              <strong>{item.value}</strong>
              <span>
                {item.record
                  ? `Último: ${formatDate(item.record.dateKey || item.record.date)}`
                  : "Sin registro"}
              </span>
              <span className="athlete-followup__card-meta">
                <span>
                  {item.count}{" "}
                  {item.type === "photos"
                    ? item.count === 1
                      ? "foto"
                      : "fotos"
                    : item.count === 1
                      ? "registro"
                      : "registros"}
                </span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </span>
            </div>
          </button>
        ))}
      </div>
      {detailType && (
        <CoachFollowUpDetail
          key={`${overview.athlete?.id || overview.athlete?._id || "athlete"}-${detailType}`}
          type={detailType}
          overview={overview}
          latestCheckIn={latestCheckIn}
          onClose={() => setDetailType("")}
        />
      )}
      {trend.length > 1 && (
        <figure className="athlete-profile-panel athlete-followup__trend">
          <figcaption>
            <strong>Evolución del peso</strong>
            <span>
              {formatDate(trend[0].dateKey || trend[0].date)} –{" "}
              {formatDate(trend.at(-1).dateKey || trend.at(-1).date)}
            </span>
          </figcaption>
          <svg
            viewBox="0 0 300 100"
            role="img"
            aria-label={`Peso desde ${values[0]} hasta ${values.at(-1)} kilogramos`}
          >
            <path d="M12 85H288" fill="none" stroke="var(--border)" />
            <polyline
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
          <div>
            <span>{values[0]} kg</span>
            <span>{values.at(-1)} kg</span>
          </div>
        </figure>
      )}
    </section>
  );
}
