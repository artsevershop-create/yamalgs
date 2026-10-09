/* Калькулятор экономии резидента АЗРФ. Модель на 10 лет, все суммы в млн ₽.
   Допущения: прибыль и ФОТ постоянны; имущество амортизируется линейно; льгота по имуществу — первые 5 лет;
   региональная ставка налога на прибыль резидента — 5 % первые 5 лет, затем 10 %; федеральная часть (8 %) — 0 % все 10 лет. */
(function () {
  const form = document.getElementById('calcForm');
  if (!form) return;
  const $ = id => document.getElementById(id);
  const v = n => parseFloat(form.elements[n].value) || 0;
  const fmt = n => Math.round(n).toLocaleString('ru-RU');
  const YEARS = 10;

  // связка число ↔ ползунок
  ['capex', 'profit', 'jobs', 'salary', 'land'].forEach(n => {
    const num = form.elements[n], rng = form.elements[n + '_r'];
    rng.addEventListener('input', () => { num.value = rng.value; calc(); });
    num.addEventListener('input', () => { rng.value = num.value; calc(); });
  });
  form.addEventListener('input', calc);
  form.addEventListener('submit', e => e.preventDefault());

  let last = {};
  function calc() {
    const capex = v('capex'), profit = v('profit'), fot = v('jobs') * v('salary') * 12 / 1000, land = v('land') * v('land_price');
    const depr = Math.max(1, v('depr'));
    let std = { profit: 0, ins: 0, prop: 0, land: 0 }, az = { profit: 0, ins: 0, prop: 0, land: 0 };
    for (let y = 1; y <= YEARS; y++) {
      const propBase = Math.max(0, capex * (1 - (y - 0.5) / depr)); // среднегодовая остаточная стоимость
      std.profit += profit * v('r_profit') / 100;
      az.profit += profit * (y <= 5 ? v('r_profit_az1') : v('r_profit_az2')) / 100;
      std.ins += fot * v('r_ins') / 100;
      az.ins += fot * v('r_ins_az') / 100;
      std.prop += propBase * v('r_prop') / 100;
      az.prop += propBase * (y <= 5 ? v('r_prop_az') : v('r_prop')) / 100;
      std.land += land * v('r_land') / 100;
      az.land += y <= 3 ? 0 : land * v('r_land') / 100; // муниципальная льгота по земле — 3 года
    }
    const sum = o => o.profit + o.ins + o.prop + o.land;
    const S = sum(std), A = sum(az), save = S - A;
    animate('calcSave', save); animate('calcStd', S, ' млн ₽'); animate('calcAz', A, ' млн ₽');
    $('calcPct').textContent = S > 0 ? Math.round(save / S * 100) : 0;
    $('barStd').style.setProperty('--w', '100%');
    $('barAz').style.setProperty('--w', (S > 0 ? Math.max(2, A / S * 100) : 0) + '%');
    $('rowProfit').textContent = `${fmt(std.profit)} → ${fmt(az.profit)}`;
    $('rowIns').textContent = `${fmt(std.ins)} → ${fmt(az.ins)}`;
    $('rowProp').textContent = `${fmt(std.prop)} → ${fmt(az.prop)}`;
    $('rowLand').textContent = `${fmt(std.land)} → ${fmt(az.land)}`;
    const ac = document.getElementById('applyCapex'); if (ac && !ac.value) ac.placeholder = String(capex);
  }
  function animate(id, to, suffix = '') {
    const el = $(id);
    if (!window.gsap || (window.ygsCalm && window.ygsCalm())) { el.textContent = fmt(to) + suffix; last[id] = to; return; }
    const o = { v: last[id] || 0 }; last[id] = to;
    gsap.to(o, { v: to, duration: .5, ease: 'power2.out', overwrite: true, onUpdate: () => { el.textContent = fmt(o.v) + suffix; } });
  }
  calc();
})();
