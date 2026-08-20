/*
 * Удаление из `dist/_astro/` файлов, на которые никто не ссылается.
 *
 * Запускается сам в конце `npm run build`; отдельно —
 *   node scripts/prune-dist.mjs           удалить
 *   node scripts/prune-dist.mjs --dry-run показать, что удалилось бы
 *
 * Зачем. Astro кладёт в сборку и оптимизированные webp, и оригинальные PNG,
 * из которых их сделал, — а страницы используют только webp. Так же и с
 * SVG-выносками: каждая лежит дважды, оригиналом и байт в байт такой же
 * копией. На вес страницы у посетителя это не влияет (браузер лишние файлы
 * не запрашивает), но выкладывается всё: до пересжатия исходников в 2× мусора
 * набегало 22 МБ при 3,6 МБ полезных, и с каждым новым кейсом он растёт.
 *
 * Как считается «никто не ссылается». Не разбором атрибутов, а обходом
 * достижимости: корни — все текстовые файлы сборки вне `_astro` (HTML,
 * sitemap, robots), дальше в очередь попадает всё, на что они сослались,
 * и текстовые файлы из `_astro` тоже просматриваются. Сегодня ссылки есть
 * только в HTML, но CSS со ссылкой на картинку появится — и работать будет
 * без правок.
 *
 * Почему поиск идёт по имени файла, а не по пути: ссылки бывают и
 * абсолютными (`/_astro/…`), и относительными, а имена в `_astro` и так
 * уникальны — Astro дописывает в них хэш содержимого.
 *
 * Предохранитель. Если достижимых файлов оказалось подозрительно мало,
 * скрипт ничего не удаляет и валит сборку: это значит, что разметка
 * поменялась и ссылки перестали находиться, — а молча выкатить сборку без
 * картинок хуже, чем не собрать её вовсе.
 */

import { readdir, readFile, stat, unlink } from 'node:fs/promises';
import path from 'node:path';

const DIST = 'dist';
const ASSETS = path.join(DIST, '_astro');

/* Расширения, внутри которых имеет смысл искать ссылки. */
const TEXT = new Set(['.html', '.css', '.js', '.mjs', '.xml', '.txt', '.json']);

/* Ниже этого числа достижимых файлов сборка считается сломанной. На двух
   кейсах их за две сотни; порог с запасом вниз, чтобы не срабатывать на
   удалённый кейс, но ловить «ссылки вообще не находятся». */
const MIN_REACHABLE = 50;

const dryRun = process.argv.includes('--dry-run');

const walk = async (dir) => {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
};

let all;
try {
  all = await walk(DIST);
} catch {
  console.error(`Нет каталога ${DIST}/ — сначала npm run build.`);
  process.exit(1);
}

/* Всё, что лежит в _astro, — кандидаты на удаление. Ключ — имя файла. */
const assets = new Map();
for (const file of all) {
  if (file.startsWith(ASSETS + path.sep)) assets.set(path.basename(file), file);
}

if (assets.size === 0) {
  console.log('В dist/_astro/ ничего нет — чистить нечего.');
  process.exit(0);
}

/* Корни обхода: текстовые файлы сборки вне _astro. */
const queue = all.filter(
  (file) => !file.startsWith(ASSETS + path.sep) && TEXT.has(path.extname(file)),
);

const reachable = new Set();

while (queue.length > 0) {
  const file = queue.pop();
  const text = await readFile(file, 'utf8');

  for (const [name, full] of assets) {
    if (reachable.has(name) || !text.includes(name)) continue;
    reachable.add(name);
    /* Найденный файл сам может ссылаться дальше — если он текстовый. */
    if (TEXT.has(path.extname(name))) queue.push(full);
  }
}

if (reachable.size < MIN_REACHABLE) {
  console.error(
    `Достижимых файлов в dist/_astro/ всего ${reachable.size} — это не похоже на правду.\n` +
      'Похоже, ссылки перестали находиться. Ничего не удалено.',
  );
  process.exit(1);
}

const extra = [...assets].filter(([name]) => !reachable.has(name));

if (extra.length === 0) {
  console.log(`dist/_astro/: лишних файлов нет (${reachable.size} на месте).`);
  process.exit(0);
}

let freed = 0;
for (const [, full] of extra) {
  freed += (await stat(full)).size;
  if (!dryRun) await unlink(full);
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
const byExt = extra.reduce((acc, [name]) => {
  const ext = path.extname(name).slice(1);
  acc[ext] = (acc[ext] ?? 0) + 1;
  return acc;
}, {});

console.log(
  `dist/_astro/: ${dryRun ? 'удалилось бы' : 'удалено'} ${extra.length} файлов, ${mb(freed)} ` +
    `(${Object.entries(byExt)
      .map(([ext, n]) => `${ext} ${n}`)
      .join(', ')}); осталось ${reachable.size}.`,
);
