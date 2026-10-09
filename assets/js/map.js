/* Схема маршрутов централизованного завоза по Оби.
   Координаты — реальные долгота/широта (приблизительно), проекция упрощённая. */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const P = ([lon, lat]) => [(lon - 62) * 40, (72.6 - lat) * 100];

  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  // Catmull-Rom → кубические Безье
  function smooth(pts, closed = false) {
    const p = pts.map(P);
    if (p.length < 3) return 'M' + p.map(q => q.join(' ')).join(' L');
    const get = i => closed ? p[(i + p.length) % p.length] : p[Math.max(0, Math.min(p.length - 1, i))];
    let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
    const n = closed ? p.length : p.length - 1;
    for (let i = 0; i < n; i++) {
      const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return closed ? d + 'Z' : d;
  }

  // Залив/губа: осевая линия + ширина (px) → замкнутый контур
  function bay(center, widths) {
    const p = center.map(P);
    const left = [], right = [];
    p.forEach((q, i) => {
      const a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0];
      const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
      const w = widths[i] / 2;
      left.push([q[0] + nx * w, q[1] + ny * w]);
      right.push([q[0] - nx * w, q[1] - ny * w]);
    });
    const unP = ([x, y]) => [x / 40 + 62, 72.6 - y / 100];
    return smooth(left.concat(right.reverse()).map(unP), true);
  }

  // ---------- География ----------
  const SEAS = [
    // Карское море, Байдарацкая губа
    [[61, 73.2], [61, 70.0], [63.5, 69.4], [65.5, 68.95], [67.0, 68.85], [68.2, 69.2], [68.4, 69.9], [68.0, 70.6], [68.5, 71.4], [69.3, 72.2], [69.6, 73.2]],
    // Карское море к востоку от Обской губы и Енисейский залив
    [[73.6, 73.2], [74.2, 72.5], [74.9, 72.2], [75.4, 71.95], [76.5, 72.05], [78.0, 72.3], [79.0, 72.0], [80.2, 71.9], [81.0, 71.6], [82.0, 70.8], [82.6, 70.1], [83.2, 70.5], [83.0, 71.4], [84.5, 72.0], [87, 72.2], [87, 73.2]]
  ];
  const BAYS = [
    { // Обская губа
      c: [[71.4, 66.78], [72.4, 67.1], [73.6, 67.6], [74.3, 68.1], [74.3, 68.8], [74.0, 69.5], [73.6, 70.2], [73.3, 70.9], [73.2, 71.5], [73.6, 72.1], [74.0, 72.9]],
      w: [28, 48, 64, 80, 80, 76, 72, 68, 76, 96, 120]
    },
    { // Тазовская губа
      c: [[74.6, 69.0], [76.0, 68.9], [77.0, 68.6], [77.8, 68.0], [78.4, 67.6], [78.75, 67.45]],
      w: [56, 60, 50, 40, 22, 8]
    },
    { // Гыданская губа
      c: [[75.0, 72.1], [75.6, 71.7], [76.4, 71.25], [77.4, 71.0], [78.5, 70.88]],
      w: [60, 52, 42, 28, 8]
    }
  ];
  const RIVERS = [
    [[65.4, 62.6], [65.0, 63.9], [64.9, 64.6], [64.75, 65.38], [65.4, 65.9], [66.1, 66.35], [66.6, 66.53], [67.3, 66.6], [67.8, 66.56], [68.6, 66.75], [69.5, 66.75], [70.3, 66.82], [70.83, 66.86], [71.6, 66.8]], // Обь
    [[78.75, 67.45], [79.5, 67.0], [80.5, 66.4], [81.6, 66.0], [82.47, 65.7], [82.3, 64.9], [82.0, 64.03], [81.6, 62.6]], // Таз
    [[78.1, 67.6], [78.2, 67.0], [77.95, 66.3], [77.65, 65.6], [77.9, 64.6], [78.35, 63.6], [78.6, 62.6]], // Пур
    [[72.7, 66.62], [72.6, 66.0], [72.5, 65.5], [72.6, 64.8], [72.3, 62.6]] // Надым
  ];

  // ---------- Маршрут: участки с окнами прогресса (0..1) ----------
  const LEGS = [
    { id: 'ob', w: [0.00, 0.30], pts: [[65.4, 62.6], [65.0, 63.9], [64.9, 64.6], [64.75, 65.38], [65.4, 65.9], [66.1, 66.35], [66.6, 66.53]] },
    { id: 'lab', w: [0.30, 0.38], pts: [[66.6, 66.53], [66.5, 66.6], [66.4, 66.66]] },
    { id: 'poluy', w: [0.38, 0.46], pts: [[66.6, 66.53], [67.0, 66.42], [67.34, 66.32]] },
    { id: 'gulf', w: [0.40, 0.68], pts: [[66.6, 66.53], [67.3, 66.6], [67.8, 66.56], [68.6, 66.72], [69.16, 66.76], [70.08, 66.74], [70.84, 66.86], [71.6, 66.82], [72.4, 67.12], [72.9, 67.69], [73.4, 68.05], [73.57, 68.51], [73.5, 69.2], [73.0, 69.8], [72.51, 70.16]] },
    { id: 'shch', w: [0.46, 0.56], pts: [[67.8, 66.56], [68.14, 66.87], [68.67, 67.26]] },
    { id: 'kut', w: [0.52, 0.58], pts: [[70.08, 66.74], [70.38, 66.32]] },
    { id: 'nyda', w: [0.55, 0.64], pts: [[71.6, 66.82], [72.3, 66.72], [72.93, 66.63], [72.7, 66.4], [72.41, 66.15]] },
    { id: 'taz', w: [0.62, 0.90], pts: [[73.6, 68.7], [74.6, 68.95], [75.8, 69.05], [76.87, 69.1], [77.3, 68.5], [77.55, 67.72], [78.1, 67.45], [78.75, 67.45], [79.5, 67.0], [80.5, 66.4], [81.6, 66.0], [82.47, 65.7], [82.3, 64.9], [82.05, 64.0]] },
    { id: 'pur', w: [0.78, 0.96], pts: [[78.1, 67.45], [78.22, 67.0], [77.95, 66.3], [77.65, 65.6], [77.9, 64.6], [78.33, 63.38]] },
    { id: 'gyda', w: [0.80, 0.98], pts: [[73.1, 70.7], [73.45, 71.5], [74.0, 72.05], [74.85, 72.15], [75.5, 71.8], [76.4, 71.25], [77.4, 71.0], [78.49, 70.89]] }
  ];

  // Пункты централизованного завоза 2026. Координаты — из информационной карты yamalgs.ru.
  // [название, долгота, широта, участок маршрута, сторона подписи, узел?, второстепенный? (подпись скрыта на телефоне)]
  const TOWNS = [
    // сторона 'x' — точка без подписи (скопление у Салехарда и в Шурышкарском районе)
    ['Азовы', 64.9, 64.9, 'ob', 'b', false, true],
    ['Горки', 65.27, 65.06, 'ob', 'r', false, true],
    ['Лопхари', 65.76, 64.98, 'ob', 'x', false, true],
    ['Мужи', 64.71, 65.4, 'ob', 'x'],
    ['Восяхово', 64.6, 65.58, 'ob', 'x', false, true],
    ['Овгорт', 63.97, 64.83, 'ob', 'r', false, true],
    ['Ямгорт', 64.37, 64.94, 'ob', 'x', false, true],
    ['Шурышкары', 65.35, 65.91, 'ob', 'r', false, true],
    ['Питляр', 65.91, 65.84, 'ob', 'r', false, true],
    // Приуральский район и города
    ['Катравож', 66.08, 66.33, 'ob', 'l', false, true],
    ['Салехард', 66.6, 66.53, 'ob', 'bl', true],
    ['Лабытнанги', 66.4, 66.66, 'lab', 'tl', true],
    ['Зелёный Яр', 67.34, 66.32, 'poluy', 'x', false, true],
    ['Горнокнязевск', 66.85, 66.59, 'gulf', 'x', false, true],
    ['Харсаим', 67.29, 66.6, 'gulf', 'x', false, true],
    ['Аксарка', 67.8, 66.56, 'gulf', 'b'],
    ['Белоярск', 68.14, 66.87, 'shch', 'x', false, true],
    ['Щучье', 68.67, 67.26, 'shch', 'l', false, true],
    // Ямальский район
    ['Салемал', 69.16, 66.76, 'gulf', 'b', false, true],
    ['Панаевск', 70.08, 66.74, 'gulf', 'b', false, true],
    ['Яр-Сале', 70.84, 66.86, 'gulf', 't'],
    ['Сюнай-Сале', 71.27, 66.9, 'gulf', 'x', false, true],
    ['Новый Порт', 72.9, 67.69, 'gulf', 'l'],
    ['Мыс Каменный', 73.57, 68.51, 'gulf', 'l'],
    ['Сеяха', 72.51, 70.16, 'gulf', 'l'],
    // Надымский район
    ['Кутопьюган', 70.38, 66.32, 'kut', 'b', false, true],
    ['Ныда', 72.93, 66.63, 'nyda', 'r'],
    ['Нори', 72.41, 66.15, 'nyda', 'b', false, true],
    // Тазовский район
    ['Антипаюта', 76.87, 69.1, 'taz', 't'],
    ['Находка', 77.55, 67.72, 'taz', 'r'],
    ['Тазовский', 78.75, 67.45, 'taz', 'x', false, true],
    ['Гыда', 78.49, 70.89, 'gyda', 'r'],
    // Пуровский район
    ['Самбург', 78.22, 67.0, 'pur', 'l'],
    ['Халясавэй', 78.33, 63.38, 'pur', 'r'],
    // Красноселькупский район
    ['Красноселькуп', 82.47, 65.71, 'taz', 'l'],
    ['Толька', 82.05, 64.0, 'taz', 'r']
  ];

  function build(svg, opts = {}) {
    const townList = opts.towns || TOWNS;
    // сетка
    const grid = el('g', { class: 'm-grid' }, svg);
    for (let lon = 64; lon <= 84; lon += 4) {
      const [x] = P([lon, 0]);
      el('line', { x1: x, y1: 0, x2: x, y2: 940 }, grid);
    }
    for (let lat = 64; lat <= 72; lat += 2) {
      const [, y] = P([0, lat]);
      el('line', { x1: 0, y1: y, x2: 960, y2: y }, grid);
      el('text', { x: 86, y: y - 6 }, grid).textContent = lat + '° с. ш.';
    }

    const water = el('g', { class: 'm-water' }, svg);
    SEAS.forEach(s => el('path', { class: 'm-sea', d: smooth(s, true) }, water));
    BAYS.forEach(b => el('path', { class: 'm-sea', d: bay(b.c, b.w) }, water));
    const rivers = RIVERS.map(r => el('path', { class: 'm-river', d: smooth(r) }, water));

    const WLABELS = [['Карское море', 64.2, 70.6], ['Обская губа', 73.9, 70.5, -78], ['Тазовская губа', 76.1, 68.72, -8], ['р. Обь', 65.25, 64.6, -80], ['р. Таз', 81.0, 66.55, 0], ['р. Пур', 77.95, 65.0, -82], ['р. Надым', 72.75, 65.2, -86]];
    WLABELS.forEach(([t, lon, lat, rot = 0]) => {
      const [x, y] = P([lon, lat]);
      const n = el('text', { class: 'm-wlabel', x, y, 'text-anchor': 'middle', transform: rot ? `rotate(${rot} ${x} ${y})` : '' }, water);
      n.textContent = t;
    });

    // Северный полярный круг 66°33′
    const [, yc] = P([0, 66.56]);
    const circle = el('line', { class: 'm-circle', x1: 0, y1: yc, x2: 960, y2: yc }, svg);
    const circleT = el('text', { class: 'm-circle-t', x: 954, y: yc - 8, 'text-anchor': 'end' }, svg);
    circleT.textContent = 'Северный полярный круг';

    // откуда идут грузы: топливо по воде с юга (Омск, Сургут), уголь и дрова по железной дороге с запада в Лабытнанги
    const origin = el('g', { class: 'm-origin' }, svg);
    const [ox, oy] = P([65.0, 64.12]);
    el('path', { class: 'm-origin__arrow', d: `M${ox - 8} ${oy + 22} l8 -12 l8 12` }, origin);
    const ot = el('text', { x: ox + 18, y: oy + 4 }, origin);
    el('tspan', { class: 'm-origin__t' }, ot).textContent = 'Топливо по воде';
    el('tspan', { x: ox + 18, dy: '1.3em' }, ot).textContent = 'из Омска и Сургута';
    const rail = el('path', { class: 'm-rail', d: smooth([[60.5, 66.98], [63.5, 67.02], [64.6, 67.02], [65.3, 66.92], [65.8, 66.8], [66.4, 66.66]]) }, origin);
    const [rx, ry] = P([64.05, 67.06]);
    const rt = el('text', { x: rx, y: ry - 30 }, origin);
    el('tspan', { class: 'm-origin__t' }, rt).textContent = 'Уголь, дрова по ж/д';
    el('tspan', { x: rx, dy: '1.3em' }, rt).textContent = 'в Лабытнанги';

    const routeG = el('g', {}, svg);
    const legs = LEGS.map(l => {
      const path = el('path', { class: 'm-route', d: smooth(l.pts) }, routeG);
      const len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      return { ...l, path, len };
    });

    const glow = el('circle', { class: 'm-head-glow', r: 14, cx: -50, cy: -50 }, svg);
    const head = el('circle', { class: 'm-head', r: 5, cx: -50, cy: -50 }, svg);

    const townsG = el('g', {}, svg);
    const towns = townList.map(([name, lon, lat, legId, side, hub, minor]) => {
      const [x, y] = P([lon, lat]);
      const g = el('g', { class: 'm-town' + (hub ? ' is-hub' : '') + (minor ? ' is-minor' : ''), 'data-name': name }, townsG);
      el('circle', { cx: x, cy: y, r: hub ? 6 : minor ? 3.5 : 4.5 }, g);
      el('title', {}, g).textContent = name;
      const off = hub ? 12 : minor ? 8 : 10;
      const spots = {
        r: [x + off, y + 4, 'start'], l: [x - off, y + 4, 'end'],
        t: [x, y - off - 2, 'middle'], b: [x, y + off + 12, 'middle'],
        tl: [x - off, y - off + 2, 'end'], bl: [x - off, y + off + 8, 'end'],
        tr: [x + off, y - off + 2, 'start'], br: [x + off, y + off + 8, 'start']
      };
      let label = null;
      if (side !== 'x') { label = el('text', {}, g); label.textContent = name; }
      // момент появления — когда маршрут проходит ближайшую к пункту точку
      const leg = legs.find(l => l.id === legId);
      let at = 0;
      if (leg) {
        let best = 0, bestD = Infinity;
        for (let s = 0; s <= 200; s++) {
          const pt = leg.path.getPointAtLength(leg.len * s / 200);
          const d = Math.hypot(pt.x - x, pt.y - y);
          if (d < bestD) { bestD = d; best = s / 200; }
        }
        at = leg.w[0] + (leg.w[1] - leg.w[0]) * best;
      }
      g.style.opacity = 0;
      return { g, at, shown: false, name, x, y, hub, minor, side, spots, label };
    });

    // подписи без наложений: узлы первыми, затем основные пункты, затем мелкие;
    // каждая пробует свою сторону, потом остальные; мелкой без места — только всплывающая подсказка
    const pad = 3, hit = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    const rank = t => t.hub ? 0 : t.minor ? 2 : 1;
    const placeLabels = () => {
      const taken = towns.map(t => { const r = t.hub ? 6 : 4; return { x: t.x - r, y: t.y - r, width: r * 2, height: r * 2 }; });
      [ot, rt].forEach(n => taken.push(n.getBBox()));
      const vb = svg.viewBox.baseVal, inView = r => !vb || !vb.width || (r.x >= vb.x && r.x + r.width <= vb.x + vb.width && r.y >= vb.y && r.y + r.height <= vb.y + vb.height);
      towns.filter(t => t.label).sort((a, b) => rank(a) - rank(b)).forEach(t => {
        const order = [t.side, 'r', 'l', 't', 'b', 'tr', 'br', 'tl', 'bl'].filter((s, i, a) => t.spots[s] && a.indexOf(s) === i);
        const put = s => { const [lx, ly, anchor] = t.spots[s]; t.label.setAttribute('x', lx); t.label.setAttribute('y', ly); t.label.setAttribute('text-anchor', anchor); };
        t.label.style.display = '';
        let box = null;
        for (const s of order) {
          put(s);
          const b = t.label.getBBox(), r = { x: b.x - pad, y: b.y - pad, width: b.width + pad * 2, height: b.height + pad * 2 };
          if (!b.width || (inView(r) && !taken.some(q => hit(q, r)))) { box = r; break; }
        }
        if (box) taken.push(box);
        else if (t.minor) t.label.style.display = 'none';
        else { put(t.side); taken.push(t.label.getBBox()); }
      });
    };
    placeLabels();
    // ширина подписей зависит от шрифта — после его загрузки раскладываем заново
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeLabels);

    return { legs, towns, rivers, water, grid, circle, circleT, origin, rail, head, glow, placeLabels, project: P };
  }

  window.YMap = {
    init(svg, onCount, opts) {
      const m = build(svg, opts);
      let lastCount = -1;

      m.setProgress = (t) => {
        let headLeg = null, headPos = 0;
        m.legs.forEach(l => {
          const k = Math.max(0, Math.min(1, (t - l.w[0]) / (l.w[1] - l.w[0])));
          l.path.style.strokeDashoffset = l.len * (1 - k);
          if (k > 0 && k < 1) { headLeg = l; headPos = k; }
        });
        if (headLeg) {
          const pt = headLeg.path.getPointAtLength(headLeg.len * headPos);
          m.head.setAttribute('cx', pt.x); m.head.setAttribute('cy', pt.y);
          m.glow.setAttribute('cx', pt.x); m.glow.setAttribute('cy', pt.y);
          m.head.style.opacity = m.glow.style.opacity = '';
        } else {
          m.head.style.opacity = m.glow.style.opacity = 0;
        }
        let count = 0;
        m.towns.forEach(tw => {
          const show = t >= tw.at - 0.001;
          if (show) count++;
          if (show !== tw.shown) {
            tw.shown = show;
            if (window.gsap) gsap.to(tw.g, { opacity: show ? 1 : 0, duration: .35, overwrite: true });
            else tw.g.style.opacity = show ? 1 : 0;
          }
        });
        if (count !== lastCount) { lastCount = count; onCount && onCount(count); }
      };
      m.setProgress(0);
      return m;
    }
  };
})();
