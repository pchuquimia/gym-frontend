import { ResponsiveLine } from '@nivo/line'
import { useEffect, useMemo, useState } from 'react'
import TopBar from '../components/layout/TopBar'
import Modal from '../components/shared/Modal'
import { useTrainingData } from '../context/TrainingContext'

const quickRanges = ['1 mes', 'Últimos 3 meses', 'Este año', 'Todo el tiempo']
const metricViews = [
  { key: 'peso', label: 'Peso (kg)' },
  { key: 'duracion_ejercicio', label: 'Duración ejercicio (min)' },
  { key: 'duracion_sesion', label: 'Duración sesión (min)' },
]

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

function getStatusColor(status) {
  if (status === 'up') return 'bg-emerald-900/70'
  if (status === 'down') return 'bg-rose-900/70'
  return 'bg-amber-900/70'
}

function getStatusText(status) {
  if (status === 'up') return 'Mejora'
  if (status === 'down') return 'Retroceso'
  return 'Mantenimiento'
}

function ProgressHistory() {
  const { exercises, sessions, trainings, updateExerciseMeta } = useTrainingData()
  const availableExercises = useMemo(() => {
    const ids = Array.from(new Set(sessions.map((s) => s.exerciseId)))
    return ids
      .map((id) => {
        const meta = exercises.find((e) => e.id === id)
        const sessionName = sessions.find((s) => s.exerciseId === id)?.exerciseName
        return {
          id,
          name: meta?.name || sessionName || id,
          description: meta?.description || '',
          equipment: meta?.equipment || '',
        }
      })
      .filter(Boolean)
  }, [exercises, sessions])

  const [selectedExercise, setSelectedExercise] = useState(null)
  const [range, setRange] = useState('1 mes')
  const [fromMonth, setFromMonth] = useState(() => {
    const now = new Date()
    const from = new Date()
    from.setMonth(now.getMonth() - 1)
    return from.toISOString().slice(0, 7)
  })
  const [toMonth, setToMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', description: '', equipment: '' })
  const [metricView, setMetricView] = useState('peso')

  useEffect(() => {
    if (availableExercises.length && !selectedExercise) {
      const last = typeof localStorage !== 'undefined' ? localStorage.getItem('last_exercise_id') : null
      const initial = availableExercises.find((ex) => ex.id === last) || availableExercises[0]
      setSelectedExercise(initial)
      setEditForm(initial)
    }
  }, [availableExercises, selectedExercise])

  const applyQuickRange = (value) => {
    const now = new Date()
    if (value === '1 mes') {
      const from = new Date()
      from.setMonth(now.getMonth() - 1)
      setFromMonth(from.toISOString().slice(0, 7))
      setToMonth(now.toISOString().slice(0, 7))
    } else if (value === 'Últimos 3 meses') {
      const from = new Date()
      from.setMonth(now.getMonth() - 2)
      setFromMonth(from.toISOString().slice(0, 7))
      setToMonth(now.toISOString().slice(0, 7))
    } else if (value === 'Este año') {
      const yearStart = `${now.getFullYear()}-01`
      setFromMonth(yearStart)
      setToMonth(now.toISOString().slice(0, 7))
    } else if (value === 'Todo el tiempo') {
      const oldest = sessions.reduce((min, s) => (s.date < min ? s.date : min), now.toISOString().slice(0, 10))
      setFromMonth(oldest.slice(0, 7))
      setToMonth(now.toISOString().slice(0, 7))
    }
    setRange(value)
  }

  const filteredSessions = useMemo(() => {
    if (!selectedExercise) return []
    const from = new Date(`${fromMonth}-01`)
    const to = new Date(`${toMonth}-01`)
    to.setMonth(to.getMonth() + 1)
    return sessions
      .filter((s) => s.exerciseId === selectedExercise.id)
      .filter((s) => {
        const d = new Date(s.date)
        return d >= from && d < to
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [sessions, selectedExercise, fromMonth, toMonth])

  const filteredTrainings = useMemo(() => {
    const from = new Date(`${fromMonth}-01`)
    const to = new Date(`${toMonth}-01`)
    to.setMonth(to.getMonth() + 1)
    return (trainings || [])
      .filter((t) => {
        const d = new Date(t.date)
        return d >= from && d < to
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [trainings, fromMonth, toMonth])

  const chartPoints = useMemo(() => {
    if (!filteredSessions.length) return []
    let bestWeight = -Infinity
    return filteredSessions.map((s) => {
      const bestWeightSet = Math.max(...s.sets.map((set) => set.weight || 0))
      const durEj = (s.exerciseDurationSeconds || 0) / 60
      const durSes = (s.trainingDurationSeconds || 0) / 60
      const isPr = bestWeightSet > bestWeight
      if (bestWeightSet > bestWeight) bestWeight = bestWeightSet
      return { date: s.date, peso: bestWeightSet, duracion_ejercicio: durEj, duracion_sesion: durSes, isPr }
    })
  }, [filteredSessions])

  const status = useMemo(() => {
    if (chartPoints.length < 2) return 'stable'
    const first = chartPoints[0][metricView]
    const last = chartPoints[chartPoints.length - 1][metricView]
    if (last > first) return 'up'
    if (last < first) return 'down'
    return 'stable'
  }, [chartPoints, metricView])

  const handleExerciseChange = (id) => {
    const found = availableExercises.find((ex) => ex.id === id) || availableExercises[0]
    setSelectedExercise(found)
    setEditForm(found)
  }

  const saveEdit = () => {
    updateExerciseMeta(selectedExercise.id, editForm)
    setSelectedExercise((prev) => ({ ...prev, ...editForm }))
    setIsEditOpen(false)
  }

  return (
    <>
      <TopBar
        title="Historial de Progreso (Navegación Completa)"
        subtitle="Selecciona un ejercicio y un rango de tiempo para ver tu evolución."
      />

      <section className="card flex flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Ejercicio</p>
            <div className="relative">
              <select
                className="w-full rounded-xl border border-border-soft bg-white/5 px-3 py-3 text-white"
                value={selectedExercise?.id || ''}
                onChange={(e) => handleExerciseChange(e.target.value)}
              >
                {availableExercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-accent"
                onClick={() => setIsEditOpen(true)}
              >
                ✏️
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Rango Rápido</p>
            <select
              className="w-full rounded-xl border border-border-soft bg-white/5 px-3 py-3 text-white"
              value={range}
              onChange={(e) => applyQuickRange(e.target.value)}
            >
              {quickRanges.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Métrica</p>
            <div className="flex flex-wrap gap-2">
              {metricViews.map((m) => (
                <button
                  key={m.key}
                  className={`px-3 py-2 rounded-full border text-xs ${
                    metricView === m.key ? 'border-accent text-white bg-accent/20' : 'border-border-soft text-muted'
                  }`}
                  onClick={() => setMetricView(m.key)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
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
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Duración por Sesión (min)</h3>
          <span className="text-xs text-muted">Agrupado por rutina</span>
        </div>
        <div className="relative h-72 rounded-2xl border border-border-soft bg-[#0d1a2b] overflow-hidden px-4 py-3">
          {filteredTrainings.length ? (
            <ResponsiveLine
              data={Object.values(
                filteredTrainings.reduce((acc, t) => {
                  const key = t.routineName || 'Sin rutina'
                  if (!acc[key]) acc[key] = { id: key, color: '#4fa3ff', data: [] }
                  acc[key].data.push({ x: t.date, y: (t.durationSeconds || 0) / 60 })
                  return acc
                }, {}),
              )}
              colors={{ scheme: 'category10' }}
              theme={chartTheme}
              margin={{ top: 10, right: 20, bottom: 40, left: 50 }}
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
                  translateY: 35,
                  itemWidth: 100,
                  itemHeight: 14,
                  itemsSpacing: 8,
                  symbolSize: 10,
                  symbolShape: 'circle',
                  itemTextColor: '#9fb3ce',
                },
              ]}
            />
          ) : (
            <div className="h-full grid place-items-center text-muted text-sm">No hay sesiones en el rango seleccionado.</div>
          )}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className={`rounded-2xl border border-border-soft px-4 py-3 text-white shadow-soft ${getStatusColor('up')}`}>
          <p className="font-semibold">Mejora</p>
          <p className="text-sm text-emerald-200">Tu rendimiento general ha aumentado.</p>
        </div>
        <div className={`rounded-2xl border border-border-soft px-4 py-3 text-white shadow-soft ${getStatusColor('stable')}`}>
          <p className="font-semibold">Mantenimiento</p>
          <p className="text-sm text-amber-100">Tu rendimiento se mantiene estable.</p>
        </div>
        <div className={`rounded-2xl border border-border-soft px-4 py-3 text-white shadow-soft ${getStatusColor('down')}`}>
          <p className="font-semibold">Retroceso</p>
          <p className="text-sm text-rose-100">Tu rendimiento ha disminuido.</p>
        </div>
      </section>

      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {metricView === 'peso'
              ? 'Evolución del Peso (kg)'
              : metricView === 'duracion_ejercicio'
                ? 'Duración del Ejercicio (min)'
                : 'Duración de la Sesión (min)'}
          </h3>
          <span className={`text-xs px-3 py-1 rounded-full border ${status === 'up' ? 'border-emerald-400 text-emerald-200' : status === 'down' ? 'border-rose-400 text-rose-200' : 'border-amber-400 text-amber-200'}`}>
            {getStatusText(status)}
          </span>
        </div>
        <div className="relative h-72 rounded-2xl border border-border-soft bg-[#0d1a2b] overflow-hidden px-4 py-3">
          {chartPoints.length ? (
            <ResponsiveLine
              data={[
                {
                  id: selectedExercise?.name || 'Ejercicio',
                  color: '#4fa3ff',
                  data: chartPoints.map((p) => ({ x: p.date, y: p[metricView] })),
                },
              ]}
              colors={(d) => d.color}
              theme={chartTheme}
              margin={{ top: 10, right: 20, bottom: 40, left: 50 }}
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
                format: (v) => `${v} ${metricView === 'peso' ? 'kg' : 'min'}`,
              }}
              curve="monotoneX"
              pointSize={8}
              pointBorderWidth={2}
              pointBorderColor={(pt) =>
                metricView === 'peso' && pt?.data?.isPr ? '#22c55e' : '#0d1a2b'
              }
              pointColor={(pt) =>
                metricView === 'peso' && pt?.data?.isPr ? '#22c55e' : '#4fa3ff'
              }
              enableArea
              areaOpacity={0.15}
              enableGridX={false}
              gridYValues={4}
              enableSlices="x"
              useMesh
              tooltip={({ point }) => {
                const unit = metricView === 'peso' ? 'kg' : 'min'
                return (
                  <div className="text-xs bg-[#0d1a2b] border border-border-soft rounded-md px-3 py-2 text-white shadow-lg">
                    <div className="font-semibold">
                      {new Date(point.data.x).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </div>
                    <div className="text-muted">
                      {point.data.yFormatted} {unit}
                    </div>
                    {metricView === 'peso' && point.data.isPr && (
                      <div className="text-accent-green">Nuevo PR en esta fecha</div>
                    )}
                  </div>
                )
              }}
              legends={[]}
            />
          ) : (
            <div className="h-full grid place-items-center text-muted text-sm">No hay datos en el rango seleccionado.</div>
          )}
        </div>
      </section>

      <section className="card space-y-3">
        <h3 className="text-lg font-semibold">Historial Detallado: {selectedExercise?.name || ''}</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-muted">
              <tr className="[&>th]:text-left [&>th]:py-2 [&>th]:pr-4">
                <th>Fecha</th>
                <th>Set</th>
                <th>Repeticiones</th>
                <th>Peso (kg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft/60">
              {filteredSessions.length === 0 && (
                <tr>
                  <td className="py-3 text-muted" colSpan={4}>
                    No hay registros para este ejercicio en el rango seleccionado.
                  </td>
                </tr>
              )}
              {filteredSessions.map((row) =>
                row.sets.map((set, idx) => (
                  <tr key={`${row.id}-${idx}`} className="[&>td]:py-2 [&>td]:pr-4">
                    <td className="text-muted">{idx === 0 ? new Date(row.date).toLocaleDateString('es-ES') : ''}</td>
                    <td>{idx + 1}</td>
                    <td>{set.reps}</td>
                    <td className={set.weight < 78 ? 'text-accent-red' : ''}>{set.weight}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isEditOpen && selectedExercise && (
        <Modal
          title="Editar ejercicio"
          subtitle="Ajusta el nombre, descripción y equipo"
          onClose={() => setIsEditOpen(false)}
          footer={
            <>
              <button className="ghost-btn" onClick={() => setIsEditOpen(false)}>
                Cancelar
              </button>
              <button className="primary-btn" onClick={saveEdit}>
                Guardar
              </button>
            </>
          }
        >
          <div className="grid gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-semibold">Nombre</span>
              <input
                className="rounded-lg border border-border-soft bg-white/5 px-3 py-2 text-white"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-semibold">Descripción</span>
              <textarea
                className="rounded-lg border border-border-soft bg-white/5 px-3 py-2 text-white"
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-semibold">Equipo</span>
              <input
                className="rounded-lg border border-border-soft bg-white/5 px-3 py-2 text-white"
                value={editForm.equipment}
                onChange={(e) => setEditForm((prev) => ({ ...prev, equipment: e.target.value }))}
              />
            </label>
          </div>
        </Modal>
      )}
    </>
  )
}

export default ProgressHistory
