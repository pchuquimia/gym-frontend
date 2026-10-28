import { useState } from "react";
import { ArrowLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import NutritionDialog from "./NutritionDialog";
import FoodMacroLookup from "./FoodMacroLookup";
import { scaleFoodQuantity } from "./foodQuantity";
import { NUTRIENTS } from "./nutritionUtils";
import {
  blankNutritionFood,
  displayNutrient,
  foodEmoji,
} from "./foodPresentation";

export default function FoodEditorDialog({
  mealName,
  initialFood,
  recentFoods,
  onConfirm,
  onDelete,
  onClose,
}) {
  const [draft, setDraft] = useState(() => ({
    ...blankNutritionFood(),
    ...initialFood,
  }));
  const [view, setView] = useState(initialFood ? "detail" : "search");
  const [tab, setTab] = useState("search");
  const selectFood = (food) => {
    setDraft({ ...blankNutritionFood(), ...food });
    setView("detail");
  };
  const manual = () => {
    setDraft(blankNutritionFood());
    setView("detail");
  };
  const submit = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onConfirm({
      ...draft,
      name: draft.name.trim(),
      quantity: draft.quantity.trim(),
    });
  };
  return (
    <NutritionDialog
      title={
        view === "search"
          ? "Agregar alimento"
          : initialFood
            ? "Editar alimento"
            : "Cantidad del alimento"
      }
      description={mealName}
      onClose={onClose}
    >
      {view === "search" ? (
        <div className="nutrition-dialog-body">
          <div
            className="nutrition-search-tabs"
            role="group"
            aria-label="Origen del alimento"
          >
            <button
              type="button"
              aria-pressed={tab === "search"}
              aria-controls="food-search-panel"
              id="food-search-tab"
              onClick={() => setTab("search")}
            >
              Buscar
            </button>
            <button
              type="button"
              aria-pressed={tab === "recent"}
              aria-controls="food-recent-panel"
              id="food-recent-tab"
              onClick={() => setTab("recent")}
            >
              En este plan
            </button>
          </div>
          {tab === "search" ? (
            <div id="food-search-panel" aria-labelledby="food-search-tab">
              <FoodMacroLookup
                label={mealName}
                onApply={selectFood}
                autoFocus
              />
            </div>
          ) : (
            <div
              id="food-recent-panel"
              aria-labelledby="food-recent-tab"
              className="nutrition-recent-foods"
            >
              {recentFoods.length ? (
                recentFoods.map((food, index) => (
                  <button
                    type="button"
                    className="nutrition-search-result"
                    key={index}
                    onClick={() => selectFood(food)}
                  >
                    <span className="nutrition-food-emoji" aria-hidden="true">
                      {foodEmoji(food.name)}
                    </span>
                    <span className="nutrition-result-copy">
                      <strong>{food.name}</strong>
                      <small>
                        {food.quantity} · {displayNutrient(food.calories)} kcal
                      </small>
                    </span>
                    <Plus size={19} />
                  </button>
                ))
              ) : (
                <p className="nutrition-empty-search">
                  Los alimentos que agregues al plan aparecerán aquí para volver
                  a utilizarlos.
                </p>
              )}
            </div>
          )}
          <button
            type="button"
            className="nutrition-create-food"
            onClick={manual}
          >
            <span className="nutrition-create-icon">
              <Pencil size={18} />
            </span>
            <span>
              <strong>Crear alimento</strong>
              <small>Agregar una preparación o sus valores manualmente</small>
            </span>
            <ChevronRight size={18} />
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="nutrition-food-form">
          <div className="nutrition-dialog-body">
            {!initialFood && (
              <button
                type="button"
                className="nutrition-text-button"
                onClick={() => setView("search")}
              >
                <ArrowLeft size={16} />
                Volver a buscar
              </button>
            )}
            <div className="nutrition-selected-food">
              <span aria-hidden="true">{foodEmoji(draft.name)}</span>
              <div>
                <strong>{draft.name || "Nuevo alimento"}</strong>
                <small>
                  {draft.nutritionSource
                    ? "Información nutricional de USDA"
                    : "Alimento personalizado"}
                </small>
              </div>
            </div>
            {!draft.nutritionSource && (
              <label className="nutrition-label">
                Nombre del alimento
                <input
                  required
                  pattern={String.raw`.*\S.*`}
                  autoFocus={!draft.name}
                  maxLength={120}
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                />
              </label>
            )}
            <label className="nutrition-label nutrition-quantity-label">
              Cantidad
              <input
                autoFocus={Boolean(draft.name)}
                required
                maxLength={100}
                value={draft.quantity}
                placeholder={
                  draft.nutritionSource ? "200 g" : "Ej. 1 porción o 200 g"
                }
                pattern={
                  draft.nutritionSource?.grams === null
                    ? "(?!)"
                    : String.raw`.*\S.*`
                }
                title={
                  draft.nutritionSource
                    ? "Indica una cantidad entre 0,1 y 5000 g, en gramos o kilogramos"
                    : undefined
                }
                onChange={(event) =>
                  setDraft((previous) => ({
                    ...previous,
                    ...scaleFoodQuantity(previous, event.target.value),
                  }))
                }
              />
            </label>
            <div
              className="nutrition-food-macros"
              aria-label="Macros de la cantidad indicada"
              aria-live="polite"
            >
              {NUTRIENTS.map(({ key, label, unit }) => (
                <div key={key}>
                  <strong>
                    {displayNutrient(draft[key])}
                    <small>{unit}</small>
                  </strong>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            {draft.nutritionSource && (
              <p className="nutrition-quantity-hint">
                {draft.nutritionSource.grams == null
                  ? "Escribe una cantidad válida en g o kg para recalcular."
                  : `Macros calculados para ${displayNutrient(draft.nutritionSource.grams)} g.`}
              </p>
            )}
            <details
              className="nutrition-macro-details"
              open={!draft.nutritionSource || undefined}
            >
              <summary>Editar calorías y macros</summary>
              <p>Valores para la cantidad indicada.</p>
              <div className="nutrition-macro-fields">
                {NUTRIENTS.map(({ key, label, unit }) => (
                  <label className="nutrition-label" key={key}>
                    {label} ({unit})
                    <input
                      aria-label={label}
                      type="number"
                      min={0}
                      max={10000}
                      step="0.01"
                      value={draft[key] ?? ""}
                      onChange={(event) =>
                        setDraft((previous) => ({
                          ...previous,
                          [key]: event.target.value,
                          nutritionSource: null,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </details>
            {draft.nutritionSource && (
              <a
                className="nutrition-source-link"
                href={`https://fdc.nal.usda.gov/food-details/${draft.nutritionSource.foodId}/nutrients`}
                target="_blank"
                rel="noreferrer"
              >
                Ver información del alimento en USDA
              </a>
            )}
          </div>
          <footer className="nutrition-dialog-footer">
            {onDelete && (
              <button
                type="button"
                className="nutrition-icon-button nutrition-delete"
                aria-label="Eliminar alimento"
                onClick={onDelete}
              >
                <Trash2 size={20} />
              </button>
            )}
            <button className="nutrition-primary-button" type="submit">
              {initialFood ? "Guardar cambios" : `Agregar a ${mealName}`}
            </button>
          </footer>
        </form>
      )}
    </NutritionDialog>
  );
}
