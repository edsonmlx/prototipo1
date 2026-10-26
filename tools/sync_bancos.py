#!/usr/bin/env python3
"""
sync_bancos.py — Sincroniza data/bib/*.json con data/config.json

· Crea el archivo de cada bibliografía registrada en config.json si no existe.
· Actualiza la cabecera ("bibliografia": nombre, grupo, cargos que la rinden) SIN tocar tus preguntas.
· Avisa de archivos en data/bib/ que no estén registrados en config.json.

Uso:  python3 tools/sync_bancos.py
"""
import json
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CONFIG = RAIZ / "data" / "config.json"
BIB = RAIZ / "data" / "bib"

FORMATO = {
    "question": "Enunciado de la pregunta",
    "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
    "answer": 1,
    "fuente": "Artículo, capítulo o página de la bibliografía",
    "explicacion": "(opcional) Por qué esa es la respuesta correcta",
}


def leer_preguntas(ruta: Path):
    """Devuelve las preguntas de un archivo existente (lista simple o con cabecera)."""
    if not ruta.exists():
        return []
    try:
        datos = json.loads(ruta.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        sys.exit(f"✖ {ruta.name} tiene un error de sintaxis ({e}). Corrígelo antes de sincronizar.")
    return datos if isinstance(datos, list) else datos.get("preguntas", [])


def main():
    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    grupos = {g["id"]: g["nombre"] for g in cfg["grupos"]}
    cargos = cfg["cargos"]
    BIB.mkdir(parents=True, exist_ok=True)
    creados = actualizados = 0

    for b in cfg["bibliografias"]:
        ruta = RAIZ / b["archivo"]
        existia = ruta.exists()
        if b["grupo"] in cfg.get("gruposBase", []):
            rinden = ["Todos los cargos"]
        else:
            rinden = [c["corto"] for c in cargos if b["id"] in c.get("areas", [])] or ["(ningún cargo asignado todavía)"]
        cabecera = {
            "id": b["id"],
            "nombre": b["nombre"],
            "detalle": b.get("autor", ""),
            "grupo": grupos.get(b["grupo"], b["grupo"]),
            "rinden": rinden,
        }
        contenido = {"bibliografia": cabecera, "_formato": FORMATO, "preguntas": leer_preguntas(ruta)}
        ruta.write_text(json.dumps(contenido, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        creados += not existia
        actualizados += existia

    registrados = {Path(b["archivo"]).name for b in cfg["bibliografias"]}
    for f in sorted(BIB.glob("*.json")):
        if f.name not in registrados:
            print(f"⚠ {f.name} no está registrado en data/config.json (la app lo ignora)")

    print(f"✔ {creados} archivo(s) creados, {actualizados} actualizados · {len(cfg['bibliografias'])} bibliografías")


if __name__ == "__main__":
    main()
