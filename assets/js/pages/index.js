// =============================================
// pages/index.js — Lógica de index.html
// =============================================

let CFG, COUNTS = {}, SEG, showMine = true, cdTimer = null;
const FAMNAME = { dd:'Dirección Departamental y Subdirecciones', dist:'Dirección Distrital', ue:'Unidades Educativas, CEA y CEE', esfm:'ESFM/UA e Institutos' };
const CHECK_SVG = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

window.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth('login.html')) return;
  applyTheme(); FX.ripples(); FX.nav('sim'); FX.leave();
  try { CFG = await Config.load(); COUNTS = await Config.counts(); }
  catch (e) {
    const M = { file:'Abriste la app con doble clic (file://). El navegador bloquea la lectura de los JSON así. Ábrela desde un servidor: en la carpeta ejecuta  python3 -m http.server  y entra a http://localhost:8000, o súbela a GitHub Pages / Netlify.',
      '404':'No se encontró data/config.json en el servidor. Revisa que la carpeta data/ (con config.json y la subcarpeta bib/) esté subida junto a index.html.',
      json:'data/config.json tiene un error de sintaxis (coma o llave mal puesta). Valídalo en jsonlint.com.',
      red:'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.' };
    hideLoader(); showModal('No se pudo cargar', M[e.message] || 'Error al leer data/config.json', '⚠️', null, null); return;
  }
  SEG = FX.seg(document.getElementById('seg'), showTab);
  renderAll(); hideLoader();
  const go = () => { const t = location.hash.slice(1); if (['sim','cargo','cron'].includes(t)) SEG.select(t); };
  go(); addEventListener('hashchange', go);
  FX.reveal();
  if (!Storage.getCargo() && !sessionStorage.getItem('ertec_pk')) { sessionStorage.setItem('ertec_pk','1'); setTimeout(openPicker, 900); }
});
document.getElementById('btn-dark').addEventListener('click', toggleTheme);
document.getElementById('btn-logout').addEventListener('click', () => showModal('¿Salir de ERTEC?','Tu historial y tu cargo quedan guardados en este dispositivo.','👋',()=>{ Storage.clearSession(); location.href='login.html'; },()=>{}));
document.getElementById('cargo-btn').addEventListener('click', openPicker);
document.getElementById('tg-bib').addEventListener('click', e => { onlyMine = !onlyMine; e.currentTarget.classList.toggle('on', onlyMine); renderSim(); });
document.getElementById('tg-mine').addEventListener('click', e => { showMine = !showMine; e.currentTarget.classList.toggle('on', showMine); renderCron(); });

function showTab(t) {
  FX.navActive(t); if (location.hash !== '#' + t) history.replaceState(null, '', '#' + t);
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('on', p.id === 'p-' + t));
  FX.reveal();
  if (t === 'cargo') setTimeout(()=>document.querySelectorAll('#p-cargo .bar > i').forEach(i => i.style.width = i.dataset.w + '%'), 60);
}
function renderAll() { renderHero(); renderStats(); renderSim(); renderCargoPanel(); renderCron(); renderInfo(); renderRecent(); }
const myCargo = () => Config.cargo(Storage.getCargo());

