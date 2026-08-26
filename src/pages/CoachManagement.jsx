import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Crown,
  Gauge,
  Loader2,
  MoreVertical,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
  UserRoundCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import ProfileAvatar from "../components/profile/ProfileAvatar";
import Badge from "../components/ui/badge";
import Button from "../components/ui/button";
import OperationLoader from "../components/system/OperationLoader";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { planLabel, subscriptionLabel } from "../utils/premium";

const idOf = (item) => String(item?._id || item?.id || "");

const roleLabel = (role) => {
  if (role === "Admin") return "Administrador";
  if (role === "Entrenador") return "Coach";
  return "Atleta";
};

export default function CoachManagement({ onNavigate }) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState("overview");
  const [savingId, setSavingId] = useState("");
  const [openUserMenuId, setOpenUserMenuId] = useState("");
  const [roleChangeTarget, setRoleChangeTarget] = useState(null);
  const [subscriptionTarget, setSubscriptionTarget] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setUsers(await api.getUsers());
    } catch (error) {
      toast.error(error.message || "No se pudieron cargar los usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!openUserMenuId) return undefined;
    const closeMenu = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (
        event.type === "pointerdown" &&
        event.target.closest("[data-user-actions]")
      )
        return;
      setOpenUserMenuId("");
    };
    document.addEventListener("pointerdown", closeMenu);
    document.addEventListener("keydown", closeMenu);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      document.removeEventListener("keydown", closeMenu);
    };
  }, [openUserMenuId]);

  const coachAccounts = useMemo(
    () => users.filter((item) => ["Admin", "Entrenador"].includes(item.role)),
    [users],
  );
  const athletes = useMemo(
    () => users.filter((item) => item.role === "Cliente"),
    [users],
  );
  const linkedAthletes = useMemo(
    () => athletes.filter((item) => item.assignedTrainerId),
    [athletes],
  );
  const activeCoachAccounts = useMemo(
    () => coachAccounts.filter((item) => item.isActive),
    [coachAccounts],
  );
  const coachRows = useMemo(
    () =>
      coachAccounts
        .map((coach) => ({
          ...coach,
          athleteCount: linkedAthletes.filter(
            (athlete) => String(athlete.assignedTrainerId) === idOf(coach),
          ).length,
        }))
        .sort(
          (a, b) =>
            b.athleteCount - a.athleteCount || a.name.localeCompare(b.name),
        ),
    [coachAccounts, linkedAthletes],
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    if (!query) return users;
    return users.filter((item) =>
      `${item.name} ${item.email} ${roleLabel(item.role)}`
        .toLocaleLowerCase("es")
        .includes(query),
    );
  }, [search, users]);

  const linkedPercent = athletes.length
    ? Math.round((linkedAthletes.length / athletes.length) * 100)
    : 0;
  const averageLoad = activeCoachAccounts.length
    ? (linkedAthletes.length / activeCoachAccounts.length).toFixed(1)
    : "0";
  const currentAdminId = idOf(currentUser);

  const updateUser = async (target, payload, successMessage) => {
    const targetId = idOf(target);
    try {
      setSavingId(targetId);
      const updated = await api.updateUser(targetId, payload);
      setUsers((current) =>
        current.map((item) =>
          idOf(item) === targetId ? { ...item, ...updated } : item,
        ),
      );
      toast.success(successMessage);
      return true;
    } catch (error) {
      toast.error(error.message || "No se pudo actualizar el usuario");
      return false;
    } finally {
      setSavingId("");
    }
  };

  const confirmRoleChange = async () => {
    if (!roleChangeTarget) return;
    const nextRole = roleChangeTarget.role;
    const changed = await updateUser(
      roleChangeTarget.user,
      { role: nextRole, assignedTrainerId: null },
      nextRole === "Entrenador"
        ? `${roleChangeTarget.user.name} ahora tiene acceso de coach.`
        : `${roleChangeTarget.user.name} ahora es un atleta independiente.`,
    );
    if (changed) setRoleChangeTarget(null);
  };

  const manageSubscription = async (action) => {
    if (!subscriptionTarget) return;
    const targetId = idOf(subscriptionTarget);
    const plan =
      subscriptionTarget.role === "Entrenador" ? "coach_pro" : "athlete_pro";
    try {
      setSavingId(targetId);
      const updated = await api.updateUserSubscription(targetId, {
        action,
        plan,
        trialDays: 14,
        periodDays: 30,
      });
      setUsers((current) =>
        current.map((item) =>
          idOf(item) === targetId ? { ...item, ...updated } : item,
        ),
      );
      const message =
        action === "start_trial"
          ? "Prueba Premium activada por 14 dias"
          : action === "activate"
            ? "Plan Premium activado por 30 dias"
            : "La cuenta volvio al plan gratuito";
      toast.success(message, { description: subscriptionTarget.name });
      setSubscriptionTarget(null);
    } catch (error) {
      toast.error(error.message || "No se pudo actualizar la suscripcion");
    } finally {
      setSavingId("");
    }
  };

  const deleteUser = async () => {
    if (!userToDelete) return;
    const targetId = idOf(userToDelete);
    try {
      setSavingId(targetId);
      await api.deleteUser(targetId);
      setUsers((current) => current.filter((item) => idOf(item) !== targetId));
      toast.success("Usuario eliminado", {
        description: `${userToDelete.name} y sus datos asociados fueron eliminados.`,
      });
      setUserToDelete(null);
    } catch (error) {
      toast.error(error.message || "No se pudo eliminar el usuario");
    } finally {
      setSavingId("");
    }
  };

  const openActions = (targetId) => {
    setOpenUserMenuId((current) => (current === targetId ? "" : targetId));
  };

  return (
    <main className="management-shell mx-auto w-full max-w-[1280px] pb-24 text-[color:var(--text)]">
      <header className="grid gap-4 border-b border-[color:var(--border)] pb-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
            Estado de la plataforma
          </p>
          <h1 className="mt-1 text-[30px] font-black uppercase leading-none md:text-[36px]">
            Coaches y atletas
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] font-semibold leading-5 text-[color:var(--text-muted)]">
            Supervisa adopcion, distribucion y acceso. Cada coach administra su
            propia cartera.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.("trainer")}
          className="theme-accent-solid flex h-11 items-center justify-center gap-2 px-5 text-[12px] font-black uppercase"
        >
          <Users className="h-4 w-4" />
          Mis atletas
          <ArrowRight className="h-4 w-4" />
        </button>
      </header>

      <nav
        className="mt-4 grid grid-cols-2 border border-[color:var(--border)] bg-[color:var(--card)] p-1 md:w-fit"
        aria-label="Vistas de administracion"
      >
        {[
          ["overview", "Resumen"],
          ["directory", "Directorio"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setActiveView(id);
              setOpenUserMenuId("");
            }}
            aria-pressed={activeView === id}
            className={`h-10 min-w-32 px-5 text-[11px] font-black uppercase ${
              activeView === id
                ? "theme-accent-solid"
                : "text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="mt-4 min-h-64 border border-[color:var(--border)] bg-[color:var(--card)]">
          <OperationLoader
            active
            delayMs={0}
            mode="inline"
            title="Cargando plataforma"
            description="Sincronizando usuarios, coaches y vinculaciones."
          />
        </div>
      ) : activeView === "overview" ? (
        <div className="mt-4 space-y-6">
          <section
            className="grid grid-cols-2 gap-2 xl:grid-cols-4"
            aria-label="Indicadores principales"
          >
            {[
              [
                "Atletas",
                athletes.length,
                Users,
                `${athletes.length - linkedAthletes.length} independientes`,
              ],
              [
                "Con coach",
                linkedAthletes.length,
                UserRoundCheck,
                `${linkedPercent}% de los atletas`,
              ],
              [
                "Cuentas coach",
                coachAccounts.length,
                ShieldCheck,
                `${activeCoachAccounts.length} activas, incluye admins`,
              ],
              ["Promedio", averageLoad, Gauge, "atletas por coach activo"],
            ].map(([label, value, Icon, detail]) => (
              <article
                key={label}
                className="border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-sm dark:shadow-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                    {label}
                  </p>
                  <Icon className="h-4 w-4 text-[#ff5722] dark:text-[#e2ff00]" />
                </div>
                <p className="mt-3 text-[30px] font-black leading-none">
                  {value}
                </p>
                <p className="mt-2 text-[11px] font-semibold text-[color:var(--text-muted)]">
                  {detail}
                </p>
              </article>
            ))}
          </section>

          <section>
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
                  Operacion
                </p>
                <h2 className="mt-1 text-xl font-black uppercase">
                  Distribucion por coach
                </h2>
              </div>
              <span className="text-[11px] font-bold text-[color:var(--text-muted)]">
                {linkedAthletes.length} vinculados
              </span>
            </div>
            <div className="border border-[color:var(--border)] bg-[color:var(--card)]">
              <div className="hidden grid-cols-[minmax(220px,1fr)_120px_minmax(160px,0.8fr)_100px] gap-4 border-b border-[color:var(--border)] bg-[color:var(--bg)] px-4 py-2 text-[10px] font-black uppercase text-[color:var(--text-muted)] md:grid">
                <span>Responsable</span>
                <span>Rol</span>
                <span>Carga relativa</span>
                <span>Atletas</span>
              </div>
              <div className="divide-y divide-[color:var(--border)]">
                {coachRows.map((coach) => {
                  const coachId = idOf(coach);
                  const maxLoad = Math.max(
                    1,
                    ...coachRows.map((item) => item.athleteCount),
                  );
                  const loadPercent = Math.round(
                    (coach.athleteCount / maxLoad) * 100,
                  );
                  return (
                    <div
                      key={coachId}
                      className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(220px,1fr)_120px_minmax(160px,0.8fr)_100px] md:items-center md:gap-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <ProfileAvatar
                          photoId={coach.profile?.avatarPhotoId}
                          name={coach.name}
                          className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[color:var(--border)]"
                          fallbackClassName="bg-[color:var(--accent)] text-sm font-black text-[color:var(--accent-contrast)]"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-black">
                            {coach.name}
                            {coachId === currentAdminId ? " · Tu cuenta" : ""}
                          </p>
                          <p className="truncate text-[11px] font-semibold text-[color:var(--text-muted)]">
                            {coach.email}
                          </p>
                        </div>
                      </div>
                      <span className="w-fit border border-[color:var(--border)] px-2 py-1 text-[9px] font-black uppercase">
                        {roleLabel(coach.role)}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden bg-[color:var(--border)]">
                          <div
                            className="h-full bg-[#ff5722] dark:bg-[#e2ff00]"
                            style={{ width: `${loadPercent}%` }}
                          />
                        </div>
                        <Badge
                          variant={coach.isActive ? "enabled" : "inactive"}
                        >
                          {coach.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                      <p className="text-[22px] font-black leading-none md:text-right">
                        {coach.athleteCount}
                      </p>
                    </div>
                  );
                })}
                {!coachRows.length ? (
                  <p className="px-4 py-10 text-center text-sm text-[color:var(--text-muted)]">
                    Todavia no hay cuentas coach.
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="border-l-2 border-[color:var(--accent)] bg-[color:var(--accent)] p-4 text-[color:var(--accent-contrast)]">
            <p className="text-[11px] font-black uppercase">
              Vinculacion sin intermediarios
            </p>
            <p className="mt-1 max-w-3xl text-[12px] font-semibold leading-5 text-current/80">
              En beta, toda cuenta nueva inicia como atleta independiente. El
              coach comparte su codigo y el atleta decide vincularse desde
              Perfil. El administrador solo supervisa los indicadores generales.
            </p>
          </section>
        </div>
      ) : (
        <section className="mt-4">
          <div className="grid gap-3 border border-[color:var(--border)] bg-[color:var(--card)] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <label className="relative block max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, correo o rol"
                className="theme-accent-focus h-11 w-full border border-[color:var(--border)] bg-[color:var(--bg)] pl-10 pr-3 text-[13px] font-semibold outline-none"
              />
            </label>
            <p className="text-[11px] font-bold text-[color:var(--text-muted)]">
              {filteredUsers.length} de {users.length} cuentas
            </p>
          </div>
          <div className="mt-2 border border-[color:var(--border)] bg-[color:var(--card)]">
            <div className="hidden grid-cols-[minmax(230px,1fr)_110px_150px_135px_80px_auto] gap-4 border-b border-[color:var(--border)] bg-[color:var(--bg)] px-4 py-2 text-[10px] font-black uppercase text-[color:var(--text-muted)] md:grid">
              <span>Cuenta</span>
              <span>Rol</span>
              <span>Relacion</span>
              <span>Plan</span>
              <span>Estado</span>
              <span>Mas</span>
            </div>
            <div className="divide-y divide-[color:var(--border)]">
              {filteredUsers.map((item) => {
                const itemId = idOf(item);
                const isCurrentAdmin = itemId === currentAdminId;
                const linked =
                  item.role === "Cliente" && item.assignedTrainerId;
                return (
                  <div
                    key={itemId}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 md:grid-cols-[minmax(230px,1fr)_110px_150px_135px_80px_auto] md:px-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <ProfileAvatar
                        photoId={item.profile?.avatarPhotoId}
                        name={item.name}
                        className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[color:var(--border)]"
                        fallbackClassName="bg-[color:var(--accent)] text-sm font-black text-[color:var(--accent-contrast)]"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-black">
                          {item.name}
                        </p>
                        <p className="truncate text-[11px] font-semibold text-[color:var(--text-muted)]">
                          {item.email}
                        </p>
                      </div>
                    </div>
                    <span className="justify-self-end text-[10px] font-black uppercase md:justify-self-start">
                      {roleLabel(item.role)}
                    </span>
                    <p className="col-span-2 text-[11px] font-semibold text-[color:var(--text-muted)] md:col-span-1">
                      {item.role === "Cliente"
                        ? linked
                          ? "Vinculado a un coach"
                          : "Atleta independiente"
                        : "Gestiona su propia cartera"}
                    </p>
                    <span className="hidden w-fit border border-[color:var(--border)] px-2 py-1 text-[9px] font-black uppercase md:inline-flex">
                      {subscriptionLabel(item)}
                    </span>
                    <Badge
                      className="hidden w-fit md:inline-flex"
                      variant={item.isActive ? "enabled" : "inactive"}
                    >
                      {item.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                    <div className="justify-self-end" data-user-actions>
                      {isCurrentAdmin ? (
                        <span className="px-2 text-[10px] font-black uppercase text-[color:var(--text-muted)]">
                          Tu cuenta
                        </span>
                      ) : (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => openActions(itemId)}
                            className="grid h-9 w-9 place-items-center border border-[color:var(--border)]"
                            aria-label={`Acciones para ${item.name}`}
                          >
                            {savingId === itemId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreVertical className="h-4 w-4" />
                            )}
                          </button>
                          {openUserMenuId === itemId ? (
                            <div className="absolute right-0 top-[calc(100%+0.35rem)] z-30 w-56 border border-[color:var(--border)] bg-[color:var(--card)] p-1.5 shadow-2xl">
                              {item.role !== "Admin" ? (
                                <button
                                  type="button"
                                  className="flex h-10 w-full items-center gap-2 px-3 text-left text-[12px] font-bold hover:bg-[color:var(--bg)]"
                                  onClick={() => {
                                    setOpenUserMenuId("");
                                    setSubscriptionTarget(item);
                                  }}
                                >
                                  <Crown className="h-4 w-4" />
                                  Gestionar Premium
                                </button>
                              ) : null}
                              {item.role !== "Admin" ? (
                                <button
                                  type="button"
                                  className="flex h-10 w-full items-center gap-2 px-3 text-left text-[12px] font-bold hover:bg-[color:var(--bg)]"
                                  onClick={() => {
                                    setOpenUserMenuId("");
                                    setRoleChangeTarget({
                                      user: item,
                                      role:
                                        item.role === "Entrenador"
                                          ? "Cliente"
                                          : "Entrenador",
                                    });
                                  }}
                                >
                                  <UserCog className="h-4 w-4" />
                                  {item.role === "Entrenador"
                                    ? "Convertir en atleta"
                                    : "Dar acceso de coach"}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="flex h-10 w-full items-center gap-2 px-3 text-left text-[12px] font-bold text-red-600 hover:bg-red-500/10 dark:text-red-300"
                                onClick={() => {
                                  setOpenUserMenuId("");
                                  setUserToDelete(item);
                                }}
                              >
                                <Trash2 className="h-4 w-4" /> Eliminar usuario
                              </button>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {!filteredUsers.length ? (
                <p className="px-4 py-10 text-center text-sm text-[color:var(--text-muted)]">
                  No hay resultados para esta busqueda.
                </p>
              ) : null}
            </div>
          </div>
        </section>
      )}

      {roleChangeTarget ? (
        <div className="fixed inset-0 z-[90] flex items-end bg-black/60 sm:items-center sm:justify-center sm:p-4">
          <div className="w-full rounded-t-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-2xl sm:max-w-md sm:rounded-[4px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
                  Cambio de acceso
                </p>
                <h2 className="mt-1 text-xl font-black uppercase">
                  {roleChangeTarget.role === "Entrenador"
                    ? "Dar acceso de coach"
                    : "Convertir en atleta"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setRoleChangeTarget(null)}
                className="grid h-10 w-10 place-items-center border border-[color:var(--border)]"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-4 text-[13px] font-semibold leading-5 text-[color:var(--text-muted)]">
              {roleChangeTarget.role === "Entrenador"
                ? `${roleChangeTarget.user.name} podra crear plantillas, invitar atletas y supervisar entrenamientos.`
                : `${roleChangeTarget.user.name} perdera el acceso de coach. Sus atletas quedaran independientes y sus planes activos se pausaran.`}
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
                className="theme-accent-solid h-11 px-4 text-sm font-black disabled:opacity-50"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {subscriptionTarget ? (
        <div className="fixed inset-0 z-[90] flex items-end bg-black/60 sm:items-center sm:justify-center sm:p-4">
          <div className="w-full rounded-t-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-2xl sm:max-w-md sm:rounded-[4px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase text-[#ff5722] dark:text-[#e2ff00]">
                  Suscripcion manual
                </p>
                <h2 className="mt-1 text-xl font-black uppercase">
                  Gestionar Premium
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSubscriptionTarget(null)}
                className="grid h-10 w-10 place-items-center border border-[color:var(--border)]"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
              <p className="text-sm font-black">{subscriptionTarget.name}</p>
              <p className="mt-1 text-[11px] font-semibold text-[color:var(--text-muted)]">
                Plan actual: {subscriptionLabel(subscriptionTarget)} · Siguiente
                plan:{" "}
                {planLabel(
                  subscriptionTarget.role === "Entrenador"
                    ? "coach_pro"
                    : "athlete_pro",
                )}
              </p>
            </div>
            <p className="mt-4 text-[12px] font-semibold leading-5 text-[color:var(--text-muted)]">
              Esta activacion es interna. No genera ningun cobro y puede
              revocarse en cualquier momento.
            </p>
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={() => manageSubscription("start_trial")}
                disabled={Boolean(savingId)}
                className="theme-accent-solid h-11 px-4 text-sm font-black disabled:opacity-50"
              >
                Iniciar prueba de 14 dias
              </button>
              <Button
                variant="outline"
                disabled={Boolean(savingId)}
                onClick={() => manageSubscription("activate")}
              >
                Activar Premium por 30 dias
              </Button>
              <button
                type="button"
                onClick={() => manageSubscription("set_free")}
                disabled={Boolean(savingId)}
                className="h-10 text-[12px] font-black text-red-600 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-300"
              >
                Cambiar al plan gratuito
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {userToDelete ? (
        <div className="fixed inset-0 z-[90] flex items-end bg-black/60 sm:items-center sm:justify-center sm:p-4">
          <div className="w-full rounded-t-xl border border-[color:var(--border)] bg-[color:var(--card)] p-4 shadow-2xl sm:max-w-md sm:rounded-[4px]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase text-red-500">
                  Accion permanente
                </p>
                <h2 className="mt-1 text-xl font-black uppercase">
                  Eliminar usuario
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="grid h-10 w-10 place-items-center border border-[color:var(--border)]"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-4 text-[13px] font-semibold leading-5 text-[color:var(--text-muted)]">
              Se eliminaran la cuenta, entrenamientos, rutinas, fotos y
              ejercicios personalizados de{" "}
              <strong className="text-[color:var(--text)]">
                {userToDelete.name}
              </strong>
              .
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                disabled={Boolean(savingId)}
                onClick={() => setUserToDelete(null)}
              >
                Cancelar
              </Button>
              <button
                type="button"
                onClick={deleteUser}
                disabled={Boolean(savingId)}
                className="h-11 bg-red-600 px-4 text-sm font-black text-white disabled:opacity-50"
              >
                {savingId ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
