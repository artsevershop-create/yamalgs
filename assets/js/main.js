/* Главная: hero, маршрут на карте, превью фото, раскрытие базы, подвал */
(function () {
  const root = document.documentElement;
  document.addEventListener('ygs:a11y', e => { if (e.detail.on) calmDown(); });
  const calm = () => window.ygsCalm ? window.ygsCalm() : root.classList.contains('a11y');

  // ---------- Карта ----------
  const mapSvg = document.getElementById('map');
  const narrow = matchMedia('(max-width: 860px)');
  const fitMap = () => mapSvg.setAttribute('viewBox', narrow.matches ? '-40 60 1000 860' : '70 30 890 880');
  fitMap(); narrow.addEventListener('change', fitMap);
  const countEl = document.getElementById('mapCount');
  const map = window.YMap.init(mapSvg, n => { countEl.textContent = n; });
  const meta = document.querySelector('.map__meta');
  narrow.addEventListener('change', () => map.placeLabels());

  // прогресс прокрутки секции → прогресс маршрута (панели: вступление, 1–4)
  const routeT = p => {
    const seg = [[0, 0], [0.22, 0], [0.42, 0.3], [0.6, 0.4], [0.8, 0.72], [1, 1]];
    for (let i = 1; i < seg.length; i++) {
      if (p <= seg[i][0]) { const [p0, t0] = seg[i - 1], [p1, t1] = seg[i]; return t0 + (t1 - t0) * ((p - p0) / (p1 - p0)); }
    }
    return 1;
  };

  function calmDown() {
    if (window.gsap) {
      gsap.set('.panel__inner, .base__clip, .base__clip img, .base__caption, .ftr__word .mark rect, .about__text .word, .cargo__bar i', { clearProps: 'all' });
      gsap.set([map.grid, map.circle, map.circleT, map.origin, ...map.water.querySelectorAll('.m-sea')], { clearProps: 'opacity' });
      gsap.set(map.rivers, { clearProps: 'strokeDasharray,strokeDashoffset' });
      gsap.set('.peek', { opacity: 0 });
    }
    map.setProgress(1); meta.classList.add('is-on');
  }
  if (calm() || !window.gsap) {
    map.setProgress(1); meta.classList.add('is-on');
    return;
  }

  // ---------- Маршрут: карта рисуется при появлении секции, затем — на прокрутке ----------
  const draw = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  draw.from(map.grid, { opacity: 0, duration: 1.4 }, 0)
    .from(map.water.querySelectorAll('.m-sea'), { opacity: 0, duration: 1.6, stagger: 0.1 }, 0.1);
  map.rivers.forEach((r, i) => {
    const len = r.getTotalLength();
    draw.fromTo(r, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 2, ease: 'power2.inOut' }, 0.3 + i * 0.15);
  });
  draw.from([map.circle, map.circleT, map.origin], { opacity: 0, duration: 1 }, 1.2);
  // вагоны медленно идут по железной дороге в Лабытнанги
  const railLen = map.rail.getTotalLength();
  const wagons = [0, 1, 2].map(() => { const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); r.setAttribute('class', 'm-wagon'); r.setAttribute('width', 9); r.setAttribute('height', 5); r.setAttribute('rx', 1); map.origin.appendChild(r); return r; });
  const rideState = { t: 0 };
  const placeWagons = () => wagons.forEach((w, i) => {
    const d = Math.max(0, rideState.t * railLen - i * 12), a = map.rail.getPointAtLength(d), b = map.rail.getPointAtLength(Math.min(railLen, d + 1));
    w.setAttribute('transform', `translate(${a.x} ${a.y}) rotate(${Math.atan2(b.y - a.y, b.x - a.x) * 57.3}) translate(-4.5 -2.5)`);
    w.style.opacity = rideState.t > .97 ? (1 - rideState.t) / .03 : Math.min(1, rideState.t * 20);
  });
  placeWagons();
  draw.add(gsap.to(rideState, { t: 1, duration: 18, ease: 'none', repeat: -1, repeatDelay: 3, onUpdate: placeWagons }), 2);
  ScrollTrigger.create({ trigger: '.voyage', start: 'top 70%', once: true, onEnter: () => draw.play() });

  // ---------- Значки у цифр: линии прорисовываются по очереди ----------
  const icoLines = gsap.utils.toArray('.facts__ico :is(path, circle):not([stroke-dasharray])');
  icoLines.forEach(l => { const len = Math.ceil(l.getTotalLength()); gsap.set(l, { strokeDasharray: len, strokeDashoffset: len }); });
  gsap.set('.facts__ico [stroke-dasharray]', { opacity: 0 });
  ScrollTrigger.create({ trigger: '.facts', start: 'top 85%', once: true, onEnter: () => {
    gsap.to(icoLines, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', stagger: 0.06 });
    gsap.to('.facts__ico [stroke-dasharray]', { opacity: 1, duration: .8, delay: 1 });
  } });

  ScrollTrigger.create({
    trigger: '.voyage', start: 'top top', end: 'bottom bottom', scrub: 0.8,
    onUpdate: s => { const t = routeT(s.progress); map.setProgress(t); meta.classList.toggle('is-on', t > 0.02); }
  });
  gsap.utils.toArray('.voyage__steps .panel__inner').forEach(p => {
    gsap.timeline({ scrollTrigger: { trigger: p, start: 'top 85%', end: 'bottom 15%', scrub: true } })
      .fromTo(p, { opacity: 0, y: 60 }, { opacity: 1, y: 0, ease: 'none', duration: 0.35 })
      .to(p, { opacity: 1, duration: 0.3 })
      .to(p, { opacity: 0, y: -40, ease: 'none', duration: 0.35 });
  });

  // ---------- О компании: текст проявляется по словам ----------
  SplitText.create('[data-words]', {
    type: 'words', wordsClass: 'word', autoSplit: true,
    onSplit: self => gsap.to(self.words, { opacity: 1, stagger: 0.08, ease: 'none', scrollTrigger: { trigger: '.about__text', start: 'top 80%', end: 'bottom 45%', scrub: true } })
  });

  // ---------- Деятельность: превью фото за курсором ----------
  const peek = document.querySelector('.peek');
  const peekImg = peek.querySelector('img');
  if (matchMedia('(hover: hover) and (min-width: 861px)').matches) {
    const xTo = gsap.quickTo(peek, 'x', { duration: 0.6, ease: 'power3' });
    const yTo = gsap.quickTo(peek, 'y', { duration: 0.6, ease: 'power3' });
    const list = document.querySelector('.work__list');
    list.addEventListener('mousemove', e => { xTo(e.clientX + 24); yTo(e.clientY - 110); });
    document.querySelectorAll('.work__row').forEach(row => {
      row.addEventListener('mouseenter', () => {
        peekImg.src = row.dataset.img;
        gsap.fromTo(peek, { rotation: -4 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.5, ease: 'power3.out' });
      });
    });
    list.addEventListener('mouseleave', () => gsap.to(peek, { opacity: 0, scale: 0.6, duration: 0.4, ease: 'power3.in' }));
  }

  // ---------- Обской причал: фото раскрывается на прокрутке ----------
  gsap.timeline({ scrollTrigger: { trigger: '.base__media', start: 'top 80%', end: 'bottom bottom', scrub: true } })
    .to('.base__clip', { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none' }, 0)
    .to('.base__clip img', { scale: 1, ease: 'none' }, 0)
    .to('.base__caption', { opacity: 1, duration: .2 }, .8);

  // ---------- Логотип в подвале собирается ----------
  gsap.from('.ftr__word .mark rect', {
    scale: 0, rotate: -45, transformOrigin: '50% 50%', stagger: 0.12, duration: 0.9, ease: 'back.out(1.8)',
    scrollTrigger: { trigger: '.ftr__word', start: 'top 92%' }
  });
})();
