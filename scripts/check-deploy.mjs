/*
 * Проверка, что деплой доехал: HTML прода против собранного `dist`.
 *
 * Запуск (после `npm run build`):
 *   node scripts/check-deploy.mjs
 *
 * Playwright сюда не нужен и не годится: до внешних адресов он не достучится
 * (см. CLAUDE.md, «Деплой»). Страницы забираются обычным fetch, он уважает
 * прокси окружения.
 *
 * Сравнивать HTML в лоб нельзя — две вещи расходятся, ничего не значя:
 *
 * 1. Имена картинок в `_astro/`. В `src/assets/` есть побайтово одинаковые
 *    файлы: один и тот же экран стоит в двух шагах кейса, одна и та же
 *    выноска — в двух слайдах. Astro складывает такую пару в один файл,
 *    а имя берёт от одного из исходников — от какого именно, зависит от
 *    порядка обхода, то есть меняется от сборки к сборке. Хэш содержимого
 *    при этом один и тот же, поэтому от имени оставляем только его.
 *
 * 2. Скрипты счётчиков Vercel. В них зашит конфиг из переменных окружения
 *    сборки (`PUBLIC_VERCEL_OBSERVABILITY_CLIENT_CONFIG`), которых на
 *    локальной машине нет вовсе. Локально в скрипте пусто, на проде —
 *    адреса эндпоинтов. Заменяем такой скрипт заглушкой целиком.
 *
 * Всё остальное расхождение — настоящее: значит на проде не то, что собрано.
 */

const SITE = 'https://tolegenaibek.vercel.app';

const PAGES = [
  ['/', 'dist/index.html'],
  ['/cases/documents-flow/', 'dist/cases/documents-flow/index.html'],
  ['/cases/roles-transparency/', 'dist/cases/roles-transparency/index.html'],
  ['/404.html', 'dist/404.html'],
];

const normalize = (html) =>
  html
    /* /_astro/имя.хэш.ext → /_astro/хэш.ext */
    .replace(/\/_astro\/[^./"']+\./g, '/_astro/')
    /* инлайновый скрипт счётчика — целиком под замену */
    .replace(
      /<script type="module">(?:(?!<\/script>)[\s\S])*?customElements\.define\(`vercel-(?:(?!<\/script>)[\s\S])*?<\/script>/g,
      '<script type="module">СЧЁТЧИК VERCEL</script>',
    );

const { readFile } = await import('node:fs/promises');

let allMatch = true;

for (const [path, file] of PAGES) {
  const response = await fetch(SITE + path);

  if (!response.ok) {
    console.log(`${path}  прод отдал ${response.status}`);
    allMatch = false;
    continue;
  }

  const prod = normalize(await response.text());
  const local = normalize(await readFile(file, 'utf8'));

  if (prod === local) {
    console.log(`${path}  совпадает`);
    continue;
  }

  allMatch = false;

  /* Показываем первое расхождение: по нему обычно сразу видно, в чём дело. */
  let i = 0;
  while (i < prod.length && i < local.length && prod[i] === local[i]) i += 1;

  console.log(`${path}  ОТЛИЧАЕТСЯ на ${i} (длины ${prod.length} / ${local.length})`);
  console.log(`   прод : …${prod.slice(Math.max(0, i - 80), i + 80)}…`);
  console.log(`   локал: …${local.slice(Math.max(0, i - 80), i + 80)}…`);
}

if (!allMatch) {
  console.log('\nДеплой ещё не доехал или на проде не то, что собрано локально.');
  process.exitCode = 1;
}
