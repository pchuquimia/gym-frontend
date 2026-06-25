import { useEffect, useMemo, useState } from "react";
import { Camera, Dumbbell, Info, MapPin, Tags } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Modal from "../shared/Modal";

const defaultForm = {
  name: "",
  muscle: "Pecho",
  primaryMuscle: "Pecho",
  secondaryMuscles: "",
  branches: ["general"],
  description: "",
  equipment: "",
  tags: "",
  movementMode: "bilateral",
  supportsUnilateral: false,
  image: "",
  type: "custom",
};

const muscleOptions = [
  "Pecho",
  "Espalda",
  "Piernas",
  "Triceps",
  "Biceps",
  "Femoral",
  "Cuadricep",
  "Pantorrillas",
  "Gluteo",
  "Abdominales",
  "Hombros",
  "Core",
  "Full Body",
];

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

function Section({ icon: Icon, title, children }) {
  return (
    <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-3 md:p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300">
          <Icon className="h-4 w-4" />
        </span>
        <h4 className="text-sm font-semibold text-[color:var(--text)]">
          {title}
        </h4>
      </div>
      {children}
    </section>
  );
}

function ExerciseModal({ mode = "add", initialData, onSave, onClose }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const [form, setForm] = useState(defaultForm);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      const primaryMuscle =
        initialData.primaryMuscle || initialData.muscle || "Pecho";
      setForm({
        name: initialData.name || "",
        muscle: initialData.muscle || primaryMuscle,
        primaryMuscle,
        secondaryMuscles: (initialData.secondaryMuscles || []).join(", "),
        branches: initialData.branches?.length
          ? initialData.branches
          : ["general"],
        description: initialData.description || "",
        equipment: initialData.equipment || "",
        tags: (initialData.tags || []).join(", "),
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
  }, [initialData, isAdmin]);

  const helperText = useMemo(() => {
    if (isAdmin && form.type === "system") {
      return "Disponible para todos. Solo Admin puede editarlo.";
    }
    return "Visible segun permisos del usuario y entrenadores asignados.";
  }, [form.type, isAdmin]);

  const inputClass =
    "h-11 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-sm text-[color:var(--text)] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20";

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "primaryMuscle" ? { muscle: value } : {}),
    }));
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
        muscle: form.primaryMuscle || form.muscle,
        primaryMuscle: form.primaryMuscle || form.muscle,
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
      title={mode === "edit" ? "Editar ejercicio" : "Nuevo ejercicio"}
      subtitle={helperText}
      onClose={onClose}
      footer={footer}
      size="wide"
    >
      <form
        id="exercise-form"
        className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]"
        onSubmit={handleSubmit}
      >
        <div className="space-y-3">
          <Section icon={Info} title="Identidad">
            <div className="grid gap-3 md:grid-cols-2">
              {isAdmin && (
                <Field label="Tipo" className="md:col-span-2">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ["system", "Catalogo global"],
                      ["custom", "Personalizado"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({ ...prev, type: value }))
                        }
                        className={`h-11 rounded-xl border px-3 text-sm font-semibold transition ${
                          form.type === value
                            ? "border-blue-600 bg-blue-600 text-white"
                            : "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text)]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
              )}

              <Field label="Nombre" className="md:col-span-2">
                <input
                  className={inputClass}
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Press banca con barra"
                />
              </Field>

              <Field label="Musculo principal">
                <select
                  className={inputClass}
                  name="primaryMuscle"
                  value={form.primaryMuscle}
                  onChange={handleChange}
                >
                  {muscleOptions.map((muscle) => (
                    <option key={muscle}>{muscle}</option>
                  ))}
                </select>
              </Field>

              <Field label="Musculos secundarios">
                <input
                  className={inputClass}
                  name="secondaryMuscles"
                  value={form.secondaryMuscles}
                  onChange={handleChange}
                  placeholder="Triceps, Hombros"
                />
              </Field>
            </div>
          </Section>

          <Section icon={Dumbbell} title="Entrenamiento">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Equipo">
                <input
                  className={inputClass}
                  name="equipment"
                  value={form.equipment}
                  onChange={handleChange}
                  placeholder="Barra, mancuernas, maquina"
                />
              </Field>

              <Field label="Modo">
                <select
                  className={inputClass}
                  name="movementMode"
                  value={form.movementMode}
                  onChange={handleChange}
                >
                  <option value="bilateral">Bilateral</option>
                  <option value="unilateral">Unilateral</option>
                </select>
              </Field>

              <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 text-sm text-[color:var(--text)] md:col-span-2">
                <input
                  type="checkbox"
                  name="supportsUnilateral"
                  checked={form.supportsUnilateral}
                  onChange={handleChange}
                  className="h-4 w-4"
                />
                Permite alternar a unilateral
              </label>
            </div>
          </Section>

          <Section icon={MapPin} title="Disponibilidad">
            <div className="grid grid-cols-3 gap-2">
              {["general", "sopocachi", "miraflores"].map((branch) => (
                <button
                  key={branch}
                  type="button"
                  onClick={() => toggleBranch(branch)}
                  className={`h-11 rounded-xl border px-2 text-xs font-semibold transition sm:text-sm ${
                    form.branches?.includes(branch)
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--text)]"
                  }`}
                >
                  {branch === "general"
                    ? "Todas"
                    : branch.charAt(0).toUpperCase() + branch.slice(1)}
                </button>
              ))}
            </div>
          </Section>

          <Section icon={Tags} title="Contenido">
            <div className="grid gap-3">
              <Field label="Tags">
                <input
                  className={inputClass}
                  name="tags"
                  value={form.tags}
                  onChange={handleChange}
                  placeholder="pecho, empuje, barra"
                />
              </Field>
              <Field label="Descripcion tecnica">
                <textarea
                  className="min-h-28 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-sm text-[color:var(--text)] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Indicaciones de ejecucion, rango de movimiento y ajustes."
                />
              </Field>
            </div>
          </Section>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-0 lg:self-start">
          <Section icon={Camera} title="Imagen">
            <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--card)]">
              {preview || form.image ? (
                <img
                  src={preview || form.image}
                  alt="Vista previa"
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="grid aspect-[4/3] w-full place-items-center text-center text-sm text-[color:var(--text-muted)]">
                  Sin imagen
                </div>
              )}
            </div>

            <div className="mt-3 space-y-3">
              <Field label="Subir archivo">
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-sm text-[color:var(--text)] file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
                  onChange={handleFileUpload}
                />
              </Field>
              <Field label="URL externa">
                <input
                  className={inputClass}
                  name="image"
                  value={form.image}
                  onChange={handleChange}
                  placeholder="https://..."
                />
              </Field>
            </div>
          </Section>
        </aside>
      </form>
    </Modal>
  );
}

export default ExerciseModal;
