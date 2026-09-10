export const needsOnboarding = (user) =>
  ["Cliente", "Entrenador"].includes(user?.role) &&
  user?.onboarding?.status === "pending";

export const isCoachManagedClient = (user) =>
  user?.role === "Cliente" && user?.trainingMode === "coach_managed";

export const needsCoachIntake = (user) => {
  if (!isCoachManagedClient(user)) return false;
  const assignedCoachId = String(user?.assignedTrainerId || "");
  const intakeCoachId = String(user?.coachIntake?.coachId || "");
  return (
    !assignedCoachId ||
    user?.coachIntake?.status !== "submitted" ||
    !user?.coachIntake?.submittedAt ||
    intakeCoachId !== assignedCoachId
  );
};

export const getManagedAthleteJourneyStage = (
  user,
  activePlan = null,
  hasPendingPlanFollowUp = false,
) => {
  if (!isCoachManagedClient(user)) return null;
  if (needsCoachIntake(user)) return "evaluation_pending";
  return activePlan || hasPendingPlanFollowUp
    ? "plan_assigned"
    : "evaluation_submitted";
};

export const getUserHome = (user) => {
  if (needsOnboarding(user)) {
    return isCoachManagedClient(user) ? "dashboard" : "onboarding";
  }
  if (user?.role === "Admin") return "dashboard";
  if (user?.role === "Entrenador") return "trainer";
  return "dashboard";
};
