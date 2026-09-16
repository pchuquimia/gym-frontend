# Progreso y comparación de planes

Página independiente `progreso`, accesible desde **Progreso → Progreso y planes** (en móvil, menú **Más**). Conserva todas las pantallas anteriores y sus rutas. Para coaches utiliza el atleta seleccionado; para el administrador sin contexto utiliza su propio historial.

## Integración

- React 18.3, Vite 7, React Query 5; navegación existente de `App.jsx`, sin otro router ni proveedor de temas.
- Fuente existente: `--desktop-ui-font` / `--mobile-ui-font` (Inter Tight / Inter y los fallbacks del proyecto). No se incorpora ninguna fuente.
- Superficies, texto, bordes, acento y éxito usan los tokens de `index.css`. Las gráficas leen estilos computados y escuchan `gym-theme-change`.
- `useProgressData`: endpoints existentes de entrenamientos, planes y rutinas, claves por propietario; paginación por cursor hasta completar el historial. Una página fallida invalida el resultado completo, nunca se publica un historial truncado.
- Sin cambios en API, base de datos, esquema ni datos del usuario. Fixtures sólo en pruebas.
- TypeScript estricto acotado a la nueva funcionalidad: `npm run typecheck:progress`. Los tipos son proyecciones de lectura de los contratos existentes, no un esquema persistido adicional.

## Motor de visualización

Elección final: **Apache ECharts 6.x**, solicitado expresamente. Versión fijada en el lockfile: 6.1.0. Se evaluó primero ECharts y se contrastó con las alternativas; no se hizo un benchmark cuantitativo entre motores ni se afirma un tamaño comparativo sin medir.

| Alternativa | Ajuste a este proyecto / interacción | Integración, coste y decisión |
| --- | --- | --- |
| ECharts 6 | Líneas, áreas, barras, heatmap/calendario, zoom, selección, series custom y composiciones; Canvas/SVG y opciones tipadas | Imports modulares; ciclo de vida React centralizado en AppChart. Elegido por petición y amplitud de interacción. |
| Nivo | React, SVG/Canvas, líneas/barras/heatmaps/calendarios, temas y motion; zoom avanzado exige más composición | Ya instalado y conservado exclusivamente en páginas anteriores. No se incorpora en la nueva página. |
| Recharts | Componentes React/SVG, líneas/áreas/barras, tooltips y Brush | Alternativa declarativa; no aporta una ventaja suficiente para añadir otro motor. Visuales especializados requieren composición. |
| Visx | Primitivas React/D3 con gran libertad para visuales custom, brushing y zoom | Modular, pero exige construir más infraestructura para ejes, responsive, interacción y accesibilidad. |
| Plotly | Amplio catálogo, series temporales, selección, zoom y trazas WebGL para datos grandes | Útil para análisis científico; requiere integración/estilos y selección de bundle. Su amplitud no es necesaria aquí. |
| Victory | Componentes React composables, animación, tooltips y contenedores de interacción | Buena alternativa React; introduce dependencia adicional sin una ventaja específica para esta pantalla. |

Todos requieren validar responsive, teclado, contraste y textos alternativos en el producto real: una biblioteca no garantiza WCAG AA por sí sola. El estado de las alternativas se contrastó con sus documentos/repositorios oficiales; no se cambian dependencias ya instaladas por comparaciones de popularidad.

Referencias primarias consultadas:

