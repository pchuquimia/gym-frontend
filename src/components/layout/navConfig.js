import {
  BrainCircuit,
  ClipboardList,
  Dumbbell,
  Images,
  Layers,
  LayoutDashboard,
  ListChecks,
  Shield,
  Weight,
  Users,
  User,
  HeartPulse,
  Crown,
} from "lucide-react";

export const sections = [
  {
    heading: "Principal",
    items: [
      { id: "dashboard", label: "Inicio", icon: LayoutDashboard },
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
    heading: "Coach",
    items: [
      {
        id: "trainer",
        label: "Mis atletas",
        icon: Users,
        roles: ["Admin", "Entrenador"],
      },
    ],
  },
  {
    heading: "Gestion",
    items: [
      { id: "rutinas", label: "Rutinas y Planificacion", icon: ClipboardList },
      {
        id: "coach_admin",
        label: "Coaches y atletas",
        icon: Users,
        roles: ["Admin"],
      },
      {
        id: "admin_sesiones",
        label: "Historial de sesiones",
        icon: Shield,
        roles: ["Admin", "Entrenador"],
      },
      {
        id: "editor_historial",
        label: "Editor de historial",
        icon: ListChecks,
        roles: ["Admin"],
      },
      { id: "fotos", label: "Biblioteca de Fotos", icon: Images },
    ],
  },
  {
    heading: "Perfil",
    items: [
      { id: "perfil", label: "Perfil y Ajustes", icon: User },
      { id: "planes", label: "Planes y Premium", icon: Crown },
    ],
  },
];

export const coachSections = [
  {
    heading: "Coach",
    items: [{ id: "trainer", label: "Mis atletas", icon: Users }],
  },
  {
    heading: "Herramientas",
    items: [
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
    ],
  },
  {
    heading: "Progreso",
    items: [
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

export const navLinks = sections.flatMap((section) => section.items);
