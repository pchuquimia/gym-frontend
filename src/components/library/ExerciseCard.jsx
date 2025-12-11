function ExerciseCard({ exercise, onView, onEdit, onDelete }) {
  return (
    <article
      className={`glass-card border ${exercise.type === 'custom' ? 'border-accent/50' : 'border-border-soft'} rounded-2xl overflow-hidden flex flex-col`}
    >
      <button type="button" className="relative" onClick={() => onView(exercise)}>
        <img src={exercise.image} alt={exercise.name} loading="lazy" className="w-full h-40 object-cover" />
        {exercise.type === 'custom' && (
          <span className="absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-accent to-accent-green text-bg-darker">
            Personalizado
          </span>
        )}
      </button>
      <div className="p-3 flex flex-col gap-3">
        <div>
          <p className="label">{exercise.muscle}</p>
          <h4 className="font-semibold">{exercise.name}</h4>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="ghost-btn text-sm" onClick={() => onView(exercise)}>
            Ver
          </button>
          <button type="button" className="ghost-btn text-sm" onClick={() => onEdit(exercise)}>
            Editar
          </button>
          <button type="button" className="ghost-btn text-sm border-accent-red/60 text-accent-red" onClick={() => onDelete(exercise)}>
            Eliminar
          </button>
        </div>
      </div>
    </article>
  )
}

export default ExerciseCard
