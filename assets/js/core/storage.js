// =============================================
// storage.js — Persistencia local (localStorage / sessionStorage)
// =============================================

const Storage = {
  K: {
    SESSION: 'ertec_session', HISTORY: 'ertec_history', SETTINGS: 'ertec_settings',
    PENDING: 'ertec_pending', RESULT: 'ertec_result', REVIEW: 'ertec_review',
    CARGO: 'ertec_cargo', CHECK: 'ertec_check',
  },

  setSession(d)  { localStorage.setItem(this.K.SESSION, JSON.stringify({ ...d, ts: Date.now() })); },
  getSession()   {
    try {
      const s = JSON.parse(localStorage.getItem(this.K.SESSION));
      if (!s) return null;
      if (Date.now() - s.ts > 8 * 3600 * 1000) { this.clearSession(); return null; }
      return s;
    } catch { return null; }
  },
  clearSession() { localStorage.removeItem(this.K.SESSION); },

  setPending(id) { sessionStorage.setItem(this.K.PENDING, id); },
  getPending()   { return sessionStorage.getItem(this.K.PENDING); },
  clearPending() { sessionStorage.removeItem(this.K.PENDING); },

  setResult(r)  { sessionStorage.setItem(this.K.RESULT, JSON.stringify(r)); },
  getResult()   { try { return JSON.parse(sessionStorage.getItem(this.K.RESULT)); } catch { return null; } },
  clearResult() { sessionStorage.removeItem(this.K.RESULT); },

  setReview(d) { sessionStorage.setItem(this.K.REVIEW, JSON.stringify(d)); },
  getReview()  { try { return JSON.parse(sessionStorage.getItem(this.K.REVIEW)); } catch { return null; } },

  // Cargo al que postula (id de data/config.json)
  getCargo()  { return localStorage.getItem(this.K.CARGO) || ''; },
  setCargo(id){ localStorage.setItem(this.K.CARGO, id); },
  // Checklist de habilitación: { cargoId: { clave: true } }
  getChecks(cargo) { try { return (JSON.parse(localStorage.getItem(this.K.CHECK)) || {})[cargo] || {}; } catch { return {}; } },
  setCheck(cargo, key, val) {
    let all = {}; try { all = JSON.parse(localStorage.getItem(this.K.CHECK)) || {}; } catch {}
    all[cargo] = all[cargo] || {};
    if (val) all[cargo][key] = true; else delete all[cargo][key];
    localStorage.setItem(this.K.CHECK, JSON.stringify(all));
  },

  addResult(r) {
    const h = this.getHistory();
    h.unshift({ id: Date.now(),
      date: new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }), ...r });
    localStorage.setItem(this.K.HISTORY, JSON.stringify(h.slice(0, 40)));
  },
  getHistory()  { try { return JSON.parse(localStorage.getItem(this.K.HISTORY)) || []; } catch { return []; } },
  clearHistory(){ localStorage.removeItem(this.K.HISTORY); },

  getSettings() {
    try { return { darkMode: true, sound: true, showAnswers: true, ...JSON.parse(localStorage.getItem(this.K.SETTINGS)) }; }
    catch { return { darkMode: true, sound: true, showAnswers: true }; }
  },
  saveSettings(s) { localStorage.setItem(this.K.SETTINGS, JSON.stringify(s)); },

  getStats() {
    const h = this.getHistory();
    if (!h.length) return { totalExams: 0, avgScore: 0, bestScore: 0 };
    return {
      totalExams: h.length,
      avgScore:   Math.round(h.reduce((a, b) => a + b.percentage, 0) / h.length),
      bestScore:  Math.max(...h.map(x => x.percentage)),
    };
  },
  getRanking() { return this.getHistory().slice().sort((a, b) => b.percentage - a.percentage).slice(0, 10); },
};
