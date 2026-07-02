import { LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/button";
import { sections } from "./navConfig";

const canSeeItem = (item, role) => !item.roles || item.roles.includes(role);

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

  const navWrapperClass = forceVisible
    ? "min-h-0 flex-1 overflow-hidden pr-0"
    : "h-[calc(100dvh-170px-env(safe-area-inset-bottom))] overflow-y-auto pr-1 overscroll-contain";
  const navClass = forceVisible ? "flex flex-col gap-1.5" : "flex flex-col gap-3";
  const sectionClass = forceVisible ? "flex flex-col gap-1" : "flex flex-col gap-2";
  const headingClass = forceVisible
    ? "px-3 text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]"
    : "mt-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-[color:var(--text-muted)]";
  const itemClass = forceVisible
    ? "relative flex h-9 items-center gap-2.5 rounded-xl px-3 text-[13px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    : "relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  const dividerClass = forceVisible
    ? "my-1 h-px bg-[color:var(--border)]/50"
    : "my-2 h-px bg-[color:var(--border)]/60";

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

      <div className={navWrapperClass}>
        <nav className={navClass}>
          {sections.map((section, idx) => {
            const items = section.items.filter((item) =>
              canSeeItem(item, user?.role),
            );
            if (!items.length) return null;
            return (
              <div key={section.heading} className={sectionClass}>
                <p className={headingClass}>
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
                        className={`${itemClass} ${
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
                  <div className={dividerClass} />
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
