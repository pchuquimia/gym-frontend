import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
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
import { displayNutrient } from "./foodPresentation";
import "./nutritionDiary.css";

const mealAppearance = (name, time) => {
  const normalized = String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  let type;
  if (
    /merienda|snack|colacion|media manana|media tarde|tentempie/.test(
      normalized,
    )
  )
    type = "snack";
  else if (/desayuno|breakfast/.test(normalized)) type = "breakfast";
  else if (/almuerzo|comida|lunch/.test(normalized)) type = "lunch";
  else if (/cena|dinner/.test(normalized)) type = "dinner";
  else {
    const hour = Number.parseInt(time, 10);
    type = Number.isNaN(hour)
      ? "lunch"
      : hour < 11 && hour >= 5
        ? "breakfast"
        : hour >= 16 && hour < 19
          ? "snack"
          : hour >= 19 || hour < 5
            ? "dinner"
            : "lunch";
  }
  return {
    image: `/images/nutrition/${type}.webp`,
    label: {
      breakfast: "Empieza tu día",
      lunch: "Recarga tu energía",
      dinner: "Cierra bien tu día",
      snack: "Una pausa para ti",
    }[type],
  };
};

export default function NutritionDiary({
  compact = false,
  onOpen,
  readOnly = false,
  dayData,
}) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(nutritionDate());
  const [expanded, setExpanded] = useState("");
  const date = compact
    ? nutritionDate()
    : readOnly
      ? dayData?.dateKey || nutritionDate()
      : selectedDate;
  const timezone = nutritionTimezone();
  const key = ["nutrition-day", user?.id || user?._id, date, timezone];
  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) =>
      api.getNutritionDay({ dateKey: date, timezone }, { signal }),
    enabled: !readOnly,
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
  const currentDay = readOnly ? dayData : query.data;
  const plan = currentDay?.plan;
  const meals = plan?.content?.meals || [];
  const doneIds = currentDay?.day?.completedMealIds || [];
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
  const dayIsFuture = date > (currentDay?.today || nutritionDate());
  const completion = meals.length ? completedCount / meals.length : 0;
  const changeDate = (delta) => {
    setSelectedDate(shiftNutritionDate(date, delta));
    setExpanded("");
    mutation.reset();
  };
  return (
    <section
      aria-label={
        readOnly
          ? "Alimentación del alumno"
          : compact
            ? "Comidas de hoy"
            : "Mi alimentación"
      }
      className={`diet-plan ${compact ? "diet-plan--compact" : ""}`}
    >
      <header className="diet-plan__header">
        <div>
          {!compact && (
            <span className="diet-plan__eyebrow">
              {readOnly ? "VISTA DEL ALUMNO" : "TU PLAN, A TU RITMO"}
            </span>
          )}
          <h2>
            {compact
              ? "Comidas de hoy"
              : readOnly
                ? "Plan de comidas"
                : "Tu plan de comidas"}
          </h2>
          {compact && plan && (
            <p
              className="diet-plan__compact-progress"
              role="progressbar"
              aria-label="Comidas completadas"
              aria-valuenow={completedCount}
              aria-valuemin={0}
              aria-valuemax={meals.length}
            >
              {completedCount}/{meals.length}
            </p>
          )}
        </div>
        {compact ? (
          <button
            type="button"
            onClick={onOpen}
            className="diet-plan__open"
            aria-label="Ver plan"
            title="Ver plan"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        ) : readOnly ? (
          <span className="diet-plan__period">
            {dayIsFuture ? `Desde ${titleDate}` : titleDate}
          </span>
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
      {!readOnly && query.isPending ? (
        <div role="status" className="diet-plan__state">
          <LoaderCircle size={21} className="animate-spin" /> Cargando tus
          comidas...
        </div>
      ) : !readOnly && query.isError ? (
        <div role="alert" className="diet-plan__state diet-plan__state--error">
          <p>No pudimos cargar tu alimentación. {query.error.message}</p>
          <button type="button" onClick={() => query.refetch()}>
            Reintentar alimentación
          </button>
        </div>
      ) : !plan ? (
        <div className="diet-plan__empty">
          {!compact && <h3>Tu próximo paso empieza aquí</h3>}
          <p>
            {dayIsFuture
              ? "Todavía no tienes comidas asignadas para este día."
              : "Tu coach aún no ha asignado un plan de alimentación para este día."}
          </p>
        </div>
      ) : (
        <>
          {!compact && (
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
                    <strong>
                      {completedCount}
                      <small>/{meals.length}</small>
                    </strong>
                    <span>comidas</span>
                  </div>
                </div>
                <div className="diet-plan__energy-copy">
                  <span>
                    {readOnly ? "ENERGÍA DEL PLAN" : "ENERGÍA DE TU PLAN"}
                  </span>
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
          )}
          {!compact && (
            <div className="diet-plan__section-title">
              <div>
                <h3>Tus comidas</h3>
                <p>
                  {readOnly
                    ? "Comidas registradas por el alumno."
                    : "Marca cada comida cuando la completes."}
                </p>
              </div>
              <span>{meals.length} comidas</span>
            </div>
          )}
          <div className="diet-plan__meals">
            {meals.map((meal) => {
              const done = doneIds.includes(meal.mealId);
              const open = expanded === meal.mealId;
              const mealCalories = nutrientTotal(meal.foods, "calories");
              const { image, label } = mealAppearance(meal.name, meal.time);
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
                    <img
                      className="diet-meal__photo"
                      src={image}
                      alt={meal.name}
                      width={56}
                      height={56}
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="diet-meal__heading">
                      {compact ? (
                        <button
                          type="button"
                          className="diet-meal__compact-toggle"
                          aria-label={`Ver alimentos de ${meal.name}`}
                          aria-expanded={open}
                          aria-controls={`diet-meal-${meal.mealId}`}
                          onClick={() => setExpanded(open ? "" : meal.mealId)}
                        >
                          <span>
                            <strong>{meal.name}</strong>
                          </span>
                          <ChevronDown
                            size={13}
                            className={open ? "is-expanded" : ""}
                          />
                        </button>
                      ) : (
                        <>
                          <div>
                            <h3>{meal.name}</h3>
                            {meal.time && <time>{meal.time}</time>}
                          </div>
                          <p>{done ? "Comida completada" : label}</p>
                        </>
                      )}
                    </div>
                    {readOnly ? (
                      <span
                        role="img"
                        aria-label={`${done ? "Completada" : "Pendiente"}: ${meal.name}`}
                        className={`diet-meal__status ${done ? "is-complete" : ""}`}
                      >
                        {done && <Check size={21} strokeWidth={2.5} />}
                      </span>
                    ) : (
                      <button
                        type="button"
                        aria-pressed={done}
                        aria-label={`${done ? "Desmarcar" : "Completar"} ${meal.name}`}
                        disabled={
                          !currentDay?.canComplete || mutation.isPending
                        }
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
                    )}
                  </div>
                  {!compact && (
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
                  )}
                  {open && (
                    <div
                      id={`diet-meal-${meal.mealId}`}
                      className="diet-meal__details"
                    >
                      <ul>
                        {meal.foods.map((food, foodIndex) => (
                          <li key={foodIndex}>
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
                {readOnly
                  ? "Indicaciones del plan"
                  : "Indicaciones de tu coach"}
              </span>
              <p>{plan.content.notes}</p>
            </aside>
          )}
          {!compact && (
            <footer className="diet-plan__footer">
              <span>{plan.content.name}</span>
              <p>
                {readOnly
                  ? "El cumplimiento se actualiza con los registros del alumno."
                  : completion === 1
                    ? "¡Listo por hoy! Cada comida cuenta."
                    : "Tu constancia se construye una comida a la vez."}
              </p>
            </footer>
          )}
          {dayIsFuture && !readOnly && (
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
