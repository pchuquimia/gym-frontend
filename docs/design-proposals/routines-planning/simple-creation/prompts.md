# Prompts de la secuencia simplificada

Herramienta: ImageGen integrado. Imágenes conceptuales; todavía no implementadas.
Los tres primeros prompts se forman concatenando el prefijo común y el texto de
cada estado. La última imagen se genera como variante de la tercera para mantener
el estilo. La primera solicitud de esa confirmación se interrumpió al no terminar.

## Prefijo común de los estados 1–3

```text
Use case: ui-mockup. Generate one high-fidelity tall portrait mobile app screenshot for a simplified planning flow in the Spanish fitness app RIRFIT. Senior UX/UI design, crystal-clear Spanish labels, natural Inter/SF typography, realistic spacing and accessible large touch controls. Flat front-facing artboard with no phone hardware or perspective, tall 9:19.5 portrait composition. Warm ivory app background #f5f1e8, warm white surfaces #fffdf8, near-black #181918 primary buttons, subtle warm-gray secondary text, thin neutral dividers, modest 14px rounded corners. Small natural FULL COLOR gym/exercise thumbnails, never a giant hero photo. Restrained sage only for success. No lime, no gradients, no ornate shadows, no excessive cards. This is a CONCEPT PROPOSAL, not an implemented-product screenshot. The creation UI is a SINGLE SCREEN with progressive disclosure, NOT a wizard. Absolutely NO numbered steps, progress lines, next buttons, "Paso 1", or mandatory coach settings inside the app. Include a small readable label OUTSIDE the app screenshot at the very top describing this sequence state. Keep all useful UI legible and within the tall artboard. Consistent header with back arrow, title "Crear planificación", and a small close icon; no bottom global app navigation while creating. Footer has one full-width action and safe bottom spacing. Only include the text requested, with correct Spanish spelling.
```

## 1. Elegir rutinas

```text
External state label: "1 · Elige tus rutinas".
This is the initial state of the one-screen creator. Below the header, heading "¿Qué rutinas usarás?" and small helper "Selecciona las que ya tienes." Show FOUR compact checklist rows with small square full-color exercise thumbnails, name, summary and unselected circular checkbox at right:
"Torso A" / "6 ejercicios · 50 min";
"Pierna A" / "5 ejercicios · 45 min";
"Torso B" / "6 ejercicios · 50 min";
"Pierna B" / "5 ejercicios · 45 min".
Then section "¿Qué días entrenarás?" with a row of seven clearly separated round buttons "L M X J V S D", all neutral and unselected.
Then a single editable settings row with calendar icon: "Empieza hoy · 4 semanas" and "Cambiar" at right.
A quiet collapsed row "Más opciones".
Footer button "Crear planificación" is visibly disabled in warm gray, not black. Small validation above button "Elige tus rutinas y los días." This is a simple real app screen, not a tutorial poster.
```

## 2. Marcar días

```text
External state label: "2 · Marca tus días".
This is the SAME creator screen after selecting two routines. The routine area is now compact: heading "Tus rutinas" with small action "Cambiar" aligned right. TWO compact rows only, with small full-color gym thumbnails, names "Torso A", "Pierna A", summaries "6 ejercicios · 50 min", "5 ejercicios · 45 min", and black circular selected checkmarks. A subdued one-line helper "Se alternarán en este orden."
Prominent section heading "¿Qué días entrenarás?" followed by seven evenly spaced round day buttons "L M X J V S D", all currently unselected. A little more space around the days to make this the current decision. Helper "Los demás días serán de descanso."
Below, an empty neutral preview area represented by one short line "Tu semana aparecerá aquí.", no blank giant card.
The SAME editable one-line calendar settings "Empieza hoy · 4 semanas" and "Cambiar".
A quiet collapsed "Más opciones" row.
Footer button "Crear planificación" still disabled in warm gray, helper "Selecciona al menos un día." No separate "Continuar" button. No extra panels or fields.
```

## 3. Revisar y crear

```text
External state label: "3 · Revisa y crea".
This is the SAME one-screen creator with both choices complete. Routine selection is summarized in one compact row: heading "Tus rutinas", a small "Cambiar" link, two restrained selectable chips "Torso A" and "Pierna A", not large cards.
Heading "Días de entrenamiento" and day buttons "L M X J V S D"; L, M, J, V selected near-black; X, S, D neutral. Helper "4 días por semana".
Heading "Así queda tu semana" and FOUR compact editable rows separated by hairline dividers:
"Lunes" / "Torso A" / small chevron;
"Martes" / "Pierna A" / small chevron;
"Jueves" / "Torso A" / small chevron;
"Viernes" / "Pierna A" / small chevron.
Quiet line "Miércoles, sábado y domingo · Descanso".
The SAME editable calendar settings row "Empieza hoy · 4 semanas" with "Cambiar".
A compact editable plan-name line "Torso y pierna" with pencil icon, do not introduce another large section.
Collapsed "Más opciones".
Strong full-width BLACK footer "Crear planificación". No second confirmation dialog, no new wizard page, no coach language.
```

## 4. Confirmación final

Referencia de edición: `03-review-create.png`.

```text
+Use case: ui-mockup / precise UI variant. Edit this supplied RIRFIT mobile UI reference into the FINAL SUCCESS STATE of the same simplified plan creation sequence. Keep the exact tall portrait framing, warm ivory and off-white palette, near-black buttons, typography scale and clean Spanish app styling. Do not copy the creation form. The supplied image is the style/edit target; the output is a separate new confirmation screen.

Outside the app at the top put "4 · Plan creado". Inside, a small RIRFIT wordmark at top left and close icon at top right. A restrained sage checkmark circle and clear title "Tu planificación está lista". Subtitle "Ya puedes consultar tu semana." One compact summary card: "Torso y pierna", small "Activo" badge, "21 oct – 17 nov", "4 semanas · 4 días por semana". Below, four simple weekly rows with thin separators: "Lunes · Torso A", "Martes · Pierna A", "Jueves · Torso A", "Viernes · Pierna A". Then quiet line "Miércoles, sábado y domingo · Descanso". Near the bottom one full-width BLACK button "Ver mi plan", and a quiet secondary text action "Editar planificación". Keep text crisp and correctly spelled in Spanish. No form fields, no stepper, no numbered wizard, no coach terms, no charts, no giant photo, no confetti, no phone hardware. Balanced uncluttered professional UI, same visual family as the reference.
```
