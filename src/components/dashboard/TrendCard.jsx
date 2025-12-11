import { ResponsiveLine } from '@nivo/line'
import { useMemo, useState } from 'react'

const ranges = [
  { key: 'semanal', label: 'Semanal' },
  { key: 'mensual', label: 'Mensual' },
  { key: 'trimestral', label: 'Trimestral' },
]

const fallbackData = {
  semanal: [0, 0, 0, 0, 0, 0, 0],
  mensual: [0, 0, 0, 0, 0, 0, 0],
  trimestral: [0, 0, 0, 0, 0, 0, 0],
}

function TrendCard({ dataByRange, compact = false }) {
  const source = dataByRange || fallbackData
  const [activeRange, setActiveRange] = useState('semanal')

  const chartData = useMemo(() => {
    const values = source[activeRange] || fallbackData[activeRange]
    const volumeData = values.volume || values
    const durationData = values.duration || []
    const sessionsData = values.sessions || []
    const meta = values.meta || []
    const series = [
      {
        id: 'Volumen',
        color: '#1ec986',
        data: volumeData.map((v, idx) => ({ x: `P${idx + 1}`, y: v, meta: meta[idx] })),
      },
    ]
    if (durationData.length) {
      series.push({
        id: 'DuraciИn (min)',
        color: '#4fa3ff',
        data: durationData.map((v, idx) => ({ x: `P${idx + 1}`, y: v, meta: meta[idx] })),
      })
    }
    if (sessionsData.length) {
      series.push({
        id: 'Sesiones',
        color: '#fbbf24',
        data: sessionsData.map((v, idx) => ({ x: `P${idx + 1}`, y: v, meta: meta[idx] })),
      })
    }
    return series
  }, [activeRange, source])

  const theme = useMemo(
    () => ({
      textColor: '#9fb3ce',
      fontSize: 11,
      axis: {
        domain: { line: { stroke: '#1f2d3d', strokeWidth: 1 } },
        ticks: {
          line: { stroke: '#1f2d3d', strokeWidth: 1 },
          text: { fill: '#9fb3ce' },
        },
      },
      grid: { line: { stroke: '#1f2d3d', strokeWidth: 1, strokeDasharray: '3 3' } },
      crosshair: { line: { stroke: '#4fa3ff', strokeWidth: 1 } },
      tooltip: {
        container: {
          background: '#0d1a2b',
          color: '#fff',
          borderRadius: 8,
          padding: 8,
          border: '1px solid #1f2d3d',
        },
      },
    }),
    [],
  )

  return (
    <section className="card" id="dashboard">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="label">VisiИn General del Rendimiento</p>
          <h3 className="text-xl font-bold">
            Volumen Total {activeRange === 'semanal' ? 'Semanal' : activeRange === 'mensual' ? 'Mensual' : 'Trimestral'}
          </h3>
        </div>
        <div className="flex bg-white/5 border border-border-soft rounded-lg p-1">
          {ranges.map((range) => (
            <button
              key={range.key}
              className={`px-3 py-1 text-sm font-semibold rounded-md ${activeRange === range.key ? 'bg-accent/20 text-white' : 'text-muted'}`}
              onClick={() => setActiveRange(range.key)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className={`relative mt-4 rounded-xl border border-border-soft bg-gradient-to-b from-white/5 to-white/0 overflow-hidden px-2 py-1 ${
          compact ? 'h-64' : 'h-56'
        }`}
      >
        <ResponsiveLine
          data={chartData}
          colors={(d) => d.color || '#4fa3ff'}
          theme={theme}
          margin={{ top: 10, right: 20, bottom: 30, left: 40 }}
          enableArea
          areaOpacity={0.25}
          curve="monotoneX"
          axisBottom={{
            tickPadding: 6,
            tickSize: 0,
          }}
          axisLeft={{
            tickPadding: 6,
            tickSize: 0,
          }}
          pointSize={7}
          pointBorderWidth={2}
          pointBorderColor={(pt) => {
            if (!pt || !pt.data) return '#0d1a2b'
            return pt.data.meta?.prs ? '#22c55e' : '#0d1a2b'
          }}
          pointColor={(pt) => {
            if (!pt || !pt.data) return pt?.serieColor || '#4fa3ff'
            return pt.data.meta?.prs ? '#22c55e' : pt.serieColor || '#4fa3ff'
          }}
          useMesh
          enableSlices="x"
          tooltip={({ point }) => (
            <div className="text-xs bg-[#0d1a2b] border border-border-soft rounded-md px-3 py-2 text-white shadow-lg">
              <div className="font-semibold">{point.data.xFormatted || point.data.x}</div>
              <div className="text-muted">{point.serieId}</div>
              <div className="text-sm">{point.data.yFormatted}</div>
              {point.data.meta?.routine && (
                <div className="text-muted mt-1">Rutina dominante: {point.data.meta.routine}</div>
              )}
              {typeof point.data.meta?.prs === 'number' && (
                <div className="text-accent-green">PRs en bucket: {point.data.meta.prs}</div>
              )}
            </div>
          )}
          enableGridX={false}
          gridYValues={4}
          legends={[
            {
              anchor: 'bottom',
              direction: 'row',
              translateY: 30,
              itemWidth: 120,
              itemHeight: 14,
              symbolSize: 10,
              symbolShape: 'circle',
              itemTextColor: '#9fb3ce',
            },
          ]}
        />
      </div>
    </section>
  )
}

export default TrendCard
