const base = {
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  fontSize: 12,
  axis: {
    domain: { line: { strokeWidth: 1 } },
    ticks: { line: { strokeWidth: 1 }, text: { fontSize: 11 } },
    legend: { text: { fontSize: 12, fontWeight: 600 } },
  },
  legends: { text: { fontSize: 12 } },
  tooltip: {
    container: {
      borderRadius: 10,
      padding: 12,
      boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
    },
  },
}

export const nivoTheme = (mode = 'dark') => {
  if (mode === 'light') {
    return {
      ...base,
      background: 'transparent',
      textColor: '#1f2937',
      axis: {
        ...base.axis,
        domain: { line: { stroke: '#e5e7eb', strokeWidth: 1 } },
        ticks: { line: { stroke: '#e5e7eb', strokeWidth: 1 }, text: { fill: '#4b5563', fontSize: 11 } },
        legend: { text: { fill: '#111827', fontSize: 12 } },
      },
      grid: { line: { stroke: '#f3f4f6', strokeWidth: 1 } },
      legends: { text: { fill: '#111827', fontSize: 12 } },
      tooltip: { container: { ...base.tooltip.container, background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb' } },
    }
  }
  return {
    ...base,
    background: 'transparent',
    textColor: '#e5e7eb',
    axis: {
      ...base.axis,
      domain: { line: { stroke: '#243447', strokeWidth: 1 } },
      ticks: { line: { stroke: '#243447', strokeWidth: 1 }, text: { fill: '#94a3b8', fontSize: 11 } },
      legend: { text: { fill: '#e2e8f0', fontSize: 12 } },
    },
    grid: { line: { stroke: '#1f2a3c', strokeWidth: 1 } },
    legends: { text: { fill: '#e2e8f0', fontSize: 12 } },
    tooltip: { container: { ...base.tooltip.container, background: '#0f172a', color: '#e2e8f0', border: '1px solid #1e293b' } },
  }
}
