// Dataset mock para validación de gráficas
export const workoutsMock = (() => {
  const weeks = [
    { date: '2025-01-06', sets: [[60, 10], [60, 9], [62.5, 8]] },
    { date: '2025-01-08', sets: [[62.5, 8], [65, 8], [65, 7]] },
    { date: '2025-01-13', sets: [[65, 9], [67.5, 8], [67.5, 7]] },
    { date: '2025-01-15', sets: [[67.5, 8], [70, 8], [70, 6]] },
    { date: '2025-01-20', sets: [[70, 8], [72.5, 7], [72.5, 7]] },
    { date: '2025-01-22', sets: [[72.5, 7], [75, 6], [75, 6]] },
    { date: '2025-01-27', sets: [[75, 6], [77.5, 6], [77.5, 5]] },
    { date: '2025-01-29', sets: [[77.5, 6], [80, 5], [80, 5]] },
    // Deload volumen
    { date: '2025-02-03', sets: [[70, 6], [72.5, 6], [72.5, 5]] },
    { date: '2025-02-05', sets: [[72.5, 6], [75, 5], [75, 5]] },
    // Vuelta a progreso
    { date: '2025-02-10', sets: [[80, 6], [82.5, 5], [82.5, 5]] },
    { date: '2025-02-12', sets: [[82.5, 5], [85, 4], [85, 4]] },
    { date: '2025-02-17', sets: [[85, 5], [87.5, 4], [87.5, 4]] },
    { date: '2025-02-19', sets: [[87.5, 4], [90, 3], [90, 3]] },
  ]

  return weeks.flatMap((w) =>
    w.sets.map(([weight, reps]) => ({
      exerciseId: 'bench_press',
      date: w.date,
      sets: [{ weight, reps }],
    })),
  )
})()
