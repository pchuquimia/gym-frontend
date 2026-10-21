# Creación simplificada de una planificación

Propuesta visual posterior al creador de cuatro pasos de la primera lámina.
La dirección actual es una sola pantalla donde se colocan rutinas directamente
en los días de la semana, con el formato visual de «Crear rutina».
Estas imágenes son estados de la interacción, no cuatro páginas obligatorias.
Son referencias conceptuales de la propuesta anterior. El creador actual está en
«Rutinas y planificación → Nueva planificación».

## Secuencia

1. `01-select-routines.png`: elegir las rutinas guardadas.
2. `02-select-days.png`: mantener las rutinas elegidas y marcar los días.
3. `03-review-create.png`: ver la distribución propuesta y crear el plan.
4. `04-created-plan.png`: confirmar el resultado y abrir el plan.

## Propuesta anterior representada en las imágenes

- Ofrecer las rutinas existentes con selección múltiple.
- Alternarlas en el orden mostrado sobre los días elegidos.
- Mostrar la semana resultante antes de crearla y permitir cambiar cada asignación.
- Mostrar «Empieza hoy · 4 semanas» como una configuración editable.
- Sugerir un nombre editable a partir de las elecciones.
- Mantener objetivo, nivel, notas y seguimiento en opciones secundarias.
- No guardar ni activar un plan hasta pulsar la acción final.
- Si ya hay otro plan activo, explicar su tratamiento según las reglas existentes
  antes de confirmar el reemplazo.
- Conservar el progreso del formulario al consultar o crear una rutina.

Imágenes conceptuales generadas con ImageGen integrado. Las rutinas, fechas y
cantidades son ejemplos de interfaz. Los prompts completos se guardan junto a ellas.

## Implementación

- Se reutilizan `Modal`, `Button` y `ChoiceCard` de «Crear rutina». Las tarjetas
  comparten altura mínima de 72 px, márgenes interiores, tipografía, bordes,
  selección y distribución: una columna en móvil, dos desde 640 px.
- La semana está disponible desde el inicio. Se elige una rutina y se tocan sus
  días para asignarla; tocar de nuevo una asignación con esa misma rutina la quita.
- Elegir otra rutina y tocar un día reemplaza su asignación. El modo «Descanso»
  permite quitar cualquier asignación sin buscar la rutina anterior.
- Cada rutina tiene un color estable en el calendario; se muestran su nombre,
  ejercicios y los totales de entrenamientos y descansos.
- No hay selección múltiple previa, confirmación intermedia ni una segunda vista
  de revisión. El botón «Crear planificación» guarda directamente la semana visible.
- Se muestran cuatro opciones de rutina, con búsqueda y acceso al resto. Al volver
  de crear una rutina, queda seleccionada para colocarla sin asignar días por error.
- La distribución se repite cada semana. Fecha, duración, nombre y otros ajustes
  se agrupan bajo «Ajustar»: inicio hoy y cuatro semanas por defecto.
- Se restauran tanto los formularios actuales como los borradores locales del
  creador anterior sin cambiar sus asignaciones.
- Vista de confirmación con resumen y acceso al plan. Los inicios futuros quedan
  programados según las reglas actuales del servidor.
- Aviso previo sobre el plan activo y sobre otras planificaciones programadas.
- Formulario conservado durante la creación de rutinas y la navegación a la
  biblioteca. Persistencia por usuario en la sesión del navegador; cerrar el
  creador descarta el formulario local.
- Guardado como borrador, asignación de todas las rutinas y activación al final.
  Si falla una asignación o la activación, se conserva el borrador y el reintento
  consulta su estado antes de continuar, sin volver a crearlo.
- Las rutinas que pertenecen a otro plan se copian al nuevo, conservando su
  ámbito de progresión, para que pausar el plan anterior no las inhabilite.
- La edición avanzada de planes existentes y las plantillas de entrenadores
  conservan sus editores actuales.

Validación: pruebas de componente y servicio, regresión de Rutinas/Entrenar,
compilación y revisión visual en navegador. La revisión con la cuenta real no
crea planes ni modifica su planificación activa.
