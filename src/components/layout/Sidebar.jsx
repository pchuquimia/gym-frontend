import { Check, LogOut, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useUserProfile } from "../../context/UserContext";
import Button from "../ui/button";
import ThemeToggle from "../ThemeToggle";
import ProfileAvatar from "../profile/ProfileAvatar";
import { coachSections, managedClientSections, sections } from "./navConfig";

const canSeeItem = (item, role) => !item.roles || item.roles.includes(role);

const mobileNavOrder = [
  "progreso",
  "dashboard",
  "registrar",
  "rutinas",
  "library",
  "ejercicio_analitica",
  "resumen_sesion",
  "data_intelligence",
  "pesajes",
  "check_in",
  "admin_sesiones",
  "fotos",
  "perfil",
  "planes",
  "trainer",
  "coach_athletes",
  "coach_messages",
  "coach_admin",
  "editor_historial",
  "imagenes_ejercicios",
];

const mobileLabels = {
  progreso: "Progreso y planes",
  trainer: "Inicio",
  coach_athletes: "Alumnos",
  coach_messages: "Mensajes",
  coach_admin: "Coaches",
  dashboard: "Inicio",
  registrar: "Entrenar",
  rutinas: "Rutinas",
  library: "Ejercicios",
  ejercicio_analitica: "Analitica",
  resumen_sesion: "Resumen Diario",
  data_intelligence: "Datos",
  pesajes: "Pesajes",
  check_in: "Estado",
  admin_sesiones: "Historial",
  fotos: "Fotos",
  perfil: "Perfil",
  planes: "Planes",
  editor_historial: "Editor",
  imagenes_ejercicios: "Imágenes",
};

const mobileGroups = [
  {
    title: "Entrenamiento",
    detail: "Accesos diarios",
    ids: ["dashboard", "registrar", "rutinas", "library"],
  },
  {
    title: "Rendimiento",
    detail: "Analisis y resumen",
    ids: [
      "progreso",
      "ejercicio_analitica",
      "resumen_sesion",
      "data_intelligence",
      "pesajes",
      "check_in",
    ],
  },
  {
    title: "Historial",
    detail: "Sesiones y fotos",
    ids: ["admin_sesiones", "fotos"],
  },
  {
    title: "Suscripcion",
    detail: "Plan y beneficios",
    ids: ["planes"],
  },
  {
    title: "Coach",
    detail: "Atletas asignados",
    ids: ["trainer", "coach_athletes", "coach_messages"],
  },
  {
    title: "Administracion",
    detail: "Accesos exclusivos",
    ids: ["coach_admin", "editor_historial", "imagenes_ejercicios"],
  },
];

const coachMobileGroups = [
  {
    title: "Coach",
    detail: "Gestión diaria",
    ids: ["trainer", "coach_athletes", "coach_messages"],
  },
  {
    title: "Herramientas",
    detail: "Planificación y progreso",
    ids: [
      "progreso",
      "rutinas",
      "library",
      "ejercicio_analitica",
      "resumen_sesion",
      "data_intelligence",
      "pesajes",
      "admin_sesiones",
    ],
  },
  {
    title: "Suscripcion",
    detail: "Plan y beneficios",
    ids: ["planes"],
  },
];

const managedClientMobileGroups = [
  {
    title: "Entrenamiento",
    detail: "Plan de tu coach",
    ids: ["dashboard", "registrar", "rutinas"],
  },
  {
    title: "Progreso",
    detail: "Resultados personales",
    ids: [
      "progreso",
      "ejercicio_analitica",
      "resumen_sesion",
      "pesajes",
      "check_in",
    ],
  },
  {
    title: "Historial",
    detail: "Sesiones y fotos",
    ids: ["admin_sesiones", "fotos"],
  },
  {
    title: "Suscripcion",
    detail: "Plan y beneficios",
    ids: ["planes"],
  },
];

