/* Три варианта первого экрана. Общая часть: сменяющееся слово, появление заголовка, переключатель вариантов. */
(function () {
  const root = document.documentElement;
  const calm = () => (window.ygsCalm ? window.ygsCalm() : false) || !window.gsap;
  const pre = window.ygsPreload && window.ygsPreload.active;
  const delay = pre ? 3.9 : root.classList.contains('intro-on') ? 1.1 : 0.1;
  const ROOT = window.ROOT || '/';

  // активный пункт переключателя
  document.querySelectorAll('.hswitch a').forEach(a => {
    const p = new URL(a.href, location.href).pathname.replace(/index\.html$/, '');
    if (p === location.pathname.replace(/index\.html$/, '')) a.setAttribute('aria-current', 'page');
  });

  // ---------- сменяющееся слово ----------
  function rotator() {
    const rot = document.querySelector('.rot');
    if (!rot || calm()) { document.querySelectorAll('.rot__w--next').forEach(n => n.remove()); return; }
    const words = rot.dataset.words.split('|');
    const [cur, next] = rot.querySelectorAll('.rot__w');
    let i = 0;
    const swap = () => {
      i = (i + 1) % words.length;
      next.textContent = words[i];
      gsap.timeline({ onComplete: () => { cur.textContent = words[i]; gsap.set(cur, { yPercent: 0 }); gsap.set(next, { yPercent: 105 }); } })
        .to(cur, { yPercent: -105, duration: .6, ease: 'power3.in' }, 0)
        .fromTo(next, { yPercent: 105 }, { yPercent: 0, duration: .7, ease: 'power3.out' }, .25);
    };
    gsap.delayedCall(delay + 3.5, function tick() { swap(); gsap.delayedCall(4, tick); });
  }

  // ---------- появление заголовка ----------
  function introText(target = document) {
    if (calm()) return;
    gsap.from(target.querySelectorAll('.hv__ln > span'), { yPercent: 110, duration: 1.2, stagger: .12, ease: 'power4.out', delay: delay + .3 });
    gsap.from(target.querySelectorAll('[data-hv="fade"]'), { y: 20, opacity: 0, duration: 1, stagger: .1, ease: 'power3.out', delay: delay + .8 });
  }

  // ---------- проекция: Северный полюс над экраном, меридианы веером ----------
  function polar(w, h, lon0, mobile) {
    const k = h * (mobile ? .042 : .0488);
    const cx = w * (mobile ? .5 : .76), cy = h * (mobile ? -.86 : -.76);
    return ([lon, lat]) => {
      const r = (90 - lat) * k, a = (lon - lon0) * Math.PI / 180;
      return [cx + r * Math.sin(a), cy + r * Math.cos(a)];
    };
  }

  // ================= 1. Полярный радар =================
  function radar() {
    const cv = document.getElementById('radar'); if (!cv) return;
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, DPR = 1, mobile = false;
    const resize = () => {
      DPR = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; mobile = W < 900;
      cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize(); addEventListener('resize', resize);

    // вода: Карское море и губы (упрощённо), реки, маршруты
    const SEAS = [
      [[58, 75], [58, 70.2], [61, 69.6], [63.5, 69.4], [65.5, 68.95], [67, 68.85], [68.2, 69.2], [68.4, 69.9], [68, 70.6], [68.5, 71.4], [69.3, 72.2], [69.8, 73.4], [70.5, 75]],
      [[73.6, 75], [73.6, 73.2], [74.2, 72.5], [74.9, 72.2], [75.4, 71.95], [76.5, 72.05], [78, 72.3], [79, 72], [80.2, 71.9], [81, 71.6], [82, 70.8], [82.6, 70.1], [83.2, 70.5], [83, 71.4], [84.5, 72], [88, 72.3], [92, 73.5], [95, 75]]
    ];
    const BAYS = [
      { c: [[71.4, 66.78], [72.4, 67.1], [73.6, 67.6], [74.3, 68.1], [74.3, 68.8], [74, 69.5], [73.6, 70.2], [73.3, 70.9], [73.2, 71.5], [73.6, 72.1], [74, 72.9]], w: [.28, .48, .64, .8, .8, .76, .72, .68, .76, .96, 1.2] },
      { c: [[74.6, 69], [76, 68.9], [77, 68.6], [77.8, 68], [78.4, 67.6], [78.75, 67.45]], w: [.56, .6, .5, .4, .22, .08] }
    ];
    const RIVERS = [
      [[73.37, 54.98], [72.2, 55.9], [70.5, 56.6], [69.2, 57.4], [68.25, 58.2], [68.4, 59.2], [68.6, 60.1], [69, 61]], // Иртыш
      [[73.4, 61.25], [72.3, 61.1], [71, 61.05], [69, 61], [67.8, 61.7], [66.3, 62.3], [65.4, 62.6], [65, 63.9], [64.9, 64.6], [64.75, 65.38], [65.4, 65.9], [66.1, 66.35], [66.6, 66.53], [67.3, 66.6], [67.8, 66.56], [68.6, 66.75], [69.5, 66.75], [70.3, 66.82], [70.83, 66.86], [71.6, 66.8]], // Обь
      [[78.75, 67.45], [79.5, 67], [80.5, 66.4], [81.6, 66], [82.47, 65.7], [82.3, 64.9], [82, 64.03], [81.6, 62.6]], // Таз
      [[78.1, 67.6], [78.2, 67], [77.95, 66.3], [77.65, 65.6], [77.9, 64.6], [78.35, 63.6], [78.6, 62.4]], // Пур
      [[72.7, 66.62], [72.6, 66], [72.5, 65.5], [72.6, 64.8], [72.3, 62.6]] // Надым
    ];
    const ROUTES = [
      [[73.37, 54.98], [72.2, 55.9], [70.5, 56.6], [69.2, 57.4], [68.25, 58.2], [68.4, 59.2], [68.6, 60.1], [69, 61], [67.8, 61.7], [66.3, 62.3], [65.4, 62.6], [65, 63.9], [64.9, 64.6], [64.75, 65.38], [65.4, 65.9], [66.1, 66.35], [66.6, 66.53]],
      [[73.4, 61.25], [72.3, 61.1], [71, 61.05], [69, 61]],
      [[66.6, 66.53], [67.3, 66.6], [67.8, 66.56], [68.6, 66.72], [69.16, 66.76], [70.08, 66.74], [70.84, 66.86], [71.6, 66.82], [72.4, 67.12], [72.9, 67.69], [73.4, 68.05], [73.57, 68.51], [73.5, 69.2], [73, 69.8], [72.51, 70.16]],
      [[73.6, 68.7], [74.6, 68.95], [75.8, 69.05], [76.87, 69.1], [77.3, 68.5], [77.55, 67.72], [78.1, 67.45], [78.75, 67.45], [79.5, 67], [80.5, 66.4], [81.6, 66], [82.47, 65.7], [82.3, 64.9], [82.05, 64]],
      [[78.1, 67.45], [78.22, 67], [77.95, 66.3], [77.65, 65.6], [77.9, 64.6], [78.33, 63.38]],
      [[73.1, 70.7], [73.45, 71.5], [74, 72.05], [74.85, 72.15], [75.5, 71.8], [76.4, 71.25], [77.4, 71], [78.49, 70.89]]
    ];
    const ORIGINS = [['Омский НПЗ', 73.37, 54.98], ['Сургутский ЗСК', 73.4, 61.25]];
    const LABELS = ['Яр-Сале', 'Мыс Каменный', 'Антипаюта', 'Гыда', 'Красноселькуп', 'Самбург', 'Мужи', 'Сеяха'];
    const HUB = [66.6, 66.53];
    let towns = [];

    // равномерная выборка по ломаной в градусах — для движения танкеров
    const resample = (pts, n) => {
      const seg = []; let L = 0;
      for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
      return t => { let d = t * L, i = 0; while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; } const f = seg[i] ? d / seg[i] : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]; };
    };
    const along = ROUTES.map(r => resample(r));
    const ships = Array.from({ length: mobile ? 10 : 18 }, (_, i) => ({ r: i % ROUTES.length, t: Math.random(), v: .00025 + Math.random() * .0004 }));

    fetch(ROOT + 'data/zavoz-2026.json').then(r => r.json()).then(d => {
      towns = d.regions.flatMap(r => r.points.map(p => ({ name: p.name, ll: [p.lon, p.lat], flash: 0, bearing: 0 })));
      const c = document.getElementById('radarCount');
      if (!calm()) { const o = { a: 0 }; gsap.to(o, { a: 34, duration: 2.4, delay: delay + 1, ease: 'power2.out', onUpdate: () => { c.textContent = Math.round(o.a); } }); }
    }).catch(() => {});

    // состояние анимации
    const S = { grid: 0, water: 0, rivers: 0, routes: 0, towns: 0, sweep: 0 };
    let mx = 0, my = 0, tx = 0, ty = 0;
    document.querySelector('.hv--radar').addEventListener('pointermove', e => { tx = (e.clientX / innerWidth - .5); ty = (e.clientY / innerHeight - .5); });

    const C = { red: '#EE3A2E', ice: '#EEF2F4', frost: '#8FA3B8', deep: '#18304F', river: '#2F5384' };

    function poly(P, pts, frac = 1) {
      const n = Math.max(2, Math.ceil(pts.length * frac));
      ctx.beginPath(); pts.slice(0, n).forEach((p, i) => { const [x, y] = P(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    }
    function frame(time) {
      const t = (time || 0) / 1000;
      mx += (tx - mx) * .04; my += (ty - my) * .04;
      const lon0 = 72.5 + Math.sin(t * .06) * 1.2 + mx * 3;
      const P0 = polar(W, H, lon0, mobile);
      const P = ll => { const [x, y] = P0(ll); return [x, y + my * 14]; };
      const k = H * (mobile ? .042 : .0488);
      ctx.clearRect(0, 0, W, H);

      // сетка: параллели и меридианы
      ctx.lineWidth = 1;
      ctx.globalAlpha = S.grid;
      ctx.strokeStyle = 'rgba(143,163,184,.12)';
      ctx.fillStyle = 'rgba(143,163,184,.5)'; ctx.font = '11px Onest, sans-serif';
      for (let lat = 54; lat <= 78; lat += 2) {
        ctx.beginPath();
        for (let lon = 40; lon <= 105; lon += 1) { const [x, y] = P([lon, lat]); lon === 40 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.stroke();
        if (lat % 4 === 0) { const [x, y] = P([lon0 - (mobile ? 9 : 14), lat]); ctx.fillText(lat + '°', x + 4, y - 4); }
      }
      for (let lon = 45; lon <= 100; lon += 5) { ctx.beginPath(); const [x1, y1] = P([lon, 80]), [x2, y2] = P([lon, 50]); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
      // полярный круг
      ctx.setLineDash([3, 6]); ctx.strokeStyle = 'rgba(238,58,46,.45)';
      ctx.beginPath(); for (let lon = 40; lon <= 105; lon += 1) { const [x, y] = P([lon, 66.56]); lon === 40 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.setLineDash([]);
      { const [x, y] = P([lon0 + (mobile ? 10 : 20), 66.56]); ctx.fillStyle = 'rgba(238,58,46,.7)'; ctx.fillText('Северный полярный круг', x - 140, y - 8); }

      // вода
      ctx.globalAlpha = S.water;
      ctx.fillStyle = C.deep;
      SEAS.forEach(s => { poly(P, s); ctx.closePath(); ctx.fill(); });
      ctx.strokeStyle = C.deep; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      BAYS.forEach(b => { for (let i = 1; i < b.c.length; i++) { ctx.lineWidth = (b.w[i] + b.w[i - 1]) / 2 * k; ctx.beginPath(); const [x1, y1] = P(b.c[i - 1]), [x2, y2] = P(b.c[i]); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); } });
      ctx.globalAlpha = 1;
      // реки
      ctx.strokeStyle = C.river; ctx.lineWidth = 1.6;
      RIVERS.forEach(r => { poly(P, r, S.rivers); ctx.stroke(); });
      // маршруты
      ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.shadowColor = 'rgba(238,58,46,.6)'; ctx.shadowBlur = 8;
      ROUTES.forEach(r => { poly(P, r, S.routes); ctx.stroke(); });
      ctx.shadowBlur = 0;

      // луч радара из Салехарда
      const [hx, hy] = P(HUB);
      const ang = (t * .7) % (Math.PI * 2);
      if (S.sweep > 0 && ctx.createConicGradient) {
        const g = ctx.createConicGradient(ang - Math.PI * .35, hx, hy);
        g.addColorStop(0, 'rgba(74,114,240,0)'); g.addColorStop(.175, `rgba(74,114,240,${.16 * S.sweep})`); g.addColorStop(.18, 'rgba(74,114,240,0)'); g.addColorStop(1, 'rgba(74,114,240,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, Math.max(W, H) * .9, 0, Math.PI * 2); ctx.fill();
        // кольца-импульсы
        for (let i = 0; i < 3; i++) { const p = ((t * .25 + i / 3) % 1); ctx.strokeStyle = `rgba(238,242,244,${(1 - p) * .18 * S.sweep})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(hx, hy, p * Math.max(W, H) * .5, 0, Math.PI * 2); ctx.stroke(); }
      }

      // посёлки
      ctx.font = '12px Onest, sans-serif';
      towns.forEach((tw, i) => {
        if (i / towns.length > S.towns) return;
        const [x, y] = P(tw.ll);
        let b = Math.atan2(y - hy, x - hx); if (b < 0) b += Math.PI * 2;
        let d = Math.abs(((ang - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (d < .06 && S.sweep > 0) tw.flash = 1;
        tw.flash *= .965;
        const r = 3 + tw.flash * 4;
        if (tw.flash > .05) { ctx.fillStyle = `rgba(238,242,244,${tw.flash * .25})`; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#0F1B2D'; ctx.strokeStyle = C.ice; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        if (LABELS.includes(tw.name) && !mobile) { ctx.fillStyle = `rgba(238,242,244,${.55 + tw.flash * .45})`; ctx.fillText(tw.name, x + 8, y + 4); }
      });
      // заводы
      ORIGINS.forEach(([n, lon, lat]) => {
        const [x, y] = P([lon, lat]);
        if (y > H + 20) return;
        ctx.globalAlpha = S.towns; ctx.fillStyle = C.red; ctx.fillRect(x - 4, y - 4, 8, 8);
        ctx.fillStyle = C.ice; ctx.font = '12px Onest, sans-serif'; ctx.fillText(n, x + 10, y + 4); ctx.globalAlpha = 1;
      });
      // хаб
      ctx.fillStyle = C.ice; ctx.beginPath(); ctx.arc(hx, hy, 5, 0, Math.PI * 2); ctx.fill();
      ctx.font = '500 14px Unbounded, sans-serif'; ctx.fillText('Салехард', hx - 96, hy + 22);

      // танкеры
      if (S.routes >= 1) ships.forEach(s => {
        s.t += s.v; if (s.t > 1) { s.t = 0; s.r = Math.floor(Math.random() * ROUTES.length); }
        const [x, y] = P(along[s.r](s.t));
        const g = ctx.createRadialGradient(x, y, 0, x, y, 10); g.addColorStop(0, 'rgba(255,210,122,.9)'); g.addColorStop(1, 'rgba(255,178,63,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFE3A6'; ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
      });
      if (!calm()) requestAnimationFrame(frame);
    }

    if (calm()) { Object.keys(S).forEach(k => S[k] = 1); S.sweep = 0; frame(0); return; }
    gsap.timeline({ delay })
      .to(S, { grid: 1, duration: 1.4, ease: 'power2.out' }, 0)
      .to(S, { water: 1, duration: 1.6, ease: 'power2.out' }, .2)
      .to(S, { rivers: 1, duration: 2, ease: 'power2.inOut' }, .5)
      .to(S, { routes: 1, duration: 2.4, ease: 'power2.inOut' }, 1.2)
      .to(S, { towns: 1, duration: 1.6, ease: 'none' }, 2)
      .to(S, { sweep: 1, duration: 1.2 }, 2.8);
    requestAnimationFrame(frame);
  }

  // ================= 2. ЯМАЛ сквозь буквы =================
  function letters() {
    const sec = document.getElementById('hv2'); if (!sec) return;
    if (calm()) { gsap && gsap.set('.hv2__content', { autoAlpha: 1 }); return; }
    gsap.registerPlugin(ScrollTrigger, SplitText);
    const word = sec.querySelector('.hv2__word');
    const split = SplitText.create(word, { type: 'chars' });
    gsap.timeline({ delay })
      .from(split.chars, { yPercent: 70, opacity: 0, duration: 1.3, stagger: .09, ease: 'power4.out' }, 0)
      .from('.hv2__photo img', { scale: 1.4, duration: 3, ease: 'power3.out' }, 0)
      .from('.hv2__meta, .hv2__hint', { opacity: 0, duration: 1 }, 1);
    // курсор слегка двигает фото внутри букв
    if (matchMedia('(hover: hover)').matches) {
      const qx = gsap.quickTo('.hv2__photo', 'x', { duration: 1, ease: 'power3' }), qy = gsap.quickTo('.hv2__photo', 'y', { duration: 1, ease: 'power3' });
      sec.addEventListener('pointermove', e => { qx((e.clientX / innerWidth - .5) * -40); qy((e.clientY / innerHeight - .5) * -30); });
    }
    gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: .6 } })
      .to('.hv2__hint, .hv2__meta', { opacity: 0, duration: .1 }, 0)
      .to('.hv2__mask', { scale: 9, duration: .55, ease: 'power2.in' }, 0)
      .to('.hv2__mask', { opacity: 0, duration: .2 }, .4)
      .to('.hv2__photo img', { scale: 1, duration: .6 }, 0)
      .to('.hv2__photo', { '--shade': 1, duration: .3 }, .45)
      .to('.hv2__content', { autoAlpha: 1, duration: .05 }, .6)
      .from('.hv2__content .hv__ln > span', { yPercent: 110, stagger: .04, duration: .2 }, .6)
      .from('.hv2__content .hv__lead, .hv2__content .hv__actions', { y: 30, opacity: 0, stagger: .05, duration: .2 }, .7)
      .to({}, { duration: .1 });
  }

  // ================= 3. Снег собирается в логотип =================
  function snow() {
    const cv = document.getElementById('snow'); if (!cv) return;
    const ctx = cv.getContext('2d');
    let W, H, DPR, parts = [], mobile;
    const COLORS = { b: [74, 114, 240], r: [238, 58, 46], w: [238, 242, 244] };
    const mouse = { x: -9999, y: -9999, down: false };
    let formed = false;

    function targets() {
      // три ромба логотипа, нарисованные во внеэкранный холст и разобранные на точки
      const s = mobile ? Math.min(W * .2, 90) : Math.min(H * .19, W * .095);
      const cx = mobile ? W * .5 : W * .77, cy = mobile ? H * .26 : H * .48;
      const off = document.createElement('canvas'); off.width = W; off.height = H;
      const o = off.getContext('2d');
      const dia = (x, y, col) => { o.save(); o.translate(x, y); o.rotate(Math.PI / 4); o.fillStyle = col; o.fillRect(-s / 2, -s / 2, s, s); o.restore(); };
      const d = s * Math.SQRT2 / 2 * 1.08;
      dia(cx - d, cy - d / 1.6, '#0000ff'); dia(cx + d, cy - d / 1.6, '#ff0000'); dia(cx, cy + d / 1.4, '#00ff00');
      const img = o.getImageData(0, 0, W, H).data;
      const out = [], step = mobile ? 5 : 6;
      for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
        const i = (y * W + x) * 4; if (img[i + 3] < 128) continue;
        out.push({ x, y, c: img[i + 2] > 200 ? 'b' : img[i] > 200 ? 'r' : 'w' });
      }
      return out.sort(() => Math.random() - .5);
    }
    function init() {
      DPR = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; mobile = W < 900;
      if (W < 20 || H < 20) return false; // окно ещё не получило размер (встроенный просмотр) — ждём
      cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const T = targets();
      const n = Math.max(T.length + 300, Math.min(2200, Math.round(W * H / 650)));
      parts = Array.from({ length: n }, (_, i) => {
        const t = T[i % T.length];
        const own = i < T.length;
        return { x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0, r: own ? 1.6 + Math.random() * .9 : .6 + Math.random() * 1.6, a: own ? 1 : .25 + Math.random() * .5,
          tx: t.x + (Math.random() - .5) * 2, ty: t.y + (Math.random() - .5) * 2, c: t.c, own, fall: .3 + Math.random() * .9, sway: Math.random() * 6.28, mix: 0, delay: Math.random() * .9 };
      });
      return true;
    }
    let ready = init();
    // пересчёт при любом изменении размера холста — в том числе когда встроенное окно растягивается после загрузки
    let to;
    const reinit = () => { clearTimeout(to); to = setTimeout(() => { const was = ready; ready = init(); if (ready && (formed || !was)) form(); if (ready && calm()) snowStatic(); }, ready ? 200 : 0); };
    if (window.ResizeObserver) new ResizeObserver(reinit).observe(cv); else addEventListener('resize', reinit);

    const sec = document.querySelector('.hv--snow');
    sec.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    sec.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    sec.addEventListener('click', e => {
      if (e.target.closest('a, button')) return;
      // вспышка: частицы разлетаются от точки клика и собираются снова
      parts.forEach(p => { const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy) || 1; const f = Math.max(0, 1 - d / 420) * 24; p.vx += dx / d * f; p.vy += dy / d * f; });
    });

    function form() { formed = true; if (!ready) return; parts.forEach(p => { if (p.own) gsap.to(p, { mix: 1, duration: 1.8, delay: p.delay, ease: 'power3.inOut', overwrite: true }); }); }
    function release() { formed = false; parts.forEach(p => { if (p.own) { gsap.to(p, { mix: 0, duration: .6, overwrite: true }); p.vy -= Math.random() * 3; p.vx += (Math.random() - .5) * 6; } }); }

    let t = 0;
    function frame() {
      t += .016;
      if (!ready) { requestAnimationFrame(frame); return; }
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        // снег: падение с покачиванием
        const sx = Math.sin(t * .8 + p.sway) * .35, sy = p.fall;
        // притяжение к цели логотипа
        if (p.own && p.mix > 0) {
          p.vx += (p.tx - p.x) * .06 * p.mix; p.vy += (p.ty - p.y) * .06 * p.mix;
          p.vx *= .8; p.vy *= .8;
        } else { p.vx = p.vx * .96 + sx * .05; p.vy = p.vy * .96 + sy * .05; }
        // курсор отталкивает
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy, R = mobile ? 70 : 120;
        if (d2 < R * R) { const d = Math.sqrt(d2) || 1, f = (1 - d / R) * 3.2; p.vx += dx / d * f; p.vy += dy / d * f; }
        p.x += p.vx + (p.mix > 0 ? 0 : sx); p.y += p.vy + (p.mix > 0 ? 0 : sy);
        if (!(p.own && p.mix > .5)) { if (p.y > H + 5) { p.y = -5; p.x = Math.random() * W; } if (p.x < -5) p.x = W + 5; if (p.x > W + 5) p.x = -5; }
        const col = p.own ? COLORS[p.c] : COLORS.w;
        const m = p.own ? p.mix : 0;
        const rr = Math.round(238 + (col[0] - 238) * m), gg = Math.round(242 + (col[1] - 242) * m), bb = Math.round(244 + (col[2] - 244) * m);
        ctx.fillStyle = `rgba(${rr},${gg},${bb},${p.own ? .5 + .5 * m : p.a})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      requestAnimationFrame(frame);
    }

    function snowStatic() { if (!ready) return; parts.forEach(p => { if (p.own) { p.x = p.tx; p.y = p.ty; p.mix = 1; } }); ctx.clearRect(0, 0, W, H);
      parts.forEach(p => { const col = p.own ? COLORS[p.c] : COLORS.w; ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${p.own ? 1 : p.a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }); }
    if (calm()) { snowStatic(); return; }
    requestAnimationFrame(frame);
    if (pre) {
      // заставка отдаёт точки карты на экране: снег начинается там, где была карта, и слетается в логотип
      window.ygsPreload.onDissolve(pts => {
        if (!ready) { gsap.delayedCall(.45, form); return; }
        parts.forEach((p, i) => { const q = pts[i % pts.length]; p.x = q.x; p.y = q.y; p.vx = (Math.random() - .5) * .6; p.vy = (Math.random() - .5) * .6; });
        gsap.delayedCall(.45, form);
      });
    } else gsap.delayedCall(delay + .9, form);
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({ trigger: sec, start: 'top top', end: 'bottom top', onUpdate: s => { if (s.progress > .12 && formed) release(); else if (s.progress < .05 && !formed) form(); } });
  }

  const safe = (fn, name) => { try { fn(); } catch (e) { console.error('[hero ' + name + ']', e); } };
  safe(rotator, 'rotator');
  if (!document.body.classList.contains('hv-2')) safe(introText, 'text');
  if (document.body.classList.contains('hv-1')) safe(radar, 'radar');
  if (document.body.classList.contains('hv-2')) safe(letters, 'letters');
  if (document.body.classList.contains('hv-3')) safe(snow, 'snow');
})();
