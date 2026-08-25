import { navLinks } from "./navConfig";
import { useAuth } from "../../context/AuthContext";

function MobileNav({ activePage, onNavigate }) {
  const { user } = useAuth();
  const itemIds =
    user?.role === "Admin"
      ? ["dashboard", "trainer", "rutinas", "coach_admin", "perfil"]
      : user?.role === "Entrenador"
      ? ["trainer", "rutinas", "library", "perfil"]
      : user?.trainingMode === "coach_managed"
        ? ["dashboard", "registrar", "rutinas", "perfil"]
        : ["dashboard", "registrar", "rutinas", "perfil"];
  const items = itemIds
    .map((id) => navLinks.find((link) => link.id === id))
    .filter((item) => item && (!item.roles || item.roles.includes(user?.role)));

  return (
    <nav className="border-t border-[color:var(--border)] bg-[color:var(--surface)]/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-nav backdrop-blur-xl md:hidden">
      <div
        className="grid font-sans text-[11px] font-semibold text-[color:var(--text-muted)]"
        style={{
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate?.(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-control border py-1 transition-[background-color,color,box-shadow,transform] active:scale-[0.97] ${
                isActive
                  ? "border-transparent bg-[color:var(--surface-subtle)] text-[color:var(--text)] shadow-hairline"
                  : "border-transparent hover:bg-[color:var(--surface-subtle)] hover:text-[color:var(--text)]"
              }`}
            >
              {isActive ? (
                <span
                  className="absolute inset-x-0 top-0 mx-auto h-0.5 w-5 rounded-full bg-[color:var(--accent)]"
                  aria-hidden="true"
                />
              ) : null}
              <Icon
                className={`h-5 w-5 ${
                  isActive ? "text-[color:var(--accent-strong)]" : ""
                }`}
              />
              <span
                className={`max-w-full truncate ${
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
