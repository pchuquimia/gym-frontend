import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { scaleFoodQuantity } from "./foodQuantity";
import { api } from "../../services/api";

export default function FoodMacroLookup({ label, onApply, source }) {
  const [input, setInput] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [demo, setDemo] = useState(false);
  const [retry, setRetry] = useState(0);
  const calculated =
    source?.grams != null
      ? scaleFoodQuantity({ nutritionSource: source }, `${source.grams} g`)
      : null;
  useEffect(() => {
    if (input.trim().length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const data = await api.searchFoodNutrition(input.trim(), {
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
    }, 650);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [input, retry]);
  const apply = (food) => {
    onApply({
      name: food.name,
      quantity: food.quantity,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      nutritionSource: food.nutritionSource,
    });
    setInput("");
    setResults([]);
    setSearched(false);
    setLoading(false);
    setError("");
  };
  return (
    <div className="space-y-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-3">
      <label className="block text-xs font-semibold">
        Calcular desde un alimento
        <span className="relative mt-2 block">
          <Search className="absolute left-3 top-3 h-4 w-4 text-[color:var(--text-muted)]" />
          <input
            aria-label={`Buscar macros · ${label}`}
            value={input}
            maxLength={200}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
            placeholder="Ej. 200 g de pechuga de pollo"
            onChange={(event) => {
              setInput(event.target.value);
              setResults([]);
              setError("");
              setSearched(false);
              setLoading(false);
            }}
            className="h-11 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] pl-10 pr-3 text-base font-normal"
          />
        </span>
      </label>
      {loading ? (
        <p role="status" className="text-xs text-[color:var(--text-muted)]">
          Buscando alimento y calculando macros...
        </p>
      ) : null}
      {error ? (
        <div role="alert" className="text-xs text-red-500">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
            className="min-h-11 font-semibold underline"
          >
            Reintentar búsqueda
          </button>
        </div>
      ) : null}
      {searched && !results.length ? (
        <p className="text-xs text-[color:var(--text-muted)]">
          No encontramos una ficha completa. Prueba otro nombre o ingresa los
          valores manualmente.
        </p>
      ) : null}
      {results.length ? (
        <div className="space-y-2">
          <p className="text-xs text-[color:var(--text-muted)]">
            Selecciona la preparación correcta. Crudo y cocido tienen valores
            diferentes.
          </p>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {results.map((food) => (
              <button
                type="button"
                key={food.foodId}
                onClick={() => apply(food)}
                className="block w-full rounded-xl border border-[color:var(--border)] p-3 text-left hover:bg-[color:var(--surface-subtle)]"
              >
                <span className="block text-sm font-semibold">{food.name}</span>
                <span className="mt-1 block break-words text-xs text-[color:var(--text-muted)]">
                  {food.description}
                </span>
                <span className="mt-2 block text-xs">
                  {food.quantity} · {food.calories} kcal · P {food.protein} g ·
                  C {food.carbs} g · G {food.fat} g
                </span>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[color:var(--text-muted)]">
            Fuente: USDA FoodData Central
            {demo ? " · Modo de prueba, consultas limitadas" : ""}
          </p>
        </div>
      ) : null}
      {source ? (
        <div className="text-xs text-[color:var(--text-muted)]">
          <p>
            {source.grams == null
              ? "Indica una cantidad válida en g o kg para recalcular."
              : `Macros calculados para ${source.grams} g. Cambia la cantidad en g o kg para recalcular.`}
          </p>
          {calculated ? (
            <p className="mt-2 font-semibold text-[color:var(--text)]">
              {calculated.calories} kcal · P {calculated.protein} g · C{" "}
              {calculated.carbs} g · G {calculated.fat} g
            </p>
          ) : null}
          <a
            href={`https://fdc.nal.usda.gov/food-details/${source.foodId}/nutrients`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block underline"
          >
            Ver ficha de USDA
          </a>
          <button
            type="button"
            onClick={() => onApply({ nutritionSource: null })}
            className="ml-3 min-h-11 underline"
          >
            Usar valores manuales
          </button>
        </div>
      ) : !input ? (
        <p className="text-xs text-[color:var(--text-muted)]">
          Escribe cantidad + alimento para cargar calorías y macros.
        </p>
      ) : null}
    </div>
  );
}
