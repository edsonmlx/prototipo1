// =============================================
// config.js — Lectura de data/config.json y de los bancos data/bib/*.json
// =============================================
//
//   data/config.json    → convocatoria, cargos, cronograma, perfiles de examen,
//                         grupos y lista de bibliografías
//   data/bib/<id>.json  → UN archivo por bibliografía con sus preguntas
//
// Formatos aceptados para cada archivo de bibliografía:
//   · { "bibliografia": {...}, "preguntas": [ ... ] }   (formato recomendado)
//   · [ ... ]                                            (lista simple)

const Config = {
  _c: null,
  _banks: {},
  /** Problemas detectados al leer los bancos: [{ id, tipo: 'json'|'faltante'|'preguntas', n? }] */
  problemas: [],

  /** Carga (una sola vez) data/config.json. Lanza Error('file'|'red'|'404'|'json'). */
  async load() {
    if (this._c) return this._c;
    if (location.protocol === 'file:') throw new Error('file');           // abierto con doble clic
    let r;
    try { r = await fetch('data/config.json', { cache: 'no-cache' }); } catch { throw new Error('red'); }
    if (!r.ok) throw new Error('404');                                    // la carpeta data/ no se subió
    try { this._c = await r.json(); } catch { throw new Error('json'); }  // error de sintaxis
    return this._c;
  },

  bib(id)   { return this._c.bibliografias.find(b => b.id === id); },
  grupo(id) { return this._c.grupos.find(g => g.id === id); },
  cargo(id) { return this._c.cargos.find(c => c.id === id); },

  /** Una pregunta es válida si tiene enunciado, ≥2 opciones y 'answer' apunta a una opción. */
  valid(q) {
    return !!q && typeof q.question === 'string' && q.question.trim() !== '' &&
      Array.isArray(q.options) && q.options.length >= 2 &&
      Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length;
  },

  _report(id, tipo, n) { if (!this.problemas.some(p => p.id === id && p.tipo === tipo)) this.problemas.push({ id, tipo, n }); },

  /** Preguntas válidas de una bibliografía (con su id de bibliografía y de grupo). */
  async bank(id) {
    if (this._banks[id]) return this._banks[id];
    const b = this.bib(id);
    let raw = [];
    try {
      const r = await fetch(b.archivo, { cache: 'no-cache' });
      if (!r.ok) this._report(id, 'faltante');
      else {
        try { const d = await r.json(); raw = Array.isArray(d) ? d : (d.preguntas || []); }
        catch { this._report(id, 'json'); }
      }
    } catch { this._report(id, 'faltante'); }
    const list = raw.filter(q => this.valid(q));
    if (raw.length - list.length > 0) this._report(id, 'preguntas', raw.length - list.length);
    return (this._banks[id] = list.map(q => ({ ...q, bib: id, grupo: b.grupo, survey: !!b.survey })));
  },

  /** { idBibliografia: nº de preguntas válidas } para todas las bibliografías. */
  async counts() {
    const out = {};
    await Promise.all(this._c.bibliografias.map(async b => { out[b.id] = (await this.bank(b.id)).length; }));
    return out;
  },
};
