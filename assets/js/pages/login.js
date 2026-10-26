// =============================================
// pages/login.js — Lógica de login.html
// =============================================

const PASSWORD = 'ascenso2026';
let deferredPrompt = null;
window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.setAttribute('data-theme','dark');
  FX.ripples();
  if (Storage.getSession()) { window.location.href='index.html'; return; }
  hideLoader();
});
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; document.getElementById('install-banner').classList.add('visible'); });
document.getElementById('btn-install').addEventListener('click', async () => {
  if (!deferredPrompt) return; deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome==='accepted') document.getElementById('install-banner').classList.remove('visible');
  deferredPrompt = null;
});
document.getElementById('eye').addEventListener('click', () => {
  const inp=document.getElementById('pw'); inp.type = inp.type==='password' ? 'text' : 'password';
  document.getElementById('eye').textContent = inp.type==='password' ? '👁️' : '🙈';
});
document.getElementById('login-form').addEventListener('submit', e => {
  e.preventDefault();
  const pw=document.getElementById('pw').value.trim(), err=document.getElementById('error-box'), btn=document.getElementById('btn-login');
  if (pw===PASSWORD) {
    Storage.setSession({user:'Docente'});
    btn.innerHTML='✓ Accediendo…'; btn.style.background='linear-gradient(135deg,#34D399,#10B981)'; btn.disabled=true;
    document.querySelector('.login-wrap').style.transition='transform .5s ease, opacity .5s ease';
    setTimeout(()=>{ document.querySelector('.login-wrap').style.transform='scale(.94) translateY(-10px)'; document.querySelector('.login-wrap').style.opacity='0'; },350);
    setTimeout(()=>window.location.href='index.html', 850);
  } else {
    err.classList.remove('show'); void err.offsetWidth; err.classList.add('show');
    document.getElementById('pw').value=''; document.getElementById('pw').focus();
    setTimeout(()=>err.classList.remove('show'),4000);
  }
});
