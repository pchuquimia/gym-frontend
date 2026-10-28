import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import FoodEditorDialog from "./FoodEditorDialog";
import NutritionDialog from "./NutritionDialog";
import {
  NUTRIENTS,
  nutritionDate,
  nutritionSummary,
  nutrientTotal,
} from "./nutritionUtils";
import { displayNutrient, foodEmoji } from "./foodPresentation";
import "./nutritionEditor.css";

const mealNames = [
  "Desayuno",
  "Almuerzo",
  "Cena",
  "Merienda",
  "Media mañana",
  "Snack",
  "Colación",
  "Comida extra",
];
const blankMeal = (name) => ({
  mealId: crypto.randomUUID(),
  name,
  time: "",
  notes: "",
  foods: [],
});

function MealSettings({
  meal,
  index,
  count,
  onSave,
  onDelete,
  onMove,
  onClose,
}) {
  const [draft, setDraft] = useState(meal);
  return (
    <NutritionDialog
      title="Editar comida"
      description={meal.name}
      onClose={onClose}
    >
      <form
        className="nutrition-food-form"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onSave(draft);
        }}
      >
        <div className="nutrition-dialog-body">
          <label className="nutrition-label">
            Nombre de la comida
            <input
              required
              pattern={String.raw`.*\S.*`}
              maxLength={80}
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />
          </label>
          <label className="nutrition-label">
            Hora (opcional)
            <input
              type="time"
              value={draft.time || ""}
              onChange={(event) =>
                setDraft({ ...draft, time: event.target.value })
              }
            />
          </label>
          <label className="nutrition-label">
            Indicaciones
            <textarea
              rows={3}
              maxLength={1000}
              value={draft.notes || ""}
              placeholder="Preparación o alternativas"
              onChange={(event) =>
                setDraft({ ...draft, notes: event.target.value })
              }
            />
          </label>
          <div className="nutrition-meal-settings-actions">
            <button
              type="button"
              className="nutrition-text-button"
              disabled={index === 0}
              onClick={(event) => {
                if (event.currentTarget.form.reportValidity())
                  onMove(index - 1, draft);
              }}
            >
              <ArrowUp size={17} />
              Subir comida
            </button>
            <button
              type="button"
              className="nutrition-text-button"
              disabled={index === count - 1}
              onClick={(event) => {
                if (event.currentTarget.form.reportValidity())
                  onMove(index + 1, draft);
              }}
            >
              <ArrowDown size={17} />
              Bajar comida
            </button>
            <button
              type="button"
              className="nutrition-text-button nutrition-delete"
              disabled={count === 1}
              onClick={onDelete}
            >
              <Trash2 size={17} />
              Eliminar comida
            </button>
          </div>
        </div>
        <footer className="nutrition-dialog-footer">
          <button type="submit" className="nutrition-primary-button">
            Guardar comida
          </button>
        </footer>
      </form>
    </NutritionDialog>
  );
}

