/* Карта завоза: список районов → посёлки → карточка план/факт. Данные — assets/data/zavoz-2026.json */
(function () {
  const root = document.documentElement;
  const fmt = n => Math.round(n).toLocaleString('ru-RU');
  const pct = (fact, plan) => plan > 0 ? Math.min(100, Math.round(fact / plan * 100)) : 0;
  const status = p => p >= 98 ? 'done' : p > 0 ? 'part' : 'none';
  const calm = () => root.classList.contains('a11y') || matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Сторона подписи для плотных мест; остальные — справа
  const SIDES = {
    'Салехард': 'bl', 'Лабытнанги': 'tl', 'Катравож': 'l', 'Зелёный Яр': 'b', 'Харсаим': 't', 'Аксарка': 'b', 'Белоярск': 'r', 'Щучье': 'l',
    'Мужи': 'l', 'Овгорт': 'l', 'Ямгорт': 'l', 'Восяхово': 'l', 'Шурышкары': 'r', 'Питляр': 'r', 'Лопхари': 'r', 'Горки': 'r', 'Азовы': 'l',
    'Салемал': 'b', 'Панаевск': 't', 'Яр-Сале': 'b', 'Сюнай-Сале': 't', 'Кутопьюган': 'b', 'Нори': 'b', 'Ныда': 'r',
    'Новый Порт': 'l', 'Мыс Каменный': 'l', 'Сеяха': 'l', 'Антипаюта': 't', 'Находка': 'r', 'Самбург': 'l', 'Халясавэй': 'r',
    'Красноселькуп': 'l', 'Толька': 'r', 'Гыда': 'r'
  };
  const HUBS = ['Салехард'];

  fetch((window.ROOT || '/') + 'data/zavoz-2026.json').then(r => r.json()).then(init).catch(() => {
    document.getElementById('zvList').innerHTML = '<p class="zv__empty">Не удалось загрузить данные завоза. Обновите страницу.</p>';
  });

  function init(data) {
    const points = [];
    data.regions.forEach(r => r.points.forEach(p => {
      p.region = r.name;
      p.plan = p.cargo.reduce((a, c) => a + c[1], 0);
      p.fact = p.cargo.reduce((a, c) => a + c[2], 0);
      p.pct = pct(p.fact, p.plan);
      p.status = p.cargo.length ? status(p.pct) : 'none';
      points.push(p);
    }));

    // ---------- Карта ----------
    const svg = document.getElementById('map');
    const towns = points.map(p => [p.name, p.lon, p.lat, null, SIDES[p.name] || 'r', HUBS.includes(p.name), false]);
    const map = window.YMap.init(svg, null, { towns });
    map.setProgress(1);
    const byName = {};
    map.towns.forEach(t => { byName[t.name] = t; if (window.gsap) gsap.killTweensOf(t.g); t.g.style.opacity = 1; });
    points.forEach(p => { p.town = byName[p.name]; p.town.g.classList.add('st-' + p.status); });

    // ---------- Итог ----------
    const totalPlan = points.reduce((a, p) => a + p.plan, 0);
    const totalFact = points.reduce((a, p) => a + p.fact, 0);
    document.getElementById('zvSeason').textContent = data.season.replace(/\D/g, '');
    document.getElementById('zvTotal').innerHTML = `Доставлено в посёлки <b>${fmt(totalFact)}</b> из ${fmt(totalPlan)} тонн — ${pct(totalFact, totalPlan)} %`;
    const upd = new Date(data.updated);
    document.getElementById('zvUpdated').textContent = 'Обновлено ' + upd.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).replace(/\.$/, '') + '. Тонны, по данным оперативного графика завоза.';

    // ---------- Список ----------
    const list = document.getElementById('zvList');
    data.regions.forEach((r, i) => {
      const plan = r.points.reduce((a, p) => a + p.plan, 0), fact = r.points.reduce((a, p) => a + p.fact, 0);
      const reg = document.createElement('div');
      reg.className = 'zv__region';
      reg.innerHTML = `<button class="zv__region-btn" type="button" aria-expanded="false" aria-controls="reg-${i}">
          <span>${r.name}</span><span class="zv__region-pct">${pct(fact, plan)} %</span></button>
        <div class="zv__points" id="reg-${i}" hidden></div>`;
      const box = reg.querySelector('.zv__points');
      r.points.forEach(p => {
        const b = document.createElement('button');
        b.className = 'zv__point'; b.type = 'button';
        b.innerHTML = `<i class="is-${p.status}"></i><span>${p.name}</span><small>${p.cargo.length ? p.pct + ' %' : '—'}</small>`;
        b.addEventListener('click', () => select(p, true));
        p.btn = b; p.regionEl = reg;
        box.appendChild(b);
      });
      reg.querySelector('.zv__region-btn').addEventListener('click', e => toggleRegion(reg, e.currentTarget.getAttribute('aria-expanded') !== 'true'));
      list.appendChild(reg);
    });
    function toggleRegion(reg, open) {
      reg.querySelector('.zv__region-btn').setAttribute('aria-expanded', open);
      reg.querySelector('.zv__points').hidden = !open;
    }

    // ---------- Поиск ----------
    const search = document.getElementById('zvSearch');
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      let any = false;
      data.regions.forEach(r => {
        let hit = 0;
        r.points.forEach(p => { const ok = !q || p.name.toLowerCase().includes(q); p.btn.classList.toggle('is-filtered-out', !ok); if (ok) hit++; p.town.g.classList.toggle('is-dim', q && !ok); });
        const reg = r.points[0].regionEl;
        reg.classList.toggle('is-filtered-out', !hit);
        if (q && hit) toggleRegion(reg, true);
        if (hit) any = true;
      });
      list.querySelector('.zv__empty')?.remove();
      if (!any) list.insertAdjacentHTML('beforeend', '<p class="zv__empty">Ничего не найдено</p>');
    });

    // ---------- Карточка ----------
    const stage = document.getElementById('zvStage');
    const card = document.getElementById('zvCard');
    const tbody = card.querySelector('tbody');
    let active = null;

    function select(p, scrollMap) {
      if (active) { active.btn.classList.remove('is-active'); active.town.g.classList.remove('is-active'); }
      active = p;
      p.btn.classList.add('is-active'); p.town.g.classList.add('is-active');
      toggleRegion(p.regionEl, true);
      p.btn.scrollIntoView({ block: 'nearest', behavior: calm() ? 'auto' : 'smooth' });

      document.getElementById('cardRegion').textContent = p.region;
      document.getElementById('cardName').textContent = p.name;
      document.getElementById('cardBar').style.setProperty('--p', p.pct + '%');
      document.getElementById('cardSum').innerHTML = p.cargo.length ? `<b>${fmt(p.fact)}</b> из ${fmt(p.plan)} т — ${p.pct} %` : '';
      tbody.innerHTML = p.cargo.map(([t, plan, fact]) => `<tr><td>${t}</td><td>${fmt(plan)}</td><td>${fmt(fact)}</td><td>${pct(fact, plan)}</td></tr>`).join('');
      card.querySelector('table').hidden = !p.cargo.length;
      document.getElementById('cardEmpty').hidden = !!p.cargo.length;

      card.hidden = false;
      place(p);
      if (window.gsap && !calm()) gsap.fromTo(card, { opacity: 0, scale: .92 }, { opacity: 1, scale: 1, duration: .35, ease: 'power3.out' });
      if (scrollMap && matchMedia('(max-width: 1000px)').matches) stage.scrollIntoView({ block: 'start', behavior: calm() ? 'auto' : 'smooth' });
    }

    // позиция карточки рядом с точкой, внутри сцены
    function place(p) {
      if (matchMedia('(max-width: 1000px)').matches) return;
      const pt = svg.createSVGPoint(); pt.x = p.town.x; pt.y = p.town.y;
      const s = pt.matrixTransform(svg.getScreenCTM());
      const st = stage.getBoundingClientRect();
      const x = s.x - st.left, y = s.y - st.top;
      const cw = card.offsetWidth, ch = card.offsetHeight, gap = 18;
      const right = x + gap + cw < st.width - 12;
      const left = right ? x + gap : x - gap - cw;
      let top = Math.max(12, Math.min(y - 28, st.height - ch - 12));
      card.style.left = left + 'px'; card.style.top = top + 'px';
      card.style.setProperty('--tx', right ? '-6px' : (cw - 6) + 'px');
      card.style.setProperty('--ty', Math.max(10, Math.min(y - top - 6, ch - 22)) + 'px');
      card.style.setProperty('--ox', right ? '0' : '100%');
      card.style.setProperty('--oy', (y - top) + 'px');
    }
    addEventListener('resize', () => { if (active && !card.hidden) place(active); });

    card.querySelector('.zv__close').addEventListener('click', () => {
      card.hidden = true;
      if (active) { active.btn.classList.remove('is-active'); active.town.g.classList.remove('is-active'); active = null; }
    });
    svg.addEventListener('click', e => {
      const g = e.target.closest('.m-town');
      if (!g) return;
      const p = points.find(q => q.name === g.dataset.name);
      if (p) select(p, false);
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !card.hidden) card.querySelector('.zv__close').click(); });

    // ---------- Сводные таблицы ----------
    const sum = document.getElementById('zvSummary');
    data.summary.forEach(g => {
      const plan = g.rows.reduce((a, r) => a + r[1], 0), fact = g.rows.reduce((a, r) => a + r[2], 0);
      const el = document.createElement('section');
      el.className = 'zv__group';
      el.innerHTML = `<h3>${g.title}</h3><p class="zv__group-sum"><b>${fmt(fact)}</b> из ${fmt(plan)} т — ${pct(fact, plan)} %</p>
        <div class="zv__rows">${g.rows.map(([t, pl, f]) => {
          const p = pct(f, pl);
          return `<div class="zv__row"><span>${t}</span><span class="bar"><i class="${p >= 98 ? 'full' : ''}" style="--p:${p}%"></i></span><span class="num">${fmt(f)} / ${fmt(pl)}</span><span class="pct">${p} %</span></div>`;
        }).join('')}</div>`;
      sum.appendChild(el);
    });

    // ---------- Появление ----------
    if (window.gsap && !calm()) {
      gsap.from(map.water.querySelectorAll('.m-sea'), { opacity: 0, duration: 1.2, stagger: .08 });
      gsap.fromTo(map.towns.map(t => t.g), { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, transformOrigin: '50% 50%', duration: .5, stagger: { each: .02, from: 'random' }, delay: .3, ease: 'back.out(2)' });
      gsap.from('.zv__row .bar i', { scaleX: 0, transformOrigin: 'left', duration: 1.2, stagger: .04, ease: 'power3.out', scrollTrigger: undefined, delay: .4 });
    }
  }
})();
