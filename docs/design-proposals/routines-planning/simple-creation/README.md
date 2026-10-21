# Creación simplificada de una planificación

Propuesta visual posterior al creador de cuatro pasos de la primera lámina.
La dirección actual es una sola lista de lunes a domingo: en cada fila se elige
una rutina o «Descanso».
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

- La pantalla principal muestra únicamente la semana, un resumen de frecuencia
  y el botón «Crear planificación». No hay paleta, tarjetas por rutina ni modos
  de colocar o quitar entrenamientos.
- Cada día tiene un selector nativo con «Descanso» y las rutinas disponibles.
  Cambiar la selección afecta únicamente a ese día. Las rutinas personales y las
  procedentes de una planificación se agrupan para distinguir nombres repetidos.
- Todos los días empiezan como descanso. Se requiere al menos un entrenamiento.
- Nombre, inicio y duración se editan bajo «Ajustar». Inicio hoy y cuatro semanas
  por defecto; objetivo, nivel y notas quedan en «Más opciones».
- La biblioteca vacía muestra una acción directa para crear una rutina. Crear una
  rutina conserva el formulario y la incorpora a los selectores sin asignarla por
  error a ningún día.
- El botón final guarda exactamente la semana visible, sin confirmación intermedia.
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
