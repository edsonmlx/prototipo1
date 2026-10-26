// =============================================
// modes.js — Generador de simulacros (por cargo, por área o por bibliografía)
// =============================================

// ── GENERADOR DE SIMULACROS ────────────────────────────────────
// Ids de modo:  cargo:<id> · grupo:<id> · bib:<id>
const Modes = {
  // Reparte n preguntas entre varias bibliografías de forma pareja (round-robin)
  _balanced(pools, n) {
    const qs = pools.map(p => shuffle(p)), out = [];
    while (out.length < n && qs.some(p => p.length)) qs.forEach(p => { if (out.length < n && p.length) out.push(p.pop()); });
    return out;
  },
  async _byGroup(gid) {
    const bibs = Config._c.bibliografias.filter(b => b.grupo === gid);
    return Promise.all(bibs.map(b => Config.bank(b.id)));
  },
  // Bloques del simulacro por cargo: 'base' = grupos listados en config.gruposBase (todos los cargos); 'especifica' = áreas del cargo
  async _poolsFor(key, cargo) {
    const bibs = Config._c.bibliografias.filter(b => key === 'base' ? (Config._c.gruposBase || []).includes(b.grupo) : (cargo.areas || []).includes(b.id));
    return Promise.all(bibs.map(b => Config.bank(b.id)));
  },
  label(id) {
    if (!Config._c || !id) return id;
    const [t, k] = id.split(':');
    if (t === 'cargo') return `Simulacro · ${Config.cargo(k)?.corto || k}`;
    if (t === 'grupo') return `Práctica · ${Config.grupo(k)?.nombre || k}`;
    if (t === 'bib')   return `Bibliografía · ${Config.bib(k)?.nombre || k}`;
    return id;
  },
  // → { id, name, icon, minutes, pass, questions[], requested, short }
  async build(id) {
    const cfg = await Config.load();
    const [t, k, opt] = id.split(':');
    const P = cfg.practica;

    if (t === 'cargo') {
      const cargo = Config.cargo(k); if (!cargo) return null;
      const perfil = cfg.perfiles[cargo.perfil] || cfg.perfiles.general;
      // Reparto por grupo según pesos; los grupos sin preguntas ceden su peso a los demás
      const pools = {};
      for (const g of Object.keys(perfil.pesos)) pools[g] = await this._poolsFor(g, cargo);
      const avail = Object.fromEntries(Object.entries(pools).map(([g, ps]) => [g, ps.reduce((a, p) => a + p.length, 0)]));
      const act = Object.keys(perfil.pesos).filter(g => avail[g] > 0);
      const wsum = act.reduce((a, g) => a + perfil.pesos[g], 0) || 1;
      const totalAvail = act.reduce((a, g) => a + avail[g], 0);
      const total = Math.min(perfil.preguntas, totalAvail);
      const need = {}; let given = 0;
      act.forEach(g => { need[g] = Math.min(avail[g], Math.floor(total * perfil.pesos[g] / wsum)); given += need[g]; });
      // completar hasta 'total' repartiendo lo restante en proporción a los pesos (solo grupos con banco libre)
      while (given < total) {
        const spare = act.filter(g => need[g] < avail[g]); if (!spare.length) break;
        const ws = spare.reduce((a, g) => a + perfil.pesos[g], 0), rem = total - given; let added = 0;
        spare.forEach(g => { const add = Math.min(avail[g] - need[g], Math.floor(rem * perfil.pesos[g] / ws)); need[g] += add; added += add; });
        if (!added) { const g = spare.sort((a, b) => perfil.pesos[b] - perfil.pesos[a])[0]; need[g]++; added = 1; }
        given += added;
      }
      let questions = [];
      act.forEach(g => { questions = questions.concat(this._balanced(pools[g], need[g])); });
      return { id, name: this.label(id), icon: '🎯', official: true, cargo: cargo.id,
        minutes: Math.max(5, Math.ceil(perfil.minutos * (questions.length / perfil.preguntas))), pass: perfil.aprobacion,
        questions, requested: perfil.preguntas, short: questions.length < perfil.preguntas };
    }

    if (t === 'grupo') {
      const g = Config.grupo(k); if (!g) return null;
      const pools = await this._byGroup(k);
      const total = pools.reduce((a, p) => a + p.length, 0);
      const want = P.preguntas;
      const questions = this._balanced(pools, Math.min(want, total));
      return { id, name: this.label(id), icon: g.icono, minutes: Math.max(5, Math.ceil(questions.length * P.segundosPorPregunta / 60)),
        pass: cfg.perfiles.general.aprobacion, questions, requested: want, short: questions.length < want };
    }

    if (t === 'bib') {
      const b = Config.bib(k); if (!b) return null;
      const pool = await Config.bank(k);
      const want = opt === 'all' ? pool.length : P.preguntas;
      const questions = shuffle(pool).slice(0, want);
      return { id, name: this.label(id), icon: b.icono, minutes: Math.max(5, Math.ceil(questions.length * P.segundosPorPregunta / 60)),
        pass: cfg.perfiles.general.aprobacion, questions, requested: want, short: questions.length < want };
    }
    return null;
  },
};
