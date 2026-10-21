# Creación simplificada de una planificación

Propuesta visual posterior al creador de cuatro pasos de la primera lámina.
La dirección preferida es una sola pantalla con dos elecciones: rutinas y días.
Estas imágenes son estados de la interacción, no cuatro páginas obligatorias.
Son referencias conceptuales. El creador personal ya aplica esta estructura en
«Rutinas y planificación → Nueva planificación».

## Secuencia

1. `01-select-routines.png`: elegir las rutinas guardadas.
2. `02-select-days.png`: mantener las rutinas elegidas y marcar los días.
3. `03-review-create.png`: ver la distribución propuesta y crear el plan.
4. `04-created-plan.png`: confirmar el resultado y abrir el plan.

## Comportamiento propuesto

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

- Una pantalla con búsqueda, selección múltiple y orden de selección visible.
- «Listo, elegir días» compacta la lista; «Cambiar rutinas» vuelve a abrirla.
- Distribución semanal de lunes a domingo con descansos y asignaciones editables.
  La distribución se repite cada semana y todas las rutinas elegidas deben tener
  al menos un día asignado antes de crear.
- Inicio hoy, cuatro semanas y nombre sugerido; objetivo, nivel y notas opcionales.
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
