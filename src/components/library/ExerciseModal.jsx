import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
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

  const inputClass =
    "h-12 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 text-sm font-semibold text-[color:var(--text)] outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20";

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
      title={null}
      subtitle={null}
      onClose={onClose}
      footer={footer}
      size="default"
    >
      <form
        id="exercise-form"
        className="space-y-4"
        onSubmit={handleSubmit}
      >
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 dark:text-blue-200">
            {mode === "edit" ? "Editar ejercicio" : "Nuevo ejercicio"}
          </p>
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
                className="aspect-[16/10] w-full object-cover"
              />
            ) : (
              <div className="grid aspect-[16/10] w-full place-items-center text-center text-sm font-semibold text-[color:var(--text-muted)]">
                <span className="grid gap-2 place-items-center">
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
              ["system", "Catalogo"],
              ["custom", "Personal"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, type: value }))}
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

        <div className="grid grid-cols-2 gap-3">
          <Field label="Musculo">
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

          <Field label="Equipo">
            <input
              className={inputClass}
              name="equipment"
              value={form.equipment}
              onChange={handleChange}
              placeholder="Barra"
            />
          </Field>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
              Unilateral
            </p>
            <p className="text-[11px] font-semibold text-[color:var(--text-muted)]">
              Si puede hacerse lado por lado.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                supportsUnilateral: !prev.supportsUnilateral,
                movementMode: !prev.supportsUnilateral ? "unilateral" : "bilateral",
              }))
            }
            className={`relative h-7 w-12 rounded-full transition ${
              form.supportsUnilateral ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
            }`}
            aria-pressed={form.supportsUnilateral}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                form.supportsUnilateral ? "left-6" : "left-1"
              }`}
            />
          </button>
        </div>

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
      </form>
    </Modal>
  );
}

export default ExerciseModal;
