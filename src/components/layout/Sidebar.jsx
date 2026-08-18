import { Check, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useUserProfile } from "../../context/UserContext";
import Button from "../ui/button";
import ThemeToggle from "../ThemeToggle";
import ProfileAvatar from "../profile/ProfileAvatar";
import { coachSections, managedClientSections, sections } from "./navConfig";

const canSeeItem = (item, role) => !item.roles || item.roles.includes(role);

const mobileNavOrder = [
  "trainer",
  "coach_admin",
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
];

const mobileLabels = {
  trainer: "Atletas",
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
};

const mobileGroups = [
  {
    title: "Coach",
    detail: "Atletas asignados",
    ids: ["trainer"],
  },
  {
    title: "Entrenamiento",
    detail: "Accesos diarios",
    ids: ["dashboard", "registrar", "rutinas", "library"],
  },
  {
    title: "Rendimiento",
    detail: "Analisis y resumen",
    ids: [
      "ejercicio_analitica",
      "resumen_sesion",
      "data_intelligence",
      "pesajes",
      "check_in",
    ],
  },
  {
    title: "Gestion",
    detail: "Historial y cuenta",
    ids: ["coach_admin", "admin_sesiones", "fotos", "perfil"],
  },
];

const coachMobileGroups = [
  {
    title: "Coach",
    detail: "Gestión diaria",
    ids: ["trainer"],
  },
  {
    title: "Herramientas",
    detail: "Planificación y progreso",
    ids: [
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
    title: "Cuenta",
    detail: "Configuración",
    ids: ["perfil"],
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
    ids: ["ejercicio_analitica", "resumen_sesion", "pesajes", "check_in"],
  },
  {
    title: "Historial",
    detail: "Sesiones y fotos",
    ids: ["admin_sesiones", "fotos"],
  },
  {
    title: "Cuenta",
    detail: "Configuración",
    ids: ["perfil"],
  },
];

function Sidebar({ activePage, onNavigate, forceVisible = false }) {
  const { user, logout } = useAuth();
  const { profile } = useUserProfile();
  const avatarPhotoId = profile
    ? profile.avatarPhotoId
    : user?.profile?.avatarPhotoId;
  const isCoach = user?.role === "Entrenador";
  const isManagedClient =
    user?.role === "Cliente" && user?.trainingMode === "coach_managed";
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
      <aside className="flex h-dvh w-[276px] flex-col overflow-hidden border-r border-slate-200 bg-white px-3 pb-[calc(0.875rem+env(safe-area-inset-bottom))] pt-5 text-slate-900 shadow-2xl dark:border-white/10 dark:bg-[#121212] dark:text-white">
        <button
          type="button"
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left shadow-sm max-[700px]:py-2.5 dark:border-white/10 dark:bg-white/[0.055] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          onClick={() => onNavigate?.("perfil")}
        >
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-[#ffb199] bg-[#fff0eb] shadow-md shadow-slate-200/70 dark:border-[#e2ff00]/40 dark:bg-[#252525] dark:shadow-lg dark:shadow-black/20">
            <ProfileAvatar
              photoId={avatarPhotoId}
              name={user?.name}
              className="h-full w-full"
              fallbackClassName="bg-[#fff0eb] text-sm font-black text-[#ff5722] dark:bg-[#252525] dark:text-[#e2ff00]"
            />
            <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border border-white bg-[#ff5722] text-white dark:border-[#121212] dark:bg-[#e2ff00] dark:text-black">
              <Check className="h-2.5 w-2.5 stroke-[4]" />
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-black leading-tight text-slate-950 dark:text-slate-100">
              {user?.name || "Usuario"}
            </p>
            <p className="mt-0.5 text-[11px] font-black uppercase tracking-[0.12em] text-emerald-600 dark:text-emerald-300">
              {isCoach
                ? "Modo coach"
                : isManagedClient
                  ? "Plan con coach"
                  : "Atleta Pro"}
            </p>
          </div>
        </button>

        <nav className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable] max-[700px]:mt-4">
          <div className="space-y-6 pb-3 max-[700px]:space-y-4">
            {drawerGroups.map((group) => {
              const groupItems = group.ids.map(getMobileItem).filter(Boolean);
              if (!groupItems.length) return null;
              return (
                <div key={group.title}>
                  <div className="mb-3 flex items-end justify-between gap-3 px-3 max-[700px]:mb-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300/55">
                      {group.title}
                    </p>
                    <p className="truncate text-[10px] font-bold text-slate-400 dark:text-slate-400/45">
                      {group.detail}
                    </p>
                  </div>
                  <div className="space-y-2 max-[700px]:space-y-1.5">
                    {groupItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activePage === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onNavigate?.(item.id)}
                          className={`group flex h-[clamp(46px,6.1svh,54px)] w-full items-center gap-4 rounded-xl px-3 text-left transition max-[700px]:h-[clamp(42px,6svh,46px)] ${
                            isActive
                              ? "bg-[#fff0eb] text-slate-950 shadow-[inset_3px_0_0_#ff5722] dark:bg-[#252525] dark:text-white dark:shadow-[inset_3px_0_0_#e2ff00]"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300/72 dark:hover:bg-white/[0.045] dark:hover:text-white"
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 shrink-0 ${
                              isActive
                                ? "text-[#ff5722] dark:text-[#e2ff00]"
                                : "text-slate-400 dark:text-slate-300/72"
                            }`}
                            strokeWidth={2.2}
                          />
                          <span className="min-w-0 flex-1 truncate text-[15px] font-black">
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

        <Button
          type="button"
          variant="outline"
          className="mt-5 h-12 justify-center gap-2 rounded-xl border-red-200 bg-red-50 text-[12px] font-black uppercase tracking-[0.08em] text-red-600 hover:bg-red-100 max-[700px]:mt-4 dark:border-red-300/20 dark:bg-transparent dark:text-red-200 dark:hover:bg-red-400/10"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar sesion</span>
        </Button>
        <p className="mt-4 text-center text-[10px] font-black uppercase tracking-tight text-slate-400/70 dark:text-slate-400/25">
          Apex Performance v2.4.0
        </p>
      </aside>
    );
  }

  return (
    <aside className="hidden h-dvh w-[280px] flex-col gap-4 border-r border-[color:var(--border)] bg-[color:var(--card)] px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 md:flex">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-accent/40"
          onClick={() => onNavigate?.("perfil")}
        >
          <ProfileAvatar
            photoId={avatarPhotoId}
            name={user?.name}
            className="h-10 w-10 shrink-0 rounded-full"
            fallbackClassName="bg-[#ff5722] font-bold text-white dark:bg-[#e2ff00] dark:text-black"
          />
          <div className="min-w-0 flex flex-col">
            <p className="truncate text-sm font-semibold text-[color:var(--text)]">
              {user?.name || "Usuario"}
            </p>
            <span className="text-xs text-[color:var(--text-muted)]">
              {user?.role || "Cliente"}
            </span>
          </div>
        </button>
        <ThemeToggle />
      </div>

      <div className="h-[calc(100dvh-170px-env(safe-area-inset-bottom))] overflow-y-auto pr-1 overscroll-contain">
        <nav className="flex flex-col gap-3">
          {visibleSections.map((section, idx) => {
            const items = section.items.filter((item) =>
              canSeeItem(item, user?.role),
            );
            if (!items.length) return null;
            return (
              <div key={section.heading} className="flex flex-col gap-2">
                <p className="mt-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--text-muted)]">
                  {section.heading}
                </p>
                <div className="flex flex-col gap-1">
                  {items.map((item) => {
                    const isActive = activePage === item.id;
                    const Icon = item.icon;
                    return (
                      <Button
                        key={item.id}
                        type="button"
                        variant="ghost"
                        onClick={() => onNavigate?.(item.id)}
                        className={`relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                          isActive
                            ? "border border-[#ff5722]/40 bg-[#fff0eb] font-semibold text-[color:var(--text)] shadow-sm dark:border-[#e2ff00]/45 dark:bg-[#252525]"
                            : "text-[color:var(--text-muted)] hover:bg-accent/50 hover:text-[color:var(--text)]"
                        }`}
                      >
                        {isActive && (
                          <span
                            className="absolute left-1 h-5 w-1 rounded-full bg-[#ff5722] shadow-[0_0_8px_rgba(255,87,34,0.35)] dark:bg-[#e2ff00] dark:shadow-[0_0_8px_rgba(226,255,0,0.45)]"
                            aria-hidden="true"
                          />
                        )}
                        <Icon
                          className={`h-5 w-5 shrink-0 ${
                            isActive
                              ? "text-[#ff5722] dark:text-[#e2ff00]"
                              : "text-[color:var(--text-muted)]"
                          }`}
                          strokeWidth={2}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 truncate text-sm">
                          {item.label}
                        </span>
                      </Button>
                    );
                  })}
                </div>
                {idx < visibleSections.length - 1 && (
                  <div className="my-2 h-px bg-[color:var(--border)]/60" />
                )}
              </div>
            );
          })}
        </nav>
      </div>

      <Button
        type="button"
        variant="outline"
        className="mt-auto justify-start gap-2 rounded-xl"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4" />
        <span>Cerrar sesion</span>
      </Button>
    </aside>
  );
}

export default Sidebar;
