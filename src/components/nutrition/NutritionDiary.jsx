import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coffee,
  LoaderCircle,
  Moon,
  Sun,
  Sunrise,
  Utensils,
} from "lucide-react";
import { api } from "../../services/api";
import {
  nutritionDate,
  nutritionTimezone,
  shiftNutritionDate,
  nutritionSummary,
  nutrientTotal,
} from "./nutritionUtils";
import { useAuth } from "../../context/AuthContext";
import { displayNutrient, foodEmoji } from "./foodPresentation";
import "./nutritionDiary.css";

const mealAppearance = (name, index) => {
  if (/desayuno/i.test(name))
    return { Icon: Sunrise, tone: "peach", label: "Empieza tu día" };
  if (/almuerzo|comida/i.test(name))
    return { Icon: Sun, tone: "mint", label: "Recarga tu energía" };
  if (/cena/i.test(name))
    return { Icon: Moon, tone: "lilac", label: "Cierra bien tu día" };
  if (/merienda|snack|colaci[oó]n/i.test(name))
    return { Icon: Coffee, tone: "peach", label: "Una pausa para ti" };
  return {
    Icon: Utensils,
    tone: ["peach", "mint", "lilac"][index % 3],
    label: "Tu siguiente comida",
  };
};

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
  const completion = meals.length ? completedCount / meals.length : 0;
  const changeDate = (delta) => {
    setSelectedDate(shiftNutritionDate(date, delta));
    setExpanded("");
    mutation.reset();
  };
  return (
    <section
      aria-label={compact ? "Comidas de hoy" : "Mi alimentación"}
      className={`diet-plan ${compact ? "diet-plan--compact" : ""}`}
    >
      <header className="diet-plan__header">
        <div>
          <span className="diet-plan__eyebrow">TU PLAN, A TU RITMO</span>
          <h2>{compact ? "Comidas de hoy" : "Tu plan de comidas"}</h2>
        </div>
        {compact ? (
          <button type="button" onClick={onOpen} className="diet-plan__open">
            Ver plan <ChevronRight size={16} />
          </button>
        ) : (
          <div className="diet-plan__date">
            <button
              type="button"
              aria-label="Día anterior"
              onClick={() => changeDate(-1)}
            >
              <ChevronLeft size={19} />
            </button>
            <span>{titleDate}</span>
            <button
              type="button"
              aria-label="Día siguiente"
              onClick={() => changeDate(1)}
            >
              <ChevronRight size={19} />
            </button>
          </div>
        )}
      </header>
      {query.isPending ? (
        <div role="status" className="diet-plan__state">
          <LoaderCircle size={21} className="animate-spin" /> Cargando tus
          comidas...
        </div>
      ) : query.isError ? (
        <div role="alert" className="diet-plan__state diet-plan__state--error">
          <p>No pudimos cargar tu alimentación. {query.error.message}</p>
          <button type="button" onClick={() => query.refetch()}>
            Reintentar alimentación
          </button>
        </div>
      ) : !plan ? (
        <div className="diet-plan__empty">
          <span>
            <Utensils size={29} strokeWidth={1.5} />
          </span>
          <h3>Tu próximo paso empieza aquí</h3>
          <p>
            {dayIsFuture
              ? "Todavía no tienes comidas asignadas para este día."
              : "Tu coach aún no ha asignado un plan de alimentación para este día."}
          </p>
        </div>
      ) : (
        <>
          <div className="diet-plan__summary">
            <div className="diet-plan__energy">
              <div
                role="progressbar"
                aria-label="Comidas completadas"
                aria-valuenow={completedCount}
                aria-valuemin={0}
                aria-valuemax={meals.length}
                className="diet-plan__ring"
                style={{ "--diet-progress": `${completion * 360}deg` }}
              >
                <div>
                  <Utensils size={17} strokeWidth={1.6} />
                  <strong>
                    {completedCount}
                    <small>/{meals.length}</small>
                  </strong>
                  <span>comidas</span>
                </div>
              </div>
              <div className="diet-plan__energy-copy">
                <span>ENERGÍA DE TU PLAN</span>
                <p>
                  <strong>
                    {calories.planned !== null
                      ? displayNutrient(calories.completed)
                      : "—"}
                  </strong>
                  <span> / {displayNutrient(calories.planned)} kcal</span>
                </p>
                <small>
                  {completion === 1
                    ? "Todas las comidas completadas"
                    : `${completedCount} de ${meals.length} comidas completadas`}
                </small>
              </div>
            </div>
            {summary.slice(1).some((item) => item.planned !== null) && (
              <div className="diet-plan__macros">
                {summary.slice(1).map((item) => (
                  <div
                    key={item.key}
                    className="diet-plan__macro"
                    style={{ "--macro-color": item.color }}
                  >
                    <span>
                      <i />
                      {item.label}
                    </span>
                    <p>
                      <strong>{displayNutrient(item.completed)}</strong>
                      <small> / {displayNutrient(item.planned)} g</small>
                    </p>
                    <div className="diet-plan__macro-track">
                      <i
                        style={{
                          width: `${item.planned ? Math.min(100, ((item.completed || 0) / item.planned) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {!compact && (
            <div className="diet-plan__section-title">
              <div>
                <h3>Tus comidas</h3>
                <p>Marca cada comida cuando la completes.</p>
              </div>
              <span>{meals.length} comidas</span>
            </div>
          )}
          <div className="diet-plan__meals">
            {meals.map((meal, index) => {
              const done = doneIds.includes(meal.mealId);
              const open = expanded === meal.mealId;
              const mealCalories = nutrientTotal(meal.foods, "calories");
              const { Icon, tone, label } = mealAppearance(meal.name, index);
              const saving =
                mutation.isPending &&
                mutation.variables?.mealId === meal.mealId;
              return (
                <article
                  key={meal.mealId}
                  aria-label={meal.name}
                  className={`diet-meal ${done ? "diet-meal--done" : ""}`}
                >
                  <div className="diet-meal__top">
                    <span
                      className={`diet-meal__icon diet-meal__icon--${tone}`}
                    >
                      <Icon size={25} strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <div className="diet-meal__heading">
                      <div>
                        <h3>{meal.name}</h3>
                        {meal.time && <time>{meal.time}</time>}
                      </div>
                      <p>{done ? "Comida completada" : label}</p>
                    </div>
                    <button
                      type="button"
                      aria-pressed={done}
                      aria-label={`${done ? "Desmarcar" : "Completar"} ${meal.name}`}
                      disabled={!query.data.canComplete || mutation.isPending}
                      className="diet-meal__check"
                      onClick={() =>
                        mutation.mutate({
                          mealId: meal.mealId,
                          completed: !done,
                        })
                      }
                    >
                      {saving ? (
                        <LoaderCircle size={21} className="animate-spin" />
                      ) : (
                        <Check size={23} strokeWidth={done ? 2.5 : 1.5} />
                      )}
                    </button>
                  </div>
                  <div className="diet-meal__body">
                    <div className="diet-meal__meta">
                      <span>
                        {meal.foods.length}{" "}
                        {meal.foods.length === 1 ? "alimento" : "alimentos"}
                      </span>
                      {mealCalories !== null && (
                        <strong>
                          {displayNutrient(mealCalories)} <small>kcal</small>
                        </strong>
                      )}
                    </div>
                    {!open && (
                      <p className="diet-meal__preview">
                        {meal.foods.map((food) => food.name).join(" · ")}
                      </p>
                    )}
                    <button
                      type="button"
                      className="diet-meal__expand"
                      aria-label={`Ver alimentos de ${meal.name}`}
                      aria-expanded={open}
                      aria-controls={`diet-meal-${meal.mealId}`}
                      onClick={() => setExpanded(open ? "" : meal.mealId)}
                    >
                      {open
                        ? "Ocultar alimentos"
                        : "Ver alimentos y cantidades"}
                      <ChevronDown
                        size={16}
                        className={open ? "is-expanded" : ""}
                      />
                    </button>
                  </div>
                  {open && (
                    <div
                      id={`diet-meal-${meal.mealId}`}
                      className="diet-meal__details"
                    >
                      <ul>
                        {meal.foods.map((food, foodIndex) => (
                          <li key={foodIndex}>
                            <span
                              className="diet-meal__food-icon"
                              aria-hidden="true"
                            >
                              {foodEmoji(food.name)}
                            </span>
                            <div>
                              <strong>{food.name}</strong>
                              <span>{food.quantity}</span>
                            </div>
                            {food.calories != null && (
                              <small>
                                {displayNutrient(food.calories)} kcal
                              </small>
                            )}
                          </li>
                        ))}
                      </ul>
                      {meal.notes && (
                        <p className="diet-meal__notes">{meal.notes}</p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          {!compact && plan.content.notes && (
            <aside className="diet-plan__coach-note">
              <span>
                <Utensils size={17} /> Indicaciones de tu coach
              </span>
              <p>{plan.content.notes}</p>
            </aside>
          )}
          <footer className="diet-plan__footer">
            <span>{plan.content.name}</span>
            <p>
              {completion === 1
                ? "¡Listo por hoy! Cada comida cuenta."
                : "Tu constancia se construye una comida a la vez."}
            </p>
          </footer>
          {dayIsFuture && (
            <p className="diet-plan__notice">
              Puedes revisar este día. El registro se habilita cuando llegue la
              fecha.
            </p>
          )}
          {mutation.isError && (
            <p
              role="alert"
              className="diet-plan__notice diet-plan__notice--error"
            >
              No se guardó el cambio. {mutation.error.message}{" "}
              <button type="button" onClick={() => query.refetch()}>
                Actualizar plan
              </button>
            </p>
          )}
        </>
      )}
    </section>
  );
}
