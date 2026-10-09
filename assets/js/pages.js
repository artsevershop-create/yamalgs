/* Поведение отдельных страниц: прогресс чтения, поиск по документам, таймлайн, оргструктура, схема базы, реквизиты */
(function () {
  const calm = () => window.ygsCalm ? window.ygsCalm() : false;

  // ---------- Статья: прогресс чтения ----------
  const prog = document.getElementById('readProgress');
  if (prog) {
    const upd = () => { const h = document.documentElement.scrollHeight - innerHeight; prog.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`; };
    addEventListener('scroll', upd, { passive: true }); upd();
  }

  // ---------- Документы: поиск ----------
  const ds = document.getElementById('docSearch');
  if (ds) {
    const items = [...document.querySelectorAll('.doc')];
    const sections = [...document.querySelectorAll('.doclist')];
    ds.addEventListener('input', () => {
      const q = ds.value.trim().toLowerCase();
      items.forEach(i => { i.hidden = q && !i.querySelector('.doc__t').textContent.toLowerCase().includes(q); });
      sections.forEach(s => { s.hidden = q && ![...s.querySelectorAll('.doc')].some(i => !i.hidden); });
    });
  }

  // ---------- Реквизиты: копирование ----------
  const copy = document.getElementById('copyReq');
  if (copy) copy.addEventListener('click', async () => {
    const text = [...document.querySelectorAll('#req div')].map(d => `${d.querySelector('dt').textContent}: ${d.querySelector('dd').textContent}`).join('\n');
    try { await navigator.clipboard.writeText(text); copy.textContent = 'Скопировано'; } catch (e) { copy.textContent = 'Не удалось скопировать'; }
    setTimeout(() => { copy.textContent = 'Скопировать реквизиты'; }, 2000);
  });

  // ---------- Схема базы: подсказки ----------
  const scheme = document.getElementById('scheme');
  if (scheme) {
    const tip = document.getElementById('schemeTip');
    // список объектов под схемой — на телефоне точки мелкие, описания читаются списком
    const legend = document.createElement('ol'); legend.className = 'scheme__legend';
    legend.innerHTML = [...scheme.querySelectorAll('.scheme__pt')].map(b => `<li><b>${b.textContent}</b><span>${b.dataset.tip}</span></li>`).join('');
    scheme.after(legend);
    let active = null;
    scheme.addEventListener('click', e => {
      const b = e.target.closest('.scheme__pt');
      if (!b) { if (!e.target.closest('.scheme__tip')) { tip.hidden = true; active?.classList.remove('is-active'); active = null; } return; }
      if (active === b) { tip.hidden = true; b.classList.remove('is-active'); active = null; return; }
      active?.classList.remove('is-active'); active = b; b.classList.add('is-active');
      tip.textContent = b.dataset.tip; tip.hidden = false;
      const r = scheme.getBoundingClientRect(), br = b.getBoundingClientRect();
      const x = br.left - r.left + br.width / 2, y = br.top - r.top;
      const left = Math.min(Math.max(12, x - 160), r.width - tip.offsetWidth - 12);
      tip.style.left = left + 'px';
      tip.style.top = (y + br.height + 12 + tip.offsetHeight < r.height ? y + br.height + 12 : y - tip.offsetHeight - 12) + 'px';
      if (window.gsap && !calm()) gsap.fromTo(tip, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: .3 });
    });
  }

  if (calm() || !window.gsap) return;

  // ---------- История: линия таймлайна рисуется по мере прокрутки ----------
  const tl = document.getElementById('timeline');
  if (tl) {
    gsap.to(tl.querySelector('.timeline__line'), { scaleY: 1, ease: 'none', scrollTrigger: { trigger: tl, start: 'top 70%', end: 'bottom 70%', scrub: true } });
    gsap.utils.toArray('.tl__year').forEach(y => gsap.from(y, { x: -20, opacity: 0, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: y, start: 'top 80%', once: true } }));
  }

  // ---------- Оргструктура: линии ----------
  const org = document.getElementById('org');
  if (org) {
    const svg = org.querySelector('.org__lines');
    // геометрия по offset*, чтобы не зависеть от transform анимаций появления
    const box = el => { let x = 0, y = 0, n = el; while (n && n !== org) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return { left: x, top: y, width: el.offsetWidth, height: el.offsetHeight, bottom: y + el.offsetHeight }; };
    const draw = () => {
      const r = { width: org.offsetWidth, height: org.offsetHeight };
      // общество → генеральный директор и дочернее общество; директор → три направления
      const fork = (from, to) => {
        const x = from.left + from.width / 2, y = from.bottom, mid = y + (to[0].top - y) / 2;
        return to.map(c => `M${x} ${y} V${mid} H${c.left + c.width / 2} V${c.top} `).join('');
      };
      const top = box(org.querySelector('.org__node--top'));
      const dir = box(org.querySelector('.org__node--dir'));
      const child = box(org.querySelector('.org__node--child'));
      const cols = [...org.querySelectorAll('.org__row--units .org__col > .org__node:first-child')].map(box);
      const d = fork(top, [dir, child]) + fork(dir, cols);
      svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
      svg.innerHTML = `<path d="${d}"/>`;
      const p = svg.querySelector('path'); const len = p.getTotalLength();
      gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut', scrollTrigger: { trigger: org, start: 'top 75%', once: true } });
    };
    if (matchMedia('(min-width: 901px)').matches) { draw(); addEventListener('resize', () => { ScrollTrigger.getAll().forEach(s => { if (s.trigger === org) s.kill(); }); draw(); }); }
  }

  // ---------- Услуги базы: карточки выезжают по очереди, значки прорисовываются ----------
  if (document.querySelector('.svc') && window.gsap && !calm()) {
    gsap.utils.toArray('.svc__item').forEach(card => {
      const lines = card.querySelectorAll('.svc__ico svg :is(path, circle, rect)');
      lines.forEach(l => { const len = Math.ceil(l.getTotalLength()); gsap.set(l, { strokeDasharray: len, strokeDashoffset: len }); });
      gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 88%', once: true } })
        .from(card, { x: 60, opacity: 0, duration: .9, ease: 'power3.out' })
        .from(card.querySelector('.svc__ico'), { scale: .4, opacity: 0, duration: .6, ease: 'back.out(2)' }, .15)
        .to(lines, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut', stagger: .08 }, .3);
    });
  }
})();
