export const needsOnboarding = (user) =>
  ["Cliente", "Entrenador"].includes(user?.role) &&
  user?.onboarding?.status === "pending";

export const isCoachManagedClient = (user) =>
  user?.role === "Cliente" && user?.trainingMode === "coach_managed";

export const getManagedAthleteJourneyStage = (user, activePlan = null) => {
  if (!isCoachManagedClient(user)) return null;
  if (needsOnboarding(user)) return "evaluation_pending";
  return activePlan ? "plan_assigned" : "evaluation_submitted";
};

export const getUserHome = (user) => {
  if (needsOnboarding(user)) {
    return isCoachManagedClient(user) ? "dashboard" : "onboarding";
  }
  if (user?.role === "Admin") return "dashboard";
  if (user?.role === "Entrenador") return "trainer";
  return "dashboard";
};
