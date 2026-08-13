// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// TODO: заменить на реальный адрес после первого деплоя на Vercel.
// Используется в sitemap и в OG-тегах (BaseLayout.astro).
const site = 'https://portfolio.vercel.app';

export default defineConfig({
  site,
  integrations: [sitemap()],

  // Русский живёт в корне (/), английский появится позже на /en/ — так добавление
  // второго языка не потребует менять уже существующие адреса страниц.
  i18n: {
    locales: ['ru', 'en'],
    defaultLocale: 'ru',
    routing: {
      prefixDefaultLocale: false,
    },
  },

  // Manrope из макета. Astro скачивает файлы и хостит их локально, поэтому
  // внешних запросов к Google на проде нет. Кириллица подключена явно —
  // без неё русский текст отрисовался бы подстановочным шрифтом.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Manrope',
      cssVariable: '--font-manrope',
      weights: ['500 700'],
      subsets: ['latin', 'cyrillic'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
  ],
});
