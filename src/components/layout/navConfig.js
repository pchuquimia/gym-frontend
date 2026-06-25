import {
  ClipboardList,
  Dumbbell,
  Images,
  Layers,
  LayoutDashboard,
  Shield,
  User,
} from "lucide-react";

export const sections = [
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
    items: [{ id: "perfil", label: "Perfil y Ajustes", icon: User }],
  },
];

export const navLinks = sections.flatMap((section) => section.items);
