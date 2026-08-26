import { navLinks } from "./navConfig";
import { useAuth } from "../../context/AuthContext";
import {
  ClipboardList,
  Dumbbell,
  LayoutDashboard,
  Library,
  UserRound,
  UsersRound,
} from "lucide-react";

const mobileIcons = {
  dashboard: LayoutDashboard,
  registrar: Dumbbell,
  rutinas: ClipboardList,
  library: Library,
  perfil: UserRound,
  trainer: UsersRound,
};

function MobileNav({ activePage, onNavigate }) {
  const { user } = useAuth();
  const itemIds =
    user?.role === "Admin"
      ? ["dashboard", "registrar", "rutinas", "library", "perfil"]
      : user?.role === "Entrenador"
        ? ["trainer", "rutinas", "library", "perfil"]
        : user?.trainingMode === "coach_managed"
          ? ["dashboard", "registrar", "rutinas", "perfil"]
          : ["dashboard", "registrar", "rutinas", "perfil"];
  const items = itemIds
    .map((id) => navLinks.find((link) => link.id === id))
    .filter((item) => item && (!item.roles || item.roles.includes(user?.role)));

  return (
    <nav className="mx-[18px] mb-[calc(0.875rem+env(safe-area-inset-bottom))] rounded-[2rem] border border-[color:var(--mobile-nav-border)] bg-[color:var(--mobile-nav-bg)] p-1.5 shadow-[var(--mobile-nav-shadow)] backdrop-blur-[var(--mobile-nav-blur)] backdrop-saturate-[1.12] md:hidden">
      <div
        className="grid font-sans text-[11px] font-medium"
        style={{
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        }}
      >
        {items.map((item) => {
          const Icon = mobileIcons[item.id] ?? item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate?.(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={`relative mx-0.5 flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-[1.6rem] border border-transparent px-1 py-1.5 transition-[background-color,color,box-shadow,transform] duration-200 active:scale-[0.97] ${
                isActive
                  ? "bg-[color:var(--mobile-nav-active)] text-[color:var(--mobile-nav-text)] shadow-[var(--mobile-nav-active-shadow)]"
                  : "text-[color:var(--mobile-nav-muted)] hover:bg-[color:var(--mobile-nav-hover)] hover:text-[color:var(--mobile-nav-text)]"
              }`}
            >
              <Icon
                className="h-[22px] w-[22px] shrink-0"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <span
                className={`max-w-full truncate leading-none ${
                  isActive ? "font-bold" : ""
                }`}
              >
                {item.id === "registrar"
                  ? "Entrenar"
                  : item.id === "ejercicio_analitica"
                    ? "Metricas"
                    : item.id === "trainer"
                      ? "Atletas"
                      : item.id === "coach_admin"
                        ? "Gestion"
                        : item.label.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileNav;
