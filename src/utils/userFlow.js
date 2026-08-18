export const needsOnboarding = (user) =>
  user?.role === "Cliente" && user?.onboarding?.status === "pending";

export const getUserHome = (user) => {
  if (needsOnboarding(user)) return "onboarding";
  if (user?.role === "Admin") return "dashboard";
  if (user?.role === "Entrenador") return "trainer";
  return "perfil";
};
