const base = {
  fontFamily: '"Barlow Condensed", "Arial Narrow", Inter, sans-serif',
  fontSize: 11,
  axis: {
    domain: { line: { strokeWidth: 1 } },
    ticks: { line: { strokeWidth: 1 }, text: { fontSize: 11 } },
    legend: { text: { fontSize: 12, fontWeight: 600 } },
  },
  legends: { text: { fontSize: 12 } },
  tooltip: {
    container: {
      borderRadius: 4,
      padding: 10,
      boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
    },
  },
}

export const nivoTheme = (mode = 'dark') => {
  if (mode === 'light') {
    return {
      ...base,
      background: 'transparent',
      textColor: '#1a1a1a',
      axis: {
        ...base.axis,
        domain: { line: { stroke: '#dedede', strokeWidth: 1 } },
        ticks: { line: { stroke: '#dedede', strokeWidth: 1 }, text: { fill: '#68686d', fontSize: 11 } },
        legend: { text: { fill: '#1a1a1a', fontSize: 11 } },
      },
      grid: { line: { stroke: '#e8e8e8', strokeWidth: 1 } },
      legends: { text: { fill: '#1a1a1a', fontSize: 11 } },
      tooltip: { container: { ...base.tooltip.container, background: '#ffffff', color: '#1a1a1a', border: '1px solid #dedede' } },
    }
  }
  return {
    ...base,
    background: 'transparent',
    textColor: '#f8f8f4',
    axis: {
      ...base.axis,
      domain: { line: { stroke: '#303030', strokeWidth: 1 } },
      ticks: { line: { stroke: '#303030', strokeWidth: 1 }, text: { fill: '#b8b8a6', fontSize: 11 } },
      legend: { text: { fill: '#f8f8f4', fontSize: 11 } },
    },
    grid: { line: { stroke: '#252525', strokeWidth: 1 } },
    legends: { text: { fill: '#f8f8f4', fontSize: 11 } },
    tooltip: { container: { ...base.tooltip.container, background: '#121212', color: '#f8f8f4', border: '1px solid #303030' } },
  }
}
