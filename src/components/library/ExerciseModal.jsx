import { useEffect, useState } from "react";
import Modal from "../shared/Modal";

const defaultForm = {
  name: "",
  muscle: "Pecho",
  branches: ["general"],
  description: "",
  equipment: "",
  image: "",
};

function ExerciseModal({ mode = "add", initialData, onSave, onClose }) {
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || "",
        muscle: initialData.muscle || "Pecho",
        branches: initialData.branches?.length
          ? initialData.branches
          : ["general"],
        description: initialData.description || "",
        equipment: initialData.equipment || "",
        image: initialData.image || "",
      });
    } else {
      setForm(defaultForm);
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleBranch = (value) => {
    // Comportamiento exclusivo: General excluye otras; cada sede excluye las demás.
    if (value === "general") {
      setForm((prev) => ({ ...prev, branches: ["general"] }));
      return;
    }
    setForm((prev) => ({ ...prev, branches: [value] }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({ ...initialData, ...form, type: initialData?.type || "custom" });
  };

  const footer = (
    <>
      <button type="button" className="ghost-btn" onClick={onClose}>
        Cancelar
      </button>
      <button type="submit" className="primary-btn" form="exercise-form">
        {mode === "edit" ? "Guardar Cambios" : "Guardar Ejercicio"}
      </button>
    </>
  );

  return (
    <Modal
      title={mode === "edit" ? "Editar ejercicio" : "Añadir nuevo ejercicio"}
      subtitle="Gestiona tu catálogo de ejercicios"
      onClose={onClose}
      footer={footer}
    >
      <form
        id="exercise-form"
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
        onSubmit={handleSubmit}
      >
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Nombre del Ejercicio *</span>
          <input
            className="rounded-lg border border-border-soft bg-white/5 px-3 py-2 text-white"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Grupo Muscular Principal</span>
          <select
            className="rounded-lg border border-border-soft bg-white/5 px-3 py-2 text-white"
            name="muscle"
            value={form.muscle}
            onChange={handleChange}
          >
            <option>Pecho</option>
            <option>Espalda</option>
            <option>Piernas</option>
            <option>Triceps</option>
            <option>Biceps</option>
            <option>Femoral</option>
            <option>Cuadricep</option>
            <option>Pantorrillas</option>
            <option>Gluteo</option>
            <option>Abdominales</option>
            <option>Hombros</option>
            <option>Core</option>
            <option>Full Body</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Disponible en Sede(s)</span>
          <div className="flex gap-2 flex-wrap">
            {["general", "sopocachi", "miraflores"].map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => toggleBranch(b)}
                className={`px-3 py-2 rounded-full border text-sm transition ${
                  form.branches?.includes(b)
                    ? "border-accent bg-accent/20 text-white shadow-[0_0_10px_rgba(79,163,255,0.3)]"
                    : "border-border-soft text-muted hover:border-accent/40"
                }`}
              >
                {b === "general"
                  ? "Todas"
                  : b.charAt(0).toUpperCase() + b.slice(1)}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted">
            Selecciona una o varias sedes donde se puede realizar este
            ejercicio.
          </span>
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="font-semibold">Breve Descripción de la Técnica</span>
          <textarea
            className="rounded-lg border border-border-soft bg-white/5 px-3 py-2 text-white"
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            placeholder="Notas para la ejecución correcta..."
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Equipo Requerido</span>
          <input
            className="rounded-lg border border-border-soft bg-white/5 px-3 py-2 text-white"
            name="equipment"
            value={form.equipment}
            onChange={handleChange}
            placeholder="Barra, mancuernas, máquina..."
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">
            Imagen / Ilustración (URL o archivo)
          </span>
          <input
            className="rounded-lg border border-border-soft bg-white/5 px-3 py-2 text-white"
            name="image"
            value={form.image}
            onChange={handleChange}
            placeholder="https://... o sube un archivo"
          />
          <div className="flex items-center gap-2 mt-2">
            <label className="ghost-btn text-sm cursor-pointer">
              Subir archivo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
            <span className="text-xs text-muted">
              Se guardará en base64 para desarrollo.
            </span>
          </div>
        </label>
        {form.image && (
          <div className="md:col-span-2 flex flex-col gap-2">
            <p className="label">Vista previa</p>
            <div className="rounded-xl border border-border-soft overflow-hidden">
              <img
                src={form.image}
                alt="Vista previa"
                className="w-full h-52 object-cover"
              />
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}

export default ExerciseModal;
