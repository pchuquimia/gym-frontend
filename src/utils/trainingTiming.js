const MIN_SET_WORK_SECONDS = 15;
const DEFAULT_SET_WORK_SECONDS = 45;
const MAX_SET_WORK_SECONDS = 300;
const SECONDS_PER_REP = 4;
const ENTRY_TRANSITION_SECONDS = 8;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const createTimeEvent = (
  type,
  exerciseId = null,
  atMs = Date.now(),
  details = {},
) => ({
  type,
  exerciseId,
  at: new Date(atMs).toISOString(),
  ...(details.setId ? { setId: details.setId } : {}),
  ...(details.source ? { source: details.source } : {}),
  ...(details.restType ? { restType: details.restType } : {}),
  ...(Number.isFinite(Number(details.workSeconds))
    ? { workSeconds: Math.max(0, Math.round(Number(details.workSeconds))) }
    : {}),
});

export const getEventTime = (event) => {
  const timestamp = Date.parse(event?.at);
  return Number.isNaN(timestamp) ? null : timestamp;
};

export const normalizeTimeEvents = (events = []) =>
  (Array.isArray(events) ? events : [])
    .filter((event) => event?.type && event?.at && getEventTime(event) != null)
    .map((event) => ({
      type: event.type,
      at: new Date(getEventTime(event)).toISOString(),
      exerciseId: event.exerciseId || null,
      ...(event.setId ? { setId: event.setId } : {}),
      ...(event.source ? { source: event.source } : {}),
      ...(event.restType ? { restType: event.restType } : {}),
      ...(Number.isFinite(Number(event.workSeconds))
        ? { workSeconds: Math.max(0, Math.round(Number(event.workSeconds))) }
        : {}),
    }))
    .sort((a, b) => getEventTime(a) - getEventTime(b));

export const hasOpenRestInterval = (events = []) => {
  let open = false;
  normalizeTimeEvents(events).forEach((event) => {
    if (event.type === "rest_start") open = true;
    if (
      event.type === "rest_end" ||
      event.type === "session_pause" ||
      event.type === "session_end"
    ) {
      open = false;
    }
  });
  return open;
};

export const estimateSetWorkSeconds = (set = {}) => {
  const entries = Array.isArray(set.entries) ? set.entries : [];
  const repValues = (entries.length ? entries : [set])
    .map((entry) => Number(entry?.reps))
    .filter((reps) => Number.isFinite(reps) && reps > 0);
  if (!repValues.length) return DEFAULT_SET_WORK_SECONDS;

  const repetitions = repValues.reduce((sum, reps) => sum + reps, 0);
  const transitions = Math.max(0, repValues.length - 1);
  return clamp(
    Math.round(
      repetitions * SECONDS_PER_REP + transitions * ENTRY_TRANSITION_SECONDS,
    ),
    MIN_SET_WORK_SECONDS,
    MAX_SET_WORK_SECONDS,
  );
};

const getLatestOpenSetStart = (events, exerciseId, setId) => {
  const normalizedExerciseId = String(exerciseId || "");
  const normalizedSetId = String(setId || "");
  let startedAt = null;
  normalizeTimeEvents(events).forEach((event) => {
    if (
      String(event.exerciseId || "") !== normalizedExerciseId ||
      String(event.setId || "") !== normalizedSetId
    ) {
      return;
    }
    if (event.type === "set_start") startedAt = getEventTime(event);
    if (event.type === "set_complete") startedAt = null;
  });
  return startedAt;
};

export const resolveSetWorkEstimate = ({
  events = [],
  exerciseId,
  setId,
  set,
  completedAtMs = Date.now(),
}) => {
  const estimatedSeconds = estimateSetWorkSeconds(set);
  const startedAt = getLatestOpenSetStart(events, exerciseId, setId);
  if (!Number.isFinite(startedAt) || completedAtMs <= startedAt) {
    return { workSeconds: estimatedSeconds, source: "estimated" };
  }

  const elapsedSeconds = Math.max(
    1,
    Math.round((completedAtMs - startedAt) / 1000),
  );
  return {
    workSeconds: clamp(
      elapsedSeconds,
      Math.min(MIN_SET_WORK_SECONDS, estimatedSeconds),
      MAX_SET_WORK_SECONDS,
    ),
    source:
      elapsedSeconds > MAX_SET_WORK_SECONDS ? "measured_capped" : "measured",
  };
};

export const removeLatestSetCompletion = (events, exerciseId, setId) => {
  const next = [...(Array.isArray(events) ? events : [])];
  for (let index = next.length - 1; index >= 0; index -= 1) {
    const event = next[index];
    if (
      event?.type === "set_complete" &&
      String(event.exerciseId || "") === String(exerciseId || "") &&
      String(event.setId || "") === String(setId || "")
    ) {
      next.splice(index, 1);
      break;
    }
  }
  return next;
};

