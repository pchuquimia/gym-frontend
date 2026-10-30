import { useMemo, useState } from "react";
import { ChevronRight, RefreshCw, Search, UserPlus } from "lucide-react";
import ProfileAvatar from "../profile/ProfileAvatar";
import { CoachAthleteRow, CoachPagination } from "./CoachRoster";
import CoachNotifications from "./CoachNotifications";
import "./coachDashboard.css";

const PAGE_SIZE = 5;
const needsAttention = (athlete) =>
  ["high", "medium"].includes(athlete.priority);

export default function CoachHome({
  athletes,
  portfolio,
  loading,
  user,
  profile,
  onReload,
  errorContent,
  onInvite,
  invitationPanel,
  onOpenAthlete,
  onNavigate,
  describeAthlete,
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const alerts = useMemo(() => {
    const byId = new Map(
      athletes.map((athlete) => [String(athlete.id || athlete._id), athlete]),
    );
    if (portfolio?.alerts?.length) {
      return portfolio.alerts.slice(0, 3).map((alert) => ({
        id: String(alert.athleteId),
        name: alert.athleteName,
        profile: byId.get(String(alert.athleteId))?.profile,
        priority: alert.severity,
        detail: alert.title,
      }));
    }
    return athletes
      .filter(needsAttention)
      .slice(0, 3)
      .map((athlete) => ({ ...athlete, detail: describeAthlete(athlete) }));
  }, [athletes, portfolio, describeAthlete]);
  const recent = useMemo(
    () =>
      [...athletes]
        .filter((athlete) => athlete.lastTraining?.date)
        .sort((a, b) =>
          String(b.lastTraining.date).localeCompare(
            String(a.lastTraining.date),
          ),
        )
        .slice(0, 3),
    [athletes],
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const priority = { high: 0, medium: 1, normal: 2 };
    return athletes
      .filter(
        (athlete) =>
          (filter !== "attention" || needsAttention(athlete)) &&
          (filter !== "unplanned" || !Number(athlete.routineCount || 0)) &&
          (!query ||
            `${athlete.name} ${athlete.email || ""}`
              .toLocaleLowerCase()
              .includes(query)),
      )
      .sort(
        (a, b) =>
          (priority[a.priority] ?? 2) - (priority[b.priority] ?? 2) ||
          String(a.name).localeCompare(String(b.name)),
      );
  }, [athletes, search, filter]);
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
  );
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const attentionCount = Number(
    portfolio?.summary?.attention ?? athletes.filter(needsAttention).length,
  );
  const unplanned = athletes.filter(
    (athlete) => !Number(athlete.routineCount || 0),
  ).length;
  const firstName = String(user?.name || "Coach")
    .trim()
    .split(/\s+/)[0];
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const changeFilter = (next) => {
    setFilter(next);
    setPage(1);
  };
  return (
    <main className="coach-home">
      <header className="coach-home__header">
        <div>
          <span>RIRFIT · COACH</span>
          <h1>Mis alumnos</h1>
        </div>
        <div className="coach-home__header-actions">
          <button
            type="button"
            onClick={onReload}
            disabled={loading}
            aria-label="Actualizar panel"
            title="Actualizar panel"
            className="coach-home__icon-button"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <CoachNotifications
            athletes={athletes}
            onOpenAthlete={onOpenAthlete}
          />
          <button
            type="button"
            onClick={() => onNavigate("perfil")}
            aria-label="Abrir perfil"
          >
            <ProfileAvatar
              photoId={profile?.avatarPhotoId || user?.profile?.avatarPhotoId}
              avatarId={profile?.avatarId || user?.profile?.avatarId}
              gender={profile?.gender || user?.profile?.gender}
              name={user?.name}
              className="coach-home__profile"
            />
          </button>
        </div>
      </header>
      {errorContent}
      <section className="coach-home__hero" aria-label="Tu equipo">
        <img
          src="/images/coach-dashboard.webp"
          alt=""
          width={1200}
          height={800}
          fetchPriority="high"
        />
        <div className="coach-home__hero-content">
          <span>ACOMPAÑA CADA PASO</span>
          <h2>
            {greeting}, {firstName}
          </h2>
          <div>
            <p>Acompaña su progreso.</p>
            <button type="button" onClick={onInvite}>
              <UserPlus size={16} /> Invitar alumno
            </button>
          </div>
        </div>
      </section>
      {invitationPanel}
      <section className="coach-home__metrics" aria-label="Resumen del equipo">
        {[
          { count: athletes.length, label: "Alumnos", filter: "all" },
          { count: attentionCount, label: "Por revisar", filter: "attention" },
          { count: unplanned, label: "Sin rutina", filter: "unplanned" },
        ].map((item) => (
          <button
            key={item.filter}
            type="button"
            aria-pressed={filter === item.filter}
            onClick={() => changeFilter(item.filter)}
          >
            <strong>{loading ? "—" : item.count}</strong>
            <span>{item.label}</span>
          </button>
        ))}
      </section>
      <div className="coach-home__workspace">
        <section
          className="coach-home__panel coach-home__roster"
          aria-label="Alumnos del coach"
        >
          <header>
            <h2>
              Tu equipo <small>{athletes.length}</small>
            </h2>
            <button type="button" onClick={() => onNavigate("coach_athletes")}>
              Ver todos <ChevronRight size={15} />
            </button>
          </header>
          <label className="coach-home__search">
            <Search size={17} />
            <input
              type="search"
              aria-label="Buscar alumno"
              placeholder="Buscar alumno"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </label>
          <div
            className="coach-home__filters"
            role="group"
            aria-label="Filtrar equipo"
          >
            {[
              ["all", "Todos"],
              ["attention", "Atención"],
              ["unplanned", "Sin rutina"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => changeFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="coach-home__rows">
            {loading ? (
              <p role="status">Cargando alumnos...</p>
            ) : visible.length ? (
              visible.map((athlete) => (
                <CoachAthleteRow
                  key={athlete.id || athlete._id}
                  athlete={athlete}
                  detail={describeAthlete(athlete)}
                  onClick={() =>
                    onOpenAthlete(String(athlete.id || athlete._id))
                  }
                />
              ))
            ) : (
              <p>
                {athletes.length
                  ? "Sin coincidencias. Prueba otro nombre o filtro."
                  : "Invita a tu primer alumno para comenzar."}
              </p>
            )}
          </div>
          <CoachPagination
            count={filtered.length}
            page={currentPage}
            pageSize={PAGE_SIZE}
            onChange={setPage}
          />
        </section>
        <div className="coach-home__side">
          <section
            className="coach-home__shortcuts"
            aria-label="Herramientas del coach"
          >
            {[
              {
                name: "Planificaciones",
                page: "rutinas",
                image: "/images/daily-planning-card.webp",
                detail: "Organiza sus sesiones",
              },
              {
                name: "Alimentación",
                page: "nutricion",
                image: "/images/nutrition/lunch.webp",
                detail: "Acompaña sus comidas",
              },
            ].map((item) => (
              <button
                className="coach-home__shortcut"
                type="button"
                key={item.page}
                onClick={() => onNavigate(item.page)}
              >
                <img
                  src={item.image}
                  alt=""
                  width={512}
                  height={512}
                  loading="lazy"
                />
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.detail}</small>
                </span>
                <ChevronRight size={18} />
              </button>
            ))}
          </section>
          <details
            className="coach-home__panel coach-home__activity"
            aria-label="Prioridades"
          >
            <summary>
              <h2>Prioridades</h2>
              <span className="coach-home__priority-count">
                {attentionCount}
                <ChevronRight size={17} />
              </span>
            </summary>
            <div className="coach-home__rows">
              {alerts.length ? (
                alerts.map((athlete) => (
                  <CoachAthleteRow
                    key={`${athlete.id || athlete._id}-${athlete.detail}`}
                    athlete={athlete}
                    detail={athlete.detail}
                    onClick={() =>
                      onOpenAthlete(String(athlete.id || athlete._id))
                    }
                  />
                ))
              ) : (
                <p>
                  {loading
                    ? "Revisando tu equipo..."
                    : "Tus alumnos están al día."}
                </p>
              )}
            </div>
          </details>
          <details className="coach-home__panel coach-home__activity">
            <summary>
              <h2>Actividad reciente</h2>
              <ChevronRight size={17} />
            </summary>
            <div className="coach-home__rows">
              {recent.length ? (
                recent.map((athlete) => (
                  <CoachAthleteRow
                    key={athlete.id || athlete._id}
                    athlete={athlete}
                    detail={`Completó ${athlete.lastTraining.routineName || "su entrenamiento"}`}
                    onClick={() =>
                      onOpenAthlete(String(athlete.id || athlete._id))
                    }
                  />
                ))
              ) : (
                <p>Todavía no hay actividad reciente.</p>
              )}
            </div>
            <button
              className="coach-home__all-activity"
              type="button"
              onClick={() => onNavigate("admin_sesiones")}
            >
              Ver todas las sesiones <ChevronRight size={15} />
            </button>
          </details>
        </div>
      </div>
    </main>
  );
}
