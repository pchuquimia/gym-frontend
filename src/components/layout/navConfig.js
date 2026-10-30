import {
  BrainCircuit,
  ClipboardList,
  Dumbbell,
  Images,
  Layers,
  LayoutDashboard,
  ListChecks,
  MessageCircle,
  Shield,
  Weight,
  Users,
  User,
  HeartPulse,
  Crown,
  TrendingUp,
  Utensils,
} from "lucide-react";

export const sections = [
  {
    heading: "Entrenamiento",
    items: [
      { id: "dashboard", label: "Inicio", icon: LayoutDashboard },
      {
        id: "registrar",
        label: "Registrar Entrenamiento",
        icon: ClipboardList,
      },
      { id: "rutinas", label: "Rutinas y Planificacion", icon: ClipboardList },
      { id: "library", label: "Biblioteca de Ejercicios", icon: Dumbbell },
      {
        id: "nutricion",
        label: "Alimentación",
        icon: Utensils,
        roles: ["Cliente"],
      },
    ],
  },
  {
    heading: "Progreso",
    items: [
      { id: "progreso", label: "Progreso y planes", icon: TrendingUp },
      { id: "ejercicio_analitica", label: "Por ejercicio", icon: Layers },
      { id: "resumen_sesion", label: "Resumen de sesion", icon: Layers },
      {
        id: "data_intelligence",
        label: "Inteligencia de datos",
        icon: BrainCircuit,
      },
      { id: "pesajes", label: "Seguimiento de peso", icon: Weight },
      { id: "check_in", label: "Estado diario", icon: HeartPulse },
    ],
  },
  {
    heading: "Historial",
    items: [
      {
        id: "admin_sesiones",
        label: "Historial de sesiones",
        icon: Shield,
        roles: ["Admin", "Entrenador"],
      },
      { id: "fotos", label: "Biblioteca de Fotos", icon: Images },
    ],
  },
  {
    heading: "Cuenta",
    items: [
      {
        id: "coach_messages",
        label: "Mensajes",
        icon: MessageCircle,
        roles: ["Cliente"],
      },
      { id: "perfil", label: "Perfil y Ajustes", icon: User },
      { id: "planes", label: "Planes y Premium", icon: Crown },
    ],
  },
  {
    heading: "Coach",
    items: [
      {
        id: "trainer",
        label: "Inicio coach",
        icon: LayoutDashboard,
        roles: ["Admin", "Entrenador"],
      },
      {
        id: "coach_athletes",
        label: "Alumnos",
        icon: Users,
        roles: ["Admin", "Entrenador"],
      },
      {
        id: "coach_messages",
        label: "Mensajes",
        icon: MessageCircle,
        roles: ["Admin", "Entrenador"],
      },
    ],
  },
  {
    heading: "Administracion",
    items: [
      {
        id: "coach_admin",
        label: "Coaches y atletas",
        icon: Users,
        roles: ["Admin"],
      },
      {
        id: "editor_historial",
        label: "Editor de ejercicios",
        icon: ListChecks,
        roles: ["Admin"],
      },
      {
        id: "imagenes_ejercicios",
        label: "Imágenes de ejercicios",
        icon: Images,
        roles: ["Admin"],
      },
    ],
  },
];

export const coachSections = [
  {
    heading: "Coach",
    items: [
      { id: "trainer", label: "Inicio", icon: LayoutDashboard },
      { id: "coach_athletes", label: "Alumnos", icon: Users },
      { id: "coach_messages", label: "Mensajes", icon: MessageCircle },
    ],
  },
  {
    heading: "Herramientas",
    items: [
      { id: "nutricion", label: "Alimentación", icon: Utensils },
      { id: "progreso", label: "Progreso y planes", icon: TrendingUp },
      {
        id: "rutinas",
        label: "Rutinas y planificación",
        icon: ClipboardList,
      },
      { id: "library", label: "Biblioteca de ejercicios", icon: Dumbbell },
      {
        id: "ejercicio_analitica",
        label: "Progreso por ejercicio",
        icon: Layers,
      },
      {
        id: "resumen_sesion",
        label: "Resumen de sesion",
        icon: Layers,
      },
      {
        id: "data_intelligence",
        label: "Inteligencia de datos",
        icon: BrainCircuit,
      },
      { id: "pesajes", label: "Seguimiento de peso", icon: Weight },
      { id: "admin_sesiones", label: "Historial de atletas", icon: Shield },
    ],
  },
  {
    heading: "Cuenta",
    items: [
      { id: "perfil", label: "Perfil y ajustes", icon: User },
      { id: "planes", label: "Planes y Premium", icon: Crown },
    ],
  },
];

export const managedClientSections = [
  {
    heading: "Entrenamiento",
    items: [
      { id: "dashboard", label: "Inicio", icon: LayoutDashboard },
      { id: "registrar", label: "Entrenar", icon: Dumbbell },
      { id: "rutinas", label: "Mis rutinas", icon: ClipboardList },
      { id: "nutricion", label: "Mi alimentación", icon: Utensils },
      {
        id: "coach_messages",
        label: "Mensajes con mi coach",
        icon: MessageCircle,
      },
    ],
  },
  {
    heading: "Progreso",
    items: [
      { id: "progreso", label: "Progreso y planes", icon: TrendingUp },
      {
        id: "ejercicio_analitica",
        label: "Analítica por ejercicio",
        icon: Layers,
      },
      {
        id: "resumen_sesion",
        label: "Resumen de sesión",
        icon: ClipboardList,
      },
      { id: "pesajes", label: "Mis pesajes", icon: Weight },
      { id: "check_in", label: "Estado diario", icon: HeartPulse },
    ],
  },
  {
    heading: "Historial",
    items: [
      {
        id: "admin_sesiones",
        label: "Historial de sesiones",
        icon: Shield,
      },
      { id: "fotos", label: "Biblioteca de fotos", icon: Images },
    ],
  },
  {
    heading: "Cuenta",
    items: [
      { id: "perfil", label: "Perfil y ajustes", icon: User },
      { id: "planes", label: "Planes y Premium", icon: Crown },
    ],
  },
];

const standardNavLinks = sections.flatMap((section) => section.items);
const standardNavIds = new Set(standardNavLinks.map((item) => item.id));
const standardLinkById = new Map();
standardNavLinks.forEach((item) => {
  const existing = standardLinkById.get(item.id);
  standardLinkById.set(
    item.id,
    existing
      ? {
          ...item,
          roles:
            existing.roles && item.roles
              ? [...new Set([...existing.roles, ...item.roles])]
              : undefined,
        }
      : item,
  );
});

export const navLinks = [
  ...standardLinkById.values(),
  ...coachSections
    .flatMap((section) => section.items)
    .filter((item) => !standardNavIds.has(item.id)),
];