export const calculateTimingSummary = (events = [], nowMs = Date.now()) => {
  let running = false;
  let resting = false;
  let activeExerciseId = null;
  let lastAt = null;
  let pauseStartedAt = null;
  let durationSeconds = 0;
  let restSeconds = 0;
  let pauseSeconds = 0;
  let recordedWorkSeconds = 0;
  const exerciseDurations = new Map();
  const exerciseRestDurations = new Map();
  const exerciseWorkDurations = new Map();
  const normalizedEvents = normalizeTimeEvents(events);
  const hasRestEvents = normalizedEvents.some((event) =>
    ["rest_start", "rest_end"].includes(event.type),
  );
  const hasSetCompletionEvents = normalizedEvents.some(
    (event) => event.type === "set_complete",
  );

  const accrue = (nextAt) => {
    if (!running || lastAt == null || nextAt <= lastAt) return;
    const delta = Math.floor((nextAt - lastAt) / 1000);
    if (delta <= 0) return;
    durationSeconds += delta;
    if (resting) restSeconds += delta;
    if (activeExerciseId) {
      exerciseDurations.set(
        activeExerciseId,
        (exerciseDurations.get(activeExerciseId) || 0) + delta,
      );
      if (resting) {
        exerciseRestDurations.set(
          activeExerciseId,
          (exerciseRestDurations.get(activeExerciseId) || 0) + delta,
        );
      }
    }
  };

  normalizedEvents.forEach((event) => {
    const at = getEventTime(event);
    accrue(at);
    if (event.type === "session_start" || event.type === "session_resume") {
      if (pauseStartedAt != null && at > pauseStartedAt) {
        pauseSeconds += Math.floor((at - pauseStartedAt) / 1000);
      }
      running = true;
      resting = false;
      pauseStartedAt = null;
      lastAt = at;
      return;
    }
    if (event.type === "session_pause" || event.type === "session_end") {
      if (pauseStartedAt != null && at > pauseStartedAt) {
        pauseSeconds += Math.floor((at - pauseStartedAt) / 1000);
      }
      running = false;
      resting = false;
      pauseStartedAt = event.type === "session_pause" ? at : null;
      lastAt = at;
      return;
    }
    if (event.type === "exercise_start" || event.type === "exercise_selected") {
      if (!running) running = true;
      activeExerciseId = event.exerciseId || null;
      lastAt = at;
      return;
    }
    if (event.type === "set_complete") {
      const workSeconds = Math.max(0, Number(event.workSeconds) || 0);
      recordedWorkSeconds += workSeconds;
      if (event.exerciseId) {
        exerciseWorkDurations.set(
          event.exerciseId,
          (exerciseWorkDurations.get(event.exerciseId) || 0) + workSeconds,
        );
      }
      lastAt = at;
      return;
    }
    if (event.type === "set_start") {
      lastAt = at;
      return;
    }
    if (event.type === "rest_start" && running) {
      resting = true;
      lastAt = at;
      return;
    }
    if (event.type === "rest_end") {
      resting = false;
      lastAt = at;
    }
  });

  if (running) accrue(nowMs);
  else if (pauseStartedAt != null && nowMs > pauseStartedAt) {
    pauseSeconds += Math.floor((nowMs - pauseStartedAt) / 1000);
  }

  const workSeconds = hasSetCompletionEvents
    ? Math.min(durationSeconds, recordedWorkSeconds)
    : hasRestEvents
      ? Math.max(0, durationSeconds - restSeconds)
      : null;
  const preparationSeconds = hasSetCompletionEvents
    ? Math.max(0, durationSeconds - restSeconds - workSeconds)
    : null;
  const exerciseIds = new Set([
    ...exerciseDurations.keys(),
    ...exerciseWorkDurations.keys(),
    ...exerciseRestDurations.keys(),
  ]);

  return {
    durationSeconds,
    workSeconds,
    restSeconds: hasRestEvents ? restSeconds : null,
    preparationSeconds,
    pauseSeconds,
    hasRestEvents,
    hasSetCompletionEvents,
    activeExerciseId: running ? activeExerciseId : "",
    exerciseDurations,
    exerciseDurationsPayload: Array.from(exerciseIds).map((exerciseId) => {
      const trackedSeconds = exerciseDurations.get(exerciseId) || 0;
      const exerciseRestSeconds = exerciseRestDurations.get(exerciseId) || 0;
      const recordedExerciseWork = exerciseWorkDurations.get(exerciseId) || 0;
      const exerciseWorkSeconds = hasSetCompletionEvents
        ? Math.min(trackedSeconds || recordedExerciseWork, recordedExerciseWork)
        : hasRestEvents
          ? Math.max(0, trackedSeconds - exerciseRestSeconds)
          : null;
      const durationSeconds = Math.max(
        trackedSeconds,
        (exerciseWorkSeconds || 0) + exerciseRestSeconds,
      );
      return {
        exerciseId,
        durationSeconds,
        workSeconds: exerciseWorkSeconds,
        restSeconds: hasRestEvents ? exerciseRestSeconds : null,
        preparationSeconds:
          hasSetCompletionEvents && Number.isFinite(exerciseWorkSeconds)
            ? Math.max(
                0,
                durationSeconds - exerciseRestSeconds - exerciseWorkSeconds,
              )
            : null,
      };
    }),
  };
};

export const buildFallbackTimeEvents = (
  durationSeconds = 0,
  endMs = Date.now(),
) => {
  const seconds = Number(durationSeconds) || 0;
  if (seconds <= 0) return [];
  return [
    createTimeEvent("session_start", null, endMs - seconds * 1000),
    createTimeEvent("session_pause", null, endMs),
  ];
};
