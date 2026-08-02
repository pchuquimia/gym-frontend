import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  Play,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Button from "../components/ui/button";
import { useRoutines } from "../context/RoutineContext";
import { api } from "../services/api";

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

const formatVolume = (value) =>
  `${Math.round(Number(value) || 0).toLocaleString("es-ES")} kg`;

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A";

function AthleteRow({ athlete, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-16 w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
        selected
          ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
          : "border-transparent hover:border-[color:var(--border)] hover:bg-[color:var(--bg)]"
      }`}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-black text-white">
        {initials(athlete.name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-[color:var(--text)]">
          {athlete.name}
        </span>
        <span className="mt-0.5 block truncate text-xs font-semibold text-[color:var(--text-muted)]">
          {athlete.routineCount} rutinas · {athlete.trainingCount} sesiones
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
    </button>
  );
}

function AssignRoutineModal({ athlete, templates, onAssign, onClose }) {
  const [sourceRoutineId, setSourceRoutineId] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!sourceRoutineId || saving) return;
    setSaving(true);
    try {
      await onAssign(sourceRoutineId);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-black/50 sm:items-center sm:justify-center sm:p-4">
      <div className="max-h-[88dvh] w-full overflow-hidden rounded-t-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-2xl sm:max-w-lg sm:rounded-lg">
        <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] p-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
              Asignar a {athlete.name}
            </p>
            <h2 className="mt-1 text-xl font-black">Elige una plantilla</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[color:var(--border)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[55dvh] space-y-2 overflow-y-auto p-4">
          {templates.length ? (
            templates.map((routine) => {
              const id = routine.id || routine._id;
              const selected = sourceRoutineId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSourceRoutineId(id)}
                  className={`flex min-h-16 w-full items-center gap-3 rounded-lg border p-3 text-left ${
                    selected
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                      : "border-[color:var(--border)]"
                  }`}
                >
                  <Dumbbell className="h-5 w-5 shrink-0 text-blue-600" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black">
                      {routine.name}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-[color:var(--text-muted)]">
                      {(routine.exercises || []).length} ejercicios
                    </span>
                  </span>
                  <span
                    className={`h-5 w-5 rounded-full border-2 ${
                      selected
                        ? "border-[6px] border-blue-600"
                        : "border-[color:var(--border)]"
                    }`}
                  />
                </button>
              );
            })
          ) : (
            <div className="py-8 text-center">
              <ClipboardList className="mx-auto h-8 w-8 text-[color:var(--text-muted)]" />
              <p className="mt-3 text-sm font-black">No tienes plantillas</p>
              <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                Crea una rutina propia antes de asignarla.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-[color:var(--border)] p-4">
          <Button
            className="h-12 w-full rounded-lg"
            disabled={!sourceRoutineId || saving}
            onClick={submit}
          >
            {saving ? "Asignando..." : "Asignar rutina"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CoachDashboard({
  onNavigate = () => {},
  onSelectCoachAthlete = () => {},
}) {
  const { routines: templates } = useRoutines();
  const [athletes, setAthletes] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [overview, setOverview] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const loadAthletes = async () => {
    try {
      setLoading(true);
      setAthletes(await api.getCoachAthletes());
    } catch (err) {
      toast.error(err.message || "No se pudieron cargar los atletas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAthletes();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setOverview(null);
      return;
    }
    let active = true;
    setLoadingOverview(true);
    api
      .getCoachAthleteOverview(selectedId)
      .then((data) => active && setOverview(data))
      .catch((err) => toast.error(err.message || "No se pudo abrir el atleta"))
      .finally(() => active && setLoadingOverview(false));
    return () => {
      active = false;
    };
  }, [selectedId]);

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

  const assignRoutine = async (sourceRoutineId) => {
    try {
      const template = templates.find(
        (routine) => (routine.id || routine._id) === sourceRoutineId,
      );
      await api.assignCoachRoutine(selectedId, { sourceRoutineId });
      const data = await api.getCoachAthleteOverview(selectedId);
      setOverview(data);
      await loadAthletes();
      setAssigning(false);
      toast.success("Rutina asignada", {
        description: `${template?.name || "La rutina"} fue asignada a ${selectedAthlete?.name}.`,
      });
    } catch (err) {
      toast.error(err.message || "No se pudo asignar la rutina");
    }
  };

  const startTraining = () => {
    if (!selectedAthlete || !overview?.routines?.length) return;
    onSelectCoachAthlete({
      id: selectedId,
      name: selectedAthlete.name,
      email: selectedAthlete.email,
    });
    toast.success("Sesión preparada", {
      description: `Registrarás el entrenamiento de ${selectedAthlete.name}.`,
    });
    onNavigate("registrar");
  };

  return (
    <main className="mx-auto w-full max-w-7xl pb-20">
      <header className="flex flex-col gap-4 border-b border-[color:var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
            Modo coach
          </p>
          <h1 className="mt-1 text-3xl font-black">Mis atletas</h1>
          <p className="mt-1 text-sm font-semibold text-[color:var(--text-muted)]">
            Selecciona una persona para planificar o dirigir su entrenamiento.
          </p>
        </div>
        <span className="text-sm font-black text-[color:var(--text-muted)]">
          {athletes.length} {athletes.length === 1 ? "atleta" : "atletas"}
        </span>
      </header>

      {loading ? (
        <div className="grid min-h-72 place-items-center text-sm font-semibold text-[color:var(--text-muted)]">
          Cargando atletas...
        </div>
      ) : !athletes.length ? (
        <section className="grid min-h-96 place-items-center text-center">
          <div className="max-w-sm">
            <Users className="mx-auto h-10 w-10 text-blue-600" />
            <h2 className="mt-4 text-xl font-black">Aún no tienes atletas</h2>
            <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">
              Un administrador debe vincular clientes a tu cuenta antes de que
              puedas consultar o modificar su entrenamiento.
            </p>
          </div>
        </section>
      ) : (
        <div className="mt-5 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside
            className={`${selectedId ? "hidden lg:block" : "block"} lg:border-r lg:border-[color:var(--border)] lg:pr-5`}
          >
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar atleta"
                className="h-11 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] pl-10 pr-3 text-sm font-semibold outline-none focus:border-blue-500"
              />
            </label>
            <div className="mt-3 max-h-[calc(100dvh-240px)] space-y-1 overflow-y-auto">
              {filteredAthletes.map((athlete) => {
                const id = athlete.id || athlete._id;
                return (
                  <AthleteRow
                    key={id}
                    athlete={athlete}
                    selected={selectedId === id}
                    onClick={() => setSelectedId(id)}
                  />
                );
              })}
            </div>
          </aside>

          {!selectedId ? (
            <section className="grid min-h-96 place-items-center border-y border-[color:var(--border)] text-center lg:border-y-0">
              <div className="max-w-xs py-16">
                <UserRound className="mx-auto h-10 w-10 text-[color:var(--text-muted)]" />
                <h2 className="mt-4 text-lg font-black">
                  Selecciona un atleta
                </h2>
                <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">
                  Su planificación y progreso aparecerán aquí.
                </p>
              </div>
            </section>
          ) : loadingOverview || !overview ? (
            <div className="grid min-h-96 place-items-center text-sm font-semibold text-[color:var(--text-muted)]">
              Cargando progreso...
            </div>
          ) : (
            <section className="min-w-0">
              <button
                type="button"
                onClick={() => setSelectedId("")}
                className="mb-4 inline-flex h-10 items-center gap-2 rounded-lg border border-[color:var(--border)] px-3 text-sm font-black lg:hidden"
              >
                <Users className="h-4 w-4" />
                Cambiar atleta
              </button>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-600 font-black text-white">
                    {initials(overview.athlete.name)}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-2xl font-black">
                      {overview.athlete.name}
                    </h2>
                    <p className="truncate text-sm font-semibold text-[color:var(--text-muted)]">
                      {overview.athlete.email}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-11 rounded-lg"
                    onClick={() => setAssigning(true)}
                  >
                    <ClipboardList className="h-4 w-4" />
                    Asignar
                  </Button>
                  <Button
                    className="h-11 rounded-lg"
                    disabled={!overview.routines.length}
                    onClick={startTraining}
                  >
                    <Play className="h-4 w-4" />
                    Entrenar
                  </Button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3 border-y border-[color:var(--border)] py-4">
                <div>
                  <p className="text-2xl font-black">
                    {overview.metrics.routines}
                  </p>
                  <p className="text-xs font-bold text-[color:var(--text-muted)]">
                    Rutinas
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-black">
                    {overview.metrics.sessions}
                  </p>
                  <p className="text-xs font-bold text-[color:var(--text-muted)]">
                    Sesiones recientes
                  </p>
                </div>
                <div>
                  <p className="truncate text-2xl font-black">
                    {formatVolume(overview.metrics.recentVolume)}
                  </p>
                  <p className="text-xs font-bold text-[color:var(--text-muted)]">
                    Volumen reciente
                  </p>
                </div>
              </div>

              <div className="mt-7 grid gap-8 xl:grid-cols-2">
                <section>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-base font-black">
                      <Dumbbell className="h-5 w-5 text-blue-600" />
                      Rutinas asignadas
                    </h3>
                    <span className="text-xs font-bold text-[color:var(--text-muted)]">
                      {overview.routines.length}
                    </span>
                  </div>
                  <div className="mt-3 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
                    {overview.routines.length ? (
                      overview.routines.map((routine) => (
                        <div
                          key={routine._id || routine.id}
                          className="flex items-center gap-3 py-3"
                        >
                          <ClipboardList className="h-5 w-5 shrink-0 text-blue-600" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black">
                              {routine.name}
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-[color:var(--text-muted)]">
                              {(routine.exercises || []).length} ejercicios
                              {routine.assignedByCoachId
                                ? " · Asignada por coach"
                                : ""}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="py-6 text-sm font-semibold text-[color:var(--text-muted)]">
                        Asigna una rutina antes de iniciar el entrenamiento.
                      </p>
                    )}
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-base font-black">
                      <Activity className="h-5 w-5 text-blue-600" />
                      Actividad reciente
                    </h3>
                    <CalendarDays className="h-4 w-4 text-[color:var(--text-muted)]" />
                  </div>
                  <div className="mt-3 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
                    {overview.recentTrainings.length ? (
                      overview.recentTrainings.slice(0, 6).map((training) => (
                        <div
                          key={training._id || training.id}
                          className="flex items-center justify-between gap-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black">
                              {training.routineName || "Entrenamiento"}
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-[color:var(--text-muted)]">
                              {formatDate(training.date)}
                              {training.sessionType === "supervised"
                                ? " · Supervisada"
                                : ""}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-black text-[color:var(--text-muted)]">
                            {formatVolume(training.totalVolume)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="py-6 text-sm font-semibold text-[color:var(--text-muted)]">
                        Todavía no hay sesiones registradas.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </section>
          )}
        </div>
      )}

      {assigning && selectedAthlete ? (
        <AssignRoutineModal
          athlete={selectedAthlete}
          templates={templates}
          onAssign={assignRoutine}
          onClose={() => setAssigning(false)}
        />
      ) : null}
    </main>
  );
}