// ── HERO: cargo + cuenta regresiva ──
function renderHero() {
  const c = myCargo(), name = document.getElementById('cargo-name'), go = document.getElementById('cargo-go');
  name.textContent = c ? c.nombre : 'Elige el cargo al que postulas'; go.textContent = c ? 'Cambiar' : 'Elegir';
  // Fase actual
  const today = new Date(); today.setHours(0,0,0,0);
  const act = CFG.cronograma.filter(e => (e.fam.includes('all') || (c && e.fam.includes(c.fam))) && isoDate(e.ini) <= today && today <= isoDate(e.fin || e.ini));
  const nxt = CFG.cronograma.filter(e => (e.fam.includes('all') || (c && e.fam.includes(c.fam))) && isoDate(e.ini) > today)[0];
  const ph = document.getElementById('phase');
  if (act.length) ph.textContent = act[0].t.replace(/ \(.*\)/, '') + (act[0].fin ? ` · hasta ${fmtDate(act[0].fin)}` : '');
  else if (nxt) ph.textContent = `Próximo: ${nxt.t.split(' — ')[0]} · ${fmtDate(nxt.ini)}`;
  else ph.textContent = 'Proceso concluido';
  // Cuenta regresiva al examen (el de su cargo; si no eligió, el primero: 26/11)
  const fam = c ? CFG.familias[c.fam] : CFG.familias.dd, target = isoDate(fam.examen);
  document.getElementById('cd-cap').innerHTML = `Examen de competencia${c ? '' : ' (desde)'}: <strong>${fmtDate(fam.examen, true)}</strong>`;
  clearInterval(cdTimer);
  const tick = () => {
    let ms = target - new Date(); const done = ms <= 0; if (done) ms = 0;
    const s = Math.floor(ms / 1000), set = (id, v) => document.getElementById(id).textContent = String(v).padStart(2, '0');
    set('cd-d', Math.floor(s / 86400)); set('cd-h', Math.floor(s % 86400 / 3600)); set('cd-m', Math.floor(s % 3600 / 60)); set('cd-s', s % 60);
    if (done) clearInterval(cdTimer);
  };
  tick(); cdTimer = setInterval(tick, 1000);
}
function renderStats() {
  const st = Storage.getStats();
  FX.count(document.getElementById('s-exams'), st.totalExams);
  const a = document.getElementById('s-avg'), b = document.getElementById('s-best');
  if (st.totalExams) { FX.count(a, st.avgScore, { suffix: '%' }); FX.count(b, st.bestScore, { suffix: '%' }); } else { a.textContent = '--'; b.textContent = '--'; }
}

