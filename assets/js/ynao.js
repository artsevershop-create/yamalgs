/* Общий модуль карты ЯНАО для заставки и фона первого экрана.
   Данные — data/ynao-geo.json (Natural Earth, подготовлены scrape/geo.js). Координаты уже спроецированы:
   x = (lon − 74)·cos67°·11.1, y = (67 − lat)·11.1. */
(function () {
  const C0 = Math.cos(67 * Math.PI / 180);
  const proj = ([lon, lat]) => [(lon - 74) * C0 * 11.1, (67 - lat) * 11.1];

  let cache = null;
  function load() {
    if (cache) return cache;
    const root = window.ROOT || '/';
    cache = fetch(root + 'data/ynao-geo.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    return cache;
  }

  // вписать рамку данных [x0,y0,x1,y1] в прямоугольник экрана
  function fit(bbox, rect, pad = 0) {
    const [x0, y0, x1, y1] = bbox, w = x1 - x0, h = y1 - y0;
    const s = Math.min((rect.w - pad * 2) / w, (rect.h - pad * 2) / h);
    const ox = rect.x + (rect.w - w * s) / 2 - x0 * s, oy = rect.y + (rect.h - h * s) / 2 - y0 * s;
    const T = ([x, y]) => [ox + x * s, oy + y * s];
    T.s = s; T.ox = ox; T.oy = oy;
    return T;
  }

  // точка внутри многоугольников (чёт-нечет по всем кольцам)
  function inside(pt, rings) {
    let c = false;
    for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i], [xj, yj] = r[j];
      if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }

  // сетка точек внутри границы — «полутон» карты
  function halftone(geo, step) {
    const [x0, y0, x1, y1] = geo.bbox, out = [];
    for (let y = y0; y <= y1; y += step) {
      const odd = Math.round((y - y0) / step) % 2;
      for (let x = x0 + (odd ? step / 2 : 0); x <= x1; x += step) if (inside([x, y], geo.region)) out.push([x, y]);
    }
    return out;
  }

  // ломаная → функция положения по доле пути 0..1 (+ угол)
  function track(pts) {
    const seg = []; let L = 0;
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
    const at = t => {
      let d = Math.max(0, Math.min(1, t)) * L, i = 0;
      while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
      const f = seg[i] ? d / seg[i] : 0, a = pts[i], b = pts[i + 1] || a;
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(b[1] - a[1], b[0] - a[0])];
    };
    at.length = L;
    return at;
  }
  const lenOf = l => { let s = 0; for (let i = 1; i < l.length; i++) s += Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]); return s; };

  // склейка отрезков, концы которых совпадают, — получаем длинные пути для движения
  function chain(lines, tol = .8) {
    const pool = lines.map(l => l.slice());
    const out = [];
    while (pool.length) {
      let cur = pool.shift(), grown = true;
      while (grown) {
        grown = false;
        for (let i = 0; i < pool.length; i++) {
          const l = pool[i], e = cur[cur.length - 1], s = cur[0];
          const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < tol;
          if (d(e, l[0])) cur = cur.concat(l.slice(1));
          else if (d(e, l[l.length - 1])) cur = cur.concat(l.slice(0, -1).reverse());
          else if (d(s, l[l.length - 1])) cur = l.concat(cur.slice(1));
          else if (d(s, l[0])) cur = l.slice().reverse().concat(cur.slice(1));
          else continue;
          pool.splice(i, 1); grown = true; break;
        }
      }
      out.push(cur);
    }
    return out;
  }

  // кратчайший путь по сети линий (дороги, ж/д, реки): узлы — вершины, склеенные с допуском tol
  function route(lines, from, to, tol = 1) {
    const key = p => Math.round(p[0] / tol) + ':' + Math.round(p[1] / tol);
    const nodes = new Map(), adj = new Map();
    const add = p => { const k = key(p); if (!nodes.has(k)) { nodes.set(k, p); adj.set(k, []); } return k; };
    for (const l of lines) for (let i = 1; i < l.length; i++) {
      const a = add(l[i - 1]), b = add(l[i]); if (a === b) continue;
      const w = Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]);
      adj.get(a).push([b, w]); adj.get(b).push([a, w]);
    }
    const near = p => { let best = null, bd = Infinity; for (const [k, q] of nodes) { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = k; } } return best; };
    const s = near(from), t = near(to);
    if (!s || !t) return null;
    const dist = new Map([[s, 0]]), prev = new Map(), done = new Set();
    while (true) {
      let u = null, ud = Infinity;
      for (const [k, d] of dist) if (!done.has(k) && d < ud) { ud = d; u = k; }
      if (u === null) return null;
      if (u === t) break;
      done.add(u);
      for (const [v, w] of adj.get(u)) { const nd = ud + w; if (nd < (dist.has(v) ? dist.get(v) : Infinity)) { dist.set(v, nd); prev.set(v, u); } }
    }
    const path = []; for (let k = t; k; k = prev.get(k)) path.unshift(nodes.get(k));
    return path.length > 1 ? path : null;
  }

  // водные маршруты танкеров (долгота, широта): Обь от Сургута, Обская и Тазовская губы, Пур, Таз
  const WATER = [
    [[73.4, 61.25], [71.0, 61.05], [69.0, 61.0], [67.8, 61.7], [66.3, 62.3], [65.4, 62.6], [65.0, 63.9], [64.9, 64.6], [64.75, 65.38], [65.4, 65.9], [66.1, 66.35], [66.6, 66.53]],
    [[66.6, 66.53], [67.3, 66.6], [67.8, 66.56], [68.6, 66.72], [69.16, 66.76], [70.08, 66.74], [70.84, 66.86], [71.6, 66.82], [72.4, 67.12], [72.9, 67.69], [73.4, 68.05], [73.57, 68.51], [73.5, 69.2], [73.0, 69.8], [72.6, 70.4], [72.3, 71.0], [72.05, 71.27]],
    [[73.6, 68.7], [74.6, 68.95], [75.8, 69.05], [76.87, 69.1], [77.3, 68.5], [77.55, 67.72], [78.1, 67.45], [78.75, 67.45], [79.5, 67.0], [80.5, 66.4], [81.6, 66.0], [82.47, 65.7]],
    [[78.1, 67.45], [78.22, 67.0], [77.95, 66.3], [77.65, 65.6], [77.9, 64.6]],
    [[73.3, 70.9], [73.6, 72.0], [74.6, 72.25], [75.5, 71.8], [76.4, 71.25], [77.4, 71.0], [78.49, 70.89]]
  ].map(l => l.map(proj));

  window.YNAO = { load, fit, inside, halftone, track, lenOf, chain, route, proj, WATER };
})();
