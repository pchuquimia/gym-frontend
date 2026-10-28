import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import FoodMacroLookup from "./FoodMacroLookup";
import { scaleFoodQuantity, clearFoodSource } from "./foodQuantity";
import { NUTRIENTS, nutritionDate } from "./nutritionUtils";

const blankFood = () => ({
  name: "",
  quantity: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
});
const blankMeal = (name) => ({
  mealId: crypto.randomUUID(),
  name,
  time: "",
  notes: "",
  foods: [blankFood()],
});
const field =
  "mt-1 min-h-11 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-base font-normal";

export default function NutritionPlanEditor({
  initialPlan,
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
      foods: meal.foods.map((food) => ({
        ...food,
        ...Object.fromEntries(
          NUTRIENTS.map(({ key }) => [key, food[key] ?? ""]),
        ),
      })),
    })) || [blankMeal("Desayuno"), blankMeal("Almuerzo"), blankMeal("Cena")],
  }));
  const setMeal = (index, patch) =>
    setForm((previous) => ({
      ...previous,
      meals: previous.meals.map((meal, i) =>
        i === index ? { ...meal, ...patch } : meal,
      ),
    }));
  const setFood = (mealIndex, foodIndex, patch) =>
    setForm((previous) => ({
      ...previous,
      meals: previous.meals.map((meal, i) =>
        i === mealIndex
          ? {
              ...meal,
              foods: meal.foods.map((food, j) =>
                j === foodIndex ? { ...food, ...patch } : food,
              ),
            }
          : meal,
      ),
    }));
  const moveMeal = (from, to) =>
    setForm((previous) => {
      const meals = [...previous.meals];
      [meals[from], meals[to]] = [meals[to], meals[from]];
      return { ...previous, meals };
    });
  const submit = (event) => {
    event.preventDefault();
    onSave({
      ...form,
      meals: form.meals.map((meal) => ({
        ...meal,
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
  return (
    <form
      onSubmit={submit}
      className="space-y-5"
      aria-label="Editor de alimentación"
    >
      <fieldset disabled={saving} className="space-y-5 disabled:opacity-60">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Nombre del plan
            <input
              className={field}
              required
              maxLength={120}
              value={form.name}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
            />
          </label>
          <label className="text-sm font-semibold">
            Disponible desde
            <input
              className={field}
              type="date"
              required
              value={form.startsOn}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  startsOn: event.target.value,
                }))
              }
            />
          </label>
        </div>
        <p className="text-sm text-[color:var(--text-muted)]">
          Estas comidas se repiten cada día desde la fecha indicada. Las
          calorías y los macros son opcionales y corresponden a la cantidad
          indicada de cada alimento.
        </p>
        {hasDailyRecord ? (
          <p className="rounded-xl border border-[color:var(--border)] p-3 text-sm">
            El alumno ya tiene un registro hoy. Conservará esa versión durante
            el día; los cambios se aplicarán a los días que todavía no tienen
            registro.
          </p>
        ) : null}
        {form.meals.map((meal, mealIndex) => (
          <section
            key={meal.mealId}
            className="space-y-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">Comida {mealIndex + 1}</h3>
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label={`Subir comida ${mealIndex + 1}`}
                  disabled={mealIndex === 0}
                  onClick={() => moveMeal(mealIndex, mealIndex - 1)}
                  className="grid h-11 w-11 place-items-center disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Bajar comida ${mealIndex + 1}`}
                  disabled={mealIndex === form.meals.length - 1}
                  onClick={() => moveMeal(mealIndex, mealIndex + 1)}
                  className="grid h-11 w-11 place-items-center disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Eliminar comida ${mealIndex + 1}`}
                  disabled={form.meals.length === 1}
                  onClick={() =>
                    setForm((previous) => ({
                      ...previous,
                      meals: previous.meals.filter((_, i) => i !== mealIndex),
                    }))
                  }
                  className="grid h-11 w-11 place-items-center text-red-500 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
              <label className="text-sm">
                Nombre de comida {mealIndex + 1}
                <input
                  required
                  maxLength={80}
                  value={meal.name}
                  onChange={(event) =>
                    setMeal(mealIndex, { name: event.target.value })
                  }
                  className={field}
                />
              </label>
              <label className="text-sm">
                Hora (opcional)
                <input
                  type="time"
                  value={meal.time}
                  onChange={(event) =>
                    setMeal(mealIndex, { time: event.target.value })
                  }
                  className={field}
                />
              </label>
            </div>
            {meal.foods.map((food, foodIndex) => (
              <div
                key={foodIndex}
                className="space-y-3 rounded-xl bg-[color:var(--surface-subtle)] p-3"
              >
                <FoodMacroLookup
                  label={`alimento ${foodIndex + 1} de ${meal.name}`}
                  source={food.nutritionSource}
                  onApply={(patch) => setFood(mealIndex, foodIndex, patch)}
                />
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)_44px]">
                  <label className="text-sm">
                    Alimento {foodIndex + 1} · {meal.name}
                    <input
                      required
                      maxLength={120}
                      value={food.name}
                      placeholder="Nombre del alimento o preparación"
                      onChange={(event) =>
                        setFood(mealIndex, foodIndex, {
                          name: event.target.value,
                          ...(food.nutritionSource ? clearFoodSource() : {}),
                        })
                      }
                      className={field}
                    />
                  </label>
                  <label className="text-sm">
                    Cantidad · alimento {foodIndex + 1} de {meal.name}
                    <input
                      required
                      maxLength={100}
                      value={food.quantity}
                      pattern={
                        food.nutritionSource?.grams === null
                          ? "(?!)"
                          : undefined
                      }
                      title={
                        food.nutritionSource
                          ? "Indica una cantidad en gramos o kilogramos"
                          : undefined
                      }
                      placeholder="Ej. 1 porción o 100 g"
                      onChange={(event) =>
                        setFood(
                          mealIndex,
                          foodIndex,
                          scaleFoodQuantity(food, event.target.value),
                        )
                      }
                      className={field}
                    />
                  </label>
                  <button
                    type="button"
                    aria-label={`Eliminar alimento ${foodIndex + 1} de ${meal.name}`}
                    disabled={meal.foods.length === 1}
                    onClick={() =>
                      setMeal(mealIndex, {
                        foods: meal.foods.filter((_, i) => i !== foodIndex),
                      })
                    }
                    className="grid h-11 w-11 self-end place-items-center text-red-500 disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <details>
                  <summary className="cursor-pointer py-2 text-xs font-semibold">
                    Calorías y macros (opcional)
                  </summary>
                  <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
                    {NUTRIENTS.map((nutrient) => (
                      <label key={nutrient.key} className="text-xs">
                        {nutrient.label} ({nutrient.unit})
                        <input
                          aria-label={`${nutrient.label} · alimento ${foodIndex + 1} de ${meal.name}`}
                          type="number"
                          min={0}
                          max={10000}
                          step="0.01"
                          value={food[nutrient.key]}
                          onChange={(event) =>
                            setFood(mealIndex, foodIndex, {
                              [nutrient.key]: event.target.value,
                              nutritionSource: null,
                            })
                          }
                          className={field}
                        />
                      </label>
                    ))}
                  </div>
                </details>
              </div>
            ))}
            <button
              type="button"
              disabled={meal.foods.length >= 30}
              onClick={() =>
                setMeal(mealIndex, { foods: [...meal.foods, blankFood()] })
              }
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              Agregar alimento a {meal.name}
            </button>
            <label className="block text-sm">
              Indicaciones de {meal.name}
              <textarea
                value={meal.notes}
                maxLength={1000}
                onChange={(event) =>
                  setMeal(mealIndex, { notes: event.target.value })
                }
                className={field}
                placeholder="Preparación, alternativas o indicaciones"
              />
            </label>
          </section>
        ))}
        <button
          type="button"
          disabled={form.meals.length >= 8}
          onClick={() =>
            setForm((previous) => ({
              ...previous,
              meals: [
                ...previous.meals,
                blankMeal(`Comida ${previous.meals.length + 1}`),
              ],
            }))
          }
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[color:var(--border)] text-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          Agregar comida · {form.meals.length}/8
        </button>
        <label className="block text-sm font-semibold">
          Indicaciones generales
          <textarea
            className={field}
            rows={3}
            maxLength={2000}
            value={form.notes}
            onChange={(event) =>
              setForm((previous) => ({
                ...previous,
                notes: event.target.value,
              }))
            }
          />
        </label>
      </fieldset>
      {error ? (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      ) : null}
      <div className="sticky bottom-20 flex gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] p-3 md:bottom-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="min-h-12 rounded-xl border border-[color:var(--border)] px-4 text-sm font-semibold"
        >
          Cancelar
        </button>
        <button
          disabled={saving}
          className="theme-accent-solid min-h-12 flex-1 rounded-xl px-4 text-sm font-semibold"
        >
          {saving ? "Guardando..." : "Guardar y asignar dieta"}
        </button>
      </div>
    </form>
  );
}
