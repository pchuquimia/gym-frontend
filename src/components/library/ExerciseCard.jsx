import { useState } from 'react'

function ExerciseCard({ exercise, onView, onEdit, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const branches = exercise.branches?.length ? exercise.branches : ['general']
  const branchLabels = branches.map((b) => b.charAt(0).toUpperCase() + b.slice(1)).join(' · ')

  return (
    <article
      className={`glass-card border ${exercise.type === 'custom' ? 'border-accent/50' : 'border-border-soft'} rounded-2xl flex flex-col overflow-visible`}
    >
      <button type="button" className="relative rounded-t-2xl overflow-hidden" onClick={() => onView(exercise)}>
        <img src={exercise.image} alt={exercise.name} loading="lazy" className="w-full h-40 object-cover" />
        {exercise.type === 'custom' && (
          <span className="absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-accent to-accent-green text-bg-darker">
            Personalizado
          </span>
        )}
        <span className="absolute top-2 left-2 px-3 py-1 rounded-full text-[11px] font-semibold bg-white/10 border border-border-soft text-white">
          {branchLabels}
        </span>
      </button>
      <div className="p-3 flex flex-col gap-3 rounded-b-2xl">
        <div>
          <p className="label">{exercise.muscle}</p>
          <h4 className="font-semibold">{exercise.name}</h4>
        </div>
        <div className="flex items-center justify-between">
          <button type="button" className="ghost-btn text-sm" onClick={() => onView(exercise)}>
            Ver
          </button>
          <div className="relative">
            <button
              type="button"
              className="ghost-btn text-sm px-2"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Más acciones"
            >
              ⋮
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-1 w-36 rounded-lg border border-border-soft bg-bg-darker shadow-lg z-20">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-white/5"
                  onClick={() => {
                    onEdit(exercise)
                    setMenuOpen(false)
                  }}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm text-accent-red hover:bg-white/5"
                  onClick={() => {
                    onDelete(exercise)
                    setMenuOpen(false)
                  }}
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

export default ExerciseCard
