# Avatares deportivos de RirFit

El catálogo incluye 18 personajes: nueve hombres y nueve mujeres. Se sirven desde tres láminas locales de 1536 × 1024 píxeles, con tres columnas y dos filas cada una. `ProfileAvatar` muestra cada celda mediante CSS, sin un servicio externo.

| Archivo en `public/images/avatars/` | Contenido |
| --- | --- |
| `gym-avatars-v1.png` | Los seis personajes originales aprobados |
| `gym-men-v1.png` | Seis hombres nuevos: gym-07 a gym-12 |
| `gym-women-v1.png` | Seis mujeres nuevas: gym-13 a gym-18 |

| ID guardado en el perfil | Posición |
| --- | --- |
| gym-01 | Arriba izquierda: hombre con camiseta negra sin mangas |
| gym-02 | Arriba centro: mujer con moño y camiseta verde |
| gym-03 | Arriba derecha: hombre con cinta deportiva |
| gym-04 | Abajo izquierda: mujer con coleta rubia |
| gym-05 | Abajo centro: hombre con camiseta verde |
| gym-06 | Abajo derecha: mujer de cabello corto |
| gym-07 | Arriba izquierda en hombres: cabello y barba grises |
| gym-08 | Arriba centro en hombres: piel oscura, calvo |
| gym-09 | Arriba derecha en hombres: cabello negro con raya lateral |
| gym-10 | Abajo izquierda en hombres: cabello pelirrojo |
| gym-11 | Abajo centro en hombres: cabello rizado y barba negra |
| gym-12 | Abajo derecha en hombres: cabello castaño corto |
| gym-13 | Arriba izquierda en mujeres: cabello gris recogido |
| gym-14 | Arriba centro en mujeres: piel oscura, moño trenzado |
| gym-15 | Arriba derecha en mujeres: coleta negra |
| gym-16 | Abajo izquierda en mujeres: cabello pelirrojo y cinta |
| gym-17 | Abajo centro en mujeres: cabello corto rizado |
| gym-18 | Abajo derecha en mujeres: cabello castaño y gafas |

La foto personal tiene prioridad. En Perfil → Información personal se puede indicar Género: Mujer (`female`), Hombre (`male`) o Sin especificar (`""`). Con un género registrado, se asigna una opción estable entre sus nueve avatares y el selector muestra esas nueve opciones. Si un avatar anterior corresponde al otro género, se sustituye por uno compatible tanto en la interfaz como al guardar en el servidor. El nombre solo permite elegir una variante estable dentro del grupo; nunca se utiliza para deducir el género.

Sin género registrado, se muestran las 18 opciones para elegir manualmente; si tampoco hay elección, se muestra una silueta neutra. La elección y el género se guardan en `profile.avatarId` y `profile.gender`, y se comparten en las respuestas de alumnos, planes y mensajes. Seleccionar un avatar desasigna la foto del perfil sin eliminarla de la biblioteca. No se modifican automáticamente los datos de las cuentas existentes.

## Procedencia

Ilustraciones originales derivadas de la propuesta visual aprobada en esta conversación. Generación y edición mediante la herramienta integrada `image_gen`, sin DiceBear ni llamadas a una API en ejecución. Original conservado en `C:/Users/ipouk/.codex/generated_images/01a1837c-e1ff-7ff2-ad05-27967c50fc47/exec-979ce351-81af-4549-8191-c77da0afb00a.png`.

Imagen de referencia: `exec-42a156aa-e706-4ca9-9bc6-57391d2fe6f6.png`, en el mismo directorio de generación.

## Prompt final utilizado

Use case: compositing / precise-object-edit. Edit target: the supplied approved RIRFIT avatar proposal image. Extract and recompose ONLY its SIX large illustrated sports avatar characters from the gallery into a clean production-ready single sprite sheet. Keep exactly these six identities, faces, skin tones, hair and sports clothing, the same appealing refined cartoon drawing style and palette. Remove ALL typography, brand text, user-interface, phone, captions and other objects. Output ONE landscape 3:2 image laid out as EXACTLY three columns and two rows of SQUARE equally sized tiles, touching edge-to-edge with NO gutter and NO outer margin. Every tile contains exactly one centered head-and-shoulders portrait filling the square, preserving full hairstyle and shoulders. Instead of a circular frame, each square tile should have a uniform solid muted background filling the entire tile so the app can mask it into a circle. Face centers aligned consistently. Order MUST match original gallery reading order: upper left brown-haired bearded man in black athletic tank top against muted sage, upper middle brunette woman with messy bun in sage gym tank against taupe, upper right young curly dark-haired man with charcoal sweatband and dark athletic T-shirt against sage; lower left blonde ponytail woman in dark sports tank against taupe, lower middle dark-skinned smiling bearded man with short tight curls and sage athletic T-shirt against sage, lower right brunette bob-haired woman in dark athletic tank against taupe. Preserve the exact six approved characters, do not introduce new identities or extra accessories. Crisp professionally finished illustration, no gradients on background, NO letters, NO labels, NO borders, NO shadows outside subjects, NO circle outlines, NO UI. Each square must be a standalone usable avatar when clipped to a circle at its center. Native landscape 3:2 proportions, six equal square tiles forming a precise grid.


