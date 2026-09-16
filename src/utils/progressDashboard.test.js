import { describe, expect, it } from "vitest";
import {
  change,
  comparePlans,
  exerciseStats,
  filterSessions,
  personalRecords,
  planning,
  prepareTrainings,
  rangeFor,
  recordsInSelection,
  timeline,
  totals,
} from "./progressDashboard";

const exercise = (overrides = {}) => ({
  exerciseId: "press",
  exerciseName: "Press con barra",
  loadType: "external",
  muscleGroup: "Pecho",
  weightBasis: "total",
  sets: [{ weightKg: 50, reps: 10, done: true }],
  ...overrides,
});
const training = (id, date, overrides = {}) => ({
  _id: id,
  date,
  routineId: "push",
  trainingPlanId: "a",
  trainingPlanSlotId: "monday",
  durationSeconds: 3600,
  exercises: [exercise()],
  ...overrides,
});
const plan = {
  _id: "a",
  name: "Plan A",
  status: "active",
  scheduleMode: "fixed",
  startDate: "2026-08-31",
  endDate: "2026-09-27",
  weeklySchedule: [
    { slotId: "monday", dayIndex: 1, type: "training", routineId: "push" },
  ],
};
const routines = [
  { _id: "push", exercises: [{ exerciseId: "press", sets: 3 }] },
];
const filters = {
  from: "2026-09-01",
  to: "2026-09-16",
  plan: "",
  muscle: "",
  exercise: "",
  load: "",
};