- [ECharts 6](https://echarts.apache.org/handbook/en/basics/release-note/v6-feature/), [imports y tipos modulares](https://echarts.apache.org/handbook/en/basics/import/), [ARIA](https://echarts.apache.org/handbook/en/best-practices/aria/).
- [Nivo Line](https://nivo.rocks/line/), [Recharts](https://github.com/recharts/recharts), [Visx](https://github.com/airbnb/visx), [Plotly JavaScript](https://plotly.com/javascript/), [Victory](https://github.com/FormidableLabs/victory).

`AppChart` centraliza SVG, tokens, tipografía, ejes, grid, tooltips de texto (sin interpolar HTML), leyenda con botones, reduced motion, resize, limpieza y reintento. El motor se importa dinámicamente después de mostrar la página. Cada gráfica ofrece tabla accesible; los filtros por barra también se ejecutan con botones de tabla. Zoom local disponible en series con más de 40 categorías; no cambia los filtros globales. Las comparaciones se representan con barras y tabla, sin imponer dumbbells, bullet charts o radar innecesarios. El calendario es HTML semántico con botones, no un segundo motor gráfico.

## Definiciones y límites

- Sesión: registro que contiene al menos una serie marcada como completada. Se aplica `isCompletedSet` de la app; un bloque con entradas incompletas no se suma como completado. Registros antiguos sin confirmación no se reinterpretan como entrenamiento completado.
- Volumen externo: suma de carga efectiva × reps de las series completadas, reutilizando `getExerciseLoadMetrics` y la configuración de pesos existente. Máquinas y cargas sin clasificar se informan aparte; asistencia nunca se trata como peso levantado. El lastre explícito sigue la regla existente.
- Grupos: una serie se asigna al grupo principal registrado; no se estimula visualmente un crecimiento muscular ni se duplican series por sinergistas.
- Hero: cumplimiento en fecha de un plan fijo evaluable; de lo contrario días activos. No existe un porcentaje sintético de progreso físico.
- Frecuencia: sesiones / días del período × 7. Barras por semanas calendario; extremos parciales señalados. Rangos móviles 1M/3M/6M/1Y = 30/90/180/365 días.
- Tiempo: duración ajustada si existe, de otro modo registrada; cobertura visible. Con filtro de ejercicios sigue siendo tiempo de las sesiones completas. La serie temporal deja huecos cuando falta tiempo en alguna sesión del intervalo.
- PR: nueva mejor marca contra todo el historial anterior compatible, no sólo la ventana visible. Primera medición y empates no son récords. Misma progresión, ejercicio, configuración, sede y tipo de métrica; asistencia y lastre corporal conservan la misma carga. Si se repite un ejercicio dentro de una sesión se evalúa su mejor ocurrencia una sola vez. 1RM es estimación Epley existente, no un levantamiento probado. Cargas desconocidas no generan estimaciones de fuerza.
- Cumplimiento en fecha: coincidencia exacta de plan + bloque + fecha, sin doble conteo. Se muestran sesiones vinculadas fuera de coincidencia. No se infiere vinculación sólo por fechas/rutinas parecidas. Incluye turnos de hoy; ausencia de coincidencia no prueba omisión. Ciclos flexibles/secuenciales y planes pausados/cancelados no reciben un calendario ficticio.
- Ejercicios/series previstos: estimación con la estructura actual de las rutinas; no existe snapshot histórico en este contrato. Si falta una rutina, denominadores y omisiones quedan no disponibles en vez de cero.
- A/B: ventana explícita con igual número de días desde el comienzo de ambos planes y normalización semanal. Independiente del filtro global de fechas/plan; conserva músculo/ejercicio/carga. No se declara un ganador causal ni una mejora de intensidad/hipertrofia con estos datos.
- Filtros parciales desactivan cumplimiento de sesiones completas. Restablecer vuelve a 30 días y todas las dimensiones. El calendario diferencia entrenamiento de ausencia de registro, sin presumir descanso.

## Verificación

`npm run typecheck:progress`, `npm run lint`, `npm test`, `npm run build`.

`npx playwright test progress-dashboard.spec.js --workers=2` prueba ambos temas en escritorio y móvil, interacción de filtros, tablas, detalle, estados vacíos, loading/reduced-motion y errores aislados. Capturas se guardan en `test-results/` (no versionadas). Las pruebas visuales usan fixtures deterministas, no acreditan una revisión manual de todos los historiales de producción.

No se hizo una certificación formal WCAG ni una auditoría de lector de pantalla. Se incluyen etiquetas, controles nativos, foco visible, tablas alternativas y diálogos nativos con Escape/foco atrapado; deben conservarse al ampliar la funcionalidad.
