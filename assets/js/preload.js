/* Заставка главной: логотип → большая карта ЯНАО из точек (реальные границы) → точки становятся снегом, который собирается в логотип hero.
   Показывается один раз за сессию (класс pre-on ставит assets/js/boot.js), #intro в адресе — показать снова.
   Отключается при «уменьшить движение» и в версии для слабовидящих. */
(function () {
  const root = document.documentElement;
  const el = document.getElementById('preload');
  window.ygsPreload = { active: false, onDissolve() {} };
  if (!el) return;
  const active = root.classList.contains('pre-on') && !!window.gsap && !root.classList.contains('a11y');
  if (!active) { el.remove(); root.classList.remove('pre-on'); return; }
  try { sessionStorage.setItem('ygs-pre', '1'); sessionStorage.setItem('ygs-intro', '1'); } catch (e) { /* хранилище недоступно */ }
  if (location.hash === '#intro') try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}

  const listeners = [];
  window.ygsPreload = { active: true, onDissolve(fn) { listeners.push(fn); } };

  const cv = document.getElementById('preloadMap');
  const ctx = cv.getContext('2d');
  const count = document.getElementById('preloadCount');
  const S = { reveal: 0, contour: 0, rivers: 0, towns: 0, pulse: 0 };
  let geo = null, dots = [], T = null, W = 0, H = 0, DPR = 1, towns = [], hub = null;

  function layout() {
    DPR = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth || innerWidth; H = cv.clientHeight || innerHeight;
    if (W < 20 || H < 20) return;
    cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (!geo) return;
    const mobile = W < 900;
    // карта крупно: почти во всю высоту, сверху место под логотип
    const top = mobile ? H * .2 : H * .13;
    T = YNAO.fit(geo.bbox, { x: 0, y: top, w: W, h: H - top - (mobile ? H * .16 : H * .04) }, mobile ? 8 : 24);
    const step = Math.max(1.05, (mobile ? 5.2 : 7.2) / T.s);
    dots = YNAO.halftone(geo, step).map(p => { const [x, y] = T(p); return { x, y, r: Math.random() }; });
    towns = geo.towns.map(t => T(t.p));
    hub = T(YNAO.proj([66.6, 66.53]));
  }
  if (window.ResizeObserver) new ResizeObserver(layout).observe(cv); else addEventListener('resize', layout);

  const path = (pts, close) => { ctx.beginPath(); pts.forEach((p, i) => { const [x, y] = T(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); if (close) ctx.closePath(); };
  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (!geo || !T) return;
    // точки полутона проявляются волной с севера на юг
    const fy = T([0, geo.bbox[1] + (geo.bbox[3] - geo.bbox[1] + 30) * S.reveal])[1];
    for (const d of dots) {
      const k = Math.max(0, Math.min(1, (fy - d.y) / 90));
      if (k <= 0) continue;
      ctx.fillStyle = `rgba(143,175,215,${(.2 + d.r * .35) * k})`;
      ctx.fillRect(d.x - .9, d.y - .9, 1.8, 1.8);
    }
    // тонкий контур границы — проявляется целиком, без обводки
    if (S.contour > 0) { ctx.strokeStyle = `rgba(238,242,244,${.6 * S.contour})`; ctx.lineWidth = 1; for (const r of geo.region) { path(r, true); ctx.stroke(); } }
    if (S.rivers > 0) { ctx.strokeStyle = `rgba(62,107,176,${S.rivers})`; ctx.lineWidth = 1.4; for (const r of geo.rivers) for (const l of r.parts) { path(l); ctx.stroke(); } }
    const n = Math.round(towns.length * S.towns);
    ctx.fillStyle = '#0F1B2D'; ctx.strokeStyle = '#EEF2F4'; ctx.lineWidth = 1.5;
    for (let i = 0; i < n; i++) { const [x, y] = towns[i]; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 6.283); ctx.fill(); ctx.stroke(); }
    if (S.towns > 0 && hub) {
      ctx.fillStyle = '#EE3A2E'; ctx.beginPath(); ctx.arc(hub[0], hub[1], 5, 0, 6.283); ctx.fill();
      if (S.pulse > 0 && S.pulse < 1) { ctx.strokeStyle = `rgba(238,58,46,${1 - S.pulse})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hub[0], hub[1], 6 + S.pulse * 120, 0, 6.283); ctx.stroke(); }
    }
  }
  gsap.ticker.add(draw);

  // ---------- переход в снег ----------
  let dissolved = false;
  function dissolve() {
    if (dissolved) return; dissolved = true;
    gsap.ticker.remove(draw);
    // точки карты уходят в снег: передаём их экранные координаты сцене hero
    let pts = dots.map(d => ({ x: d.x, y: d.y }));
    towns.forEach(([x, y]) => pts.push({ x, y }));
    if (!pts.length) pts = [{ x: innerWidth / 2, y: innerHeight / 2 }];
    for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
    root.classList.remove('pre-on', 'intro-on');
    listeners.forEach(fn => { try { fn(pts); } catch (e) { /* hero соберётся сам */ } });
    gsap.timeline({ onComplete: () => el.remove() })
      .to([cv, '.preload__caption', '.preload__logo', '.preload__bar', '.preload__skip'], { opacity: 0, duration: .3, ease: 'power2.out' }, 0)
      .to(el, { backgroundColor: 'rgba(15,27,45,0)', duration: .6, ease: 'power2.out' }, 0);
  }

  // ---------- сценарий ----------
  const cnt = { v: 0 };
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: dissolve, paused: true });
  tl
    .from('.preload__mark rect', { scale: 0, rotation: -90, transformOrigin: '50% 50%', stagger: .12, duration: .7, ease: 'back.out(2)' }, .1)
    .from('.preload__word', { y: 18, opacity: 0, duration: .6 }, .5)
    .to('.preload__bar i', { scaleX: 1, duration: 4.4, ease: 'power1.inOut' }, 0)
    .to('.preload__logo', { y: () => -innerHeight * (innerWidth < 900 ? .38 : .41), scale: .5, duration: .9, ease: 'power3.inOut' }, 1.2)
    .to(S, { reveal: 1, duration: 1.7, ease: 'power2.inOut' }, 1.3)
    .to(S, { contour: 1, duration: 1.1, ease: 'power1.out' }, 1.9)
    .to(S, { rivers: 1, duration: .9 }, 2.3)
    .to(S, { towns: 1, duration: .9, ease: 'none' }, 2.6)
    .to(S, { pulse: 1, duration: 1.3, ease: 'power2.out' }, 2.8)
    .from('.preload__caption > *', { y: 16, opacity: 0, stagger: .1, duration: .6 }, 2.4)
    .to(cnt, { v: 34, duration: 1.1, ease: 'power2.out', onUpdate: () => { count.textContent = Math.round(cnt.v); } }, 2.6)
    .to({}, { duration: .55 }); // пауза, чтобы карту успели разглядеть

  // карта нужна к 1.3 с; если данные не пришли — заставка идёт без карты
  layout();
  YNAO.load().then(g => { geo = g; layout(); }).catch(() => {}).finally(() => { if (tl.paused()) tl.play(); });
  setTimeout(() => { if (tl.paused()) tl.play(); }, 1200);

  // пропустить: клик, клавиша или кнопка
  const skip = () => { if (!dissolved) tl.timeScale(6); };
  el.addEventListener('click', skip);
  addEventListener('keydown', function k(e) { if (['Escape', 'Enter', ' '].includes(e.key)) { skip(); removeEventListener('keydown', k); } });
})();