describe("progress dashboard: trustworthy metrics", () => {
  it("does not mix external, machine, assistance or uncompleted sets", () => {
    const rows = prepareTrainings([
      training("1", "2026-09-07", {
        exercises: [
          exercise(),
          exercise({ loadType: "machine" }),
          exercise({ loadType: "assisted" }),
          exercise({ sets: [{ weightKg: 100, reps: 10, done: false }] }),
        ],
      }),
    ]);
    const result = totals(rows, filters.from, filters.to);
    expect(result.volume).toBe(500);
    expect(result.machine).toBe(500);
    expect(result.sets).toBe(3);
  });
  it("uses effective weights and counts nested series once", () => {
    const stats = exerciseStats(
      exercise({
        weightBasis: "per_side",
        barWeightKg: 20,
        sets: [
          {
            entries: [
              { weightKg: 10, reps: 10, done: true },
              { weightKg: 5, reps: 10, done: true },
            ],
          },
        ],
      }),
    );
    expect(stats.externalKg).toBe(700);
    expect(stats.completedSets).toBe(1);
    expect(stats.reps).toBe(20);
  });
  it("requires all nested entries completed like existing trainingLoad", () => {
    const stats = exerciseStats(
      exercise({
        sets: [
          {
            entries: [
              { weightKg: 50, reps: 10, done: true },
              { weightKg: 50, reps: 10, done: false },
            ],
          },
        ],
      }),
    );
    expect(stats.externalKg).toBe(0);
    expect(stats.performance).toBeNull();
  });
  it("keeps absence of a duration separate from a recorded zero", () => {
    const rows = prepareTrainings([
      training("1", "2026-09-07"),
      training("2", "2026-09-08", { durationOverrideSeconds: 0 }),
    ]);
    expect(totals(rows, filters.from, filters.to)).toMatchObject({
      minutes: 60,
      timed: 1,
      activeDays: 2,
    });
  });
  it("filters exercises consistently without attributing full session volume to a muscle", () => {
    const rows = prepareTrainings([
      training("1", "2026-09-07", {
        exercises: [
          exercise(),
          exercise({ exerciseId: "row", muscleGroup: "Espalda" }),
        ],
      }),
    ]);
    const selected = filterSessions(rows, { ...filters, muscle: "Pecho" });
    expect(selected[0].exercises).toHaveLength(1);
    expect(totals(selected, filters.from, filters.to).volume).toBe(500);
  });
  it("does not invent percentage growth from zero", () => {
    expect(change(100, 0)).toBeNull();
    expect(change(120, 100)).toBe(20);
  });
  it("uses local date keys without losing the selected end day and deduplicates ids", () => {
    const t = training("1", "2026-09-16");
    const rows = prepareTrainings([t, t]);
    expect(filterSessions(rows, filters)).toHaveLength(1);
    expect(rangeFor("7D", "2026-09-16")).toEqual({
      from: "2026-09-10",
      to: "2026-09-16",
    });
  });
  it("fills calendar buckets including inactive days and year boundaries", () => {
    const rows = timeline([], "2025-12-31", "2026-01-02", "day");
    expect(rows.map((r) => r.date)).toEqual([
      "2025-12-31",
      "2026-01-01",
      "2026-01-02",
    ]);
    expect(rows.every((r) => r.sessions === 0)).toBe(true);
    expect(timeline([], "2025-12-31", "2026-01-02", "week")).toHaveLength(1);
  });
});
describe("records and attribution", () => {
  it("does not create a PR from two occurrences in the first session", () => {
    const stronger = exercise({
      sets: [{ weightKg: 60, reps: 10, done: true }],
    });
    expect(
      personalRecords(
        prepareTrainings([
          training("1", "2026-09-07", { exercises: [exercise(), stronger] }),
        ]),
      ),
    ).toHaveLength(0);
  });
  it("keeps gym branches separate for performance comparisons", () => {
    const rows = prepareTrainings([
      training("1", "2026-09-07", { branch: "sopocachi" }),
      training("2", "2026-09-08", {
        branch: "miraflores",
        exercises: [
          exercise({ sets: [{ weightKg: 60, reps: 10, done: true }] }),
        ],
      }),
    ]);
    expect(personalRecords(rows)).toHaveLength(0);
  });
  it("first measurements and equal marks are not PRs", () => {
    expect(
      personalRecords(
        prepareTrainings([
          training("1", "2026-09-01"),
          training("2", "2026-09-02"),
        ]),
      ),
    ).toHaveLength(0);
  });
  it("compares against all historical maxima, before date filtering", () => {
    const rows = prepareTrainings([
      training("1", "2026-08-01"),
      training("2", "2026-09-07", {
        exercises: [
          exercise({ sets: [{ weightKg: 60, reps: 10, done: true }] }),
        ],
      }),
    ]);
    const records = personalRecords(rows);
    expect(records).toHaveLength(1);
    expect(
      recordsInSelection(records, filterSessions(rows, filters)),
    ).toHaveLength(1);
  });
  it("does not compare different progression scopes, movement modes or assistance", () => {
    const high = exercise({ sets: [{ weightKg: 60, reps: 10, done: true }] });
    expect(
      personalRecords(
        prepareTrainings([
          training("1", "2026-09-01"),
          training("2", "2026-09-02", {
            progressScopeId: "new",
            exercises: [high],
          }),
        ]),
      ),
    ).toHaveLength(0);
    expect(
      personalRecords(
        prepareTrainings([
          training("1", "2026-09-01"),
          training("2", "2026-09-02", {
            exercises: [{ ...high, movementMode: "unilateral" }],
          }),
        ]),
      ),
    ).toHaveLength(0);
    const assisted = [20, 30].map((weight, i) =>
      training(`${i}`, `2026-09-0${i + 1}`, {
        exercises: [
          exercise({
            loadType: "assisted",
            sets: [{ weightKg: weight, reps: 10 + i, done: true }],
          }),
        ],
      }),
    );
    expect(personalRecords(prepareTrainings(assisted))).toHaveLength(0);
  });
  it("bodyweight records keep added load comparable", () => {
    const rows = [0, 10].map((weight, i) =>
      training(`${i}`, `2026-09-0${i + 1}`, {
        exercises: [
          exercise({
            loadType: "bodyweight",
            sets: [{ weightKg: weight, reps: 10 + i, done: true }],
          }),
        ],
      }),
    );
    expect(personalRecords(prepareTrainings(rows))).toHaveLength(0);
  });
  it("does not assign sessions to plans merely because dates overlap", () => {
    const rows = prepareTrainings([
      training("1", "2026-09-07", { trainingPlanId: undefined }),
    ]);
    expect(
      planning(plan, rows, routines, filters.from, filters.to, "2026-09-16"),
    ).toMatchObject({ due: 2, completed: 0, adherence: 0 });
  });
  it("does not let duplicates or off-schedule sessions cover missing slots", () => {
    const rows = prepareTrainings([
      training("1", "2026-09-07"),
      training("2", "2026-09-07"),
      training("3", "2026-09-15"),
    ]);
    expect(
      planning(plan, rows, routines, filters.from, filters.to, "2026-09-16"),
    ).toMatchObject({
      due: 2,
      completed: 1,
      adherence: 50,
      unmatched: 2,
      exercises: 2,
      sets: 6,
    });
  });
  it("only counts due days and never fabricates a schedule for a cycle", () => {
    expect(
      planning(plan, [], routines, "2026-09-01", "2026-09-30", "2026-09-08")
        .due,
    ).toBe(1);
    expect(
      planning(
        { ...plan, scheduleMode: "sequential_cycle" },
        [],
        routines,
        filters.from,
        filters.to,
      ),
    ).toBeNull();
    expect(
      planning(
        { ...plan, status: "paused" },
        [],
        routines,
        filters.from,
        filters.to,
      ),
    ).toBeNull();
  });
  it("reports missing routine baselines as unavailable instead of zero", () => {
    expect(
      planning(plan, [], [], filters.from, filters.to, "2026-09-16").sets,
    ).toBeNull();
  });
  it("compares equal elapsed windows and uses exact plan ids", () => {
    const b = {
      ...plan,
      _id: "b",
      status: "completed",
      startDate: "2026-07-01",
      endDate: "2026-07-28",
    };
    const rows = prepareTrainings([
      training("1", "2026-09-07"),
      training("2", "2026-07-06", { trainingPlanId: "b" }),
      training("3", "2026-07-27", { trainingPlanId: "b" }),
    ]);
    const result = comparePlans(
      [plan, b],
      "a",
      "b",
      rows,
      filters,
      "2026-09-16",
    );
    expect(result.days).toBe(17);
    expect(result.b.to).toBe("2026-07-17");
    expect(result.b.totals.sessions).toBe(1);
    expect(comparePlans([plan], "a", "a", rows, filters)).toBeNull();
  });
});