// ── SIMULACROS ──
function start(id) { Storage.setPending(id); document.body.style.opacity = '0'; document.body.style.transition = 'opacity .25s'; setTimeout(()=>location.href = 'exam.html', 220); }
/** Avisa si algún JSON de data/bib/ tiene errores (sintaxis, archivo faltante o preguntas mal formadas). */
function renderProblemas() {
  const box = document.getElementById('problemas'); if (!box) return;
  const msg = { json: p => `<b>${p.id}.json</b>: error de sintaxis (coma, llave o comilla mal puesta)`, faltante: p => `<b>${p.id}.json</b>: archivo no encontrado en data/bib/`,
    preguntas: p => `<b>${p.id}.json</b>: ${p.n} pregunta(s) mal formada(s) (se ignoran: revisa options y answer)` };
  const list = Config.problemas.map(p => `<li>${msg[p.tipo](p)}</li>`).join('');
  box.innerHTML = list ? `<strong>⚠️ Revisa tus archivos de preguntas</strong><ul>${list}</ul><span>Valida con: python3 tools/validar_bancos.py</span>` : '';
  box.hidden = !list;
}
let onlyMine = true;
const BASE_G = () => CFG.gruposBase || [];
const isMine = id => { const c = myCargo(), b = Config.bib(id); return !c || BASE_G().includes(b.grupo) || (c.areas || []).includes(id); };
function availFor(c) { return CFG.bibliografias.filter(b => BASE_G().includes(b.grupo) || (c.areas || []).includes(b.id)).reduce((a, b) => a + (COUNTS[b.id] || 0), 0); }
function renderSim() {
  const c = myCargo(), box = document.getElementById('official');
  if (!c) {
    box.innerHTML = `<div class="official" id="of-pick"><div class="of-top"><div class="of-ico">🎯</div><span class="of-badge">Simulacro oficial</span></div>
      <div class="of-name">Simulacro por cargo</div><div class="of-desc">Elige tu cargo para generar el examen de competencia con las áreas que le corresponden.</div>
      <div class="of-go"><span>Elegir mi cargo</span><span>→</span></div></div>`;
    document.getElementById('of-pick').onclick = openPicker;
  } else {
    const p = CFG.perfiles[c.perfil] || CFG.perfiles.general, avail = availFor(c);
    const chips = Object.entries(p.pesos).map(([g, w]) => `<span class="of-chip">${g === 'base' ? '📜' : '🎯'} ${Math.round(w * 100)}% ${CFG.pesosNombres[g]}</span>`).join('');
    const warn = avail < p.preguntas ? `<div class="of-warn">⚠️ Tus bibliografías para este cargo suman ${avail} preguntas (se piden ${p.preguntas}). El simulacro usará las disponibles; agrega más en <b>data/bib/</b>.</div>` : '';
    box.innerHTML = `<div class="official" id="of-go"><div class="of-top"><div class="of-ico">🎯</div><span class="of-badge">Simulacro oficial</span></div>
      <div class="of-name">${esc(c.corto)}</div><div class="of-desc">${esc(p.nombre)} · ${c.areas.length + CFG.bibliografias.filter(b => BASE_G().includes(b.grupo)).length} bibliografías de tu cargo.</div>
      <div class="of-chips"><span class="of-chip g">${Math.min(p.preguntas, avail)} preguntas</span><span class="of-chip g">${p.minutos} min</span><span class="of-chip">Aprueba ≥ ${p.aprobacion}%</span>${chips}</div>
      ${warn}<div class="of-go"><span>Iniciar simulacro</span><span>→</span></div></div>`;
    document.getElementById('of-go').onclick = () => start('cargo:' + c.id);
  }
  document.getElementById('nota-ref').innerHTML = `<strong>Distribución referencial.</strong> ${esc(CFG.referencial)}`;
  renderProblemas();

  const unGrupo = CFG.grupos.length < 2;
  document.getElementById('grp-grid').hidden = unGrupo; document.getElementById('grp-sub').parentElement.hidden = unGrupo;
  // Áreas (práctica por grupo)
  const gg = CFG.grupos.map(g => ({ g, n: CFG.bibliografias.filter(b => b.grupo === g.id).reduce((a, b) => a + (COUNTS[b.id] || 0), 0), f: CFG.bibliografias.filter(b => b.grupo === g.id).length }));
  document.getElementById('grp-sub').textContent = `${gg.filter(x => x.n).length} de ${gg.length} con preguntas`;
  document.getElementById('grp-grid').innerHTML = gg.map(({ g, n, f }) => `
    <div class="pcard ${n ? '' : 'off'}" data-g="${g.id}" style="--c:${g.color}">
      <div class="pc-ico">${g.icono}</div><div class="pc-name">${esc(g.nombre)}</div><div class="pc-desc">${esc(g.desc)}</div>
      <div class="pc-foot"><b>${n ? Math.min(n, CFG.practica.porGrupo) + ' preg.' : 'Vacío'}</b><span>${n} · ${f} archivos</span></div></div>`).join('');
  document.querySelectorAll('.pcard').forEach(el => el.onclick = () => CFG.bibliografias.filter(b => b.grupo === el.dataset.g).some(b => COUNTS[b.id]) ? start('grupo:' + el.dataset.g) : showToast('📭 Esta área aún no tiene preguntas. Llena sus JSON en data/bib/'));
  FX.stagger();

  // Bibliografías (un JSON por cada una)
  const tg = document.getElementById('tg-bib'); tg.style.display = c && CFG.bibliografias.some(b => !isMine(b.id)) ? 'flex' : 'none';
  const filt = c && onlyMine;
  let html = '', total = 0, shown = 0;
  CFG.grupos.forEach(g => {
    const bs = CFG.bibliografias.filter(b => b.grupo === g.id && (!filt || isMine(b.id))); if (!bs.length) return;
    html += `<div class="bgroup rv" style="--c:${g.color}"><div class="bg-head">${g.icono} ${esc(g.nombre)}<i></i></div>` + bs.map(b => {
      const n = COUNTS[b.id] || 0; total += n; shown++;
      const tag = c && (c.areas || []).includes(b.id) ? '<span class="b-tag">TU CARGO</span>' : '';
      return `<div class="brow ${n ? '' : 'empty'}" data-b="${b.id}" style="--c:${b.color || g.color}"><div class="b-ico">${b.icono}</div>
        <div class="b-body"><div class="b-name">${esc(b.nombre)}${tag}</div><div class="b-aut">${esc(b.autor || '')}</div></div>
        <div class="b-n"><b>${n}</b>preg.</div></div>`;
    }).join('') + '</div>';
  });
  document.getElementById('bib-list').innerHTML = html;
  document.getElementById('bib-sub').textContent = `${total} preguntas · ${shown} de ${CFG.bibliografias.length} archivos`;
  document.querySelectorAll('.brow').forEach(el => el.onclick = () => (COUNTS[el.dataset.b] ? start('bib:' + el.dataset.b) : showToast(`📭 Sin preguntas. Llena data/bib/${el.dataset.b}.json`)));
  FX.reveal();
}