## Ampliación de doce personajes

Generada con la herramienta integrada `image_gen`, usando la lámina original como referencia de estilo. Archivos originales: `exec-f5233830-3b63-429b-9c77-edf8834a473b.png` (hombres) y `exec-2892f899-292e-4d46-b48e-3f1019bb5d76.png` (mujeres), en el mismo directorio de generación indicado arriba.

### Prompt final: hombres

Use case: illustration-story, production avatar sprite sheet. Reference image is ONLY a drawing style reference: match its polished hand-drawn cartoon portraits, crisp dark outlines, warm skin shading, muted sage and taupe backgrounds, plain charcoal/sage gym clothing. Create SIX NEW, clearly distinct ADULT gym avatar characters, not copies of the reference characters. ONE landscape image at exactly 3:2 proportions, 1536 by 1024 if possible. EXACTLY three columns and two rows, six equal square cells touching edge-to-edge with no gutter or outer margin. Each cell one centered head and shoulders portrait, full hairstyle inside its cell, shoulders filling the lower edge, solid muted sage or taupe background filling the entire square. This atlas will be clipped to circles by CSS, so consistent framing is essential. No circle frames, no borders, no words, letters, labels, UI, symbols, watermarks or equipment. Professional friendly expressions, natural athletic physiques, all fully clothed in simple sports tops. Keep the same neutral understated RIRFIT visual language. All SIX characters are MEN. Precise reading order left to right: (1) mature light-skinned man around 50, short salt-and-pepper hair and neat grey beard, sage sports T-shirt; (2) dark-skinned bald athletic man around 30, clean-shaven, black athletic tank; (3) East Asian man around 25, short straight black hair with side part, charcoal sports T-shirt; (4) fair-skinned man around 30, wavy ginger hair, light freckles and light ginger stubble, taupe athletic tank; (5) South Asian man around 35, dark curly hair and neatly trimmed full black beard, muted green sports T-shirt; (6) olive-skinned man around 25, short brown crew cut, clean-shaven, black sleeveless sports top. Six distinct memorable faces, not just recolors. Alternate sage and taupe tile backgrounds.

### Prompt final: mujeres

Use case: illustration-story, production avatar sprite sheet. Reference image is ONLY a drawing style reference: match its polished hand-drawn cartoon portraits, crisp dark outlines, warm skin shading, muted sage and taupe backgrounds, plain charcoal/sage gym clothing. Create SIX NEW, clearly distinct ADULT gym avatar characters, not copies of the reference characters. ONE landscape image at exactly 3:2 proportions, 1536 by 1024 if possible. EXACTLY three columns and two rows, six equal square cells touching edge-to-edge with no gutter or outer margin. Each cell one centered head and shoulders portrait, full hairstyle inside its cell, shoulders filling the lower edge, solid muted sage or taupe background filling the entire square. This atlas will be clipped to circles by CSS, so consistent framing is essential. No circle frames, no borders, no words, letters, labels, UI, symbols, watermarks or equipment. Professional friendly expressions, natural athletic physiques, all fully clothed in simple sports tops. Keep the same neutral understated RIRFIT visual language. All SIX characters are WOMEN. Precise reading order left to right: (1) mature light-skinned woman around 50, tied-back silver-grey hair and friendly face, sage sports T-shirt; (2) dark-skinned woman around 30, braided hair in a high bun, charcoal modest athletic top; (3) East Asian woman around 25, long black ponytail, taupe sports T-shirt; (4) fair-skinned woman around 30, wavy red hair in a loose tied-back style and subtle dark sports headband, green gym T-shirt; (5) tan-skinned woman around 35, short natural curly dark hair, black sports T-shirt; (6) light olive-skinned woman around 25, shoulder-length light brown bob, discreet round glasses, sage athletic T-shirt. Six distinct memorable faces, not just recolors. Modest practical gym clothing without low necklines. Alternate sage and taupe tile backgrounds.