export default function NutritionPlanEditor({
  initialPlan,
  athleteName,
  onSave,
  onCancel,
  saving,
  error,
  hasDailyRecord,
}) {
  const [form, setForm] = useState(() => ({
    name: initialPlan?.content?.name || "Plan de alimentación",
    startsOn:
      initialPlan?.startsOn > nutritionDate()
        ? initialPlan.startsOn
        : nutritionDate(),
    notes: initialPlan?.content?.notes || "",
    meals: initialPlan?.content?.meals?.map((meal) => ({
      ...meal,
      foods: meal.foods
        .filter((food) => food.name?.trim())
        .map((food) => ({
          ...food,
          ...Object.fromEntries(
            NUTRIENTS.map(({ key }) => [key, food[key] ?? ""]),
          ),
        })),
    })) || [blankMeal("Desayuno"), blankMeal("Almuerzo"), blankMeal("Cena")],
  }));
  const [foodDialog, setFoodDialog] = useState(null);
  const [mealDialog, setMealDialog] = useState(null);
  const [validation, setValidation] = useState("");
  const mealButtons = useRef(new Map());
  const summary = nutritionSummary(form.meals);
  const macroEnergy = form.meals
    .flatMap((meal) => meal.foods)
    .reduce(
      (total, food) =>
        total +
        Number(food.protein || 0) * 4 +
        Number(food.carbs || 0) * 4 +
        Number(food.fat || 0) * 9,
      0,
    );
  const hasFoods = form.meals.some((meal) => meal.foods.length);
  const hasMissingMacros =
    hasFoods && summary.some(({ planned }) => planned === null);
  const setMeal = (index, patch) =>
    setForm((previous) => ({
      ...previous,
      meals: previous.meals.map((meal, i) =>
        i === index ? { ...meal, ...patch } : meal,
      ),
    }));
  const closeFood = () => setFoodDialog(null);
  const saveFood = (food) => {
    const meal = form.meals[foodDialog.mealIndex];
    const foods = [...meal.foods];
    if (foodDialog.foodIndex == null) foods.push(food);
    else foods[foodDialog.foodIndex] = food;
    setMeal(foodDialog.mealIndex, { foods });
    setValidation("");
    closeFood();
  };
  const moveMeal = (from, to, draft) => {
    setForm((previous) => {
      const meals = [...previous.meals];
      meals[from] = draft;
      [meals[from], meals[to]] = [meals[to], meals[from]];
      return { ...previous, meals };
    });
    setMealDialog(null);
  };
  const submit = (event) => {
    event.preventDefault();
    const empty = form.meals.find((meal) => !meal.foods.length);
    if (empty) {
      setValidation(
        `Agrega al menos un alimento a ${empty.name} antes de asignar el plan.`,
      );
      mealButtons.current.get(empty.mealId)?.focus();
      return;
    }
    setValidation("");
    onSave({
      ...form,
      name: form.name.trim(),
      meals: form.meals.map((meal) => ({
        ...meal,
        name: meal.name.trim(),
        foods: meal.foods.map((food) => ({
          ...food,
          ...Object.fromEntries(
            NUTRIENTS.map(({ key }) => [
              key,
              food[key] === "" ? null : Number(food[key]),
            ]),
          ),
        })),
      })),
    });
  };
  const recentFoods = [
    ...new Map(
      form.meals.flatMap((meal) => meal.foods).map((food) => [food.name, food]),
    ).values(),
  ];
  return (
    <>
      <form
        onSubmit={submit}
        className="nutrition-editor"
        aria-label="Editor de alimentación"
      >
        <header className="nutrition-editor-header">
          <button
            type="button"
            className="nutrition-icon-button"
            aria-label="Volver a alimentación"
            disabled={saving}
            onClick={onCancel}
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <p>{athleteName || "Alimentación"}</p>
            <h1>Plan de comidas</h1>
          </div>
          <span className="nutrition-editor-badge">
            {initialPlan ? "Editando" : "Nuevo plan"}
          </span>
        </header>
        <fieldset disabled={saving} className="nutrition-editor-content">
          <section
            className="nutrition-plan-summary"
            aria-label="Resumen del plan"
          >
            <div className="nutrition-calorie-total">
              <strong>
                {hasFoods ? displayNutrient(summary[0].planned) : "0"}
              </strong>
              <span>kcal al día</span>
            </div>
            <div className="nutrition-summary-macros">
              {summary.slice(1).map(({ key, label, planned }) => {
                const percent =
                  macroEnergy && planned != null
                    ? Math.min(
                        100,
                        ((planned * (key === "fat" ? 9 : 4)) / macroEnergy) *
                          100,
                      )
                    : 0;
                return (
                  <div key={key}>
                    <div>
                      <span>{key === "carbs" ? "Carbs" : label}</span>
                      <strong>
                        {hasFoods ? displayNutrient(planned) : "0"}
                        <small> g</small>
                      </strong>
                    </div>
                    <div className="nutrition-macro-track" aria-hidden="true">
                      <span style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          {hasMissingMacros && (
            <p className="nutrition-incomplete-macros">
              Hay alimentos sin macros. El total se mostrará cuando estén
              completos.
            </p>
          )}
          <details className="nutrition-plan-details">
            <summary>
              <Settings2 size={17} />
              <span>Detalles del plan</span>
              <span className="nutrition-plan-date">
                Desde{" "}
                {new Intl.DateTimeFormat("es", {
                  day: "numeric",
                  month: "short",
                }).format(
                  new Date(`${form.startsOn || nutritionDate()}T12:00:00`),
                )}
              </span>
              <ChevronDown size={16} />
            </summary>
            <div className="nutrition-details-fields">
              <label className="nutrition-label">
                Nombre del plan
                <input
                  required
                  pattern={String.raw`.*\S.*`}
                  onInvalid={(event) => {
                    event.currentTarget.closest("details").open = true;
                  }}
                  maxLength={120}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                />
              </label>
              <label className="nutrition-label">
                Disponible desde
                <input
                  required
                  type="date"
                  value={form.startsOn}
                  onChange={(event) =>
                    setForm({ ...form, startsOn: event.target.value })
                  }
                />
              </label>
              <label className="nutrition-label nutrition-wide-field">
                Indicaciones generales
                <textarea
                  rows={2}
                  maxLength={2000}
                  placeholder="Agrega una indicación para tu alumno"
                  value={form.notes}
                  onChange={(event) =>
                    setForm({ ...form, notes: event.target.value })
                  }
                />
              </label>
            </div>
          </details>
          {hasDailyRecord && (
            <p className="nutrition-version-note">
              El registro de hoy conservará su plan actual. Los cambios se
              aplicarán a los días sin registro.
            </p>
          )}
          <div className="nutrition-meals">
            {form.meals.map((meal, mealIndex) => (
              <section
                className="nutrition-meal"
                key={meal.mealId}
                aria-label={meal.name}
              >
                <header className="nutrition-meal-header">
                  <div>
                    <h2>{meal.name}</h2>
                    {meal.time && <span>{meal.time}</span>}
                  </div>
                  <div>
                    <span className="nutrition-meal-calories">
                      {meal.foods.length
                        ? displayNutrient(nutrientTotal(meal.foods, "calories"))
                        : "0"}{" "}
                      kcal
                    </span>
                    <button
                      type="button"
                      className="nutrition-icon-button"
                      aria-label={`Editar ${meal.name}`}
                      onClick={() => setMealDialog(mealIndex)}
                    >
                      <MoreHorizontal size={21} />
                    </button>
                  </div>
                </header>
                <div className="nutrition-food-list">
                  {meal.foods.map((food, foodIndex) => (
                    <button
                      type="button"
                      key={foodIndex}
                      className="nutrition-food-row"
                      aria-label={`Editar ${food.name} de ${meal.name}`}
                      onClick={() => setFoodDialog({ mealIndex, foodIndex })}
                    >
                      <span className="nutrition-food-emoji" aria-hidden="true">
                        {foodEmoji(food.name)}
                      </span>
                      <span className="nutrition-food-name">{food.name}</span>
                      <span className="nutrition-food-amount">
                        <strong>{food.quantity}</strong>
                        <small>{displayNutrient(food.calories)} kcal</small>
                      </span>
                      <ChevronRight
                        size={16}
                        className="nutrition-food-chevron"
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  ref={(node) => {
                    if (node) mealButtons.current.set(meal.mealId, node);
                    else mealButtons.current.delete(meal.mealId);
                  }}
                  disabled={meal.foods.length >= 30}
                  className="nutrition-add-food"
                  onClick={() => setFoodDialog({ mealIndex, foodIndex: null })}
                  aria-label={`Agregar alimento a ${meal.name}`}
                >
                  <Plus size={19} />
                  <span>Agregar alimento</span>
                </button>
                {meal.notes && (
                  <p className="nutrition-meal-note">{meal.notes}</p>
                )}
              </section>
            ))}
          </div>
          <button
            type="button"
            className="nutrition-add-meal"
            disabled={form.meals.length >= 8}
            onClick={() => {
              const name =
                mealNames.find(
                  (candidate) =>
                    !form.meals.some((meal) => meal.name === candidate),
                ) || `Comida ${form.meals.length + 1}`;
              setForm((previous) => ({
                ...previous,
                meals: [...previous.meals, blankMeal(name)],
              }));
            }}
          >
            <Plus size={18} />
            Agregar comida
          </button>
          <p className="nutrition-plan-repeats">
            Este plan se repite cada día desde la fecha indicada.
          </p>
        </fieldset>
        {(validation || error) && (
          <p role="alert" className="nutrition-plan-error">
            {validation || error}
          </p>
        )}
        <footer className="nutrition-editor-footer">
          <button
            type="button"
            className="nutrition-cancel-button"
            disabled={saving}
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="nutrition-primary-button"
            disabled={saving}
          >
            {saving ? "Guardando…" : "Guardar y asignar dieta"}
          </button>
        </footer>
      </form>
      {foodDialog && (
        <FoodEditorDialog
          key={`${form.meals[foodDialog.mealIndex].mealId}-${foodDialog.foodIndex ?? "new"}`}
          mealName={form.meals[foodDialog.mealIndex].name}
          initialFood={
            foodDialog.foodIndex == null
              ? null
              : form.meals[foodDialog.mealIndex].foods[foodDialog.foodIndex]
          }
          recentFoods={recentFoods}
          onClose={closeFood}
          onConfirm={saveFood}
          onDelete={
            foodDialog.foodIndex == null
              ? null
              : () => {
                  setMeal(foodDialog.mealIndex, {
                    foods: form.meals[foodDialog.mealIndex].foods.filter(
                      (_, index) => index !== foodDialog.foodIndex,
                    ),
                  });
                  closeFood();
                }
          }
        />
      )}
      {mealDialog != null && (
        <MealSettings
          meal={form.meals[mealDialog]}
          index={mealDialog}
          count={form.meals.length}
          onClose={() => setMealDialog(null)}
          onSave={(meal) => {
            setMeal(mealDialog, meal);
            setMealDialog(null);
          }}
          onDelete={() => {
            setForm((previous) => ({
              ...previous,
              meals: previous.meals.filter((_, index) => index !== mealDialog),
            }));
            setMealDialog(null);
          }}
          onMove={(to, draft) => moveMeal(mealDialog, to, draft)}
        />
      )}
    </>
  );
}
