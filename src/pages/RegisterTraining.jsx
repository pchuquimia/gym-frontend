import { useEffect, useMemo, useRef, useState } from 'react'
import TopBar from '../components/layout/TopBar'
import { useTrainingData } from '../context/TrainingContext'
import { useRoutines } from '../context/RoutineContext'

const slugify = (text) =>
  text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
const formatSeconds = (sec) => {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function RegisterTraining({ onNavigate }) {
  const draftKey = 'training_draft'
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [selectedRoutineId, setSelectedRoutineId] = useState(null)
  const [currentRoutine, setCurrentRoutine] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [exerciseError, setExerciseError] = useState('')
  const [trainingStart, setTrainingStart] = useState(null)
  const [trainingElapsed, setTrainingElapsed] = useState(0)
  const [exerciseTimers, setExerciseTimers] = useState({})
  const [exerciseTick, setExerciseTick] = useState(0)
  const { addSession, addTraining, sessions, exercises: libraryExercises } = useTrainingData()
  const { routines } = useRoutines()
  const autosaveRef = useRef(null)

  const allRoutines = useMemo(() => {
    const libraryIds = new Set(libraryExercises.map((ex) => ex.id))
    const mapped = (routines || [])
      .map((r) => {
        const validWorkouts = (r.exercises || []).filter((ex) => libraryIds.has(ex.exerciseId || slugify(ex.name)))
        return {
          id: r.id,
          name: r.name,
          exercises: validWorkouts.length,
          focus: r.description || '',
          detail: r.description || '',
          icon: '🏋️',
          workouts: validWorkouts.map((ex) => ({
            name: ex.name,
            exerciseId: ex.exerciseId || slugify(ex.name),
            sets: Array.from({ length: ex.sets || 1 }, () => ({ weight: '', reps: '', note: '', done: false })),
          })),
        }
      })
      .filter((r) => r.workouts.length)

    if (!mapped.length) {
      return [
        {
          id: 'entrenamiento-libre',
          name: 'Entrenamiento Libre',
          exercises: 0,
          focus: 'Crea tu sesión',
          detail: 'Añade ejercicios manualmente.',
          icon: '🏋️',
          workouts: [],
        },
      ]
    }
    return mapped
  }, [routines, libraryExercises])

  useEffect(() => {
    let interval
    if (trainingStart) {
      interval = setInterval(() => {
        const diff = Math.floor((Date.now() - trainingStart) / 1000)
        setTrainingElapsed(diff)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [trainingStart])

  useEffect(() => {
    const hasRunning = Object.values(exerciseTimers).some((t) => t?.start)
    if (!hasRunning) return undefined
    const interval = setInterval(() => {
      setExerciseTick((v) => v + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [exerciseTimers])

  useEffect(() => {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(draftKey) : null
    if (stored) {
      try {
        const draft = JSON.parse(stored)
        if (draft.sessionDate) setSessionDate(draft.sessionDate)
        if (draft.currentRoutine) setCurrentRoutine(draft.currentRoutine)
        if (draft.selectedRoutineId) setSelectedRoutineId(draft.selectedRoutineId)
        if (draft.trainingElapsed) setTrainingElapsed(draft.trainingElapsed)
        if (draft.trainingStart) setTrainingStart(draft.trainingStart)
        if (draft.exerciseTimers) setExerciseTimers(draft.exerciseTimers)
        if (draft.photoPreview) setPhotoPreview(draft.photoPreview)
      } catch (e) {
        // ignore parse error
      }
    }
  }, [])

  useEffect(() => {
    if (!selectedRoutineId && allRoutines.length) {
      setSelectedRoutineId(allRoutines[0].id)
      setCurrentRoutine(allRoutines[0])
    }
  }, [allRoutines, selectedRoutineId])

  useEffect(() => {
    if (autosaveRef.current) clearTimeout(autosaveRef.current)
    autosaveRef.current = setTimeout(() => {
      const payload = {
        sessionDate,
        selectedRoutineId,
        currentRoutine,
        trainingStart,
        trainingElapsed,
        exerciseTimers,
        photoPreview,
      }
      localStorage.setItem(draftKey, JSON.stringify(payload))
    }, 800)
    return () => {
      if (autosaveRef.current) clearTimeout(autosaveRef.current)
    }
  }, [sessionDate, selectedRoutineId, currentRoutine, trainingStart, trainingElapsed, exerciseTimers, photoPreview])

  const handleSelectRoutine = (routineId) => {
    const found = allRoutines.find((r) => r.id === routineId) || allRoutines[0]
    setSelectedRoutineId(routineId)
    setCurrentRoutine(JSON.parse(JSON.stringify(found)))
  }

  const getExerciseElapsed = (exerciseId) => {
    const timer = exerciseTimers[exerciseId]
    if (!timer) return 0
    const base = timer.duration || 0
    if (timer.start) {
      return base + Math.floor((Date.now() - timer.start) / 1000)
    }
    return base
  }

  const updateSet = (exerciseIndex, setIndex, field, value) => {
    setCurrentRoutine((prev) => {
      const copy = JSON.parse(JSON.stringify(prev))
      const set = copy.workouts[exerciseIndex].sets[setIndex]
      set[field] = value
      return copy
    })
  }

  const toggleDone = (exerciseIndex, setIndex) => {
    setCurrentRoutine((prev) => {
      const copy = JSON.parse(JSON.stringify(prev))
      copy.workouts[exerciseIndex].sets[setIndex].done = !copy.workouts[exerciseIndex].sets[setIndex].done
      return copy
    })
  }

  const addSet = (exerciseIndex) => {
    setCurrentRoutine((prev) => {
      const copy = JSON.parse(JSON.stringify(prev))
      copy.workouts[exerciseIndex].sets.push({ weight: '', reps: '', note: '', done: false })
      return copy
    })
  }

  const addExercise = () => {
    if (!currentRoutine) return
    const nameToUse = newExerciseName.trim()
    if (!nameToUse) return
    const match = libraryExercises.find((ex) => ex.name.toLowerCase() === nameToUse.toLowerCase())
    if (!match) {
      setExerciseError('Solo puedes añadir ejercicios que estén en tu biblioteca.')
      return
    }
    setExerciseError('')
    const id = match.id || slugify(nameToUse)
    setNewExerciseName('')
    setCurrentRoutine((prev) => ({
      ...prev,
      workouts: [
        ...prev.workouts,
        {
          name: match.name,
          exerciseId: id,
          sets: [{ weight: '', reps: '', note: '', done: false }],
        },
      ],
    }))
  }

  const handlePhoto = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPhotoPreview(url)
      setPhotoFile(file)
    }
  }

  const finalizeTraining = async () => {
    const stamp = Date.now()
    if (!currentRoutine?.workouts?.length) return
    const trainingId = `training-${stamp}`
    let totalVolume = 0
    currentRoutine.workouts.forEach((workout) => {
      totalVolume += workout.sets.reduce((acc, s) => acc + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0)
    })
    await addTraining({
      id: trainingId,
      date: sessionDate,
      durationSeconds: trainingElapsed,
      totalVolume,
      routineName: currentRoutine?.name || '',
    })
    currentRoutine.workouts.forEach((workout, idx) => {
      const exerciseId = workout.exerciseId || slugify(workout.name)
      const parsedSets = workout.sets.map((s) => ({
        reps: Number(s.reps) || 0,
        weight: Number.isFinite(Number(s.weight)) ? Number(s.weight) : 0,
        durationSeconds: workout.sets.length ? Math.round((exerciseTimers[exerciseId]?.duration || 0) / workout.sets.length) : 0,
      }))
      const exerciseDurationSeconds = exerciseTimers[exerciseId]?.duration || 0
      const includePhoto = idx === 0 && photoFile
      const session = {
        id: `sess-${stamp}-${idx}`,
        trainingId,
        date: sessionDate,
        exerciseId,
        exerciseName: workout.name,
        sets: parsedSets,
        trainingDurationSeconds: trainingElapsed,
        exerciseDurationSeconds,
        photoUrl: '',
        photoFile: includePhoto ? photoFile : undefined,
        photoType: includePhoto ? 'gym' : '',
        photoPersisted: false,
      }
      addSession(session)
      localStorage.setItem('last_exercise_id', exerciseId)
    })
    setTrainingStart(null)
    setTrainingElapsed(0)
    setExerciseTimers({})
    setPhotoPreview(null)
    setPhotoFile(null)
    localStorage.removeItem(draftKey)
    onNavigate?.('historial')
  }

  const startTraining = () => {
    if (!trainingStart) {
      setTrainingStart(Date.now())
      setTrainingElapsed(0)
    }
  }

  const stopExercise = (exerciseId) => {
    setExerciseTimers((prev) => {
      const current = prev[exerciseId] || {}
      const start = current.start
      if (!start) return prev
      const duration = (current.duration || 0) + Math.floor((Date.now() - start) / 1000)
      return { ...prev, [exerciseId]: { duration, start: null } }
    })
  }

  const saveDraft = () => {
    const payload = {
      sessionDate,
      selectedRoutineId,
      currentRoutine,
      trainingStart,
      trainingElapsed,
      exerciseTimers,
      photoPreview,
    }
    localStorage.setItem(draftKey, JSON.stringify(payload))
  }

  const startExercise = (exerciseId) => {
    setExerciseTimers((prev) => ({
      ...prev,
      [exerciseId]: { duration: prev[exerciseId]?.duration || 0, start: Date.now() },
    }))
  }

  const routineCards = useMemo(
    () =>
      allRoutines.map((routine) => (
        <button
          key={routine.id}
          type="button"
          onClick={() => handleSelectRoutine(routine.id)}
          className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${
            selectedRoutineId === routine.id
              ? 'border-accent/40 bg-gradient-to-br from-accent/15 to-blue-900/30 shadow-lg shadow-accent/10'
              : 'border-border-soft bg-white/5 hover:border-accent/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl grid place-items-center text-xl ${
                selectedRoutineId === routine.id ? 'bg-accent text-bg-darker' : 'bg-white/5 text-accent'
              }`}
            >
              {routine.icon || '🏋️'}
            </div>
            <div className="flex flex-col">
              <h3 className="text-base font-semibold">{routine.name}</h3>
              <p className="text-xs text-muted">
                {routine.exercises} ejercicios · {routine.detail}
              </p>
            </div>
          </div>
        </button>
      )),
    [allRoutines, selectedRoutineId],
  )

  const getReference = (exerciseId, setIndex = null) => {
    const filtered = sessions.filter((s) => s.exerciseId === exerciseId)
    if (!filtered.length) return { label: 'Sin registros', date: '' }

    let best = { weight: 0, reps: 0, date: '' }
    filtered.forEach((session) => {
      const setsToCheck =
        setIndex === null
          ? session.sets
          : session.sets[setIndex] !== undefined
            ? [session.sets[setIndex]]
            : []
      setsToCheck.forEach((set) => {
        const w = Number(set.weight) || 0
        const r = Number(set.reps) || 0
        if (w > best.weight || (w === best.weight && r > best.reps)) {
          best = { weight: w, reps: r, date: session.date }
        }
      })
    })

    if (best.weight === 0) return { label: 'Sin registros', date: '' }
    const label = `PR: ${best.weight} kg x ${best.reps}`
    return { label, date: formatDate(best.date) }
  }

  if (!currentRoutine) {
    return (
      <>
        <TopBar
          title="Registrar Entrenamiento (Navegación Completa)"
          subtitle="Selecciona una rutina, registra tus series y añade una foto de progreso al finalizar"
        />
        <div className="card">No hay rutinas disponibles. Crea una en Rutinas y Planificación.</div>
      </>
    )
  }

  return (
    <>
      <TopBar
        title="Registrar Entrenamiento (Navegación Completa)"
        subtitle="Selecciona una rutina, registra tus series y añade una foto de progreso al finalizar"
      />

      <div className="card flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold">Elige tu rutina para hoy</p>
            <div className="grid gap-3 md:grid-cols-3">{routineCards}</div>
          </div>
          <div className="flex flex-col gap-1">
            <p className="label">Fecha</p>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="rounded-full border border-border-soft bg-white/5 px-4 py-2 text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <p className="label">Duración Entrenamiento</p>
            <div className="flex items-center gap-2">
              <button className="ghost-btn text-sm" onClick={startTraining} disabled={!!trainingStart}>
                Iniciar entrenamiento
              </button>
              <span className="text-sm text-muted">{formatSeconds(trainingElapsed)}</span>
            </div>
          </div>
        </div>
      </div>

      <section className="card flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-xl font-semibold">Rutina: {currentRoutine.name}</h3>
            <p className="text-sm text-muted">Completa peso y repeticiones para cada set</p>
          </div>
          <div className="flex items-center gap-2 text-muted text-sm">
            <span className="w-3 h-3 rounded-full bg-accent/70 shadow-[0_0_8px_rgba(79,163,255,0.6)]" />
            {sessionDate
              ? new Date(`${sessionDate}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
              : ''}
          </div>
        </div>

        <div className="rounded-2xl border border-border-soft overflow-hidden bg-white/3">
          <div className="grid grid-cols-[1.5fr_0.4fr_0.8fr_0.8fr_0.8fr_0.4fr] px-4 py-3 text-sm font-semibold text-muted bg-black/20">
            <span>Ejercicio</span>
            <span className="text-center">Set</span>
            <span>Referencia (PR / Último)</span>
            <span>Peso (kg)</span>
            <span>Repeticiones</span>
            <span className="text-center">Hecho</span>
          </div>
          <div className="divide-y divide-border-soft/60">
            {currentRoutine.workouts.map((exercise, exerciseIndex) => (
              <div key={exercise.name} className="px-4 py-3 space-y-2 bg-white/2">
                <div className="grid grid-cols-[1.5fr_0.4fr_0.8fr_0.8fr_0.8fr_0.4fr] items-center gap-3">
                  <div className="font-semibold">{exercise.name}</div>
                  <span className="text-xs text-muted">⏱</span>
                  {(() => {
                    const ref = getReference(exercise.exerciseId || slugify(exercise.name))
                    return (
                      <div className="text-sm text-muted">
                        {ref.label} {ref.date && `· ${ref.date}`}
                      </div>
                    )
                  })()}
                  <span />
                  <span />
                  <span />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted pl-6">
                  <button
                    type="button"
                    className="ghost-btn text-xs"
                    onClick={() => startExercise(exercise.exerciseId || slugify(exercise.name))}
                  >
                    Iniciar ejercicio
                  </button>
                  <button
                    type="button"
                    className="ghost-btn text-xs"
                    onClick={() => stopExercise(exercise.exerciseId || slugify(exercise.name))}
                  >
                    Terminar ejercicio
                  </button>
                  <span>{formatSeconds(getExerciseElapsed(exercise.exerciseId || slugify(exercise.name)))}</span>
                </div>
                <div className="space-y-2">
                  {exercise.sets.map((set, setIndex) => (
                    <div
                      key={setIndex}
                      className="grid grid-cols-[1.5fr_0.4fr_0.8fr_0.8fr_0.8fr_0.4fr] items-center gap-3 pl-6"
                    >
                      <div />
                      <span className="text-sm text-muted">{setIndex + 1}</span>
                      {(() => {
                        const ref = getReference(exercise.exerciseId || slugify(exercise.name), setIndex)
                        return (
                          <span className="text-[11px] text-muted flex flex-col leading-tight">
                            <span>{ref.label}</span>
                            {ref.date && <span>{ref.date}</span>}
                          </span>
                        )
                      })()}
                      <input
                        className="w-full rounded-full border border-border-soft bg-[#121f33] px-3 py-2 text-white"
                        value={set.weight}
                        onChange={(e) => updateSet(exerciseIndex, setIndex, 'weight', e.target.value)}
                        placeholder="kg"
                      />
                      <input
                        className="w-full rounded-full border border-border-soft bg-[#121f33] px-3 py-2 text-white"
                        value={set.reps}
                        onChange={(e) => updateSet(exerciseIndex, setIndex, 'reps', e.target.value)}
                        placeholder="reps"
                      />
                      <button
                        type="button"
                        onClick={() => toggleDone(exerciseIndex, setIndex)}
                        className="mx-auto w-5 h-5 rounded-full border border-border-soft bg-white/5 flex items-center justify-center"
                        aria-label="Marcar set completado"
                      >
                        <span
                          className={`w-3 h-3 rounded-full ${
                            set.done ? 'bg-accent shadow-[0_0_8px_rgba(79,163,255,0.6)]' : 'bg-transparent'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="w-full text-center text-sm text-accent font-semibold py-2 border border-dashed border-accent/40 rounded-lg hover:bg-accent/10 transition-colors"
                    onClick={() => addSet(exerciseIndex)}
                  >
                    + Añadir Set
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="card space-y-3">
        <div>
          <h3 className="text-lg font-semibold">Foto de Progreso del Día</h3>
          <p className="text-sm text-muted">
            Añade una foto para documentar tu progreso. Esta imagen se guardará junto con los detalles del entrenamiento y en tu Biblioteca de Fotos.
          </p>
        </div>
        <label className="w-full border-2 border-dashed border-border-soft rounded-2xl min-h-[220px] grid place-items-center text-center cursor-pointer hover:border-accent/60 transition-colors">
          <div className="flex flex-col items-center gap-2">
            {photoPreview ? (
              <img src={photoPreview} alt="Vista previa" className="w-full max-h-72 object-cover rounded-xl" />
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-white/5 grid place-items-center text-xl text-muted">📷</div>
                <p className="text-sm text-muted">
                  Haz clic para subir o arrastra y suelta <br />
                  <span className="text-xs">PNG, JPG o GIF (max. 10MB)</span>
                </p>
              </>
            )}
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </label>
      </section>

      <div className="flex flex-col md:flex-row md:justify-end gap-3">
        <button className="ghost-btn w-full md:w-auto">Cancelar</button>
        <button className="ghost-btn w-full md:w-auto" onClick={saveDraft}>
          Guardar como Borrador
        </button>
        <button className="primary-btn w-full md:w-auto" onClick={finalizeTraining}>
          Finalizar Entrenamiento
        </button>
      </div>
    </>
  )
}

export default RegisterTraining
