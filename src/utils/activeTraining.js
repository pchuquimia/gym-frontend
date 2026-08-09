export const ACTIVE_TRAINING_SNAPSHOT_KEY = "active_training_snapshot";
export const LEGACY_ACTIVE_TRAINING_KEY = "active_training";

export const getUserId = (user) => String(user?.id || user?._id || "");

export const readActiveTrainingSnapshot = () => {
  if (typeof localStorage === "undefined") return null;
  const raw =
    localStorage.getItem(ACTIVE_TRAINING_SNAPSHOT_KEY) ||
    localStorage.getItem(LEGACY_ACTIVE_TRAINING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearActiveTrainingSnapshot = () => {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(ACTIVE_TRAINING_SNAPSHOT_KEY);
  localStorage.removeItem(LEGACY_ACTIVE_TRAINING_KEY);
};

export const isActiveTrainingSnapshot = (snapshot) => {
  const elapsed =
    Number(snapshot?.elapsed ?? snapshot?.durationSeconds ?? 0) || 0;
  return Boolean(
    snapshot?.selectedRoutineId &&
      (snapshot?.hasStarted || snapshot?.isRunning || elapsed > 0),
  );
};

export const canAccessActiveTraining = (
  snapshot,
  user,
  coachAthlete = null,
) => {
  if (!isActiveTrainingSnapshot(snapshot)) return false;
  const userId = getUserId(user);
  if (!userId) return false;

  if (snapshot.startedById && String(snapshot.startedById) !== userId) {
    return false;
  }

  const ownerId = String(snapshot.ownerId || "");
  if (!ownerId || ownerId === userId) return true;

  // A supervised session requires both the coach who started it and the
  // athlete currently selected in the coach context.
  return Boolean(
    ["Admin", "Entrenador"].includes(user?.role) &&
      coachAthlete?.id &&
      ownerId === String(coachAthlete.id),
  );
};
