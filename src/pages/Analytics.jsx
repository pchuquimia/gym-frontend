import { ResponsiveLine } from '@nivo/line'
import { useEffect, useMemo, useState } from 'react'
import TopBar from '../components/layout/TopBar'
import { useTrainingData } from '../context/TrainingContext'

const colors = ['#4fa3ff', '#8b5cf6', '#22c55e', '#f59e0b']
const metrics = [
  { key: 'max', label: 'Peso Maximo por Sesion' },
  { key: 'avg', label: 'Peso Promedio Ponderado por Sesion' },
  { key: 'volume', label: 'Volumen Total por Sesion (Peso x Reps x Series)' },
  { key: 'oneRm', label: 'Estimacion de 1RM' },
  { key: 'duration', label: 'Duracion del Ejercicio (min)' },
]
const quickRanges = ['Ultimos 3 meses', '6M', '1A', 'Todo']
const formatDate = (iso) => new Date(iso).toLocaleDateString('es-ES')

const chartTheme = {
  textColor: '#9fb3ce',
  fontSize: 11,
  axis: {
    domain: { line: { stroke: '#1f2d3d', strokeWidth: 1 } },
    ticks: { line: { stroke: '#1f2d3d', strokeWidth: 1 }, text: { fill: '#9fb3ce' } },
  },
  grid: { line: { stroke: '#1f2d3d', strokeWidth: 1, strokeDasharray: '3 3' } },
  tooltip: {
    container: {
      background: '#0d1a2b',
      color: '#fff',
      border: '1px solid #1f2d3d',
      borderRadius: 8,
      padding: 8,
    },
  },
}

const metricValue = (sets, key, session) => {
  const volume = sets.reduce((acc, s) => acc + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0)
  const reps = sets.reduce((acc, s) => acc + (Number(s.reps) || 0), 0)
  const maxW = sets.reduce((acc, s) => Math.max(acc, Number(s.weight) || 0), 0)
  if (key === 'duration') return (session?.exerciseDurationSeconds || 0) / 60
  if (key === 'volume') return volume
  if (key === 'avg') return reps ? volume / reps : 0
  if (key === 'oneRm') {
    return sets.reduce((best, s) => {
      const w = Number(s.weight) || 0
      const r = Number(s.reps) || 0
      return Math.max(best, w * (1 + r / 30))
    }, 0)
  }
  return maxW
}

