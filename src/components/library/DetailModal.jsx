import { Dumbbell, MapPin, Tags } from "lucide-react";
import Modal from "../shared/Modal";
import Badge from "../ui/badge";
import { getExerciseImageUrl } from "../../utils/cloudinary";

const branchLabel = (branch) =>
  branch === "general"
    ? "Todas"
    : branch.charAt(0).toUpperCase() + branch.slice(1);

function DetailModal({ exercise, onClose }) {
  if (!exercise) return null;
  const imageUrl = getExerciseImageUrl(exercise, { width: 1000, height: 750 });
  const branches = exercise.branches?.length ? exercise.branches : ["general"];

  return (
    <Modal
      title={exercise.name}
      subtitle={
        exercise.type === "system"
          ? "Catalogo global"
          : "Ejercicio personalizado"
      }
      onClose={onClose}
      footer={
        <button
          type="button"
          className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white"
          onClick={onClose}
        >
          Cerrar
        </button>
      }
      size="wide"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_360px]">
        <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={exercise.name}
              className="aspect-[4/3] w-full object-cover"
            />
          ) : (
            <div className="grid aspect-[4/3] place-items-center text-sm text-[color:var(--text-muted)]">
              Sin imagen
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {exercise.type === "system" ? "Catalogo" : "Personal"}
              </Badge>
              <Badge>
                {exercise.primaryMuscle || exercise.muscle || "Sin grupo"}
              </Badge>
              {exercise.movementMode ? (
                <Badge>{exercise.movementMode}</Badge>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex gap-3">
                <Dumbbell className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
                <div>
                  <p className="font-semibold text-[color:var(--text)]">
                    Equipo
                  </p>
                  <p className="text-[color:var(--text-muted)]">
                    {exercise.equipment || "No especificado"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
                <div>
                  <p className="font-semibold text-[color:var(--text)]">
                    Sedes
                  </p>
                  <p className="text-[color:var(--text-muted)]">
                    {branches.map(branchLabel).join(" / ")}
                  </p>
                </div>
              </div>

              {exercise.tags?.length ? (
                <div className="flex gap-3">
                  <Tags className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
                  <div>
                    <p className="font-semibold text-[color:var(--text)]">
                      Tags
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {exercise.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-[color:var(--border)] px-2 py-0.5 text-xs text-[color:var(--text-muted)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-4">
            <p className="text-sm font-semibold text-[color:var(--text)]">
              Descripcion tecnica
            </p>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[color:var(--text-muted)]">
              {exercise.description || "Sin descripcion cargada."}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default DetailModal;