// ── MI CARGO: requisitos + documentos ──
function renderCargoPanel() {
  const c = myCargo(), el = document.getElementById('cargo-panel');
  if (!c) { el.innerHTML = `<div class="empty-box"><div class="empty-ico">🧭</div>Elige tu cargo para ver tus requisitos, costo y fechas.<br><br><button class="btn btn-red btn--inline" id="empty-pick">Elegir cargo</button></div>`;
    document.getElementById('empty-pick').onclick = openPicker; return; }
  const fam = CFG.familias[c.fam], checks = Storage.getChecks(c.id);
  const reqs = c.req.map(r => CFG.requisitos[r] || r);
  const items = [
    ...reqs.map((t, i) => ({ k: 'r' + i, t })),
  ], docsM = CFG.documentos.meritos.map((t, i) => ({ k: 'm' + i, t })), docsD = CFG.documentos.designacion.map((t, i) => ({ k: 'd' + i, t }));
  const all = [...items, ...docsM, ...docsD], done = all.filter(x => checks[x.k]).length, pct = Math.round(done / all.length * 100);
  const areaList = CFG.bibliografias.filter(b => isMine(b.id));
  const row = x => `<button class="chk ${checks[x.k] ? 'on' : ''}" data-k="${x.k}"><span class="box">${CHECK_SVG}</span><span class="tx">${esc(x.t)}</span></button>`;
  el.innerHTML = `
    <div class="cg"><div class="cg-l"><div class="ccard rv"><div class="cc-name">${esc(c.nombre)}</div>
      <div class="cc-chips"><span class="chip g">💰 Bs. ${c.costo}</span>${c.categoriaMin ? `<span class="chip">Cat. ${c.categoriaMin}+</span>` : ''}${c.meritosMin ? `<span class="chip">${c.meritosMin} pts mérito</span>` : ''}<span class="chip t">📝 Examen ${fmtDate(fam.examen)}</span></div>
      <div class="prog-lbl"><span>Mi habilitación</span><b id="prog-n">${done} de ${all.length} · ${pct}%</b></div>
      <div class="bar"><i data-w="${pct}" id="prog-bar"></i></div>
      <div class="hint hint--tight">Marca lo que ya tienes listo. Se guarda en este dispositivo. Puedes inscribirte hasta en ${CFG.convocatoria.maxPostulaciones} cargos en el mismo departamento.</div></div>
    <div class="ccard ccard--gap rv"><div class="chk-title chk-title--flush">Áreas de tu examen <span class="chk-count">(${areaList.length})</span></div>
      <div class="cc-chips cc-chips--flush">${areaList.map(b => `<span class="chip ${(c.areas||[]).includes(b.id) ? 'g' : ''}">${b.icono} ${esc(b.nombre)} · ${COUNTS[b.id] || 0}</span>`).join('')}</div></div>
    <a class="portal" href="${CFG.convocatoria.portal}" target="_blank" rel="noopener">🌐 Ir al portal de inscripción · sisep.minedu.gob.bo</a>
    <div class="hint hint--note">El pago de la postulación (Bs. ${c.costo}) se descuenta de la boleta de haberes del SEP; si no estás en planilla debes depositar con 24 horas de anticipación a la inscripción.</div></div>
    <div class="cg-r"><div class="chk-title chk-title--first">Requisitos indispensables</div>${items.map(row).join('')}
    <div class="chk-title">Para la calificación de méritos</div>${docsM.map(row).join('')}
    <div class="chk-title">Para la designación</div>${docsD.map(row).join('')}
    </div></div>`;
  el.querySelectorAll('.chk').forEach(b => b.onclick = () => {
    const on = !b.classList.contains('on'); b.classList.toggle('on', on); Storage.setCheck(c.id, b.dataset.k, on);
    const d = all.filter(x => Storage.getChecks(c.id)[x.k]).length, p = Math.round(d / all.length * 100);
    document.getElementById('prog-n').textContent = `${d} de ${all.length} · ${p}%`; document.getElementById('prog-bar').style.width = p + '%';
    if (d === all.length) { FX.confetti(90); showToast('🎉 ¡Tienes todos tus documentos listos!'); }
  });
  FX.reveal();
}

