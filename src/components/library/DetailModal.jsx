import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Dumbbell,
  MapPin,
  Pause,
  Pencil,
  Play,
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
  getExerciseMovementPatterns,
  getExerciseNavigationRegion,
  getExerciseType,
  getPrimaryMuscleGroup,
  toArray,
} from "../../constants/exerciseTaxonomy";

const hasText = (value) =>
  Array.isArray(value) ? value.filter(Boolean).length > 0 : Boolean(value);

const capitalizeName = (value = "") =>
  value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : "Ejercicio";

function InfoRow({ icon: Icon, label, value }) {
  if (!hasText(value)) return null;
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
    <section className="rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] p-4">
      <h4 className="text-sm font-black text-[color:var(--text)]">{title}</h4>
      <div className="mt-3 grid gap-3 text-sm">{children}</div>
    </section>
  );
}

export default function DetailModal({
  exercise,
  onClose,
  onEdit,
  onDelete,
  canManage = false,
}) {
  const [activeTab, setActiveTab] = useState("technique");
  const [showAnimation, setShowAnimation] = useState(false);
  const imageUrl = getExerciseImageUrl(exercise, { width: 900, height: 900 });
  const animationUrl = getExerciseAnimationUrl(exercise);
  const instructions = toArray(exercise.instructions);
  const categories = getExerciseCategories(exercise);
  const muscleGroup = getPrimaryMuscleGroup(exercise);
  const bodyRegion = getExerciseBodyRegion(exercise);
  const navigationRegion = getExerciseNavigationRegion(exercise);
  const movementPatterns = getExerciseMovementPatterns(exercise);
  const equipment = getExerciseEquipment(exercise);
  const goals = getExerciseGoals(exercise);
  const secondaryMuscles = toArray(exercise.secondaryMuscles);
  const stabilizerMuscles = toArray(exercise.stabilizerMuscles);
  const mechanics = [
    exercise.kineticChain,
    exercise.executionType,
    exercise.stability,
  ].filter(Boolean);

  const footer = canManage ? (
    <>
      <button
        type="button"
        className="mr-auto inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-600 dark:border-red-500/30 dark:text-red-300"
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
        Eliminar
      </button>
      <button
        type="button"
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white"
        onClick={onEdit}
      >
        <Pencil className="h-4 w-4" />
        Editar
      </button>
    </>
  ) : null;

  return (
    <Modal
      title={capitalizeName(exercise.name)}
      subtitle={exercise.type === "system" ? "Catálogo global" : "Ejercicio personal"}
      onClose={onClose}
      footer={footer}
      size="wide"
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {categories[0] ? <Badge variant="secondary">{categories[0]}</Badge> : null}
        {bodyRegion ? <Badge>{bodyRegion}</Badge> : null}
        {muscleGroup ? <Badge>{muscleGroup}</Badge> : null}
        {exercise.difficulty ? <Badge>{exercise.difficulty}</Badge> : null}
      </div>

      <div
        className="mb-4 grid grid-cols-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--bg)] p-1"
        role="tablist"
        aria-label="Información del ejercicio"
      >
        {[
          ["technique", "Técnica"],
          ["details", "Detalles"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={activeTab === value}
            onClick={() => setActiveTab(value)}
            className={`h-10 rounded-md text-sm font-black transition ${
              activeTab === value
                ? "bg-blue-600 text-white shadow-sm"
                : "text-[color:var(--text-muted)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "technique" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg border border-[color:var(--border)] bg-black/5 dark:bg-black/20">
              {showAnimation && animationUrl ? (
                <img
                  src={animationUrl}
                  alt={`Demostración de ${exercise.name}`}
                  className="aspect-square w-full object-contain"
                />
              ) : imageUrl ? (
                <img
                  src={imageUrl}
                  alt={exercise.name}
                  className="aspect-square w-full object-contain"
                />
              ) : (
                <div className="grid aspect-square place-items-center text-sm text-[color:var(--text-muted)]">
                  Sin imagen
                </div>
              )}
            </div>
            {animationUrl ? (
              <button
                type="button"
                onClick={() => setShowAnimation((value) => !value)}
                aria-pressed={showAnimation}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] text-sm font-black text-[color:var(--text)]"
              >
                {showAnimation ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {showAnimation ? "Ver imagen estática" : "Ver animación"}
              </button>
            ) : null}
            {exercise.source?.attribution ? (
              <p className="px-1 text-xs text-[color:var(--text-muted)]">
                {exercise.source.attribution}
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            {instructions.length ? (
              <DetailBlock title="Ejecución">
                <ol className="grid gap-3 pl-5 text-[color:var(--text-muted)]">
                  {instructions.map((instruction, index) => (
                    <li key={`${index}-${instruction}`} className="list-decimal leading-6">
                      {instruction}
                    </li>
                  ))}
                </ol>
              </DetailBlock>
            ) : exercise.description ? (
              <DetailBlock title="Descripción técnica">
                <p className="whitespace-pre-line leading-6 text-[color:var(--text-muted)]">
                  {exercise.description}
                </p>
              </DetailBlock>
            ) : (
              <DetailBlock title="Técnica">
                <p className="text-[color:var(--text-muted)]">
                  Este ejercicio todavía no tiene instrucciones cargadas.
                </p>
              </DetailBlock>
            )}
            {toArray(exercise.precautions).length ? (
              <DetailBlock title="Precauciones">
                <InfoRow
                  icon={AlertTriangle}
                  label="Consideraciones"
                  value={formatList(exercise.precautions)}
                />
              </DetailBlock>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {(bodyRegion || navigationRegion || muscleGroup) && (
            <DetailBlock title="Clasificación">
              <InfoRow icon={MapPin} label="Región corporal" value={bodyRegion} />
              <InfoRow icon={Tags} label="Navegación" value={navigationRegion} />
              <InfoRow icon={Dumbbell} label="Grupo principal" value={muscleGroup} />
            </DetailBlock>
          )}
          {(hasText(exercise.primaryMuscles) ||
            secondaryMuscles.length ||
            stabilizerMuscles.length) && (
            <DetailBlock title="Músculos">
              <InfoRow
                icon={Activity}
                label="Principales"
                value={formatList(exercise.primaryMuscles, muscleGroup || "")}
              />
              <InfoRow
                icon={Activity}
                label="Secundarios"
                value={secondaryMuscles.length ? formatList(secondaryMuscles) : ""}
              />
              <InfoRow
                icon={Activity}
                label="Estabilizadores"
                value={stabilizerMuscles.length ? formatList(stabilizerMuscles) : ""}
              />
            </DetailBlock>
          )}
          {(movementPatterns.length ||
            getExerciseType(exercise) ||
            exercise.laterality ||
            mechanics.length ||
            exercise.position) && (
            <DetailBlock title="Movimiento">
              <InfoRow
                icon={Activity}
                label="Patrón"
                value={movementPatterns.length ? formatList(movementPatterns) : ""}
              />
              <InfoRow icon={Activity} label="Tipo" value={getExerciseType(exercise)} />
              <InfoRow icon={Activity} label="Lateralidad" value={exercise.laterality} />
              <InfoRow
                icon={Activity}
                label="Cadena, ejecución y estabilidad"
                value={mechanics.join(" / ")}
              />
              <InfoRow icon={Activity} label="Posición" value={exercise.position} />
            </DetailBlock>
          )}
          {(equipment.length || goals.length) && (
            <DetailBlock title="Uso">
              <InfoRow
                icon={Dumbbell}
                label="Equipamiento"
                value={equipment.length ? formatList(equipment) : ""}
              />
              <InfoRow
                icon={Tags}
                label="Objetivos"
                value={goals.length ? formatList(goals) : ""}
              />
            </DetailBlock>
          )}
        </div>
      )}
    </Modal>
  );
}
