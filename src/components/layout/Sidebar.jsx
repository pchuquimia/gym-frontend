import { LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/button";
import { sections } from "./navConfig";

const canSeeItem = (item, role) => !item.roles || item.roles.includes(role);
const allItems = sections.flatMap((section) => section.items);
const mobilePrimaryIds = ["dashboard", "registrar", "rutinas", "library"];
const mobileLabels = {
  dashboard: "Inicio",
  registrar: "Entrenar",
  rutinas: "Rutinas",
  library: "Ejercicios",
  ejercicio_analitica: "Analítica",
  resumen_sesion: "Resumen",
  admin_sesiones: "Sesiones",
  fotos: "Fotos",
  perfil: "Perfil",
};

function Sidebar({ activePage, onNavigate, forceVisible = false }) {
  const { user, logout } = useAuth();
  const initials =
    user?.name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  const handleLogout = async () => {
    await logout();
    onNavigate?.("login");
  };

  const mobileItems = allItems.filter((item) =>
    canSeeItem(item, user?.role),
  );
  const primaryItems = mobilePrimaryIds
    .map((id) => mobileItems.find((item) => item.id === id))
    .filter(Boolean);
  const secondaryItems = mobileItems.filter(
    (item) => !mobilePrimaryIds.includes(item.id),
  );

  if (forceVisible) {
    return (
      <aside className="flex h-dvh w-[280px] flex-col border-r border-[color:var(--border)] bg-[color:var(--card)] px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 text-[color:var(--text)]">
        <button
          type="button"
          className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)]/45 px-3 py-2 text-left shadow-sm"
          onClick={() => onNavigate?.("perfil")}
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-600/20">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black leading-tight">
              {user?.name || "Usuario"}
            </p>
            <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
              {user?.role || "Cliente"}
            </p>
          </div>
        </button>

        <div className="mt-4">
          <p className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
            Accesos
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {primaryItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate?.(item.id)}
                  className={`min-h-[74px] rounded-2xl border px-3 py-3 text-left transition ${
                    isActive
                      ? "border-primary/50 bg-primary/15 text-[color:var(--text)] shadow-sm"
                      : "border-[color:var(--border)] bg-[color:var(--bg)]/40 text-[color:var(--text-muted)]"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      isActive ? "text-primary" : "text-[color:var(--text-muted)]"
                    }`}
                    strokeWidth={2.2}
                  />
                  <span className="mt-2 block truncate text-sm font-black text-[color:var(--text)]">
                    {mobileLabels[item.id] || item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 min-h-0 flex-1">
          <p className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-[color:var(--text-muted)]">
            Más
          </p>
          <div className="mt-2 space-y-1">
            {secondaryItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate?.(item.id)}
                  className={`flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left transition ${
                    isActive
                      ? "border border-primary/35 bg-primary/12 text-[color:var(--text)]"
                      : "text-[color:var(--text-muted)] hover:bg-[color:var(--bg)]/45 hover:text-[color:var(--text)]"
                  }`}
                >
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 ${
                      isActive ? "text-primary" : "text-[color:var(--text-muted)]"
                    }`}
                    strokeWidth={2.2}
                  />
                  <span className="min-w-0 truncate text-sm font-bold">
                    {mobileLabels[item.id] || item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="mt-3 h-11 justify-center gap-2 rounded-2xl border-red-500/30 bg-red-500/8 text-sm font-black text-red-300 hover:bg-red-500/12"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          <span>Cerrar sesión</span>
        </Button>
      </aside>
    );
  }

  return (
    <aside
      className={`${
        forceVisible ? "flex" : "hidden md:flex"
      } bg-[color:var(--card)] border-r border-[color:var(--border)] h-dvh w-[280px] px-3 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex-col ${
        forceVisible ? "gap-3" : "gap-4"
      }`}
    >
      <button
        type="button"
        className={`flex items-center gap-3 rounded-xl px-3 text-left transition-colors hover:bg-accent/40 ${
          forceVisible ? "py-1.5" : "py-2"
        }`}
        onClick={() => onNavigate?.("perfil")}
      >
        <div
          className={`grid place-items-center rounded-full bg-blue-600 font-bold text-white ${
            forceVisible ? "h-9 w-9 text-sm" : "h-10 w-10"
          }`}
        >
          {initials}
        </div>
        <div className="min-w-0 flex flex-col">
          <p className="truncate text-sm font-semibold text-[color:var(--text)]">
            {user?.name || "Usuario"}
          </p>
          <span className="text-xs text-[color:var(--text-muted)]">
            {user?.role || "Cliente"}
          </span>
        </div>
      </button>

      <div className="h-[calc(100dvh-170px-env(safe-area-inset-bottom))] overflow-y-auto pr-1 overscroll-contain">
        <nav className="flex flex-col gap-3">
          {sections.map((section, idx) => {
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
                            ? "bg-primary/15 text-[color:var(--text)] border border-primary/30 shadow-sm font-semibold"
                            : "text-[color:var(--text-muted)] hover:text-[color:var(--text)] hover:bg-accent/50"
                        }`}
                      >
                        {isActive && (
                          <span
                            className="absolute left-1 h-5 w-1 rounded-full bg-primary shadow-[0_0_8px_rgba(79,70,229,0.35)]"
                            aria-hidden="true"
                          />
                        )}
                        <Icon
                          className={`h-5 w-5 shrink-0 ${
                            isActive
                              ? "text-primary"
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
                {idx < sections.length - 1 && (
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
        className={`mt-auto justify-start gap-2 rounded-xl ${
          forceVisible ? "h-10 text-sm" : ""
        }`}
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4" />
        <span>Cerrar sesion</span>
      </Button>
    </aside>
  );
}

export default Sidebar;
