# Dashboard: actividad de hoy

La pantalla conserva la paleta cálida, la navegación y los datos existentes.
El calendario precede a una única tarjeta fotográfica del entrenamiento. La
acción cambia entre comenzar, continuar, ver resumen y ver recuperación. Un
check-in pendiente recibe la acción principal cuando ya no hay entrenamiento
por completar. Las tareas obligatorias del coach siguen visibles y mantienen
sus destinos y campos solicitados.

El resumen de actividad usa las sesiones y series completadas del mes actual,
sin incluir fechas futuras. La vista breve presenta las últimas diez sesiones
con barras apiladas por músculo, sus colores y la leyenda completa; al pulsarla se abre el historial muscular completo con
sus filtros, colores y cantidades originales. La planificación se presenta como
una fila que abre su progreso completo. Los registros opcionales se agrupan
en accesos compactos; el calendario mensual y la carga histórica permanecen
disponibles en «Actividad y carga histórica».

En escritorio se distribuyen las acciones de hoy y el análisis en dos columnas.
En móvil se conserva el mismo orden y se usa la navegación inferior existente.
Los estados iniciales, evaluación pendiente y planificación programada mantienen
su flujo de bienvenida. Los estilos nuevos están limitados a `.daily-workspace`.

## Fotografía

Recurso final: `public/images/dashboard-workout-completed-color.jpg`.
Se generó con la herramienta integrada imagegen usando como referencia
`public/images/daily-plan-ready-card.webp`; se codificó como JPEG a calidad 85
para reducir su transferencia. La versión final conserva los colores naturales de
la fotografía y no se desatura con CSS. No contiene interfaz ni texto.

Prompt de generación del encuadre inicial:

> Edit this existing fitness photograph to create a WIDE PANORAMIC WEB APP HERO IMAGE, approximately 1536x768 with a 2:1 aspect ratio. Preserve the same black-and-white photographic look, the SAME adult athletic man standing relaxed hands on hips after training, the same barbell resting on floor, gym rack at right, smoky light at left. Expand the canvas horizontally with seamless realistic gym background, placing the man at roughly 68 percent of canvas width and the barbell across the lower right. Recompose/zoom out enough so his ENTIRE HEAD AND BOTH FEET are clearly inside the image with 10 percent breathing room above head and below feet. The whole man and barbell should fit within the middle 75 percent of the image vertically so responsive hero cropping never cuts off his head. Spacious quiet charcoal background at left, restrained contrast, natural proportions and anatomy. The background should feel like a professional editorial sports photograph, no gradients or abstract graphics, no text, logos, badges, watermark, frame, UI, buttons or app screenshot. Output ONLY the wide photographic asset.

Prompt de la edición final en color (imagegen, con `routine-lower-a.webp`
como referencia de color):

> Use case: lighting-weather / precise-object-edit. IMAGE 1 is the edit target, a wide panoramic gym photograph used as an app hero. IMAGE 2 is ONLY the reference for natural skin tone and warm realistic gym colors. COLORIZE image 1 into a realistic full-color sports photograph. Keep the exact same adult man, face, pose, muscle proportions, hands on hips, clothing, barbell, equipment, rack and panoramic 2:1 composition, subject at right with generous quiet room at left. Preserve head and feet inside canvas as in original. Restore natural warm skin color, dark brown hair, charcoal black clothing and natural warm gray floor, warm metallic gym materials and subtle cool daylight. Include the color accents of gym equipment: the outer bumper plates on the barbell have tasteful worn blue and red rubber faces with black edges and silver hubs, realistic sports equipment rather than neon effects. Keep equipment color accents visible and preserve detailed plate shapes. Maintain refined subdued but clearly FULL-COLOR photography, not monochrome, not selective color leaving the man gray. Do not add more objects, logos, brands, text, UI, graphics or watermarks. Do not change crop or lighting direction or make the image overly saturated. Preserve the existing understated professional gym atmosphere.
