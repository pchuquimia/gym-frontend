import {
  LayoutDashboard,
  Dumbbell,
  ClipboardList,
  Layers,
  Shield,
  User,
  Images,
  Target,
} from "lucide-react";
import Button from "../ui/button";

const sections = [
  {
    heading: "Principal",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "library", label: "Biblioteca de Ejercicios", icon: Dumbbell },
      { id: "registrar", label: "Registrar Entrenamiento", icon: ClipboardList },
    ],
  },
  {
    heading: "Analítica",
    items: [
                  { id: "ejercicio_analitica", label: "Por ejercicio", icon: Layers },
      { id: "resumen_sesion", label: "Resumen de sesión", icon: Layers },
    ],
  },
  {
    heading: "Gestión",
    items: [
      { id: "rutinas", label: "Rutinas y Planificación", icon: ClipboardList },
      { id: "admin_sesiones", label: "Administrar sesiones", icon: Shield },
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

// export plano para MobileNav
export const navLinks = sections.flatMap((s) => s.items);

function Sidebar({ activePage, onNavigate, forceVisible = false }) {
  return (
    <aside
      className={`${
        forceVisible ? "flex" : "hidden md:flex"
      } bg-[color:var(--card)] border-r border-[color:var(--border)] min-h-screen w-[280px] px-3 py-4 flex-col gap-4`}
    >
      <button
        type="button"
        className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-accent/40 transition-colors text-left"
        onClick={() => onNavigate?.("perfil")}
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-green text-bg-darker font-extrabold grid place-items-center">
          UA
        </div>
        <div className="flex flex-col">
          <p className="text-sm font-semibold text-[color:var(--text)]">Usuario Activo</p>
          <span className="text-xs text-[color:var(--text-muted)]">Miembro desde 2023</span>
        </div>
      </button>

      <div className="h-[calc(100vh-120px)] pr-1 overflow-y-auto">
        <nav className="flex flex-col gap-3">
          {sections.map((section, idx) => (
            <div key={section.heading} className="flex flex-col gap-2">
              <p className="mt-1 px-3 text-[11px] font-semibold tracking-wider uppercase text-[color:var(--text-muted)]">
                {section.heading}
              </p>
              <div className="flex flex-col gap-1">
                {section.items.map((item) => {
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
                        <span className="absolute left-1 w-1 h-5 rounded-full bg-primary shadow-[0_0_8px_rgba(79,70,229,0.35)]" aria-hidden="true" />
                      )}
                      <Icon
                        className={`w-5 h-5 shrink-0 ${isActive ? "text-primary" : "text-[color:var(--text-muted)]"}`}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                      <span className="text-sm">{item.label}</span>
                    </Button>
                  );
                })}
              </div>
              {idx < sections.length - 1 && <div className="h-px bg-[color:var(--border)]/60 my-2" />}
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}

export default Sidebar;
