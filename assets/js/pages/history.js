// =============================================
// pages/history.js — Lógica de history.html
// =============================================

window.addEventListener('DOMContentLoaded', ()=>{
  if (!requireAuth('login.html')) return;
  applyTheme(); FX.ripples(); FX.nav('hist'); FX.leave();
  renderAll(); FX.stagger();
  hideLoader();
});

document.getElementById('btn-back').addEventListener('click',  ()=>window.location.href='index.html');
document.getElementById('btn-dark').addEventListener('click',  toggleTheme);
document.getElementById('btn-clear').addEventListener('click', ()=>{
  if (!Storage.getHistory().length) { showToast('No hay historial que borrar'); return; }
  showModal('Limpiar historial','¿Borrar todos los resultados? No se puede deshacer.','🗑️',
    ()=>{ Storage.clearHistory(); renderAll(); showToast('✓ Historial borrado'); },()=>{}
  );
});

function renderAll() {
  const hist=Storage.getHistory(), stats=Storage.getStats(), ranking=Storage.getRanking();

  // Stats
  const sSec=document.getElementById('stats-sec');
  if (hist.length) {
    sSec.style.display='block';
    document.getElementById('gstats').innerHTML=`
      <div class="gs"><div class="gs-n">${stats.totalExams}</div><div class="gs-l">Exámenes</div></div>
      <div class="gs"><div class="gs-n">${stats.avgScore}%</div><div class="gs-l">Promedio</div></div>
      <div class="gs"><div class="gs-n">${stats.bestScore}%</div><div class="gs-l">Mejor</div></div>`;
  }

  // Ranking
  const rSec=document.getElementById('rank-sec');
  if (ranking.length) {
    rSec.style.display='block';
    const medals=['🥇','🥈','🥉'];
    document.getElementById('rank-list').innerHTML=ranking.slice(0,3).map((r,i)=>`
      <div class="rank-card">
        <span class="rank-medal">${medals[i]||'🏅'}</span>
        <div class="rank-info">
          <div class="rank-name">${esc(r.modeName||r.mode)}</div>
          <div class="rank-meta">${r.date} · ${r.time} · ⏱ ${formatTime(r.timeUsed)}</div>
        </div>
        <div class="rank-pct ${r.percentage>=(r.aprobacion||60)?'pass':'fail'}">${r.percentage}%</div>
      </div>`).join('');
  }

  // Lista completa
  const allEl=document.getElementById('all-list');
  if (!hist.length) {
    allEl.innerHTML=`<div class="empty">
      <div class="ico">📭</div>
      <h3>Sin resultados aún</h3>
      <p>Completa tu primer simulacro para ver el historial aquí.</p>
      <a href="index.html" class="btn btn-red btn--inline">🎯 Ir al menú</a>
    </div>`;
    return;
  }

  document.getElementById('all-title').textContent=`📋 Todos los exámenes (${hist.length})`;
  allEl.innerHTML = hist.map((r,i)=>`
    <div class="hist-entry" style="animation-delay:${Math.min(i,10)*40}ms">
      <div class="he-main">
        <div class="he-idx ${r.percentage>=(r.aprobacion||60)?'pass':'fail'}">#${i+1}</div>
        <div class="he-body">
          <div class="he-mode">${esc(r.modeName||r.mode)}</div>
          <div class="he-date">${r.date} · ${r.time}</div>
          <div class="he-chips">
            <span class="he-chip">✅ ${r.correct}</span>
            <span class="he-chip">❌ ${r.wrong}</span>
            <span class="he-chip">⏭ ${r.skipped||0}</span>
            <span class="he-chip">⏱ ${formatTime(r.timeUsed)}</span>
          </div>
        </div>
        <div>
          <div class="he-score ${r.percentage>=(r.aprobacion||60)?'pass':'fail'}">${r.percentage}%</div>
          <div class="he-detail">${r.correct}/${r.total}</div>
        </div>
      </div>
    </div>`).join('');
}
