/* Фон первого экрана: реальная карта ЯНАО и движение по маршрутам —
   поезда по железным дорогам, танкеры по Оби и губам, бензовозы по трассам.
   Статичная часть карты рисуется один раз во внеэкранный холст, в кадре — только транспорт. */
(function () {
  const cv = document.getElementById('routes');
  if (!cv || !window.YNAO) return;
  const ctx = cv.getContext('2d');
  const root = document.documentElement;
  const calm = () => (window.ygsCalm ? window.ygsCalm() : false) || !window.gsap || root.classList.contains('a11y');
  const pre = window.ygsPreload && window.ygsPreload.active;

  let geo = null, W = 0, H = 0, DPR = 1, T = null, base = null, mobile = false;
  let rails = [], roads = [], water = [], fleet = [];
  const S = { map: 0, traffic: 0 };

  function build() {
    DPR = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; mobile = W < 900;
    if (!geo || W < 20 || H < 20) return false;
    cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // карта справа, крупно; на телефоне — сверху по центру
    const rect = mobile ? { x: -W * .1, y: H * .04, w: W * 1.2, h: H * .7 } : { x: W * .1, y: -H * .02, w: W * .8, h: H * 1.04 };
    T = YNAO.fit([geo.bbox[0] - 30, geo.bbox[1] - 6, geo.bbox[2] + 30, geo.bbox[3] + 26], rect);
    const P = l => l.map(T);

    // сети для отрисовки
    rails = YNAO.chain(geo.rail).map(P).filter(l => YNAO.lenOf(l) > (mobile ? 50 : 90));
    roads = YNAO.chain(geo.roads).map(P).filter(l => YNAO.lenOf(l) > (mobile ? 40 : 70));
    // маршруты движения по реальным линиям (в координатах данных, затем на экран)
    const ll = YNAO.proj, SAL = ll([66.6, 66.53]);
    const ob = geo.rivers.filter(r => /^(Ob|Irtysh)$/.test(r.name)).flatMap(r => r.parts);
    const irtysh = (geo.rivers.find(r => r.name === 'Irtysh') || { parts: [[]] }).parts.flat();
    const omsk = irtysh.length ? irtysh.reduce((a, b) => b[1] > a[1] ? b : a) : null; // южный конец Иртыша в кадре — в сторону Омска
    const tankerSurgut = YNAO.route(ob, ll([73.4, 61.25]), SAL, 1.5);
    const tankerOmsk = omsk && YNAO.route(ob, omsk, SAL, 1.5);
    const truckPath = YNAO.route(geo.roads.concat(geo.rail), ll([75.45, 63.2]), SAL, 1.2); // Ноябрьск → Салехард
    water = [tankerSurgut, tankerOmsk].filter(Boolean).map(P);
    const truck = truckPath ? P(truckPath) : null;

    // статичный слой
    base = document.createElement('canvas'); base.width = W * DPR; base.height = H * DPR;
    const b = base.getContext('2d'); b.setTransform(DPR, 0, 0, DPR, 0, 0);
    const line = (l, close) => { b.beginPath(); l.forEach(([x, y], i) => i ? b.lineTo(x, y) : b.moveTo(x, y)); if (close) b.closePath(); };
    b.lineJoin = b.lineCap = 'round';
    // соседи и побережье — едва заметно
    b.strokeStyle = 'rgba(143,163,184,.14)'; b.lineWidth = 1;
    geo.neighbours.forEach(l => { line(P(l)); b.stroke(); });
    geo.coast.forEach(l => { line(P(l)); b.stroke(); });
    // округ: лёгкая заливка точками и контур
    const step = Math.max(1.2, (mobile ? 6 : 8) / T.s);
    b.fillStyle = 'rgba(143,175,215,.16)';
    YNAO.halftone(geo, step).forEach(p => { const [x, y] = T(p); b.fillRect(x - .8, y - .8, 1.6, 1.6); });
    b.strokeStyle = 'rgba(238,242,244,.28)'; b.lineWidth = 1;
    geo.region.forEach(r => { line(P(r), true); b.stroke(); });
    // реки
    b.strokeStyle = 'rgba(62,107,176,.75)'; b.lineWidth = 1.3;
    geo.rivers.forEach(r => r.parts.forEach(l => { line(P(l)); b.stroke(); }));
    // дороги и ж/д
    b.strokeStyle = 'rgba(238,58,46,.28)'; b.lineWidth = 1;
    roads.forEach(l => { line(l); b.stroke(); });
    b.strokeStyle = 'rgba(201,212,223,.42)'; b.lineWidth = 1.4; b.setLineDash([5, 4]);
    rails.forEach(l => { line(l); b.stroke(); }); b.setLineDash([]);
    // города
    b.font = '11px Onest, sans-serif';
    // Лабытнанги и Салехард рядом: подпись Лабытнанги — слева сверху, Салехарда — справа снизу
    const LABEL = { 'Лабытнанги': [-7, -6, 'right'], 'Салехард': [7, 12, 'left'] };
    geo.places.forEach(t => {
      const [x, y] = T(t.p); if (x < 10 || x > W - 10 || y < 60 || y > H - 20) return;
      const [dx, dy, align] = LABEL[t.n] || [7, 4, 'left'];
      b.fillStyle = 'rgba(238,242,244,.75)'; b.fillRect(x - 2, y - 2, 4, 4);
      b.fillStyle = 'rgba(238,242,244,.5)'; b.textAlign = align; b.fillText(t.n, x + dx, y + dy);
    });
    b.textAlign = 'left';

    // транспорт: один поезд, танкеры от Сургута и от Омска по Оби, бензовоз Ноябрьск — Салехард
    fleet = [];
    const longest = rails.slice().sort((p, q) => YNAO.lenOf(q) - YNAO.lenOf(p))[0];
    if (longest) fleet.push({ kind: 'train', tr: YNAO.track(longest), t: Math.random(), dir: 1, v: 1 });
    water.slice(0, mobile ? 1 : 2).forEach((l, i) => fleet.push({ kind: 'ship', tr: YNAO.track(l), t: .5 + i * .22, dir: 1, v: .55 }));
    if (truck) fleet.push({ kind: 'truck', tr: YNAO.track(truck), t: .3, dir: 1, v: 1 });
    return true;
  }

  function drawVehicle(f) {
    const L = f.tr.length;
    if (f.kind === 'train') {
      // локомотив и вагоны вдоль пути
      for (let k = 0; k < 6; k++) {
        const [x, y, a] = f.tr(f.t - f.dir * k * 7 / L);
        ctx.save(); ctx.translate(x, y); ctx.rotate(a);
        ctx.fillStyle = k === 0 ? '#EEF2F4' : 'rgba(201,212,223,.8)'; ctx.fillRect(-2.6, -1.6, 5.2, 3.2);
        ctx.restore();
      }
    } else if (f.kind === 'ship') {
      // кильватерный след
      for (let k = 1; k < 10; k++) { const [x, y] = f.tr(f.t - k * 3 / L); ctx.fillStyle = `rgba(255,210,122,${.18 * (1 - k / 10)})`; ctx.beginPath(); ctx.arc(x, y, 1.3, 0, 6.283); ctx.fill(); }
      const [x, y, a] = f.tr(f.t);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.fillStyle = '#FFE3A6';
      ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-4, -2.4); ctx.lineTo(-4, 2.4); ctx.closePath(); ctx.fill(); ctx.restore();
    } else {
      const [x, y, a] = f.tr(f.t);
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = '#EE3A2E'; ctx.fillRect(-4, -1.8, 6, 3.6); ctx.fillStyle = '#FF8A7F'; ctx.fillRect(2.4, -1.8, 2, 3.6);
      ctx.restore();
    }
  }

  let last = 0;
  function frame(now) {
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    ctx.clearRect(0, 0, W, H);
    if (!base) { if (!calm()) requestAnimationFrame(frame); return; }
    ctx.globalAlpha = S.map; ctx.drawImage(base, 0, 0, W, H);
    ctx.globalAlpha = S.traffic;
    for (const f of fleet) {
      if (!calm()) {
        f.t += f.dir * f.v * dt / f.tr.length;
        if (f.kind === 'ship') { if (f.t > 1) f.t = 0; }
        else if (f.t > 1 || f.t < 0) { f.dir *= -1; f.t = Math.max(0, Math.min(1, f.t)); }
      }
      drawVehicle(f);
    }
    ctx.globalAlpha = 1;
    if (!calm()) requestAnimationFrame(frame);
  }

  const start = () => {
    if (calm()) { S.map = 1; S.traffic = 1; frame(performance.now()); return; }
    gsap.to(S, { map: 1, duration: 2.4, ease: 'power1.inOut' });
    gsap.to(S, { traffic: 1, duration: 2, delay: 1.2, ease: 'power1.inOut' });
    requestAnimationFrame(frame);
  };
  const rebuild = () => { if (build() && calm()) frame(performance.now()); };
  if (window.ResizeObserver) new ResizeObserver(rebuild).observe(cv); else addEventListener('resize', rebuild);

  YNAO.load().then(g => {
    geo = g; build();
    if (pre) window.ygsPreload.onDissolve(() => gsap.delayedCall(.5, start));
    else gsap.delayedCall(root.classList.contains('intro-on') ? 1.2 : .3, start);
  }).catch(() => { cv.remove(); });

  // при прокрутке ниже первого экрана — не тратим ресурсы
  if (window.ScrollTrigger && !calm()) ScrollTrigger.create({ trigger: cv, start: 'top bottom', end: 'bottom top', onLeave: () => gsap.to(S, { traffic: 0, duration: .3 }), onEnterBack: () => gsap.to(S, { traffic: 1, duration: .3 }) });
})();