function Analytics() {
  const { exercises, sessions, trainings } = useTrainingData()
  const exercisesWithSessions = useMemo(() => {
    const ids = new Set(sessions.map((s) => s.exerciseId))
    return exercises.filter((e) => ids.has(e.id))
  }, [exercises, sessions])

  const [selectedExercises, setSelectedExercises] = useState(() => exercisesWithSessions.slice(0, 2).map((e) => e.id))
  const [metric, setMetric] = useState('volume')
  const [showPRs, setShowPRs] = useState(true)
  const [showTrendColors, setShowTrendColors] = useState(true)
  const [showGoalLine, setShowGoalLine] = useState(false)
  const [goalValue, setGoalValue] = useState(100)
  const [range, setRange] = useState('Ultimos 3 meses')
  const initialFrom = useMemo(() => {
    const oldest = sessions.reduce((min, s) => (s.date < min ? s.date : min), new Date().toISOString().slice(0, 10))
    return oldest.slice(0, 7)
  }, [sessions])
  const [fromMonth, setFromMonth] = useState(initialFrom)
  const [toMonth, setToMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [addExerciseId, setAddExerciseId] = useState('')

  useEffect(() => {
    if (!selectedExercises.length && exercisesWithSessions.length) {
      setSelectedExercises([exercisesWithSessions[0].id])
    }
  }, [exercisesWithSessions, selectedExercises.length])

  const applyQuickRange = (value) => {
    const now = new Date()
    if (value === 'Ultimos 3 meses') {
      const from = new Date()
      from.setMonth(now.getMonth() - 2)
      setFromMonth(from.toISOString().slice(0, 7))
      setToMonth(now.toISOString().slice(0, 7))
    } else if (value === '6M') {
      const from = new Date()
      from.setMonth(now.getMonth() - 5)
      setFromMonth(from.toISOString().slice(0, 7))
      setToMonth(now.toISOString().slice(0, 7))
    } else if (value === '1A') {
      const from = new Date()
      from.setFullYear(now.getFullYear() - 1)
      setFromMonth(from.toISOString().slice(0, 7))
      setToMonth(now.toISOString().slice(0, 7))
    } else if (value === 'Todo') {
      const oldest = sessions.reduce((min, s) => (s.date < min ? s.date : min), now.toISOString().slice(0, 10))
      setFromMonth(oldest.slice(0, 7))
      setToMonth(now.toISOString().slice(0, 7))
    }
    setRange(value)
  }

  const dateFilteredSessions = useMemo(() => {
    const from = new Date(`${fromMonth}-01`)
    const to = new Date(`${toMonth}-01`)
    to.setMonth(to.getMonth() + 1)
    return sessions.filter((s) => {
      const d = new Date(s.date)
      return d >= from && d < to
    })
  }, [fromMonth, toMonth, sessions])

  const selectedData = useMemo(() => {
    return selectedExercises.slice(0, 4).map((exerciseId, idx) => {
      const exercise = exercisesWithSessions.find((e) => e.id === exerciseId)
      const filtered = dateFilteredSessions
        .filter((s) => s.exerciseId === exerciseId)
        .sort((a, b) => new Date(a.date) - new Date(b.date))

      const points = filtered.map((s) => ({
        date: s.date,
        value: metricValue(s.sets, metric, s),
        pr: Math.max(...s.sets.map((set) => Number(set.weight) || 0)),
      }))

      const pr = points.reduce((best, p) => (p.pr > best ? p.pr : best), 0)
      const volumeSum = filtered.reduce((acc, s) => acc + metricValue(s.sets, 'volume'), 0)
      const avgWeight = filtered.length
        ? filtered.reduce((acc, s) => acc + metricValue(s.sets, 'avg'), 0) / filtered.length
        : 0
      const totalDuration = filtered.reduce((acc, s) => acc + (s.exerciseDurationSeconds || 0), 0)

      return {
        exercise,
        points,
        color: colors[idx % colors.length],
        pr,
        volumeSum,
        avgWeight,
        sessionsCount: filtered.length,
        totalDuration,
      }
    })
  }, [selectedExercises, exercisesWithSessions, dateFilteredSessions, metric])

  const mergedDates = useMemo(() => {
    const dates = new Set()
    selectedData.forEach((d) => d.points.forEach((p) => dates.add(p.date)))
    return Array.from(dates).sort((a, b) => new Date(a) - new Date(b))
  }, [selectedData])

  const chartData = useMemo(() => {
    if (!mergedDates.length) return []
    return selectedData.map((dataset) => {
      let lastVal = null
      let bestSoFar = -Infinity
      const data = mergedDates.map((date) => {
        const found = dataset.points.find((p) => p.date === date)
        const y = found ? found.value : null
        const status =
          found && lastVal !== null ? (y > lastVal ? 'up' : y < lastVal ? 'down' : 'flat') : 'flat'
        if (found) lastVal = y
        let isPr = false
        if (found && y !== null && y > bestSoFar) {
          isPr = true
          bestSoFar = y
        }
        return { x: date, y, status, isPr }
      })
      return {
        id: dataset.exercise?.name || 'Ejercicio',
        color: dataset.color,
        data,
        pr: dataset.pr,
      }
    })
  }, [mergedDates, selectedData])

  const stats = useMemo(() => {
    const allPoints = selectedData.flatMap((d) => d.points)
    const bestPR = Math.max(...allPoints.map((p) => p.pr || 0), 0)
    const bestPRDate = allPoints.find((p) => p.pr === bestPR)?.date
    const totalVolume = selectedData.reduce((acc, d) => acc + d.volumeSum, 0)
    const totalSessions = selectedData.reduce((acc, d) => acc + d.sessionsCount, 0)
    const avgWeight =
      totalSessions > 0
        ? selectedData.reduce((acc, d) => acc + d.avgWeight * d.sessionsCount, 0) / totalSessions
        : 0
    const firstVal = allPoints[0]?.value || 0
    const lastVal = allPoints[allPoints.length - 1]?.value || 0
    const trend = firstVal ? ((lastVal - firstVal) / firstVal) * 100 : 0
    const totalDuration = selectedData.reduce((acc, d) => acc + d.totalDuration, 0)
    const avgDuration = totalSessions ? totalDuration / totalSessions : 0

    return { bestPR, bestPRDate, totalVolume, avgWeight, totalSessions, trend, totalDuration, avgDuration }
  }, [selectedData])

  const addExerciseToSelection = () => {
    if (!addExerciseId) return
    if (selectedExercises.includes(addExerciseId)) return
    if (selectedExercises.length >= 4) return
    setSelectedExercises((prev) => [...prev, addExerciseId])
    setAddExerciseId('')
  }

  const removeExercise = (id) => {
    setSelectedExercises((prev) => prev.filter((ex) => ex !== id))
  }

  const goalLayer = useMemo(
    () =>
      ({ yScale, innerWidth, margin }) => {
        if (!showGoalLine) return null
        const y = yScale(goalValue)
        if (Number.isNaN(y)) return null
        return (
          <g>
            <line
              x1={margin.left}
              x2={margin.left + innerWidth}
              y1={margin.top + y}
              y2={margin.top + y}
              stroke="#fbbf24"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          </g>
        )
      },
    [goalValue, showGoalLine],
  )

  if (!exercisesWithSessions.length) {
    return (
      <>
        <TopBar
          title="Graficos y Analisis (Navegacion Completa)"
          subtitle="Explora tus datos y correlaciona tu progreso con visualizaciones comparativas."
        />
        <div className="card">No hay sesiones registradas para graficar.</div>
      </>
    )
  }

  return (
    <>
      <TopBar
        title="Graficos y Analisis (Navegacion Completa)"
        subtitle="Explora tus datos y correlaciona tu progreso con visualizaciones comparativas."
      />

      <section className="card flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Seleccionar Ejercicios (hasta 4)</p>
          <div className="flex flex-wrap gap-2">
            {selectedExercises.map((id) => {
              const ex = exercisesWithSessions.find((e) => e.id === id)
              if (!ex) return null
              return (
                <span
                  key={id}
                  className="flex items-center gap-2 rounded-full px-3 py-2 text-sm border border-border-soft bg-white/5"
                  style={{ borderColor: `${colors[selectedExercises.indexOf(id) % colors.length]}55` }}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ background: colors[selectedExercises.indexOf(id) % colors.length] }}
                  />
                  {ex.name}
                  <button
                    type="button"
                    className="text-muted hover:text-white"
                    onClick={() => removeExercise(id)}
                    aria-label="Quitar ejercicio"
                  >
                    ×
                  </button>
                </span>
              )
            })}
            <div className="flex gap-2 items-center">
              <select
                className="rounded-full border border-border-soft bg-white/5 px-3 py-2 text-sm text-white"
                value={addExerciseId}
                onChange={(e) => setAddExerciseId(e.target.value)}
              >
                <option value="">Añadir Ejercicio</option>
                {exercisesWithSessions
                  .filter((e) => !selectedExercises.includes(e.id))
                  .map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
              </select>
              <button className="ghost-btn text-sm" onClick={addExerciseToSelection}>
                + Añadir
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Rango Rapido</p>
            <div className="flex flex-wrap gap-2">
              {quickRanges.map((r) => (
                <button
                  key={r}
                  className={`px-3 py-2 rounded-full border text-sm ${
                    range === r ? 'border-accent text-white bg-accent/20' : 'border-border-soft text-muted'
                  }`}
                  onClick={() => applyQuickRange(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-2">
              <p className="label">Desde (Mes/Año)</p>
              <input
                type="month"
                value={fromMonth}
                onChange={(e) => setFromMonth(e.target.value)}
                className="w-full rounded-xl border border-border-soft bg-white/5 px-3 py-3 text-white"
              />
            </div>
            <div className="flex flex-col gap-2">
              <p className="label">Hasta (Mes/Año)</p>
              <input
                type="month"
                value={toMonth}
                onChange={(e) => setToMonth(e.target.value)}
                className="w-full rounded-xl border border-border-soft bg-white/5 px-3 py-3 text-white"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Metrica</p>
            <select
              className="rounded-xl border border-border-soft bg-white/5 px-3 py-3 text-white"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
            >
              {metrics.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={showPRs} onChange={(e) => setShowPRs(e.target.checked)} />
              Mostrar PRs
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={showTrendColors} onChange={(e) => setShowTrendColors(e.target.checked)} />
              Tendencias de Color
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={showGoalLine} onChange={(e) => setShowGoalLine(e.target.checked)} />
              Linea de Objetivo
            </label>
            {showGoalLine && (
              <input
                type="number"
                className="w-24 rounded-lg border border-border-soft bg-white/5 px-2 py-2 text-white"
                value={goalValue}
                onChange={(e) => setGoalValue(Number(e.target.value) || 0)}
              />
            )}
          </div>
        </div>
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Evolucion de Metricas Clave</h3>
        </div>
        <div className="relative h-80 rounded-2xl border border-border-soft bg-[#0d1a2b] overflow-hidden px-4 py-3">
          {chartData.length ? (
            <ResponsiveLine
              data={chartData}
              colors={(d) => d.color}
              theme={chartTheme}
              margin={{ top: 10, right: 30, bottom: 50, left: 50 }}
              xScale={{ type: 'point' }}
              yScale={{ type: 'linear', stacked: false, min: 'auto', max: 'auto' }}
              axisBottom={{
                tickRotation: -30,
                tickPadding: 8,
                tickSize: 0,
                format: (value) => new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
              }}
              axisLeft={{
                tickPadding: 6,
                tickSize: 0,
              }}
              curve="monotoneX"
              pointSize={7}
              pointBorderWidth={2}
              pointBorderColor="#0d1a2b"
              pointColor={(point) => {
                if (showPRs && point.data.isPr) return '#ffffff'
                if (showTrendColors) {
                  if (point.data.status === 'up') return '#22c55e'
                  if (point.data.status === 'down') return '#f43f5e'
                  return '#fbbf24'
                }
                return point.serieColor
              }}
              enableArea
              areaOpacity={0.1}
              enableGridX={false}
              gridYValues={4}
              enableSlices="x"
              useMesh
              tooltip={({ point }) => (
                <div className="text-xs bg-[#0d1a2b] border border-border-soft rounded-md px-3 py-2 text-white shadow-lg">
                  <div className="font-semibold">
                    {new Date(point.data.x).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  </div>
                  <div className="text-muted">{point.data.yFormatted}</div>
                  {showPRs && point.data.isPr && <div className="text-accent-green">Nuevo PR</div>}
                  <div className="text-xs text-muted">Serie: {point.serieId}</div>
                </div>
              )}
              legends={[
                {
                  anchor: 'bottom',
                  direction: 'row',
                  justify: false,
                  translateY: 40,
                  itemsSpacing: 12,
                  itemWidth: 120,
                  itemHeight: 14,
                  itemTextColor: '#9fb3ce',
                  symbolSize: 10,
                  symbolShape: 'circle',
                },
              ]}
              layers={[
                'grid',
                'markers',
                'axes',
                'areas',
                'lines',
                'points',
                'slices',
                'mesh',
                'legends',
                goalLayer,
              ]}
            />
          ) : (
            <div className="grid place-items-center h-full text-muted text-sm">No hay datos en el rango seleccionado.</div>
          )}
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted">
          {selectedData.map((d, idx) => (
            <span key={d.exercise?.id || idx} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: d.color }} />
              {d.exercise?.name || 'Ejercicio'}
            </span>
          ))}
          {showPRs && (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border border-white" /> Record Personal (PR)
            </span>
          )}
        </div>
      </section>

      <section className="card space-y-3">
        <h3 className="text-lg font-semibold">Estadisticas Clave</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border-soft bg-white/5 p-3">
            <p className="label">Mejor Record Personal (PR)</p>
            <p className="text-2xl font-bold">{stats.bestPR.toFixed(1)} kg</p>
            <p className="text-xs text-muted">{stats.bestPRDate ? formatDate(stats.bestPRDate) : '—'}</p>
          </div>
          <div className="rounded-xl border border-border-soft bg-white/5 p-3">
            <p className="label">Volumen Total Levantado</p>
            <p className="text-2xl font-bold">{stats.totalVolume.toLocaleString()} kg</p>
            <p className="text-xs text-muted">En el periodo seleccionado</p>
          </div>
          <div className="rounded-xl border border-border-soft bg-white/5 p-3">
            <p className="label">Prom. Peso por Sesion</p>
            <p className="text-2xl font-bold">{stats.avgWeight.toFixed(1)} kg</p>
            <p className="text-xs text-muted">Promedio ponderado</p>
          </div>
          <div className="rounded-xl border border-border-soft bg-white/5 p-3">
            <p className="label">Sesiones Registradas</p>
            <p className="text-2xl font-bold">{stats.totalSessions}</p>
            <p className="text-xs text-muted">Para los ejercicios filtrados</p>
          </div>
          <div className="rounded-xl border border-border-soft bg-white/5 p-3">
            <p className="label">Duracion Total</p>
            <p className="text-2xl font-bold">{Math.round(stats.totalDuration / 60)} min</p>
            <p className="text-xs text-muted">Tiempo acumulado (ejercicios seleccionados)</p>
          </div>
          <div className="rounded-xl border border-border-soft bg-white/5 p-3">
            <p className="label">Duracion Promedio por Sesion</p>
            <p className="text-2xl font-bold">{Math.round(stats.avgDuration / 60)} min</p>
            <p className="text-xs text-muted">Promedio de los ejercicios filtrados</p>
          </div>
          <div className="rounded-xl border border-border-soft bg-white/5 p-3 md:col-span-2">
            <p className="label">Tendencia del Periodo</p>
            <p className={`text-2xl font-bold ${stats.trend >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {stats.trend >= 0 ? '+' : ''}
              {stats.trend.toFixed(1)}%
            </p>
            <p className="text-xs text-muted">
              {stats.trend >= 0 ? 'Mejora' : 'Retroceso'} respecto al inicio del periodo
            </p>
          </div>
        </div>
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Duración por Sesión (min) — por Rutina</h3>
          <span className="text-xs text-muted">Basado en trainings</span>
        </div>
        <div className="relative h-80 rounded-2xl border border-border-soft bg-[#0d1a2b] overflow-hidden px-4 py-3">
          {trainings && trainings.length ? (
            <ResponsiveLine
              data={Object.values(
                trainings.reduce((acc, t) => {
                  const key = t.routineName || 'Sin rutina'
                  if (!acc[key]) acc[key] = { id: key, color: colors[Object.keys(acc).length % colors.length], data: [] }
                  acc[key].data.push({ x: t.date, y: (t.durationSeconds || 0) / 60 })
                  return acc
                }, {}),
              )}
              colors={(d) => d.color}
              theme={chartTheme}
              margin={{ top: 10, right: 30, bottom: 50, left: 50 }}
              xScale={{ type: 'point' }}
              yScale={{ type: 'linear', stacked: false, min: 'auto', max: 'auto' }}
              axisBottom={{
                tickRotation: -30,
                tickPadding: 8,
                tickSize: 0,
                format: (value) => new Date(value).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
              }}
              axisLeft={{
                tickPadding: 6,
                tickSize: 0,
                format: (v) => `${v} min`,
              }}
              curve="monotoneX"
              pointSize={7}
              pointBorderWidth={2}
              pointBorderColor="#0d1a2b"
              enableArea
              areaOpacity={0.1}
              enableGridX={false}
              gridYValues={4}
              enableSlices="x"
              useMesh
              tooltip={({ point }) => (
                <div className="text-xs bg-[#0d1a2b] border border-border-soft rounded-md px-3 py-2 text-white shadow-lg">
                  <div className="font-semibold">{point.serieId}</div>
                  <div className="text-muted">
                    {new Date(point.data.x).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  </div>
                  <div>{point.data.yFormatted} min</div>
                </div>
              )}
              legends={[
                {
                  anchor: 'bottom',
                  direction: 'row',
                  justify: false,
                  translateY: 40,
                  itemsSpacing: 12,
                  itemWidth: 120,
                  itemHeight: 14,
                  itemTextColor: '#9fb3ce',
                  symbolSize: 10,
                  symbolShape: 'circle',
                },
              ]}
            />
          ) : (
            <div className="grid place-items-center h-full text-muted text-sm">No hay trainings registrados.</div>
          )}
        </div>
      </section>
    </>
  )
}

export default Analytics
