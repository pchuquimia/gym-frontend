# Fotografías de comidas

Generadas con la herramienta integrada `image_gen` (sin CLI), el 29 de octubre
de 2026. Se conservan los PNG originales en el directorio de imágenes generadas
de Codex; las versiones de producción son WebP de 384 × 384, calidad 84.

| Archivo                                  | Asunto del prompt                                                                                         |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `public/images/nutrition/breakfast.webp` | Breakfast: ceramic plate with scrambled eggs, wholegrain toast and sliced avocado, small bowl of berries. |
| `public/images/nutrition/lunch.webp`     | Lunch: ceramic plate with grilled chicken breast, rice and colorful steamed broccoli and carrots.         |
| `public/images/nutrition/dinner.webp`    | Dinner: ceramic plate with baked salmon, roasted sweet potato and a fresh green salad.                    |
| `public/images/nutrition/snack.webp`     | Snack: ceramic bowl with natural Greek yogurt, banana slices, berries, granola and a few nuts.            |

Prompt compartido; `{subject}` corresponde al asunto de cada fila:

```text
Use case: photorealistic-natural. Asset type: square meal thumbnail photograph for the RirFit nutrition app. Subject: {subject} Composition: a single appetizing meal centered and fully readable at thumbnail size, close overhead three-quarter angle, plate fills most of frame. Realistic food textures, soft natural daylight, warm pale stone tabletop, clean editorial food photography, neutral warm colors. No typography, no graphics, no icons, no collage, no hands, no packaging. One square photograph.
```

Las imágenes representan el tipo de comida. La lista desplegable conserva los
alimentos y cantidades del plan asignado. Se comparten entre la página de
alimentación y el dashboard; no requieren una API externa para cargarse.
