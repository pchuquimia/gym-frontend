import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  Search,
  ShieldCheck,
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
  const [activeView, setActiveView] = useState("athletes");
  const [roleChangeTarget, setRoleChangeTarget] = useState(null);

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

  const availableCoaches = useMemo(
    () => users.filter((user) => user.role === "Entrenador" && user.isActive),
    [users],
  );
  const coaches = useMemo(() => {
    const query = search.trim().toLowerCase();
    return availableCoaches.filter(
      (user) =>
        !query || `${user.name} ${user.email}`.toLowerCase().includes(query),
    );
  }, [availableCoaches, search]);
  const clients = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter(
      (user) =>
        user.role === "Cliente" &&
        (!query || `${user.name} ${user.email}`.toLowerCase().includes(query)),
    );
  }, [search, users]);
  const managedClientsCount = useMemo(
    () =>
      users.filter(
        (user) => user.role === "Cliente" && user.assignedTrainerId,
      ).length,
    [users],
  );

  const confirmRoleChange = async () => {
    if (!roleChangeTarget) return;
    const id = roleChangeTarget.user._id || roleChangeTarget.user.id;
    const toCoach = roleChangeTarget.role === "Entrenador";
    const updated = await updateUser(
      id,
      {
        role: roleChangeTarget.role,
        assignedTrainerId: null,
      },
      {
        title: toCoach ? "Coach creado" : "Rol actualizado",
        description: toCoach
          ? `${roleChangeTarget.user.name} ya tiene acceso al modo Coach.`
          : `${roleChangeTarget.user.name} ahora es atleta independiente.`,
      },
    );
    if (updated) setRoleChangeTarget(null);
  };

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
      return true;
    } catch (err) {
      toast.error(err.message || "No se pudo actualizar el usuario");
      return false;
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
    <main className="management-shell mx-auto w-full max-w-6xl pb-24">
      <header className="border-b border-[color:var(--border)] pb-5">
        <p className="text-[11px] font-black uppercase text-[color:var(--text-muted)]">
          Administración
        </p>
        <h1 className="mt-1 font-condensed text-3xl font-bold uppercase leading-none text-[color:var(--accent-strong)] dark:text-[color:var(--accent)]">
          Coaches y atletas
        </h1>
        <p className="mt-2 text-sm font-semibold text-[color:var(--text-muted)]">
          Asigna responsables, revisa planes y administra el acceso de cada cuenta.
        </p>
      </header>

      <section className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
        {[
          ["Atletas", users.filter((item) => item.role === "Cliente").length, Users],
          ["Con coach", managedClientsCount, CheckCircle2],
          ["Coaches", availableCoaches.length, ShieldCheck],
        ].map(([label, value, Icon]) => (
          <div key={label} className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-3 dark:rounded-[4px]">
            <Icon className="h-4 w-4 text-[color:var(--accent-strong)] dark:text-[color:var(--accent)]" />
            <p className="mt-3 font-condensed text-2xl font-bold leading-none">{value}</p>
            <p className="mt-1 text-[11px] font-bold uppercase text-[color:var(--text-muted)]">{label}</p>
          </div>
        ))}
      </section>

      <div className="mt-5 grid gap-3 sm:grid-cols-[auto_minmax(240px,1fr)]">
        <div className="grid grid-cols-2 border border-[color:var(--border)] bg-[color:var(--card)] p-1">
          {[["athletes", "Atletas"], ["coaches", "Coaches"]].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveView(id)}
              className={`h-10 px-4 text-sm font-bold uppercase ${activeView === id ? "theme-accent-solid" : "text-[color:var(--text-muted)]"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Buscar ${activeView === "athletes" ? "atleta" : "coach"}`}
            className="theme-accent-focus h-12 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] pl-10 pr-3 text-sm font-semibold outline-none dark:rounded-[3px]"
          />
        </label>
      </div>

      {loading ? (
        <div className="grid min-h-72 place-items-center text-sm font-semibold text-[color:var(--text-muted)]">
          Cargando usuarios...
        </div>
      ) : (
        <div className="mt-5">
          <section className={activeView === "coaches" ? "" : "hidden"}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-black">
                <UserCog className="h-5 w-5 text-[color:var(--accent-strong)] dark:text-[color:var(--accent)]" />
                Coaches
              </h2>
              <span className="text-xs font-black text-[color:var(--text-muted)]">
                {coaches.length}
              </span>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {coaches.length ? (
                coaches.map((coach) => (
                  <div
                    key={coach._id || coach.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 dark:rounded-[4px]"
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
                          setRoleChangeTarget({ user: coach, role: "Cliente" })
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
                  No hay coaches que coincidan con la búsqueda.
                </p>
              )}
            </div>
          </section>

          <section className={activeView === "athletes" ? "" : "hidden"}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-black">
                <Users className="h-5 w-5 text-[color:var(--accent-strong)] dark:text-[color:var(--accent)]" />
                Atletas
              </h2>
              <span className="text-xs font-black text-[color:var(--text-muted)]">
                {clients.length}
              </span>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {clients.map((client) => {
                const id = client._id || client.id;
                return (
                  <div
                    key={id}
                    className="flex flex-col gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 dark:rounded-[4px]"
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
                              ? "bg-[#ff5722]/10 text-[#c52d00] dark:bg-[#e2ff00]/10 dark:text-[#e2ff00]"
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
                    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
                      <select
                        value={client.assignedTrainerId || ""}
                        disabled={savingId === id || !client.isActive}
                        onChange={(event) => {
                          const coachId = event.target.value;
                          const coach = availableCoaches.find(
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
                        className="theme-accent-focus col-span-3 h-11 min-w-0 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-2 text-sm font-bold outline-none dark:rounded-[3px]"
                        aria-label={`Coach de ${client.name}`}
                      >
                        <option value="">Sin coach · modo independiente</option>
                        {availableCoaches.map((coach) => (
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
                          setRoleChangeTarget({ user: client, role: "Entrenador" })
                        }
                      >
                        Convertir en coach
                      </Button>
                      <button
                        type="button"
                        onClick={() => openPlans(client)}
                        disabled={savingId === id}
                        className="grid h-10 w-10 place-items-center rounded-lg text-[color:var(--accent-strong)] transition hover:bg-[#ff5722]/10 disabled:opacity-50 dark:rounded-[3px] dark:text-[color:var(--accent)] dark:hover:bg-[#e2ff00]/10"
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
              {!clients.length ? (
                <p className="border border-dashed border-[color:var(--border)] px-4 py-10 text-center text-sm font-semibold text-[color:var(--text-muted)] lg:col-span-2">
                  No hay atletas que coincidan con la busqueda.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      )}

      {roleChangeTarget ? (
        <div className="fixed inset-0 z-[90] flex items-end bg-black/55 sm:items-center sm:justify-center sm:p-4">
          <div className="w-full rounded-t-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-2xl sm:max-w-md sm:rounded-lg dark:sm:rounded-[4px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase text-[color:var(--accent-strong)] dark:text-[color:var(--accent)]">
                  Cambio de acceso
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  {roleChangeTarget.role === "Entrenador"
                    ? "Convertir en coach"
                    : "Convertir en atleta"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setRoleChangeTarget(null)}
                disabled={Boolean(savingId)}
                className="grid h-10 w-10 place-items-center border border-[color:var(--border)]"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-4 text-sm font-semibold text-[color:var(--text-muted)]">
              {roleChangeTarget.role === "Entrenador"
                ? `${roleChangeTarget.user.name} dejara de ser atleta y obtendra acceso para gestionar atletas y planes.`
                : `${roleChangeTarget.user.name} perdera el modo Coach. Sus atletas quedaran independientes y los planes activos se pausaran.`}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                disabled={Boolean(savingId)}
                onClick={() => setRoleChangeTarget(null)}
              >
                Cancelar
              </Button>
              <button
                type="button"
                onClick={confirmRoleChange}
                disabled={Boolean(savingId)}
                className="theme-accent-solid h-11 px-4 text-sm font-bold disabled:opacity-60"
              >
                {savingId ? "Guardando..." : "Confirmar cambio"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
                <p className="text-[11px] font-black uppercase text-[color:var(--accent-strong)] dark:text-[color:var(--accent)]">
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
                  <Loader2 className="h-6 w-6 animate-spin text-[color:var(--accent)]" />
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
