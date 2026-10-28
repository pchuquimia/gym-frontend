import { useEffect, useState } from "react";
import { ChevronRight, LoaderCircle, Search, SearchX } from "lucide-react";
import { api } from "../../services/api";
import { displayNutrient, foodEmoji } from "./foodPresentation";

const weightPattern =
  /\d+(?:[.,]\d+)?\s*(?:kilogramos?|kilos?|kg|gramos?|grs?|g)\b/i;

export default function FoodMacroLookup({ label, onApply, autoFocus = false }) {
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [demo, setDemo] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (input.trim().length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      // The catalog returns values for a weight. A plain food search starts at
      // 100 g; the coach chooses the final amount before adding the food.
      const countSearch = input.trim().match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
      const query = weightPattern.test(input)
        ? input.trim()
        : `100 g de ${countSearch ? countSearch[2] : input.trim()}`;
      try {
        const data = await api.searchFoodNutrition(query, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setResults(data.foods || []);
        setDemo(Boolean(data.demo));
        setSearched(true);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message || "No se pudo consultar el alimento");
          setSearched(false);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [input, retry]);
  const apply = (food) => {
    const countSearch =
      !weightPattern.test(input) &&
      input.trim().match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
    onApply({
      name: food.name,
      quantity: food.quantity,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      nutritionSource: food.nutritionSource,
      ...(countSearch ? { requestedCount: countSearch[1] } : {}),
    });
    setInput("");
    setResults([]);
    setSearched(false);
    setLoading(false);
    setError("");
  };
  return (
    <div className="nutrition-food-search">
      <label className="nutrition-search-input">
        <Search size={20} aria-hidden="true" />
        <input
          aria-label={`Buscar macros · ${label}`}
          autoFocus={autoFocus}
          value={input}
          maxLength={180}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
          placeholder="Buscar un alimento"
          onChange={(event) => {
            setInput(event.target.value);
            setResults([]);
            setError("");
            setSearched(false);
            setLoading(false);
          }}
        />
      </label>
      {loading && (
        <p role="status" className="nutrition-search-status">
          <LoaderCircle className="animate-spin" size={17} />
          Buscando alimentos…
        </p>
      )}
      {error && (
        <div role="alert" className="nutrition-search-error">
          <p>{error}</p>
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            Reintentar búsqueda
          </button>
        </div>
      )}
      {searched && !results.length && (
        <p className="nutrition-empty-search">
          <SearchX size={27} />
          No encontramos este alimento. Prueba otro nombre o crea un alimento.
        </p>
      )}
      {results.length > 0 && (
        <div className="nutrition-search-results">
          <p className="nutrition-search-caption">
            Selecciona un alimento para indicar el peso o la cantidad de
            unidades. Revisa la preparación: crudo y cocido tienen valores
            diferentes.
          </p>
          {results.map((food) => (
            <button
              type="button"
              key={food.foodId}
              onClick={() => apply(food)}
              className="nutrition-search-result"
            >
              <span className="nutrition-food-emoji" aria-hidden="true">
                {foodEmoji(food.name)}
              </span>
              <span className="nutrition-result-copy">
                <strong>{food.name}</strong>
                <small>
                  {food.quantity} · {displayNutrient(food.calories)} kcal
                </small>
                {food.description && <small>{food.description}</small>}
                <small>Elegir cantidad</small>
              </span>
              <ChevronRight size={19} aria-hidden="true" />
            </button>
          ))}
          <p className="nutrition-search-attribution">
            USDA FoodData Central{demo ? " · Acceso de prueba limitado" : ""}
          </p>
        </div>
      )}
      {!input && (
        <p className="nutrition-empty-search">
          <Search size={29} />
          Busca por nombre, por ejemplo, «huevo». Selecciona un resultado para
          elegir la cantidad antes de agregarlo.
        </p>
      )}
    </div>
  );
}
