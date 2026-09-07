const getEntityId = (entity) => String(entity?.id || entity?._id || "");

const belongsToSnapshotOwner = (snapshot, entity, ownerField) => {
  const snapshotOwnerId = String(snapshot?.ownerId || "");
  const entityOwnerId = String(entity?.[ownerField] || "");
  return !snapshotOwnerId || !entityOwnerId || snapshotOwnerId === entityOwnerId;
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
