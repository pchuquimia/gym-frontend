import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import NutritionDialog from "./NutritionDialog";
import FoodMacroLookup from "./FoodMacroLookup";
import { scaleFoodPortion, scaleFoodQuantity } from "./foodQuantity";
import { api } from "../../services/api";
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
  const [portions, setPortions] = useState([]);
  const [portionsLoading, setPortionsLoading] = useState(
    Boolean(initialFood?.nutritionSource),
  );
  const [portionsError, setPortionsError] = useState("");
  const [portionsRetry, setPortionsRetry] = useState(0);
  const [requestedCount, setRequestedCount] = useState(null);
  const [count, setCount] = useState(
    String(initialFood?.nutritionSource?.portion?.amount || 1),
  );
  const foodId = draft.nutritionSource?.foodId;
  useEffect(() => {
    if (!foodId) return;
    const controller = new AbortController();
    api
      .getFoodPortions(foodId, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        const options = data.portions || [];
        setPortions(options);
        if (requestedCount && options.length) {
          const portion = options.find((item) =>
            /grande|large/i.test(item.label),
          );
          setCount(requestedCount);
          if (portion)
            setDraft((previous) => ({
              ...previous,
              ...scaleFoodPortion(previous, requestedCount, portion),
            }));
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setPortionsError(
            error.message || "No se pudieron cargar las medidas",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setPortionsLoading(false);
      });
    return () => controller.abort();
  }, [foodId, portionsRetry, requestedCount]);
  const selectFood = ({ requestedCount: nextCount, ...food }) => {
    setPortions([]);
    setPortionsError("");
    setPortionsLoading(Boolean(food.nutritionSource));
    setPortionsRetry((value) => value + 1);
    setRequestedCount(nextCount || null);
    setCount(String(food.nutritionSource?.portion?.amount || 1));
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
    if (
      draft.nutritionSource &&
      (draft.nutritionSource.grams == null ||
        (requestedCount && !draft.nutritionSource.portion))
    )
      return;
    onConfirm({
      ...draft,
      name: draft.name.trim(),
      quantity: draft.quantity.trim(),
    });
  };
  const selectedPortion = draft.nutritionSource?.portion;
  const measureKey = (portion) => `${portion.gramWeight}:${portion.label}`;
  const availablePortions =
    selectedPortion &&
    !portions.some((item) => measureKey(item) === measureKey(selectedPortion))
      ? [selectedPortion, ...portions]
      : portions;
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
                      <small>Elegir cantidad</small>
                    </span>
                    <ChevronRight size={19} aria-hidden="true" />
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
            {draft.nutritionSource && (
              <>
                <label className="nutrition-label">
                  Medida
                  <select
                    aria-label="Medida del alimento"
                    value={
                      selectedPortion ? measureKey(selectedPortion) : "weight"
                    }
                    onChange={(event) => {
                      const portion = availablePortions.find(
                        (item) => measureKey(item) === event.target.value,
                      );
                      setRequestedCount(null);
                      setDraft((previous) => ({
                        ...previous,
                        ...(portion
                          ? scaleFoodPortion(previous, count, portion)
                          : scaleFoodQuantity(
                              previous,
                              `${previous.nutritionSource.grams || 100} g`,
                            )),
                      }));
                    }}
                  >
                    <option value="weight">Peso en g o kg</option>
                    {availablePortions.map((portion) => (
                      <option
                        key={measureKey(portion)}
                        value={measureKey(portion)}
                      >
                        Unidad / porción: {portion.label} (
                        {displayNutrient(portion.gramWeight)} g)
                      </option>
                    ))}
                  </select>
                </label>
                {portionsLoading && (
                  <p role="status" className="nutrition-quantity-hint">
                    Cargando unidades y porciones…
                  </p>
                )}
                {requestedCount && !selectedPortion && (
                  <p className="nutrition-quantity-hint">
                    Buscaste {requestedCount} unidades. Elige una medida para
                    aplicar esa cantidad.{" "}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => setRequestedCount(null)}
                    >
                      Introducir peso en su lugar
                    </button>
                  </p>
                )}
                {portionsError && (
                  <p role="alert" className="nutrition-quantity-hint">
                    {portionsError}{" "}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => {
                        setPortionsError("");
                        setPortionsLoading(true);
                        setPortionsRetry((value) => value + 1);
                      }}
                    >
                      Reintentar medidas
                    </button>
                  </p>
                )}
                {!portionsLoading &&
                  !portionsError &&
                  !availablePortions.length && (
                    <p className="nutrition-quantity-hint">
                      Este alimento no tiene medidas por unidad en el catálogo.
                      Puedes usar su peso o crear un alimento con una cantidad
                      como «5 huevos» y macros opcionales.
                    </p>
                  )}
              </>
            )}
            <label className="nutrition-label nutrition-quantity-label">
              Cantidad
              <input
                autoFocus={Boolean(draft.name)}
                required
                maxLength={100}
                type={selectedPortion ? "number" : "text"}
                min={selectedPortion ? 0.001 : undefined}
                max={
                  selectedPortion
                    ? Math.min(50000, 5000 / selectedPortion.gramWeight)
                    : undefined
                }
                step={selectedPortion ? "any" : undefined}
                value={selectedPortion ? count : draft.quantity}
                aria-describedby={
                  draft.nutritionSource ? "food-quantity-hint" : undefined
                }
                placeholder={
                  selectedPortion
                    ? "Ej. 5"
                    : draft.nutritionSource
                      ? "200 g"
                      : "Ej. 5 huevos, 1 porción o 200 g"
                }
                pattern={
                  draft.nutritionSource?.grams === null
                    ? "(?!)"
                    : String.raw`.*\S.*`
                }
                title={
                  selectedPortion
                    ? "Indica cuántas unidades o porciones quieres agregar"
                    : draft.nutritionSource
                      ? "Indica una cantidad entre 0,1 y 5000 g, en gramos o kilogramos"
                      : undefined
                }
                onChange={(event) => {
                  if (selectedPortion) setCount(event.target.value);
                  setDraft((previous) => ({
                    ...previous,
                    ...(selectedPortion
                      ? scaleFoodPortion(
                          previous,
                          event.target.value,
                          selectedPortion,
                        )
                      : scaleFoodQuantity(previous, event.target.value)),
                  }));
                }}
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
              <p id="food-quantity-hint" className="nutrition-quantity-hint">
                {selectedPortion
                  ? `${count || "0"} × ${selectedPortion.label}. Los macros se calculan para esta cantidad.`
                  : draft.nutritionSource.grams == null
                    ? "Escribe una cantidad válida en g o kg para recalcular."
                    : `Macros calculados para ${displayNutrient(draft.nutritionSource.grams)} g.`}
                {!selectedPortion &&
                  " Puedes cambiar el peso o elegir una unidad en Medida."}
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
            <button
              className="nutrition-primary-button"
              type="submit"
              disabled={Boolean(
                draft.nutritionSource &&
                (draft.nutritionSource.grams == null ||
                  (requestedCount && !selectedPortion)),
              )}
            >
              {initialFood ? "Guardar cambios" : `Agregar a ${mealName}`}
            </button>
          </footer>
        </form>
      )}
    </NutritionDialog>
  );
}
