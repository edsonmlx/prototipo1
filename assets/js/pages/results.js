// =============================================
// pages/results.js — Lógica de results.html
// =============================================

let _review = [];
window.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth('login.html')) return;
  applyTheme(); FX.ripples();
  const r = Storage.getResult(); if (!r) { location.href='index.html'; return; }
  try { await Config.load(); } catch {}
  render(r); renderReview(Storage.getReview() || []); FX.stagger(); hideLoader();
  document.querySelector('.review-filters').addEventListener('click', e => { const b = e.target.closest('.rf-btn'); if (b) filterReview(b.dataset.f, b); });
});
const lblBib = id => { const b = Config._c && Config.bib(id); return b ? `${b.icono} ${b.nombre}` : id; };

function render(r) {
  const min = r.aprobacion || 60, pass = r.percentage >= min;
  document.getElementById('hero').classList.add(pass ? 'pass' : 'fail');
  const C = 2 * Math.PI * 70, ring = document.getElementById('ring');
  ring.setAttribute('stroke-dasharray', C); ring.setAttribute('stroke-dashoffset', C); ring.classList.toggle('pass', pass);
  setTimeout(() => ring.setAttribute('stroke-dashoffset', C - r.percentage / 100 * C), 400);
  // marca de la nota mínima sobre el anillo
  const ang = (min / 100) * 2 * Math.PI, m = document.getElementById('ring-mark');
  m.setAttribute('x1', 82 + 62 * Math.cos(ang)); m.setAttribute('y1', 82 + 62 * Math.sin(ang)); m.setAttribute('x2', 82 + 78 * Math.cos(ang)); m.setAttribute('y2', 82 + 78 * Math.sin(ang));
  FX.count(document.getElementById('score-pct'), r.percentage, { suffix: '%', dur: 1500 });
  document.getElementById('score-sub').textContent = `mínimo ${min}%`;
  const pill = document.getElementById('status-pill');
  pill.textContent = pass ? '✅ Aprobado' : '❌ Reprobado'; pill.className = 'status-pill ' + (pass ? 'pass' : 'fail');
  document.getElementById('res-mode').textContent = r.modeName || r.mode;
  const msgs = pass ? ['¡Excelente! Tu preparación se nota. 🏆','¡Brillante! Vas por buen camino. 🌟','¡Aprobado! Intenta superar tu propia marca. 💪']
                    : ['Revisa las respuestas incorrectas más abajo. 📚','Cada intento cuenta: practica las áreas más bajas. 💪','Refuerza la bibliografía donde fallaste. 🎯'];
  document.getElementById('res-msg').textContent = msgs[Math.floor(Math.random() * msgs.length)];
  FX.count(document.getElementById('s-ok'), r.correct); FX.count(document.getElementById('s-bad'), r.wrong); FX.count(document.getElementById('s-skip'), r.skipped);
  document.getElementById('s-time').textContent = formatTime(r.timeUsed);
  if (pass) setTimeout(() => FX.confetti(), 900);

  // Desglose por bibliografía (agrupado por área)
  const bd = document.getElementById('breakdown');
  const cs = r.catStats || {}, ids = Object.keys(cs);
  if (ids.length) {
    const grupos = {}; ids.forEach(id => { const g = cs[id].grupo || (Config._c && Config.bib(id)?.grupo) || 'otros'; (grupos[g] = grupos[g] || []).push(id); });
    let html = `<div class="sec-title">📊 Por área y bibliografía</div>`;
    Object.entries(grupos).forEach(([g, list]) => {
      const G = Config._c && Config.grupo(g); const t = list.reduce((a, i) => a + cs[i].total, 0), c = list.reduce((a, i) => a + cs[i].correct, 0), gp = Math.round(c / t * 100);
      html += `<div class="bd-row" style="--c:${G ? G.color : 'var(--border)'}"><div class="bd-head"><span class="bd-name">${G ? G.icono + ' ' + G.nombre : g}</span><span class="bd-score ${gp >= min ? 'is-pass' : 'is-fail'}">${gp}%</span></div>
        <div class="bd-track"><div class="bd-fill ${gp >= min ? 'is-pass' : 'is-fail'}" data-w="${gp}"></div></div><div class="bd-sub">${c} correctas de ${t}</div></div>`;
      if (list.length > 1) list.forEach(i => { const p = Math.round(cs[i].correct / cs[i].total * 100);
        html += `<div class="bd-row bd-row--sub"><div class="bd-head"><span class="bd-name">${esc(lblBib(i))}</span><span class="bd-score ${p >= min ? 'is-pass' : 'is-fail'}">${p}%</span></div>
          <div class="bd-track"><div class="bd-fill ${p >= min ? 'is-pass' : 'is-fail'}" data-w="${p}"></div></div><div class="bd-sub">${cs[i].correct}/${cs[i].total}</div></div>`; });
    });
    bd.innerHTML = html;
    setTimeout(() => bd.querySelectorAll('.bd-fill').forEach(b => b.style.width = b.dataset.w + '%'), 500);
    // Recomendación: la bibliografía más débil (con al menos 2 preguntas)
    const weak = ids.filter(i => cs[i].total >= 2 && Config._c && Config.bib(i) && !Config.bib(i).survey).sort((a, b) => cs[a].correct / cs[a].total - cs[b].correct / cs[b].total)[0];
    if (weak && cs[weak].correct / cs[weak].total < 1) {
      document.getElementById('reco-sec').style.display = 'block';
      document.getElementById('reco-t').textContent = `Refuerza: ${Config.bib(weak).nombre}`;
      document.getElementById('reco-s').textContent = `Acertaste ${cs[weak].correct} de ${cs[weak].total}. Toca para practicar solo esta bibliografía.`;
      document.getElementById('reco').onclick = () => { Storage.setPending('bib:' + weak); location.href = 'exam.html'; };
    }
  }
  document.getElementById('btn-retry').onclick = () => { Storage.setPending(r.mode); location.href = 'exam.html'; };
  document.getElementById('btn-menu').onclick = () => location.href = 'index.html';
  document.getElementById('btn-hist').onclick = () => location.href = 'history.html';
}