function Sidebar({
  activePage,
  onNavigate,
  forceVisible = false,
  onClose = null,
}) {
  const { user, logout } = useAuth();
  const { profile } = useUserProfile();
  const avatarPhotoId = profile
    ? profile.avatarPhotoId
    : user?.profile?.avatarPhotoId;
  const isCoach = user?.role === "Entrenador";
  const isManagedClient =
    user?.role === "Cliente" && user?.trainingMode === "coach_managed";
  const mobileRoleLabel = isCoach
    ? "Coach"
    : user?.role === "Admin"
      ? "Admin"
      : isManagedClient
        ? "Alumno"
        : "Atleta";
  const visibleSections = isCoach
    ? coachSections
    : isManagedClient
      ? managedClientSections
      : sections;
  const visibleItems = visibleSections.flatMap((section) => section.items);
  const visibleMobileGroups = isCoach
    ? coachMobileGroups
    : isManagedClient
      ? managedClientMobileGroups
      : mobileGroups;
  const handleLogout = async () => {
    const didLogout = await logout();
    if (didLogout) onNavigate?.("login");
  };

  if (forceVisible) {
    const mobileOrderById = new Map(
      mobileNavOrder.map((id, index) => [id, index]),
    );
    const availableItems = visibleItems
      .filter((item) => canSeeItem(item, user?.role))
      .sort(
        (left, right) =>
          (mobileOrderById.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
          (mobileOrderById.get(right.id) ?? Number.MAX_SAFE_INTEGER),
      );
    const getMobileItem = (id) => availableItems.find((item) => item.id === id);
    const groupedItemIds = new Set(
      visibleMobileGroups.flatMap((group) => group.ids),
    );
    const ungroupedItems = availableItems.filter(
      (item) => !groupedItemIds.has(item.id),
    );
    const drawerGroups = ungroupedItems.length
      ? [
          ...visibleMobileGroups,
          {
            title: "Mas",
            detail: "Otras herramientas",
            ids: ungroupedItems.map((item) => item.id),
          },
        ]
      : visibleMobileGroups;

    return (
      <aside className="flex h-dvh w-full flex-col overflow-hidden bg-transparent px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 text-[color:var(--drawer-text)]">
        <div className="mb-3 flex min-h-12 items-center gap-2 border-b border-[color:var(--drawer-border)] pb-3">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[0.7rem] p-1 text-left transition-colors hover:bg-[color:var(--drawer-surface)]"
            onClick={() => onNavigate?.("perfil")}
          >
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[color:var(--drawer-border)] bg-[color:var(--drawer-surface-hover)]">
              <ProfileAvatar
                photoId={avatarPhotoId}
                name={user?.name}
                className="h-full w-full"
                fallbackClassName="bg-[color:var(--drawer-surface-hover)] text-xs font-bold text-[color:var(--drawer-text)]"
              />
              <span className="absolute -bottom-0.5 -right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full border border-[color:var(--drawer-bg)] bg-[color:var(--drawer-accent)] text-[color:var(--drawer-accent-contrast)]">
                <Check className="h-2 w-2 stroke-[4]" />
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate font-sans text-[13px] font-semibold leading-tight text-[color:var(--drawer-text)]">
                {user?.name || "Usuario"}
              </p>
              <p className="mt-1 truncate font-sans text-[10px] font-medium uppercase tracking-[0.06em] text-[color:var(--drawer-subtle)]">
                Ver perfil · {mobileRoleLabel}
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-[0.7rem] border border-[color:var(--drawer-border)] bg-[color:var(--drawer-surface)] text-[color:var(--drawer-muted)] transition-[transform,border-color,color,background-color] hover:bg-[color:var(--drawer-surface-hover)] hover:text-[color:var(--drawer-text)] active:scale-95"
            aria-label="Cerrar menu principal"
            title="Cerrar menu principal"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={1.8} />
          </button>
        </div>

        <nav className="premium-drawer-nav min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <div className="space-y-3 pb-3">
            {drawerGroups.map((group) => {
              const groupItems = group.ids.map(getMobileItem).filter(Boolean);
              if (!groupItems.length) return null;
              return (
                <div key={group.title}>
                  <div className="mb-1 px-2">
                    <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--drawer-subtle)]">
                      {group.title}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    {groupItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activePage === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onNavigate?.(item.id)}
                          aria-current={isActive ? "page" : undefined}
                          className={`group relative flex h-10 w-full items-center gap-2.5 overflow-hidden rounded-[0.65rem] border px-2.5 text-left transition-[transform,border-color,background-color,color,box-shadow] active:scale-[0.985] ${
                            isActive
                              ? "border-[color:var(--drawer-active-border)] bg-[color:var(--drawer-active)] text-[color:var(--drawer-active-text)] shadow-soft"
                              : "border-transparent text-[color:var(--drawer-muted)] hover:bg-[color:var(--drawer-surface)] hover:text-[color:var(--drawer-text)]"
                          }`}
                        >
                          <span
                            className={`grid h-7 w-7 shrink-0 place-items-center rounded-[0.5rem] transition-colors ${
                              isActive
                                ? "bg-[color:var(--drawer-active-icon-bg)] text-[color:var(--drawer-active-icon)]"
                                : "text-[color:var(--drawer-subtle)] group-hover:bg-[color:var(--drawer-surface-hover)] group-hover:text-[color:var(--drawer-text)]"
                            }`}
                          >
                            <Icon
                              className="h-[17px] w-[17px]"
                              strokeWidth={isActive ? 2 : 1.8}
                            />
                          </span>
                          <span
                            className={`min-w-0 flex-1 truncate font-sans text-[13px] ${
                              isActive ? "font-semibold" : "font-medium"
                            }`}
                          >
                            {mobileLabels[item.id] || item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </nav>

        <div className="mt-4 flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-[0.7rem] border border-[color:var(--drawer-border)] bg-transparent font-sans text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--drawer-muted)] transition-colors hover:border-[#c85a52]/40 hover:bg-[#c85a52]/10 hover:text-[#b94840]"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar sesion</span>
          </button>
        </div>
      </aside>
    );
  }

  const desktopHome = isCoach ? "trainer" : "dashboard";

  return (
    <aside className="desktop-sidebar hidden h-dvh w-[272px] flex-col lg:flex">
      <button
        type="button"
        className="desktop-sidebar__brand"
        onClick={() => onNavigate?.(desktopHome)}
        aria-label="Ir al inicio"
      >
        <span className="desktop-sidebar__mark" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="min-w-0 text-left">
          <strong>RIRFIT</strong>
          <small>Training workspace</small>
        </span>
      </button>

      <nav className="desktop-sidebar__nav premium-drawer-nav">
        {visibleSections.map((section) => {
          const items = section.items.filter((item) =>
            canSeeItem(item, user?.role),
          );
          if (!items.length) return null;
          return (
            <section key={section.heading} className="desktop-sidebar__section">
              <p className="desktop-sidebar__section-title">
                {section.heading}
              </p>
              <div className="desktop-sidebar__items">
                {items.map((item) => {
                  const isActive = activePage === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onNavigate?.(item.id)}
                      aria-current={isActive ? "page" : undefined}
                      data-active={isActive ? "true" : undefined}
                      className="desktop-sidebar__item"
                    >
                      <span className="desktop-sidebar__item-icon">
                        <Icon
                          className="h-[18px] w-[18px]"
                          strokeWidth={isActive ? 2.1 : 1.8}
                          aria-hidden="true"
                        />
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </nav>

      <div className="desktop-sidebar__footer">
        <button
          type="button"
          className="desktop-sidebar__profile"
          onClick={() => onNavigate?.("perfil")}
        >
          <ProfileAvatar
            photoId={avatarPhotoId}
            name={user?.name}
            className="h-10 w-10 shrink-0 rounded-full"
            fallbackClassName="bg-[color:var(--accent)] font-bold text-[color:var(--accent-contrast)]"
          />
          <span className="min-w-0 flex-1 text-left">
            <strong className="block truncate">
              {user?.name || "Usuario"}
            </strong>
            <small className="block truncate">{mobileRoleLabel}</small>
          </span>
        </button>
        <div className="desktop-sidebar__actions">
          <ThemeToggle />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="desktop-sidebar__logout"
            onClick={handleLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
