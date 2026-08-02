import {
  ClipboardList,
  Dumbbell,
  Images,
  Layers,
  LayoutDashboard,
  Shield,
  Users,
  User,
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
    ],
  },
  {
    heading: "Coach",
    items: [
      {
        id: "trainer",
        label: "Mis atletas",
        icon: Users,
        roles: ["Entrenador"],
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
      { id: "fotos", label: "Biblioteca de Fotos", icon: Images },
    ],
  },
  {
    heading: "Perfil",
    items: [{ id: "perfil", label: "Perfil y Ajustes", icon: User }],
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
      { id: "rutinas", label: "Plantillas de rutinas", icon: ClipboardList },
      { id: "library", label: "Biblioteca de ejercicios", icon: Dumbbell },
    ],
  },
  {
    heading: "Cuenta",
    items: [{ id: "perfil", label: "Perfil y ajustes", icon: User }],
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
    heading: "Cuenta",
    items: [{ id: "perfil", label: "Perfil y ajustes", icon: User }],
  },
];

export const navLinks = sections.flatMap((section) => section.items);
