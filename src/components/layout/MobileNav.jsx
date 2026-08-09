import { navLinks } from "./navConfig";
import { useAuth } from "../../context/AuthContext";

function MobileNav({ activePage, onNavigate }) {
  const { user } = useAuth();
  const itemIds =
    user?.role === "Admin"
      ? ["dashboard", "trainer", "coach_admin", "perfil"]
      : user?.role === "Entrenador"
      ? ["trainer", "rutinas", "library", "perfil"]
      : user?.trainingMode === "coach_managed"
        ? ["dashboard", "registrar", "rutinas", "perfil"]
        : ["dashboard", "registrar", "ejercicio_analitica", "perfil"];
  const items = itemIds
    .map((id) => navLinks.find((link) => link.id === id))
    .filter((item) => item && (!item.roles || item.roles.includes(user?.role)));

  return (
    <nav className="font-condensed border-t border-[#d7d7d7] bg-[#f8f8f8]/98 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur dark:border-[#292929] dark:bg-[#101010]/98 md:hidden">
      <div
        className="grid text-xs font-bold uppercase text-[#8e8e93] dark:text-[#c9c9ad]"
        style={{
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate?.(item.id)}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 border border-transparent py-1 transition-colors ${
                activePage === item.id
                  ? "bg-[#ff5722] text-white dark:bg-[#e2ff00] dark:text-black"
                  : "hover:border-[#cfcfcf] hover:text-[#1a1a1a] dark:hover:border-[#454545] dark:hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="max-w-full truncate">
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
