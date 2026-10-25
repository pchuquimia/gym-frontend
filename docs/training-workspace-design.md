# Pantalla de planificaciones y rutinas

La biblioteca del atleta se presenta como «Tu entrenamiento», con las pestañas
Planificaciones y Rutinas. Una explicación breve distingue semanas de sesiones.
Los accesos «Nuevo plan» y «Nueva rutina» conservan los creadores existentes y
solo aparecen cuando el usuario tiene permiso para crear. La navegación por
teclado entre pestañas admite flechas, Inicio y Fin.

El plan activo usa una fotografía a color de 80 × 80 px, estado, nombre y días
de entrenamiento. «Semana X de Y» y la barra representan la posición de la semana
actual dentro de la duración del plan; no son el rendimiento ni el porcentaje
de sesiones completadas. El valor permanece entre 0 y 100. Si falta la fecha de
inicio se omite la barra. El calendario muestra los días programados, sin
presentarlos como sesiones completadas. Los ciclos secuenciales muestran días
numerados y frecuencia por ciclo, en lugar de días de la semana.

«Ver planificación» abre el detalle existente, donde permanecen los controles
para iniciar sesiones y gestionar la agenda. La agenda se muestra una sola vez,
en la semana actual del plan, conservando sus fechas y sesiones realizadas.
Se elimina la fila de selectores «Semana 1, Semana 2…» porque la estructura
se repite. Los ciclos secuenciales conservan su orden y avance por día.
Los demás planes en preparación,
programados o pausados se muestran debajo. Los completados y archivados se
agrupan en un historial desplegable que conserva su acceso al detalle.

Las rutinas mantienen su agrupación por plan y una sección «Sin planificación».
Cada fila usa una imagen de 80 × 80 px en móvil y escritorio, con nombre,
cantidad de ejercicios y duración aproximada. Los nombres largos pueden ocupar
varias líneas. La fotografía usa el primer ejercicio de la biblioteca y conserva
el respaldo local si la imagen falla. Las opciones de editar, duplicar y eliminar
siguen disponibles en el menú contextual para los usuarios autorizados.

Los alumnos gestionados por coach conservan lectura y acceso a su planificación,
sin botones de creación o edición. La gestión del coach, los creadores, el detalle
de cada rutina y las pantallas de entrenamiento conservan sus flujos.

La biblioteca reutiliza la paleta del tema, bordes suaves y tarjetas de 18 px.
El color verde se reserva para el estado activo y el avance de semanas. No se
introducen datos de ejemplo ni nuevas fotografías generadas en esta pantalla.

«Nueva planificación» organiza una semana en una sola pantalla. El inicio y la
duración aparecen arriba en un resumen editable. Cada día vacío ofrece «Añadir
rutina»; al asignar una sesión muestra su fotografía a color de 80 × 80 px. Los
descansos elegidos se muestran en filas compactas. No hace falta configurar los
siete días: los que quedan sin rutina se guardan como descanso. El borrador
recuerda qué descansos se eligieron explícitamente, sin cambiar el formato de
creación del plan ni las asignaciones recuperadas de borradores anteriores.

El nombre, objetivo, nivel y notas se agrupan en «Más opciones». El pie fijo
resume los días de entrenamiento y la duración, conserva el aviso sobre el plan
activo y ofrece «Crear planificación». El selector mantiene la búsqueda, las
rutinas agrupadas por origen y el acceso a crear una rutina. Un fallo parcial
conserva el mismo borrador del servidor para reintentar sin duplicar planes.
