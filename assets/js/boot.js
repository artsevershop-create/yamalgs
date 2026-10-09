/* Подключается в <head> до отрисовки. Ставит классы заставок и вычисляет корень сайта.
   Отдельный файл, а не встроенный скрипт: некоторые среды просмотра блокируют inline-код.
   pre-on — большая заставка главной (логотип → карта → снег), intro-on — короткая заставка остальных страниц.
   Хранилище может быть недоступно (приватный режим, встроенный просмотр) — тогда заставку показываем. */
(function () {
  var c = document.documentElement.classList, a11y = false, seenPre = false, seenIntro = false, reduce = false;
  // корень сайта = папка над assets/js/boot.js — нужен для fetch данных при открытии из подпапки
  try {
    var src = document.currentScript && document.currentScript.src;
    if (src && !window.ROOT) window.ROOT = src.replace(/assets\/js\/boot\.js(\?.*)?$/, '');
  } catch (e) {}
  try { a11y = localStorage.getItem('ygs-a11y') === '1'; } catch (e) {}
  try { seenPre = !!sessionStorage.getItem('ygs-pre'); seenIntro = !!sessionStorage.getItem('ygs-intro'); } catch (e) {}
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  if (location.hash === '#intro') seenPre = false;
  if (a11y) c.add('a11y');
  else if (!reduce) { if (!seenPre) c.add('pre-on'); if (!seenIntro) c.add('intro-on'); }
  c.add('js');
})();
