# ERTEC · Simulacro de Institucionalización de Cargos 2027-2029

Simulacro del examen de competencia de la **Convocatoria Pública N° 0001/2026**
(Ministerio de Educación · Sistema Educativo Plurinacional). Aplicación web estática: HTML + CSS + JavaScript, sin dependencias ni compilación.

## Estructura del proyecto

```
ertec/
├── index.html · login.html · exam.html · results.html · history.html   Páginas (solo marcado HTML)
├── manifest.json · sw.js                                                PWA: instalable y funciona sin internet
├── assets/
│   ├── css/
│   │   ├── base.css            Tokens de diseño (colores, tipografía), reset, tema claro/oscuro
│   │   ├── animations.css      @keyframes y utilidades de animación (respeta prefers-reduced-motion)
│   │   ├── components.css      Loader, toast, modal, botones, navegación, pestañas, barras
│   │   ├── layout.css          Adaptación a pantallas anchas (menú lateral, contenido centrado)
│   │   └── pages/              Estilos exclusivos de cada página
│   ├── js/
│   │   ├── core/               utils · storage · config · modes · fx · timer · sound · sw-register
│   │   └── pages/              Lógica de cada página (login, index, exam, results, history)
│   └── icons/
├── data/
│   ├── config.json             Convocatoria: cargos, costos, cronograma, perfiles de examen, bibliografías
│   ├── bib/                    UN JSON por normativa (16 archivos) ← aquí van tus preguntas
├── docs/FORMATO-PREGUNTAS.md   Cómo escribir las preguntas
└── tools/                      validar_bancos.py · sync_bancos.py
```

## Bibliografía: 16 normativas (data/bib/)
Un JSON por normativa, numerados en el mismo orden de la lista que te entregó tu contacto:

| # | Archivo |
|---|---|
| 1 | `01_constitucion_politica_del_estado` |
| 2 | `02_ley_070_avelino_sinani_elizardo_perez` |
| 3 | `03_ley_045_contra_el_racismo_y_la_discriminacion` |
| 4 | `04_ley_348_vida_libre_de_violencia` |
| 5 | `05_ley_548_codigo_nina_nino_adolescente` |
| 6 | `06_ley_223_personas_con_discapacidad` |
| 7 | `07_ley_1178_administracion_y_control_gubernamentales` |
| 8 | `08_ley_004_lucha_contra_la_corrupcion` |
| 9 | `09_ds_4688_reglamento_escalafon_nacional` |
| 10 | `10_rs_212414_reglamento_faltas_y_sanciones` |
| 11 | `11_rm_864_2019_protocolo_violencia` |
| 12 | `12_rm_069_2025_educacion_inclusiva` |
| 13 | `13_rm_0020_0021_0022_2024_apertura_modificacion_cierre` (el título de la lista aparece cortado) |
| 14 | `14_rm_0190_2024_evaluacion_desarrollo_curricular` |
| 15 | `15_rm_800_2015_libretas_calificaciones_electronicas` |
| 16 | `16_rm_001_2026_subsistema_educacion_regular` |

Esta lista **no figura en el PDF de la convocatoria**: la convocatoria solo cita CPE, Ley 070, D.S. 4688 y D.S. 514 y deja el detalle al Reglamento (R.M.).

## Cómo cargar tus preguntas
1. Abre el JSON de la normativa y agrega tus preguntas dentro de `"preguntas": [ ... ]` (modelo en `docs/FORMATO-PREGUNTAS.md`).
2. Valida: `python3 tools/validar_bancos.py`
3. Recarga la app: los contadores y los simulacros se actualizan solos.

La app también avisa en pantalla si un JSON tiene errores.

## Agregar o cambiar bibliografías
1. Edita `data/config.json` → `"bibliografias"`.
2. Ejecuta `python3 tools/sync_bancos.py`: crea el archivo que falte y actualiza las cabeceras sin tocar tus preguntas.
3. Si más adelante hay otras áreas (pedagogía, etc.), agrégalas en `"grupos"` y, si no deben entrar en todos los cargos, asígnalas con `cargos[].areas`.

## Examen (valores referenciales)
La convocatoria no publica el nº de preguntas ni la nota mínima: los definirá el Reglamento (R.M.).
Hoy: 100 preguntas · 120 min · aprobación 60%, repartidas de forma pareja entre las 16 normativas que tengan preguntas.
Se ajusta en `data/config.json` → `perfiles.general`.

## Ejecutar en local
```
python3 -m http.server 8000      # en esta carpeta
```
Abre http://localhost:8000 (no abras los HTML con doble clic: el navegador bloquea la lectura de los JSON).
La contraseña de acceso está en `assets/js/pages/login.js` (constante `PASSWORD`).

## Publicar
Sube la carpeta completa a GitHub Pages, Netlify o cualquier hosting estático (mantén `data/` junto a los HTML).
