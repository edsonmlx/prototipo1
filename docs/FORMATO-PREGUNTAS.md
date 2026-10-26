# Formato de las preguntas

Cada archivo de `data/bib/` tiene esta forma:

```json
{
  "bibliografia": { "id": "ley_070_avelino_sinani_elizardo_perez", "nombre": "...", "grupo": "...", "rinden": ["..."] },
  "_formato": { "...": "modelo de referencia, la app lo ignora" },
  "preguntas": [
    {
      "question": "¿Qué artículo de la CPE reconoce el derecho a la educación?",
      "options": ["Artículo 17", "Artículo 77", "Artículo 100", "Artículo 35"],
      "answer": 0,
      "fuente": "CPE, Art. 17",
      "explicacion": "El Art. 17 establece que toda persona tiene derecho a recibir educación en todos los niveles."
    }
  ]
}
```

| Campo | Obligatorio | Descripción |
|---|---|---|
| `question` | Sí | Enunciado. |
| `options` | Sí | De 2 a 6 opciones (texto, sin repetir). La app las mezcla en cada examen. |
| `answer` | Sí | Posición de la correcta: `0` = A, `1` = B, `2` = C, `3` = D… |
| `fuente` | No | Se muestra bajo la pregunta (artículo, capítulo, página). |
| `explicacion` | No | Se muestra al responder y en la revisión de resultados. |

Reglas de oro
- Solo se modifica la lista `"preguntas"`; el resto del archivo se conserva.
- JSON no admite comentarios ni comas sobrantes al final de una lista.
- Valida siempre con `python3 tools/validar_bancos.py`.
