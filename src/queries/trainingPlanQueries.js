import { api } from "../services/api";

export const TRAINING_PLANS_STALE_TIME = 5 * 60 * 1000;
const TRAINING_PLANS_GC_TIME = 30 * 60 * 1000;

const normalizeScope = (scopeId = "") => String(scopeId || "self");

export const getTrainingPlansQueryKey = (scopeId = "") => [
  "training-plans",
  normalizeScope(scopeId),
];

export const getPlanTemplatesQueryKey = (scopeId = "") => [
  "plan-templates",
  normalizeScope(scopeId),
];

export const fetchCachedTrainingPlans = (
  queryClient,
  { athleteId = "", scopeId = "", force = false } = {},
) =>
  queryClient.fetchQuery({
    queryKey: getTrainingPlansQueryKey(scopeId || athleteId),
    queryFn: () => api.getTrainingPlans(athleteId),
    staleTime: force ? 0 : TRAINING_PLANS_STALE_TIME,
    gcTime: TRAINING_PLANS_GC_TIME,
  });

export const fetchCachedPlanTemplates = (
  queryClient,
  { scopeId = "", force = false } = {},
) =>
  queryClient.fetchQuery({
    queryKey: getPlanTemplatesQueryKey(scopeId),
    queryFn: () => api.getPlanTemplates(),
    staleTime: force ? 0 : TRAINING_PLANS_STALE_TIME,
    gcTime: TRAINING_PLANS_GC_TIME,
  });

export const replaceTrainingPlan = (plans = [], savedPlan) => {
  if (!savedPlan) return plans;
  const savedId = String(savedPlan._id || savedPlan.id || "");
  if (!savedId) return plans;
  const found = plans.some(
    (plan) => String(plan?._id || plan?.id || "") === savedId,
  );
  return found
    ? plans.map((plan) =>
        String(plan?._id || plan?.id || "") === savedId ? savedPlan : plan,
      )
    : [savedPlan, ...plans];
};
