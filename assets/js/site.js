/* Общее для всех страниц: версия для слабовидящих, меню, cookie, плавный скролл, шапка, анимации появления */
(function () {
  const root = document.documentElement;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* приватный режим */ } }
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const calm = () => reduce || root.classList.contains('a11y');
  window.ygsCalm = calm;

  // ---------- Версия для слабовидящих ----------
  const a11yBtn = document.querySelector('.a11y-btn');
  if (store.get('ygs-a11y') === '1') root.classList.add('a11y');
  a11yBtn.setAttribute('aria-pressed', root.classList.contains('a11y'));
  a11yBtn.addEventListener('click', () => {
    const on = !root.classList.contains('a11y');
    store.set('ygs-a11y', on ? '1' : '0');
    if (!on) return location.reload();
    root.classList.add('a11y');
    a11yBtn.setAttribute('aria-pressed', 'true');
    if (window.ScrollTrigger) ScrollTrigger.getAll().forEach(st => st.kill());
    if (window.gsap) { gsap.globalTimeline.clear(); gsap.set('[data-reveal], [data-reveal] > *, .split-line, main, .ftr, .hdr, .page-hero__bg img, .news-card__img img, .album__grid img, .person__photo img, .logos img, .btn, .ch', { clearProps: 'all' }); }
    document.getElementById('intro')?.remove();
    if (window.lenis) { window.lenis.destroy(); window.lenis = null; }
    document.dispatchEvent(new CustomEvent('ygs:a11y', { detail: { on: true } }));
  });

  // ---------- Мобильное меню ----------
  const burger = document.querySelector('.hdr__burger');
  const mnav = document.getElementById('mnav');
  const setMenu = open => {
    burger.setAttribute('aria-expanded', open);
    mnav.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    if (window.lenis) open ? window.lenis.stop() : window.lenis.start();
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  mnav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !mnav.hidden) setMenu(false); });

  // ---------- Cookie ----------
  const cookie = document.getElementById('cookie');
  if (cookie && !store.get('ygs-cookie')) {
    cookie.hidden = false;
    cookie.addEventListener('click', e => {
      const b = e.target.closest('[data-cookie]'); if (!b) return;
      store.set('ygs-cookie', b.dataset.cookie);
      cookie.classList.add('is-off');
      setTimeout(() => { cookie.hidden = true; }, 400);
    });
  }

  // ---------- Формы: согласие и отправка ----------
  document.querySelectorAll('form[data-form]').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const consent = form.querySelector('input[name="consent"]');
      if (consent && !consent.checked) { consent.focus(); form.querySelector('.form__consent').classList.add('is-error'); return; }
      const btn = form.querySelector('button[type="submit"]');
      // Прототип: письмо формируется на стороне клиента. На проде — обработчик Битрикса или почтовый шлюз.
      const data = Object.fromEntries(new FormData(form).entries());
      const subject = encodeURIComponent(form.dataset.form);
      const body = encodeURIComponent(Object.entries(data).filter(([k]) => k !== 'consent').map(([k, v]) => `${form.querySelector(`[name="${k}"]`)?.closest('label')?.querySelector('span')?.textContent || k}: ${v}`).join('\n'));
      location.href = `mailto:ygs@yamalgs.ru?subject=${subject}&body=${body}`;
      btn.textContent = 'Открываем почту…';
      setTimeout(() => { btn.textContent = 'Отправлено'; form.reset(); }, 1500);
    });
  });

  // ---------- Шапка ----------
  const hdr = document.querySelector('.hdr');
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY;
    hdr.classList.toggle('is-solid', y > 40);
    hdr.classList.toggle('is-hidden', y > lastY && y > 400 && mnav.hidden && !hdr.matches(':hover'));
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  // тема шапки по тёмным секциям
  const darkSecs = [...document.querySelectorAll('[data-dark], .voyage, .base, .ftr, .sec--dark, .sec--deep, .page-hero, .zv, .page-zavoz main')];
  const themeBase = hdr.dataset.theme;
  const updTheme = () => {
    const on = darkSecs.some(s => { const r = s.getBoundingClientRect(); return r.top <= 36 && r.bottom > 36; });
    hdr.dataset.theme = on ? 'dark' : (themeBase === 'dark' && scrollY < 40 ? 'dark' : 'light');
  };
  // в светлой теме шапка всегда тёмным текстом — переключение темы по секциям не нужно
  const lightTheme = !!document.querySelector('link[href*="light.css"]');
  if (!lightTheme && (document.body.classList.contains('page-home') || darkSecs.length)) { addEventListener('scroll', updTheme, { passive: true }); updTheme(); }
  if (lightTheme) hdr.dataset.theme = 'light';

  // шапка страницы: ромбы логотипа прорисовываются и плывут, редкий снег, красная черта под заголовком.
  // При «уменьшении движения» — только прорисовка без перемещений; в версии для слабовидящих — без эффектов.
  const heroStill = calm(), heroDelay = root.classList.contains('intro-on') ? 1.1 : 0;
  if (window.gsap && !root.classList.contains('a11y')) document.querySelectorAll('.page-hero').forEach(hero => {
    const startDelay = heroDelay;
    const fx = document.createElement('div'); fx.className = 'ph-fx'; fx.setAttribute('aria-hidden', 'true');
    fx.innerHTML = '<canvas class="ph-snow"></canvas><svg class="ph-dia" viewBox="0 0 100 80"><rect class="mark__b" x="9" y="9" width="30" height="30" transform="rotate(45 24 24)"/><rect class="mark__r" x="61" y="9" width="30" height="30" transform="rotate(45 76 24)"/><rect class="mark__w" x="35" y="35" width="30" height="30" transform="rotate(45 50 50)"/></svg>';
    hero.insertBefore(fx, hero.firstChild);
    const title = hero.querySelector('.page-hero__title');
    if (title) { const rule = document.createElement('span'); rule.className = 'ph-rule'; rule.setAttribute('aria-hidden', 'true'); title.after(rule);
      gsap.from(rule, { scaleX: 0, transformOrigin: 'left', duration: 1.2, ease: 'power3.inOut', delay: startDelay + 0.6 }); }
    const rects = fx.querySelectorAll('.ph-dia rect');
    rects.forEach(r => { const len = r.getTotalLength(); gsap.set(r, { strokeDasharray: len, strokeDashoffset: len }); });
    gsap.to(rects, { strokeDashoffset: 0, duration: 1.8, stagger: 0.25, ease: 'power2.inOut', delay: startDelay + 0.3 });
    gsap.to(rects, { fillOpacity: .16, duration: 1.2, stagger: 0.25, delay: startDelay + 1.6 });
    if (heroStill) return;
    rects.forEach((r, i) => gsap.to(r, { y: i % 2 ? 3 : -3, duration: 3.4 + i * 0.7, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.4 }));
    const dia = fx.querySelector('.ph-dia');
    const dx = gsap.quickTo(dia, 'x', { duration: 1.6, ease: 'power3' }), dy = gsap.quickTo(dia, 'y', { duration: 1.6, ease: 'power3' });
    hero.addEventListener('mousemove', e => { const b = hero.getBoundingClientRect(); dx((e.clientX - b.left - b.width / 2) / b.width * -24); dy((e.clientY - b.top - b.height / 2) / b.height * -16); });
    // снег: немного медленных хлопьев, только пока шапка на экране
    const cv = fx.querySelector('.ph-snow'), ctx = cv.getContext('2d');
    let W = 0, H = 0, flakes = [], on = false, raf = 0;
    const size = () => { const d = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; if (!W || !H) return; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
      flakes = Array.from({ length: Math.round(W * H / 16000) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: .6 + Math.random() * 1.4, v: 6 + Math.random() * 12, s: Math.random() * 6.28, a: .2 + Math.random() * .4 })); };
    let last = 0;
    const tick = now => { const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; ctx.clearRect(0, 0, W, H);
      for (const f of flakes) { f.y += f.v * dt; f.s += dt * .6; const x = f.x + Math.sin(f.s) * 8; if (f.y > H + 4) { f.y = -4; f.x = Math.random() * W; }
        ctx.globalAlpha = f.a; ctx.fillStyle = '#EEF2F4'; ctx.beginPath(); ctx.arc(x, f.y, f.r, 0, 6.283); ctx.fill(); }
      if (on) raf = requestAnimationFrame(tick); };
    if (window.ResizeObserver) new ResizeObserver(size).observe(cv); size();
    new IntersectionObserver(([en]) => { on = en.isIntersecting; cancelAnimationFrame(raf); if (on) { last = 0; raf = requestAnimationFrame(tick); } }).observe(hero);
  });
  if (calm() || !window.gsap) return;
  gsap.registerPlugin(ScrollTrigger, SplitText);

  // ---------- Плавный скролл ----------
  if (window.Lenis) {
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
    window.lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => window.lenis && window.lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      const target = id === '#top' ? 0 : document.querySelector(id);
      if (target === null) return;
      e.preventDefault();
      lenis.scrollTo(target, { duration: 1.4, offset: -80 });
    }));
  }

  // ---------- Заставка (раз за сессию) и появление страницы ----------
  const intro = document.getElementById('intro');
  if (!document.getElementById('preload')) root.classList.remove('pre-on');
  let startDelay = 0;
  const homePre = root.classList.contains('pre-on') && !!document.getElementById('preload');
  if (homePre) { intro?.remove(); startDelay = 3.9; }
  else if (document.getElementById('preload')) { intro?.remove(); root.classList.remove('intro-on'); }
  else if (root.classList.contains('intro-on') && intro) {
    startDelay = 1.1;
    try { sessionStorage.setItem('ygs-intro', '1'); } catch (e) { /* приватный режим */ }
    gsap.timeline({ onComplete: () => { intro.remove(); root.classList.remove('intro-on'); } })
      .from('.intro__mark rect', { scale: 0, rotation: -90, transformOrigin: '50% 50%', stagger: 0.1, duration: 0.6, ease: 'back.out(2)' }, 0.05)
      .from('.intro__word', { y: 16, opacity: 0, duration: 0.5, ease: 'power3.out' }, 0.45)
      .to('.intro__mark, .intro__word', { y: -24, opacity: 0, duration: 0.4, ease: 'power2.in' }, 1.0)
      .to(intro, { yPercent: -100, duration: 0.7, ease: 'power4.inOut' }, 1.05);
  } else if (intro) intro.remove();
  if (!homePre) gsap.from('main, .ftr', { opacity: 0, duration: 0.6, delay: startDelay, ease: 'power2.out', clearProps: 'opacity' });

  // ---------- Переход между страницами: затемнение перед уходом ----------
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download') || a.dataset.lightbox) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || /^(mailto:|tel:|javascript:)/.test(href)) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) return;
    e.preventDefault();
    gsap.to('main, .ftr, .hdr', { opacity: 0, y: -12, duration: 0.3, ease: 'power2.in', onComplete: () => { location.href = a.href; } });
  });
  addEventListener('pageshow', e => { if (e.persisted) gsap.set('main, .ftr, .hdr', { clearProps: 'opacity,transform' }); });

  // ---------- Заголовок страницы: построчно ----------
  document.querySelectorAll('[data-split]').forEach(el => {
    SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
      onSplit: self => gsap.from(self.lines, { yPercent: 110, duration: 1.1, stagger: 0.09, ease: 'power4.out', delay: startDelay + 0.15 })
    });
  });
  gsap.from('.page-hero__lead, .page-hero__meta, .page-hero__actions, .crumbs', { y: 20, opacity: 0, duration: 0.9, stagger: 0.08, delay: startDelay + 0.45, ease: 'power3.out', clearProps: 'all' });
  // фото в шапке страницы раскрывается
  document.querySelectorAll('.page-hero__bg img').forEach(img => {
    gsap.fromTo(img, { clipPath: 'inset(0 0 100% 0)', scale: 1.2 }, { clipPath: 'inset(0 0 0% 0)', scale: 1, duration: 1.6, delay: startDelay, ease: 'power4.inOut', clearProps: 'clipPath' });
  });

  // ---------- Заголовки секций: построчно при появлении ----------
  document.querySelectorAll('.sec-title:not([data-split])').forEach(el => {
    SplitText.create(el, {
      type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
      onSplit: self => gsap.from(self.lines, { yPercent: 110, duration: 1, stagger: 0.08, ease: 'power4.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } })
    });
  });

  // ---------- Появление блоков ----------
  // data-reveal — сам элемент; data-reveal="group" — его дети по очереди; data-reveal="left|right|scale" — вариант.
  // Элементы без атрибута, перечисленные в AUTO, появляются сами — так motion есть на каждой странице.
  const AUTO = '.rows__item, .tile, .kpi > div, .facts > div, .news-card, .doc, .docsec, .person, .logos li, .steps li, .tl, .prose > *, .form, .album__grid li, .vac, .req > div, .specs div, .zv__region, .zv__group, .cargo__list li, .news__list li, .partners__list li, .sitemap > li, .contacts-kpi > div, .work__row, .park, .video, .scheme, .calc, .org';
  document.querySelectorAll(AUTO).forEach(el => { if (!el.closest('[data-reveal]') && !el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', 'auto'); });
  const seen = new Map(); // порядковый номер среди соседей — для каскада
  document.querySelectorAll('[data-reveal]').forEach(el => {
    const kind = el.dataset.reveal;
    const targets = kind === 'group' ? [...el.children] : [el];
    const from = kind === 'left' ? { x: -40, opacity: 0 } : kind === 'right' ? { x: 40, opacity: 0 } : kind === 'scale' ? { scale: 0.94, opacity: 0 } : { y: 36, opacity: 0 };
    let delay = 0;
    if (kind === 'auto') { const p = el.parentElement; const n = seen.get(p) || 0; seen.set(p, n + 1); delay = (n % 10) * 0.07; }
    gsap.from(targets, { ...from, duration: 0.9, stagger: 0.08, delay, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
  // картинки в карточках: наезд при появлении
  document.querySelectorAll('.news-card__img img, .album__grid img, .person__photo img, .logos img').forEach(img => {
    gsap.from(img, { scale: 1.18, duration: 1.4, ease: 'power3.out', scrollTrigger: { trigger: img, start: 'top 92%', once: true } });
  });

  // ---------- Инфографика: значки прорисовываются линиями, под карточками растёт красная полоса ----------
  document.querySelectorAll('.ig, .cmp, .kpi').forEach(box => {
    const lines = [...box.querySelectorAll(':is(.ig__ico, .kpi__ico, .cmp__big, .cmp__list) svg :is(path, circle, rect)')];
    if (!lines.length) return;
    lines.forEach(l => { const len = Math.ceil(l.getTotalLength()); gsap.set(l, { strokeDasharray: len, strokeDashoffset: len }); });
    const bars = box.querySelectorAll('.ig__item');
    gsap.set(bars, { '--ig-bar': 0 });
    ScrollTrigger.create({ trigger: box, start: 'top 85%', once: true, onEnter: () => {
      gsap.to(lines, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut', stagger: { each: 0.025 }, delay: 0.2 });
      gsap.to(bars, { '--ig-bar': 1, duration: 1.2, ease: 'power3.inOut', stagger: 0.12, delay: 0.3 });
      gsap.from(box.querySelectorAll('.cmp__lvl i.on'), { scaleX: 0, transformOrigin: 'left', duration: 0.5, stagger: 0.12, delay: 0.5 });
    } });
  });

  // ---------- Магнитные кнопки ----------
  if (matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.btn').forEach(b => {
      const x = gsap.quickTo(b, 'x', { duration: 0.4, ease: 'power3' }), y = gsap.quickTo(b, 'y', { duration: 0.4, ease: 'power3' });
      b.addEventListener('mousemove', e => { const r = b.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * 0.25); y((e.clientY - r.top - r.height / 2) * 0.35); });
      b.addEventListener('mouseleave', () => { x(0); y(0); });
    });
  }

  // ---------- Подвал: слово поднимается ----------
  const word = document.querySelector('.ftr__word > span');
  if (word) SplitText.create(word, { type: 'chars', charsClass: 'ch', onSplit: self => gsap.from(self.chars, { yPercent: 60, opacity: 0, stagger: 0.03, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: word, start: 'top 95%', once: true } }) });

  // ---------- Счётчики ----------
  document.querySelectorAll('[data-count]').forEach(el => {
    const end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
    const obj = { v: 0 };
    // в разметке — настоящее число (его видно без анимации); перед счётом обнуляем
    el.textContent = '0';
    gsap.to(obj, { v: end, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true }, onUpdate: () => { el.textContent = obj.v.toLocaleString('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec }); } });
  });

  // ---------- Полосы ----------
  document.querySelectorAll('[data-bar]').forEach(el => {
    gsap.from(el, { scaleX: 0, transformOrigin: 'left', duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });

  // ---------- Параллакс картинок ----------
  document.querySelectorAll('[data-parallax]').forEach(el => {
    gsap.fromTo(el, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // ---------- Лайтбокс ----------
  const lb = document.createElement('div');
  lb.className = 'lightbox'; lb.hidden = true;
  lb.innerHTML = '<button class="lightbox__close" aria-label="Закрыть"></button><img alt=""><button class="lightbox__prev" aria-label="Предыдущее"></button><button class="lightbox__next" aria-label="Следующее"></button>';
  document.body.appendChild(lb);
  let group = [], idx = 0;
  const show = i => { idx = (i + group.length) % group.length; lb.querySelector('img').src = group[idx].href; };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-lightbox]'); if (!a) return;
    e.preventDefault();
    group = [...document.querySelectorAll(`a[data-lightbox="${a.dataset.lightbox}"]`)];
    lb.hidden = false; show(group.indexOf(a));
    gsap.fromTo(lb, { opacity: 0 }, { opacity: 1, duration: 0.3 });
  });
  lb.addEventListener('click', e => {
    if (e.target.closest('.lightbox__prev')) return show(idx - 1);
    if (e.target.closest('.lightbox__next')) return show(idx + 1);
    if (e.target.tagName !== 'IMG') lb.hidden = true;
  });
  document.addEventListener('keydown', e => { if (lb.hidden) return; if (e.key === 'Escape') lb.hidden = true; if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1); });
})();
