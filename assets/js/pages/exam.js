// =============================================
// pages/exam.js — Lógica de exam.html
// =============================================

const Exam = {
  mode:null, questions:[], current:0, answers:{}, startTime:null, tabWarn:0, streak:0,

  async init() {
    if (!requireAuth('login.html')) return;
    applyTheme(); SoundFX.init(); FX.ripples(); this.bind();
    const modeId = Storage.getPending();
    if (!modeId) { location.href='index.html'; return; }
    Storage.clearPending();
    let m;
    try { m = await Modes.build(modeId); } catch { m = null; }
    if (!m) { location.href='index.html'; return; }
    if (!m.questions.length) { hideLoader(); showModal('Sin preguntas','Esta selección aún no tiene preguntas cargadas. Agrégalas en el archivo JSON de la bibliografía (carpeta data/bib/).','📭',()=>location.href='index.html',null); return; }
    this.mode = m;
    document.getElementById('loader-txt').textContent = m.name;
    document.getElementById('hdr-mode').textContent = m.name;
    this.questions = shuffle(m.questions).map(q => ({ ...q, _m: this.mixOpts(q) }));
    if (m.short) { const n = document.getElementById('notice'); n.style.display='block'; n.textContent = `ℹ️ Tu banco solo tiene ${this.questions.length} preguntas para este simulacro (se piden ${m.requested}). Agrega más en data/bib/ para completar el examen.`; }
    this.startTime = Date.now();
    hideLoader(); this.render(0, true); this.buildMap();
    Timer.start(m.minutes, (r,f)=>this.onTick(r,f), ()=>{ showToast('⏰ Tiempo agotado'); SoundFX.wrong(); setTimeout(()=>this.finish(),1600); });
    document.addEventListener('visibilitychange',()=>{ if(document.hidden) this.onTabChange(); });
    document.addEventListener('contextmenu',e=>{ e.preventDefault(); showToast('⚠️ No permitido durante el examen'); });
  },

  /** Eventos de la pantalla (delegación: sin onclick en el HTML). */
  bind() {
    const $ = id => document.getElementById(id);
    $('btn-prev').addEventListener('click', () => this.prev());
    $('btn-next').addEventListener('click', () => this.next());
    $('btn-finish').addEventListener('click', () => this.confirmFinish());
    $('btn-abandon').addEventListener('click', () => this.abandon());
    $('options').addEventListener('click', e => { const b = e.target.closest('.opt'); if (b) this.pick(+b.dataset.i); });
    $('map-grid').addEventListener('click', e => { const b = e.target.closest('.map-btn'); if (b) this.render(+b.dataset.i); });
  },

  // Mezcla las opciones y recuerda dónde quedó la correcta
  mixOpts(q) { const correct=q.options[q.answer], opts=shuffle([...q.options]); return { options:opts, answer:opts.indexOf(correct) }; },
  meta(q) { const b = Config.bib(q.bib), g = Config.grupo(q.grupo); return { label: (b?.icono||'') + ' ' + (b?.nombre||q.bib), color: b?.color || g?.color || '#8B7DFF' }; },

  render(idx, first) {
    const dir = idx < this.current ? 'back' : '';
    this.current = idx;
    const q = this.questions[idx], { options, answer } = q._m, saved = this.answers[idx], replied = saved !== undefined, show = Storage.getSettings().showAnswers;
    document.getElementById('hdr-prog').textContent = `Pregunta ${idx+1} de ${this.questions.length}`;
    document.getElementById('q-n').textContent = idx+1; document.getElementById('q-tot').textContent = this.questions.length;
    document.getElementById('q-num-lbl').textContent = `Pregunta ${idx+1}`;
    const mt = this.meta(q), cat = document.getElementById('q-cat'); cat.textContent = mt.label; cat.style.setProperty('--c', mt.color);
    document.getElementById('q-card').style.setProperty('--c', mt.color);
    const card = document.getElementById('q-card'); card.className = 'q-card ' + dir; card.style.animation='none'; void card.offsetWidth; card.style.animation='';
    document.getElementById('q-text').textContent = q.question;
    document.getElementById('q-fuente').textContent = q.fuente ? `📖 ${q.fuente}` : '';
    const L = ['A','B','C','D','E','F'];
    document.getElementById('options').innerHTML = options.map((o,i)=>{
      let cls='opt';
      if (replied) { cls+=' disabled';
        if (q.survey) { if (i===saved) cls+=' survey-picked'; }
        else if (show) { if (i===answer) cls+=' correct'; else if (i===saved) cls+=' wrong'; }
        else if (i===saved) cls+=' selected'; }
      return `<button class="${cls}" style="--i:${i}" data-i="${i}"><span class="opt-l">${L[i]}</span><span class="opt-txt">${esc(o)}</span></button>`;
    }).join('');
    this.showFeedback(idx); this.updateInfo();
    const last = idx === this.questions.length-1;
    document.getElementById('btn-prev').disabled = idx===0;
    document.getElementById('btn-next').style.display = last ? 'none':'flex';
    document.getElementById('btn-finish').style.display = last ? 'flex':'none';
    this.updateProg(); this.buildMap();
    if (!first) window.scrollTo({top:0,behavior:'smooth'});
  },

  pick(i) {
    if (this.answers[this.current] !== undefined) return;
    SoundFX.select(); this.answers[this.current] = i;
    const q = this.questions[this.current], { answer } = q._m, ok = q.survey ? true : i === answer;
    this.streak = ok ? this.streak + 1 : 0; this.updateStreak();
    setTimeout(()=> ok ? SoundFX.correct() : SoundFX.wrong(), 80);
    const show = Storage.getSettings().showAnswers, btns = document.querySelectorAll('.opt');
    btns.forEach(b=>b.classList.add('disabled'));
    if (q.survey) btns[i]?.classList.add('survey-picked');
    else if (show) btns.forEach((b,k)=>{ if (k===answer) b.classList.add('correct'); else if (k===i && !ok) b.classList.add('wrong'); });
    else btns[i]?.classList.add('selected');
    this.showFeedback(this.current); this.updateProg(); this.updateInfo(); this.buildMap();
    if (this.current < this.questions.length-1) setTimeout(()=>{ if (this.answers[this.current]===i) this.next(); }, q.explicacion && show && !q.survey ? 2600 : 1100);
  },

  showFeedback(idx) {
    const fb = document.getElementById('feedback-bar'), s = this.answers[idx];
    if (s === undefined || !Storage.getSettings().showAnswers && !this.questions[idx].survey) { fb.className='feedback-bar'; return; }
    const q = this.questions[idx], { answer } = q._m, ok = q.survey ? true : s === answer;
    fb.className = `feedback-bar show ${ok?'correct':'wrong'}`;
    document.getElementById('fb-ico').textContent = ok ? '✅' : '❌';
    const t = document.getElementById('fb-txt'); t.textContent = '';
    const main = q.survey ? 'Respuesta registrada — en la encuesta todas las opciones son válidas' : (ok ? '¡Correcto!' : `Incorrecta — la correcta era: ${String.fromCharCode(65+answer)}`);
    t.append(main);
    if (q.explicacion && !q.survey) { const e = document.createElement('span'); e.className='fb-exp'; e.textContent = q.explicacion; t.appendChild(e); }
  },

  updateStreak() { const s=document.getElementById('streak'); document.getElementById('streak-n').textContent=this.streak; s.classList.remove('show'); if (this.streak>=3) { void s.offsetWidth; s.classList.add('show'); } },
  updateInfo() {
    let ok=0,bad=0,skip=0;
    this.questions.forEach((q,i)=>{ const s=this.answers[i]; if (s===undefined) skip++; else if (q.survey||s===q._m.answer) ok++; else bad++; });
    document.getElementById('i-ok').textContent=ok; document.getElementById('i-bad').textContent=bad; document.getElementById('i-skip').textContent=skip;
  },
  next() { if (this.current < this.questions.length-1) this.render(this.current+1); },
  prev() { if (this.current > 0) this.render(this.current-1); },
  onTick(rem, fmt) { document.getElementById('t-time').textContent=fmt; document.getElementById('timer-box').classList.toggle('warn', Timer.isWarning()); if (Timer.isCritical()) SoundFX.tick(); },
  updateProg() { const d=Object.keys(this.answers).length; document.getElementById('prog-fill').style.width=`${this.questions.length ? d/this.questions.length*100 : 0}%`; },
  buildMap() {
    const show = Storage.getSettings().showAnswers;
    document.getElementById('map-grid').innerHTML = this.questions.map((q,i)=>{
      const s=this.answers[i]; let cls='map-btn';
      if (i===this.current) cls+=' cur';
      else if (s!==undefined) cls += show ? (q.survey||s===q._m.answer ? ' ok':' bad') : ' done';
      return `<button class="${cls}" data-i="${i}">${i+1}</button>`;
    }).join('');
  },
  onTabChange() {
    this.tabWarn++; SoundFX.wrong();
    if (this.tabWarn<=2) showModal('⚠️ Salida detectada',`Saliste del examen. Advertencia ${this.tabWarn}/3. El tiempo no se detiene.`,'⚠️',null,null);
    else showToast(`⚠️ Advertencia ${this.tabWarn}`);
  },
  confirmFinish() {
    const pen = this.questions.length - Object.keys(this.answers).length;
    showModal(pen>0 ? `${pen} sin responder` : 'Enviar examen',
      pen>0 ? `Tienes ${pen} pregunta${pen>1?'s':''} sin responder. Las omitidas cuentan como incorrectas. ¿Enviar?` : '¿Confirmas enviar tu examen?', pen>0?'📋':'🎯', ()=>this.finish(), ()=>{});
  },
  abandon() { showModal('¿Abandonar?','Se perderá todo el progreso actual.','🚪',()=>{ Timer.stop(); location.href='index.html'; },()=>{}); },

  finish() {
    Timer.stop();
    const timeUsed = Math.floor((Date.now()-this.startTime)/1000);
    let correct=0, wrong=0, skipped=0; const catStats={}, grpStats={};
    this.questions.forEach((q,i)=>{
      const a=this.answers[i];
      const c = (catStats[q.bib] = catStats[q.bib] || {correct:0,total:0,grupo:q.grupo}); c.total++;
      const g = (grpStats[q.grupo] = grpStats[q.grupo] || {correct:0,total:0}); g.total++;
      if (a===undefined) skipped++;
      else if (q.survey || a===q._m.answer) { correct++; c.correct++; g.correct++; }
      else wrong++;
    });
    const total = this.questions.length, percentage = total ? Math.round(correct/total*100) : 0;
    const result = { mode:this.mode.id, modeName:this.mode.name, cargo:this.mode.cargo||null, total, correct, wrong, skipped, timeUsed, percentage, aprobacion:this.mode.pass, catStats, grpStats };
    const review = this.questions.map((q,i)=>({
      question:q.question, fuente:q.fuente||'', bib:q.bib, grupo:q.grupo, isSurvey:!!q.survey, explicacion:q.explicacion||'',
      options:q._m.options, correct:q._m.answer, userAnswer:this.answers[i]!==undefined ? this.answers[i] : null,
      isCorrect: q.survey ? this.answers[i]!==undefined : this.answers[i]===q._m.answer,
    }));
    Storage.addResult(result); Storage.setResult(result); Storage.setReview(review);
    SoundFX.finish(); location.href='results.html';
  },
};
window.addEventListener('DOMContentLoaded', async () => { try { await Config.load(); } catch { location.href='index.html'; return; } Exam.init(); });
