import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Utensils } from "lucide-react";
import { api } from "../../services/api";
import {
  nutritionDate,
  nutritionTimezone,
  shiftNutritionDate,
  nutritionSummary,
  nutrientTotal,
} from "./nutritionUtils";
import { useAuth } from "../../context/AuthContext";

export default function NutritionDiary({ compact = false, onOpen }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(nutritionDate());
  const [expanded, setExpanded] = useState("");
  const date = compact ? nutritionDate() : selectedDate;
  const timezone = nutritionTimezone();
  const key = ["nutrition-day", user?.id || user?._id, date, timezone];
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) =>
      api.getNutritionDay({ dateKey: date, timezone }, { signal }),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });
  const mutation = useMutation({
    mutationFn: ({ mealId, completed }) =>
      api.completeNutritionMeal({
        dateKey: date,
        timezone,
        planId: query.data.plan._id,
        mealId,
        completed,
      }),
    onSuccess: (data) =>
      client.setQueryData(
        ["nutrition-day", user?.id || user?._id, data.dateKey, timezone],
        data,
      ),
  });
  const plan = query.data?.plan;
  const meals = plan?.content?.meals || [];
  const doneIds = query.data?.day?.completedMealIds || [];
  const completedCount = meals.filter((meal) =>
    doneIds.includes(meal.mealId),
  ).length;
  const summary = nutritionSummary(meals, doneIds);
  const calories = summary[0];
  const titleDate =
    date === nutritionDate()
      ? "Hoy"
      : new Date(`${date}T12:00:00`).toLocaleDateString("es-BO", {
          day: "numeric",
          month: "long",
        });
  const dayIsFuture = date > (query.data?.today || nutritionDate());
  return (
    <section
      aria-label={compact ? "Comidas de hoy" : "Mi alimentación"}
      className="overflow-hidden rounded-[24px] border border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text)]"
    >
      <header className="flex items-center justify-between gap-3 px-5 pb-4 pt-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
            Alimentación · {titleDate}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">
            {compact ? "Comidas de hoy" : "Tu plan de comidas"}
          </h2>
        </div>
        {compact ? (
          <button
            type="button"
            onClick={onOpen}
            className="min-h-11 px-2 text-sm font-semibold"
          >
            Ver plan <ChevronRight className="inline h-4 w-4" />
          </button>
        ) : (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              aria-label="Día anterior"
              onClick={() => {
                setSelectedDate(shiftNutritionDate(date, -1));
                mutation.reset();
              }}
              className="grid h-11 w-11 place-items-center rounded-full border border-[color:var(--border)]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Día siguiente"
              onClick={() => {
                setSelectedDate(shiftNutritionDate(date, 1));
                mutation.reset();
              }}
              className="grid h-11 w-11 place-items-center rounded-full border border-[color:var(--border)]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </header>
      {query.isPending ? (
        <p role="status" className="px-5 pb-5 text-sm">
          Cargando tus comidas...
        </p>
      ) : query.isError ? (
        <div role="alert" className="px-5 pb-5 text-sm">
          <p>No pudimos cargar tu alimentación. {query.error.message}</p>
          <button
            type="button"
            onClick={() => query.refetch()}
            className="mt-2 min-h-11 font-semibold underline"
          >
            Reintentar alimentación
          </button>
        </div>
      ) : !plan ? (
        <div className="px-5 pb-6 text-sm text-[color:var(--text-muted)]">
          <Utensils className="mb-3 h-6 w-6" />
          <p>
            {dayIsFuture
              ? "Todavía no tienes comidas asignadas para este día."
              : "Tu coach aún no ha asignado un plan de alimentación para este día."}
          </p>
        </div>
      ) : (
        <>
          <div className="mx-5 rounded-2xl bg-[color:var(--surface-subtle)] p-4">
            <div className="flex items-center gap-4">
              <div
                role="progressbar"
                aria-label="Comidas completadas"
                aria-valuenow={completedCount}
                aria-valuemin={0}
                aria-valuemax={meals.length}
                className="grid h-16 w-16 shrink-0 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#438362 ${(completedCount / meals.length) * 360}deg, var(--border) 0deg)`,
                }}
              >
                <span className="grid h-14 w-14 place-items-center rounded-full bg-[color:var(--card)] text-base font-semibold">
                  {completedCount}/{meals.length}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {completedCount === meals.length
                    ? "Todas las comidas completadas"
                    : "Un paso a la vez"}
                </p>
                <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                  {calories.planned !== null
                    ? `${calories.completed ?? "—"} / ${calories.planned} kcal del plan completado`
                    : `${completedCount} de ${meals.length} comidas completadas`}
                </p>
                <p className="mt-1 truncate text-xs text-[color:var(--text-muted)]">
                  {plan.content.name}
                </p>
              </div>
            </div>
            {summary.slice(1).some((item) => item.planned !== null) ? (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {summary.slice(1).map((item) => (
                  <div key={item.key}>
                    <p className="truncate text-[11px] text-[color:var(--text-muted)]">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs font-semibold">
                      {item.planned === null
                        ? "Sin datos"
                        : `${item.completed ?? "—"} / ${item.planned} g`}
                    </p>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-[color:var(--border)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${item.planned ? Math.min(100, ((item.completed || 0) / item.planned) * 100) : 0}%`,
                          background: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          {plan.content.notes && !compact ? (
            <p className="mx-5 mt-4 whitespace-pre-wrap rounded-xl border border-[color:var(--border)] p-3 text-sm text-[color:var(--text-muted)]">
              {plan.content.notes}
            </p>
          ) : null}
          <div className="mt-3 divide-y divide-[color:var(--border)]">
            {meals.map((meal, index) => {
              const done = doneIds.includes(meal.mealId);
              const open = expanded === meal.mealId;
              const mealCalories = nutrientTotal(meal.foods, "calories");
              return (
                <article key={meal.mealId} className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-pressed={done}
                      aria-label={`${done ? "Desmarcar" : "Completar"} ${meal.name}`}
                      disabled={!query.data.canComplete || mutation.isPending}
                      onClick={() =>
                        mutation.mutate({
                          mealId: meal.mealId,
                          completed: !done,
                        })
                      }
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition disabled:opacity-50 ${done ? "border-[#438362] bg-[#438362] text-white" : "border-[color:var(--border)]"}`}
                    >
                      {done ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-semibold">
                          {index + 1}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setExpanded(open ? "" : meal.mealId)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block text-base font-semibold">
                        {meal.name}
                      </span>
                      <span className="mt-1 block truncate text-xs text-[color:var(--text-muted)]">
                        {[
                          meal.time,
                          `${meal.foods.length} alimentos`,
                          mealCalories !== null ? `${mealCalories} kcal` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Ver alimentos de ${meal.name}`}
                      onClick={() => setExpanded(open ? "" : meal.mealId)}
                      className="grid h-11 w-11 shrink-0 place-items-center"
                    >
                      <ChevronRight
                        className={`h-5 w-5 transition-transform ${open ? "rotate-90" : ""}`}
                      />
                    </button>
                  </div>
                  {open ? (
                    <div className="ml-3 mt-4 space-y-3 border-l border-[color:var(--border)] pl-5">
                      <ul className="space-y-3">
                        {meal.foods.map((food, foodIndex) => (
                          <li
                            key={foodIndex}
                            className="flex items-start justify-between gap-3 text-sm"
                          >
                            <span className="min-w-0 break-words">
                              {food.name}
                              <span className="mt-0.5 block text-xs text-[color:var(--text-muted)]">
                                {food.quantity}
                              </span>
                            </span>
                            {food.calories != null ? (
                              <span className="shrink-0 text-xs text-[color:var(--text-muted)]">
                                {food.calories} kcal
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                      {meal.notes ? (
                        <p className="whitespace-pre-wrap text-xs leading-5 text-[color:var(--text-muted)]">
                          {meal.notes}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
          {dayIsFuture ? (
            <p className="px-5 pb-5 text-xs text-[color:var(--text-muted)]">
              Puedes revisar este día. El registro se habilita cuando llegue la
              fecha.
            </p>
          ) : null}
          {mutation.isError ? (
            <p role="alert" className="px-5 pb-5 text-sm text-red-500">
              No se guardó el cambio. {mutation.error.message}{" "}
              <button
                type="button"
                onClick={() => query.refetch()}
                className="font-semibold underline"
              >
                Actualizar plan
              </button>
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