// ── CRONOGRAMA ──
function renderInfo() {
  document.getElementById('info').innerHTML = CFG.info.map(i => `<div class="icard"><b><span class="icard-ico">${i.ico}</span> ${esc(i.t)}</b><span>${esc(i.d)}</span></div>`).join('');
}
function renderCron() {
  const c = myCargo(), today = new Date(); today.setHours(0,0,0,0); let firstNext = true;
  const list = CFG.cronograma.filter(e => !showMine || !c || e.fam.includes('all') || e.fam.includes(c.fam));
  document.getElementById('tl').innerHTML = list.map(e => {
    const a = isoDate(e.ini), b = isoDate(e.fin || e.ini);
    const st = b < today ? 'past' : (a <= today ? 'now' : 'next');
    let tag = '';
    if (st === 'now') tag = '<span class="tl-tag">EN CURSO</span>';
    else if (st === 'next' && firstNext) { firstNext = false; const d = daysTo(e.ini); tag = `<span class="tl-tag p">${d === 1 ? 'MAÑANA' : 'EN ' + d + ' DÍAS'}</span>`; }
    const mine = c && !e.fam.includes('all') && e.fam.includes(c.fam);
    const d = e.fin && e.fin !== e.ini ? `${fmtDate(e.ini)} → ${fmtDate(e.fin)}` : fmtDate(e.ini);
    return `<div class="tli ${st} ${mine ? 'mine' : ''}"><div class="tl-d">${d} ${isoDate(e.ini).getFullYear()}${tag}</div><div class="tl-t">${esc(e.t)}</div></div>`;
  }).join('');
  document.querySelectorAll('#tl .tli').forEach((n, i) => { n.style.animation = `fadeUp .5s ease ${Math.min(i, 12) * 40}ms both`; });
}

function renderRecent() {
  const h = Storage.getHistory(), box = document.getElementById('results-list');
  if (!h.length) { box.innerHTML = `<div class="empty-box"><div class="empty-ico">📭</div>Aún no tienes simulacros completados.<br>Empieza con el simulacro de tu cargo.</div>`; return; }
  const ap = r => r.aprobacion || 60;
  box.innerHTML = h.slice(0, 4).map(r => `<div class="rrow"><div class="rdot ${r.percentage >= ap(r) ? 'pass' : 'fail'}"></div>
    <div class="rinfo"><div class="rmode">${esc(r.modeName || r.mode)}</div><div class="rmeta">${r.date} · ${r.time} · ⏱ ${formatTime(r.timeUsed)}</div></div>
    <div class="rscore ${r.percentage >= ap(r) ? 'pass' : 'fail'}">${r.percentage}%</div></div>`).join('');
}

// ── SELECTOR DE CARGO ──
function openPicker() {
  const sel = Storage.getCargo(); const ov = document.getElementById('picker'), list = document.getElementById('pk-list'), q = document.getElementById('pk-search');
  const draw = () => {
    const t = q.value.trim().toLowerCase(); let html = '', n = 0;
    ['dd','dist','ue','esfm'].forEach(f => {
      const cs = CFG.cargos.filter(c => c.fam === f && (!t || (c.nombre + ' ' + c.corto).toLowerCase().includes(t))); if (!cs.length) return;
      html += `<div class="pk-h">${FAMNAME[f]}</div>` + cs.map(c => `<button class="pk ${c.id === sel ? 'sel' : ''}" data-id="${c.id}" style="animation-delay:${Math.min(n++, 14) * 22}ms"><span class="pk-n">${esc(c.nombre)}</span><span class="pk-c">Bs. ${c.costo}</span></button>`).join('');
    });
    list.innerHTML = html || '<div class="empty-box">Sin resultados</div>';
    list.querySelectorAll('.pk').forEach(b => b.onclick = () => { Storage.setCargo(b.dataset.id); ov.classList.remove('show'); renderAll(); showToast('✓ Cargo: ' + Config.cargo(b.dataset.id).corto); });
  };
  q.value = ''; q.oninput = draw; draw(); ov.classList.add('show');
  document.getElementById('pk-close').onclick = () => ov.classList.remove('show');
  ov.onclick = e => { if (e.target === ov) ov.classList.remove('show'); };
}
