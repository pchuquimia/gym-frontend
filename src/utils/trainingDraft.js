export const TRAINING_DRAFT_SYNC_LABELS = Object.freeze({
  idle: "Guardado en este dispositivo",
  saving: "Guardando…",
  saved: "Guardado",
  offline: "Sin conexión",
  error: "Pendiente de sincronizar",
});

export const parseTrainingSnapshot = (value) => {
  if (!value) return null;
  try {
    const snapshot = typeof value === "string" ? JSON.parse(value) : value;
    return snapshot &&
      typeof snapshot === "object" &&
      !Array.isArray(snapshot) &&
      snapshot.selectedRoutineId
      ? snapshot
      : null;
  } catch {
    return null;
  }
};

const snapshotUpdatedAt = (snapshot) => {
  const value = Number(snapshot?.lastUpdate || 0);
  return Number.isFinite(value) ? value : 0;
};

export const selectLatestTrainingSnapshot = (localSnapshot, remoteSnapshot) => {
  const local = parseTrainingSnapshot(localSnapshot);
  const remote = parseTrainingSnapshot(remoteSnapshot);
  if (!local) return remote;
  if (!remote) return local;
  return snapshotUpdatedAt(remote) > snapshotUpdatedAt(local) ? remote : local;
};

export const getTrainingDraftSyncLabel = (status) =>
  TRAINING_DRAFT_SYNC_LABELS[status] || TRAINING_DRAFT_SYNC_LABELS.idle;
