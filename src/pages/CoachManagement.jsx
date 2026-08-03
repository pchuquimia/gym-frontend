import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Loader2,
  Search,
  Trash2,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Button from "../components/ui/button";
import { api } from "../services/api";

export default function CoachManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [userToDelete, setUserToDelete] = useState(null);
  const [planClient, setPlanClient] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [pendingPlanDeleteId, setPendingPlanDeleteId] = useState("");
  const [deletingPlanId, setDeletingPlanId] = useState("");

  const loadUsers = async () => {
    try {
      setLoading(true);
      setUsers(await api.getUsers());
    } catch (err) {
      toast.error(err.message || "No se pudieron cargar los usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const coaches = useMemo(
    () => users.filter((user) => user.role === "Entrenador" && user.isActive),
    [users],
  );
  const clients = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter(
      (user) =>
        user.role === "Cliente" &&
        (!query || `${user.name} ${user.email}`.toLowerCase().includes(query)),
    );
  }, [search, users]);

  const updateUser = async (id, payload, message) => {
    try {
      setSavingId(id);
      const updated = await api.updateUser(id, payload);
      setUsers((current) =>
        current.map((user) =>
          (user._id || user.id) === id ? { ...user, ...updated } : user,
        ),
      );
      const notification =
        typeof message === "string" ? { title: message } : message;
      toast.success(notification.title, {
        description: notification.description,
      });
    } catch (err) {
      toast.error(err.message || "No se pudo actualizar el usuario");
    } finally {
      setSavingId("");
    }
  };

  const deleteUser = async () => {
    if (!userToDelete) return;
    const id = userToDelete._id || userToDelete.id;
    try {
      const deletedName = userToDelete.name;
      setSavingId(id);
      await api.deleteUser(id);
      setUsers((current) =>
        current.filter((user) => (user._id || user.id) !== id),
      );
      setUserToDelete(null);
      toast.success("Usuario eliminado", {
        description: `${deletedName} y sus datos asociados fueron eliminados.`,
      });
    } catch (err) {
      toast.error(err.message || "No se pudo eliminar el usuario");
    } finally {
      setSavingId("");
    }
  };

  const openPlans = async (client) => {
    const clientId = client._id || client.id;
    setPlanClient(client);
    setPlans([]);
    setPendingPlanDeleteId("");
    setLoadingPlans(true);
    try {
      setPlans(await api.getTrainingPlans(clientId));
    } catch (err) {
      toast.error(err.message || "No se pudieron cargar los planes");
      setPlanClient(null);
    } finally {
      setLoadingPlans(false);
    }
  };

  const deletePlan = async (plan) => {
    const planId = plan._id || plan.id;
    try {
      setDeletingPlanId(planId);
      await api.deleteTrainingPlan(planId);
      setPlans((current) =>
        current.filter((item) => (item._id || item.id) !== planId),
      );
      setPendingPlanDeleteId("");
      toast.success("Plan eliminado", {
        description: `${plan.name} fue retirado y sus rutinas quedaron archivadas.`,
      });
    } catch (err) {
      toast.error(err.message || "No se pudo eliminar el plan");
    } finally {
      setDeletingPlanId("");
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl pb-20">
      <header className="border-b border-[color:var(--border)] pb-5">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
          Administración
        </p>
        <h1 className="mt-1 text-3xl font-black">Coaches y atletas</h1>
        <p className="mt-1 text-sm font-semibold text-[color:var(--text-muted)]">
          Define quién puede entrenar a cada usuario.
        </p>
      </header>

      {loading ? (
        <div className="grid min-h-72 place-items-center text-sm font-semibold text-[color:var(--text-muted)]">
          Cargando usuarios...
        </div>
      ) : (
        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-black">
                <UserCog className="h-5 w-5 text-blue-600" />
                Coaches
              </h2>
              <span className="text-xs font-black text-[color:var(--text-muted)]">
                {coaches.length}
              </span>
            </div>
            <div className="mt-3 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
              {coaches.length ? (
                coaches.map((coach) => (
                  <div
                    key={coach._id || coach.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">
                        {coach.name}
                      </p>
                      <p className="truncate text-xs font-semibold text-[color:var(--text-muted)]">
                        {coach.email}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={savingId === (coach._id || coach.id)}
                        onClick={() =>
                          updateUser(
                            coach._id || coach.id,
                            { role: "Cliente", assignedTrainerId: null },
                            {
                              title: "Rol actualizado",
                              description: `${coach.name} ahora es cliente.`,
                            },
                          )
                        }
                      >
                        Quitar rol
                      </Button>
                      <button
                        type="button"
                        onClick={() => setUserToDelete(coach)}
                        disabled={savingId === (coach._id || coach.id)}
                        className="grid h-10 w-10 place-items-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
                        aria-label={`Eliminar a ${coach.name}`}
                        title="Eliminar usuario"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-6 text-sm font-semibold text-[color:var(--text-muted)]">
                  Todavía no existen cuentas coach.
                </p>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-black">
                <Users className="h-5 w-5 text-blue-600" />
                Usuarios
              </h2>
              <span className="text-xs font-black text-[color:var(--text-muted)]">
                {clients.length}
              </span>
            </div>
            <label className="relative mt-3 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar usuario"
                className="h-11 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] pl-10 pr-3 text-sm font-semibold outline-none focus:border-blue-500"
              />
            </label>
            <div className="mt-3 divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
              {clients.map((client) => {
                const id = client._id || client.id;
                return (
                  <div
                    key={id}
                    className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">
                        {client.name}
                      </p>
                      <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-2">
                        <p className="truncate text-xs font-semibold text-[color:var(--text-muted)]">
                          {client.email}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                            client.trainingMode === "coach_managed" ||
                            client.assignedTrainerId
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                          }`}
                        >
                          {client.trainingMode === "coach_managed" ||
                          client.assignedTrainerId
                            ? "Con coach"
                            : "Independiente"}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-2 sm:w-96">
                      <select
                        value={client.assignedTrainerId || ""}
                        disabled={savingId === id || !coaches.length}
                        onChange={(event) => {
                          const coachId = event.target.value;
                          const coach = coaches.find(
                            (item) => (item._id || item.id) === coachId,
                          );
                          updateUser(
                            id,
                            { assignedTrainerId: coachId || null },
                            coach
                              ? {
                                  title: "Coach asignado",
                                  description: `${coach.name} ahora entrena a ${client.name}.`,
                                }
                              : {
                                  title: "Asignación retirada",
                                  description: `${client.name} quedó sin coach.`,
                                },
                          );
                        }}
                        className="h-10 min-w-0 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-2 text-sm font-bold outline-none"
                        aria-label={`Coach de ${client.name}`}
                      >
                        <option value="">Sin coach</option>
                        {coaches.map((coach) => (
                          <option
                            key={coach._id || coach.id}
                            value={coach._id || coach.id}
                          >
                            {coach.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={savingId === id}
                        onClick={() =>
                          updateUser(
                            id,
                            { role: "Entrenador", assignedTrainerId: null },
                            {
                              title: "Coach creado",
                              description: `${client.name} ya tiene acceso al modo Coach.`,
                            },
                          )
                        }
                      >
                        Hacer coach
                      </Button>
                      <button
                        type="button"
                        onClick={() => openPlans(client)}
                        disabled={savingId === id}
                        className="grid h-10 w-10 place-items-center rounded-lg text-blue-600 transition hover:bg-blue-50 disabled:opacity-50 dark:hover:bg-blue-500/10"
                        aria-label={`Planes de ${client.name}`}
                        title="Gestionar planes"
                      >
                        <CalendarDays className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserToDelete(client)}
                        disabled={savingId === id}
                        className="grid h-10 w-10 place-items-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
                        aria-label={`Eliminar a ${client.name}`}
                        title="Eliminar usuario"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {userToDelete ? (
        <div className="fixed inset-0 z-[90] flex items-end bg-black/50 sm:items-center sm:justify-center sm:p-4">
          <div className="w-full rounded-t-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-2xl sm:max-w-md sm:rounded-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-red-600">
                  Acción permanente
                </p>
                <h2 className="mt-1 text-xl font-black">Eliminar usuario</h2>
              </div>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={Boolean(savingId)}
                className="grid h-10 w-10 place-items-center rounded-lg border border-[color:var(--border)]"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-4 text-sm font-semibold text-[color:var(--text-muted)]">
              Se eliminarán la cuenta y todos sus entrenamientos, rutinas, fotos
              y ejercicios personalizados.
            </p>
            <div className="mt-4 border-y border-[color:var(--border)] py-3">
              <p className="text-sm font-black">{userToDelete.name}</p>
              <p className="mt-0.5 text-xs font-semibold text-[color:var(--text-muted)]">
                {userToDelete.email}
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-11 rounded-lg"
                disabled={Boolean(savingId)}
                onClick={() => setUserToDelete(null)}
              >
                Cancelar
              </Button>
              <button
                type="button"
                onClick={deleteUser}
                disabled={Boolean(savingId)}
                className="h-11 rounded-lg bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {savingId ? "Eliminando..." : "Eliminar definitivamente"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {planClient ? (
        <div className="fixed inset-0 z-[90] flex items-end bg-black/50 sm:items-center sm:justify-center sm:p-4">
          <div className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-[color:var(--border)] bg-[color:var(--card)] shadow-2xl sm:max-w-xl sm:rounded-lg">
            <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] p-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
                  Administracion de planes
                </p>
                <h2 className="mt-1 truncate text-xl font-black">
                  {planClient.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setPlanClient(null)}
                disabled={Boolean(deletingPlanId)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[color:var(--border)]"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              {loadingPlans ? (
                <div className="grid min-h-40 place-items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : plans.length ? (
                <div className="divide-y divide-[color:var(--border)] border-y border-[color:var(--border)]">
                  {plans.map((plan) => {
                    const planId = plan._id || plan.id;
                    const confirming = pendingPlanDeleteId === planId;
                    return (
                      <div
                        key={planId}
                        className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">
                            {plan.name}
                          </p>
                          <p className="mt-0.5 text-xs font-semibold text-[color:var(--text-muted)]">
                            {plan.durationWeeks} semanas ·{" "}
                            {plan.status === "active"
                              ? "Activo"
                              : plan.status === "completed"
                                ? "Finalizado"
                                : "Pausado"}
                          </p>
                        </div>
                        {confirming ? (
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={Boolean(deletingPlanId)}
                              onClick={() => setPendingPlanDeleteId("")}
                            >
                              Cancelar
                            </Button>
                            <button
                              type="button"
                              onClick={() => deletePlan(plan)}
                              disabled={Boolean(deletingPlanId)}
                              className="h-10 rounded-lg bg-red-600 px-3 text-xs font-black text-white disabled:opacity-60"
                            >
                              {deletingPlanId === planId
                                ? "Eliminando..."
                                : "Confirmar"}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPendingPlanDeleteId(planId)}
                            className="grid h-10 w-10 place-items-center self-end rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 sm:self-auto"
                            aria-label={`Eliminar ${plan.name}`}
                            title="Eliminar plan"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <CalendarDays className="mx-auto h-8 w-8 text-[color:var(--text-muted)]" />
                  <p className="mt-3 text-sm font-black">Sin planes</p>
                  <p className="mt-1 text-xs font-semibold text-[color:var(--text-muted)]">
                    Este usuario no tiene planes asignados.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
