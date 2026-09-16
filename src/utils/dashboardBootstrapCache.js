const getEntityId = (entity) => String(entity?.id || entity?._id || "");
export const DASHBOARD_SNAPSHOT_PREFIX = "rirfit_dashboard_snapshot:";
const DASHBOARD_SNAPSHOT_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export const getDashboardSnapshotKey = ({ userId, ownerId, today }) =>
  `${DASHBOARD_SNAPSHOT_PREFIX}${String(userId || "anonymous")}:${String(
    ownerId || "self",
  )}:${String(today || "")}`;

const CORE_FIELDS = [
  "ownerId",
  "generatedAt",
  "activePlan",
  "planning",
  "followUp",
  "todayWeighIn",
  "todayHydration",
  "profile",
];
const ACTIVITY_FIELDS = [
  "ownerId",
  "generatedAt",
  "routines",
  "preference",
];
const ANALYTICS_FIELDS = [
  "ownerId",
  "generatedAt",
  "dailyMetrics",
  "intelligence",
];

const pickDashboardFields = (data, fields) => {
  if (!data || typeof data !== "object") return null;
  const picked = {};
  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      picked[field] = data[field];
    }
  });
  return Object.keys(picked).length ? picked : null;
};

export const getDashboardCoreSnapshot = (data) =>
  pickDashboardFields(data, CORE_FIELDS);

export const getDashboardActivitySnapshot = (data) =>
  data
    ? {
        ...pickDashboardFields(data, ACTIVITY_FIELDS),
        ...(data.trainings?.summaries
          ? { trainings: { summaries: data.trainings.summaries } }
          : {}),
      }
    : null;

export const getDashboardHistorySnapshot = (data) =>
  data?.trainings?.details
    ? {
        ownerId: data.ownerId,
        generatedAt: data.generatedAt,
        trainings: { details: data.trainings.details },
      }
    : null;

export const getDashboardAnalyticsSnapshot = (data) =>
  pickDashboardFields(data, ANALYTICS_FIELDS);

export const mergeDashboardBootstrapSections = ({
  snapshot,
  core,
  activity,
  history,
  analytics,
}) => {
  if (!snapshot && !core && !activity && !history && !analytics) return null;
  const merged = {
    ...(snapshot || {}),
    ...(activity || {}),
    ...(history || {}),
    ...(analytics || {}),
    ...(core || {}),
    generatedAt:
      core?.generatedAt ||
      activity?.generatedAt ||
      history?.generatedAt ||
      analytics?.generatedAt ||
      snapshot?.generatedAt ||
      new Date().toISOString(),
  };
  const summaries =
    activity?.trainings?.summaries ?? snapshot?.trainings?.summaries;
  const details = history?.trainings?.details ?? snapshot?.trainings?.details;
  if (summaries || details) {
    merged.trainings = {
      ...(summaries ? { summaries } : {}),
      ...(details ? { details } : {}),
    };
  }
  return merged;
};

export const readDashboardSnapshot = (key, now = Date.now()) => {
  if (typeof window === "undefined" || !key) return null;
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(key));
    const savedAt = Number(stored?.savedAt || 0);
    if (
      !stored?.data ||
      !savedAt ||
      now - savedAt > DASHBOARD_SNAPSHOT_MAX_AGE_MS
    ) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return stored.data;
  } catch {
    window.sessionStorage.removeItem(key);
    return null;
  }
};

export const writeDashboardSnapshot = (key, data, now = Date.now()) => {
  if (typeof window === "undefined" || !key || !data) return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ savedAt: now, data }));
  } catch {
    // La consulta en memoria sigue disponible si el navegador limita storage.
  }
};

const belongsToSnapshotOwner = (snapshot, entity, ownerField) => {
  const snapshotOwnerId = String(snapshot?.ownerId || "");
  const entityOwnerId = String(entity?.[ownerField] || "");
  return (
    !snapshotOwnerId || !entityOwnerId || snapshotOwnerId === entityOwnerId
  );
};

const upsertById = (items, entity, limit) => {
  const entityId = getEntityId(entity);
  const currentItems = Array.isArray(items) ? items : [];
  const index = currentItems.findIndex(
    (item) => entityId && getEntityId(item) === entityId,
  );

  if (index < 0) return [entity, ...currentItems].slice(0, limit);

  const nextItems = [...currentItems];
  nextItems[index] = { ...nextItems[index], ...entity };
  return nextItems;
};

export const upsertDashboardCheckIn = (snapshot, checkIn) => {
  if (
    !snapshot ||
    !checkIn?.dateKey ||
    !belongsToSnapshotOwner(snapshot, checkIn, "athleteId")
  ) {
    return snapshot;
  }

  const dailyMetrics = Array.isArray(snapshot.dailyMetrics)
    ? snapshot.dailyMetrics
    : [];
  const metricIndex = dailyMetrics.findIndex(
    (metric) => metric?.dateKey === checkIn.dateKey,
  );
  const checkInMetric = {
    dateKey: checkIn.dateKey,
    readinessScore: checkIn.readinessScore,
    readinessState: checkIn.readinessState,
  };
  const nextDailyMetrics = [...dailyMetrics];

  if (metricIndex >= 0) {
    nextDailyMetrics[metricIndex] = {
      ...nextDailyMetrics[metricIndex],
      ...checkInMetric,
    };
  } else {
    nextDailyMetrics.unshift(checkInMetric);
  }

  return { ...snapshot, dailyMetrics: nextDailyMetrics };
};

export const upsertDashboardTraining = (snapshot, training) => {
  if (
    !snapshot ||
    !getEntityId(training) ||
    !belongsToSnapshotOwner(snapshot, training, "ownerId")
  ) {
    return snapshot;
  }

  const currentTrainings = snapshot.trainings || {};
  return {
    ...snapshot,
    trainings: {
      ...currentTrainings,
      summaries: upsertById(currentTrainings.summaries, training, 120),
      details: upsertById(currentTrainings.details, training, 45),
    },
  };
};
