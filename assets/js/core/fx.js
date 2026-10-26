// =============================================
// fx.js — Animaciones y utilidades de interfaz
// =============================================
const FX = {
  reduced: window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches,

  // Revelado al entrar en pantalla: elementos con clase .rv
  reveal(root = document) {
    const els = root.querySelectorAll('.rv:not(.in)');
    if (this.reduced || !('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: .08, rootMargin: '0px 0px -30px 0px' });
    els.forEach(e => io.observe(e));
  },

  // Numeración escalonada: --i en los hijos de .stagger
  stagger(root = document) {
    root.querySelectorAll('.stagger').forEach(p => [...p.children].forEach((c, i) => c.style.setProperty('--i', i)));
    root.querySelectorAll('.rv[data-i]').forEach(e => e.style.setProperty('--i', e.dataset.i));
  },

  // Contador animado: <span data-count="85" data-suffix="%">
  count(el, to, { dur = 1100, suffix = '' } = {}) {
    if (this.reduced || isNaN(to)) { el.textContent = to + suffix; return; }
    const t0 = performance.now();
    const step = t => {
      const p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * e) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  },

  // Onda al tocar botones
  ripples() {
    document.addEventListener('pointerdown', e => {
      const b = e.target.closest('.btn, .btn-nav'); if (!b || this.reduced) return;
      const r = b.getBoundingClientRect(), d = document.createElement('span');
      d.className = 'ripple-dot'; d.style.left = (e.clientX - r.left) + 'px'; d.style.top = (e.clientY - r.top) + 'px';
      b.appendChild(d); setTimeout(() => d.remove(), 650);
    });
  },

  // Confeti en canvas (aprobado)
  confetti(n = 130) {
    if (this.reduced) return;
    const cv = document.createElement('canvas'); cv.id = 'confetti';
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d'); const W = cv.width = innerWidth, H = cv.height = innerHeight;
    const cols = ['#F5C451', '#8B7DFF', '#34D399', '#38BDF8', '#FB7185', '#FFFFFF'];
    const ps = Array.from({ length: n }, () => ({
      x: W / 2 + (Math.random() - .5) * 80, y: H * .32, r: 4 + Math.random() * 5,
      vx: (Math.random() - .5) * 12, vy: -Math.random() * 13 - 4, g: .32 + Math.random() * .1,
      rot: Math.random() * 6, vr: (Math.random() - .5) * .35, c: cols[(Math.random() * cols.length) | 0], life: 0,
    }));
    let f = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H); f++;
      ps.forEach(p => {
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= .992; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - f / 150); ctx.fillStyle = p.c;
        ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore();
      });
      if (f < 150) requestAnimationFrame(draw); else cv.remove();
    };
    draw();
  },

  // Control segmentado con "thumb" deslizante. onChange(id)
  seg(el, onChange) {
    const btns = [...el.querySelectorAll('button')];
    let thumb = el.querySelector('.thumb');
    if (!thumb) { thumb = document.createElement('div'); thumb.className = 'thumb'; el.prepend(thumb); }
    const move = b => {
      thumb.style.width = b.offsetWidth + 'px';
      thumb.style.transform = `translateX(${b.offsetLeft - 4}px)`;
    };
    const pick = (b, silent) => {
      btns.forEach(x => x.classList.toggle('on', x === b)); move(b);
      if (!silent && onChange) onChange(b.dataset.tab);
    };
    btns.forEach(b => b.addEventListener('click', () => pick(b)));
    const first = btns.find(b => b.classList.contains('on')) || btns[0];
    requestAnimationFrame(() => pick(first, true));
    addEventListener('resize', () => move(el.querySelector('button.on') || first));
    return { select: id => pick(btns.find(b => b.dataset.tab === id) || first) };
  },

  // Barra de navegación (iconos SVG propios): secciones de la convocatoria
  nav(active) {
    const I = {
      sim:   '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
      cargo: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 9l1.6 1.6L12 8"/><path d="M8 15l1.6 1.6L12 14"/><path d="M14.5 9.5H17M14.5 15.5H17"/>',
      cron:  '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
      hist:  '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
    };
    const items = [['sim', 'index.html#sim', 'Simulacros'], ['cargo', 'index.html#cargo', 'Mi cargo'], ['cron', 'index.html#cron', 'Cronograma'], ['hist', 'history.html', 'Historial']];
    const n = document.createElement('nav'); n.className = 'bnav';
    n.innerHTML = items.map(([k, href, l]) => `<a href="${href}" data-k="${k}" class="${k === active ? 'on' : ''}"><svg viewBox="0 0 24 24">${I[k]}</svg>${l}</a>`).join('');
    document.body.appendChild(n); document.body.classList.add('has-nav');
    if (active === 'hist') this.shell();
  },
  navActive(k) { document.querySelectorAll('.bnav a').forEach(a => a.classList.toggle('on', a.dataset.k === k)); },

  // Agrupa el contenido de la página en una columna centrada (para pantallas anchas)
  shell() {
    const skip = el => el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'LINK' || el.id === 'loader' || el.id === 'toast' || el.id === 'confetti' ||
      el.classList.contains('modal-overlay') || el.classList.contains('bnav') || el.classList.contains('shell') || getComputedStyle(el).position === 'fixed';
    const kids = [...document.body.children].filter(e => !skip(e)); if (!kids.length) return;
    const w = document.createElement('div'); w.className = 'shell'; kids[0].before(w); kids.forEach(k => w.appendChild(k));
  },

  // Transición de salida entre páginas
  leave() {
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]'); if (!a || this.reduced) return;
      const h = a.getAttribute('href');
      if (!h || h.startsWith('#') || h.startsWith('http') || a.target === '_blank') return;
      const pg = location.pathname.split('/').pop() || 'index.html'; if (h.split('#')[0] === pg) return; // misma página: la maneja la propia página
      e.preventDefault(); document.body.style.transition = 'opacity .22s ease, transform .22s ease';
      document.body.style.opacity = '0'; document.body.style.transform = 'translateY(8px)';
      setTimeout(() => location.href = h, 200);
    });
  },

  init() { this.stagger(); this.reveal(); this.ripples(); },
};
window.addEventListener('pageshow', e => { if (e.persisted) { document.body.style.opacity = ''; document.body.style.transform = ''; } });
