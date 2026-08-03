import {
  Activity,
  AlertTriangle,
  Dumbbell,
  MapPin,
  Pencil,
  Tags,
  Trash2,
} from "lucide-react";
import Modal from "../shared/Modal";
import Badge from "../ui/badge";
import {
  getExerciseAnimationUrl,
  getExerciseImageUrl,
} from "../../utils/cloudinary";
import {
  formatList,
  getExerciseBodyRegion,
  getExerciseCategories,
  getExerciseEquipment,
  getExerciseGoals,
  getExerciseLaterality,
  getExerciseMovementPatterns,
  getExerciseNavigationRegion,
  getExerciseType,
  getPrimaryMuscleGroup,
  toArray,
} from "../../constants/exerciseTaxonomy";

const branchLabel = (branch) =>
  branch === "general"
    ? "Todas"
    : branch.charAt(0).toUpperCase() + branch.slice(1);

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--text-muted)]" />
      <div className="min-w-0">
        <p className="font-semibold text-[color:var(--text)]">{label}</p>
        <p className="text-[color:var(--text-muted)]">{value}</p>
      </div>
    </div>
  );
}

function DetailBlock({ title, children }) {
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-4">
      <p className="text-sm font-black text-[color:var(--text)]">{title}</p>
      <div className="mt-3 grid gap-3 text-sm">{children}</div>
    </div>
  );
}

function DetailModal({
  exercise,
  onClose,
  onEdit,
  onDelete,
  canManage = false,
}) {
  if (!exercise) return null;
  const imageUrl = getExerciseImageUrl(exercise, { width: 1000, height: 750 });
  const animationUrl = getExerciseAnimationUrl(exercise);
  const branches = exercise.branches?.length ? exercise.branches : ["general"];
  const categories = getExerciseCategories(exercise);
  const muscleGroup = getPrimaryMuscleGroup(exercise) || "Sin grupo";
  const bodyRegion = getExerciseBodyRegion(exercise) || "Sin región";
  const navigationRegion =
    getExerciseNavigationRegion(exercise) || "Sin navegación";
  const movementPatterns = getExerciseMovementPatterns(exercise);
  const equipment = getExerciseEquipment(exercise);
  const goals = getExerciseGoals(exercise);
  const sourceLabel =
    exercise.type === "system" ? "Catalogo global" : "Ejercicio personalizado";

  const footer = (
    <>
      {canManage ? (
        <>
          <button
            type="button"
            className="mr-auto inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-600 dark:border-red-500/30 dark:text-red-300"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[color:var(--border)] px-4 text-sm font-semibold text-[color:var(--text)]"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
            Editar
          </button>
        </>
      ) : null}
      <button
        type="button"
        className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white"
        onClick={onClose}
      >
        Cerrar
      </button>
    </>
  );

  return (
    <Modal
      title={exercise.name}
      subtitle={sourceLabel}
      onClose={onClose}
      footer={footer}
      size="wide"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)]">
            {animationUrl || imageUrl ? (
              <img
                src={animationUrl || imageUrl}
                alt={exercise.name}
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="grid aspect-[4/3] place-items-center text-sm text-[color:var(--text-muted)]">
                Sin imagen
              </div>
            )}
          </div>

          <DetailBlock title="Descripción técnica">
            <p className="whitespace-pre-line leading-6 text-[color:var(--text-muted)]">
              {exercise.description || "Sin descripcion cargada."}
            </p>
          </DetailBlock>

          {toArray(exercise.instructions).length ? (
            <DetailBlock title="Ejecución">
              <ol className="grid gap-2 pl-5 text-[color:var(--text-muted)]">
                {toArray(exercise.instructions).map((instruction, index) => (
                  <li
                    key={`${index}-${instruction}`}
                    className="list-decimal leading-6"
                  >
                    {instruction}
                  </li>
                ))}
              </ol>
            </DetailBlock>
          ) : null}

          {exercise.source?.attribution ? (
            <p className="px-1 text-xs text-[color:var(--text-muted)]">
              {exercise.source.attribution}
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg)] p-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                {categories[0] || exercise.category || sourceLabel}
              </Badge>
              <Badge>{bodyRegion}</Badge>
              <Badge>{muscleGroup}</Badge>
              {exercise.difficulty ? (
                <Badge>{exercise.difficulty}</Badge>
              ) : null}
            </div>
          </div>

          <DetailBlock title="Clasificación">
            <InfoRow icon={MapPin} label="Región corporal" value={bodyRegion} />
            <InfoRow
              icon={Tags}
              label="Navegación visual"
              value={navigationRegion}
            />
            <InfoRow
              icon={Dumbbell}
              label="Grupo principal"
              value={muscleGroup}
            />
          </DetailBlock>

          <DetailBlock title="Músculos">
            <InfoRow
              icon={Activity}
              label="Principales"
              value={formatList(exercise.primaryMuscles, muscleGroup)}
            />
            <InfoRow
              icon={Activity}
              label="Secundarios"
              value={formatList(exercise.secondaryMuscles)}
            />
            <InfoRow
              icon={Activity}
              label="Estabilizadores"
              value={formatList(exercise.stabilizerMuscles)}
            />
          </DetailBlock>

          <DetailBlock title="Movimiento">
            <InfoRow
              icon={Activity}
              label="Patrón"
              value={formatList(movementPatterns)}
            />
            <InfoRow
              icon={Activity}
              label="Tipo"
              value={getExerciseType(exercise) || "No especificado"}
            />
            <InfoRow
              icon={Activity}
              label="Lateralidad"
              value={getExerciseLaterality(exercise)}
            />
            <InfoRow
              icon={Activity}
              label="Cadena / ejecución / estabilidad"
              value={
                [
                  exercise.kineticChain,
                  exercise.executionType,
                  exercise.stability,
                ]
                  .filter(Boolean)
                  .join(" / ") || "No especificado"
              }
            />
            <InfoRow
              icon={Activity}
              label="Posición"
              value={exercise.position || "No especificado"}
            />
          </DetailBlock>

          <DetailBlock title="Filtros independientes">
            <InfoRow
              icon={Dumbbell}
              label="Equipamiento"
              value={formatList(equipment)}
            />
            <InfoRow icon={Tags} label="Objetivos" value={formatList(goals)} />
            <InfoRow
              icon={MapPin}
              label="Sedes"
              value={branches.map(branchLabel).join(" / ")}
            />
          </DetailBlock>

          {toArray(exercise.precautions).length ||
          toArray(exercise.tags).length ? (
            <DetailBlock title="Notas">
              {toArray(exercise.precautions).length ? (
                <InfoRow
                  icon={AlertTriangle}
                  label="Precauciones"
                  value={formatList(exercise.precautions)}
                />
              ) : null}
              {toArray(exercise.tags).length ? (
                <InfoRow
                  icon={Tags}
                  label="Tags"
                  value={formatList(exercise.tags)}
                />
              ) : null}
            </DetailBlock>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

export default DetailModal;
