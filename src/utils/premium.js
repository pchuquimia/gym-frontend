export const PREMIUM_FEATURES = Object.freeze({
  DAILY_CHECKIN: "daily_checkin",
  COACH_PORTFOLIO: "coach_portfolio",
  COACH_ALERTS: "coach_alerts",
  WEEKLY_REPORTS: "weekly_reports",
  ASSISTED_PLANS: "assisted_plans",
  LOAD_RECOVERY: "load_recovery",
  EXERCISE_PROGRESSION: "exercise_progression",
});

export const PLAN_LABELS = Object.freeze({
  free: "Free",
  athlete_pro: "Athlete Pro",
  coach_pro: "Coach Pro",
});

export const hasPremiumFeature = (user, feature) => {
  if (user?.role === "Admin" || user?.isDemo) return true;
  return (
    Array.isArray(user?.entitlements) && user.entitlements.includes(feature)
  );
};

export const planLabel = (plan) => PLAN_LABELS[plan] || PLAN_LABELS.free;

export const subscriptionLabel = (userOrSubscription = {}) => {
  const subscription = userOrSubscription.subscription || userOrSubscription;
  const plan = subscription.effectivePlan || subscription.plan || "free";
  const planLabel = PLAN_LABELS[plan] || PLAN_LABELS.free;
  if (subscription.status === "trialing") return `${planLabel} · Prueba`;
  if (subscription.status === "expired") return `${PLAN_LABELS.free} · Vencido`;
  return planLabel;
};