function renderReview(d) { _review = d; if (!d.length) { document.getElementById('review-list').innerHTML = '<div class="review-empty">No hay datos de revisión.</div>'; return; } document.getElementById('review-count').textContent = `${d.length} preguntas`; buildCards(d); }
function filterReview(f, btn) {
  document.querySelectorAll('.rf-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active');
  buildCards(f === 'all' ? _review : f === 'correct' ? _review.filter(q => q.isCorrect) : f === 'wrong' ? _review.filter(q => q.userAnswer !== null && !q.isCorrect) : _review.filter(q => q.userAnswer === null));
}
function buildCards(data) {
  const L = ['A','B','C','D','E','F'], box = document.getElementById('review-list');
  if (!data.length) { box.innerHTML = '<div class="review-empty review-empty--box">Sin preguntas en este filtro</div>'; return; }
  box.innerHTML = data.map((q, idx) => {
    const sk = q.userAnswer === null, sv = q.isSurvey, wr = !sk && !q.isCorrect && !sv;
    let cc = 'review-card', st = '', sc = '';
    if (sk) { cc += ' skip-card'; st = '⏭ Omitida'; sc = 'skip'; } else if (sv) { cc += ' correct-card'; st = '📋 Registrada'; sc = 'ok'; }
    else if (q.isCorrect) { cc += ' correct-card'; st = '✅ Correcta'; sc = 'ok'; } else { cc += ' wrong-card'; st = '❌ Incorrecta'; sc = 'fail'; }
    const opts = q.options.map((o, i) => { let c = 'rc-opt';
      if (sv) { if (i === q.userAnswer && !sk) c += ' is-survey-selected'; }
      else if (i === q.correct && !sk) c += ' is-correct'; else if (i === q.userAnswer && wr) c += ' is-wrong'; else if (i === q.correct && sk) c += ' is-skipped-correct';
      return `<div class="${c}"><span class="rc-lbl">${L[i]}</span>${esc(o)}</div>`; }).join('');
    return `<div class="${cc}" style="animation-delay:${Math.min(idx, 10) * 35}ms"><div class="rc-header"><span class="rc-num">#${_review.indexOf(q) + 1}</span><span class="rc-cat">${esc(lblBib(q.bib))}</span><span class="rc-status ${sc}">${st}</span></div>
      <div class="rc-body"><div class="rc-question">${esc(q.question)}</div>${q.fuente ? `<div class="rc-fuente">📖 ${esc(q.fuente)}</div>` : ''}<div class="rc-opts">${opts}</div>
      ${q.explicacion ? `<div class="rc-exp"><b>Por qué:</b> ${esc(q.explicacion)}</div>` : ''}</div></div>`;
  }).join('');
}
