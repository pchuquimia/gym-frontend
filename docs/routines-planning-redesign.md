# Rediseño de planes y rutinas

Propuesta basada en la revisión del producto local y del código el 21 de octubre
de 2026. Estado: propuesta de experiencia y estructura; todavía no implementada.

Actualización de la creación: la dirección más reciente simplifica el creador
a una sola pantalla con selección de rutinas y días. La secuencia está en
`design-proposals/routines-planning/simple-creation/README.md`. El recorrido de
cuatro pasos descrito más abajo queda como propuesta inicial de referencia.

## Problema que debemos resolver

Una persona debe poder responder, sin conocer la arquitectura de la aplicación:

- Qué rutina contiene sus ejercicios.
- Qué plan organiza esas rutinas durante varias semanas.
- Qué debe hacer para dejar una semana lista para entrenar.

La experiencia principal será personal. La gestión de alumnos reutilizará los
mismos componentes de calendario y selección, con sus permisos y lenguaje propios.

## Hallazgos de la auditoría

| Situación observada | Efecto | Cambio propuesto |
| --- | --- | --- |
| El título móvil dice «Rutinas» mientras la pestaña inicial muestra «Planificaciones». | El usuario no identifica dónde está. | Encabezado «Planes y rutinas», con «Mi plan» y «Mis rutinas». |
| El botón principal es un icono `+` que cambia de función según la pestaña. | Hay que descubrir qué va a crear. | Acciones con texto explícito: «Crear planificación» o «Crear rutina». |
| La vista principal del plan dedica una gran superficie a una foto y repite el resumen de hoy. | Oculta lo que se necesita para organizar el entrenamiento. | Identificación compacta del plan y su semana directamente debajo. |
| El creador comienza con cuatro caminos: desde cero, plantilla, duplicación y plan rápido. | Se exige elegir un método antes de entender el resultado. | Un único recorrido; reutilizar un plan será una entrada secundaria. |
| La creación personal reutiliza textos de gestión de alumnos. | Aparecen «asignar», «coach» y notificaciones a uno mismo. | Textos personales para el atleta y lenguaje de asignación solo en gestión de alumnos. |
| El creador personal recibe `manageRoutinesSeparately` y una biblioteca vacía. Las filas dicen «Seleccionar rutina», pero abren la selección del tipo de actividad. | La acción no corresponde con su etiqueta y no completa el día. | Seleccionar una rutina directamente, dentro del mismo recorrido. |
| La revisión personal muestra «Listo para asignar» aunque los días no tienen rutinas. | La confirmación promete un plan terminado que aún exige configuración. | Reservar «Listo para entrenar» a un calendario válido y completo. |
| El tercer paso se llama «Seguimiento», pero también es la revisión y activación. | El indicador no anticipa lo que ocurrirá. | Un paso final «Revisar»; seguimiento como sección opcional. |
| Hay guardado superior, guardado de borrador, creación y una confirmación posterior. | El usuario no sabe qué acción termina el proceso. | Un botón principal por paso; al final, activar o programar con un resumen claro. |
| El detalle expone una tira de todas las semanas. | Aumenta el ruido cuando el plan se alarga. | Mostrar una semana y navegar con anterior/siguiente y un selector compacto. |
| «Rutinas» contiene versiones de planes activos, pausados y rutinas personales con nombres repetidos. | Es difícil saber qué se puede reutilizar y qué se está editando. | Biblioteca personal primero; variantes de planes accesibles desde cada plan y con su contexto. |

## Estructura de la sección

### Mi plan

Mostrar directamente el contenido útil del plan activo:

1. Nombre, estado y duración en un resumen compacto.
2. «Esta semana · 19–25 oct», avance y navegación de semana.
3. Lista de los siete días. Los días de entrenamiento muestran rutina y
   cantidad de ejercicios; los descansos son filas pequeñas.
4. Acceso explícito a editar la semana.
5. Planes anteriores, pausados y borradores en una lista secundaria plegable.

Si no hay plan, mostrar una explicación de una línea y «Crear planificación».
Si hay un borrador incompleto, ofrecer «Continuar configuración» y señalar
qué falta. Mantener disponible el entrenamiento libre.

El inicio de una sesión permanece en «Entrenar». Evitar volver a colocar
el entrenamiento de hoy como el elemento principal de esta sección.

### Mis rutinas

Una rutina es una lista reutilizable de ejercicios, series y repeticiones.

- Lista compacta con nombre, ejercicios, duración estimada y miniatura discreta.
- Búsqueda y «Crear rutina» visibles.
- «Usada en Mes 1» como contexto cuando corresponda.
- Editar, duplicar y archivar en acciones secundarias de cada elemento.
- No fusionar automáticamente elementos con nombres iguales: pueden contener
  ejercicios o configuraciones diferentes.
- Al editar una variante, explicar si el cambio corresponde solo al plan o
  a la rutina guardada. Conservar las versiones vinculadas al historial.

