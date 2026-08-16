/*
 * Генератор public/og.png — превью ссылки для мессенджеров (1200×630).
 *
 * Композиция повторяет первый экран главной: заголовок слева, фото
 * с плашками-тегами и декоративными линиями справа. Значения цветов
 * и типографики — из src/styles/tokens.css.
 *
 * Запуск (вручную, при смене заголовка/фото/тегов):
 *   npm run build && npm run preview   — шрифты берутся с локального превью
 *   node scripts/og-image.mjs
 *
 * Playwright намеренно не в зависимостях проекта (см. CLAUDE.md) — нужен
 * установленный отдельно; путь к Chromium можно передать через CHROMIUM_PATH.
 */
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const { profile } = await import('../src/data/profile.ts').catch(() => ({ profile: null }));

// .ts напрямую в node не импортируется — данные продублированы литералами,
// но при расхождении с profile.ts скрипт об этом скажет.
const data = {
  name: 'Толеген Айбек',
  headlineLines: ['Продуктовый дизайнер', 'для комплексных продуктов'],
  tags: ['b2b', 'mobile', 'web', 'saas'],
};
if (profile && profile.name !== data.name) {
  throw new Error('profile.ts разошёлся с данными в og-image.mjs — обнови их здесь');
}

const previewBase = process.env.PREVIEW_URL ?? 'http://localhost:4321';

/* Шрифт: @font-face инлайнится в HTML превью — забираем его оттуда. */
const html = await fetch(`${previewBase}/`).then((r) => r.text());
let fontCss = html.match(/<style>(@font-face.*?)<\/style>/s)?.[1];
if (!fontCss) throw new Error('Не нашёл @font-face в HTML превью — сервер запущен?');
const fontFamily = fontCss.match(/--font-manrope:([^;]+);/)?.[1];

/* Файлы шрифта встраиваются как data-URI: страница рендерится с origin
   about:blank, и загрузку woff2 с превью браузер режет по CORS. */
const fontUrls = new Set(
  [...fontCss.matchAll(/url\("(\/_astro\/fonts\/[^"]+)"\)/g)].map((m) => m[1]),
);
for (const url of fontUrls) {
  const buf = Buffer.from(await fetch(previewBase + url).then((r) => r.arrayBuffer()));
  fontCss = fontCss.replaceAll(
    `url("${url}")`,
    `url("data:font/woff2;base64,${buf.toString('base64')}")`,
  );
}

const avatar = (await readFile(new URL('../src/assets/avatar.png', import.meta.url))).toString(
  'base64',
);

const logo = `<svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M18.1989 9.1849C18.181 8.93856 17.819 8.93827 17.801 9.18462C17.3036 16.0901 16.0901 17.3036 9.18435 17.8013C8.93829 17.819 8.93862 18.181 9.18492 18.1989C16.0902 18.6961 17.3035 19.9094 17.8012 26.8152C17.8191 27.0615 18.181 27.0618 18.1986 26.815C18.696 19.9095 19.9095 18.696 26.815 18.1986C27.0618 18.181 27.0615 17.819 26.8152 17.8012C19.9094 17.3035 18.6961 16.0902 18.1989 9.1849Z" fill="#1F1F1F"/><path opacity="0.12" d="M19.9406 3C28.8099 3 36 8.37994 36 15.0164C36 21.3527 29.4457 26.5433 21.1334 27C26.7463 25.2505 30.6589 21.3164 30.6589 16.7434C30.6589 10.544 23.4688 5.51842 14.5994 5.51842C12.63 5.51842 10.7435 5.76637 9 6.21976C11.8677 4.22205 15.7134 3 19.9406 3Z" fill="#2A2A2A"/><path opacity="0.12" d="M16.0594 33C7.19006 33 0 27.6201 0 20.9836C0 14.6473 6.55428 9.45667 14.8666 9C9.25368 10.7495 5.34112 14.6836 5.34112 19.2566C5.34112 25.456 12.5312 30.4816 21.4006 30.4816C23.37 30.4816 25.2565 30.2336 27 29.7802C24.1323 31.778 20.2866 33 16.0594 33Z" fill="#1F1F1F"/></svg>`;

/* Центры плашек от левого верхнего угла фото — те же, что в Hero.astro. */
const tagSpots = [
  { x: 0, y: -5, angle: -15 },
  { x: 220, y: -7, angle: 15 },
  { x: -1, y: 217, angle: 15 },
  { x: 218, y: 218, angle: -15 },
];

const page_html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<style>
${fontCss}
* { margin: 0; box-sizing: border-box; }
body {
  width: 1200px; height: 630px;
  display: flex; align-items: center;
  padding: 80px;
  font-family: ${fontFamily ?? 'system-ui'};
  color: #0a0a0a;
  background: #ffffff;
  overflow: hidden;
}
.left { position: relative; z-index: 1; max-width: 740px; }
.brand { display: flex; align-items: center; gap: 12px; margin-bottom: 48px; }
.brand span { font-size: 22px; font-weight: 500; }
h1 { font-size: 50px; line-height: 62px; font-weight: 600; }
.url { margin-top: 44px; font-size: 20px; font-weight: 500; color: #a3a3a3; }
.photo { position: absolute; left: 880px; top: 205px; width: 220px; height: 220px; }
.photo img { width: 220px; height: 220px; display: block; }
/* Линии как в hero, но не на всю ширину: слева они пересекали бы заголовок. */
.line { position: absolute; left: -60px; top: 50%; z-index: -1; width: 460px; height: 1px; background: #f1f1f1; }
.line--diagonal { transform: rotate(-30deg); }
.tag {
  position: absolute;
  display: flex; align-items: center;
  height: 40px; padding-inline: 16px;
  font-size: 16px; font-weight: 700; line-height: 24px;
  color: #161616; background: #ffffff;
  border: 1px solid #e6e6e6; border-radius: 8px;
  box-shadow: 0 2px 2px rgb(0 0 0 / 4%);
  transform: translate(-50%, -50%) rotate(var(--angle));
}
</style>
</head>
<body>
  <div class="left">
    <div class="brand">${logo}<span>${data.name}</span></div>
    <h1>${data.headlineLines.join('<br>')}</h1>
    <p class="url">tolegenaibek.vercel.app</p>
  </div>
  <div class="photo">
    <div class="line"></div>
    <div class="line line--diagonal"></div>
    <img src="data:image/png;base64,${avatar}" alt="">
    ${data.tags
      .map(
        (tag, i) =>
          `<span class="tag" style="left:${tagSpots[i].x}px;top:${tagSpots[i].y}px;--angle:${tagSpots[i].angle}deg">${tag}</span>`,
      )
      .join('')}
  </div>
</body>
</html>`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
await page.setContent(page_html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: new URL('../public/og.png', import.meta.url).pathname });
await browser.close();
console.log('public/og.png обновлён');
