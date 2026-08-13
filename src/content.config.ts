import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
// Astro 7 работает со zod v4, а re-export `z` из 'astro:content' помечен
// устаревшим — поэтому импортируем zod напрямую.
import { z } from 'zod';

/*
 * Коллекция кейсов.
 *
 * Пока из неё берутся только карточки на главной — страниц кейсов на этом
 * этапе нет. Коллекция создана заранее, чтобы добавление страницы кейса
 * не потребовало переносить данные: тело файла станет содержимым страницы,
 * а frontmatter уже описывает карточку.
 *
 * Новый кейс = новый .md в src/content/cases/ и картинки в src/assets/.
 */
const cases = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/cases' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),

      /** Порядок на главной: чем меньше, тем выше. */
      order: z.number(),

      /**
       * Метрики результата — зелёные плашки под заголовком.
       * value — само число, label — что именно выросло.
       */
      metrics: z
        .array(
          z.object({
            value: z.string(),
            label: z.string(),
          }),
        )
        .default([]),

      /** Нейтральные метки, например платформа: «mobile». */
      tags: z.array(z.string()).default([]),

      /** Экраны в сером контейнере карточки. В макете их три. */
      shots: z
        .array(
          z.object({
            src: image(),
            alt: z.string(),
          }),
        )
        .default([]),

      /**
       * true — карточка помечена как заготовка: экраны в ней ещё не настоящие.
       * Пометка видна только в коде, на вид карточка обычная.
       */
      placeholder: z.boolean().default(false),
    }),
});

export const collections = { cases };
