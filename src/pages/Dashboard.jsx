import { useEffect, useMemo, useState } from 'react'
import { ResponsiveLine } from '@nivo/line'
import TopBar from '../components/layout/TopBar'
import { useTrainingData } from '../context/TrainingContext'
import MuscleProgressWidget from '../components/analytics/MuscleProgressWidget'

const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })

const toReps = (sets = []) => sets.reduce((acc, s) => acc + (Number(s.reps) || 0), 0)
const avgWeight = (sets = []) => {
  const weights = sets
    .map((s) => Number(s.weight))
    .filter((w) => Number.isFinite(w) && w >= 0)
  if (!weights.length) return 0
  return weights.reduce((a, b) => a + b, 0) / weights.length
}

const chartTheme = {
  background: 'transparent',
  textColor: '#d1d5db',
  axis: {
    domain: { line: { stroke: '#2c3a50', strokeWidth: 1 } },
    ticks: { line: { stroke: '#2c3a50', strokeWidth: 1 }, text: { fill: '#94a3b8', fontSize: 11 } },
    legend: { text: { fill: '#94a3b8', fontSize: 12 } },
  },
  grid: { line: { stroke: '#1e293b', strokeWidth: 1 } },
  legends: { text: { fill: '#e2e8f0', fontSize: 12 } },
  tooltip: { container: { background: '#0b1626', color: '#e2e8f0', fontSize: 12 } },
}

