// =============================================
// utils.js — Utilidades de interfaz y formato (toast, modal, loader, fechas, tema)
// =============================================

function formatTime(sec) {
  if (!sec && sec !== 0) return '--';
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function applyTheme() {
  const s = Storage.getSettings();
  document.documentElement.setAttribute('data-theme', s.darkMode ? 'dark' : 'light');
  const btn = document.getElementById('btn-dark');
  if (btn) btn.textContent = s.darkMode ? '☀️' : '🌙';
}
function toggleTheme() { const s = Storage.getSettings(); s.darkMode = !s.darkMode; Storage.saveSettings(s); applyTheme(); }
function showToast(msg, ms = 2800) {
  const t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), ms);
}
function showModal(title, desc, icon, onOk, onCancel) {
  const ov = document.getElementById('modal-overlay'); if (!ov) return;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-desc').textContent = desc;
  document.getElementById('modal-icon').textContent = icon;
  ov.classList.add('show');
  const clone = id => { const o = document.getElementById(id), n = o.cloneNode(true); o.parentNode.replaceChild(n, o); return n; };
  const close = () => ov.classList.remove('show');
  const ok = clone('modal-ok'), cancel = clone('modal-cancel');
  ok.addEventListener('click', () => { close(); if (onOk) onOk(); });
  cancel.addEventListener('click', () => { close(); if (onCancel) onCancel(); });
  cancel.style.display = (onCancel === null) ? 'none' : 'flex';
  if (onCancel === null) ok.textContent = 'Entendido';
}
function requireAuth(to = 'login.html') { if (!Storage.getSession()) { window.location.href = to; return false; } return true; }
function hideLoader() { const l = document.getElementById('loader'); if (l) { l.classList.add('out'); setTimeout(() => l.remove(), 600); } }

// Fechas ISO (AAAA-MM-DD) en hora local
function isoDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function daysTo(s) { const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((isoDate(s) - t) / 864e5); }
function fmtDate(s, long) {
  return isoDate(s).toLocaleDateString('es-BO', long ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } : { day: '2-digit', month: 'short' });
}
