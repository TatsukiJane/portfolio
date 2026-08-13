import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
// Astro 7 работает со zod v4, а re-export `z` из 'astro:content' помечен
// устаревшим — поэтому импортируем zod напрямую.
import { z } from 'zod';

/*
 * Разметка страницы кейса — жёсткая сетка из двух колонок: слева заголовок
 * раздела, справа блоки содержимого. Поэтому содержимое описано полями
 * frontmatter, а не телом markdown: тело не отличило бы абзац от списка
 * с зелёными стрелками и не задало бы отступы макета.
 *
 * Новый кейс = новый .md в src/content/cases/ и картинки в src/assets/.
 */

/** Поля, общие для блоков с заголовком. */
const titledBlock = {
  title: z.string(),
  /**
   * Отступ от заголовка блока до содержимого, px. В макете он почти везде 8,
   * но у отдельных блоков разрядка больше — например у «Результата» 16.
   */
  titleGap: z.union([z.literal(8), z.literal(16), z.literal(24)]).default(8),
};

/** Ряд плиток с метриками: одна залитая зелёным, остальные светлые. */
const metricsBlock = z.object({
  type: z.literal('metrics'),
  items: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
        tone: z.enum(['solid', 'subtle']).default('subtle'),
      }),
    )
    .min(1),
});

/** Заголовок и один или несколько абзацев. */
const textBlock = z.object({
  type: z.literal('text'),
  ...titledBlock,
  paragraphs: z.array(z.string()).min(1),
});

/** Заголовок и список с иконкой-маркером. */
const listBlock = z.object({
  type: z.literal('list'),
  ...titledBlock,
  /** star — серая искра, success — зелёная стрелка вверх и зелёный текст. */
  marker: z.enum(['star', 'success']).default('star'),
  items: z.array(z.string()).min(1),
});

/**
 * Плашка-подсказка. В макете компонент зовётся TooltipBlock, но самого тултипа
 * в нём нет: это плашка про то, что термины дальше раскрываются при наведении.
 */
const noteBlock = z.object({
  type: z.literal('note'),
  title: z.string(),
  text: z.string(),
});

const caseBlock = z.discriminatedUnion('type', [metricsBlock, textBlock, listBlock, noteBlock]);

/** Раздел страницы кейса: заголовок в левой колонке, блоки в правой. */
const caseSection = z.object({
  title: z.string(),
  blocks: z.array(caseBlock).min(1),
});

export type CaseBlock = z.infer<typeof caseBlock>;
export type CaseSection = z.infer<typeof caseSection>;

const cases = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/cases' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),

      /**
       * Тот же заголовок, разбитый на строки так, как он набран в макете —
       * для H1 на странице кейса. Без него строка ломается сама.
       */
      titleLines: z.array(z.string()).optional(),

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
       * Содержимое страницы кейса. Пока разделов нет, страница не собирается:
       * пустой адрес не нужен ни в sitemap, ни в ссылках.
       */
      sections: z.array(caseSection).default([]),

      /**
       * true — карточка помечена как заготовка: экраны в ней ещё не настоящие.
       * Пометка видна только в коде, на вид карточка обычная.
       */
      placeholder: z.boolean().default(false),
    }),
});

export const collections = { cases };
