import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Utensils } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import NutritionDiary from "../components/nutrition/NutritionDiary";
import NutritionPlanEditor from "../components/nutrition/NutritionPlanEditor";
import {
  nutritionTimezone,
  nutritionSummary,
} from "../components/nutrition/nutritionUtils";

function CoachNutrition({ coachAthlete, onNavigate, onSelectCoachAthlete }) {
  const client = useQueryClient();
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState(
    String(coachAthlete?.id || coachAthlete?._id || ""),
  );
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const timezone = nutritionTimezone();
  const students = useQuery({
    queryKey: ["nutrition-athletes", user?.id || user?._id],
    queryFn: () => api.getCoachAthletes(),
    staleTime: 30_000,
  });
  const query = useQuery({
    queryKey: ["coach-nutrition", user?.id || user?._id, selectedId, timezone],
    queryFn: ({ signal }) =>
      api.getCoachNutrition(selectedId, { timezone }, { signal }),
    enabled: Boolean(selectedId),
    refetchInterval: 30_000,
    retry: 1,
  });
  const save = useMutation({
    mutationFn: (payload) => api.createNutritionPlan(selectedId, payload),
    onSuccess: async () => {
      setEditing(false);
      setNotice(
        "Dieta asignada. El alumno podrá verla desde la fecha indicada.",
      );
      await client.invalidateQueries({
        queryKey: ["coach-nutrition", user?.id || user?._id, selectedId],
      });
      await client.invalidateQueries({ queryKey: ["nutrition-day"] });
    },
  });
  const latest = query.data?.plans?.[0];
  const daily = query.data?.daily;
  const meals = latest?.content?.meals || [];
  const calories = nutritionSummary(meals)[0].planned;
  const changeAthlete = (id) => {
    setSelectedId(id);
    setEditing(false);
    setNotice("");
    save.reset();
    const athlete = students.data?.find(
      (item) => String(item.id || item._id) === id,
    );
    onSelectCoachAthlete?.(athlete ? { id, name: athlete.name } : null);
  };
  if (editing && selectedId && query.data) {
    const athlete = students.data?.find(
      (item) => String(item.id || item._id) === selectedId,
    );
    return (
      <main className="mx-auto w-full max-w-3xl pb-28">
        <NutritionPlanEditor
          key={`${selectedId}-${latest?._id || "new"}`}
          athleteName={athlete?.name || coachAthlete?.name}
          initialPlan={latest}
          onSave={(payload) => save.mutate(payload)}
          onCancel={() => setEditing(false)}
          saving={save.isPending}
          error={save.error?.message}
          hasDailyRecord={Boolean(daily?.day)}
        />
      </main>
    );
  }
  return (
    <main className="mx-auto w-full max-w-3xl space-y-5 pb-28 text-[color:var(--text)]">
      <header>
        <button
          type="button"
          onClick={() => onNavigate?.("coach_athletes")}
          className="mb-3 inline-flex min-h-11 items-center gap-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Alumnos
        </button>
        <h1 className="text-3xl font-semibold tracking-[-0.04em]">
          Alimentación
        </h1>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
          Crea comidas completas y acompaña el cumplimiento diario de tu alumno.
        </p>
      </header>
      <label className="block text-sm font-semibold">
        Alumno
        <select
          aria-label="Alumno para alimentación"
          value={selectedId}
          onChange={(event) => changeAthlete(event.target.value)}
          disabled={editing || save.isPending}
          className="mt-2 h-12 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-base"
        >
          <option value="">Selecciona un alumno</option>
          {(students.data || []).map((athlete) => (
            <option
              key={athlete.id || athlete._id}
              value={athlete.id || athlete._id}
            >
              {athlete.name}
            </option>
          ))}
        </select>
      </label>
      {students.isError ? (
        <p role="alert" className="text-sm text-red-500">
          No pudimos cargar tus alumnos.{" "}
          <button
            type="button"
            onClick={() => students.refetch()}
            className="underline"
          >
            Reintentar alumnos
          </button>
        </p>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="rounded-xl border border-[#438362] p-4 text-sm"
        >
          {notice}
        </p>
      ) : null}
      {!selectedId ? (
        <p className="py-8 text-sm text-[color:var(--text-muted)]">
          Selecciona un alumno vinculado para gestionar su dieta.
        </p>
      ) : query.isPending ? (
        <p role="status">Cargando alimentación...</p>
      ) : query.isError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-400 p-4 text-sm"
        >
          <p>{query.error.message}</p>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="mt-2 min-h-11 font-semibold underline"
          >
            Reintentar alimentación
          </button>
        </div>
      ) : (
        <>
          <section className="space-y-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-[color:var(--text-muted)]">
                  Última versión
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  {latest?.content.name || "Aún sin dieta asignada"}
                </h2>
                {latest ? (
                  <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                    Desde {latest.startsOn} · {meals.length} comidas
                    {calories !== null
                      ? ` · ${calories} kcal planificadas`
                      : ""}
                  </p>
                ) : null}
              </div>
              <Utensils className="h-6 w-6 shrink-0" />
            </div>
            {meals.map((meal) => (
              <div
                key={meal.mealId}
                className="border-t border-[color:var(--border)] pt-3"
              >
                <h3 className="text-sm font-semibold">
                  {meal.name}
                  {meal.time ? ` · ${meal.time}` : ""}
                </h3>
                <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                  {meal.foods
                    .map((food) => `${food.name} (${food.quantity})`)
                    .join(" · ")}
                </p>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                save.reset();
                setEditing(true);
                setNotice("");
              }}
              className="theme-accent-solid min-h-12 w-full rounded-xl px-4 text-sm font-semibold"
            >
              {latest ? "Editar y asignar nueva versión" : "Crear dieta"}
            </button>
          </section>
          <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
            <h2 className="text-lg font-semibold">Cumplimiento de hoy</h2>
            <p className="mt-2 text-sm text-[color:var(--text-muted)]">
              {daily?.plan
                ? `${daily.day?.completedMealIds?.length || 0} de ${daily.plan.content.meals.length} comidas completadas`
                : "No hay una dieta disponible para hoy."}
            </p>
            {daily?.day ? (
              <ul className="mt-3 space-y-2 text-sm">
                {daily.plan.content.meals.map((meal) => (
                  <li key={meal.mealId}>
                    {daily.day.completedMealIds.includes(meal.mealId)
                      ? "✓"
                      : "○"}{" "}
                    {meal.name}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-3 text-xs text-[color:var(--text-muted)]">
              El alumno registra sus comidas desde su dashboard. Cada día
              conserva la versión que utilizó al comenzar el registro.
            </p>
          </section>
          {query.data.days.length ? (
            <section className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-5">
              <h2 className="text-lg font-semibold">
                Últimos días registrados
              </h2>
              <div className="mt-3 divide-y divide-[color:var(--border)]">
                {query.data.days.map((day) => (
                  <div
                    key={day._id}
                    className="flex justify-between gap-3 py-3 text-sm"
                  >
                    <span>{day.dateKey}</span>
                    <span>
                      {day.completedMealIds.length}/{day.snapshot.meals.length}{" "}
                      comidas
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}

export default function Nutrition(props) {
  const { user } = useAuth();
  if (["Entrenador", "Admin"].includes(user?.role))
    return <CoachNutrition {...props} />;
  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 pb-24 text-[color:var(--text)]">
      <button
        type="button"
        onClick={() => props.onNavigate?.("dashboard")}
        className="inline-flex min-h-11 items-center gap-2 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Inicio
      </button>
      <h1 className="text-3xl font-semibold tracking-[-0.04em]">
        Mi alimentación
      </h1>
      <NutritionDiary />
    </main>
  );
}
