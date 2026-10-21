# Dashboard: actividad de hoy

La pantalla conserva la paleta cálida, la navegación y los datos existentes.
El calendario precede a una única tarjeta fotográfica del entrenamiento. La
acción cambia entre comenzar, continuar, ver resumen y ver recuperación. El
dashboard no muestra la tarjeta de check-in. Las tareas obligatorias del coach siguen visibles y mantienen
sus destinos y campos solicitados.

El dashboard no incluye el bloque «Tu actividad». El calendario y el resumen
mensual siguen disponibles en «Actividad y carga histórica». La vista breve
de series presenta los días con series
completadas de la semana anterior y la actual hasta hoy, con una posición por
día transcurrido. Los días pasados sin entrenamiento registrado se marcan con
una luna. Las fechas futuras se excluyen y el rango de la semana actual termina
en la fecha de hoy.
No se añade una leyenda inferior de descanso. Las sesiones del mismo día se suman en una barra apilada por
músculo, manteniendo sus colores. La vista compacta evita el eje numérico
redundante, las fechas repetidas y la leyenda muscular extensa: conserva los
totales sobre las barras, el número de día y un único rango por semana.
Las etiquetas semanales se alinean con sus días visibles y una separación
vertical marca el cambio de semana.
El rango de la semana actual se destaca en negrita y el día de hoy se subraya.
Al pulsarla se abre el historial muscular completo con la leyenda de músculos,
sus filtros, colores y cantidades originales. Las fechas y el desglose por músculo
de cada día también están disponibles en los textos accesibles y al pasar el
cursor. El acceso al detalle usa una flecha en el encabezado, sin una fila de
navegación adicional. «Tu planificación» aparece debajo de la gráfica de series:
incluye nombre del plan, semana actual, cambio porcentual del índice de
rendimiento y una gráfica compacta de variación porcentual. La escala incluye
siempre el 0%, con una referencia discontinua, tres etiquetas de porcentaje y
fechas del primer y último registro. Los puntos conservan la distancia real
entre fechas; el área tenue y el punto final ayudan a seguir la evolución.
«Cómo se calcula» despliega la explicación sin ocupar espacio al entrar.
Usa el historial completo del plan y
la misma comparación de ejercicios y configuraciones que el progreso existente.
El índice se calcula como `100 × mediana(última marca / primera marca)` de
las variantes de ejercicio con al menos dos registros compatibles en el período.
Cada variante pesa una vez, independientemente de su frecuencia. Se conserva
la misma configuración, ámbito de progresión y sede. Las primeras observaciones
de variantes nuevas no cuentan como mejoras. Los cambios no se multiplican
entre ejercicios ni se limitan artificialmente a un porcentaje máximo. La
agrupación visual por día, semana o mes conserva el mismo resultado final.
El porcentaje es el cambio típico de marcas comparables desde el inicio de
cada ejercicio, no una mejora absoluta de fuerza. Las bajadas se muestran en
rojo. No se inventan curvas ni
porcentajes cuando faltan comparaciones; se indica la carga o el error con
opción de reintentar. «Ver plan» abre el progreso completo del plan activo.
Los registros opcionales se agrupan
en accesos compactos; el calendario mensual y la carga histórica permanecen
disponibles en «Actividad y carga histórica».

En escritorio se distribuyen las acciones de hoy y el análisis en dos columnas.
En móvil se conserva el mismo orden y se usa la navegación inferior existente.
El entrenamiento, las series y la planificación se presentan en tarjetas con
el fondo de superficie del tema, borde fino, radio de 18 px y sombra suave.
Las dos gráficas tienen 16 px de relleno en móvil y 20 px en escritorio, con
16 px entre tarjetas. Los registros opcionales permanecen fuera de ellas.
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
