import {
  ClipboardList,
  Dumbbell,
  Images,
  Layers,
  LayoutDashboard,
  LogOut,
  Shield,
  Target,
  User,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/button";

const sections = [
  {
    heading: "Principal",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "library", label: "Biblioteca de Ejercicios", icon: Dumbbell },
      {
        id: "registrar",
        label: "Registrar Entrenamiento",
        icon: ClipboardList,
      },
    ],
  },
  {
    heading: "Analitica",
    items: [
      { id: "ejercicio_analitica", label: "Por ejercicio", icon: Layers },
      { id: "resumen_sesion", label: "Resumen de sesion", icon: Layers },
    ],
  },
  {
    heading: "Gestion",
    items: [
      { id: "rutinas", label: "Rutinas y Planificacion", icon: ClipboardList },
      {
        id: "admin_sesiones",
        label: "Administrar sesiones",
        icon: Shield,
        roles: ["Admin", "Entrenador"],
      },
      { id: "fotos", label: "Biblioteca de Fotos", icon: Images },
    ],
  },
  {
    heading: "Perfil",
    items: [
      { id: "objetivos", label: "Objetivos", icon: Target },
      { id: "perfil", label: "Perfil y Ajustes", icon: User },
    ],
  },
];

export const navLinks = sections.flatMap((section) => section.items);

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

  return (
    <aside
      className={`${
        forceVisible ? "flex" : "hidden md:flex"
      } bg-[color:var(--card)] border-r border-[color:var(--border)] min-h-screen w-[280px] px-3 py-4 flex-col gap-4`}
    >
      <button
        type="button"
        className="flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-accent/40"
        onClick={() => onNavigate?.("perfil")}
      >
        <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 font-bold text-white">
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

      <div className="h-[calc(100vh-170px)] overflow-y-auto pr-1">
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
                        <span className="text-sm">{item.label}</span>
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
