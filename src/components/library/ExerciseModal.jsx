import { useEffect, useMemo, useState } from "react";
import { Camera, ChevronDown } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Modal from "../shared/Modal";
import {
  BODY_REGIONS,
  DIFFICULTY_OPTIONS,
  EQUIPMENT_OPTIONS,
  EXECUTION_TYPE_OPTIONS,
  EXERCISE_CATEGORIES,
  EXERCISE_TYPE_OPTIONS,
  GOAL_OPTIONS,
  KINETIC_CHAIN_OPTIONS,
  LATERALITY_OPTIONS,
  POSITION_OPTIONS,
  STABILITY_OPTIONS,
  canonicalizeMuscleGroup,
  getBodyRegionForGroup,
  getExerciseBodyRegion,
  getExerciseCategories,
  getExerciseEquipment,
  getExerciseGoals,
  getExerciseMovementPatterns,
  getExerciseNavigationRegion,
  getExerciseType,
  getMovementPatternsForBodyRegion,
  getMuscleGroupsForBodyRegion,
  getNavigationRegionForGroup,
  getPrimaryMuscleGroup,
  makeDefaultExerciseTaxonomy,
  optionMatches,
  toArray,
} from "../../constants/exerciseTaxonomy";

const defaultTaxonomy = makeDefaultExerciseTaxonomy("Pecho");

const defaultForm = {
  name: "",
  aliases: "",
  categories: defaultTaxonomy.categories,
  category: defaultTaxonomy.category,
  bodyRegion: defaultTaxonomy.bodyRegion,
  navigationRegion: defaultTaxonomy.navigationRegion,
  muscle: defaultTaxonomy.primaryMuscleGroup,
  primaryMuscle: defaultTaxonomy.primaryMuscleGroup,
  primaryMuscleGroup: defaultTaxonomy.primaryMuscleGroup,
  primaryMuscles: "",
  secondaryMuscles: "",
  stabilizerMuscles: "",
  movementPatterns: [],
  movementPattern: "",
  equipment: [],
  exerciseType: "",
  laterality: "",
  kineticChain: "",
  executionType: "",
  stability: "",
  position: "",
  difficulty: "",
  goals: [],
  precautions: "",
  branches: ["general"],
  description: "",
  tags: "",
  movementMode: "bilateral",
  supportsUnilateral: false,
  image: "",
  type: "custom",
};

