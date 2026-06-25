import { navLinks } from "./Sidebar";
import { useAuth } from "../../context/AuthContext";

function MobileNav({ activePage, onNavigate }) {
  const { user } = useAuth();
  const items = ["dashboard", "library", "registrar", "rutinas", "perfil"]
    .map((id) => navLinks.find((link) => link.id === id))
    .filter((item) => item && (!item.roles || item.roles.includes(user?.role)));

  return (
    <nav className="md:hidden bg-bg-darker border-t border-border-soft px-4 py-2">
      <div
        className="grid text-xs text-muted"
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
              className={`flex flex-col items-center gap-1 py-1 ${
                activePage === item.id ? "text-accent" : ""
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{item.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileNav;
