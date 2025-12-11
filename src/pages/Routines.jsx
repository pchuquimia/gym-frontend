import { useMemo, useState } from 'react'
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

  const addExercise = (exerciseName) => {
    if (!exerciseName.trim()) return
    const match = availableExercises.find((ex) => ex.name.toLowerCase() === exerciseName.trim().toLowerCase())
    if (!match) {
      setError('Solo puedes añadir ejercicios que existan en tu biblioteca.')
      return
    }
    setError('')
    setExercises((prev) => [...prev, { name: match.name, exerciseId: match.id, sets: 3 }])
    setSearch('')
  }

  const updateSets = (idx, sets) => {
    setExercises((prev) => prev.map((ex, i) => (i === idx ? { ...ex, sets: Number(sets) || 0 } : ex)))
  }

  const removeExercise = (idx) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = () => {
    if (!name.trim()) return
    const payload = {
      ...initialData,
      id: initialData?.id || slugify(name),
      name: name.trim(),
      description: `${exercises.length} ejercicios.`,
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
      <div className="flex flex-col gap-4">
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
              {availableExercises.map((ex) => (
                <option key={ex.id} value={ex.name} />
              ))}
            </datalist>
            <button className="ghost-btn text-sm" onClick={() => addExercise(search)}>
              + Añadir
            </button>
          </div>
          {error && <p className="text-xs text-accent-red">{error}</p>}
          <div className="flex gap-2 flex-wrap">
            {availableExercises.slice(0, 12).map((item) => (
              <button
                key={item.id}
                className="text-xs px-3 py-1 rounded-full border border-border-soft bg-white/5 hover:border-accent/50"
                onClick={() => addExercise(item.name)}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {exercises.map((ex, idx) => (
            <div
              key={`${ex.name}-${idx}`}
              className="flex items-center gap-2 rounded-full border border-border-soft bg-white/5 px-3 py-2"
            >
              <span className="flex-1 text-sm">{ex.name}</span>
              <div className="flex items-center gap-2 text-xs">
                <span>Series</span>
                <input
                  type="number"
                  min="1"
                  className="w-12 rounded-md border border-border-soft bg-[#121f33] px-2 py-1 text-white text-center"
                  value={ex.sets}
                  onChange={(e) => updateSets(idx, e.target.value)}
                />
              </div>
              <button className="ghost-btn text-sm" onClick={() => removeExercise(idx)}>
                🗑
              </button>
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
      .map((ex) => ({ id: ex.id, name: ex.name }))
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
            <p className="font-semibold">{routine.name}</p>
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