function Field({ label, children, className = "" }) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function ChipPicker({ label, options, selected, onToggle, requireOne = false }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.some((item) => optionMatches(item, option));
          return (
            <button
              key={option}
              type="button"
              onClick={() => {
                if (requireOne && active && selected.length === 1) return;
                onToggle(option);
              }}
              aria-pressed={active}
              className={`rounded-full border px-3 py-2 text-xs font-black transition ${
                active
                  ? "border-blue-500 bg-blue-600 text-white"
                  : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text)]"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SelectPicker({ label, options, selected, onToggle }) {
  const available = options.filter(
    (option) => !selected.some((item) => optionMatches(item, option)),
  );

  return (
    <div className="space-y-2">
      <label className="block space-y-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
          {label}
        </span>
        <select
          className="h-12 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-base font-semibold text-[color:var(--text)] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 sm:text-sm"
          value=""
          onChange={(event) => {
            if (event.target.value) onToggle(event.target.value);
          }}
        >
          <option value="">Agregar...</option>
          {available.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className="rounded-full border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200"
              aria-label={`Quitar ${option}`}
            >
              {option} &times;
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">
      {children}
    </p>
  );
}

const slugify = (text = "") =>
  text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

function ExerciseModal({ mode = "add", initialData, onSave, onClose }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const [form, setForm] = useState(() => ({
    ...defaultForm,
    type: isAdmin ? "system" : "custom",
  }));
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (initialData) {
      const primaryMuscleGroup =
        getPrimaryMuscleGroup(initialData) || defaultForm.primaryMuscleGroup;
      const categories = getExerciseCategories(initialData);
      const movementPatterns = getExerciseMovementPatterns(initialData);
      const equipment = getExerciseEquipment(initialData);
      const goals = getExerciseGoals(initialData);

      setForm({
        name: initialData.name || "",
        aliases: toArray(initialData.aliases).join(", "),
        categories,
        category: initialData.category || categories[0] || "",
        bodyRegion: getExerciseBodyRegion(initialData) || "",
        navigationRegion: getExerciseNavigationRegion(initialData) || "",
        muscle: primaryMuscleGroup,
        primaryMuscle: primaryMuscleGroup,
        primaryMuscleGroup,
        primaryMuscles: toArray(initialData.primaryMuscles).join(", "),
        secondaryMuscles: toArray(initialData.secondaryMuscles).join(", "),
        stabilizerMuscles: toArray(initialData.stabilizerMuscles).join(", "),
        movementPatterns,
        movementPattern:
          initialData.movementPattern || movementPatterns[0] || "",
        equipment,
        exerciseType: getExerciseType(initialData) || "",
        laterality: initialData.laterality || "",
        kineticChain: initialData.kineticChain || "",
        executionType: initialData.executionType || "",
        stability: initialData.stability || "",
        position: initialData.position || "",
        difficulty: initialData.difficulty || "",
        goals,
        precautions: toArray(initialData.precautions).join(", "),
        branches: initialData.branches?.length
          ? initialData.branches
          : ["general"],
        description: initialData.description || "",
        tags: toArray(initialData.tags).join(", "),
        movementMode: initialData.movementMode || "bilateral",
        supportsUnilateral: Boolean(initialData.supportsUnilateral),
        image: initialData.media?.image?.url || initialData.image || "",
        type: isAdmin ? initialData.type || "custom" : "custom",
      });
      setPreview(initialData.media?.image?.url || initialData.image || "");
    } else {
      setForm({ ...defaultForm, type: isAdmin ? "system" : "custom" });
      setPreview("");
    }
    setImageFile(null);
    setAdvancedOpen(false);
  }, [initialData, isAdmin]);

  const movementOptions = useMemo(
    () => getMovementPatternsForBodyRegion(form.bodyRegion),
    [form.bodyRegion],
  );

  const muscleOptions = useMemo(
    () => getMuscleGroupsForBodyRegion(form.bodyRegion),
    [form.bodyRegion],
  );

  const cloudinaryPreview = useMemo(() => {
    const scope = isAdmin && form.type === "system" ? "system" : "custom";
    const base = [
      "gym/exercises",
      scope,
      ...(scope === "custom" ? ["tu-usuario"] : []),
      slugify(form.category || form.categories[0]) || "sin-categoria",
      slugify(form.bodyRegion) || "sin-region",
      slugify(form.primaryMuscleGroup) || "sin-grupo",
      slugify(form.movementPattern || form.movementPatterns[0]) || "sin-patron",
      slugify(form.name) || "sin-nombre",
      "main",
    ];
    return base.join("/");
  }, [
    form.bodyRegion,
    form.categories,
    form.category,
    form.movementPattern,
    form.movementPatterns,
    form.name,
    form.primaryMuscleGroup,
    form.type,
    isAdmin,
  ]);

  const inputClass =
    "h-12 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-base font-semibold text-[color:var(--text)] outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 sm:text-sm";

  const textareaClass =
    "min-h-24 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-2 text-base font-semibold text-[color:var(--text)] outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 sm:text-sm";

  const updatePrimaryGroup = (group) => {
    const primaryMuscleGroup = canonicalizeMuscleGroup(group);
    const bodyRegion = getBodyRegionForGroup(primaryMuscleGroup);
    setForm((prev) => ({
      ...prev,
      bodyRegion: bodyRegion || prev.bodyRegion,
      navigationRegion: getNavigationRegionForGroup(primaryMuscleGroup),
      muscle: primaryMuscleGroup,
      primaryMuscle: primaryMuscleGroup,
      primaryMuscleGroup,
    }));
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    if (name === "bodyRegion") {
      const firstGroup = getMuscleGroupsForBodyRegion(value)[0] || "Pecho";
      setForm((prev) => ({
        ...prev,
        bodyRegion: value,
        navigationRegion: getNavigationRegionForGroup(firstGroup),
        muscle: firstGroup,
        primaryMuscle: firstGroup,
        primaryMuscleGroup: firstGroup,
      }));
      return;
    }
    if (name === "primaryMuscleGroup") {
      updatePrimaryGroup(value);
      return;
    }
    if (name === "laterality") {
      setForm((prev) => ({
        ...prev,
        laterality: value,
        supportsUnilateral:
          optionMatches(value, "Unilateral") || prev.supportsUnilateral,
        movementMode: optionMatches(value, "Unilateral")
          ? "unilateral"
          : "bilateral",
      }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleListValue = (field, value) => {
    setForm((prev) => {
      const current = toArray(prev[field]);
      const exists = current.some((item) => optionMatches(item, value));
      const next = exists
        ? current.filter((item) => !optionMatches(item, value))
        : [...current, value];
      return {
        ...prev,
        [field]: next,
        ...(field === "categories" ? { category: next[0] || "" } : {}),
        ...(field === "movementPatterns"
          ? { movementPattern: next[0] || "" }
          : {}),
      };
    });
  };

  const toggleBranch = (value) => {
    if (value === "general") {
      setForm((prev) => ({ ...prev, branches: ["general"] }));
      return;
    }
    setForm((prev) => ({ ...prev, branches: [value] }));
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        ...initialData,
        ...form,
        category: form.categories[0] || form.category,
        muscle: form.primaryMuscleGroup,
        primaryMuscle: form.primaryMuscleGroup,
        movementPattern: form.movementPatterns[0] || form.movementPattern,
        type: isAdmin ? form.type : "custom",
        imageFile,
      });
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <>
      <button
        type="button"
        className="h-10 rounded-xl border border-[color:var(--border)] px-4 text-sm font-semibold text-[color:var(--text)]"
        onClick={onClose}
      >
        Cancelar
      </button>
      <button
        type="submit"
        className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-70"
        form="exercise-form"
        disabled={saving}
      >
        {saving ? "Guardando..." : mode === "edit" ? "Guardar" : "Crear"}
      </button>
    </>
  );

  return (
    <Modal
      title={null}
      subtitle={null}
      onClose={onClose}
      footer={footer}
      size="wide"
    >
      <form id="exercise-form" className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <SectionTitle>
            {mode === "edit" ? "Editar ejercicio" : "Nuevo ejercicio"}
          </SectionTitle>
          <h3 className="mt-1 text-2xl font-black text-[color:var(--text)]">
            {form.name || "Ejercicio"}
          </h3>
        </div>

        <label className="block overflow-hidden rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--bg)]">
          <div className="relative">
            {preview || form.image ? (
              <img
                src={preview || form.image}
                alt="Vista previa"
                className="h-40 w-full object-contain sm:h-48"
              />
            ) : (
              <div className="grid h-40 w-full place-items-center text-center text-sm font-semibold text-[color:var(--text-muted)] sm:h-48">
                <span className="grid place-items-center gap-2">
                  <Camera className="h-7 w-7" />
                  Agregar imagen
                </span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileUpload}
            />
          </div>
        </label>

        {isAdmin && (
          <div className="grid grid-cols-2 gap-2">
            {[
                ["system", "Catálogo"],
              ["custom", "Personal"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, type: value }))}
                aria-pressed={form.type === value}
                className={`h-11 rounded-xl border px-3 text-sm font-black transition ${
                  form.type === value
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <section className="space-y-3">
          <SectionTitle>Identidad</SectionTitle>
          <div>
            <Field label="Nombre">
              <input
                className={inputClass}
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="Press banca con barra"
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle>Taxonomía principal</SectionTitle>
          <ChipPicker
            label="Categorías"
            options={EXERCISE_CATEGORIES}
            selected={form.categories}
            onToggle={(value) => toggleListValue("categories", value)}
            requireOne
          />

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Región corporal">
              <select
                className={inputClass}
                name="bodyRegion"
                value={form.bodyRegion}
                onChange={handleChange}
              >
                {BODY_REGIONS.map((region) => (
                  <option key={region}>{region}</option>
                ))}
              </select>
            </Field>

            <Field label="Grupo principal">
              <select
                className={inputClass}
                name="primaryMuscleGroup"
                value={form.primaryMuscleGroup}
                onChange={handleChange}
              >
                {muscleOptions.map((muscle) => (
                  <option key={muscle}>{muscle}</option>
                ))}
              </select>
            </Field>

          </div>
        </section>

        <SelectPicker
          label="Equipamiento"
          options={EQUIPMENT_OPTIONS}
          selected={form.equipment}
          onToggle={(value) => toggleListValue("equipment", value)}
        />

        <Field label="Descripción técnica">
          <textarea
            className={textareaClass}
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Indicaciones clave, rango de movimiento y control técnico."
          />
        </Field>

        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          aria-expanded={advancedOpen}
          className="flex h-12 w-full items-center justify-between rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] px-4 text-sm font-bold text-[color:var(--text)]"
        >
          Opciones avanzadas
          <ChevronDown
            className={`h-5 w-5 transition-transform ${advancedOpen ? "rotate-180" : ""}`}
          />
        </button>

        {advancedOpen && (
          <div className="space-y-5 border-t border-[color:var(--border)] pt-5">
            <section className="space-y-3">
              <SectionTitle>Identificación adicional</SectionTitle>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Alias">
                  <input
                    className={inputClass}
                    name="aliases"
                    value={form.aliases}
                    onChange={handleChange}
                    placeholder="Press banca, Bench press"
                  />
                </Field>
                <Field label="Navegación visual">
                  <input
                    className={inputClass}
                    name="navigationRegion"
                    value={form.navigationRegion}
                    onChange={handleChange}
                    placeholder="Pecho"
                  />
                </Field>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Músculos principales">
                  <input className={inputClass} name="primaryMuscles" value={form.primaryMuscles} onChange={handleChange} placeholder="Pectoral mayor" />
                </Field>
                <Field label="Secundarios">
                  <input className={inputClass} name="secondaryMuscles" value={form.secondaryMuscles} onChange={handleChange} placeholder="Tríceps braquial" />
                </Field>
                <Field label="Estabilizadores">
                  <input className={inputClass} name="stabilizerMuscles" value={form.stabilizerMuscles} onChange={handleChange} placeholder="Manguito rotador" />
                </Field>
              </div>
            </section>

        <section className="space-y-4">
          <SectionTitle>Movimiento</SectionTitle>
          <ChipPicker
            label="Patrones"
            options={movementOptions}
            selected={form.movementPatterns}
            onToggle={(value) => toggleListValue("movementPatterns", value)}
          />

          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Tipo">
              <select
                className={inputClass}
                name="exerciseType"
                value={form.exerciseType}
                onChange={handleChange}
              >
                <option value="">Sin especificar</option>
                {EXERCISE_TYPE_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </Field>
            <Field label="Lateralidad">
              <select
                className={inputClass}
                name="laterality"
                value={form.laterality}
                onChange={handleChange}
              >
                <option value="">Sin especificar</option>
                {LATERALITY_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </Field>
            <Field label="Cadena cinética">
              <select
                className={inputClass}
                name="kineticChain"
                value={form.kineticChain}
                onChange={handleChange}
              >
                <option value="">Sin especificar</option>
                {KINETIC_CHAIN_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Ejecución">
              <select
                className={inputClass}
                name="executionType"
                value={form.executionType}
                onChange={handleChange}
              >
                <option value="">Sin especificar</option>
                {EXECUTION_TYPE_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </Field>
            <Field label="Estabilidad">
              <select
                className={inputClass}
                name="stability"
                value={form.stability}
                onChange={handleChange}
              >
                <option value="">Sin especificar</option>
                {STABILITY_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </Field>
            <Field label="Posición">
              <select
                className={inputClass}
                name="position"
                value={form.position}
                onChange={handleChange}
              >
                <option value="">Sin especificar</option>
                {POSITION_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </Field>
            <Field label="Nivel">
              <select
                className={inputClass}
                name="difficulty"
                value={form.difficulty}
                onChange={handleChange}
              >
                <option value="">Sin especificar</option>
                {DIFFICULTY_OPTIONS.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <SectionTitle>Filtros independientes</SectionTitle>
          <SelectPicker
            label="Objetivos"
            options={GOAL_OPTIONS}
            selected={form.goals}
            onToggle={(value) => toggleListValue("goals", value)}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Precauciones">
              <input
                className={inputClass}
                name="precautions"
                value={form.precautions}
                onChange={handleChange}
                placeholder="Alta demanda de hombro"
              />
            </Field>
            <Field label="Tags">
              <input
                className={inputClass}
                name="tags"
                value={form.tags}
                onChange={handleChange}
                placeholder="fuerza, press"
              />
            </Field>
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle>Disponibilidad</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {["general", "sopocachi", "miraflores"].map((branch) => (
              <button
                key={branch}
                type="button"
                onClick={() => toggleBranch(branch)}
                className={`h-11 rounded-xl border px-2 text-xs font-black transition ${
                  form.branches?.includes(branch)
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-[color:var(--border)] bg-[color:var(--bg)] text-[color:var(--text)]"
                }`}
              >
                {branch === "general"
                  ? "Todas"
                  : branch.charAt(0).toUpperCase() + branch.slice(1)}
              </button>
            ))}
          </div>
        </section>

            <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] p-3">
              <p className="text-xs font-semibold text-[color:var(--text-muted)]">
                {isAdmin
                  ? "Las imágenes del catálogo global solo pueden ser modificadas por administradores. Cloudinary usa una ruta generada desde la clasificación."
                  : "Este ejercicio y su imagen son personales. El catálogo global solo puede ser modificado por un administrador."}
              </p>
              {isAdmin && (
                <p className="mt-2 break-all rounded-lg bg-[color:var(--card)] px-3 py-2 text-[11px] font-semibold text-[color:var(--text-muted)]">
                  {cloudinaryPreview}
                </p>
              )}
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}

export default ExerciseModal;