## Un único creador de planificación

Pantalla dedicada en móvil, con retroceso predecible, indicador «Paso N de 4»
y una acción principal fija al pie. No encadenar ventanas superpuestas.
El selector de rutina reemplaza temporalmente el contenido y devuelve al mismo día.

### 1. ¿Qué días entrenarás?

Seleccionar los días de la semana directamente. Mostrar el número elegido y
explicar que los restantes serán descanso. No pedir primero nombre, objetivo
y nivel.

Una entrada secundaria, «Mis días cambian cada semana», ofrece el ciclo en
orden con un ejemplo breve. Conservar tanto calendario fijo como ciclo flexible.
La recuperación activa se configura al editar un día; no debe interponerse
entre «Elegir rutina» y su biblioteca.

Acción: «Elegir rutinas».

### 2. ¿Qué entrenarás cada día?

Cada día elegido tiene una fila con su rutina o «Elegir rutina». Al pulsar,
mostrar las rutinas disponibles con búsqueda y resumen de ejercicios.

- Permitir repetir una rutina en varios días.
- Permitir crear una rutina si todavía no existe y regresar sin perder el plan.
- Permitir cambiar una elección sin rehacer la semana.
- Mostrar cuántos días faltan por completar.
- Un plan sin rutinas puede conservarse como borrador; no puede presentarse
  como preparado para entrenar.

Acción: «Elegir fechas».

### 3. ¿Cuándo empieza y cuánto dura?

Fecha de inicio y duración con opciones simples y una duración personalizada.
Mostrar siempre la fecha de finalización calculada.

Sugerir un nombre editable. Objetivo, nivel y notas son secundarios, con los
datos existentes del perfil cuando sean aplicables. No inventar una prescripción
de entrenamiento por seleccionar un objetivo.

Acción: «Revisar mi plan».

### 4. Tu planificación está lista

Mostrar una semana real con sus rutinas, los días de descanso, las fechas y
la duración. Cada sección permite volver a editar conservando el resto.

- Inicio actual: «Activar mi plan».
- Inicio futuro: «Programar para el [fecha]».
- Borrador: acción secundaria «Guardar para después».
- Si hay otro plan activo, explicar exactamente qué cambiará antes de
  confirmarlo, siguiendo las reglas existentes de activación.

El seguimiento personal será opcional y comprensible. Las reglas del coach y
las notificaciones al alumno solo aparecen en el contexto de gestión de alumnos.
No activar por sorpresa seis tareas como requisito de crear una semana.

Tras terminar, abrir el plan que se creó. No crear un plan vacío para después
obligar a buscar dónde asignarle rutinas.

## Dirección visual

- Mantener la paleta cálida y los controles negros de la aplicación.
- Usar el espacio y la jerarquía para agrupar: un resumen de plan, filas de días
  y tarjetas seleccionables para rutinas; evitar tarjetas dentro de tarjetas.
- Reducir fotografías grandes en las pantallas de organización.
- Limitar la información inicial a nombre, semana, días y rutinas.
- Mostrar un estado por elemento con texto claro, sin repetirlo en varios badges.
- En escritorio, semana y resumen pueden compartir dos columnas. En móvil,
  una sola tarea principal por pantalla y controles táctiles accesibles.
- El creador admite desplazamiento vertical cuando sea necesario; la animación
  sin scroll de «Entrenar» es una decisión específica de esa pantalla.

## Orden de implementación

1. Creador personal completo: días, rutinas, fechas y revisión. Es el bloqueo
   principal y debe entregar un plan utilizable desde su confirmación.
2. Inicio de «Mi plan» y navegación del calendario.
3. Biblioteca de rutinas y edición contextual.
4. Reutilización de planes, plantillas y adaptación de la gestión del coach.

Separar la orquestación del planificador, el selector de rutinas, el resumen y
el calendario del componente grande `Routines.jsx`. Reutilizar las operaciones
existentes de datos donde sus contratos sirvan; revisar las asignaciones necesarias
para que la creación no produzca un éxito parcial silencioso.

## Criterios de aceptación

- Se puede crear un plan con varias rutinas sin abandonar el creador.
- Elegir una rutina cumple la acción anunciada por el botón.
- No aparece «Listo para entrenar» mientras falten rutinas o fechas válidas.
- Un error de guardado conserva las elecciones y permite reintentar sin duplicar planes.
- Retroceder y crear una rutina intermedia conserva la configuración del plan.
- Solo la acción final activa o programa el plan; un borrador no se activa.
- El lenguaje corresponde al rol y al destinatario del plan.
- Los planes activos, pausados, programados y los borradores siguen accesibles.
- Se conserva el historial, las variantes de ejercicios y los permisos de gestión.
- Extender un plan conserva su identidad y no crea otra planificación.
- La semana visible sigue siendo legible en planes de muchas semanas.
- Las vistas funcionan en móvil, escritorio y temas claro y oscuro, con teclado
  y lector de pantalla.
