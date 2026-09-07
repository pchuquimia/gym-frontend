const TRAINING_PLAN_EXTENSION_INTENT_KEY = "training_plan_extension_intent";

export const requestTrainingPlanExtension = (planId) => {
  if (typeof localStorage === "undefined" || !planId) return;
  localStorage.setItem(TRAINING_PLAN_EXTENSION_INTENT_KEY, String(planId));
};

export const consumeTrainingPlanExtension = () => {
  if (typeof localStorage === "undefined") return "";
  const planId = localStorage.getItem(TRAINING_PLAN_EXTENSION_INTENT_KEY) || "";
  localStorage.removeItem(TRAINING_PLAN_EXTENSION_INTENT_KEY);
  return planId;
};
