import { navLinks } from "./navConfig";
import { useAuth } from "../../context/AuthContext";
import { motion, useReducedMotion } from "framer-motion";
import {
  ClipboardList,
  Dumbbell,
  History,
  House,
  LayoutDashboard,
  Library,
  MessageCircle,
  UserRound,
  UsersRound,
} from "lucide-react";

const mobileIcons = {
  dashboard: LayoutDashboard,
  registrar: Dumbbell,
  rutinas: ClipboardList,
  library: Library,
  perfil: UserRound,
  trainer: House,
  coach_athletes: UsersRound,
  coach_messages: MessageCircle,
  admin_sesiones: History,
};

function SolidNavIcon({ name, className = "" }) {
  const commonProps = {
    className,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": true,
    "data-nav-icon": "solid",
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...commonProps}>
          <rect x="3" y="3" width="8" height="8" rx="2" />
          <rect x="13" y="3" width="8" height="5" rx="2" />
          <rect x="13" y="10" width="8" height="11" rx="2" />
          <rect x="3" y="13" width="8" height="8" rx="2" />
        </svg>
      );
    case "registrar":
      return (
        <svg {...commonProps}>
          <rect x="2" y="8" width="3" height="8" rx="1.25" />
          <rect x="5" y="6" width="3" height="12" rx="1.25" />
          <rect x="7" y="10.5" width="10" height="3" rx="1.5" />
          <rect x="16" y="6" width="3" height="12" rx="1.25" />
          <rect x="19" y="8" width="3" height="8" rx="1.25" />
        </svg>
      );
    case "rutinas":
      return (
        <svg {...commonProps}>
          <path d="M7 3h1.1A2.9 2.9 0 0 1 11 1h2a2.9 2.9 0 0 1 2.9 2H17a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" />
          <rect x="8" y="2" width="8" height="4" rx="2" />
          <path
            d="M8 10h8M8 14h8M8 18h5"
            fill="none"
            stroke="var(--mobile-nav-bg)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "library":
      return (
        <svg {...commonProps}>
          <rect x="3" y="4" width="5" height="17" rx="1.5" />
          <rect x="9.5" y="2" width="5" height="19" rx="1.5" />
          <path d="m16.5 4.2 2.5-.7a1.4 1.4 0 0 1 1.7 1l3.6 13.4a1.4 1.4 0 0 1-1 1.7l-2.5.7a1.4 1.4 0 0 1-1.7-1L15.5 5.9a1.4 1.4 0 0 1 1-1.7Z" />
        </svg>
      );
    case "admin_sesiones":
      return (
        <svg {...commonProps}>
          <path d="M6 3h12a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path
            d="M8 8h8M8 12h8M8 16h5"
            fill="none"
            stroke="var(--mobile-nav-bg)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case "trainer":
      return (
        <svg {...commonProps}>
          <path d="M3 10.8 12 3l9 7.8V20a2 2 0 0 1-2 2h-4.8v-7h-4.4v7H5a2 2 0 0 1-2-2v-9.2Z" />
        </svg>
      );
    case "coach_athletes":
      return (
        <svg {...commonProps}>
          <circle cx="9" cy="7" r="4" />
          <circle cx="17.5" cy="8" r="3" />
          <path d="M1.8 20.2c.6-4.1 3.2-6.7 7.2-6.7s6.6 2.6 7.2 6.7c.1.9-.6 1.8-1.6 1.8H3.4c-1 0-1.7-.9-1.6-1.8Z" />
          <path d="M15.7 14.3c.6-.2 1.2-.3 1.8-.3 3.1 0 5.1 2 5.6 5.3.2 1-.6 1.7-1.5 1.7h-3.7c0-2.7-.8-5-2.2-6.7Z" />
        </svg>
      );
    case "coach_messages":
      return (
        <svg {...commonProps}>
          <path d="M5 3h14a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-7.2L6 22v-4H5a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z" />
          <circle cx="8" cy="10.5" r="1" fill="var(--mobile-nav-bg)" />
          <circle cx="12" cy="10.5" r="1" fill="var(--mobile-nav-bg)" />
          <circle cx="16" cy="10.5" r="1" fill="var(--mobile-nav-bg)" />
        </svg>
      );
    case "perfil":
    default:
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="7" r="4.5" />
          <path d="M3.4 20.1c.7-4.5 3.8-7.1 8.6-7.1s7.9 2.6 8.6 7.1c.2 1-.6 1.9-1.6 1.9H5c-1 0-1.8-.9-1.6-1.9Z" />
        </svg>
      );
  }
}

