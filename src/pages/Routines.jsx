import { useEffect, useMemo, useState } from 'react'
import TopBar from '../components/layout/TopBar'
import Modal from '../components/shared/Modal'
import { useRoutines } from '../context/RoutineContext'
import { useTrainingData } from '../context/TrainingContext'

const slugify = (text) =>
  text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

function RoutineModal({ mode = 'create', initialData, onSave, onClose, availableExercises }) {
  const [name, setName] = useState(initialData?.name || '')
  const [exercises, setExercises] = useState(initialData?.exercises || [])
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [branch, setBranch] = useState(initialData?.branch || 'general')
  const [branchError, setBranchError] = useState('')
  const [selectedMuscle, setSelectedMuscle] = useState(availableExercises?.[0]?.muscle || 'Pecho')

  const muscleOptions = useMemo(() => {
    const set = new Set()
    availableExercises.forEach((ex) => {
      if (ex.muscle) set.add(ex.muscle)
    })
    const list = Array.from(set)
    return list.length ? list : ['Pecho']
  }, [availableExercises])

  useEffect(() => {
    if (!muscleOptions.includes(selectedMuscle)) {
      setSelectedMuscle(muscleOptions[0] || 'Pecho')
    }
  }, [muscleOptions, selectedMuscle])

  useEffect(() => {
    if (initialData?.exercises?.length) {
      const withMeta = initialData.exercises.map((ex) => {
        const meta =
          availableExercises.find((a) => a.id === ex.exerciseId || a.id === ex.id || a.name === ex.name) || {}
        return { ...ex, muscle: ex.muscle || meta.muscle, image: ex.image || meta.image }
      })
      setExercises(withMeta)
    }
  }, [initialData, availableExercises])

  const branchMatches = (ex) => {
    if (!branch || branch === 'general') return true
    const b = ex.branches || []
    return b.includes(branch) || b.includes('general')
  }

  const filteredExercises = useMemo(
    () => availableExercises.filter((ex) => branchMatches(ex) && (!selectedMuscle || ex.muscle === selectedMuscle)),
    [availableExercises, selectedMuscle, branch],
  )

  const addExercise = (exerciseName) => {
    if (!exerciseName.trim()) return
    const match = availableExercises.find(
      (ex) => ex.name.toLowerCase() === exerciseName.trim().toLowerCase() && branchMatches(ex),
    )
    if (!match) {
      setError('Solo puedes agregar ejercicios disponibles en esta sede.')
      return
    }
    setError('')
    setExercises((prev) => [
      ...prev,
      { name: match.name, exerciseId: match.id, sets: 3, muscle: match.muscle, image: match.image },
    ])
    setSearch('')
  }

  const addExerciseFromLibrary = (exercise) => {
    if (!exercise || !branchMatches(exercise)) {
      setError('Solo puedes agregar ejercicios disponibles en esta sede.')
      return
    }
    setError('')
    setExercises((prev) => [
      ...prev,
      { name: exercise.name, exerciseId: exercise.id, sets: 3, muscle: exercise.muscle, image: exercise.image },
    ])
  }

  const updateSets = (idx, sets) => {
    setExercises((prev) => prev.map((ex, i) => (i === idx ? { ...ex, sets: Number(sets) || 0 } : ex)))
  }

  const removeExercise = (idx) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx))
  }

  const groupedExercises = useMemo(() => {
    const map = new Map()
    exercises.forEach((ex, idx) => {
      const key = ex.muscle || 'Sin grupo'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push({ ...ex, idx })
    })
    return Array.from(map.entries())
  }, [exercises])

  const handleSubmit = () => {
    if (!name.trim()) return
    if (!branch) {
      setBranchError('Selecciona la sede para esta rutina.')
      return
    }
    setBranchError('')
    const payload = {
      ...initialData,
      id: initialData?.id || slugify(name),
      name: name.trim(),
      description: `${exercises.length} ejercicios.`,
      branch,
      exercises: exercises.map((ex) => ({
        ...ex,
        exerciseId: ex.exerciseId || slugify(ex.name),
      })),
    }
    onSave(payload)
  }

  return (
    <Modal
      title={mode === 'create' ? 'Crear Nueva Rutina' : 'Editar Rutina'}
      subtitle="Busca y añade ejercicios desde la biblioteca."
      onClose={onClose}
      footer={
        <>
          <button className="ghost-btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-btn" onClick={handleSubmit}>
            {mode === 'create' ? 'Guardar Rutina' : 'Guardar Cambios'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4 h-full">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Nombre de la Rutina</p>
          <input
            className="rounded-full border border-border-soft bg-white/5 px-4 py-3 text-white"
            placeholder="Ej. Día de Pierna"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Sede / Gym</p>
          <div className="flex gap-2 flex-wrap">
            {['general', 'sopocachi', 'miraflores'].map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBranch(b)}
                className={`px-4 py-2 rounded-full border text-sm transition ${
                  branch === b
                    ? 'border-accent bg-accent/15 text-white shadow-[0_0_10px_rgba(79,163,255,0.3)]'
                    : 'border-border-soft bg-white/5 text-muted hover:border-accent/40'
                }`}
              >
                {b === 'general' ? 'General' : b.charAt(0).toUpperCase() + b.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">Define en qu゚ sede aplica esta rutina. General = visible para todas.</p>
          {branchError && <p className="text-xs text-accent-red">{branchError}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Elige grupo muscular</p>
          <div className="flex gap-2 flex-wrap">
            {muscleOptions.map((muscle) => (
              <button
                key={muscle}
                type="button"
                onClick={() => setSelectedMuscle(muscle)}
                className={`px-3 py-2 rounded-full border text-sm transition ${
                  selectedMuscle === muscle
                    ? 'border-accent bg-accent/15 text-white shadow-[0_0_10px_rgba(79,163,255,0.3)]'
                    : 'border-border-soft bg-white/5 text-muted hover:border-accent/40'
                }`}
              >
                {muscle}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">Primero selecciona el grupo; abajo ver?s los ejercicios de tu biblioteca para ese m?sculo.</p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Ejercicios sugeridos de {selectedMuscle}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredExercises.map((ex) => (
              <div
                key={ex.id}
                className="rounded-2xl border border-border-soft bg-white/5 p-3 flex flex-col gap-2 shadow-sm"
              >
                <div className="h-28 rounded-xl overflow-hidden border border-border-soft bg-white/10 grid place-items-center">
                  {ex.image ? (
                    <img src={ex.image} alt={ex.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-muted text-sm">Sin imagen</div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm leading-tight">{ex.name}</p>
                    <p className="text-xs text-muted">{ex.muscle}</p>
                  </div>
                  <button className="ghost-btn text-xs" type="button" onClick={() => addExerciseFromLibrary(ex)}>
                    Agregar
                  </button>
                </div>
              </div>
            ))}
            {filteredExercises.length === 0 && (
              <div className="border border-dashed border-border-soft rounded-xl p-3 text-sm text-muted">
                No hay ejercicios para este grupo muscular.
              </div>
            )}
          </div>
        </div>


        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Ejercicios (solo desde tu biblioteca)</p>
          <div className="flex gap-2 flex-wrap">
            <input
              className="flex-1 rounded-full border border-border-soft bg-white/5 px-4 py-3 text-white"
              placeholder="Buscar ejercicio en la biblioteca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              list="exercise-options"
            />
            <datalist id="exercise-options">
              {filteredExercises.map((ex) => (
                <option key={ex.id} value={ex.name} />
              ))}
            </datalist>
            <button className="ghost-btn text-sm" onClick={() => addExercise(search)}>
              + Añadir
            </button>
          </div>
          {error && <p className="text-xs text-accent-red">{error}</p>}
        </div>

              <div className="flex flex-col gap-3">
          {groupedExercises.map(([muscle, items]) => (
            <div key={muscle} className="rounded-2xl border border-border-soft bg-white/5 p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{muscle}</p>
                <span className="text-xs text-muted">{items.length} ejercicios</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((ex) => (
                  <div
                    key={`${ex.name}-${ex.idx}`}
                    className="flex gap-3 rounded-xl border border-border-soft bg-[#121f33] p-3 items-center"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-border-soft bg-white/10 flex-shrink-0 grid place-items-center">
                      {ex.image ? (
                        <img src={ex.image} alt={ex.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-muted text-sm">{(ex.name || '?').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{ex.name}</p>
                      <div className="flex items-center gap-2 text-xs mt-1">
                        <span>Series</span>
                        <input
                          type="number"
                          min="1"
                          className="w-14 rounded-md border border-border-soft bg-bg-darker px-2 py-1 text-white text-center"
                          value={ex.sets}
                          onChange={(e) => updateSets(ex.idx, e.target.value)}
                        />
                      </div>
                    </div>
                    <button className="ghost-btn text-sm" onClick={() => removeExercise(ex.idx)}>
                      🗑
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

function Routines() {
  const { routines, addRoutine, updateRoutine, deleteRoutine, duplicateRoutine } = useRoutines()
  const [modalMode, setModalMode] = useState(null)
  const [selectedRoutine, setSelectedRoutine] = useState(null)
  const { exercises: libraryExercises } = useTrainingData()

  const availableExercises = useMemo(() => {
    const seen = new Set()
    return libraryExercises
      .filter((ex) => {
        if (seen.has(ex.id)) return false
        seen.add(ex.id)
        return true
      })
      .map((ex) => ({ id: ex.id, name: ex.name, muscle: ex.muscle, image: ex.image, branches: ex.branches }))
  }, [libraryExercises])

  const openCreate = () => {
    setSelectedRoutine(null)
    setModalMode('create')
  }

  const openEdit = (routine) => {
    setSelectedRoutine(routine)
    setModalMode('edit')
  }

  const closeModal = () => {
    setSelectedRoutine(null)
    setModalMode(null)
  }

  const handleSave = (routine) => {
    if (modalMode === 'create') addRoutine(routine)
    if (modalMode === 'edit') updateRoutine(routine.id, routine)
    closeModal()
  }

  const routineCards = useMemo(
    () =>
      routines.map((routine) => (
        <div
          key={routine.id}
          className="flex items-center gap-3 rounded-2xl border border-border-soft bg-white/5 px-4 py-3"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold">{routine.name}</p>
              <span className="text-xs px-2.5 py-1 rounded-full border border-border-soft bg-white/10 text-muted">
                {(() => {
                  const b = routine.branch || 'general'
                  return b === 'general' ? 'General' : b.charAt(0).toUpperCase() + b.slice(1)
                })()}
              </span>
            </div>
            <p className="text-sm text-muted">{routine.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="ghost-btn text-sm" onClick={() => openEdit(routine)} aria-label="Editar rutina">
              ✏️
            </button>
            <button className="ghost-btn text-sm" onClick={() => duplicateRoutine(routine.id)} aria-label="Duplicar rutina">
              📄
            </button>
            <button className="ghost-btn text-sm" onClick={() => deleteRoutine(routine.id)} aria-label="Eliminar rutina">
              🗑
            </button>
          </div>
        </div>
      )),
    [routines],
  )

  return (
    <>
      <TopBar
        title="Rutinas y Planificación (Navegación Completa)"
        subtitle="Crea, gestiona y monitorea tus planes de entrenamiento."
        ctaLabel="+ Crear Nueva Rutina"
        onCta={openCreate}
      />

      <section className="card flex flex-col gap-3">
        <h3 className="text-lg font-semibold">Mis Rutinas</h3>
        <div className="flex flex-col gap-2">{routineCards}</div>
      </section>

      {modalMode && (
        <RoutineModal
          mode={modalMode}
          initialData={selectedRoutine}
          availableExercises={availableExercises}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
    </>
  )
}

export default Routines