function Dashboard({ onNavigate }) {
  const { sessions = [], trainings = [], photos = [], exercises = [] } = useTrainingData()
  const [currentMuscleIdx, setCurrentMuscleIdx] = useState(0)

  const todayISO = useMemo(() => {
    const now = new Date()
    const offset = now.getTimezoneOffset()
    const local = new Date(now.getTime() - offset * 60000)
    return local.toISOString().slice(0, 10)
  }, [])

  const data = useMemo(() => {
    const exerciseMeta = exercises.reduce((acc, ex) => {
      acc[ex.id] = ex
      return acc
    }, {})

    const sessionsSorted = [...sessions].sort((a, b) => new Date(a.date) - new Date(b.date))

    const previousByExercise = {}
    sessionsSorted.forEach((s) => {
      if (s.date >= todayISO) return
      const reps = toReps(s.sets)
      const key = s.exerciseId
      if (!key) return
      if (!previousByExercise[key] || new Date(s.date) > new Date(previousByExercise[key].date)) {
        previousByExercise[key] = { reps, date: s.date }
      }
    })

    const sessionsToday = sessions.filter((s) => s.date === todayISO)
    const todayRoutine = trainings.find((t) => t.date === todayISO)?.routineName || 'Sin rutina'
    const todayReps = sessionsToday.reduce((acc, s) => acc + toReps(s.sets), 0)
    const todaySets = sessionsToday.reduce((acc, s) => acc + (s.sets?.length || 0), 0)
    const todayExercises = sessionsToday.map((s) => {
      const reps = toReps(s.sets)
      const prev = previousByExercise[s.exerciseId]
      let status = 'nuevo'
      if (prev && prev.date !== s.date) {
        if (reps > prev.reps) status = 'mejora'
        else if (reps === prev.reps) status = 'mantiene'
        else status = 'baja'
      }
      return {
        id: s.exerciseId,
        name: s.exerciseName,
        reps,
        status,
        muscle: exerciseMeta[s.exerciseId]?.muscle || 'Sin grupo',
        sets: s.sets?.length || 0,
      }
    })

    const last7 = []
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(todayISO)
      d.setDate(d.getDate() - i)
      const iso = d.toISOString().slice(0, 10)
      const reps = sessions
        .filter((s) => s.date === iso)
        .reduce((acc, s) => acc + toReps(s.sets), 0)
      last7.push({ label: formatDate(iso), y: reps })
    }

    const bestByExercise = {}
    const prs = []
    sessionsSorted.forEach((s) => {
      const reps = toReps(s.sets)
      const prev = bestByExercise[s.exerciseId]
      if (!prev || reps > prev.reps) {
        if (prev) {
          prs.push({
            name: s.exerciseName,
            reps,
            date: s.date,
            diff: reps - prev.reps,
          })
        }
        bestByExercise[s.exerciseId] = { reps, date: s.date }
      }
    })
    const recentPRs = prs.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)

    const lastPhotos = [...photos].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3)

    const totalExerciseDurationMin = Math.round(
      sessions.reduce((acc, s) => acc + (Number(s.exerciseDurationSeconds) || 0), 0) / 60,
    )

    const trainingDurationTodayMin = Math.round(
      trainings
        .filter((t) => t.date === todayISO)
        .reduce((acc, t) => acc + (Number(t.durationSeconds) || 0), 0) / 60,
    )

    // Serie de rendimiento por ejercicio más frecuente
    const byExerciseCount = sessionsSorted.reduce((acc, s) => {
      acc[s.exerciseId] = (acc[s.exerciseId] || 0) + 1
      return acc
    }, {})
    const mostUsedExerciseId = Object.entries(byExerciseCount).sort((a, b) => b[1] - a[1])[0]?.[0]
    const performanceSeries = mostUsedExerciseId
      ? [
          {
            id: exerciseMeta[mostUsedExerciseId]?.name || 'Ejercicio',
            data: sessionsSorted
              .filter((s) => s.exerciseId === mostUsedExerciseId)
              .map((s) => ({ x: formatDate(s.date), y: toReps(s.sets) })),
          },
        ]
      : []

    const exerciseSeries = Array.from(new Set(todayExercises.map((e) => e.id || e.name))).map((exerciseId) => {
      const entries = sessionsSorted
        .filter((s) => s.exerciseId === exerciseId)
        .map((s) => ({ date: s.date, weight: avgWeight(s.sets) }))
      const series = entries
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-7)
        .map((e) => ({ label: formatDate(e.date), y: e.weight }))
      return { exerciseId, name: exerciseMeta[exerciseId]?.name || exerciseId, series }
    })

    return {
      today: {
        routine: todayRoutine,
        reps: todayReps,
        sets: todaySets,
        exercises: todayExercises,
      },
      weeklyTrend: last7,
      prs: recentPRs,
      photos: lastPhotos,
      totalExerciseDurationMin,
      performanceSeries,
      exerciseSeries,
      trainingDurationTodayMin,
    }
  }, [sessions, trainings, exercises, photos, todayISO])

  const workoutsForAnalytics = useMemo(
    () =>
      sessions
        .filter((s) => s.exerciseId && Array.isArray(s.sets) && s.sets.length)
        .map((s) => ({
          exerciseId: s.exerciseId,
          date: s.date,
          sets: (s.sets || []).map((set) => ({ weight: Number(set.weight) || 0, reps: Number(set.reps) || 0 })),
        })),
    [sessions],
  )

  const weeklyLineData = useMemo(
    () => [
      {
        id: 'Volumen',
        data: data.weeklyTrend.map((p) => ({ x: p.label, y: p.y })),
      },
    ],
    [data.weeklyTrend],
  )

  const currentMuscleLine = useMemo(() => {
    const entry = data.exerciseSeries[currentMuscleIdx]
    if (!entry) return []
    return [{ id: entry.name, data: entry.series.map((p) => ({ x: p.label, y: p.y })) }]
  }, [data.exerciseSeries, currentMuscleIdx])

  const currentMaxY = useMemo(() => {
    if (!currentMuscleLine.length) return null
    const vals = currentMuscleLine[0].data.map((d) => Number(d.y) || 0)
    if (!vals.length) return null
    const max = Math.max(...vals)
    return max <= 0 ? null : Math.max(max * 2, max + 20)
  }, [currentMuscleLine])

  return (
    <>
      <TopBar
        title="Dashboard de Progreso"
        subtitle="Resumen diario, tendencias y comparativas con tus últimos entrenamientos"
        ctaLabel="Registrar entrenamiento"
        onCta={() => onNavigate?.('registrar')}
      />

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-4">
          <MuscleProgressWidget
            workouts={workoutsForAnalytics}
            rangeWeeks={12}
            mode="dark"
            onViewDetails={() => onNavigate?.('ejercicio_analitica')}
          />
          {/* Resumen de hoy */}
          <div className="card border border-border-soft/70 bg-gradient-to-br from-[#0f1e33] to-[#0a1423]">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-xs text-muted">Hoy · {formatDate(todayISO)}</p>
                <h3 className="text-xl font-semibold">Resumen del entrenamiento</h3>
                <p className="text-sm text-muted">Rutina: {data.today.routine}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs text-muted border border-border-soft">
                  Ejercicios: <span className="text-white font-semibold">{data.today.exercises.length}</span>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs text-muted border border-border-soft">
                  Sets: <span className="text-white font-semibold">{data.today.sets}</span>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs text-muted border border-border-soft">
                  Reps: <span className="text-white font-semibold">{data.today.reps}</span>
                </div>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 mt-3">
              <div className="space-y-2">
                {data.today.exercises.length ? (
                  <>
                    {data.today.exercises.slice(0, 5).map((ex) => (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between rounded-lg border border-border-soft/40 bg-white/5 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              ex.status === 'mejora'
                                ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.6)]'
                                : ex.status === 'baja'
                                  ? 'bg-rose-400 shadow-[0_0_5px_rgba(251,113,133,0.6)]'
                                  : 'bg-amber-300 shadow-[0_0_5px_rgba(252,211,77,0.6)]'
                            }`}
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">{ex.name}</span>
                            <span className="text-[11px] text-muted">{ex.muscle}</span>
                          </div>
                        </div>
                        <div className="text-right text-xs leading-tight">
                          <p className="font-semibold">{ex.reps} reps</p>
                          <p className="text-muted capitalize">{ex.status}</p>
                          <p className="text-muted">{ex.sets} sets</p>
                        </div>
                      </div>
                    ))}
                    {data.today.exercises.length > 5 && (
                      <p className="text-[11px] text-muted">
                        +{data.today.exercises.length - 5} ejercicios más
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted">Aún no registraste ejercicios hoy.</p>
                )}
              </div>
              <div className="rounded-2xl border border-border-soft/60 bg-gradient-to-br from-[#101b2d] to-[#0c1423] p-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Peso promedio (últimos entrenamientos)</span>
                    {data.exerciseSeries.length > 0 && (
                      <span className="text-xs text-muted border border-border-soft rounded-full px-2 py-0.5">
                        {data.exerciseSeries[currentMuscleIdx]?.name || 'Ejercicio'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="ghost-btn text-xs px-2"
                      type="button"
                      onClick={() =>
                        setCurrentMuscleIdx((idx) =>
                          data.exerciseSeries.length
                            ? (idx - 1 + data.exerciseSeries.length) % data.exerciseSeries.length
                            : 0,
                        )
                      }
                    >
                      ←
                    </button>
                    <button
                      className="ghost-btn text-xs px-2"
                      type="button"
                      onClick={() =>
                        setCurrentMuscleIdx((idx) =>
                          data.exerciseSeries.length ? (idx + 1) % data.exerciseSeries.length : 0,
                        )
                      }
                    >
                      →
                    </button>
                  </div>
                </div>
                {currentMuscleLine.length ? (
                  <div className="h-56 w-full">
                    <ResponsiveLine
                      data={currentMuscleLine}
                      theme={chartTheme}
                      margin={{ top: 14, right: 18, bottom: 34, left: 50 }}
                      xScale={{ type: 'point' }}
                      yScale={{ type: 'linear', min: 0, max: currentMaxY || 'auto', stacked: false }}
                      axisBottom={{ tickSize: 0, tickPadding: 10, tickRotation: -15 }}
                      axisLeft={{ tickSize: 0, tickPadding: 8, tickFormat: (v) => `${v} kg` }}
                      curve="monotoneX"
                      enablePoints
                      pointSize={8}
                      pointBorderWidth={2}
                      pointBorderColor={{ from: 'color', modifiers: [['darker', 1]] }}
                      enableArea
                      areaOpacity={0.28}
                      colors={['#7c3aed']}
                      defs={[
                        {
                          id: 'lineGradient',
                          type: 'linearGradient',
                          colors: [
                            { offset: 0, color: '#7c3aed' },
                            { offset: 100, color: '#38bdf8' },
                          ],
                        },
                      ]}
                      fill={[{ match: '*', id: 'lineGradient' }]}
                      useMesh
                      enableGridX={false}
                      enableGridY={false}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted mt-2">Aún no hay suficientes registros de peso para este ejercicio.</p>
                )}
              </div>
            </div>
          </div>

          {/* PRs */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Mejores marcas recientes</h3>
              <span className="text-xs text-muted">Top 5</span>
            </div>
            {data.prs.length ? (
              <div className="space-y-2">
                {data.prs.map((pr) => (
                  <div
                    key={`${pr.name}-${pr.date}`}
                    className="flex items-center justify-between rounded-xl border border-border-soft/60 bg-white/5 px-3 py-2"
                    onClick={() => onNavigate?.('historial')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && onNavigate?.('historial')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div>
                      <p className="text-sm font-semibold">{pr.name}</p>
                      <p className="text-xs text-muted">{formatDate(pr.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{Math.round(pr.reps)} reps</p>
                      <p className="text-[11px] text-emerald-300">+{Math.round(pr.diff)} reps</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Aún no hay PRs registrados.</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="card">
              <h3 className="text-lg font-semibold mb-1">Duración de hoy</h3>
              <p className="text-3xl font-semibold">
                {data.trainingDurationTodayMin > 0 ? `${data.trainingDurationTodayMin} min` : 'Sin registro'}
              </p>
              <p className="text-sm text-muted">Tiempo total del entrenamiento de la fecha actual.</p>
            </div>
            <div className="card" onClick={() => onNavigate?.('historial')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onNavigate?.('historial')} style={{ cursor: 'pointer' }}>
              <h3 className="text-lg font-semibold mb-1">Duración total (ejercicios)</h3>
              <p className="text-3xl font-semibold">{data.totalExerciseDurationMin} min</p>
              <p className="text-sm text-muted">Tiempo acumulado en ejercicios registrados</p>
            </div>
          </div>
        </div>

        {/* Panel lateral */}
        <aside className="flex flex-col gap-4">
          <div className="card" onClick={() => onNavigate?.('historial')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onNavigate?.('historial')} style={{ cursor: 'pointer' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Rendimiento por ejercicio</h3>
              <span className="text-xs text-muted">Comparación</span>
            </div>
            {data.performanceSeries.length ? (
              <div className="h-44">
                <ResponsiveLine
                  data={data.performanceSeries}
                  theme={chartTheme}
                  margin={{ top: 10, right: 10, bottom: 30, left: 40 }}
                  xScale={{ type: 'point' }}
                  yScale={{ type: 'linear', min: 0, max: 'auto', stacked: false }}
                  axisBottom={{ tickSize: 0, tickPadding: 8, tickRotation: -25 }}
                  axisLeft={{ tickSize: 0, tickPadding: 6 }}
                  enablePoints
                  pointSize={6}
                  colors={['#22c55e']}
                  useMesh
                  enableGridX={false}
                  enableGridY
                />
              </div>
            ) : (
              <p className="text-sm text-muted">Aún no hay suficiente historial para mostrar.</p>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Foto de progreso</h3>
              <button className="ghost-btn text-xs" onClick={() => onNavigate?.('fotos')}>
                Ver todas
              </button>
            </div>
            {data.photos.length ? (
              <div className="grid gap-2">
                {data.photos.map((photo) => (
                  <div key={photo.id} className="rounded-xl overflow-hidden border border-border-soft bg-white/5">
                    <img src={photo.url || photo.photoUrl} alt="Foto de progreso" className="w-full h-40 object-cover" />
                    <div className="px-3 py-2 text-xs text-muted">{formatDate(photo.date || todayISO)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Sube tu primera foto para ver tu evolución.</p>
            )}
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-2">Próxima acción</h3>
            <p className="text-sm text-muted">
              Revisa tu rutina y registra el siguiente entrenamiento para mantener la racha.
            </p>
            <div className="mt-3 flex gap-2">
              <button className="primary-btn flex-1" onClick={() => onNavigate?.('registrar')}>
                Registrar hoy
              </button>
              <button className="ghost-btn" onClick={() => onNavigate?.('rutinas')}>
                Rutinas
              </button>
            </div>
          </div>
        </aside>
      </div>
    </>
  )
}

export default Dashboard