function MobileNav({ activePage, onNavigate }) {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const isCoach = user?.role === "Entrenador";
  const itemIds =
    user?.role === "Admin"
      ? ["dashboard", "registrar", "rutinas", "library", "perfil"]
      : user?.role === "Entrenador"
        ? ["trainer", "coach_athletes", "rutinas", "coach_messages", "perfil"]
        : user?.trainingMode === "coach_managed"
          ? ["dashboard", "registrar", "rutinas", "perfil"]
          : ["dashboard", "registrar", "rutinas", "perfil"];
  const items = itemIds
    .map((id) => navLinks.find((link) => link.id === id))
    .filter((item) => item && (!item.roles || item.roles.includes(user?.role)));

  return (
    <nav className="mobile-bottom-nav mx-[18px] mb-[max(0.125rem,calc(env(safe-area-inset-bottom)-0.375rem))] rounded-[2rem] border border-[color:var(--mobile-nav-border)] bg-[color:var(--mobile-nav-bg)] p-1.5 shadow-[var(--mobile-nav-shadow)] backdrop-blur-[var(--mobile-nav-blur)] backdrop-saturate-[1.12] lg:hidden">
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
              className={`relative mx-0.5 flex min-w-0 flex-col items-center justify-center gap-1 rounded-[1.6rem] border border-transparent px-1 py-1.5 transition-[background-color,color,box-shadow,transform] duration-200 active:scale-[0.97] ${
                isCoach ? "min-h-[68px]" : "min-h-[58px]"
              } ${
                isActive
                  ? isCoach
                    ? "bg-[color:var(--mobile-nav-active)] text-[color:var(--mobile-nav-text)] shadow-[var(--mobile-nav-active-shadow)]"
                    : "text-[color:var(--mobile-nav-text)]"
                  : "text-[color:var(--mobile-nav-muted)] hover:bg-[color:var(--mobile-nav-hover)] hover:text-[color:var(--mobile-nav-text)]"
              }`}
            >
              {isActive ? (
                <motion.span
                  key={`active-${item.id}`}
                  initial={
                    reduceMotion ? false : { opacity: 0, scale: 0.68, y: 2 }
                  }
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : {
                          type: "spring",
                          stiffness: 520,
                          damping: 28,
                          mass: 0.55,
                        }
                  }
                  className="grid h-[22px] w-[22px] shrink-0 place-items-center"
                >
                  <SolidNavIcon name={item.id} className="h-[22px] w-[22px]" />
                </motion.span>
              ) : (
                <Icon
                  className="h-[22px] w-[22px] shrink-0 transition-colors"
                  strokeWidth={1.5}
                  aria-hidden="true"
                  data-nav-icon="outline"
                />
              )}
              <span
                className={`max-w-full truncate leading-none ${
                  isActive ? "font-semibold" : ""
                }`}
              >
                {item.id === "registrar"
                  ? "Entrenar"
                  : item.id === "rutinas" && user?.role === "Entrenador"
                    ? "Planes"
                    : item.id === "trainer"
                      ? "Inicio"
                      : item.id === "coach_athletes"
                        ? "Alumnos"
                        : item.id === "coach_messages"
                          ? "Mensajes"
                          : item.id === "ejercicio_analitica"
                            ? "Metricas"
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
